# 提交说明

整理日期：2026-10-31（Asia/Shanghai）。本页为当前交付入口，其他编号验收文档保留各阶段事实。

## 源码与验收版本

- 仓库：https://github.com/HangChi/material-studio
- 交付分支：`006-mvp-hardening`。
- 功能版本：`6986a1060e555625fbc20bf1cc6f3c279f1adc5e`（包含027作品管理表单整理）。其后的本轮提交仅整理文档。
- 最终验收提交：在交付分支执行 `git rev-parse HEAD`；提交回复中附完整commit及固定链接，避免只提供可能继续变化的分支名。
- 交付范围：002～027，原题逐项对应见[验收对照](acceptance.md)，结构、启动、配置、模拟控制、身份、部署回滚、AI工作流和素材来源见[README](../README.md)。

## 已有验证与本轮边界

| 范围 | 已有结果 | 对应版本与证据 |
| --- | --- | --- |
| 前端 | 30文件144项测试、lint/typecheck通过，生产构建成功；1280/375px作品管理表单核对完成 | 功能版本6986a10；[027验收](027-validation.md) |
| 提交前前端复查 | 144项测试、lint/typecheck/build通过；全新npm ci因官方源EIDLETIMEOUT失败，改用package.json与锁文件SHA-256均一致的已有依赖镜像、挂载当前源码，在断网容器内完成检查 | 027之前的8f084ad；本机日志 `/tmp/xiaoying-submission-frontend.log` |
| Java | mvn verify通过；100项测试，0失败、0错误、0跳过，打包成功，使用独立测试MySQL | 8f084ad提交前复查；本机日志 `/tmp/xiaoying-submission-java.log`；后续027无Java变更；[022](022-validation.md)、[023](023-validation.md)亦有100项基线 |
| 页面与素材 | 四个主要页面、模板/分类接口、封面和ZIP返回200；6图大小、SHA-256及ZIP内容一致，文档本地链接可读 | 8f084ad提交前只读核对；后续027仅作品管理展示调整 |
| 远端CI | 012～015阶段已有通过记录 | [015验收](015-validation.md)；历史成功不能替代最终交付提交的新CI |

用户在本轮明确要求不再测试，因此仅整理文档并执行Git差异、文档链接及交付版本核对，不运行应用测试、安装、构建或浏览器验收。本轮文档提交使用 `[skip ci]` 避免重复测试；保留原push/PR流水线配置，不宣称最终交付提交通过了新CI。

本机 `/tmp` 日志用于定位本次执行，不随仓库交付；评估者可按README在容器内复现，不依赖这些日志文件。TLS/公网部署、最终版本的全新依赖安装及本轮空卷冷启动未重新验证。

## 提交前问题处理

1. 以027功能版本统一README、原题验收索引及开发入口；历史验收数字保留阶段含义。
2. 更新V1～V16初始化说明、访客与账号恢复边界、多实例支持说明，移除现行说明中的冲突。
3. 照片封面重建入口改为 `scripts/prepare-samples.sh`，前提为已有后端Maven依赖缓存；正常启动直接使用仓库自带文件。
4. 本轮提交及推送后，以远端交付分支的完整HEAD作为最终源码与文档版本；具体提交号以提交回复为准。

## 可直接使用的提交回复

> 源码仓库：https://github.com/HangChi/material-studio  
> 分支：006-mvp-hardening  
> 验收commit：填写本次交付后的完整HEAD，并附对应commit链接。  
> 启动方式：在仓库根目录执行 `cp .env.example .env`、`docker compose up --build -d`，访问 http://localhost:3000 。  
> 已有验证：前端144项测试及lint/typecheck/构建通过，Java100项测试及打包通过；具体版本、执行方式与未验证边界见README和docs/submission.md。最终文档整理按要求未重复测试。AI使用流程、已知限制与素材来源均已记录。
