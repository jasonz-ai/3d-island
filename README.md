<div align="center">

# 🏝️ 3D Island Studio

**千人千世界的低多边形（Low-Poly）3D 个人主页与交互式履历生成引擎**  
*Turn your resume and portfolio into an interactive, customizable 3D miniature world — zero 3D modeling required.*

[![License: MIT](https://img.shields.io/badge/License-MIT-E8643A.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6.svg)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL-000000.svg)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF.svg)](https://vitejs.dev/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-10B981.svg)](./CONTRIBUTING.md)

<h3>
  <strong>🇨🇳 简体中文</strong> · <a href="./README.en.md">🇺🇸 English</a>
</h3>

</div>

---

## 📖 目录（Table of Contents）

- [🌟 为什么做这个项目？](#-为什么做这个项目)
- [🎬 实机 3D 渲染预览](#-实机-3d-渲染预览)
- [✨ 核心功能全景](#-核心功能全景)
- [🚀 保姆级使用指南（4 种使用姿势）](#-保姆级使用指南4-种使用姿势)
  - [姿势一：零代码浏览器内直接捏岛 + 生成分享链接（3 分钟上手）](#姿势一零代码浏览器内直接捏岛--生成分享链接3-分钟上手)
  - [姿势二：Fork 仓库 + 部署为你自己的独立网站（5 分钟免费上线）](#姿势二fork-仓库--部署为你自己的独立网站5-分钟免费上线)
  - [姿势三：用 AI 一键生成专属母校 / 公司大楼（或联系作者定制）](#姿势三用-ai-一键生成专属母校--公司大楼或联系作者定制)
  - [姿势四：URL 路由参数与快捷键速查表](#姿势四url-路由参数与快捷键速查表)
- [📐 `ProfileConfig` JSON 配置字段详解](#-profileconfig-json-配置字段详解)
- [🏛️ 内置 37 款 3D 建筑母型速查表](#️-内置-37-款-3d-建筑母型速查表)
- [💻 本地开发与测试](#-本地开发与测试)
- [📂 项目目录结构](#-项目目录结构)
- [🙏 灵感与致谢](#-灵感与致谢)
- [🤝 贡献与开源协议](#-贡献与开源协议)

---

## 🌟 为什么做这个项目？

传统的个人主页和简历往往是一维滚动的 PDF 或千篇一律的静态卡片。看到惊艳的 3D 交互个人网站时，绝大多数没有 Three.js 或 Blender 基础的创作者、产品经理、设计师和开发者都会被高昂的 3D 建模门槛劝退。

**3D Island Studio** 将整套 3D 场景生成彻底**参数化、零代码化**：
- **像《模拟人生》一样搭积木**：把你的**求学母校**、**家乡精神坐标**与 **1～6 段职业履历**映射为岛上的低多边形 3D 地标建筑；
- **双世界剧场叙事**：主岛展示教育与职业轨迹，点击岛畔载具（潜艇入海、热气球升空、骆驼远行、滑雪极光、火箭升空）即可一键穿梭至**「第二秘境」**浏览代表作展台；
- **开箱即用，人人可改**：既能在网页里直接粘贴简历文本、点鼠标换楼并生成 `#island=` 分享链接，也能导出 JSON 部署到 Vercel / GitHub Pages 成为你永久的个人域名主页。

---

## 🎬 实机 3D 渲染预览

| 🌊 蔚蓝群岛 · AI 产品 Builder（正午晴空） | 🏜️ 大漠峡谷 · 创意技术设计师（第44次日落） |
| :---: | :---: |
| ![Ocean Archipelago Day](./public/preview/hero-ocean-day.png) | ![Desert Canyon Sunset](./public/preview/hero-desert-sunset.png) |
| **❄️ 极光雪湾 · 出海独立创客（星空夜景）** | **🛠 模拟人生 3D 建造态 · 37 款建筑图鉴** |
| ![Snow Fjord Night](./public/preview/hero-snow-night.png) | ![Sims 3D Build Mode](./public/preview/sims-build-mode.png) |

---

## ✨ 核心功能全景

| 维度 | 内置能力 |
| :--- | :--- |
| **🎭 4 套职业人设模板** | 一键切换 **🤖 AI 产品 Builder**、**🎨 创意设计师**、**❄️ 出海独立创客**、**🚀 前沿科研学者** 4 座完整样板世界（[`src/data/personaPresets.ts`](./src/data/personaPresets.ts)） |
| **🌍 4 大生态 × 6 款地形** | **海岛 / 沙漠 / 雪山 / 草原** 4 种生态群落 × **星罗三岛 / B-612 星丘 / 双生红岩峡谷 / U型冰川雪湾 / 新月灯塔海湾 / 天空阶梯方舟** 6 种非圆盘立体地形 |
| **🚀 5 种第二秘境载具** | **黄潜艇入海（深海秘境）**、**骆驼远行（沙漠绿洲）**、**雪人滑雪（山脚极光冰谷）**、**火箭点火（近地轨道）**、**热气球升空（云端浮岛）** |
| **🏛️ 37 款参数化 3D 建筑** | **10 款求学母校** + **10 款家乡/精神地标** + **17 款行业总部大楼**（配双层花岗岩基座、四角暖光庭院灯、正门雨棚及顶部悬浮晶锥 Plumbob） |
| **🛠 模拟人生 3D 建造台** | 可视化点选建筑换外观、90° 旋转朝向、6 套屋顶色板、0.7×–1.45× 缩放、X/Z 坐标微调、摆放 6 款岛屿装饰物（B-612 玫瑰、小狐狸长椅、樱花林、篝火帐篷、荷兰风车、柯基犬） |
| **📄 智能简历解析器** | 粘贴任意中英文简历纯文本，自动提取姓名、标语、母校、历任公司/职位/时间线及代表项目，秒级生成 3D 岛屿 |
| **🎵 双模原声轻音乐电台** | 默认开启 3 首高音质轻量立体声循环配乐（`morning-breeze` / `warm-sunset` / `starlight-ambient`）+ WebAudio 实时泛音合成器，支持一键开关 |
| **🔗 免后端分享 & 拍立得** | 一键生成 `#island=<base64url>` 免后端纯享访客链接，或将当前 3D 视角连同地貌印章导出为高清 PNG 拍立得明信片 |

---

## 🚀 保姆级使用指南（4 种使用姿势）

### 姿势一：零代码浏览器内直接捏岛 + 生成分享链接（3 分钟上手）

如果你**完全不懂代码**，只想快速捏一座自己的 3D 岛屿分享给朋友或放进社交媒体简介：

1. **体验预设模板**：打开页面后，点击左上角 **`✦ 预设模板`** 行的 4 个胶囊，体验不同地貌与职业配置；
2. **一键导入你的简历**：
   - 点击左上角 **`🛠 建造模式`** → 点击建造坞顶部的 **`📂 全量表单 / JSON`**；
   - 在弹出的定制抽屉顶部找到 **`📄 粘贴简历文本一键解析`**，把你的中文或英文简历直接粘贴进去，点击 **`✨ 智能解析并生成我的 3D 岛屿`**；
3. **像玩《模拟人生》一样可视化改造**：
   - 在底部 **`🛠 模拟人生 3D 建造台`** 中，点击顶部槽位（如 `🎓 母校`、`🏮 地标`、`🏢 履历 1~6`、`🌍 岛屿地形`、`✨ 6 大奇观摆件`）或直接点击 3D 场景里的建筑；
   - 在左侧图鉴中点击任意卡片即可实时替换 3D 建筑外观；
   - 在右侧精调面板中修改**机构名称、职位、时间段、亮点描述**，或调整**朝向旋转（↻ 90°）、屋顶配色、建筑大小与位置偏移**；
   - 点击底部工具条的 **`🎲 灵感随机生成`** 可一键随机组合地貌、昼夜、天气与全岛建筑；
4. **分享或导出明信片**：
   - 点击底部建造坞的 **`🔗 复制分享链接`**，系统会将你的整座岛屿编码为 `#island=...` 链接并自动开启访客纯享视角（`?view=visitor`）；
   - 点击 **`📸 导出拍立得`**，即可下载带署名与地貌印章的高清 3D 岛屿明信片。

---

### 姿势二：Fork 仓库 + 部署为你自己的独立网站（5 分钟免费上线）

如果你想拥有一个属于自己独立域名（如 `yourname.vercel.app`）的永久 3D 个人主页，且访客打开直接看到你的岛屿：

1. **Fork 并克隆本仓库**：
   ```bash
   git clone https://github.com/<你的GitHub用户名>/3d-island.git
   cd 3d-island
   npm install
   npm run dev
   ```
2. **在本地浏览器里捏好你的岛屿并复制 JSON**：
   - 打开 `http://localhost:5173`，按「姿势一」在 **`🛠 建造模式`** 中把个人信息、建筑外观、地貌和作品集调到最满意的状态；
   - 点击 **`📂 全量表单 / JSON`** → 滑到最下方 **`导入 / 导出 JSON`** 区域 → 点击 **`复制 JSON`**。
3. **替换默认配置文件**：
   - 打开仓库中的 [`src/data/defaultProfile.ts`](./src/data/defaultProfile.ts)；
   - 将 `export const defaultProfile: ProfileConfig = { ... }` 的内容替换为你刚刚复制的 JSON，保存并提交 Git：
     ```bash
     git add src/data/defaultProfile.ts
     git commit -m "feat: update my personal 3D island profile"
     git push
     ```
4. **一键免费部署上线**：
   - **Vercel / Netlify / Cloudflare Pages**：导入你 Fork 后的 GitHub 仓库，构建命令填 `npm run build`，输出目录填 `dist`，点击 Deploy 即可在 30 秒内获得全球加速的 HTTPS 个人网站！

---

### 姿势三：用 AI 一键生成专属母校 / 公司大楼（或联系作者定制）

内置的 37 款通用建筑还不够？想在岛上 1:1 还原**你真实的母校标志性校门/主楼**，或者**你就职企业的总部大楼**？本项目内置了专为 AI 编程助手设计的扩展通道：

1. **打开专属定制向导**：
   - 进入 **`🛠 建造模式`**，滑到左侧建筑图鉴最底部，点击高亮卡片 **`✨ AI / 专属定制 · 定制专属母校 / 企业大楼`**（或在右侧定制抽屉点击 **`✨ 定制专属母校/名企大楼`**）；
2. **通道 A — 让 AI（Claude Code / Cursor / Codex）自动帮你写 3D 建筑代码**：
   - 在弹窗中输入你想还原的**建筑名称**（如 `某某大学图书馆` 或 `某某科技总部`）、选择分类（`求学母校 / 职业履历 / 家乡地标`），并简单描述它的**外观特征**（如 *"红砖三拱门、玻璃金字塔顶、门前两排银杏树"*）；
   - 点击 **`📋 一键复制 AI 建模 Prompt`**；
   - 将复制好的 Prompt 直接发给打开了本仓库的 **Claude Code / Cursor / Windsurf / Codex**，AI 会严格按照本仓库的 [`src/schema/profile.ts`](./src/schema/profile.ts) 与 [`src/scene/buildings.ts`](./src/scene/buildings.ts) 规范，为你自动编写参数化 Three.js 3D 模型、挂载四角步道灯与悬浮晶锥，并注册进建造图鉴！
3. **通道 B — 联系作者定制**：
   - 如果你不熟悉本地开发环境，可直接点击弹窗内的 **[💬 提交定制需求 Issue](https://github.com/jasonz-ai/3d-island/issues/new?title=%5BCustom+3D+Building%5D+%E7%94%B3%E8%AF%B7%E5%AE%9A%E5%88%B6%E4%B8%93%E5%B1%9E+3D+%E5%BB%BA%E7%AD%91&body=%E6%88%91%E6%83%B3%E5%AE%9A%E5%88%B6%E7%9A%84%E6%AF%8D%E6%A0%A1%2F%E4%BC%81%E4%B8%9A%E5%90%8D%E7%A7%B0%EF%BC%9A%0A%E5%BB%BA%E7%AD%91%E5%8F%82%E8%80%83%E7%89%B9%E5%BE%81%E6%88%96%E5%9B%BE%E7%89%87%EF%BC%9A)** 或联系作者主页 [`@jasonz-ai`](https://github.com/jasonz-ai)。

---

### 姿势四：URL 路由参数与快捷键速查表

你可以通过 URL 参数控制访客打开你网站时的初始状态：

| URL 参数 / Hash | 示例 | 作用说明 |
| :--- | :--- | :--- |
| `?preset=<id>` | `?preset=ai-builder`<br>`?preset=creative-designer`<br>`?preset=indie-founder`<br>`?preset=research-scholar` | 直接加载对应的职业人设样板世界 |
| `?view=visitor` | `?view=visitor` | **纯享访客模式**：隐藏「🛠 建造模式」与预设切换条，适合作为正式对外简历链接发送给 HR 或客户 |
| `?build=1` | `?build=1` | 打开页面时直接进入底部「模拟人生 3D 建造模式」 |
| `#island=<base64url>` | `#island=eyJuYW1lIjoi...` | 免后端状态分享 Hash，在 URL 中完整还原自定义岛屿配置 |

**常用交互手势与快捷键**：
- **左键拖拽 / 单指滑动**：360° 环绕旋转岛屿视角
- **滚轮缩放 / 双指捏合**：拉近欣赏建筑细节或拉远俯瞰全岛
- **点击建筑 / 悬浮标签**：镜头平滑推近特写 + 展开右侧博物馆级履历详情抽屉
- **点击岛畔载具（潜艇/骆驼/雪球/火箭/热气球）**：触发 4.4 秒电影级运镜，穿梭至「第二秘境」浏览代表作展台
- **`Esc` 键**：关闭当前抽屉 / 退出建造模式 / 返回主岛全景

---

## 📐 `ProfileConfig` JSON 配置字段详解

核心配置文件定义在 [`src/schema/profile.ts`](./src/schema/profile.ts) 中。以下是一份包含全部可选字段的完整结构示例：

```jsonc
{
  "name": "Alex Rivera · AI Builder",
  "tagline": "AI 产品与多智能体架构师 · 点击建筑看履历，触发载具前往第二秘境看代表作",
  "github": "https://github.com/jasonz-ai/3d-island",
  "linkedin": "https://www.linkedin.com",

  // 1. 生态群落: "ocean" (海岛) | "desert" (沙漠) | "snow" (雪山) | "grassland" (草原)
  "biome": "ocean",

  // 2. 第二秘境转场载具: "submarine" | "camel" | "snowball" | "rocket" | "balloon"
  "carrier": "submarine",

  // 3. 3D 地形轮廓: "archipelago" | "b612-highland" | "canyon-mesa" | "alpine-valley" | "crescent-bay" | "floating-terraces"
  "worldShape": "archipelago",

  // 4. 光影时刻: "day" (正午晴空) | "sunset" (第44次日落) | "night" (星空夜景)
  "timeOfDay": "day",

  // 5. 动态天气粒子: "clear" | "sakura" (落樱) | "snowfall" (飘雪) | "meteor" (流星) | "fireflies" (流萤)
  "weather": "clear",

  // 6. 岛上显示的职业履历大楼数量 (1 ~ 6)
  "companyCount": 4,

  // 7. 岛屿装饰奇观摆件 (可多选): "b612-rose" | "fox-bench" | "cherry-grove" | "campfire-tent" | "dutch-windmill" | "pet-corgi"
  "decorProps": ["b612-rose", "fox-bench", "pet-corgi"],

  // 8. 建筑节点列表 (含 1 座 education 母校 + 1 座 landmark 家乡地标 + 1~6 座 career 职业大楼)
  "places": [
    {
      "id": "university",
      "name": "Alma Mater University",
      "short": "大学校园",
      "kind": "education",          // "education" | "landmark" | "career"
      "style": "university",        // 见下方「37 款 3D 建筑母型速查表」
      "badgeText": "UNI",           // 建筑屋顶霓虹/铭牌短标
      "tintPreset": "default",      // "default" | "sakura" | "mint" | "amber" | "cyber" | "nordic"
      "rotationOffset": 0,          // 弧度制朝向偏移 (如 1.5708 表示旋转 90°)
      "buildingScale": 1.0,         // 建筑缩放倍率 (0.7 ~ 1.45)
      "offsetX": 0,                 // X 轴位置微调 (-4.5 ~ 4.5)
      "offsetZ": 0,                 // Z 轴位置微调 (-4.5 ~ 4.5)
      "roles": [
        {
          "title": "工学学士 & 系统工程研究",
          "period": "2016 – 2020",
          "location": "北京",
          "notes": ["主修人机交互与系统工程，开启数字产品构建之旅。"]
        }
      ]
    }
  ],

  // 9. 第二秘境代表作展台列表 (最多 6 个)
  "projects": [
    {
      "id": "project-1",
      "name": "3D Island Studio",
      "tag": "Open-Source Engine",
      "boothStyle": "booth-holo",   // "booth-holo" | "booth-crystal" | "booth-monolith" | "booth-mech" | "booth-arcade"
      "link": "/demos/generic-showcase/index.html?template=ai-builder",
      "repoUrl": "https://github.com/jasonz-ai/3d-island",
      "summary": "零门槛低多边形 3D 个人主页生成引擎。"
    }
  ]
}
```

---

## 🏛️ 内置 37 款 3D 建筑母型速查表

修改 JSON 或在建造模式点选时，`place.style` 必须与其所属分类 `place.kind` 对应：

<details>
<summary><strong>🎓 求学母校类（<code>kind: "education"</code> · 共 10 款）— 点击展开</strong></summary>

| `style` ID | 建筑名称 | 3D 视觉特征与标志性道具 |
| :--- | :--- | :--- |
| `university` | 古典红砖穹顶大学 | 三拱古典校门 · 绿铜穹顶 · 飘扬校旗 |
| `uni-gothic` | 哥特双塔钟楼学院 | 机械走针钟盘 · 玫瑰彩绘花窗 · 尖拱双塔 |
| `uni-modern` | 现代几何玻璃理工院 | 悬挑玻璃盒子 · 追日旋转光伏板 |
| `uni-academy` | 东方书院天井四合院 | 飞檐四合天井 · 翠竹讲堂与书卷 |
| `uni-observatory` | 天文台穹顶研究院 | 银白开合天球穹顶 · 旋转射电望远镜 |
| `uni-art-bauhaus` | 包豪斯艺术设计美院 | 蒙德里安红黄蓝几何网格幕墙 · 雕塑庭院 |
| `uni-gate-palace` | 中式红墙飞檐名校 | 汉白玉三门牌坊 · 琉璃歇山顶大礼堂 |
| `uni-conservatory` | 古典交响音乐学院 | 旋转黄金竖琴雕塑 · 声学玻璃穹顶厅 |
| `ruc-mingde` | 东方红砖人文学府 | 古典红砖主楼 · 白石柱廊 ·「博学笃行」校训石与金秋银杏 |
| `unimelb-clocktower` | 维多利亚砂岩哥特大学 | 砂岩哥特钟塔 · 尖拱回廊与盛放紫色蓝花楹 |

</details>

<details>
<summary><strong>🏮 家乡与精神地标类（<code>kind: "landmark"</code> · 共 10 款）— 点击展开</strong></summary>

| `style` ID | 建筑名称 | 3D 视觉特征与标志性道具 |
| :--- | :--- | :--- |
| `pagoda` | 东方五层飞檐古塔 | 五层重檐攒尖 · 暖光红灯笼庭院 |
| `watertown` | 江南白墙黛瓦水乡 | 马头墙石拱桥 · 碧水摇橹乌篷船 |
| `coastal-town` | 地中海红瓦钟楼街区 | 暖白拱廊街区 · 旋转航标灯塔 |
| `metro-landmark` | 现代大都市双球电视塔 | 双球观景云塔 · 摩天观景连廊 |
| `b612-rose-hill` | B-612 玫瑰玻璃罩山丘 | 小王子玻璃罩红玫瑰 · 苔藓奇石星环 |
| `siheyuan-courtyard` | 老北京朱门四合院 | 朱红大门灰瓦正房 · 雕花影壁与石榴树 |
| `mountain-stilts` | 山城吊脚楼洪崖阁 | 依山悬挑木柱群 · 层叠飞檐暖光灯笼 |
| `euro-castle` | 欧式童话尖顶古堡 | 蓝顶三塔石砌城堡 · 护城河石桥与皇家彩旗 |
| `tulou-roundhouse` | 闽南客家圆形土楼 | 夯土环形大围屋 · 天井环形红灯笼阵 |
| `snow-chalet-village` | 北国林海雪乡木屋 | 奶油厚雪斜顶木屋 · 暖炉炊烟与红灯笼 |

</details>

<details>
<summary><strong>🏢 职业履历总部类（<code>kind: "career"</code> · 共 17 款）— 点击展开</strong></summary>

| `style` ID | 建筑名称 | 3D 视觉特征与标志性道具 |
| :--- | :--- | :--- |
| `tower` | AI / 社交赛博霓虹高塔 | 曜石黑摩天楼 · 动态瀑布流巨幕 |
| `tech` | XR 空间计算研发中心 | 屋顶巨型 3D 头显 · 全息城市沙盘 |
| `factory` | 智能制造超级工厂 | 锯齿天窗厂房 · 自动化六轴机械臂 |
| `studio` | 创意设计玻璃工坊 | 珊瑚粉阳光房 · 圆桌气泡头脑风暴 |
| `biotech` | 翡翠阶梯生科医药总部 | 生态阶梯露台 · 旋转 DNA 双螺旋雕塑 |
| `game-arcade` | 潮玩像素游戏工坊 | 霓虹紫潮玩楼 · 悬浮巨型游戏手柄 |
| `cloud-logistics` | 电商与云原生智能园区 | 环形空中跑道 · 盘旋物流无人机起降 |
| `indie-lab` | 开源极客原木创客空间 | 暖木极客工坊 · 旋转深空卫星天线 |
| `medical-center` | 现代医疗健康中心 | 洁白弧形大楼 · 屋顶救援直升机停机坪 |
| `law-palace` | 律所与金融罗马柱大厦 | 古典大理石列柱 · 屋顶旋转金色正义天平 |
| `film-stage` | 影视传媒与摄影棚 | 开合黑白巨型场记板 · 摇臂摄像机与聚光灯 |
| `coffee-roastery` | 新消费精品咖啡旗舰店 | 屋顶冒热气巨型拉花咖啡杯 · 露台外摆区 |
| `xiaomi-park` | 双子连廊科技园总部 | 深灰蓝双子玻璃幕墙 · 活力橙顶标与园区慢跑道 |
| `jd-hq` | 三联高空连廊旗舰总部 | 三塔悬挑高空连廊巨舰 · 银白金属萌宠雕塑 |
| `bytedance-hq` | 错层悬挑数智科技广场 | 错层悬挑玻璃体块 · 空中花园与蓝青动态律动光柱 |
| `taikang-tower` | CBD 斜交网格金融高塔 | 香槟金斜交网格（Diagrid）摩天楼 · 晶钻顶冠 |
| `cscec-tower` | 外框钢构蓝立方总部 | 深宝石蓝幕墙配外框 X 钢构 · 12 棱镂空三维蓝立方 |

</details>

---

## 💻 本地开发与测试

### 环境要求
- **Node.js** `>= 20.0.0`
- **npm** `>= 10.0.0`

### 常用命令

```bash
# 1. 安装依赖
npm install

# 2. 启动本地 Vite 热更新开发服务器 (默认 http://localhost:5173)
npm run dev

# 3. 运行 Vitest 自动化契约测试 (含 Schema 校验、SDF 空间避障、37 款建筑建模与开源隔离门禁)
npm test -- --run

# 4. 构建生产环境静态包 (输出至 dist/，已配置 Three.js 独立分包缓存)
npm run build

# 5. 本地预览生产构建产物
npm run preview
```

---

## 📂 项目目录结构

```text
3d-island/
├── public/
│   ├── audio/                    # 3 首轻量立体声循环背景轻音乐 (morning-breeze / warm-sunset / starlight-ambient.mp3)
│   ├── logos/                    # 通用几何矢量徽标 SVG
│   ├── preview/                  # 4 张实机 WebGL 渲染高清预览图
│   └── demos/
│       └── generic-showcase/     # 内置交互式作品展台与 JSON Schema 可视化生成器
├── src/
│   ├── data/
│   │   ├── defaultProfile.ts     # 默认开源样板档案 (Alex Rivera · AI Builder)
│   │   ├── personaPresets.ts     # 4 套一键切换职业人设模板
│   │   └── resumeParser.ts       # 中英文简历纯文本智能解析器
│   ├── schema/
│   │   └── profile.ts            # ProfileConfig 类型契约、37 款建筑分类映射、JSON 校验与 #island= 编解码
│   ├── scene/
│   │   ├── world.ts              # Three.js 场景主控制器、相机运镜、光影与环岛导览路径
│   │   ├── layout.ts             # 6 款非圆盘地形高度场、SDF 建筑避障与正门视线走廊算法
│   │   ├── terrain.ts            # 4 大生态群落地形网格、桥梁、栈道、摆件与植被生成
│   │   ├── buildings.ts          # 37 款参数化低多边形 3D 建筑与 5 款作品展台程序化建模
│   │   ├── carriers.ts           # 5 款第二秘境转场载具建模与五原则弹性动画
│   │   └── sound.ts              # 交互清脆音效合成
│   ├── ui/
│   │   ├── appUi.ts              # 左上角 HUD、模拟人生建造台、AI 建模向导、博物馆详情卡与作品展台弹窗
│   │   └── soundscape.ts         # 背景轻音乐双模播放器 (HTMLAudio + WebAudio 合成)
│   ├── main.ts                   # 应用入口与 URL 参数路由
│   └── style.css                 # 全局响应式样式系统
├── tests/
│   └── island.test.ts            # Vitest 自动化测试套件 (10 大契约门禁)
├── README.md                     # 简体中文文档
├── README.en.md                  # 英文文档 (English Documentation)
├── CONTRIBUTING.md               # 中英双语开源贡献指南
└── LICENSE                       # MIT 开源许可证
```

---

## 🙏 灵感与致谢

- **视觉与交互美学**：致敬《模拟人生（The Sims）》、《纪念碑谷（Monument Valley）》以及 WebGL 社区经典的低多边形等距微缩景观（Isometric Low-Poly Diorama）设计美学；
- **开源生态支持**：感谢 [Three.js](https://threejs.org/)、[Vite](https://vitejs.dev/) 与 [TypeScript](https://www.typescriptlang.org/) 提供的底层技术支撑。

---

## 🤝 贡献与开源协议

非常欢迎提交 Issue 或 Pull Request 贡献新的 **3D 建筑母型**、**生态群落主题**、**角色模板** 或 **交互体验优化**！详细开发流程请查阅 [`CONTRIBUTING.md`](./CONTRIBUTING.md)。

本项目基于 [MIT License](./LICENSE) 开源，你可以自由修改、部署及用于个人或商业主页。如果这个项目对你有帮助，欢迎点亮一颗 ⭐ **Star**！
