package com.materialstudio;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import java.nio.file.*;
import static org.assertj.core.api.Assertions.assertThat;

@org.springframework.test.annotation.DirtiesContext(classMode=org.springframework.test.annotation.DirtiesContext.ClassMode.AFTER_CLASS)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public abstract class ApiTestSupport {
    @Autowired protected TestRestTemplate http;
    @Autowired protected JdbcTemplate jdbc;
    @org.junit.jupiter.api.AfterEach void releaseUnfinishedFixtures(){
        // Scheduler scans persisted tasks; fixtures must not leak into a later application context.
        jdbc.update("UPDATE job SET status='FAILED',error_code='TEST_CLEANUP',error_message='测试结束',finished_at=CURRENT_TIMESTAMP(6),updated_at=CURRENT_TIMESTAMP(6),version=version+1 WHERE status IN ('QUEUED','RUNNING')");
    }
    protected static final Path STORAGE;
    static { try { STORAGE = Files.createTempDirectory("studio-assets-test-"); } catch (Exception e) { throw new ExceptionInInitializerError(e); } }
    @DynamicPropertySource static void storage(DynamicPropertyRegistry registry) {
        registry.add("studio.storage-root", () -> STORAGE.toString());
    }
    protected ResponseEntity<JsonNode> call(String path, HttpMethod method, String cookie, Object body) {
        HttpHeaders headers = new HttpHeaders();
        if (cookie != null) headers.set(HttpHeaders.COOKIE, cookie);
        if (body != null) headers.setContentType(MediaType.APPLICATION_JSON);
        return http.exchange(path, method, new HttpEntity<>(body, headers), JsonNode.class);
    }
    protected ResponseEntity<JsonNode> upload(String cookie, byte[] bytes, String mime) {
        var partHeaders = new HttpHeaders(); partHeaders.setContentType(MediaType.parseMediaType(mime));
        var resource = new org.springframework.core.io.ByteArrayResource(bytes) { @Override public String getFilename() { return "../../photo.png"; } };
        var parts = new org.springframework.util.LinkedMultiValueMap<String, Object>();
        parts.add("file", new HttpEntity<>(resource, partHeaders));
        var headers = new HttpHeaders(); headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        if (cookie != null) headers.set(HttpHeaders.COOKIE, cookie);
        return http.exchange("/api/assets", HttpMethod.POST, new HttpEntity<>(parts, headers), JsonNode.class);
    }
    protected byte[] image(String format) throws Exception {
        var image = new java.awt.image.BufferedImage(8, 8, java.awt.image.BufferedImage.TYPE_INT_RGB);
        var out = new java.io.ByteArrayOutputStream(); javax.imageio.ImageIO.write(image, format, out); return out.toByteArray();
    }
    protected String asset(String cookie) throws Exception {
        var response = upload(cookie, image("png"), "image/png");
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return response.getBody().path("id").asText();
    }
    protected String session() {
        ResponseEntity<JsonNode> response = call("/api/session", HttpMethod.POST, null, null);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getHeaders().getFirst(HttpHeaders.SET_COOKIE).split(";", 2)[0];
    }
}
