# 研究与决策

日期2026-10-29，当前单智能体串行执行。

- Decision: 保留001作总体基线，002～005分别立feature；只展开002实现计划。
  Rationale: 每期可独立验收，不把项目全集当一个feature。Alternatives: 删除001会丢失历史依据，故保留并标记非执行入口。
- Decision: Boot3.5 + Starter3.0 + Java21；Next16 + React19 + Node22。
  Rationale: 满足原题与兼容矩阵，实际patch通过仓库解析后锁定。Alternatives: 不迁移Boot4或引入更多状态库。
  Sources: [Boot系统要求](https://docs.spring.io/spring-boot/3.5/system-requirements.html)、
  [MyBatis兼容矩阵](https://mybatis.org/spring-boot-starter/mybatis-spring-boot-autoconfigure/)、
  [Next安装](https://nextjs.org/docs/app/getting-started/installation)。
- Decision: Flyway种子/MyBatis真实查询 + Compose测试数据库，不用前端数组替代业务接口。
  Rationale: 当前表简单，仅需模板读取；当前无需Testcontainers嵌套Docker。Alternatives: JSON种子也可行，但MySQL为后续提供可增量迁移入口。
- Decision: 客户端请求状态显式表达，AbortController配合递增请求序号。
  Rationale: 快速切分类旧响应不能覆盖当前结果。Alternatives: 暂不引入客户端数据框架。
- Decision: Java程序绘制自制PNG样张，随源码交付；图片由Java白名单接口提供。
  Rationale: 无版权/外部网络依赖，不需要生成真实图片内容；不引入AI图片服务。Alternatives: 不使用远程图库。
- Decision: 单一Compose包含应用、隔离测试数据库和测试profile；CI调用相同检查入口。
  Rationale: 宿主无需安装应用依赖；本轮Docker daemon29.9.2已通过授权访问验证。

## 实施确认

固定Next16.4.3、React19.3.1、TypeScript5.9.3、Vitest4.1.12、Boot3.5.16、Starter3.0.5。
ESLint9.39.5符合Next插件peer范围，暂不使用会产生peer冲突的ESLint10；保留升级兼容性评估。
基础npm10解析出现edgesOut异常，固定npm11.6.2；在空node_modules环境生成完整锁文件，避免可选平台依赖遗漏。
镜像均固定digest；实际代码、锁文件和容器检查结果优先于早期版本系列设想。
