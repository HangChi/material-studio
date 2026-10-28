package com.materialstudio.template;

import java.util.List;

public record TemplateView(String id, String title, String categoryId, String coverUrl,
                           String description, int requiredImageCount,
                           List<String> acceptedMimeTypes, long maxFileSizeBytes) {
    public static TemplateView from(TemplateRow row) {
        return new TemplateView(row.id(), row.title(), row.categoryId(), "/api/demo/" + row.coverFilename(),
                row.description(), row.requiredImageCount(), List.of("image/jpeg", "image/png"), 5242880L);
    }
}
