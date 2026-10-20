import themeJson from '../../theme.json'

export type BiomeType = 'ocean' | 'desert' | 'snow' | 'grassland'

export type CarrierType = 'submarine' | 'camel' | 'snowball' | 'rocket' | 'balloon'

export type TimeOfDay = 'day' | 'sunset' | 'night'

export type WorldShapeType =
  | 'archipelago'
  | 'b612-highland'
  | 'canyon-mesa'
  | 'alpine-valley'
  | 'crescent-bay'
  | 'floating-terraces'

export type SatelliteTheme =
  | 'skyline-cbd'
  | 'airfield-harbor'
  | 'lighthouse-reef'
  | 'windmill-ranch'
  | 'b612-observatory'
  | 'hidden'

export type BuildingStyle =
  | 'university'
  | 'uni-gothic'
  | 'uni-modern'
  | 'uni-academy'
  | 'uni-observatory'
  | 'uni-art-bauhaus'
  | 'uni-gate-palace'
  | 'uni-conservatory'
  | 'ruc-mingde'
  | 'unimelb-clocktower'
  | 'pagoda'
  | 'watertown'
  | 'coastal-town'
  | 'metro-landmark'
  | 'b612-rose-hill'
  | 'siheyuan-courtyard'
  | 'mountain-stilts'
  | 'euro-castle'
  | 'tulou-roundhouse'
  | 'snow-chalet-village'
  | 'tower'
  | 'tech'
  | 'factory'
  | 'studio'
  | 'biotech'
  | 'game-arcade'
  | 'cloud-logistics'
  | 'indie-lab'
  | 'medical-center'
  | 'law-palace'
  | 'film-stage'
  | 'coffee-roastery'
  | 'xiaomi-park'
  | 'jd-hq'
  | 'bytedance-hq'
  | 'taikang-tower'
  | 'cscec-tower'

export type PlaceKind = 'education' | 'career' | 'landmark'

export interface RoleEntry {
  title: string
  period?: string
  location?: string
  notes?: string[]
}

export type DecorPropId =
  | 'b612-rose'
  | 'fox-bench'
  | 'cherry-grove'
  | 'campfire-tent'
  | 'dutch-windmill'
  | 'pet-corgi'

export type BuildingTintPreset = 'default' | 'sakura' | 'mint' | 'amber' | 'cyber' | 'nordic'

export const BUILDING_TINT_OPTIONS: {
  id: BuildingTintPreset
  label: string
  swatch: string
  roofHex: string
  wallHex: string
  accentHex: string
}[] = [
  {
    id: 'default',
    label: '原生色',
    swatch: '#E8643A',
    roofHex: '#3A3F36',
    wallHex: '#FAF6EE',
    accentHex: '#E8643A',
  },
  {
    id: 'sakura',
    label: '樱粉白墙',
    swatch: '#F472B6',
    roofHex: '#DB2777',
    wallHex: '#FFF1F2',
    accentHex: '#EC4899',
  },
  {
    id: 'mint',
    label: '薄荷青瓦',
    swatch: '#34D399',
    roofHex: '#0D9488',
    wallHex: '#F0FDFA',
    accentHex: '#10B981',
  },
  {
    id: 'amber',
    label: '暖金砂岩',
    swatch: '#F59E0B',
    roofHex: '#B45309',
    wallHex: '#FFFBEB',
    accentHex: '#D97706',
  },
  {
    id: 'cyber',
    label: '赛博霓虹',
    swatch: '#38BDF8',
    roofHex: '#1E1B4B',
    wallHex: '#1E293B',
    accentHex: '#06B6D4',
  },
  {
    id: 'nordic',
    label: '北欧木雪',
    swatch: '#94A3B8',
    roofHex: '#475569',
    wallHex: '#F8FAFC',
    accentHex: '#3B82F6',
  },
]

export interface PlaceEntry {
  id: string
  name: string
  short?: string
  kind: PlaceKind
  style: BuildingStyle
  badgeText?: string
  floors?: number
  link?: string
  rotationOffset?: number
  tintPreset?: BuildingTintPreset
  offsetX?: number
  offsetZ?: number
  buildingScale?: number
  roles: RoleEntry[]
}

export type ProjectBoothStyle =
  | 'booth-holo'
  | 'booth-crystal'
  | 'booth-monolith'
  | 'booth-mech'
  | 'booth-arcade'

export interface ProjectEntry {
  id: string
  name: string
  summary: string
  tag?: string
  link?: string
  repoUrl?: string
  boothStyle?: ProjectBoothStyle
}

export type WeatherType = 'clear' | 'sakura' | 'snowfall' | 'meteor' | 'fireflies'

export interface ProfileConfig {
  name: string
  tagline: string
  github: string
  linkedin: string
  biome: BiomeType
  carrier: CarrierType
  timeOfDay?: TimeOfDay
  weather?: WeatherType
  worldShape?: WorldShapeType
  satellites?: [SatelliteTheme, SatelliteTheme, SatelliteTheme]
  decorProps?: DecorPropId[]
  companyCount: number
  places: PlaceEntry[]
  projects: ProjectEntry[]
}

export interface TerrainPalette {
  label: string
  ground: string
  groundSide: string
  sand: string
  water: string
  sky: string
  path: string
  foliage: string[]
}

export interface RealmPalette {
  label: string
  ctaEnter: string
  ctaExit: string
  sky: string
  fog: string
  stageColor: string
}

