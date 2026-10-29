package com.materialstudio.asset;

import com.materialstudio.ApiTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.http.*;
import java.nio.ByteBuffer;
import java.util.Arrays;
import java.util.zip.CRC32;
import static org.assertj.core.api.Assertions.assertThat;

class AssetApiTest extends ApiTestSupport {
    @Test void savesCompleteImagesAndOnlyTheirOwnerCanReadOriginalBytes() throws Exception {
        String owner = session(); byte[] png = image("png");
        var response = upload(owner, png, "image/png");
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        String id = response.getBody().path("id").asText();
        String url = response.getBody().path("url").asText();
        assertThat(response.getBody().path("sizeBytes").asLong()).isEqualTo(png.length);
        var headers = new HttpHeaders(); headers.set(HttpHeaders.COOKIE, owner);
        var read = http.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), byte[].class);
        assertThat(read.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(read.getBody()).isEqualTo(png);
        assertThat(read.getHeaders().getFirst("Cache-Control")).isEqualTo("no-store");
        assertThat(read.getHeaders().getFirst("X-Content-Type-Options")).isEqualTo("nosniff");
        assertThat(call(url, HttpMethod.GET, session(), null).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(call(url, HttpMethod.GET, null, null).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        String filename = jdbc.queryForObject("SELECT storage_filename FROM asset WHERE id=?", String.class, id);
        assertThat(filename).doesNotContain("..", "photo");
        assertThat(java.nio.file.Files.readAllBytes(STORAGE.resolve(filename))).isEqualTo(png);
    }
    @Test void supportsJpegAndRejectsFakeTypesAndCorruptImagesWithoutRegistration() throws Exception {
        String owner = session();
        var jpeg = upload(owner, image("jpeg"), "image/jpeg");
        assertThat(jpeg.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(jpeg.getBody().path("mimeType").asText()).isEqualTo("image/jpeg");
        int before = jdbc.queryForObject("SELECT COUNT(*) FROM asset", Integer.class);
        assertThat(upload(owner, image("png"), "image/gif").getStatusCode().value()).isEqualTo(415);
        assertThat(upload(owner, image("png"), "image/jpeg").getStatusCode().value()).isEqualTo(422);
        assertThat(upload(owner, "not an image".getBytes(), "image/png").getStatusCode().value()).isEqualTo(422);
        assertThat(upload(owner, new byte[0], "image/png").getStatusCode().value()).isEqualTo(422);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM asset", Integer.class)).isEqualTo(before);
    }
    @Test void acceptsExactlyFiveMiBAndRejectsOneByteOver() throws Exception {
        String owner = session();
        byte[] boundary = Arrays.copyOf(image("png"), 5242880);
        assertThat(upload(owner, boundary, "image/png").getStatusCode()).isEqualTo(HttpStatus.CREATED);
        var over = upload(owner, Arrays.copyOf(boundary, boundary.length + 1), "image/png");
        assertThat(over.getStatusCode().value()).isEqualTo(413);
        assertThat(over.getBody().path("error").path("code").asText()).isEqualTo("FILE_TOO_LARGE");
    }
    @Test void rejectsHugePixelMetadataBeforeAllocatingTheDecodedImage() throws Exception {
        byte[] png = image("png");
        ByteBuffer.wrap(png).putInt(16, 6000).putInt(20, 6000);
        CRC32 crc = new CRC32(); crc.update(png, 12, 17); ByteBuffer.wrap(png).putInt(29, (int)crc.getValue());
        var response = upload(session(), png, "image/png");
        assertThat(response.getStatusCode().value()).isEqualTo(422);
        assertThat(response.getBody().path("error").path("code").asText()).isEqualTo("INVALID_IMAGE");
    }
    @Test void refusesUnauthenticatedUploads() throws Exception {
        assertThat(upload(null, image("png"), "image/png").getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
