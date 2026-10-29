package com.materialstudio.template;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import static org.assertj.core.api.Assertions.assertThat;

@org.springframework.test.annotation.DirtiesContext(classMode=org.springframework.test.annotation.DirtiesContext.ClassMode.AFTER_CLASS)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class TemplateApiTest {
    @Autowired TestRestTemplate http;
    @Autowired ObjectMapper json;

    @Test void categoriesAndTemplatesComeFromTheJavaApi() throws Exception {
        ResponseEntity<String> categories = http.getForEntity("/api/template-categories", String.class);
        assertThat(categories.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(json.readTree(categories.getBody()).path("items").size()).isEqualTo(2);
        JsonNode all = getItems("/api/templates");
        assertThat(all.size()).isEqualTo(3);
        assertThat(all.get(0).path("title").asText()).isNotBlank();
    }

    @Test void filtersByCategoryAndReturnsAnEmptyCollectionForUnknownCategory() throws Exception {
        JsonNode creative = getItems("/api/templates?categoryId=creative");
        assertThat(creative.size()).isEqualTo(2);
        creative.forEach(t -> assertThat(t.path("categoryId").asText()).isEqualTo("creative"));
        assertThat(getItems("/api/templates?categoryId=social").size()).isEqualTo(1);
        assertThat(getItems("/api/templates?categoryId=missing").size()).isZero();
    }

    @Test void coversAreRealLocalPngFiles() throws Exception {
        for (JsonNode template : getItems("/api/templates")) {
            ResponseEntity<byte[]> image = http.getForEntity(template.path("coverUrl").asText(), byte[].class);
            assertThat(image.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(image.getHeaders().getContentType().toString()).isEqualTo("image/png");
            assertThat(image.getHeaders().getFirst("X-Content-Type-Options")).isEqualTo("nosniff");
            assertThat(image.getBody()).startsWith((byte)137, (byte)80, (byte)78, (byte)71);
        }
    }

    @Test void detailsExposeAllMaterialRequirements() throws Exception {
        String[] ids = {"demo-portrait", "demo-postcard", "demo-collage"};
        for (int i = 0; i < ids.length; i++) {
            ResponseEntity<String> response = http.getForEntity("/api/templates/" + ids[i], String.class);
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            JsonNode detail = json.readTree(response.getBody());
            assertThat(detail.path("id").asText()).isEqualTo(ids[i]);
            assertThat(detail.path("requiredImageCount").asInt()).isEqualTo(i + 1);
            assertThat(detail.path("maxFileSizeBytes").asLong()).isEqualTo(5242880L);
            assertThat(detail.path("acceptedMimeTypes").toString()).isEqualTo("[\"image/jpeg\",\"image/png\"]");
            assertThat(detail.path("description").asText()).isNotBlank();
        }
    }

    @Test void unknownTemplateHasASafeActionable404() throws Exception {
        ResponseEntity<String> response = http.getForEntity("/api/templates/missing", String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(json.readTree(response.getBody()).path("error").path("code").asText()).isEqualTo("TEMPLATE_NOT_FOUND");
        assertThat(response.getBody()).doesNotContain("stackTrace", "SQLException");
    }

    @Test void nonWhitelistedFilesCannotBeRead() {
        assertThat(http.getForEntity("/api/demo/secret.txt", String.class).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(http.getForEntity("/api/demo/missing.png", String.class).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    private JsonNode getItems(String url) throws Exception {
        ResponseEntity<String> response = http.getForEntity(url, String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return json.readTree(response.getBody()).path("items");
    }
}