export interface ThemePalette {
  shared: {
    building: string
    buildingShade: string
    roof: string
    accent: string
    text: string
    textMuted: string
    card: string
    line: string
  }
  terrain: TerrainPalette
  realm: RealmPalette
}

export const BIOME_OPTIONS: { id: BiomeType; label: string; defaultCarrier: CarrierType }[] = [
  { id: 'ocean', label: '海岛', defaultCarrier: 'submarine' },
  { id: 'desert', label: '沙漠', defaultCarrier: 'camel' },
  { id: 'snow', label: '雪山', defaultCarrier: 'snowball' },
  { id: 'grassland', label: '草原', defaultCarrier: 'balloon' },
]

export const CARRIER_OPTIONS: { id: CarrierType; label: string; short: string }[] = [
  { id: 'submarine', label: '潜艇入海 → 深海秘境', short: '潜艇入海' },
  { id: 'camel', label: '骆驼远行 → 沙漠绿洲', short: '骆驼绿洲' },
  { id: 'snowball', label: '雪人滑雪 → 山脚极光冰谷', short: '滑雪极光' },
  { id: 'rocket', label: '火箭点火 → 近地轨道', short: '火箭升空' },
  { id: 'balloon', label: '热气球升空 → 云端浮岛', short: '热气球云海' },
]

export const TIME_OF_DAY_OPTIONS: {
  id: TimeOfDay
  label: string
  short: string
  icon: string
}[] = [
  { id: 'day', label: '☀️ 正午晴空', short: '☀️ 正午', icon: '☀️' },
  { id: 'sunset', label: '🌇 第44次日落', short: '🌇 第44次日落', icon: '🌇' },
  { id: 'night', label: '🌙 星空夜景', short: '🌙 星空夜景', icon: '🌙' },
]

export const WEATHER_OPTIONS: {
  id: WeatherType
  label: string
  short: string
  icon: string
}[] = [
  { id: 'clear', label: '🌤 晴空微风', short: '🌤 晴空', icon: '🌤' },
  { id: 'sakura', label: '🌸 漫天落樱', short: '🌸 漫天落樱', icon: '🌸' },
  { id: 'snowfall', label: '❄️ 飘雪微尘', short: '❄️ 飘雪微尘', icon: '❄️' },
  { id: 'meteor', label: '☄️ 流星划过', short: '☄️ 流星划过', icon: '☄️' },
  { id: 'fireflies', label: '✨ 流萤星火', short: '✨ 流萤星火', icon: '✨' },
]

export interface BuildingStyleOption {
  id: BuildingStyle
  label: string
  shortLabel: string
  propHint: string
  category: PlaceKind
  colors: [string, string, string]
}

