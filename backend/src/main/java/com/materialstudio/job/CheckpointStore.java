package com.materialstudio.job;

import com.materialstudio.asset.AssetService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.*;
import java.security.*;
import java.time.Instant;
import java.util.*;
import javax.imageio.ImageIO;
import static com.materialstudio.job.Simulation.Stage;

@Service
public class CheckpointStore {
 private final CheckpointMapper mapper;private final EventMapper events;private final CreationMapper creation;private final AssetService assets;private final Path root;
 public CheckpointStore(CheckpointMapper mapper,EventMapper events,CreationMapper creation,AssetService assets,@Value("${studio.storage-root:/data}") String root){this.mapper=mapper;this.events=events;this.creation=creation;this.assets=assets;this.root=Path.of(root).toAbsolutePath().normalize().resolve(".checkpoints");}
 private static MessageDigest digest(){try{return MessageDigest.getInstance("SHA-256");}catch(NoSuchAlgorithmException e){throw new IllegalStateException(e);}}
 private static String hash(byte[] bytes){return HexFormat.of().formatHex(digest().digest(bytes));}
 public String input(JobRow job) throws IOException {
  var values=new ArrayList<String>();values.add("render-v1");values.add(job.templateId());var recipe=creation.recipe(job.id());values.add(recipe==null?"":Objects.toString(recipe.parametersJson(),""));
  for(String id:events.assetIds(job.id())){var row=assets.owned(id,job.ownerId());assets.ensureAvailable(row);if(Files.isSymbolicLink(assets.path(row)))throw new IOException("Unsafe source");values.add(id);values.add(hash(Files.readAllBytes(assets.path(row))));}
  var bytes=new java.io.ByteArrayOutputStream();try(var out=new java.io.DataOutputStream(bytes)){for(String value:values)out.writeUTF(value);}return hash(bytes.toByteArray());
 }
 public record Resume(Stage stage,BufferedImage image){}
 public Resume restore(String id,String input) {
  var generated=mapper.find(id,"GENERATE");
  if(generated!=null&&generated.inputHash().equals(input))try{
   Path file=path(generated.artifactPath());if(!Files.isSymbolicLink(root)&&!Files.isSymbolicLink(root.getParent())&&Files.isRegularFile(file,LinkOption.NOFOLLOW_LINKS)){
    byte[] bytes=Files.readAllBytes(file);if(hash(bytes).equals(generated.artifactHash())){var image=ImageIO.read(new java.io.ByteArrayInputStream(bytes));if(image!=null)return new Resume(Stage.GENERATE,image);}
   }
  }catch(IOException|IllegalArgumentException ignored){/* Recompute from the nearest valid earlier checkpoint. */}
  var checked=mapper.find(id,"ASSET_CHECK");return checked!=null&&checked.inputHash().equals(input)?new Resume(Stage.ASSET_CHECK,null):new Resume(null,null);
 }
 public CheckpointMapper.Checkpoint checked(String id,String input){return new CheckpointMapper.Checkpoint(id,"ASSET_CHECK",input,null,null,Instant.now());}
 public CheckpointMapper.Checkpoint generated(String id,String input,BufferedImage image) throws IOException {
  if(Files.isSymbolicLink(root)||Files.isSymbolicLink(root.getParent()))throw new IOException("Unsafe checkpoint directory");Files.createDirectories(root);
  Path temp=Files.createTempFile(root,"checkpoint-",".part");String name=UUID.randomUUID()+".png";
  try{if(!ImageIO.write(image,"png",temp.toFile()))throw new IOException("PNG encoder unavailable");String hash=hash(Files.readAllBytes(temp));Files.move(temp,path(name),StandardCopyOption.ATOMIC_MOVE);return new CheckpointMapper.Checkpoint(id,"GENERATE",input,name,hash,Instant.now());}finally{Files.deleteIfExists(temp);}
 }
 private Path path(String name){if(name==null||!name.matches("[a-f0-9-]{36}\\.png"))throw new IllegalArgumentException("Invalid checkpoint path");return root.resolve(name);}
 public void discard(CheckpointMapper.Checkpoint row){if(row==null||row.artifactPath()==null)return;var saved=mapper.find(row.jobId(),row.stage());if(saved!=null&&Objects.equals(saved.artifactPath(),row.artifactPath()))return;try{Files.deleteIfExists(path(row.artifactPath()));}catch(IOException ignored){/* An unregistered orphan is never reused. */}}
 @org.springframework.transaction.annotation.Transactional(propagation=org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
 public void cleanupTerminal(String id){
  var job=events.find(id);if(job==null||Set.of("QUEUED","RUNNING").contains(job.status()))return;
  var row=mapper.find(id,"GENERATE");
  try{if(Files.isSymbolicLink(root)||Files.isSymbolicLink(root.getParent()))return;if(row!=null)Files.deleteIfExists(path(row.artifactPath()));mapper.delete(id);}catch(IOException ignored){/* Retain registration on failed removal so maintenance cannot delete a live reference. */}
 }
}
