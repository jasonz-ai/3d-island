# 贡献指南 · Contributing to 3D Island Studio

<p align="center">
  <a href="#-中文贡献指南">🇨🇳 中文贡献指南</a> · <a href="#-english-contributing-guide">🇺🇸 English Contributing Guide</a>
</p>

---

## 🇨🇳 中文贡献指南

感谢你对 **3D Island Studio** 开源项目的关注！我们致力于打造一个人人都能零门槛上手的 **3D 微缩人生世界个人主页生成器**——既保留温暖治愈的《模拟人生》式 3D 沙盒建造趣味，又坚守清晰、克制、高审美密度的个人网站初心。

### 1. 核心设计原则
1. **个人网站优先，克制「游戏化噪音」**：
   - 所有的 3D 建筑、悬浮晶锥（Plumbob）、昼夜光影与舒缓轻音乐，都是为了更好地呈现创作者的履历与作品；
   - 保持左上角 HUD 清晰克制，点击建筑时自动隐藏周边 HUD 聚焦特写。
2. **零外部重资产依赖，开箱即跑**：
   - 3D 建筑采用参数化 Three.js 几何体与程序化材质构建，无需加载数十 MB 的外部 `.glb` 模型；
   - 保证仓库轻量、`npm install && npm run dev` 秒级启动。
3. **空间避障与视觉兜底**：
   - 新增或修改任何建筑、地形版型时，必须确保四角稳落陆地、正门视线走廊零遮挡，并通过 `npm test -- --run` 空间几何契约测试。

### 2. 本地开发流程

```bash
# 1. Fork 并克隆仓库
git clone https://github.com/<your-username>/3d-island.git
cd 3d-island

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev

# 4. 提交前运行契约测试与生产构建
npm test -- --run
npm run build
```

### 3. 如何新增 3D 建筑母型 (`BuildingStyle`)
1. 在 [`src/schema/profile.ts`](./src/schema/profile.ts) 的 `BuildingStyle` 联合类型与 `BUILDING_STYLE_OPTIONS` 中添加新建筑标识及所属分类（`education | landmark | career`）；
2. 在 [`src/ui/appUi.ts`](./src/ui/appUi.ts) 的 `renderStylePreviewSvg()` 中添加对应的矢量缩略图；
3. 在 [`src/scene/buildings.ts`](./src/scene/buildings.ts) 的 `buildDetailedBuilding()` 中编写参数化 Three.js 建模函数（系统会自动为其装配双层花岗岩基座 `arch-ground-plinth`、四角步道灯 `plinth-pathway-lights` 与悬浮晶锥 `landmark-plumbob`）。

---

## 🇺🇸 English Contributing Guide

Thank you for your interest in contributing to **3D Island Studio**! Our goal is to make interactive 3D personal websites accessible to everyone — combining the joy of Sims-style 3D world-building with clean, editorial portfolio design.

### 1. Design Principles
1. **Personal Portfolio First, Zero Clutter**:
   - Every 3D building, floating Plumbob crystal, lighting preset, and ambient track exists to showcase the creator's story and work;
   - Keep the top-left HUD clean and automatically hide peripheral chrome when inspecting a building.
2. **Procedural & Lightweight (Zero Heavy `.glb` Assets)**:
   - All 37 buildings are constructed procedurally with Three.js primitives and materials so the repository stays fast and boots instantaneously.
3. **Strict Spatial & Schema Contracts**:
   - Every building and terrain change must pass the automated SDF collision, grounding, and schema validation suite (`npm test -- --run`).

### 2. Adding a New 3D Building Style (`BuildingStyle`)
1. Register the new `BuildingStyle` ID and metadata under `BUILDING_STYLE_OPTIONS` in [`src/schema/profile.ts`](./src/schema/profile.ts) (`education | landmark | career`);
2. Add its SVG catalog preview in `renderStylePreviewSvg()` in [`src/ui/appUi.ts`](./src/ui/appUi.ts);
3. Implement its procedural Three.js geometry in `buildDetailedBuilding()` in [`src/scene/buildings.ts`](./src/scene/buildings.ts) (the granite plinth, pathway lights, and floating Plumbob are attached automatically).

### 3. Pull Request Checklist
- Use clear Conventional Commit messages (e.g., `feat(buildings): add nordic library model` or `fix(ui): improve mobile drawer scroll`);
- Verify `npm test -- --run` and `npm run build` pass with 0 errors before opening a PR.
