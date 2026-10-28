# Implementation Plan: 模板浏览与详情

**Branch**: `002-template-catalog` | **Date**: 2026-10-29 | **Spec**: [spec.md](spec.md)

**Input**: spec.md，仅实现002切片；001为总体参考，003～005不在本次实现范围。

## Summary

Next.js App Router提供分类列表、模板详情与状态反馈，同源只读代理调用Java。
Java/Spring Boot/MyBatis读取MySQL模板表，Flyway初始化两类三模板，封面为项目自制本地PNG。
先写真实接口/界面行为测试观察RED，再逐步实现，容器内验证及增量提交。

## Technical Context

**Language/Version**: Java21、Node22、TypeScript5；具体依赖以本期pom/package-lock锁定结果为准。

**Primary Dependencies**: Spring Boot3.5、MyBatis Starter3.0、Next16、React19。

**Storage**: MySQL8.4，只创建template_category/template，Flyway迁移。

**Testing**: JUnit5真实HTTP/真实MySQL；Vitest/Testing Library/jsdom，mock fetch及可控Promise。

**Target Platform**: Docker Linux；桌面及375px网页。

**Project Type**: 前后端Web monorepo。

**Performance Goals**: 列表无额外轮询，单次加载；切分类及时反馈，旧请求不覆盖。

**Constraints**: 全部应用安装、测试、构建在容器；不预建身份/任务系统；不调用外部图片服务。

**Scale/Scope**: 2分类3模板、2页、4个只读接口。无上传/制作/历史入口。

## Constitution Check

| 原则 | 设计前/后 | 依据 |
| --- | --- | --- |
| 需求可追踪 | PASS/PASS | 002 FR对应接口/测试/任务；003～005独立spec |
| TDD | PASS/PASS | 接口先RED后实现；组件先RED后实现；日志记录真实输出 |
| Java持久化 | PASS/PASS | MyBatis/MySQL/Flyway；不在前端写死模板 |
| 异步隔离 | PASS/PASS | 列表abort/requestId；本期无个人资源 |
| 简单可复现 | PASS/PASS | Compose及CI覆盖当前增量 |

## Project Structure

### Documentation (this feature)

spec.md、plan.md、research.md、data-model.md、contracts/http-api.md、quickstart.md、tasks.md、checklists/requirements.md。

### Source Code (repository root)

```text
backend/pom.xml
backend/src/main/java/com/materialstudio/MaterialStudioApplication.java
backend/src/main/java/com/materialstudio/template/
backend/src/main/resources/db/migration/
backend/src/main/resources/demo/
backend/src/test/java/com/materialstudio/template/TemplateApiTest.java
frontend/package.json
frontend/package-lock.json
frontend/src/app/
frontend/src/features/templates/
compose.yaml
.github/workflows/ci.yml
```

**Structure Decision**: 沿用总体分前后端目录，仅引入当前所需模块。

## UI设计

素材工坊面向想快速选到图片样式的用户，本页唯一主任务是浏览并了解模板。
采用“样张架”布局：冷白工作台背景#F3F6FA、深蓝墨色#172A42、钴蓝操作色#275DCE、白卡#FFFFFF、
次文字#526277、边框#D6DFEA；封面承担视觉表达，周边控件保持安静。
标题用系统中文黑体，正文系统无衬线，英文小标用monospace；不加载外部字体。
特征为不同构图的样张封面和卡片下方清晰“需要N张图片”，不是通用营销落地页。
桌面3列卡片/左侧简洁标题；窄屏单列；详情为样张+规格双栏，375px垂直堆叠。
分类使用真实button、aria-pressed，重试用button，卡片用链接；skip link、可见focus、低动态偏好。
不展示尚未实现的上传、制作或历史操作，避免伪入口。
已参考frontend-design/ui-ux-pro-max；舍弃搜索建议中的紫粉营销hero，因本期任务是选模板而非推广工具。

## Complexity Tracking

本期使用Compose专用test数据库执行真实MySQL集成测试，代替总体设想的Testcontainers，
原因是002只需验证读取和初始化，无事务并发行为；避免测试容器内再控制Docker。003涉及事务时重新评估。
此调整不违反MySQL真实验证要求；不使用H2，不跳过集成用例。
