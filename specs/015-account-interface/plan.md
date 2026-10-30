# Plan: 账号界面优化
## Technical Context
Next/React/全局CSS，无新依赖或迁移，仅Account.tsx、account/page.tsx及账号CSS。
## Constitution Check
I～V通过。原题/后端不变，用户明确授权UI及完成后的进程关闭；单智能体串行。遵循Spec Kit，不新开分支，复用当前公开交付分支。
## Design
延续--action #286353、--ink #29332f、--muted #62716a、--canvas #f7f8f7、--paper #fff、--line #e0e5e1；宋体展示标题、系统黑体表单、monospace恢复码。桌面左侧创作档案说明/照片装裱图形，右侧集中表单；375px纵向且收起装饰。主表单登录/注册分段选择，找回次级入口；已登录摘要和安全操作列表，退出独立底部。
照片叠放是与本产品相关的唯一装饰，不增加营销卡片、渐变或外部字体。既有StudioIcon，装饰SVG aria-hidden。所有控件44px，标签关联帮助文本，错误role alert，加载aria-busy。
## Verification
交互先RED：密码显示不提交、切换模式清除与隐藏；登录态恢复操作可返回且清密码。原恢复码/显式迁移回归保留。纯排版用实际浏览器截图和375px宽度验证，不造CSS快照测试。前端完整lint/typecheck/test/build；Java无改动沿用014的95项，CI仍跑全部。
## Shutdown
最后docker compose down（不-v），枚举material-studio前缀容器/项目和本仓库宿主进程，只停止本项目。记录关停事实后文档提交推送、检查最终CI，确保无本地项目监听。
