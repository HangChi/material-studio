# Account contract amendment
POST /api/account/register与/recover的password为8～18字符，422 VALIDATION_FAILED，提示“密码需8～18个字符”。/login与/recovery-code接受8～128字符，用于保留旧密码兼容，无新增复杂度要求。
非法新密码不创建账号、不消耗恢复码、不撤销会话。恢复成功仍更换恢复码并撤销全部旧会话；节流与哈希不变。
游客合并仍只有checkbox勾选且confirm确认后才发送mergeGuest:true。details收起时默认false；展开并勾选后即使再次收起，提交仍必须确认。恢复码仅当次显示，必须勾选保存才继续。右上角同页通知不卸载恢复码内容。
