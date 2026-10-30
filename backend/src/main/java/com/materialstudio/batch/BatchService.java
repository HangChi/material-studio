package com.materialstudio.batch;
import com.materialstudio.common.ApiException;
import com.materialstudio.job.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.*;
import org.springframework.transaction.support.TransactionTemplate;
import java.time.Instant;
import java.util.*;
@Service
public class BatchService {
 public record Request(String name,List<JobSubmissionService.Request> items){}
 public record View(String id,String name,Instant createdAt,List<JobView> items,Map<String,Long> counts){}
 public record Page(List<View> items,String nextCursor){}
 private final BatchMapper mapper;
 private final CreationMapper creation;
 private final JobSubmissionService jobs;
 private final JobMapper jobRows;
 private final PipelineState state;
 private final com.fasterxml.jackson.databind.ObjectMapper json;
 private final TransactionTemplate tx;

 public BatchService(BatchMapper mapper, CreationMapper creation, JobSubmissionService jobs,
                     JobMapper jobRows, PipelineState state, com.fasterxml.jackson.databind.ObjectMapper json,
                     PlatformTransactionManager manager) {
  this.mapper = mapper;
  this.creation = creation;
  this.jobs = jobs;
  this.jobRows = jobRows;
  this.state = state;
  this.json = json;
  tx = new TransactionTemplate(manager);
  tx.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
 }
 public View create(String owner,String key,Request request){
  if(key==null||!key.matches("[A-Za-z0-9_-]{1,80}"))throw new ApiException(400,"INVALID_IDEMPOTENCY_KEY","批量制作需要有效提交标识");
  String name=request.name()==null?"":request.name().strip();if(name.isEmpty()||name.codePointCount(0,name.length())>60||name.codePoints().anyMatch(Character::isISOControl)||request.items()==null||request.items().isEmpty()||request.items().size()>10||request.items().contains(null))throw new ApiException(422,"VALIDATION_FAILED","批次名称需1～60字，包含1～10项制作");
  String fingerprint;try{fingerprint=HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(json.writeValueAsBytes(List.of(name,request.items()))));}catch(Exception e){throw new IllegalStateException(e);}
  return tx.execute(status->{
   if(creation.lockOwner(owner)==null)throw new ApiException(401,"UNAUTHENTICATED","身份已失效");var old=mapper.receipt(owner,key);
   if(old!=null){if(!old.fingerprint().equals(fingerprint))throw new ApiException(409,"IDEMPOTENCY_CONFLICT","同一批次标识的内容不同");return view(old,owner);}
   var row=new BatchMapper.Row(UUID.randomUUID().toString(),owner,name,key,fingerprint,Instant.now());mapper.insert(row);
   for(int n=0;n<request.items().size();n++){var job=jobs.submit(owner,request.items().get(n));mapper.link(row.id(),job.id(),n);}
   return view(row,owner);
  });
 }
 private BatchMapper.Row owned(String owner,String id){var row=mapper.owned(id,owner);if(row==null)throw new ApiException(404,"RESOURCE_NOT_FOUND","批次不存在或不可访问");return row;}
 private View view(BatchMapper.Row row, String owner) {
  return views(List.of(row), owner).getFirst();
 }

 private List<View> views(List<BatchMapper.Row> rows, String owner) {
  if (rows.isEmpty()) return List.of();
  var children = mapper.childrenFor(rows.stream().map(BatchMapper.Row::id).toList());
  var ids = children.stream().map(BatchMapper.Child::jobId).distinct().toList();
  var ownedJobs = ids.isEmpty() ? List.<JobRow>of() : jobRows.ownedMany(owner, ids);
  if (ownedJobs.size() != ids.size()) {
   throw new ApiException(404, "RESOURCE_NOT_FOUND", "批次作品不存在或不可访问");
  }
  var byId = new HashMap<String, JobView>();
  for (var job : ownedJobs) byId.put(job.id(), JobView.from(job));
  var grouped = new HashMap<String, List<JobView>>();
  // childrenFor preserves slot order independently of the task query's ID order.
  for (var child : children) {
   grouped.computeIfAbsent(child.batchId(), ignored -> new ArrayList<>()).add(byId.get(child.jobId()));
  }
  return rows.stream().map(row -> summarize(row, grouped.getOrDefault(row.id(), List.of()))).toList();
 }

 private View summarize(BatchMapper.Row row, List<JobView> items) {
  var counts = new LinkedHashMap<String, Long>();
  for (String key : List.of("queued", "running", "succeeded", "failed", "cancelled")) counts.put(key, 0L);
  for (var job : items) {
   String key = "JOB_CANCELLED".equals(job.errorCode()) ? "cancelled" : job.status().toLowerCase(Locale.ROOT);
   counts.compute(key, (ignored, count) -> count + 1);
  }
  return new View(row.id(), row.name(), row.createdAt(), items, counts);
 }
 public View get(String owner,String id){return view(owned(owner,id),owner);}
 public Page page(String owner,int limit,String cursor){
  if(limit<1||limit>50)throw new ApiException(400,"INVALID_REQUEST","每页数量应为1～50");BatchMapper.Row anchor=null;
  if(cursor!=null){if(!cursor.matches("[a-f0-9-]{36}")||(anchor=mapper.owned(cursor,owner))==null)throw new ApiException(400,"INVALID_CURSOR","批次分页位置无效");}
  var rows = mapper.page(owner, anchor == null ? null : anchor.createdAt(), cursor, limit + 1);
  var selected = rows.subList(0, Math.min(limit, rows.size()));
  return new Page(views(selected, owner), rows.size() > limit ? selected.getLast().id() : null);
 }
 public View cancel(String owner, String id) {
  return tx.execute(status -> {
   var row = owned(owner, id);
   for (String child : mapper.children(row.id()).stream().sorted().toList()) {
    state.cancelIfActive(child, owner);
   }
   return view(row, owner);
  });
 }
}
