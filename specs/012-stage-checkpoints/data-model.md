# Data Model
job_checkpoint主键(job_id,stage)，job外键；stage仅ASSET_CHECK/GENERATE；input_hash固定64十六进制字符，artifact_path可空随机UUID.png，artifact_hash可空64字符；GENERATE二者必有，ASSET_CHECK二者为空；created_at为UTC时间。每阶段最多一条；终态可删除断点行/文件。
事件kind增加RESUMED，stage为最后已完成阶段；job.version照常递增，无私有文件路径返回。
