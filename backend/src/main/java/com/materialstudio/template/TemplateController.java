package com.materialstudio.template;

import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class TemplateController {
    private static final Set<String> COVERS = Set.of("portrait.png", "postcard.png", "collage.png");
    private final TemplateMapper mapper;

    public TemplateController(TemplateMapper mapper) { this.mapper = mapper; }

    @GetMapping("/template-categories")
    public Map<String, List<Category>> categories() { return Map.of("items", mapper.categories()); }

    @GetMapping("/templates")
    public Map<String, List<TemplateView>> templates(@RequestParam(required = false) String categoryId) {
        return Map.of("items", mapper.templates(categoryId).stream().map(TemplateView::from).toList());
    }

    @GetMapping("/templates/{id}")
    public ResponseEntity<?> detail(@PathVariable String id) {
        TemplateRow row = mapper.find(id);
        if (row == null) {
            return ResponseEntity.status(404).body(Map.of("error", Map.of(
                    "code", "TEMPLATE_NOT_FOUND", "message", "模板不存在")));
        }
        return ResponseEntity.ok(TemplateView.from(row));
    }

    @GetMapping("/demo/{filename}")
    public ResponseEntity<Resource> cover(@PathVariable String filename) {
        if (!COVERS.contains(filename)) return ResponseEntity.notFound().build();
        Resource file = new ClassPathResource("demo/" + filename);
        if (!file.exists()) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().contentType(MediaType.IMAGE_PNG).header("X-Content-Type-Options", "nosniff").body(file);
    }
}