export const BUILDING_STYLE_OPTIONS: BuildingStyleOption[] = [
  // Education (8)
  {
    id: 'university',
    label: '古典红砖穹顶大学（三拱校门）',
    shortLabel: '古典红砖穹顶',
    propHint: '三拱古典校门 · 飘扬校旗',
    category: 'education',
    colors: ['#A9472F', '#7C9885', '#F3EDE0'],
  },
  {
    id: 'uni-gothic',
    label: '哥特双塔钟楼学院（走针钟盘）',
    shortLabel: '哥特双塔钟楼',
    propHint: '机械走针钟盘 · 彩绘花窗',
    category: 'education',
    colors: ['#DED6C6', '#2E3A46', '#4C7BD9'],
  },
  {
    id: 'uni-modern',
    label: '现代几何玻璃理工院（追日太阳翼）',
    shortLabel: '现代玻璃图书馆',
    propHint: '悬挑玻璃盒子 · 追日光伏板',
    category: 'education',
    colors: ['#F2F4F7', '#222831', '#3898EC'],
  },
  {
    id: 'uni-academy',
    label: '东方书院天井四合院（翠竹讲堂）',
    shortLabel: '东方书院天井',
    propHint: '飞檐四合天井 · 翠竹书卷',
    category: 'education',
    colors: ['#F5F0E6', '#3A423C', '#5E9E6E'],
  },
  {
    id: 'uni-observatory',
    label: '天文台穹顶研究院（旋转射电望远镜）',
    shortLabel: '天文台研究院',
    propHint: '银白开合天球穹顶 · 射电望远镜',
    category: 'education',
    colors: ['#E2E8F0', '#1E3A8A', '#F59E0B'],
  },
  {
    id: 'uni-art-bauhaus',
    label: '包豪斯艺术设计美院（蒙德里安彩窗工坊）',
    shortLabel: '包豪斯美术院',
    propHint: '红黄蓝几何网格幕墙 · 雕塑庭院',
    category: 'education',
    colors: ['#FAF8F5', '#E11D48', '#2563EB'],
  },
  {
    id: 'uni-gate-palace',
    label: '中式红墙飞檐名校（三间牌坊大礼堂）',
    shortLabel: '中式名校礼堂',
    propHint: '汉白玉三门牌坊 · 琉璃歇山大礼堂',
    category: 'education',
    colors: ['#9B2C2C', '#D69E2E', '#F7FAFC'],
  },
  {
    id: 'uni-conservatory',
    label: '古典交响音乐学院（金色竖琴玻璃穹顶）',
    shortLabel: '古典音乐学院',
    propHint: '旋转黄金竖琴雕塑 · 声学管风琴厅',
    category: 'education',
    colors: ['#FFFBEB', '#D97706', '#4F46E5'],
  },
  {
    id: 'ruc-mingde',
    label: '东方红砖人文学府（白石柱廊 & 博学笃行校训石）',
    shortLabel: '东方红砖学府',
    propHint: '古典红砖主楼 · 白石柱廊、校训巨石与金秋银杏林',
    category: 'education',
    colors: ['#8E1B2B', '#D9CFC1', '#EAB308'],
  },
  {
    id: 'unimelb-clocktower',
    label: '维多利亚砂岩哥特大学（尖拱回廊 & 蓝花楹钟楼）',
    shortLabel: '砂岩哥特钟楼',
    propHint: '维多利亚砂岩钟塔 · 哥特尖拱回廊与盛放蓝花楹',
    category: 'education',
    colors: ['#D9B382', '#094183', '#A855F7'],
  },
  // Landmark / Hometown (10)
  {
    id: 'pagoda',
    label: '东方五层飞檐古塔（红灯笼庭院）',
    shortLabel: '东方飞檐宝塔',
    propHint: '五层重檐攒尖 · 暖光红灯笼',
    category: 'landmark',
    colors: ['#C84B31', '#3A3F36', '#FFAB2E'],
  },
  {
    id: 'watertown',
    label: '江南白墙黛瓦水乡（石拱桥乌篷船）',
    shortLabel: '江南水乡庭院',
    propHint: '马头墙石拱桥 · 摇橹乌篷船',
    category: 'landmark',
    colors: ['#F9F8F3', '#2D3339', '#52B2BF'],
  },
  {
    id: 'coastal-town',
    label: '地中海红瓦钟楼街区（旋转灯塔）',
    shortLabel: '滨海红瓦钟楼',
    propHint: '暖白拱廊街区 · 旋转航标灯塔',
    category: 'landmark',
    colors: ['#FAF3E6', '#D96B43', '#38BDF8'],
  },
  {
    id: 'metro-landmark',
    label: '现代大都市双球电视塔（观景天桥）',
    shortLabel: '现代都市高塔',
    propHint: '双球观景云塔 · 摩天连廊',
    category: 'landmark',
    colors: ['#E2E8F0', '#1E293B', '#F43F5E'],
  },
  {
    id: 'b612-rose-hill',
    label: 'B-612 玫瑰玻璃罩山丘（小王子星丘）',
    shortLabel: 'B612 玫瑰星丘',
    propHint: '玻璃罩红玫瑰 · 苔藓奇石星环',
    category: 'landmark',
    colors: ['#7BC47F', '#38BDF8', '#F43F5E'],
  },
  {
    id: 'siheyuan-courtyard',
    label: '老北京朱门四合院（雕花影壁与石榴树）',
    shortLabel: '京味红门四合院',
    propHint: '朱红大门灰瓦正房 · 庭院石榴红灯',
    category: 'landmark',
    colors: ['#B91C1C', '#4B5563', '#F59E0B'],
  },
  {
    id: 'mountain-stilts',
    label: '山城吊脚楼洪崖阁（层叠飞檐暖灯山居）',
    shortLabel: '山城吊脚楼阁',
    propHint: '依山悬挑木柱群 · 千与千寻暖光灯笼',
    category: 'landmark',
    colors: ['#78350F', '#F59E0B', '#FEF3C7'],
  },
  {
    id: 'euro-castle',
    label: '欧式童话尖顶古堡（护城河石桥与彩旗塔）',
    shortLabel: '欧式童话古堡',
    propHint: '蓝顶三塔石砌城堡 · 飘扬皇家旗帜',
    category: 'landmark',
    colors: ['#F1F5F9', '#1D4ED8', '#F43F5E'],
  },
  {
    id: 'tulou-roundhouse',
    label: '闽南客家圆形土楼（围屋天井红灯笼阵）',
    shortLabel: '客家圆形土楼',
    propHint: '夯土环形大围屋 · 环形红灯笼内院',
    category: 'landmark',
    colors: ['#D6A874', '#374151', '#EF4444'],
  },
  {
    id: 'snow-chalet-village',
    label: '北国林海雪乡木屋（厚雪屋檐与暖炉炊烟）',
    shortLabel: '雪乡暖灯木屋',
    propHint: '奶油厚雪斜顶木屋 · 玉米红辣椒挂串',
    category: 'landmark',
    colors: ['#F8FAFC', '#92400E', '#F97316'],
  },
  // Career / Industry (17)
  {
    id: 'tower',
    label: 'AI / 社交赛博霓虹高塔（滚动巨幕）',
    shortLabel: 'AI 霓虹旗舰塔',
    propHint: '曜石黑摩天楼 · 动态瀑布流巨幕',
    category: 'career',
    colors: ['#15161A', '#25F4EE', '#FE2C55'],
  },
  {
    id: 'tech',
    label: 'XR 空间计算研发中心（3D 头显+全息台）',
    shortLabel: 'XR 空间计算楼',
    propHint: '屋顶巨型头显 · 全息城市沙盘',
    category: 'career',
    colors: ['#F7F9FC', '#1E66F5', '#00E5FF'],
  },
  {
    id: 'factory',
    label: '智能制造超级工厂（KUKA 机械臂）',
    shortLabel: '智能制造工坊',
    propHint: '锯齿天窗厂房 · 库卡橙机械臂',
    category: 'career',
    colors: ['#DFE2E5', '#2B3036', '#FF6A13'],
  },
  {
    id: 'studio',
    label: '创意设计玻璃工坊（圆桌头脑风暴）',
    shortLabel: '创意玻璃工坊',
    propHint: '珊瑚粉阳光房 · 圆桌气泡对话',
    category: 'career',
    colors: ['#FAF6F0', '#FF67A8', '#38BDF8'],
  },
  {
    id: 'biotech',
    label: '翡翠阶梯生科医药总部（旋转 DNA 双螺旋）',
    shortLabel: '生科医药总部',
    propHint: '生态阶梯露台 · 旋转 DNA 双螺旋',
    category: 'career',
    colors: ['#ECFDF5', '#059669', '#34D399'],
  },
  {
    id: 'game-arcade',
    label: '潮玩像素游戏工坊（悬浮巨型手柄）',
    shortLabel: '潮玩游戏工坊',
    propHint: '霓虹紫潮玩楼 · 悬浮游戏手柄',
    category: 'career',
    colors: ['#2E1065', '#7C3AED', '#F43F5E'],
  },
  {
    id: 'cloud-logistics',
    label: '电商与云原生智能园区（盘旋无人机）',
    shortLabel: '云原生智能园区',
    propHint: '环形空中跑道 · 物流无人机起降',
    category: 'career',
    colors: ['#F8FAFC', '#0284C7', '#FF6A00'],
  },
  {
    id: 'indie-lab',
    label: '开源极客原木创客空间（深空卫星天线）',
    shortLabel: '极客创客木屋',
    propHint: '暖木极客工坊 · 旋转深空天线',
    category: 'career',
    colors: ['#D9A066', '#334155', '#38BDF8'],
  },
  {
    id: 'medical-center',
    label: '现代医疗健康中心（急救停机坪与红十字塔）',
    shortLabel: '医疗健康中心',
    propHint: '洁白弧形病房大楼 · 屋顶救援直升机坪',
    category: 'career',
    colors: ['#F8FAFC', '#EF4444', '#0EA5E9'],
  },
  {
    id: 'law-palace',
    label: '律所与金融罗马柱大厦（正义天平金顶）',
    shortLabel: '罗马柱律所大厦',
    propHint: '古典大理石列柱 · 屋顶旋转金色天平',
    category: 'career',
    colors: ['#F5EFE6', '#D97706', '#1E293B'],
  },
  {
    id: 'film-stage',
    label: '影视传媒与MCN摄影棚（巨型场记板与追光灯）',
    shortLabel: '影视传媒片场',
    propHint: '开合黑白场记板 · 摇臂摄像机与聚光灯',
    category: 'career',
    colors: ['#1E293B', '#FACC15', '#F43F5E'],
  },
  {
    id: 'coffee-roastery',
    label: '新消费精品咖啡旗舰店（巨型拉花咖啡杯）',
    shortLabel: '精品咖啡旗舰工坊',
    propHint: '屋顶冒热气咖啡杯 · 条纹遮阳棚外摆区',
    category: 'career',
    colors: ['#78350F', '#FDE68A', '#15803D'],
  },
  {
    id: 'xiaomi-park',
    label: '双子连廊科技园总部（活力橙顶标 + 慢跑环道与太空吉祥物）',
    shortLabel: '双子连廊科技园',
    propHint: '双子玻璃幕墙 · 屋顶活力橙顶标与园区慢跑道',
    category: 'career',
    colors: ['#FF6900', '#E2E8F0', '#1E293B'],
  },
  {
    id: 'jd-hq',
    label: '三联高空连廊旗舰总部（三塔悬挑天桥 + 银白金属吉祥物）',
    shortLabel: '三联连廊总部',
    propHint: '三塔高空连廊巨舰 · 绯红发光顶冠与金属萌宠雕塑',
    category: 'career',
    colors: ['#E1251B', '#F1F5F9', '#334155'],
  },
  {
    id: 'bytedance-hq',
    label: '错层悬挑数智科技广场（空中花园 + 蓝青四竖条律动光柱）',
    shortLabel: '错层数智广场',
    propHint: '错层悬挑玻璃幕墙 · 屋顶空中花园与蓝青动态律动光柱',
    category: 'career',
    colors: ['#325AB4', '#00C8D2', '#F8FAFC'],
  },
  {
    id: 'taikang-tower',
    label: 'CBD 斜交网格金融高塔（香槟金幕墙 + 晶钻顶冠）',
    shortLabel: '斜交网格金融塔',
    propHint: 'CBD 香槟金斜交网格摩天楼 · 翡翠菱形顶标',
    category: 'career',
    colors: ['#EA5504', '#D4AF37', '#1E293B'],
  },
  {
    id: 'cscec-tower',
    label: '外框钢构蓝立方总部（深蓝玻璃幕墙 + 立体蓝方顶标）',
    shortLabel: '钢构蓝立方大厦',
    propHint: '深宝石蓝外框X钢构大厦 · 12棱镂空三维蓝立方',
    category: 'career',
    colors: ['#005BAC', '#CBD5E1', '#F59E0B'],
  },
]

