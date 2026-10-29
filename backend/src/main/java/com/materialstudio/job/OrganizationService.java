package com.materialstudio.job;
import com.materialstudio.common.ApiException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.util.*;
import java.io.*;
import java.util.zip.*;
@Service
public class OrganizationService {
 public record Update(List<String> ids,Boolean favorite,Boolean hidden,List<String> tags){}
 public record Selection(List<String> ids){}
 private final LibraryMapper library;private final TagMapper tags;private final JobSubmissionService jobs;private final EventMapper events;private final CreationMapper creation;private final HistoryService history;private final ResultStore results;private final TransactionTemplate tx;
 public OrganizationService(TagMapper tags,JobSubmissionService jobs,EventMapper events,CreationMapper creation,HistoryService history,ResultStore results,PlatformTransactionManager manager,LibraryMapper library){this.library=library;this.tags=tags;this.jobs=jobs;this.events=events;this.creation=creation;this.history=history;this.results=results;tx=new TransactionTemplate(manager);}
 public static String tag(String value){if(value==null)throw invalid();String result=java.text.Normalizer.normalize(value,java.text.Normalizer.Form.NFKC).strip().toLowerCase(Locale.ROOT);if(result.isEmpty()||result.codePointCount(0,result.length())>20||result.codePoints().anyMatch(Character::isISOControl))throw invalid();return result;}
 private static ApiException invalid(){return new ApiException(422,"VALIDATION_FAILED","选择或标签无效：最多50项作品、10个标签，每个标签1～20字");}
 private void validate(List<String> ids,int maximum){if(ids==null||ids.isEmpty()||ids.size()>maximum||new HashSet<>(ids).size()!=ids.size()||ids.stream().anyMatch(id->id==null||!id.matches("[a-f0-9-]{36}")))throw invalid();}
 public List<String> tags(String owner,String id){jobs.owned(id,owner);return tags.tags(id);}
 public List<JobView> update(String owner,Update input){
  validate(input.ids(),50);if(input.favorite()==null&&input.hidden()==null&&input.tags()==null)throw invalid();
  List<String> normalized=input.tags()==null?null:input.tags().stream().map(OrganizationService::tag).distinct().sorted().toList();if(input.tags()!=null&&input.tags().size()>10)throw invalid();
  return tx.execute(status->{
   if(creation.lockOwner(owner)==null)throw new ApiException(401,"UNAUTHENTICATED","身份已失效");
   for(String id:input.ids().stream().sorted().toList()){var row=events.lock(id);if(row==null||!row.ownerId().equals(owner))throw new ApiException(404,"RESOURCE_NOT_FOUND","作品不存在或不可访问");}
   for(String id:input.ids()){
    if(input.favorite()!=null||input.hidden()!=null)history.update(owner,id,new HistoryService.Update(null,input.favorite(),input.hidden()));
    if(normalized!=null){tags.clear(id);for(String tag:normalized)tags.add(id,tag);if(input.favorite()==null&&input.hidden()==null)library.touch(id);}
   }
   return input.ids().stream().map(id->jobs.owned(id,owner)).toList();
  });
 }
 public byte[] archive(String owner,Selection selection){
  validate(selection.ids(),20);var resources=new ArrayList<org.springframework.core.io.Resource>();long total=0;
  for(String id:selection.ids()){var job=jobs.owned(id,owner);if(!job.status().equals("SUCCEEDED"))throw new ApiException(422,"RESULT_NOT_READY","只能打包已成功的作品");resources.add(results.read(events.find(id)));}
  try{
   for(var resource:resources){total+=resource.contentLength();if(total>64L*1024*1024)throw new ApiException(422,"ARCHIVE_TOO_LARGE","所选结果超过64 MiB，请分批下载");}
   var bytes=new ByteArrayOutputStream();try(var zip=new ZipOutputStream(bytes)){byte[] buffer=new byte[8192];long copied=0;
    for(int i=0;i<resources.size();i++){zip.putNextEntry(new ZipEntry(selection.ids().get(i)+".png"));try(var in=resources.get(i).getInputStream()){int n;while((n=in.read(buffer))!=-1){copied+=n;if(copied>64L*1024*1024)throw new ApiException(422,"ARCHIVE_TOO_LARGE","结果超过打包上限");zip.write(buffer,0,n);}}zip.closeEntry();}
   }return bytes.toByteArray();
  }catch(IOException e){throw new ApiException(503,"RESULT_UNAVAILABLE","打包暂时失败，请重试");}
 }
}
