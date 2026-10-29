package com.materialstudio.job;

import com.materialstudio.common.ApiException;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class HistoryService {
 private final JobMapper jobs;private final LibraryMapper library;private final EventMapper events;private final org.springframework.transaction.support.TransactionTemplate transaction;
 public HistoryService(JobMapper jobs,LibraryMapper library,EventMapper events,org.springframework.transaction.PlatformTransactionManager manager){this.jobs=jobs;this.library=library;this.events=events;this.transaction=new org.springframework.transaction.support.TransactionTemplate(manager);}
 public record Page(List<JobView> items,String nextCursor){}
 public record Filter(String q,String templateId,String status,java.time.Instant from,java.time.Instant to,Boolean favorite,boolean hidden){}
 public record Update(String displayName,Boolean favorite,Boolean hidden){}
 public JobView update(String owner,String id,Update value){
  if(value.displayName()==null&&value.favorite()==null&&value.hidden()==null)throw new ApiException(422,"VALIDATION_FAILED","请选择需要修改的作品属性");
  String name=value.displayName()==null?null:value.displayName().strip();
  if(name!=null&&(name.isEmpty()||name.codePointCount(0,name.length())>60||name.codePoints().anyMatch(Character::isISOControl)))throw new ApiException(422,"VALIDATION_FAILED","作品名称必须为1～60字单行文字");
  return transaction.execute(tx->{
   var job=events.lock(id);if(job==null||!job.ownerId().equals(owner))throw new ApiException(404,"RESOURCE_NOT_FOUND","作品不存在");
   var old=library.find(id);library.save(new LibraryMapper.Metadata(id,name==null?(old==null?null:old.displayName()):name,value.favorite()==null?old!=null&&old.favorite():value.favorite(),value.hidden()==null?old!=null&&old.hidden():value.hidden()));library.touch(id);return JobView.from(jobs.owned(id,owner));
  });
 }
 public Page page(String owner,int limit,String cursor){return page(owner,limit,cursor,new Filter(null,null,null,null,null,null,false));}
 public Page page(String owner,int limit,String cursor,Filter filter){
  if(filter.q()!=null&&filter.q().length()>60||filter.status()!=null&&!java.util.Set.of("QUEUED","RUNNING","SUCCEEDED","FAILED","CANCELLED").contains(filter.status())||filter.from()!=null&&filter.to()!=null&&!filter.from().isBefore(filter.to()))throw new ApiException(400,"INVALID_REQUEST","筛选条件无效");
  if(limit<1||limit>50)throw new ApiException(400,"INVALID_REQUEST","每页数量必须是1～50的整数");
  JobRow anchor=null;
  if(cursor!=null){
   if(!cursor.matches("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"))throw invalidCursor();
   anchor=jobs.owned(cursor,owner);if(anchor==null)throw invalidCursor();
  }
  var rows=library.page(owner,filter,anchor==null?null:anchor.createdAt(),cursor,limit+1);
  boolean more=rows.size()>limit;var selected=rows.subList(0,Math.min(rows.size(),limit));
  return new Page(selected.stream().map(JobView::from).toList(),more?selected.getLast().id():null);
 }
 public List<JobView> active(String owner){return jobs.active(owner).stream().map(JobView::from).toList();}
 private ApiException invalidCursor(){return new ApiException(400,"INVALID_CURSOR","记录分页位置无效，请刷新记录");}
}
