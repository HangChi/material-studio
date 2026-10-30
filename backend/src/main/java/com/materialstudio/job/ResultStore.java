package com.materialstudio.job;

import com.materialstudio.common.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.*;
import org.springframework.stereotype.Service;
import java.io.IOException;
import java.nio.file.*;
import java.util.Set;

@Service
public class ResultStore {
    private final Path root;
    public ResultStore(@Value("${studio.storage-root:/data}") String root) { this.root=Path.of(root).toAbsolutePath().normalize().resolve("results"); }
    public String publish(String id,String cover) throws IOException {
        if(!Set.of("portrait.png","postcard.png","collage.png").contains(cover))throw new IOException("Unknown preset");
        Files.createDirectories(root);Path temporary=Files.createTempFile(root,"result-",".part");String filename=java.util.UUID.randomUUID()+".png";
        try(var input=new ClassPathResource("demo/"+cover).getInputStream()) {
            Files.copy(input,temporary,StandardCopyOption.REPLACE_EXISTING);
            Files.move(temporary,root.resolve(filename),StandardCopyOption.ATOMIC_MOVE);
            return filename;
        } finally { Files.deleteIfExists(temporary); }
    }
    public String publish(String id,java.awt.image.BufferedImage image) throws IOException {
        Files.createDirectories(root);Path temporary=Files.createTempFile(root,"result-",".part");String filename=java.util.UUID.randomUUID()+".png";
        try {
            if(!javax.imageio.ImageIO.write(image,"png",temporary.toFile()))throw new IOException("PNG encoder unavailable");
            Files.move(temporary,root.resolve(filename),StandardCopyOption.ATOMIC_MOVE);return filename;
        } finally { Files.deleteIfExists(temporary); }
    }
    public Resource read(JobRow job) {
        if(!job.status().equals("SUCCEEDED")||job.resultPath()==null||!job.resultPath().matches("[a-f0-9-]{36}\\.png"))throw unavailable();
        Path file=root.resolve(job.resultPath());
        try { if(!Files.isRegularFile(file)||Files.size(file)==0)throw unavailable(); }
        catch(IOException e) { throw unavailable(); }
        return new FileSystemResource(file);
    }
    public void cleanup(String filename) { if(filename!=null)try { Files.deleteIfExists(root.resolve(filename)); }catch(IOException ignored) { /* Orphan cleanup is outside this demo. */ } }
    private ApiException unavailable() { return new ApiException(404,"RESULT_NOT_AVAILABLE","结果尚不可用或文件已失效"); }
}
