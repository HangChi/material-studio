# 027 · 作品管理表单验收

2026-10-31完成。用户反馈管理区宽大、按钮露出任务编号；首版后继续要求精简。最终桌面名称/标签左右并排，各自短保存按钮；手机纵排。移除内层白色框，收藏/隐藏收至底部透明操作行。可见标签保存与重试不再显示id，aria-label保留id以区分作品。原独立保存、懒加载、错误/401/abort与请求数据保持不变。

纯展示调整不强造RED，未增删测试。首次复用测试卷执行失败：eslint不存在；标准compose npm ci随后遇到网络慢下载/重试，未算业务RED或检查通过。改用相同Dockerfile的build阶段现有依赖：`docker build --target build -t material-studio-frontend-check ./frontend`，然后`docker run --rm material-studio-frontend-check sh -c 'npm run lint && npm run typecheck && npm test'`，30文件144项及lint/typecheck通过（`/tmp/xiaoying-027-check.log`）。生产`docker compose up --build -d --no-deps frontend`包含最终CSS构建成功（`/tmp/xiaoying-027-final-runtime.log`）。慢下载临时容器已停止，不影响运行服务。

真实既有演示作品：展开管理并读取标签，1280px输入框top均613.5703125、宽均457；375px输入框左右均37/250、宽213，scrollWidth等于各自视口。四个操作按钮均44px高。桌面/手机截图已目视核对：[桌面](027-work-desktop.jpg)、[手机](027-work-mobile.jpg)。未提交名称、标签、收藏或隐藏等真实数据变更，原名称更新由既有组件测试回归覆盖；本轮不宣称实测写入。恢复临时视口，保留记录页。Java无变化未重跑，未推送远端或执行新CI。
