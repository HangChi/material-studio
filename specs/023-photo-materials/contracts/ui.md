# UI and asset contract
现有模板API、三项模板ID/封面URL及PNG格式不变。首页“示例素材”包括6个带download属性的本地原文件链接和“下载验证素材包”ZIP，作者链接到原摄影页面；提供Unsplash License链接及来源文本。图片不得混入付费/无来源内容。
有效素材manifest包含file/title/author/source/downloadUrl/format/width/height/bytes/sha256；数据由实际下载与解码计算。无效文件仅位于ZIP的02-invalid目录，说明预期报错及原生文件选择器“所有文件”选项。
正常用例：单图使用人物或花卉；双图使用湖景/旷野调整构图；三图依序选择花卉/咖啡/森林。验证重点为预览、输入校验、阶段、结果下载、历史与刷新，不宣称人工用例已由用户验证。