export function getBuildingStyleOptionsForKind(kind: PlaceKind): BuildingStyleOption[] {
  return BUILDING_STYLE_OPTIONS.filter((opt) => opt.category === kind)
}

export interface ProjectBoothOption {
  id: ProjectBoothStyle
  label: string
  shortLabel: string
  propHint: string
  colors: [string, string, string]
}

export const PROJECT_BOOTH_OPTIONS: ProjectBoothOption[] = [
  {
    id: 'booth-holo',
    label: '全息应用舱（双陀螺全息环 + 悬浮 UI 屏）',
    shortLabel: '全息应用舱',
    propHint: '双陀螺全息环 · 悬浮 UI 屏幕',
    colors: ['#1E293B', '#38BDF8', '#E8643A'],
  },
  {
    id: 'booth-crystal',
    label: 'AI 算力水晶矩阵（悬浮八面体核心 + 4 晶簇）',
    shortLabel: 'AI 水晶矩阵',
    propHint: '悬浮八面体核心 · 四角发光晶簇',
    colors: ['#1E1B4B', '#A855F7', '#38BDF8'],
  },
  {
    id: 'booth-monolith',
    label: '开源代码方尖碑（双曜石金碑 + 星盘环）',
    shortLabel: '代码方尖碑',
    propHint: '双曜石黑金碑 · 轨道星盘环',
    colors: ['#18181B', '#F59E0B', '#FDE047'],
  },
  {
    id: 'booth-mech',
    label: '智能硬件实验台（六轴伺服臂 + 激光扫描拱）',
    shortLabel: '智能硬件实验台',
    propHint: '六轴伺服机械臂 · 激光扫描拱门',
    colors: ['#334155', '#FF6A13', '#22D3EE'],
  },
  {
    id: 'booth-arcade',
    label: '互动游戏街机舱（霓虹街机框体 + 像素星徽）',
    shortLabel: '互动游戏街机舱',
    propHint: '复古霓虹框体 · 旋转像素星徽',
    colors: ['#3B0764', '#EC4899', '#FACC15'],
  },
]

