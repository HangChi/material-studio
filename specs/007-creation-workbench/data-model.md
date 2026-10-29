# 数据模型

新增job_recipe：job_id主键/外键；parameters_json可空；source_job_id可空外键。仅创建时写入，原配方不变。旧任务缺行视为默认参数。
新增job_request：owner_id外键；request_key VARCHAR(80) ASCII区分大小写，联合主键；fingerprint CHAR(64)；job_id外键。与任务同一事务写入；标识为1～80位字母/数字/下划线/连字符。
PostcardParameters：title最多40个Unicode码点，不允许控制字符；palette CREAM/OCEAN；format LANDSCAPE/SQUARE；crops恰好2项，每项x/y为有限0～1，zoom为有限1～3。缺省整组参数使用默认标题“旅途来信”、CREAM、LANDSCAPE、两张居中zoom1；提供parameters时字段必须齐全。非明信片不得提供parameters。
不增加任务状态，重复操作直接返回最新快照，原终态不回退。
