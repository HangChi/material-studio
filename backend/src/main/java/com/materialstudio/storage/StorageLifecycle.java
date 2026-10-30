package com.materialstudio.storage;
import com.materialstudio.common.ApiException;
import com.materialstudio.job.AdmissionMapper;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import java.io.IOException;
@Service
public class StorageLifecycle {
 private final Path root;private final StorageMapper mapper;private final AdmissionMapper admission;private final TransactionTemplate transaction;
 public record Candidate(String path,long sizeBytes,long modifiedAt){}
 public record Report(String snapshot,List<Candidate> candidates,String purgeSnapshot,List<StorageMapper.Audit> expired){}
 public record Confirmation(String snapshot,boolean confirm){}
 public StorageLifecycle(@Value("${studio.storage-root:/data}") String root,StorageMapper mapper,AdmissionMapper admission,PlatformTransactionManager manager){this.root=Path.of(root).toAbsolutePath().normalize();this.mapper=mapper;this.admission=admission;transaction=new TransactionTemplate(manager);}
 private ApiException unavailable(){return new ApiException(503,"STORAGE_UNAVAILABLE","文件维护暂时不可用，请保留审计后重试");}
 private void safeDirectory(Path dir)throws IOException{if(Files.isSymbolicLink(dir))throw new IOException("Symbolic directory is not managed");}
 private String digest(Object value){try{return HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(value.toString().getBytes(StandardCharsets.UTF_8)));}catch(java.security.NoSuchAlgorithmException e){throw new IllegalStateException(e);}}
 private boolean managed(String name){return name.matches("[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\\.(png|jpg)")||name.matches("(upload|result|checkpoint)-[0-9]+\\.part");}
 public synchronized Report report(){
  try{
   safeDirectory(root);var protectedFiles=new HashSet<>(mapper.protectedPaths());var candidates=new ArrayList<Candidate>();
   for(String directory:List.of("","results",".checkpoints")){Path dir=root.resolve(directory);safeDirectory(dir);if(!Files.isDirectory(dir,LinkOption.NOFOLLOW_LINKS))continue;
    try(var files=Files.list(dir)){for(Path file:files.toList()){
     if(!Files.isRegularFile(file,LinkOption.NOFOLLOW_LINKS)||!managed(file.getFileName().toString()))continue;
     String relative=root.relativize(file).toString();long modified=Files.getLastModifiedTime(file,LinkOption.NOFOLLOW_LINKS).toMillis();
     if(!protectedFiles.contains(relative)&&modified<=Instant.now().minusSeconds(86400).toEpochMilli())candidates.add(new Candidate(relative,Files.size(file),modified));
    }}
   }
   candidates.sort(Comparator.comparing(Candidate::path));var expired=mapper.expired().stream().filter(row->!protectedFiles.contains(row.path())).toList();
   Path isolated=root.resolve(".quarantine");safeDirectory(isolated);var purgeState=new ArrayList<String>();
   for(var row:expired){Path file=isolated.resolve(row.id());if(Files.exists(file,LinkOption.NOFOLLOW_LINKS)&&!Files.isRegularFile(file,LinkOption.NOFOLLOW_LINKS))throw new IOException("Unexpected quarantined file");purgeState.add(row.toString()+":"+(Files.exists(file,LinkOption.NOFOLLOW_LINKS)?Files.size(file)+":"+Files.getLastModifiedTime(file,LinkOption.NOFOLLOW_LINKS).toMillis():"missing"));}
   return new Report(digest(candidates),List.copyOf(candidates),digest(purgeState),expired);
  }catch(IOException e){throw unavailable();}
 }
 private void confirm(Confirmation input,String current){if(input==null||!input.confirm())throw new ApiException(422,"CONFIRMATION_REQUIRED","请先核对文件盘点并明确确认操作");if(!current.equals(input.snapshot()))throw new ApiException(409,"STALE_SNAPSHOT","文件盘点已变化，请重新核对快照");}
 public synchronized Report quarantine(Confirmation input){
  var moved=new LinkedHashMap<Path,Path>();
  try{
   transaction.executeWithoutResult(tx->{admission.lock();var report=report();confirm(input,report.snapshot());Path isolated=root.resolve(".quarantine");
    try{safeDirectory(isolated);Files.createDirectories(isolated);
     for(var candidate:report.candidates()){
      String id=UUID.randomUUID().toString();Path source=root.resolve(candidate.path()),target=isolated.resolve(id);
      if(Files.isSymbolicLink(source)||mapper.protectedPaths().contains(candidate.path()))throw new ApiException(409,"STALE_SNAPSHOT","文件引用已变化，请重新核对");
      Files.move(source,target,StandardCopyOption.ATOMIC_MOVE);moved.put(target,source);
      mapper.insert(new StorageMapper.Audit(id,candidate.path(),candidate.sizeBytes(),"QUARANTINED",Instant.now(),null));
     }
    }catch(IOException e){throw unavailable();}
   });
  }catch(RuntimeException error){for(var entry:moved.entrySet()){try{Files.move(entry.getKey(),entry.getValue(),StandardCopyOption.ATOMIC_MOVE);}catch(IOException restore){error.addSuppressed(restore);}}throw error;}
  return report();
 }
 public synchronized Report purge(Confirmation input){
  var current=report();confirm(input,current.purgeSnapshot());Path isolated=root.resolve(".quarantine");
  try{safeDirectory(root);safeDirectory(isolated);
   for(var row:current.expired()){
    if(mapper.protectedPaths().contains(row.path()))throw new ApiException(409,"STALE_SNAPSHOT","文件引用已变化");
    Path file=isolated.resolve(row.id());if(Files.isSymbolicLink(file))throw unavailable();
    // Commit audit intent before irreversible IO; DELETING is safely resumable after a crash.
    mapper.deleting(row.id());Files.deleteIfExists(file);mapper.purged(row.id());
   }
  }catch(IOException e){throw unavailable();}
  return report();
 }
 public List<StorageMapper.Audit> audit(){return mapper.audit();}
}
