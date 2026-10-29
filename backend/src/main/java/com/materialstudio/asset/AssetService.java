package com.materialstudio.asset;

import com.materialstudio.common.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import java.io.*;
import java.nio.file.*;
import java.time.Instant;
import java.util.*;

@Service
public class AssetService {
    private final AssetMapper assets;
    private final com.materialstudio.job.CreationMapper ownership;
    private final Path root;
    public AssetService(AssetMapper assets, @Value("${studio.storage-root:/data}") String root, com.materialstudio.job.CreationMapper ownership) { this.ownership=ownership;this.assets = assets; this.root = Path.of(root).toAbsolutePath().normalize(); }
    @org.springframework.transaction.annotation.Transactional
    public AssetRow upload(String owner, MultipartFile file) {
        if(ownership.lockOwner(owner)==null)throw new ApiException(401,"UNAUTHENTICATED","访客身份已失效，请刷新后重试");
        String mime = file.getContentType();
        if (mime == null || !Set.of("image/png", "image/jpeg").contains(mime.toLowerCase(Locale.ROOT))) throw new ApiException(415, "UNSUPPORTED_MEDIA_TYPE", "请选择JPEG或PNG图片");
        mime = mime.toLowerCase(Locale.ROOT);
        if (file.getSize() > 5242880) throw new ApiException(413, "FILE_TOO_LARGE", "每张图片不能超过5 MiB");
        if (file.isEmpty()) throw invalidImage();
        byte[] bytes;
        try { bytes = file.getBytes(); } catch (IOException e) { throw unavailable(); }
        validate(bytes, mime);
        String id = UUID.randomUUID().toString();
        String filename = id + (mime.equals("image/png") ? ".png" : ".jpg");
        AssetRow row = new AssetRow(id, owner, filename, mime, bytes.length, Instant.now());
        Path temporary = null;
        try {
            Files.createDirectories(root);
            temporary = Files.createTempFile(root, "upload-", ".part");
            Files.write(temporary, bytes);
            Files.move(temporary, path(row), StandardCopyOption.ATOMIC_MOVE);
            temporary = null;
            assets.insert(row);
            return row;
        } catch (IOException e) { cleanup(temporary); cleanup(path(row)); throw unavailable(); }
        catch (RuntimeException e) { cleanup(temporary); cleanup(path(row)); throw e; }
    }
    private void validate(byte[] bytes, String mime) {
        try (var input = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            var readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) throw invalidImage();
            ImageReader reader = readers.next();
            try {
                reader.setInput(input, true, true);
                String format = reader.getFormatName().toLowerCase(Locale.ROOT);
                if (!(mime.equals("image/png") && format.equals("png") || mime.equals("image/jpeg") && format.equals("jpeg"))) throw invalidImage();
                long pixels = (long) reader.getWidth(0) * reader.getHeight(0);
                if (pixels <= 0 || pixels > 20000000) throw invalidImage();
                var decoded = reader.read(0);
                if (decoded == null) throw invalidImage();
                decoded.flush();
            } finally { reader.dispose(); }
        } catch (IOException | IllegalArgumentException e) { throw invalidImage(); }
    }
    public record AssetView(String id,String url,String mimeType,long sizeBytes,Instant createdAt) {}
    public record Page(List<AssetView> items,String nextCursor) {}
    public Page page(String owner,int limit,String cursor) {
        if(limit<1||limit>50)throw new ApiException(400,"INVALID_REQUEST","每页数量必须是1～50");
        AssetRow anchor=null;
        if(cursor!=null){anchor=assets.findOwned(cursor,owner);if(anchor==null)throw new ApiException(400,"INVALID_CURSOR","素材分页位置无效，请刷新");}
        var rows=assets.page(owner,anchor==null?null:anchor.createdAt(),cursor,limit+1);boolean more=rows.size()>limit;
        var selected=rows.subList(0,Math.min(rows.size(),limit));return new Page(selected.stream().map(row->new AssetView(row.id(),"/api/assets/"+row.id()+"/content",row.mimeType(),row.sizeBytes(),row.createdAt())).toList(),more?selected.getLast().id():null);
    }
    public AssetRow owned(String id, String owner) {
        AssetRow row = assets.findOwned(id, owner);
        if (row == null) throw new ApiException(404, "RESOURCE_NOT_FOUND", "素材不存在或不可访问");
        return row;
    }
    public Path path(AssetRow row) { return root.resolve(row.storageFilename()); }
    public void ensureAvailable(AssetRow row) {
        try {
            if (!Files.isRegularFile(path(row)) || Files.size(path(row)) != row.sizeBytes()) throw new ApiException(422, "ASSET_UNAVAILABLE", "素材已失效，请重新上传");
        } catch (IOException e) { throw new ApiException(422, "ASSET_UNAVAILABLE", "素材已失效，请重新上传"); }
    }
    private ApiException invalidImage() { return new ApiException(422, "INVALID_IMAGE", "图片内容无效、格式不匹配或超过2000万像素"); }
    private ApiException unavailable() { return new ApiException(503, "STORAGE_UNAVAILABLE", "图片保存失败，请稍后重试"); }
    private void cleanup(Path path) { if (path != null) try { Files.deleteIfExists(path); } catch (IOException ignored) { /* Best-effort cleanup; interrupted uploads can leave orphan files. */ } }
}
