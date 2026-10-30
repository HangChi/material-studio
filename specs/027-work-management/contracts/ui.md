# UI contract
PATCH /api/jobs/{id}/library、GET tags与POST bulk保持不变。名称/标签独立保存，收藏及隐藏恢复语义保持；可见保存标签/重新读取标签不含id，aria-label继续含id。管理作品仍原生details，默认收起。
