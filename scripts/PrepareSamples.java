import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.materialstudio.asset.AssetRow;
import com.materialstudio.asset.AssetService;
import com.materialstudio.job.PostcardParameters;
import com.materialstudio.job.PostcardRenderer;
import com.materialstudio.job.TemplateRenderer;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Set;
import java.util.zip.CRC32;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;
import java.util.zip.ZipOutputStream;
import javax.imageio.ImageIO;

/** Offline demo tooling: use the production renderers without sessions or database writes. */
public class PrepareSamples {
 static final long LIMIT=5L*1024*1024;
 public static void main(String[] args)throws Exception{
  Path root=Path.of(args[0]).toAbsolutePath();
  Path folder=root.resolve("frontend/public/samples"),manifest=root.resolve("frontend/src/features/samples/materials.json");
  var mapper=new ObjectMapper();var items=(ArrayNode)mapper.readTree(Files.readString(manifest));
  if(items.size()!=6)throw new IOException("Expected six reviewed photos");
  var names=new HashSet<String>();var source=new StringBuilder("# Photo sources / 照片来源\n\nReviewed: 2026-10-30\n\n");
  source.append("These six photos are licensed under the Unsplash License. Downloaded resized copies are supplied for this application's demo and manual verification. Copyright belongs to the listed photographers. Do not sell unmodified photos or compile a competing image service. See https://unsplash.com/license for the complete terms.\n\n");
  for(var item:items){
   var obj=(ObjectNode)item;String file=item.path("file").asText();
   if(!file.matches("0[1-6]-[a-z]+\\.(jpg|png)")||!names.add(file))throw new IOException("Unsafe or duplicate filename");
   Path path=folder.resolve(file);byte[] bytes=Files.readAllBytes(path);var image=ImageIO.read(path.toFile());
   if(image==null||bytes.length==0||bytes.length>LIMIT||(long)image.getWidth()*image.getHeight()>20_000_000)throw new IOException("Invalid sample: "+file);
   String ext=file.endsWith(".png")?"PNG":"JPEG";
   if(!ext.equals(item.path("format").asText()))throw new IOException("Format mismatch");
   obj.put("width",image.getWidth());obj.put("height",image.getHeight());obj.put("bytes",bytes.length);
   obj.put("sha256",HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)));image.flush();
   source.append("- ").append(file).append(" · ").append(item.path("title").asText()).append(" · ").append(item.path("author").asText()).append("\n  Source: ").append(item.path("source").asText()).append("\n  Download: ").append(item.path("downloadUrl").asText()).append("\n  SHA-256: ").append(obj.path("sha256").asText()).append("\n");
   System.out.println(file+" "+obj.path("width")+"x"+obj.path("height")+" "+bytes.length+" bytes");
  }
  Files.writeString(manifest,mapper.writerWithDefaultPrettyPrinter().writeValueAsString(items)+"\n");
  Files.writeString(folder.resolve("SOURCES.md"),source);
  var assets=new LocalAssets(folder,names);
  Path covers=root.resolve("backend/src/main/resources/demo");
  save(new TemplateRenderer(assets).render("demo-portrait","demo-build",List.of("01-hiker.jpg")),covers.resolve("portrait.png"));
  save(new PostcardRenderer(assets).render("demo-build",List.of("02-lake.jpg","03-shore.jpg"),PostcardParameters.defaults()),covers.resolve("postcard.png"));
  save(new TemplateRenderer(assets).render("demo-collage","demo-build",List.of("04-flower.png","05-coffee.jpg","06-forest.png")),covers.resolve("collage.png"));
  Path pack=root.resolve("backend/target/manual-verification");Files.createDirectories(pack.resolve("01-valid"));Files.createDirectories(pack.resolve("02-invalid"));
  for(String name:names)Files.write(pack.resolve("01-valid/"+name),Files.readAllBytes(folder.resolve(name)));
  Files.writeString(pack.resolve("SOURCES.md"),source);
  Files.copy(root.resolve("docs/manual-materials.md"),pack.resolve("README.md"),java.nio.file.StandardCopyOption.REPLACE_EXISTING);
  byte[] large=new byte[(int)LIMIT+1],photo=Files.readAllBytes(folder.resolve("01-hiker.jpg"));System.arraycopy(photo,0,large,0,photo.length);Files.write(pack.resolve("02-invalid/01-too-large.jpg"),large);
  save(new BufferedImage(4500,4500,BufferedImage.TYPE_INT_RGB),pack.resolve("02-invalid/02-too-many-pixels.png"));
  Files.writeString(pack.resolve("02-invalid/03-corrupt.jpg"),"This file intentionally is not a JPEG image.\n");
  Files.writeString(pack.resolve("02-invalid/04-unsupported.txt"),"Non-image format validation fixture.\n");
  if(Files.size(pack.resolve("02-invalid/01-too-large.jpg"))!=LIMIT+1)throw new IOException("Size fixture invalid");
  var tooMany=ImageIO.read(pack.resolve("02-invalid/02-too-many-pixels.png").toFile());if((long)tooMany.getWidth()*tooMany.getHeight()<=20_000_000)throw new IOException("Pixel fixture invalid");tooMany.flush();
  if(ImageIO.read(pack.resolve("02-invalid/03-corrupt.jpg").toFile())!=null)throw new IOException("Corrupt fixture decoded");
  Path zip=folder.resolve("manual-verification.zip");
  try(var output=new ZipOutputStream(Files.newOutputStream(zip),StandardCharsets.UTF_8);var files=Files.walk(pack)){
   for(Path file:files.filter(Files::isRegularFile).sorted().toList()){
    var entry=new ZipEntry(pack.relativize(file).toString().replace('\\','/'));entry.setTime(0);output.putNextEntry(entry);Files.copy(file,output);output.closeEntry();
   }
  }
  int count=0;try(var archive=new ZipFile(zip.toFile(),StandardCharsets.UTF_8)){
   var entries=archive.entries();while(entries.hasMoreElements()){
    var entry=entries.nextElement();byte[] bytes=archive.getInputStream(entry).readAllBytes();var crc=new CRC32();crc.update(bytes);
    if(crc.getValue()!=entry.getCrc()||bytes.length!=entry.getSize())throw new IOException("ZIP content mismatch");
    if(!java.util.Arrays.equals(bytes,Files.readAllBytes(pack.resolve(entry.getName()))))throw new IOException("ZIP source mismatch");count++;
   }
  }
  if(count!=12)throw new IOException("Expected six photos, four invalid inputs and two documents");
  System.out.println("Verified 6 photos, 3 production-rendered covers, 4 invalid fixtures, and 12 CRC-checked ZIP entries. ZIP bytes="+Files.size(zip));
 }
 static void save(BufferedImage image,Path path)throws IOException{try{if(!ImageIO.write(image,"png",path.toFile()))throw new IOException("No PNG encoder");}finally{image.flush();}}
 static class LocalAssets extends AssetService{
  private final Set<String> names;private final Path folder;
  LocalAssets(Path folder,Set<String> names){super(null,folder.toString(),null);this.names=Set.copyOf(names);this.folder=folder;}
  @Override public AssetRow owned(String id,String owner){
   if(!owner.equals("demo-build")||!names.contains(id))throw new IllegalArgumentException("Unreviewed demo input");
   try{return new AssetRow(id,owner,id,id.endsWith(".png")?"image/png":"image/jpeg",Files.size(folder.resolve(id)),Instant.EPOCH);}catch(IOException e){throw new IllegalStateException(e);}
  }
 }
}
