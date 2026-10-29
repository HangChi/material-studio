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
 private final BatchMapper mapper;private final CreationMapper creation;private final JobSubmissionService jobs;private final PipelineState state;private final com.fasterxml.jackson.databind.ObjectMapper json;private final TransactionTemplate tx;
 public BatchService(BatchMapper mapper,CreationMapper creation,JobSubmissionService jobs,PipelineState state,com.fasterxml.jackson.databind.ObjectMapper json,PlatformTransactionManager manager){this.mapper=mapper;this.creation=creation;this.jobs=jobs;this.state=state;this.json=json;tx=new TransactionTemplate(manager);tx.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);}
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
 private View view(BatchMapper.Row row,String owner){var items=mapper.children(row.id()).stream().map(id->jobs.owned(id,owner)).toList();var counts=new LinkedHashMap<String,Long>();for(String key:List.of("queued","running","succeeded","failed","cancelled"))counts.put(key,0L);for(var job:items){String key="JOB_CANCELLED".equals(job.errorCode())?"cancelled":job.status().toLowerCase(Locale.ROOT);counts.compute(key,(k,v)->v+1);}return new View(row.id(),row.name(),row.createdAt(),items,counts);}
 public View get(String owner,String id){return view(owned(owner,id),owner);}
 public Page page(String owner,int limit,String cursor){
  if(limit<1||limit>50)throw new ApiException(400,"INVALID_REQUEST","每页数量应为1～50");BatchMapper.Row anchor=null;
  if(cursor!=null){if(!cursor.matches("[a-f0-9-]{36}")||(anchor=mapper.owned(cursor,owner))==null)throw new ApiException(400,"INVALID_CURSOR","批次分页位置无效");}
  var rows=mapper.page(owner,anchor==null?null:anchor.createdAt(),cursor,limit+1);var selected=rows.subList(0,Math.min(limit,rows.size()));return new Page(selected.stream().map(row->view(row,owner)).toList(),rows.size()>limit?selected.getLast().id():null);
 }
 public View cancel(String owner,String id){return tx.execute(status->{var row=owned(owner,id);for(var job:view(row,owner).items())if(Set.of("QUEUED","RUNNING").contains(job.status())){try{state.cancel(job.id(),owner);}catch(ApiException ended){if(ended.status()!=409)throw ended;}}return view(row,owner);});}
}