export interface WorldShapeOption {
  id: WorldShapeType
  label: string
  shortLabel: string
  propHint: string
  colors: [string, string, string]
}

export const WORLD_SHAPE_OPTIONS: WorldShapeOption[] = [
  {
    id: 'archipelago',
    label: '星罗三岛礁湖（三座分离海岛 + 跨海木栈桥群）',
    shortLabel: '星罗三岛群礁',
    propHint: '告别大圆盘 · 三座独立分岛由跨海木桥相连',
    colors: ['#38BDF8', '#EAD9A6', '#65B75B'],
  },
  {
    id: 'b612-highland',
    label: 'B-612 小王子星丘（紧凑高耸星体 + 苔藓奇石环）',
    shortLabel: 'B-612 悬浮星丘',
    propHint: '小行星高耸穹顶 · 无河流切分与旋转黄金星环',
    colors: ['#7BC47F', '#D4A373', '#F43F5E'],
  },
  {
    id: 'canyon-mesa',
    label: '双生红岩大峡谷（棱角方台断层 + 高空悬索吊桥）',
    shortLabel: '双生红岩峡谷',
    propHint: '折线方形阶梯岩台 · 深切大裂谷与高空吊桥',
    colors: ['#D96B43', '#E8A86B', '#48B5A3'],
  },
  {
    id: 'alpine-valley',
    label: '极光U型冰川湾（马蹄形双子雪峰 + 冰川镜湖）',
    shortLabel: 'U型冰川雪湾',
    propHint: '北侧U型高耸雪峰环抱 · 东南深切开口滑雪湾',
    colors: ['#E8F1F8', '#6B9AC4', '#3B526B'],
  },
  {
    id: 'crescent-bay',
    label: '新月灯塔环礁湾（C型镂空内海湾 + 跨湾栈桥与帆船）',
    shortLabel: '新月灯塔海湾',
    propHint: 'C字弯月半岛环抱翡翠内海 · 岬角灯塔与泊船码头',
    colors: ['#2DD4BF', '#FDE68A', '#EF4444'],
  },
  {
    id: 'floating-terraces',
    label: '纪念碑谷天空方舟（三层正交阶梯方台 + 悬崖飞瀑）',
    shortLabel: '天空阶梯方舟',
    propHint: '纯正交方形立体露台 · 绝无圆盘感与悬崖瀑布石阶',
    colors: ['#A78BFA', '#F59E0B', '#38BDF8'],
  },
]

export interface SatelliteThemeOption {
  id: SatelliteTheme
  label: string
  shortLabel: string
  propHint: string
  colors: [string, string, string]
}

export const SATELLITE_THEME_OPTIONS: SatelliteThemeOption[] = [
  {
    id: 'skyline-cbd',
    label: '摩天金融 CBD 群岛（跨海红缆车 + 多拱跨海大桥）',
    shortLabel: '摩天 CBD 副岛',
    propHint: '摩天楼群 · 跨海红缆车与高架桥',
    colors: ['#334155', '#38BDF8', '#E11D48'],
  },
  {
    id: 'airfield-harbor',
    label: '海岛空港与渡轮码头（双翼机跑道 + 空管雷达塔）',
    shortLabel: '海岛空港码头',
    propHint: '起降跑道 · 旋转雷达塔与渡轮栈桥',
    colors: ['#475569', '#F59E0B', '#10B981'],
  },
  {
    id: 'lighthouse-reef',
    label: '红白灯塔奇石湾（旋转航标灯束 + 海蚀拱门）',
    shortLabel: '红白灯塔礁湾',
    propHint: '红白条纹灯塔 · 苔藓礁石拱门与木屋',
    colors: ['#EF4444', '#F8FAFC', '#FBBF24'],
  },
  {
    id: 'windmill-ranch',
    label: '荷兰风车花海牧场（旋转风车翼 + 薰衣草花田）',
    shortLabel: '风车花海牧场',
    propHint: '四叶旋转风车 · 紫色花海与绵羊',
    colors: ['#7BC47F', '#A855F7', '#F59E0B'],
  },
  {
    id: 'b612-observatory',
    label: 'B-612 星空占星台与小火山（黄铜望远镜 + 苔藓奇石）',
    shortLabel: 'B612 占星火山岛',
    propHint: '小王子冒烟火山 · 占星穹顶与星环',
    colors: ['#68B672', '#F59E0B', '#F43F5E'],
  },
  {
    id: 'hidden',
    label: '隐藏此副岛（留白开阔海面 / 纯净远景）',
    shortLabel: '隐藏（纯净留白）',
    propHint: '移除该方位副岛，保留开阔天地',
    colors: ['#CBD5E1', '#94A3B8', '#64748B'],
  },
]

