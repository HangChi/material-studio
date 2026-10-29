package com.materialstudio.asset;

import com.materialstudio.common.ApiException;
import com.materialstudio.identity.SessionService;
import org.springframework.core.io.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.net.URI;
import java.nio.file.Files;
import java.util.Map;

@RestController
@RequestMapping("/api/assets")
public class AssetController {
    private final SessionService sessions;
    private final AssetService assets;
    public AssetController(SessionService sessions, AssetService assets) { this.sessions = sessions; this.assets = assets; }
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> upload(@CookieValue(name="material_session", required=false) String token, @RequestPart("file") MultipartFile file) {
        AssetRow row = assets.upload(sessions.require(token).id(), file);
        String url = "/api/assets/" + row.id() + "/content";
        return ResponseEntity.created(URI.create(url)).header("Cache-Control", "no-store").body(Map.of("id",row.id(),"url",url,"mimeType",row.mimeType(),"sizeBytes",row.sizeBytes(),"createdAt",row.createdAt()));
    }
    @GetMapping("/{id}/content")
    public ResponseEntity<Resource> content(@CookieValue(name="material_session", required=false) String token, @PathVariable String id) {
        AssetRow row = assets.owned(id, sessions.require(token).id());
        if (!Files.isRegularFile(assets.path(row))) throw new ApiException(404, "RESOURCE_NOT_FOUND", "素材文件不存在");
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(row.mimeType())).header("Cache-Control", "no-store").header("X-Content-Type-Options", "nosniff").body(new FileSystemResource(assets.path(row)));
    }
}
