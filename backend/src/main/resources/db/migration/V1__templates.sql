CREATE TABLE template_category (
  id VARCHAR(40) PRIMARY KEY,
  name VARCHAR(80) NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE template (
  id VARCHAR(60) PRIMARY KEY,
  category_id VARCHAR(40) NOT NULL,
  title VARCHAR(100) NOT NULL,
  description VARCHAR(500) NOT NULL,
  cover_filename VARCHAR(80) NOT NULL,
  required_image_count INT NOT NULL,
  CONSTRAINT fk_template_category FOREIGN KEY (category_id) REFERENCES template_category(id),
  CONSTRAINT ck_template_image_count CHECK (required_image_count IN (1, 2, 3))
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
INSERT INTO template_category (id, name) VALUES ('creative', '创意图片'), ('social', '社交分享');
INSERT INTO template (id, category_id, title, description, cover_filename, required_image_count) VALUES
('demo-portrait', 'creative', '日光肖像', '把一张喜欢的照片放进日光与色块之间，留下属于你的封面。', 'portrait.png', 1),
('demo-postcard', 'creative', '旅行明信片', '用两张旅途照片，一张留给风景，一张留给故事。', 'postcard.png', 2),
('demo-collage', 'social', '周末拼贴', '把三段周末小事，拼成一张值得分享的生活切片。', 'collage.png', 3);
