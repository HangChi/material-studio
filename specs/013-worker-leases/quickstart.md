# Validation
容器LeaseTest/ResultStoreIsolationTest先RED再GREEN；完整backend-test。独立material-studio-013端口3113用--scale backend=2，STUDIO_LEASE_MS=3000，仅在此卷写fixture/强杀一个实例，核对两个不同lease_owner参与、过期接管/结果和旧代次拒绝。原3000保持011，最终全部交付后保留卷更新。记录docs/013-validation.md。
