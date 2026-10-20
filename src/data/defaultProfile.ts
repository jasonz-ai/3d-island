import type { ProfileConfig } from '../schema/profile'

export const defaultProfile: ProfileConfig = {
  name: 'Alex Rivera · AI Builder',
  tagline: 'AI 产品与多智能体架构师 · 点击建筑看履历，触发载具前往第二秘境看代表作',
  github: 'https://github.com/jasonz-ai/3d-island',
  linkedin: 'https://www.linkedin.com',
  biome: 'ocean',
  carrier: 'submarine',
  companyCount: 4,
  places: [
    {
      id: 'university',
      name: 'Alma Mater University',
      short: '大学校园',
      kind: 'education',
      style: 'university',
      badgeText: 'UNI',
      roles: [
        {
          title: '工学学士 & 系统工程研究',
          period: '2016 – 2020',
          location: '中国',
          notes: [
            '主修工业工程、运筹学与人机交互，在校旗与钟楼礼堂开启构建数字产品的起点。',
          ],
        },
      ],
    },
    {
      id: 'hometown-pagoda',
      name: 'Hometown Landmark · 宝塔地标',
      short: '家乡宝塔',
      kind: 'landmark',
      style: 'pagoda',
      roles: [
        {
          title: '文化印记与出发坐标',
          location: '中国历史名城',
          notes: [
            '代表个人成长的城市印记。在定制平台中，用户可从预置地标库（古塔、钟楼、电视塔、跨海大桥等）中挑选家乡象征。',
          ],
        },
      ],
    },
    {
      id: 'career-1',
      name: 'Smart Robotics Lab',
      short: '1 · 智造工坊',
      kind: 'career',
      style: 'factory',
      badgeText: 'ROBO',
      floors: 3,
      roles: [
        {
          title: '产线仿真与算法实习生',
          period: '2020',
          location: '上海 / 昆山',
          notes: [
            '负责自动化机械臂工位布局与节拍仿真优化，落地真实整车装配线。',
          ],
        },
      ],
    },
    {
      id: 'career-2',
      name: 'Data & Space Co.',
      short: '2 · 数据空间',
      kind: 'career',
      style: 'tower',
      badgeText: 'DATA',
      floors: 4,
      roles: [
        {
          title: '商业智能与数据分析师',
          period: '2021',
          location: '上海',
          notes: [
            '构建空间利用率与增长归因看板，驱动多城市运营决策。',
          ],
        },
      ],
    },
    {
      id: 'career-3',
      name: 'XR Worlds Studio',
      short: '3 · 虚拟世界',
      kind: 'career',
      style: 'tech',
      badgeText: 'XR',
      floors: 5,
      roles: [
        {
          title: '3D 与 UGC 平台产品经理',
          period: '2022 – 2023',
          location: '北京',
          notes: [
            '打造人人可拼装的 3D 虚拟世界与低代码创作工具链。',
          ],
        },
      ],
    },
    {
      id: 'career-4',
      name: 'AI Native Frontier',
      short: '4 · AI 实验室',
      kind: 'career',
      style: 'tower',
      badgeText: 'AI',
      floors: 6,
      roles: [
        {
          title: 'AI 产品负责人',
          period: '2024 – 至今',
          location: '全球协作',
          notes: [
            '探索多智能体协作、微课与交互式 3D 数字名片生成器。',
          ],
        },
      ],
    },
    {
      id: 'career-5',
      name: 'Creative Design Guild',
      short: '5 · 设计工坊',
      kind: 'career',
      style: 'studio',
      badgeText: 'DESIGN',
      floors: 3,
      roles: [
        {
          title: '独立设计顾问（第 5 段扩展履历）',
          period: '2025',
          location: '远程',
          notes: [
            '演示参数化 5 栋公司楼自动排布与道路自动延伸。',
          ],
        },
      ],
    },
    {
      id: 'career-6',
      name: 'Global Developer Cloud',
      short: '6 · 开发者云',
      kind: 'career',
      style: 'tower',
      badgeText: 'CLOUD',
      floors: 7,
      roles: [
        {
          title: '平台生态架构（第 6 段扩展履历）',
          period: '2026',
          location: 'San Jose / 深圳',
          notes: [
            '演示参数化上限 6 栋公司楼的完整环岛天际线。',
          ],
        },
      ],
    },
  ],
  projects: [
    {
      id: 'project-island-builder',
      name: '3D 人生世界生成器 (3D Island Studio)',
      tag: 'Core Open-Source Engine',
      boothStyle: 'booth-holo',
      link: '/demos/generic-showcase/index.html?template=ai-builder',
      repoUrl: 'https://github.com/jasonz-ai/3d-island',
      summary:
        '输入一份 JSON 履历，自由混搭「海岛/沙漠/雪山/草原」地貌与「潜艇入海/骆驼绿洲/雪球极光/火箭星轨/热气球云海」五种戏剧转场，一键生成个人 3D 交互主页。',
    },
    {
      id: 'project-course-factory',
      name: 'AI 微课与视觉质检流水线',
      tag: 'AI Workflow',
      boothStyle: 'booth-crystal',
      link: '/demos/generic-showcase/index.html?template=ai-builder',
      repoUrl: 'https://github.com/jasonz-ai',
      summary:
        '从脚本、配音、动效到逐屏视觉品味门（Taste Harness）的一体化内容生产引擎。',
    },
    {
      id: 'project-pbr-cards',
      name: '实时 WebGL 光影万物卡',
      tag: 'Creative Tech',
      boothStyle: 'booth-arcade',
      link: '/demos/generic-showcase/index.html?template=creative-designer',
      repoUrl: 'https://github.com/mrdoob/three.js',
      summary:
        '将平面插画自动转化为法线贴图与金属度通道，在浏览器内实现指尖跟随的实时重打光卡牌。',
    },
  ],
}