export function resolveWorldShape(biome: BiomeType, explicit?: WorldShapeType): WorldShapeType {
  if (explicit && WORLD_SHAPE_OPTIONS.some((w) => w.id === explicit)) {
    return explicit
  }
  if (biome === 'grassland') return 'b612-highland'
  if (biome === 'desert') return 'canyon-mesa'
  if (biome === 'snow') return 'alpine-valley'
  return 'archipelago'
}

export function resolveSatellites(
  biome: BiomeType,
  explicit?: SatelliteTheme[],
): [SatelliteTheme, SatelliteTheme, SatelliteTheme] {
  const validIds = new Set(SATELLITE_THEME_OPTIONS.map((s) => s.id))
  const defaults: Record<BiomeType, [SatelliteTheme, SatelliteTheme, SatelliteTheme]> = {
    ocean: ['skyline-cbd', 'airfield-harbor', 'lighthouse-reef'],
    grassland: ['windmill-ranch', 'b612-observatory', 'lighthouse-reef'],
    desert: ['b612-observatory', 'airfield-harbor', 'skyline-cbd'],
    snow: ['b612-observatory', 'airfield-harbor', 'lighthouse-reef'],
  }
  const base = defaults[biome] ?? defaults.ocean
  if (!Array.isArray(explicit) || explicit.length === 0) return [...base]
  return [
    explicit[0] && validIds.has(explicit[0]) ? explicit[0] : base[0],
    explicit[1] && validIds.has(explicit[1]) ? explicit[1] : base[1],
    explicit[2] && validIds.has(explicit[2]) ? explicit[2] : base[2],
  ]
}

export function clampCompanyCount(count: number): number {
  if (!Number.isFinite(count)) return 4
  return Math.max(1, Math.min(6, Math.round(count)))
}

export function getActivePlaces(config: ProfileConfig): PlaceEntry[] {
  const targetCount = clampCompanyCount(config.companyCount)
  const educations = config.places.filter((p) => p.kind === 'education')
  const landmarks = config.places.filter((p) => p.kind === 'landmark')
  const careers = config.places.filter((p) => p.kind === 'career').slice(0, targetCount)
  return [...educations, ...landmarks, ...careers]
}

export function resolvePalette(biome: BiomeType, carrier: CarrierType): ThemePalette {
  const terrains = themeJson.terrains as Record<BiomeType, TerrainPalette>
  const realms = themeJson.realms as Record<CarrierType, RealmPalette>
  return {
    shared: themeJson.shared,
    terrain: terrains[biome] ?? terrains.ocean,
    realm: realms[carrier] ?? realms.submarine,
  }
}

export function validateProfileConfig(config: ProfileConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  if (!config.name?.trim()) errors.push('name 不能为空')
  if (config.companyCount < 1 || config.companyCount > 6 || !Number.isInteger(config.companyCount)) {
    errors.push('companyCount 必须为 1~6 的整数')
  }
  const careers = config.places.filter((p) => p.kind === 'career')
  if (careers.length === 0) {
    errors.push('至少需要 1 段 career 经历')
  }
  if (config.projects.length === 0) {
    errors.push('至少需要 1 个 project 作品项')
  }
  return { valid: errors.length === 0, errors }
}

export interface DecorPropOption {
  id: DecorPropId
  label: string
  shortLabel: string
  propHint: string
  colors: [string, string, string]
}

export const DECOR_PROP_OPTIONS: DecorPropOption[] = [
  {
    id: 'b612-rose',
    label: 'B-612 玻璃罩发光玫瑰（小王子专属星光花台）',
    shortLabel: '玻璃罩玫瑰',
    propHint: '透明玻璃罩 · 暖金呼吸玫瑰',
    colors: ['#F43F5E', '#A5F3FC', '#FDE047'],
  },
  {
    id: 'fox-bench',
    label: '小王子与狐狸日落长椅（守望第44次日落）',
    shortLabel: '小王子狐狸长椅',
    propHint: '原木观景长椅 · 黄围巾与小狐狸',
    colors: ['#F97316', '#FACC15', '#8C5A3C'],
  },
  {
    id: 'cherry-grove',
    label: '落英缤纷樱花树林（粉色樱花冠 + 花瓣石阶）',
    shortLabel: '浪漫樱花林',
    propHint: '三株粉白樱花树 · 落樱花瓣毯',
    colors: ['#F472B6', '#FBCFE8', '#7C5638'],
  },
  {
    id: 'campfire-tent',
    label: '旷野露营帐篷与篝火（暖光帆布帐 + 跃动篝火）',
    shortLabel: '露营篝火帐篷',
    propHint: '米白三角帆布帐 · 噼啪暖光篝火',
    colors: ['#FB923C', '#FEF3C7', '#92400E'],
  },
  {
    id: 'dutch-windmill',
    label: '荷兰旋转大风车（红杉八角塔 + 四叶帆布翼）',
    shortLabel: '荷兰大风车',
    propHint: '动态旋转风车翼 · 麦田花圃底座',
    colors: ['#B85A3A', '#FAF6EE', '#EAB308'],
  },
  {
    id: 'pet-corgi',
    label: '欢快奔跑的小柯基犬（绕中央广场巡游的萌宠）',
    shortLabel: '奔跑小柯基',
    propHint: '暖橘白肚短腿柯基 · 动态欢快奔跑',
    colors: ['#EA580C', '#FFFBEB', '#F59E0B'],
  },
]

