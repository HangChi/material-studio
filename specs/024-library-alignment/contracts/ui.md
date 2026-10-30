# UI contract
AssetPicker/UploadSlots的请求、props、归属与生命周期不变。单图picker.left/right=slot-body.left/right，picker.top-slot-body.bottom=16px；多图picker边界与slot-body内容边界一致。batch现有16px 0 0规则保留。网格无子项时不参与布局。
