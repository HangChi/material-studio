package com.materialstudio.template;

public record TemplateRow(String id, String title, String categoryId, String coverFilename,
                          String description, int requiredImageCount) {}
