# 006状态与不变量

数据库不变。History页cursor可空，仅成功分页响应写入，每次刷新从首页重新取得；失败不得改cursor。
ResultPreview状态按job/resultUrl隔离：attempt为非负整数，failed/loading为布尔值。初始0次；错误显示提示；手动重试attempt+1、清错误，load后结束等待。失败可继续重复重试。
资源状态不写入JobTracker；SUCCEEDED永不因资源错误变为FAILED。身份边界卸载组件后清空状态。
测量样本：index 1～10、jobId、elapsedMs、HTTP状态、终态及制作总耗时；不保存cookie/token。API与浏览器样本分组记录。
