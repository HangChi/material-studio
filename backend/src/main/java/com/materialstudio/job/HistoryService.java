package com.materialstudio.job;

import com.materialstudio.common.ApiException;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class HistoryService {
 private final JobMapper jobs;
 public HistoryService(JobMapper jobs){this.jobs=jobs;}
 public record Page(List<JobView> items,String nextCursor){}
 public Page page(String owner,int limit,String cursor){
  if(limit<1||limit>50)throw new ApiException(400,"INVALID_REQUEST","每页数量必须是1～50的整数");
  JobRow anchor=null;
  if(cursor!=null){
   if(!cursor.matches("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"))throw invalidCursor();
   anchor=jobs.owned(cursor,owner);if(anchor==null)throw invalidCursor();
  }
  var rows=jobs.page(owner,anchor==null?null:anchor.createdAt(),cursor,limit+1);
  boolean more=rows.size()>limit;var selected=rows.subList(0,Math.min(rows.size(),limit));
  return new Page(selected.stream().map(JobView::from).toList(),more?selected.getLast().id():null);
 }
 public List<JobView> active(String owner){return jobs.active(owner).stream().map(JobView::from).toList();}
 private ApiException invalidCursor(){return new ApiException(400,"INVALID_CURSOR","记录分页位置无效，请刷新记录");}
}
