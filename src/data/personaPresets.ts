import type { ProfileConfig } from '../schema/profile'

export interface PersonaPresetMeta {
  id: 'ai-builder' | 'creative-designer' | 'indie-founder' | 'research-scholar'
  label: string
  shortLabel: string
  badge: string
  description: string
  profile: ProfileConfig
}

export const GENERIC_PERSONA_PRESETS: readonly PersonaPresetMeta[] = [
  {
    id: 'ai-builder',
    label: '🤖 AI 产品 Builder · 蔚蓝群岛',
    shortLabel: '🤖 AI 产品 Builder',
    badge: '海岛 × 潜艇入海',
    description: '适合 AI 产品经理、全栈工程师与 Agent 创作者：三岛跨海木桥 + 潜艇入海深海展厅',
    profile: {
      name: 'Alex Rivera · AI Builder',
      tagline: 'AI 产品与多智能体架构师 · 点击岛屿建筑看履历，触发潜艇下潜深海看代表作',
      github: 'https://github.com/jasonz-ai/3d-island',
      linkedin: 'https://www.linkedin.com',
      biome: 'ocean',
      carrier: 'submarine',
      timeOfDay: 'day',
      weather: 'clear',
      worldShape: 'archipelago',
      satellites: ['skyline-cbd', 'airfield-harbor', 'lighthouse-reef'],
      decorProps: ['b612-rose', 'fox-bench', 'dutch-windmill', 'pet-corgi'],
      companyCount: 4,
      places: [
        {
          id: 'university',
          name: 'Alma Mater University · 理工与计算学院',
          short: '大学校园',
          kind: 'education',
          style: 'university',
          badgeText: 'UNI',
          roles: [
            {
              title: '计算机科学 & 工业系统工程学士',
              period: '2016 – 2020',
              location: '中国 · 沿海名校',
              notes: [
                '主修人机交互、运筹优化与分布式系统，在红砖穹顶礼堂与校旗广场开启数字产品创作之旅。',
                '带队斩获全国大学生智能硬件与 WebGL 可视化黑客松金奖。',
              ],
            },
          ],
        },
        {
          id: 'hometown-pagoda',
          name: 'Harbor Clocktower · 滨海灯塔街区',
          short: '家乡灯塔镇',
          kind: 'landmark',
          style: 'coastal-town',
          badgeText: 'HOME',
          roles: [
            {
              title: '出发坐标与海洋文化印记',
              period: '成长印记',
              location: '海滨港城',
              notes: [
                '以地中海红瓦拱廊与旋转航标灯塔定格家乡记忆。在通用模板中可自由切换 10 种人文地标。',
              ],
            },
          ],
        },
        {
          id: 'career-1',
          name: 'Smart Robotics Lab · 智造机械臂工坊',
          short: '1 · 智造工坊',
          kind: 'career',
          style: 'factory',
          badgeText: 'ROBO',
          floors: 3,
          roles: [
            {
              title: '数字孪生与产线算法工程师',
              period: '2020 – 2021',
              location: '上海 / 苏州',
              notes: [
                '负责六轴机械臂工位数字孪生仿真与节拍优化，构建浏览器端实时 3D 产线监控台。',
              ],
            },
          ],
        },
        {
          id: 'career-2',
          name: 'HyperScale AI Tower · 大模型与数据空间',
          short: '2 · AI 旗舰塔',
          kind: 'career',
          style: 'tower',
          badgeText: 'LLM',
          floors: 5,
          roles: [
            {
              title: 'AI 平台产品经理',
              period: '2021 – 2022',
              location: '北京 / 上海',
              notes: [
                '主导多模态检索增强（RAG）与企业知识图谱工作台，服务超百个业务团队日常推理调用。',
              ],
            },
          ],
        },
        {
          id: 'career-3',
          name: 'XR Spatial Lab · 空间计算研发中心',
          short: '3 · 空间计算',
          kind: 'career',
          style: 'tech',
          badgeText: 'XR 3D',
          floors: 5,
          roles: [
            {
              title: '3D 创作工具链与 WebXR 负责人',
              period: '2022 – 2024',
              location: '北京',
              notes: [
                '打造零代码 3D 场景拼装器与程序化低多边形（Low-Poly）资产管线，降低 90% 创作者上手门槛。',
              ],
            },
          ],
        },
        {
          id: 'career-4',
          name: 'Agentic Open Studio · 极客创客空间',
          short: '4 · 极客实验室',
          kind: 'career',
          style: 'indie-lab',
          badgeText: 'AGENT',
          floors: 4,
          roles: [
            {
              title: 'AI Native 创始人 & 独立产品 Builder',
              period: '2024 – 至今',
              location: '全球远程协作',
              notes: [
                '探索多智能体自治编排、交互式微课工厂与「千人千世界」3D 数字名片开源生态。',
              ],
            },
          ],
        },
        {
          id: 'career-5',
          name: 'Creative Design Guild · 玻璃阳光工坊',
          short: '5 · 设计工坊',
          kind: 'career',
          style: 'studio',
          badgeText: 'DESIGN',
          floors: 3,
          roles: [
            {
              title: '产品设计系统顾问（第 5 段扩展履历）',
              period: '2025',
              location: '远程',
              notes: ['演示拖动公司数量滑块至 5 栋时，岛屿环路与建筑自动重排。'],
            },
          ],
        },
        {
          id: 'career-6',
          name: 'Cloud Native Hub · 无人机云原生园区',
          short: '6 · 云原生园区',
          kind: 'career',
          style: 'cloud-logistics',
          badgeText: 'CLOUD',
          floors: 6,
          roles: [
            {
              title: '全球开发者生态架构（第 6 段扩展履历）',
              period: '2026',
              location: 'San Francisco / 深圳',
              notes: ['演示参数化上限 6 栋公司楼的完整群岛天际线。'],
            },
          ],
        },
      ],
      projects: [
        {
          id: 'project-island-builder',
          name: '3D Island Studio · 千人千世界生成器',
          tag: 'Open Source · 参数化 3D 引擎',
          boothStyle: 'booth-holo',
          link: '/demos/generic-showcase/index.html?template=ai-builder',
          repoUrl: 'https://github.com/jasonz-ai/3d-island',
          summary:
            '输入一份 JSON 履历，自由混搭 4 大生态地貌、6 种世界地形、5 大第二秘境载具与 37 座程序化 3D 建筑，一键生成可分享的 3D 个人主页。',
        },
        {
          id: 'project-course-factory',
          name: 'Agentic Course Factory · 视觉微课流水线',
          tag: 'Multi-Agent · 自动质检门',
          boothStyle: 'booth-crystal',
          link: '/demos/generic-showcase/index.html?template=ai-builder&tab=matrix',
          repoUrl: 'https://github.com/jasonz-ai/3d-island',
          summary:
            '从结构化教案、双语配音、SVG 动效到逐屏视觉品味门（Taste Harness）的一体化智能内容生产流水线。',
        },
        {
          id: 'project-pbr-cards',
          name: 'WebGL Relight Cards · 实时光影万物卡',
          tag: 'Creative Tech · Shader',
          boothStyle: 'booth-arcade',
          link: '/demos/generic-showcase/index.html?template=ai-builder&tab=styles',
          repoUrl: 'https://github.com/jasonz-ai/3d-island',
          summary:
            '将平面插画自动提取法线贴图与粗糙度通道，在浏览器内实现指尖跟随的丝滑 PBR 实时重打光交互卡牌。',
        },
      ],
    },
  },
  {
    id: 'creative-designer',
    label: '🎨 创意技术设计师 · 大漠日落绿洲',
    shortLabel: '🎨 创意设计师',
    badge: '沙漠 × 骆驼绿洲',
    description: '适合交互设计师、Creative Technologist 与视觉导演：红岩大峡谷第44次日落 + 骆驼远行绿洲',
    profile: {
      name: 'Aria Lin · Creative Tech',
      tagline: 'Design Engineer × 空间交互导演 · 在 B-612 第 44 次日落里雕刻有温度的数字体验',
      github: 'https://github.com/jasonz-ai/3d-island',
      linkedin: 'https://www.linkedin.com',
      biome: 'desert',
      carrier: 'camel',
      timeOfDay: 'sunset',
      weather: 'fireflies',
      worldShape: 'canyon-mesa',
      satellites: ['b612-observatory', 'windmill-ranch', 'skyline-cbd'],
      decorProps: ['b612-rose', 'campfire-tent', 'fox-bench'],
      companyCount: 4,
      places: [
        {
          id: 'university',
          name: 'Bauhaus School of Design · 包豪斯数字美院',
          short: '包豪斯美院',
          kind: 'education',
          style: 'uni-art-bauhaus',
          badgeText: 'ART',
          tintPreset: 'amber',
          roles: [
            {
              title: '数字媒体艺术 & 交互设计硕士 (MFA)',
              period: '2017 – 2021',
              location: 'Weimar / 上海',
              notes: [
                '在蒙德里安三原色玻璃幕墙与几何雕塑工坊中，探索生成式艺术（Generative Art）、动态排版与物理直觉交互。',
              ],
            },
          ],
        },
        {
          id: 'hometown-pagoda',
          name: 'Asteroid B-612 Hill · 玫瑰星丘精神原乡',
          short: 'B612 玫瑰星丘',
          kind: 'landmark',
          style: 'b612-rose-hill',
          badgeText: 'B-612',
          roles: [
            {
              title: '小王子玻璃罩玫瑰与第 44 次日落',
              period: '灵感坐标',
              location: 'B-612 星球',
              notes: [
                '「真正重要的东西，用眼睛是看不见的。」将玻璃罩红玫瑰与小狐狸长椅安放在红岩峡谷之巅。',
              ],
            },
          ],
        },
        {
          id: 'career-1',
          name: 'Sunlight Design Studio · 珊瑚玻璃设计工坊',
          short: '1 · 创意工坊',
          kind: 'career',
          style: 'studio',
          badgeText: 'STUDIO',
          floors: 3,
          tintPreset: 'sakura',
          roles: [
            {
              title: '交互设计师 & 动效原型师',
              period: '2021 – 2022',
              location: '上海',
              notes: [
                '主导品牌旗舰数字展厅与三维微交互设计系统，建立设计师与前端共享的弹簧物理动效 Token 库。',
              ],
            },
          ],
        },
        {
          id: 'career-2',
          name: 'Neon Pixel Arcade · 潮玩独立游戏工坊',
          short: '2 · 潮玩游戏屋',
          kind: 'career',
          style: 'game-arcade',
          badgeText: 'GAME',
          floors: 4,
          roles: [
            {
              title: '主视觉美术 & 关卡体验设计',
              period: '2022 – 2023',
              location: '东京 / 远程',
              notes: [
                '参与叙事解谜独立游戏视觉开发，打造纪念碑谷式等距视差关卡与程序化昼夜光影系统。',
              ],
            },
          ],
        },
        {
          id: 'career-3',
          name: 'Lumière Virtual Stage · 虚拟制片摄影棚',
          short: '3 · 影视摄影棚',
          kind: 'career',
          style: 'film-stage',
          badgeText: 'STAGE',
          floors: 4,
          roles: [
            {
              title: '实时渲染与 XR 虚拟制片指导',
              period: '2023 – 2024',
              location: '北京 / 杭州',
              notes: [
                '将实时光追与摇臂摄影机轨迹运镜引入网页端叙事体验，打造电影级一镜到底产品发布会主页。',
              ],
            },
          ],
        },
        {
          id: 'career-4',
          name: 'Roastery & Lifestyle Lab · 精品数字体验旗舰店',
          short: '4 · 精品旗舰店',
          kind: 'career',
          style: 'coffee-roastery',
          badgeText: 'CRAFT',
          floors: 3,
          roles: [
            {
              title: 'Design Engineer / 独立创意总监',
              period: '2024 – 至今',
              location: '清迈 / 上海',
              notes: [
                '主理兼具手冲咖啡温度与代码精度的数字产品工坊，为全球创新品牌定制 3D 互动叙事网站。',
              ],
            },
          ],
        },
        {
          id: 'career-5',
          name: 'Spatial XR Studio · 空间交互实验室',
          short: '5 · 空间计算',
          kind: 'career',
          style: 'tech',
          badgeText: 'VISION',
          floors: 4,
          roles: [
            {
              title: '空间 UI 客座导师（第 5 段扩展履历）',
              period: '2025',
              location: '远程',
              notes: ['支持 1~6 段经历弹性伸缩，峡谷吊桥与绿洲步道自动适配。'],
            },
          ],
        },
        {
          id: 'career-6',
          name: 'Cyber Media Tower · 新媒体艺术高塔',
          short: '6 · 艺术高塔',
          kind: 'career',
          style: 'tower',
          badgeText: 'MEDIA',
          floors: 5,
          roles: [
            {
              title: '数字双年展策展人（第 6 段扩展履历）',
              period: '2026',
              location: '全球巡展',
              notes: ['演示大漠红岩双生峡谷满载 6 座艺术建筑的壮丽日落天际线。'],
            },
          ],
        },
      ],
      projects: [
        {
          id: 'proj-shader-tarot',
          name: 'Patina Relight · 鎏金浮雕光影塔罗卡',
          tag: 'WebGL Shader · 实时法线打光',
          boothStyle: 'booth-arcade',
          link: '/demos/generic-showcase/index.html?template=creative-designer',
          repoUrl: 'https://github.com/jasonz-ai/3d-island',
          summary:
            '用本地深度神经网络从单张东方神话插画反推法线、高度与鎏金金属度贴图，实现「光随指走」的博物馆级丝绒卡牌光泽。',
        },
        {
          id: 'proj-kinetic-deck',
          name: 'Kinetic Story Deck · 电影级网页解说引擎',
          tag: 'Motion Design · 60fps 叙事',
          boothStyle: 'booth-holo',
          link: '/demos/generic-showcase/index.html?template=creative-designer&tab=styles',
          repoUrl: 'https://github.com/jasonz-ai/3d-island',
          summary:
            '告别枯燥 PPT：将旁白时间轴、3D 镜头推拉与弹簧微交互深度咬合，打造像看动画电影一样丝滑的网页互动演示。',
        },
        {
          id: 'proj-taste-rubric',
          name: 'Design Taste Harness · 视觉品味自动质检门',
          tag: 'Design Engineering · 审美度量',
          boothStyle: 'booth-crystal',
          link: '/demos/generic-showcase/index.html?template=creative-designer&tab=schema',
          repoUrl: 'https://github.com/jasonz-ai/3d-island',
          summary:
            '将布局平衡、模块同构、留白呼吸感与中文排版断行沉淀为可执行的自动化视觉质检守卫，拒绝千篇一律的 AI 塑料感。',
        },
      ],
    },
  },
  {
    id: 'indie-founder',
    label: '❄️ 独立黑客 / 全球出海创客 · 极光雪湾',
    shortLabel: '❄️ 出海独立创客',
    badge: '雪山 × 滑雪极光',
    description: '适合 Indie Hacker、开源作者与全球远程创客：星空极光冰川湾 + 雪人滑雪极光秘境',
    profile: {
      name: 'Leo Vance · Indie Founder',
      tagline: 'Solo Founder × 开源创客 · 一人一猫一木屋，在北国极光雪湾构建服务全球开发者的微型 SaaS',
      github: 'https://github.com/jasonz-ai/3d-island',
      linkedin: 'https://www.linkedin.com',
      biome: 'snow',
      carrier: 'snowball',
      timeOfDay: 'night',
      weather: 'snowfall',
      worldShape: 'alpine-valley',
      satellites: ['b612-observatory', 'airfield-harbor', 'lighthouse-reef'],
      decorProps: ['campfire-tent', 'pet-corgi', 'dutch-windmill'],
      companyCount: 3,
      places: [
        {
          id: 'university',
          name: 'Nordic Gothic College · 哥特双塔理工学院',
          short: '哥特钟楼学院',
          kind: 'education',
          style: 'uni-gothic',
          badgeText: 'CS',
          tintPreset: 'nordic',
          roles: [
            {
              title: '计算机系统与密码学学士',
              period: '2015 – 2019',
              location: '北欧 / 远程交换',
              notes: [
                '在机械走针钟楼与彩绘玻璃花窗下钻研编译器、分布式一致性与开源软件协作文化。',
              ],
            },
          ],
        },
        {
          id: 'hometown-pagoda',
          name: 'Aurora Snow Chalet · 林海雪乡暖炉木屋',
          short: '雪乡暖灯木屋',
          kind: 'landmark',
          style: 'snow-chalet-village',
          badgeText: 'CHALET',
          roles: [
            {
              title: '数字游民大本营与篝火滑雪驿站',
              period: '生活主场',
              location: '北海道 / 阿尔卑斯 / 长白山',
              notes: [
                '奶油厚雪斜顶木屋升起袅袅炊烟，门前柯基犬绕着篝火帐篷奔跑——这是独立开发者的理想精神角落。',
              ],
            },
          ],
        },
        {
          id: 'career-1',
          name: 'Global Edge Cloud · 云原生边缘计算园区',
          short: '1 · 云原生园区',
          kind: 'career',
          style: 'cloud-logistics',
          badgeText: 'EDGE',
          floors: 4,
          roles: [
            {
              title: '核心基础架构工程师',
              period: '2019 – 2021',
              location: 'Singapore / 远程',
              notes: [
                '构建跨大洲毫秒级 Serverless 边缘网关与自动化容器编排引擎，支撑日均十亿级 API 请求。',
              ],
            },
          ],
        },
        {
          id: 'career-2',
          name: 'FinTech Pillar Vault · 全球合规支付大厦',
          short: '2 · 跨境金融楼',
          kind: 'career',
          style: 'law-palace',
          badgeText: 'FINTECH',
          floors: 5,
          roles: [
            {
              title: '出海支付与订阅增长负责人',
              period: '2021 – 2023',
              location: 'London / 香港',
              notes: [
                '打通全球 135 种货币自适应结账、税务合规与防欺诈风控引擎，赋能上千家出海 SaaS 团队。',
              ],
            },
          ],
        },
        {
          id: 'career-3',
          name: 'Pinecone Indie Lab · 极客原木深空工坊',
          short: '3 · 独立创客屋',
          kind: 'career',
          style: 'indie-lab',
          badgeText: 'INDIE',
          floors: 3,
          roles: [
            {
              title: '全职独立开发者 & 开源维护者 (ARR $480k)',
              period: '2023 – 至今',
              location: '极光雪湾 · 全球旅居',
              notes: [
                '以「公开构建（Build in Public）」方式连续孵化 3 款高口碑生产力工具，GitHub 累计收获 18k+ Stars。',
              ],
            },
          ],
        },
        {
          id: 'career-4',
          name: 'AI Matrix Tower · 自动化增长矩阵',
          short: '4 · 增长高塔',
          kind: 'career',
          style: 'tower',
          badgeText: 'GROWTH',
          floors: 5,
          roles: [
            {
              title: '一人公司 AI 增长引擎（第 4 段扩展履历）',
              period: '2025',
              location: '远程',
              notes: ['演示从 3 段精简履历随时扩展至 4~6 段完整创业编年史。'],
            },
          ],
        },
        {
          id: 'career-5',
          name: 'Creator Podcast Studio · 创客播客阳光房',
          short: '5 · 播客工坊',
          kind: 'career',
          style: 'studio',
          badgeText: 'PODCAST',
          floors: 3,
          roles: [
            {
              title: '出海创客周刊主理人（第 5 段扩展履历）',
              period: '2025',
              location: '远程',
              notes: ['连接全球 50,000+ 独立开发者与设计师订阅者。'],
            },
          ],
        },
        {
          id: 'career-6',
          name: 'Nordic Roastery Club · 雪山咖啡社区馆',
          short: '6 · 雪山咖啡馆',
          kind: 'career',
          style: 'coffee-roastery',
          badgeText: 'COMMUNITY',
          floors: 3,
          roles: [
            {
              title: '全球数字游民驻地发起人（第 6 段扩展履历）',
              period: '2026',
              location: '清迈 / 里斯本',
              notes: ['打造线下线上融合的创客共居社区。'],
            },
          ],
        },
      ],
      projects: [
        {
          id: 'proj-open-monolith',
          name: 'Chronicle CLI · 本地优先会话时光机',
          tag: 'Open Source · 18.4k Stars',
          boothStyle: 'booth-monolith',
          link: '/demos/generic-showcase/index.html?template=indie-founder',
          repoUrl: 'https://github.com/jasonz-ai/3d-island',
          summary:
            '零云端依赖的终端与 AI 编程会话加密归档、全文秒级检索与跨设备增量同步工具，守护极客的数字记忆资产。',
        },
        {
          id: 'proj-pulse-saas',
          name: 'PulseMetric · 隐私友好的轻量级全球分析台',
          tag: 'Micro-SaaS · $40k MRR',
          boothStyle: 'booth-holo',
          link: '/demos/generic-showcase/index.html?template=indie-founder&tab=matrix',
          repoUrl: 'https://github.com/jasonz-ai/3d-island',
          summary:
            '仅 1.2KB 脚本体积、无需 Cookie 弹窗的实时全球访客三维地球仪与漏斗归因看板，专为独立开发者打造。',
        },
        {
          id: 'proj-json-world',
          name: 'JSON-to-Island · 一键生成 3D 创客名片',
          tag: 'Creator Tool · 零门槛定制',
          boothStyle: 'booth-crystal',
          link: '/demos/generic-showcase/index.html?template=indie-founder&tab=schema',
          repoUrl: 'https://github.com/jasonz-ai/3d-island',
          summary:
            '把冷冰冰的 Markdown / PDF 简历变成一座会呼吸的极光雪湾：支持 Base64 URL 免后端一键分享给投资人与全球用户。',
        },
      ],
    },
  },
  {
    id: 'research-scholar',
    label: '🚀 前沿具身智能学者 · 翡翠星轨台',
    shortLabel: '🚀 前沿科研学者',
    badge: '草原 × 火箭升空',
    description: '适合 AI 科学家、具身智能研究员与交叉学科博士：纪念碑谷天空阶梯 + 火箭点火近地轨道',
    profile: {
      name: 'Dr. Evelyn Zhou · 具身智能学者',
      tagline: 'Embodied AI × 计算神经科学研究者 · 乘火箭升入近地星轨，探索硅基智能与物理世界的交汇点',
      github: 'https://github.com/jasonz-ai/3d-island',
      linkedin: 'https://www.linkedin.com',
      biome: 'grassland',
      carrier: 'rocket',
      timeOfDay: 'sunset',
      weather: 'sakura',
      worldShape: 'floating-terraces',
      satellites: ['b612-observatory', 'windmill-ranch', 'lighthouse-reef'],
      decorProps: ['cherry-grove', 'b612-rose', 'fox-bench'],
      companyCount: 4,
      places: [
        {
          id: 'university',
          name: 'Astro & Cybernetics Institute · 天文台穹顶研究院',
          short: '天文台研究院',
          kind: 'education',
          style: 'uni-observatory',
          badgeText: 'PHD',
          roles: [
            {
              title: '计算神经科学与机器人学博士 (Ph.D.)',
              period: '2016 – 2021',
              location: 'Boston / 苏黎世 / 北京',
              notes: [
                '在银白开合天球穹顶与旋转射电望远镜阵列下，研究脉冲神经网络、世界模型（World Models）与灵巧手触觉感知。',
                '于 NeurIPS / ICRA / Science Robotics 发表多篇一作论文并开源全套仿真基准。',
              ],
            },
          ],
        },
        {
          id: 'hometown-pagoda',
          name: 'Jiangnan Watertown · 江南白墙黛瓦水乡',
          short: '江南水乡庭院',
          kind: 'landmark',
          style: 'watertown',
          badgeText: 'ORIGIN',
          roles: [
            {
              title: '小桥流水乌篷船与少年博物志',
              period: '文化原乡',
              location: '中国 · 江南水乡',
              notes: [
                '马头墙、石拱桥与摇橹乌篷船构成了最初对精巧机关与自然律动的迷恋，与远方近地轨道的星际探索遥相呼应。',
              ],
            },
          ],
        },
        {
          id: 'career-1',
          name: 'Helix Bio-Computation Lab · 翡翠生科计算总部',
          short: '1 · 生科计算楼',
          kind: 'career',
          style: 'biotech',
          badgeText: 'BIO-AI',
          floors: 4,
          tintPreset: 'mint',
          roles: [
            {
              title: '蛋白质生成与科学大模型博士后研究员',
              period: '2021 – 2022',
              location: 'Cambridge / 深圳',
              notes: [
                '利用几何等变图神经网络（E(3)-Equivariant GNN）加速分子动力学模拟与靶向蛋白结构从头设计。',
              ],
            },
          ],
        },
        {
          id: 'career-2',
          name: 'Humanoid Robotics Foundry · 具身智能超级工厂',
          short: '2 · 具身机器人厂',
          kind: 'career',
          style: 'factory',
          badgeText: 'HUMANOID',
          floors: 4,
          roles: [
            {
              title: '端到端视觉-语言-动作 (VLA) 算法负责人',
              period: '2022 – 2024',
              location: '上海 / 硅谷',
              notes: [
                '打通从百万小时人类操作视频预训练到实体双足/机械臂零样本泛化抓取的 Sim-to-Real 闭环。',
              ],
            },
          ],
        },
        {
          id: 'career-3',
          name: 'Spatial World Model Center · 空间世界模型中心',
          short: '3 · 世界模型院',
          kind: 'career',
          style: 'tech',
          badgeText: 'WORLD',
          floors: 5,
          roles: [
            {
              title: '首席研究科学家 (Principal Scientist)',
              period: '2024 – 2025',
              location: '北京 / 全球协作',
              notes: [
                '领导可交互物理 4D 世界模型研发，让智能体在脑内实时推演重力、流体与多刚体碰撞反事实因果。',
              ],
            },
          ],
        },
        {
          id: 'career-4',
          name: 'DeepSpace Frontier Lab · 深空星际创客院',
          short: '4 · 深空探索院',
          kind: 'career',
          style: 'indie-lab',
          badgeText: 'ORBIT',
          floors: 4,
          roles: [
            {
              title: '青年学术 PI & 开源具身社区发起人',
              period: '2025 – 至今',
              location: '翡翠星轨台 · 开放科学联盟',
              notes: [
                '联合全球 40 所高校共建低成本开源机械臂硬件套件与统一评测榜单，推动具身智能走向普惠。',
              ],
            },
          ],
        },
        {
          id: 'career-5',
          name: 'Neuro-Medical Center · 脑机接口与神经康复中心',
          short: '5 · 脑机医学中心',
          kind: 'career',
          style: 'medical-center',
          badgeText: 'BCI',
          floors: 5,
          roles: [
            {
              title: '临床脑机接口联合顾问（第 5 段扩展履历）',
              period: '2025',
              location: '北京 / 上海',
              notes: ['将高通量神经解码算法应用于运动功能重建与外骨骼意念控制。'],
            },
          ],
        },
        {
          id: 'career-6',
          name: 'Frontier AI Foundation · 前沿科学基金高塔',
          short: '6 · 科学基金塔',
          kind: 'career',
          style: 'tower',
          badgeText: 'FELLOW',
          floors: 6,
          roles: [
            {
              title: 'AI for Science 青年学者委员会联席主席（第 6 段扩展履历）',
              period: '2026',
              location: '全球',
              notes: ['资助跨学科青年学者探索生命科学、清洁聚变与空间机器人前沿。'],
            },
          ],
        },
      ],
      projects: [
        {
          id: 'proj-embodied-bench',
          name: 'OmniManip-Bench · 具身灵巧操作开源基准',
          tag: 'Science Robotics · 开源仿真套件',
          boothStyle: 'booth-mech',
          link: '/demos/generic-showcase/index.html?template=research-scholar',
          repoUrl: 'https://github.com/jasonz-ai/3d-island',
          summary:
            '涵盖 120 种非刚性物体、流体倾倒与双臂协同组装任务的 GPU 高并发物理仿真环境与评测榜单，支持一键 Sim-to-Real 迁移。',
        },
        {
          id: 'proj-neural-dynamics',
          name: 'EquiFold-3D · 几何等变分子动力学引擎',
          tag: 'AI4Science · NeurIPS Oral',
          boothStyle: 'booth-crystal',
          link: '/demos/generic-showcase/index.html?template=research-scholar&tab=matrix',
          repoUrl: 'https://github.com/jasonz-ai/3d-island',
          summary:
            '在浏览器 WebGPU 与云端算力集群上实时可视化蛋白质构象演化与配体结合自由能地貌。',
        },
        {
          id: 'proj-academic-island',
          name: 'Scholar Island · 告别枯燥 Google Scholar 的 3D 学术主页',
          tag: 'Academic Showcase · 论文可视化',
          boothStyle: 'booth-monolith',
          link: '/demos/generic-showcase/index.html?template=research-scholar&tab=styles',
          repoUrl: 'https://github.com/jasonz-ai/3d-island',
          summary:
            '把实验室主页、求学轨迹与代表性论文展台搬进纪念碑谷阶梯方舟，乘火箭升入近地轨道沉浸交互阅读。',
        },
      ],
    },
  },
]

export function getPersonaPresetById(id: string): PersonaPresetMeta | undefined {
  return GENERIC_PERSONA_PRESETS.find((preset) => preset.id === id)
}