export function applyProfilePatch(
  base: ProfileConfig,
  patch: Partial<ProfileConfig>,
): ProfileConfig {
  const biome = BIOME_OPTIONS.some((b) => b.id === patch.biome) ? patch.biome! : base.biome
  const carrier = CARRIER_OPTIONS.some((c) => c.id === patch.carrier)
    ? patch.carrier!
    : base.carrier
  const timeOfDay =
    patch.timeOfDay !== undefined
      ? TIME_OF_DAY_OPTIONS.some((t) => t.id === patch.timeOfDay)
        ? patch.timeOfDay
        : base.timeOfDay
      : base.timeOfDay
  const weather =
    patch.weather !== undefined
      ? WEATHER_OPTIONS.some((w) => w.id === patch.weather)
        ? patch.weather
        : base.weather
      : base.weather
  const worldShape =
    patch.worldShape !== undefined
      ? WORLD_SHAPE_OPTIONS.some((w) => w.id === patch.worldShape)
        ? patch.worldShape
        : base.worldShape
      : base.worldShape
  const satellites =
    patch.satellites !== undefined
      ? resolveSatellites(biome, patch.satellites)
      : base.satellites
  const validDecorIds = new Set(DECOR_PROP_OPTIONS.map((d) => d.id))
  const decorProps =
    patch.decorProps !== undefined
      ? Array.isArray(patch.decorProps)
        ? Array.from(new Set(patch.decorProps.filter((id) => validDecorIds.has(id))))
        : base.decorProps
      : base.decorProps
  const companyCount =
    patch.companyCount !== undefined ? clampCompanyCount(patch.companyCount) : base.companyCount
  const name = patch.name !== undefined && patch.name.trim().length > 0 ? patch.name.trim() : base.name
  const tagline =
    patch.tagline !== undefined && patch.tagline.trim().length > 0
      ? patch.tagline.trim()
      : base.tagline
  const github =
    patch.github !== undefined && patch.github.trim().length > 0 ? patch.github.trim() : base.github
  const linkedin =
    patch.linkedin !== undefined && patch.linkedin.trim().length > 0
      ? patch.linkedin.trim()
      : base.linkedin
  const validBooths = new Set(PROJECT_BOOTH_OPTIONS.map((b) => b.id))
  const validTints = new Set(BUILDING_TINT_OPTIONS.map((t) => t.id))
  const rawPlaces = Array.isArray(patch.places) && patch.places.length > 0 ? patch.places : base.places
  const places = rawPlaces.map((p) => {
    const kindOptions = getBuildingStyleOptionsForKind(p.kind)
    const fallbackStyle: BuildingStyle =
      p.kind === 'education' ? 'university' : p.kind === 'landmark' ? 'pagoda' : 'tower'
    const isStyleValidForKind = kindOptions.some((opt) => opt.id === p.style)
    const tintPreset =
      p.tintPreset && validTints.has(p.tintPreset) ? p.tintPreset : undefined
    const offsetX =
      typeof p.offsetX === 'number' && Number.isFinite(p.offsetX)
        ? Math.max(-2.0, Math.min(2.0, Math.round(p.offsetX * 100) / 100))
        : undefined
    const offsetZ =
      typeof p.offsetZ === 'number' && Number.isFinite(p.offsetZ)
        ? Math.max(-2.0, Math.min(2.0, Math.round(p.offsetZ * 100) / 100))
        : undefined
    const buildingScale =
      typeof p.buildingScale === 'number' && Number.isFinite(p.buildingScale)
        ? Math.max(0.8, Math.min(1.25, Math.round(p.buildingScale * 100) / 100))
        : undefined
    return {
      ...p,
      style: isStyleValidForKind ? p.style : fallbackStyle,
      link: p.link?.trim() || undefined,
      ...(typeof p.rotationOffset === 'number' && Number.isFinite(p.rotationOffset)
        ? { rotationOffset: p.rotationOffset }
        : {}),
      ...(tintPreset ? { tintPreset } : {}),
      ...(offsetX !== undefined ? { offsetX } : {}),
      ...(offsetZ !== undefined ? { offsetZ } : {}),
      ...(buildingScale !== undefined ? { buildingScale } : {}),
    }
  })
  const rawProjects =
    Array.isArray(patch.projects) && patch.projects.length > 0
      ? patch.projects.slice(0, 6)
      : base.projects.slice(0, 6)
  const projects = rawProjects.map((pr) => ({
    ...pr,
    boothStyle: pr.boothStyle && validBooths.has(pr.boothStyle) ? pr.boothStyle : 'booth-holo',
    tag: pr.tag?.trim() || undefined,
    link: pr.link?.trim() || undefined,
    repoUrl: pr.repoUrl?.trim() || undefined,
  }))

  return {
    name,
    tagline,
    github,
    linkedin,
    biome,
    carrier,
    ...(timeOfDay ? { timeOfDay } : {}),
    ...(weather ? { weather } : {}),
    ...(worldShape ? { worldShape } : {}),
    ...(satellites ? { satellites } : {}),
    ...(decorProps ? { decorProps } : {}),
    companyCount,
    places,
    projects,
  }
}

