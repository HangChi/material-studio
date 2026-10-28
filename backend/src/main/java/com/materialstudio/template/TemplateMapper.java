package com.materialstudio.template;

import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface TemplateMapper {
    @Select("SELECT id, name FROM template_category ORDER BY id")
    List<Category> categories();

    @Select("<script>SELECT id, title, category_id, cover_filename, description, required_image_count "
            + "FROM template <if test='categoryId != null'>WHERE category_id = #{categoryId}</if> "
            + "ORDER BY category_id, id</script>")
    List<TemplateRow> templates(@Param("categoryId") String categoryId);
    @Select("SELECT id, title, category_id, cover_filename, description, required_image_count FROM template WHERE id = #{id}")
    TemplateRow find(@Param("id") String id);
}