export function rotatePlaceInProfile(
  config: ProfileConfig,
  placeId: string,
  deltaRad = Math.PI / 2,
): ProfileConfig {
  const nextPlaces = config.places.map((p) => {
    if (p.id !== placeId) return p
    const cur = p.rotationOffset ?? 0
    return {
      ...p,
      rotationOffset: cur + deltaRad,
    }
  })
  return applyProfilePatch(config, { places: nextPlaces })
}

export function nudgePlaceInProfile(
  config: ProfileConfig,
  placeId: string,
  dx: number,
  dz: number,
  reset = false,
): ProfileConfig {
  const nextPlaces = config.places.map((p) => {
    if (p.id !== placeId) return p
    if (reset) {
      return {
        ...p,
        offsetX: 0,
        offsetZ: 0,
      }
    }
    const nextX = Math.max(-2.0, Math.min(2.0, (p.offsetX ?? 0) + dx))
    const nextZ = Math.max(-2.0, Math.min(2.0, (p.offsetZ ?? 0) + dz))
    return {
      ...p,
      offsetX: Math.round(nextX * 100) / 100,
      offsetZ: Math.round(nextZ * 100) / 100,
    }
  })
  return applyProfilePatch(config, { places: nextPlaces })
}

export function setPlaceTintInProfile(
  config: ProfileConfig,
  placeId: string,
  tintPreset: BuildingTintPreset,
): ProfileConfig {
  const nextPlaces = config.places.map((p) => {
    if (p.id !== placeId) return p
    return {
      ...p,
      tintPreset,
    }
  })
  return applyProfilePatch(config, { places: nextPlaces })
}

export function setPlaceScaleInProfile(
  config: ProfileConfig,
  placeId: string,
  scale: number,
): ProfileConfig {
  const clamped = Math.max(0.8, Math.min(1.25, Math.round(scale * 100) / 100))
  const nextPlaces = config.places.map((p) => {
    if (p.id !== placeId) return p
    return {
      ...p,
      buildingScale: clamped,
    }
  })
  return applyProfilePatch(config, { places: nextPlaces })
}

export function swapPlaceOrderInProfile(
  config: ProfileConfig,
  placeId: string,
  direction: -1 | 1,
): ProfileConfig {
  const target = config.places.find((p) => p.id === placeId)
  if (!target) return config

  const sameKindIndices: number[] = []
  config.places.forEach((p, idx) => {
    if (p.kind === target.kind) sameKindIndices.push(idx)
  })
  if (sameKindIndices.length < 2) return config

  const posInKind = sameKindIndices.findIndex((idx) => config.places[idx].id === placeId)
  if (posInKind < 0) return config
  const swapPosInKind =
    (posInKind + direction + sameKindIndices.length) % sameKindIndices.length
  const idxA = sameKindIndices[posInKind]
  const idxB = sameKindIndices[swapPosInKind]

  const nextPlaces = [...config.places]
  const temp = nextPlaces[idxA]
  nextPlaces[idxA] = nextPlaces[idxB]
  nextPlaces[idxB] = temp
  return applyProfilePatch(config, { places: nextPlaces })
}

export function toggleDecorPropInProfile(
  config: ProfileConfig,
  propId: DecorPropId,
): ProfileConfig {
  const current = config.decorProps ?? []
  const exists = current.includes(propId)
  const next = exists ? current.filter((id) => id !== propId) : [...current, propId]
  return applyProfilePatch(config, { decorProps: next })
}

export function encodeProfileShareHash(config: ProfileConfig): string {
  const json = JSON.stringify(config)
  const bytes = new TextEncoder().encode(json)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  const b64 = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `#island=${b64}`
}

export function decodeProfileShareHash(
  hash: string,
  fallback: ProfileConfig,
): ProfileConfig | null {
  const cleaned = hash.startsWith('#') ? hash.slice(1) : hash
  const match = /(?:^|&)island=([A-Za-z0-9\-_]+)/.exec(cleaned)
  if (!match) return null
  try {
    let b64 = match[1].replace(/-/g, '+').replace(/_/g, '/')
    while (b64.length % 4 !== 0) b64 += '='
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i)
    }
    const json = new TextDecoder().decode(bytes)
    return parseProfileJson(json, fallback)
  } catch {
    return null
  }
}

export function serializeProfileJson(config: ProfileConfig): string {
  return JSON.stringify(config, null, 2)
}

export function parseProfileJson(raw: string, fallback: ProfileConfig): ProfileConfig {
  try {
    const parsed = JSON.parse(raw) as Partial<ProfileConfig>
    if (!parsed || typeof parsed !== 'object') return fallback
    const merged = applyProfilePatch(fallback, parsed)
    const check = validateProfileConfig(merged)
    return check.valid ? merged : fallback
  } catch {
    return fallback
  }
}

