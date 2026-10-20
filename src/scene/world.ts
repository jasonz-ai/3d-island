import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  getActivePlaces,
  resolvePalette,
  resolveWorldShape,
  type BiomeType,
  type CarrierType,
  type ProfileConfig,
  type TimeOfDay,
  type WeatherType,
} from '../schema/profile.ts'
import {
  buildBuildingGroup,
  buildCarrierAndRealm,
  buildTerrainAndFoliage,
  type TickFn,
} from './builders.ts'
import { createStudioEnv } from './kit.ts'
import { computeWorldLayout, type Vec3, type WorldLayout } from './layout.ts'
import {
  REALM_TRANSITION_DURATION,
  carrierLaunchEnvelope,
  computeCameraPose,
  easeInOutCubic,
  realmProjectRevealScale,
  rng,
  sampleSlopePose,
  staggeredPopScale,
} from './motion.ts'
import { soundFx } from './sound.ts'

export type WorldLevel = 'ground' | 'realm'

export interface WorldCallbacks {
  onSelectEntity: (id: string | null) => void
  onLevelChange: (level: WorldLevel) => void
}

interface LabelBinding {
  id: string
  index: number
  level: WorldLevel
  anchor: THREE.Vector3
  element: HTMLButtonElement
  object: THREE.Object3D
  pose: { pos: THREE.Vector3; target: THREE.Vector3 }
}

interface CameraFlight {
  t: number
  duration: number
  fromPos: THREE.Vector3
  fromTarget: THREE.Vector3
  toPos: THREE.Vector3
  toTarget: THREE.Vector3
  midPos?: THREE.Vector3
  midTarget?: THREE.Vector3
}

function toVec3(v: Vec3): THREE.Vector3 {
  return new THREE.Vector3(v.x, v.y, v.z)
}

export interface WorldController {
  focusEntity: (id: string | null, targetLevel?: WorldLevel) => void
  toggleRealm: () => void
  rebuild: (nextConfig: ProfileConfig, preserveSelection?: boolean) => void
  getLevel: () => WorldLevel
  getLayout: () => WorldLayout
  renderAt: (timeSec: number) => void
  resetOverview?: () => void
}

declare global {
  interface Window {
    renderAt?: (timeSec: number) => void
  }
}

export interface LightingRigSpec {
  sunColor: string
  sunIntensity: number
  sunPosition: Vec3
  hemiSkyColor: string
  hemiGroundColor: string
  hemiIntensity: number
  rimColor: string
  rimIntensity: number
  shadowFrustumHalfSize: number
  shadowBias: number
  shadowNormalBias: number
  skyHex: string
  isDarkSky: boolean
  emissiveBoost: number
  starfieldOpacity: number
  timeOfDay: TimeOfDay
}

export function computeLightingRig(
  biome: BiomeType,
  carrier: CarrierType,
  blend: number,
  timeOfDay: TimeOfDay = 'day',
): LightingRigSpec {
  const palette = resolvePalette(biome, carrier)
  const baseGroundSky = new THREE.Color(palette.terrain.sky)
  const sunsetTint = new THREE.Color(
    biome === 'desert' ? '#F09B6C' : biome === 'snow' ? '#DCA4BA' : '#F3A683',
  )
  const nightSky = new THREE.Color('#0E172A')

  const groundSky =
    timeOfDay === 'sunset'
      ? baseGroundSky.clone().lerp(sunsetTint, 0.74)
      : timeOfDay === 'night'
        ? nightSky.clone()
        : baseGroundSky

  const realmSky = new THREE.Color(palette.realm.sky)
  const sky = groundSky.clone().lerp(realmSky, blend)
  const lum = 0.2126 * sky.r + 0.7152 * sky.g + 0.0722 * sky.b
  const isDarkSky = lum < 0.32 || (timeOfDay === 'night' && blend < 0.5)

  // Key light color, intensity & elevation angle per timeOfDay
  const daySunHex = biome === 'snow' ? '#FFF1DC' : '#FFE8C6'
  const groundSunHex =
    timeOfDay === 'sunset' ? '#FF8C42' : timeOfDay === 'night' ? '#8AB8FF' : daySunHex
  const groundSun = new THREE.Color(groundSunHex)
  const realmSun = new THREE.Color(isDarkSky ? '#D8ECFF' : '#FFE9C8')
  const sunColor = `#${groundSun.lerp(realmSun, blend * 0.65).getHexString()}`

  const baseSunIntensity =
    timeOfDay === 'sunset' ? 2.92 : timeOfDay === 'night' ? 1.52 : 2.76
  const sunIntensity = baseSunIntensity - blend * (isDarkSky ? 0.32 : 0.15)

  const sunPosition: Vec3 =
    timeOfDay === 'sunset'
      ? { x: -36, y: 17.5 + blend * 14, z: 26 }
      : timeOfDay === 'night'
        ? { x: 24, y: 28, z: -20 }
        : { x: -26, y: 36, z: 24 }

  // Hemisphere sky & ground bounce
  const hemiSkyColor =
    isDarkSky && blend > 0.5
      ? '#7BA8D4'
      : timeOfDay === 'sunset'
        ? '#E298A8'
        : timeOfDay === 'night'
          ? '#3B5998'
          : '#D6E6F6'
  const hemiGroundColor =
    timeOfDay === 'sunset'
      ? '#6E473B'
      : timeOfDay === 'night'
        ? '#1E2638'
        : biome === 'desert'
          ? '#8A765C'
          : '#787062'
  const baseHemiIntensity =
    timeOfDay === 'sunset' ? 0.76 : timeOfDay === 'night' ? 0.62 : 0.78
  const hemiIntensity = baseHemiIntensity + blend * (isDarkSky ? 0.14 : 0.04)

  // Rim light
  const rimColor =
    isDarkSky && blend > 0.5
      ? '#58D5E8'
      : timeOfDay === 'sunset'
        ? '#FFAE68'
        : timeOfDay === 'night'
          ? '#58D5E8'
          : '#94C0EC'
  const rimIntensity = timeOfDay === 'sunset' ? 0.88 : timeOfDay === 'night' ? 0.92 : 0.64

  const emissiveBoost =
    timeOfDay === 'night' ? 2.65 : timeOfDay === 'sunset' ? 1.85 : 1.0
  const starfieldOpacity =
    timeOfDay === 'night'
      ? 0.95
      : timeOfDay === 'sunset'
        ? 0.42 * (1 - blend * 0.5)
        : 0

  return {
    sunColor,
    sunIntensity,
    sunPosition,
    hemiSkyColor,
    hemiGroundColor,
    hemiIntensity,
    rimColor,
    rimIntensity,
    shadowFrustumHalfSize: 23,
    shadowBias: -0.00035,
    shadowNormalBias: 0.018,
    skyHex: `#${sky.getHexString()}`,
    isDarkSky,
    emissiveBoost,
    starfieldOpacity,
    timeOfDay,
  }
}

/**
 * Global spatially-phased wind-sway animation pass across all island trees, cherry groves,
 * coastal palms, and Dutch windmill blades. Returns the number of animated nodes.
 */
export function updateFoliageWindSway(root: THREE.Object3D, elapsedSec: number): number {
  let count = 0
  root.traverse((obj) => {
    if (obj.userData?.windSway) {
      const phase =
        typeof obj.userData.windPhase === 'number'
          ? obj.userData.windPhase
          : obj.position.x * 0.41 + obj.position.z * 0.37
      const gust = 0.72 + 0.28 * Math.sin(elapsedSec * 0.45 + phase * 0.5)
      obj.rotation.z = Math.sin(elapsedSec * 1.15 - phase) * 0.034 * gust
      obj.rotation.x = Math.cos(elapsedSec * 0.88 - phase * 0.8) * 0.019 * gust
      count += 1
    } else if (obj.userData?.windmillSpin) {
      obj.rotation.z = -elapsedSec * 1.35
      count += 1
    }
  })
  return count
}

export function buildStarfieldGroup(): THREE.Group {
  const group = new THREE.Group()
  group.name = 'night-starfield'
  const rand = rng(440612)

  const starsGroup = new THREE.Group()
  starsGroup.name = 'celestial-stars'
  const starColors = ['#FFF3C4', '#E0F2FE', '#FFE4E6', '#FDE68A']
  const starGeo = new THREE.OctahedronGeometry(0.18, 0)
  for (let i = 0; i < 120; i += 1) {
    const theta = rand() * Math.PI * 2
    const r = 30 + rand() * 36
    const y = 7.5 + rand() * 34
    const col = starColors[i % starColors.length]
    const mat = new THREE.MeshBasicMaterial({
      color: col,
      transparent: true,
      opacity: 0.85,
    })
    const star = new THREE.Mesh(starGeo, mat)
    const s = 0.65 + rand() * 1.35
    star.scale.set(s, s * 1.25, s)
    star.position.set(Math.cos(theta) * r, y, Math.sin(theta) * r - 6)
    star.userData = { phase: rand() * Math.PI * 2, baseScale: s }
    starsGroup.add(star)
  }

  const firefliesGroup = new THREE.Group()
  firefliesGroup.name = 'island-fireflies'
  const flyGeo = new THREE.SphereGeometry(0.11, 8, 8)
  for (let i = 0; i < 28; i += 1) {
    const theta = rand() * Math.PI * 2
    const r = 3.5 + rand() * 14.5
    const y = 1.2 + rand() * 4.8
    const mat = new THREE.MeshBasicMaterial({
      color: i % 3 === 0 ? '#FDE047' : '#FB923C',
      transparent: true,
      opacity: 0.9,
    })
    const fly = new THREE.Mesh(flyGeo, mat)
    fly.position.set(Math.cos(theta) * r, y, Math.sin(theta) * r)
    fly.userData = {
      baseX: fly.position.x,
      baseY: fly.position.y,
      baseZ: fly.position.z,
      phase: rand() * Math.PI * 2,
    }
    firefliesGroup.add(fly)
  }

  group.add(starsGroup, firefliesGroup)
  return group
}

export interface GuidedTourStop {
  id: string | null
  level: WorldLevel
  label: string
  durationMs: number
}

export function computeGuidedTourStopList(config: ProfileConfig): GuidedTourStop[] {
  const activePlaces = getActivePlaces(config)
  const landmark = activePlaces.find((p) => p.kind === 'landmark')
  const education = activePlaces.find((p) => p.kind === 'education')
  const careers = activePlaces.filter((p) => p.kind === 'career')

  const stops: GuidedTourStop[] = [
    { id: null, level: 'ground', label: '🌍 主岛全景俯瞰', durationMs: 2200 },
  ]
  if (landmark) {
    stops.push({
      id: landmark.id,
      level: 'ground',
      label: `🏮 家乡印记 · ${landmark.short ?? landmark.name}`,
      durationMs: 2800,
    })
  }
  if (education) {
    stops.push({
      id: education.id,
      level: 'ground',
      label: `🎓 求学母校 · ${education.short ?? education.name}`,
      durationMs: 2800,
    })
  }
  for (const c of careers) {
    stops.push({
      id: c.id,
      level: 'ground',
      label: `🏢 职业履历 · ${c.short ?? c.name}`,
      durationMs: 2600,
    })
  }
  stops.push({
    id: null,
    level: 'realm',
    label: '🚀 启航前往第二秘境',
    durationMs: 4800,
  })
  for (const proj of config.projects.slice(0, 3)) {
    stops.push({
      id: proj.id,
      level: 'realm',
      label: `✦ 作品展台 · ${proj.name}`,
      durationMs: 2800,
    })
  }
  stops.push({
    id: null,
    level: 'ground',
    label: '🏡 返回主岛全景',
    durationMs: 4600,
  })
  return stops
}

export function buildWeatherParticlesGroup(weather: WeatherType = 'clear'): THREE.Group {
  const group = new THREE.Group()
  group.name = 'weather-particles'
  group.userData.weather = weather
  if (weather === 'clear') return group

  const rand = rng(880612)
  const sub = new THREE.Group()
  sub.name = `weather-${weather}`

  if (weather === 'sakura') {
    const petalGeo = new THREE.SphereGeometry(0.16, 8, 6)
    const petalColors = ['#F472B6', '#FBCFE8', '#FB7185', '#FDA4AF', '#FFF1F2']
    for (let i = 0; i < 96; i += 1) {
      const mat = new THREE.MeshBasicMaterial({
        color: petalColors[i % petalColors.length],
        transparent: true,
        opacity: 0.92,
      })
      const petal = new THREE.Mesh(petalGeo, mat)
      const sc = 0.85 + rand() * 0.55
      petal.scale.set(1.45 * sc, 0.32 * sc, 0.92 * sc)
      const x = (rand() - 0.5) * 36
      const y = 1.2 + rand() * 15
      const z = (rand() - 0.5) * 30
      petal.position.set(x, y, z)
      petal.userData = {
        baseX: x,
        baseY: y,
        baseZ: z,
        speed: 0.65 + rand() * 0.55,
        phase: rand() * Math.PI * 2,
      }
      sub.add(petal)
    }
  } else if (weather === 'snowfall') {
    const snowGeo = new THREE.OctahedronGeometry(0.13, 0)
    for (let i = 0; i < 72; i += 1) {
      const mat = new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? '#E0F2FE' : '#FFFFFF',
        transparent: true,
        opacity: 0.9,
      })
      const flake = new THREE.Mesh(snowGeo, mat)
      const x = (rand() - 0.5) * 36
      const y = 1.2 + rand() * 15
      const z = (rand() - 0.5) * 32
      flake.position.set(x, y, z)
      flake.userData = {
        baseX: x,
        baseY: y,
        baseZ: z,
        speed: 0.55 + rand() * 0.5,
        phase: rand() * Math.PI * 2,
      }
      sub.add(flake)
    }
  } else if (weather === 'meteor') {
    const streakGeo = new THREE.CylinderGeometry(0.02, 0.09, 2.8, 6)
    for (let i = 0; i < 14; i += 1) {
      const mat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? '#FEF08A' : '#7DD3FC',
        transparent: true,
        opacity: 0.85,
      })
      const streak = new THREE.Mesh(streakGeo, mat)
      const x = (rand() - 0.5) * 42
      const y = 11 + rand() * 16
      const z = -10 - rand() * 18
      streak.position.set(x, y, z)
      streak.rotation.z = -0.88
      streak.userData = {
        baseX: x,
        baseY: y,
        baseZ: z,
        speed: 1.4 + rand() * 0.8,
        phase: rand() * 6,
      }
      sub.add(streak)
    }
  } else if (weather === 'fireflies') {
    const orbGeo = new THREE.SphereGeometry(0.13, 8, 8)
    for (let i = 0; i < 48; i += 1) {
      const mat = new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? '#FDE047' : i % 3 === 1 ? '#FB923C' : '#34D399',
        transparent: true,
        opacity: 0.92,
      })
      const orb = new THREE.Mesh(orbGeo, mat)
      const ang = rand() * Math.PI * 2
      const r = 2.5 + rand() * 15.5
      const y = 0.8 + rand() * 6.5
      orb.position.set(Math.cos(ang) * r, y, Math.sin(ang) * r)
      orb.userData = {
        baseX: orb.position.x,
        baseY: y,
        baseZ: orb.position.z,
        speed: 0.8 + rand() * 0.6,
        phase: rand() * Math.PI * 2,
      }
      sub.add(orb)
    }
  }

  group.add(sub)
  return group
}

export interface CameraViewOffsetSpec {
  enabled: boolean
  fullWidth: number
  fullHeight: number
  offsetX: number
  offsetY: number
  width: number
  height: number
  ratio: number
}

export function computeCameraViewOffset(
  width: number,
  height: number,
  hasSelection: boolean,
  isBuildMode = false,
  isImmersiveFullscreen = false,
): CameraViewOffsetSpec {
  if (width < 960 || height < 580 || isImmersiveFullscreen) {
    return {
      enabled: false,
      fullWidth: width,
      fullHeight: height,
      offsetX: 0,
      offsetY: 0,
      width,
      height,
      ratio: 0,
    }
  }
  const ratio = isBuildMode ? 0 : hasSelection ? 0.13 : -0.12
  return {
    enabled: true,
    fullWidth: width,
    fullHeight: height,
    offsetX: Math.round(ratio * width),
    offsetY: 0,
    width,
    height,
    ratio,
  }
}

export type AuditCameraPreset = 'overview' | 'closeup' | 'realm' | 'side'

export function computeAuditCameraPose(
  preset: string | null,
  realmCameraPos: Vec3,
  realmCameraTarget: Vec3,
): { pos: Vec3; target: Vec3; forceRealm?: boolean } | null {
  if (preset === 'overview') {
    return {
      pos: { x: 2.8, y: 25.5, z: 44.5 },
      target: { x: 0, y: 1.6, z: 0 },
    }
  }
  if (preset === 'closeup') {
    return {
      pos: { x: -3.2, y: 9.2, z: 21.5 },
      target: { x: -0.8, y: 2.2, z: -1.2 },
    }
  }
  if (preset === 'side') {
    return {
      pos: { x: -36.5, y: 12.4, z: 16.5 },
      target: { x: 0, y: 1.8, z: 0 },
    }
  }
  if (preset === 'realm') {
    return {
      pos: { ...realmCameraPos },
      target: { ...realmCameraTarget },
      forceRealm: true,
    }
  }
  return null
}

export function createWorldController(
  canvas: HTMLCanvasElement,
  labelsRoot: HTMLElement,
  veilEl: HTMLElement,
  initialConfig: ProfileConfig,
  callbacks: WorldCallbacks,
): WorldController {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.04

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(35, 1, 0.5, 450)
  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.dampingFactor = 0.065
  controls.enablePan = false
  controls.minDistance = 8
  controls.maxDistance = 85
  controls.maxPolarAngle = 1.44
  controls.autoRotate = false
  controls.autoRotateSpeed = 0.35

  const initRig = computeLightingRig(
    initialConfig.biome,
    initialConfig.carrier,
    0,
    initialConfig.timeOfDay ?? 'day',
  )

  const hemiLight = new THREE.HemisphereLight(
    initRig.hemiSkyColor,
    initRig.hemiGroundColor,
    initRig.hemiIntensity,
  )
  scene.add(hemiLight)

  const sunLight = new THREE.DirectionalLight(initRig.sunColor, initRig.sunIntensity)
  sunLight.position.set(
    initRig.sunPosition.x,
    initRig.sunPosition.y,
    initRig.sunPosition.z,
  )
  sunLight.castShadow = true
  sunLight.shadow.mapSize.set(2048, 2048)
  sunLight.shadow.camera.near = 5
  sunLight.shadow.camera.far = 120
  sunLight.shadow.bias = initRig.shadowBias
  sunLight.shadow.normalBias = initRig.shadowNormalBias
  const d = initRig.shadowFrustumHalfSize
  sunLight.shadow.camera.left = -d
  sunLight.shadow.camera.right = d
  sunLight.shadow.camera.top = d
  sunLight.shadow.camera.bottom = -d
  scene.add(sunLight)

  const rimLight = new THREE.DirectionalLight(initRig.rimColor, initRig.rimIntensity)
  rimLight.position.set(26, 16, -24)
  scene.add(rimLight)

  const islandWarmLight = new THREE.PointLight('#FF9E44', 0, 42, 1.35)
  islandWarmLight.position.set(0, 5.4, 0)
  scene.add(islandWarmLight)

  let config: ProfileConfig = initialConfig
  let level: WorldLevel = 'ground'
  let selectedId: string | null = null
  let hoveredId: string | null = null
  let layout: WorldLayout = computeWorldLayout(
    getActivePlaces(config),
    config.projects,
    config.biome,
    config.carrier,
  )

  let studioEnvTex: THREE.Texture | null = null
  let contentGroup = new THREE.Group()
  scene.add(contentGroup)

  let carrierMesh: THREE.Group | null = null
  let carrierButton: HTMLButtonElement | null = null
  let updateCarrierFn:
    | ((elapsed: number, settleWave: number, moveSpeed?: number, realmProgress?: number) => void)
    | null = null
  let labelBindings: LabelBinding[] = []
  let pickables: THREE.Object3D[] = []
  let ticks: TickFn[] = []
  let emissiveMats: { mat: THREE.MeshStandardMaterial; base: number }[] = []
  let flight: CameraFlight | null = null
  let realmProgress = 0
  let rebuildStartSec = 0
  let lastSimSec = 0
  let currentOffsetRatio = -0.12

  type ViewportFramingMode = 'portrait' | 'landscape-centered' | 'desktop-editorial'
  let lastFramingMode: ViewportFramingMode | null = null
  let lastCssW = 0
  let lastCssH = 0

  function getViewportSize(): { w: number; h: number } {
    const w = Math.max(1, Math.round(canvas.clientWidth || window.innerWidth || 1024))
    const h = Math.max(1, Math.round(canvas.clientHeight || window.innerHeight || 768))
    return { w, h }
  }

  function getFramingMode(w: number, h: number): ViewportFramingMode {
    if (h > w * 1.15) return 'portrait'
    const isFullscreen = document.body.classList.contains('island-immersive-fullscreen')
    if (isFullscreen || w < 960 || h < 580) return 'landscape-centered'
    return 'desktop-editorial'
  }

  function getOverviewPose(targetLevel: WorldLevel): { pos: THREE.Vector3; target: THREE.Vector3 } {
    if (targetLevel === 'ground') {
      const { w, h } = getViewportSize()
      const mode = getFramingMode(w, h)
      if (mode === 'portrait') {
        return {
          pos: new THREE.Vector3(1.0, 36.5, 65.0),
          target: new THREE.Vector3(0, 1.6, 0),
        }
      }
      if (mode === 'landscape-centered') {
        return {
          pos: new THREE.Vector3(0.0, 21.8, 38.0),
          target: new THREE.Vector3(0.0, 0.4, 2.2),
        }
      }
      return {
        pos: new THREE.Vector3(2.8, 25.5, 44.5),
        target: new THREE.Vector3(0, 1.6, 0),
      }
    }
    return {
      pos: toVec3(layout.carrier.realmCameraPosition),
      target: toVec3(layout.carrier.realmCameraTarget),
    }
  }

  function startFlight(
    pose: { pos: THREE.Vector3; target: THREE.Vector3 },
    duration: number,
    mid?: { pos: THREE.Vector3; target: THREE.Vector3 },
  ): void {
    controls.autoRotate = false
    if (frozenSec !== null) {
      flight = null
      camera.position.copy(pose.pos)
      controls.target.copy(pose.target)
      controls.update()
      camera.lookAt(controls.target)
      return
    }
    controls.enabled = false
    flight = {
      t: 0,
      duration,
      fromPos: camera.position.clone(),
      fromTarget: controls.target.clone(),
      toPos: pose.pos.clone(),
      toTarget: pose.target.clone(),
      midPos: mid?.pos.clone(),
      midTarget: mid?.target.clone(),
    }
  }

  function applyBackgroundAndFog(biome: BiomeType, carrier: CarrierType, blend: number): void {
    const timeOfDay = config.timeOfDay ?? 'day'
    const effectiveBlend = carrier === 'submarine' ? Math.pow(blend, 0.45) : blend
    const rig = computeLightingRig(biome, carrier, effectiveBlend, timeOfDay)
    const sky = new THREE.Color(rig.skyHex)
    scene.background = sky
    scene.fog = new THREE.Fog(sky, 68, 175)
    document.documentElement.style.setProperty('--bg', rig.skyHex)
    document.body.classList.toggle('dark-sky', rig.isDarkSky)
    document.body.classList.toggle('time-sunset', timeOfDay === 'sunset' && blend < 0.5)
    document.body.classList.toggle('time-night', timeOfDay === 'night' && blend < 0.5)

    sunLight.color.set(rig.sunColor)
    sunLight.intensity = rig.sunIntensity
    sunLight.position.set(rig.sunPosition.x, rig.sunPosition.y, rig.sunPosition.z)
    hemiLight.color.set(rig.hemiSkyColor)
    hemiLight.groundColor.set(rig.hemiGroundColor)
    hemiLight.intensity = rig.hemiIntensity
    rimLight.color.set(rig.rimColor)
    rimLight.intensity = rig.rimIntensity

    islandWarmLight.intensity =
      (1 - blend) * (timeOfDay === 'night' ? 2.15 : timeOfDay === 'sunset' ? 1.18 : 0)

    for (const item of emissiveMats) {
      item.mat.emissiveIntensity = item.base * rig.emissiveBoost
    }

    const starGroup = contentGroup.getObjectByName('night-starfield')
    if (starGroup) {
      starGroup.visible = rig.starfieldOpacity > 0.02
    }

    // Harmonize outer horizon mesh (far-water uses MeshStandardMaterial/MeshBasicMaterial with vertexColors)
    const farWater = contentGroup.getObjectByName('far-water') as THREE.Mesh | undefined
    if (
      farWater &&
      (farWater.material instanceof THREE.MeshStandardMaterial ||
        farWater.material instanceof THREE.MeshBasicMaterial)
    ) {
      if (timeOfDay === 'sunset' && blend < 0.5) {
        farWater.material.color.set('#F4B494')
      } else if (timeOfDay === 'night' && blend < 0.5) {
        farWater.material.color.set('#162644')
      } else {
        farWater.material.color.set('#FFFFFF')
      }
    }
  }

  function buildSceneContent(): void {
    scene.remove(contentGroup)
    contentGroup = new THREE.Group()
    scene.add(contentGroup)

    labelsRoot.innerHTML = ''
    labelBindings = []
    pickables = []
    ticks = []
    emissiveMats = []
    rebuildStartSec = lastSimSec

    const activePlaces = getActivePlaces(config)
    layout = computeWorldLayout(
      activePlaces,
      config.projects,
      config.biome,
      config.carrier,
      resolveWorldShape(config.biome, config.worldShape),
    )
    const palette = resolvePalette(config.biome, config.carrier)

    if (studioEnvTex) studioEnvTex.dispose()
    studioEnvTex = createStudioEnv(renderer, palette.shared.accent, palette.terrain.sky)
    scene.environment = studioEnvTex
    scene.environmentIntensity =
      config.timeOfDay === 'night' ? 0.24 : config.timeOfDay === 'sunset' ? 0.38 : 0.48

    const terrainGroup = buildTerrainAndFoliage(
      config.biome,
      palette,
      layout,
      ticks,
      config.satellites,
      config.decorProps,
    )
    contentGroup.add(terrainGroup)

    layout.buildings.forEach((placed, idx) => {
      const bGroup = buildBuildingGroup(placed, config.biome, palette, ticks)
      contentGroup.add(bGroup)
      pickables.push(bGroup)

      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'label'
      btn.textContent = placed.place.short ?? placed.place.name
      btn.addEventListener('click', () => {
        soundFx.playSelectChime()
        callbacks.onSelectEntity(placed.place.id)
      })
      labelsRoot.appendChild(btn)

      labelBindings.push({
        id: placed.place.id,
        index: idx,
        level: 'ground',
        anchor: toVec3(placed.labelAnchor),
        element: btn,
        object: bGroup,
        pose: {
          pos: toVec3(placed.cameraPosition),
          target: toVec3(placed.cameraTarget),
        },
      })
    })

    const { carrierGroup, realmGroup, projectMeshes, updateCarrierMotion } = buildCarrierAndRealm(
      config.carrier,
      palette,
      layout,
      ticks,
    )
    carrierMesh = carrierGroup
    updateCarrierFn = updateCarrierMotion
    contentGroup.add(carrierGroup)
    contentGroup.add(realmGroup)
    pickables.push(carrierGroup)

    const cBtn = document.createElement('button')
    cBtn.type = 'button'
    cBtn.className = 'label carrier-label'
    cBtn.textContent = level === 'ground' ? palette.realm.ctaEnter : palette.realm.ctaExit
    cBtn.addEventListener('click', () => toggleRealm())
    labelsRoot.appendChild(cBtn)
    carrierButton = cBtn

    for (const pp of layout.projects) {
      const mesh = projectMeshes.get(pp.project.id)
      if (!mesh) continue
      pickables.push(mesh)

      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'label'
      btn.textContent = pp.project.name
      btn.addEventListener('click', () => {
        soundFx.playSelectChime()
        callbacks.onSelectEntity(pp.project.id)
      })
      labelsRoot.appendChild(btn)

      labelBindings.push({
        id: pp.project.id,
        index: pp.index,
        level: 'realm',
        anchor: toVec3(pp.labelAnchor),
        element: btn,
        object: mesh,
        pose: {
          pos: toVec3(pp.cameraPosition),
          target: toVec3(pp.cameraTarget),
        },
      })
    }

    // 3D Starfield & Island Fireflies for Sunset / Night modes
    const starfieldGroup = buildStarfieldGroup()
    contentGroup.add(starfieldGroup)
    ticks.push((t) => {
      if (!starfieldGroup.visible) return
      const rig = computeLightingRig(
        config.biome,
        config.carrier,
        realmProgress,
        config.timeOfDay ?? 'day',
      )
      const stars = starfieldGroup.getObjectByName('celestial-stars')
      if (stars) {
        stars.rotation.y = t * 0.015
        for (const child of stars.children) {
          const mesh = child as THREE.Mesh
          const phase = (mesh.userData.phase as number) ?? 0
          const baseScale = (mesh.userData.baseScale as number) ?? 1
          const twinkle = 0.65 + 0.35 * Math.sin(t * 2.4 + phase)
          mesh.scale.setScalar(baseScale * twinkle)
          if (mesh.material instanceof THREE.MeshBasicMaterial) {
            mesh.material.opacity = rig.starfieldOpacity * twinkle
          }
        }
      }
      const flies = starfieldGroup.getObjectByName('island-fireflies')
      if (flies) {
        for (const child of flies.children) {
          const mesh = child as THREE.Mesh
          const u = mesh.userData as {
            baseX: number
            baseY: number
            baseZ: number
            phase: number
          }
          mesh.position.set(
            u.baseX + Math.sin(t * 1.1 + u.phase) * 0.45,
            u.baseY + Math.cos(t * 1.6 + u.phase) * 0.28,
            u.baseZ + Math.cos(t * 0.9 + u.phase) * 0.45,
          )
          if (mesh.material instanceof THREE.MeshBasicMaterial) {
            mesh.material.opacity =
              rig.starfieldOpacity * (0.55 + 0.45 * Math.sin(t * 3.2 + u.phase))
          }
        }
      }
    })

    // Round 8 Gap (c): Dynamic 3D Weather & Living Particle Ecosystem
    const activeWeather = config.weather ?? 'clear'
    const weatherGroup = buildWeatherParticlesGroup(activeWeather)
    contentGroup.add(weatherGroup)
    if (activeWeather !== 'clear') {
      const sub = weatherGroup.getObjectByName(`weather-${activeWeather}`)
      ticks.push((t) => {
        if (!sub) return
        for (const child of sub.children) {
          const mesh = child as THREE.Mesh
          const u = mesh.userData as {
            baseX: number
            baseY: number
            baseZ: number
            speed: number
            phase: number
          }
          if (activeWeather === 'sakura') {
            const fallY = ((u.baseY - t * u.speed * 1.4) % 14 + 14) % 14 + 0.6
            mesh.position.set(
              u.baseX + Math.sin(t * 1.3 + u.phase) * 1.8,
              fallY,
              u.baseZ + Math.cos(t * 1.1 + u.phase) * 1.2,
            )
            mesh.rotation.set(t * 1.6 + u.phase, t * 1.2, Math.sin(t + u.phase) * 0.5)
          } else if (activeWeather === 'snowfall') {
            const fallY = ((u.baseY - t * u.speed * 1.25) % 15 + 15) % 15 + 0.4
            mesh.position.set(
              u.baseX + Math.sin(t * 0.9 + u.phase) * 0.85,
              fallY,
              u.baseZ + Math.cos(t * 0.8 + u.phase) * 0.75,
            )
            mesh.rotation.y = t * 0.9 + u.phase
          } else if (activeWeather === 'meteor') {
            const cyc = (t * u.speed + u.phase) % 5.5
            const prog = Math.min(1, cyc / 1.6)
            mesh.position.set(
              u.baseX + prog * 18,
              u.baseY - prog * 14,
              u.baseZ + prog * 6,
            )
            if (mesh.material instanceof THREE.MeshBasicMaterial) {
              mesh.material.opacity = cyc < 1.6 ? Math.sin(prog * Math.PI) * 0.92 : 0
            }
          } else if (activeWeather === 'fireflies') {
            mesh.position.set(
              u.baseX + Math.sin(t * u.speed + u.phase) * 0.95,
              u.baseY + Math.cos(t * u.speed * 1.3 + u.phase) * 0.65,
              u.baseZ + Math.cos(t * u.speed * 0.9 + u.phase) * 0.95,
            )
            const pulse = 0.55 + 0.45 * Math.sin(t * 3.4 + u.phase)
            mesh.scale.setScalar(0.75 + pulse * 0.55)
          }
        }
      })
    }

    // Collect emissive materials across buildings, lamps, bridges, and realms for Sunset/Night boost
    const seenMats = new Set<THREE.Material>()
    contentGroup.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
      for (const m of mats) {
        if (!(m instanceof THREE.MeshStandardMaterial) || seenMats.has(m)) continue
        seenMats.add(m)
        const emSum = m.emissive.r + m.emissive.g + m.emissive.b
        if (emSum > 0.02 && m.emissiveIntensity > 0) {
          emissiveMats.push({ mat: m, base: m.emissiveIntensity })
        }
      }
    })

    // Sims 3D Build Mode Selection Ring & Floating Plumbob Crystal (build-selection-gizmo)
    const gizmoGroup = new THREE.Group()
    gizmoGroup.name = 'build-selection-gizmo'
    gizmoGroup.visible = false

    const ringMesh = new THREE.Mesh(
      new THREE.TorusGeometry(2.85, 0.085, 12, 48),
      new THREE.MeshStandardMaterial({
        color: palette.shared.accent,
        emissive: palette.shared.accent,
        emissiveIntensity: 0.92,
        roughness: 0.2,
      }),
    )
    ringMesh.name = 'selection-ring'
    ringMesh.rotation.x = Math.PI / 2
    ringMesh.position.y = 0.16

    const outerHalo = new THREE.Mesh(
      new THREE.TorusGeometry(3.25, 0.035, 10, 48),
      new THREE.MeshStandardMaterial({
        color: '#34D399',
        emissive: '#10B981',
        emissiveIntensity: 0.85,
        roughness: 0.25,
      }),
    )
    outerHalo.name = 'selection-outer-halo'
    outerHalo.rotation.x = Math.PI / 2
    outerHalo.position.y = 0.14

    // Iconic Sims Plumbob Diamond hovering above selected building
    const plumbob = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.42, 0),
      new THREE.MeshStandardMaterial({
        color: '#34D399',
        emissive: '#10B981',
        emissiveIntensity: 0.78,
        roughness: 0.15,
        metalness: 0.25,
        flatShading: true,
      }),
    )
    plumbob.name = 'selection-plumbob'
    plumbob.scale.set(0.85, 1.65, 0.85)
    plumbob.position.y = 6.2
    gizmoGroup.add(ringMesh, outerHalo, plumbob)
    contentGroup.add(gizmoGroup)

    applyBackgroundAndFog(config.biome, config.carrier, level === 'realm' ? 1 : 0)
  }

  function getEntityPose(binding: LabelBinding): { pos: THREE.Vector3; target: THREE.Vector3 } {
    const isBuildMode = document.body.classList.contains('build-mode')
    if (!isBuildMode) {
      return {
        pos: binding.pose.pos.clone(),
        target: binding.pose.target.clone(),
      }
    }
    const target = binding.pose.target.clone()
    target.y += 0.85
    const offset = binding.pose.pos.clone().sub(binding.pose.target).multiplyScalar(1.48)
    return {
      pos: target.clone().add(offset),
      target,
    }
  }

  function focusEntity(id: string | null, targetLevel: WorldLevel = level): void {
    const binding = id ? labelBindings.find((b) => b.id === id) : undefined
    const nextLevel = binding ? binding.level : targetLevel
    const crossingLevels = nextLevel !== level
    const nextPose = binding ? getEntityPose(binding) : getOverviewPose(nextLevel)

    const mid = crossingLevels
      ? {
          pos: toVec3(layout.carrier.midCameraPosition),
          target: toVec3(layout.carrier.midCameraTarget),
        }
      : undefined

    startFlight(nextPose, crossingLevels ? REALM_TRANSITION_DURATION : 1.15, mid)
    level = nextLevel
    selectedId = binding ? binding.id : null
    document.body.classList.toggle('in-realm', level === 'realm')
    callbacks.onLevelChange(level)

    const palette = resolvePalette(config.biome, config.carrier)
    if (carrierButton) {
      carrierButton.textContent = level === 'ground' ? palette.realm.ctaEnter : palette.realm.ctaExit
    }
    for (const b of labelBindings) {
      b.element.classList.toggle('selected', b.id === selectedId)
    }
  }

  function toggleRealm(): void {
    const next: WorldLevel = level === 'ground' ? 'realm' : 'ground'
    soundFx.playCarrierWhoosh(config.carrier)
    callbacks.onSelectEntity(null)
    focusEntity(null, next)
  }

  function rebuild(nextConfig: ProfileConfig, preserveSelection = false): void {
    config = nextConfig
    const prevSelectedId = preserveSelection ? selectedId : null
    const prevLevel = preserveSelection ? level : 'ground'
    selectedId = prevSelectedId
    level = prevLevel
    realmProgress = prevLevel === 'realm' ? 1 : 0
    document.body.classList.toggle('in-realm', prevLevel === 'realm')
    buildSceneContent()

    const matchingBinding = prevSelectedId
      ? labelBindings.find((b) => b.id === prevSelectedId)
      : undefined
    for (const b of labelBindings) {
      b.element.classList.toggle('selected', b.id === selectedId)
    }

    if (matchingBinding) {
      const pose = getEntityPose(matchingBinding)
      camera.position.copy(pose.pos)
      controls.target.copy(pose.target)
      controls.update()
    } else {
      const overview = getOverviewPose(prevLevel)
      camera.position.copy(overview.pos)
      controls.target.copy(overview.target)
      controls.update()
    }
    callbacks.onLevelChange(prevLevel)
  }

  // Pointer picking
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  let downPos: { x: number; y: number } | null = null

  function pickAt(clientX: number, clientY: number): string | null {
    const rect = canvas.getBoundingClientRect()
    pointer.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    )
    raycaster.setFromCamera(pointer, camera)
    const hits = raycaster.intersectObjects(pickables, true)
    let obj: THREE.Object3D | null = hits[0]?.object ?? null
    while (obj && !obj.userData.pickId) {
      obj = obj.parent
    }
    const id = obj?.userData.pickId as string | undefined
    if (!id) return null
    if (id === '__carrier__') return id
    const match = labelBindings.find((b) => b.id === id)
    return match && match.level === level ? id : null
  }

  canvas.addEventListener('pointermove', (e) => {
    const nextHover = downPos ? null : pickAt(e.clientX, e.clientY)
    if (nextHover && nextHover !== hoveredId) {
      soundFx.playHoverTick()
    }
    hoveredId = nextHover
    canvas.style.cursor = hoveredId ? 'pointer' : 'grab'
  })

  canvas.addEventListener('pointerdown', (e) => {
    controls.autoRotate = false
    downPos = { x: e.clientX, y: e.clientY }
  })

  canvas.addEventListener('pointerup', (e) => {
    if (!downPos) return
    const dist = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y)
    downPos = null
    if (dist > 6) return
    const picked = pickAt(e.clientX, e.clientY)
    if (picked === '__carrier__') {
      toggleRealm()
    } else if (picked) {
      soundFx.playSelectChime()
      callbacks.onSelectEntity(picked)
    } else if (!document.body.classList.contains('build-mode')) {
      callbacks.onSelectEntity(null)
    }
  })

  const clock = new THREE.Clock()
  const tempVec = new THREE.Vector3()
  let frozenSec: number | null = null
  let frozenTransition: number | null = null

  const urlParams = new URLSearchParams(window.location.search)
  const tParam = urlParams.get('t')
  if (tParam !== null && Number.isFinite(Number(tParam))) {
    frozenSec = Number(tParam)
  }
  const transParam = urlParams.get('transition')
  if (transParam !== null && Number.isFinite(Number(transParam))) {
    frozenTransition = Math.max(0, Math.min(1, Number(transParam)))
    realmProgress = frozenTransition
  }
  const camPreset = urlParams.get('cam')
  const startInRealm =
    urlParams.get('realm') === '1' ||
    urlParams.get('level') === 'realm' ||
    camPreset === 'realm'
  if (startInRealm) {
    level = 'realm'
    realmProgress = 1
    document.body.classList.add('in-realm')
  }

  function updateCameraFraming(dt: number): void {
    const { w, h } = getViewportSize()
    const aspect = w / Math.max(1, h)
    const targetFov = aspect < 0.95 ? Math.min(58, Math.round(35 / Math.pow(aspect, 0.65))) : 35
    const resized = lastCssW !== w || lastCssH !== h || Math.abs(camera.fov - targetFov) > 1e-3
    if (resized) {
      lastCssW = w
      lastCssH = h
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      renderer.setSize(w, h, false)
      camera.aspect = aspect
      camera.fov = targetFov
    }
    const mode = getFramingMode(w, h)
    if (lastFramingMode === null) {
      lastFramingMode = mode
    } else if (lastFramingMode !== mode) {
      lastFramingMode = mode
      if (level === 'ground' && !selectedId && !camPreset) {
        const nextPose = getOverviewPose('ground')
        flight = null
        camera.position.copy(nextPose.pos)
        controls.target.copy(nextPose.target)
        controls.update()
        camera.lookAt(controls.target)
      }
    }
    const hasSel = document.body.classList.contains('has-selection')
    const isBuildMode = document.body.classList.contains('build-mode')
    const isFullscreen = document.body.classList.contains('island-immersive-fullscreen')
    const spec = computeCameraViewOffset(w, h, hasSel, isBuildMode, isFullscreen)
    if (!spec.enabled) {
      currentOffsetRatio = 0
      if (mode === 'portrait') {
        camera.setViewOffset(w, h, 0, Math.round(-0.08 * h), w, h)
      } else {
        camera.clearViewOffset()
        camera.updateProjectionMatrix()
      }
      return
    }
    if (dt <= 0 || frozenSec !== null) {
      currentOffsetRatio = spec.ratio
    } else {
      currentOffsetRatio += (spec.ratio - currentOffsetRatio) * Math.min(1, dt * 8.5)
    }
    camera.setViewOffset(w, h, Math.round(currentOffsetRatio * w), 0, w, h)
  }

  function stepFrame(elapsed: number, dt: number): void {
    lastSimSec = elapsed
    updateCameraFraming(dt)

    // Directed carrier transition with 5 animation principles (4.4s cinematic journey)
    const targetProgress = frozenTransition !== null ? frozenTransition : level === 'realm' ? 1 : 0
    const isMoving =
      frozenTransition !== null
        ? frozenTransition > 0.05 && frozenTransition < 0.95
        : Math.abs(targetProgress - realmProgress) > 0.0005
    if (frozenTransition !== null) {
      realmProgress = frozenTransition
    } else if (isMoving) {
      const step = (dt / REALM_TRANSITION_DURATION) * (targetProgress > realmProgress ? 1 : -1)
      realmProgress = Math.max(0, Math.min(1, realmProgress + step))
    } else {
      realmProgress = targetProgress
    }
    const env = carrierLaunchEnvelope(realmProgress)
    applyBackgroundAndFog(config.biome, config.carrier, env.moveT)

    const veilPeak = Math.sin(env.moveT * Math.PI) * 0.34
    veilEl.style.opacity = veilPeak > 0.02 ? veilPeak.toFixed(2) : '0'

    if (carrierMesh) {
      const hp = layout.carrier.homePosition
      const ro = layout.carrier.realmOrigin
      const isHorizontal = config.carrier === 'camel'
      const isDownhill = config.carrier === 'snowball'
      const slopePose = sampleSlopePose(env.moveT, hp, ro, config.carrier)
      const idleBob =
        Math.sin(elapsed * 1.8) * (isHorizontal || isDownhill ? 0.012 : 0.12)
      carrierMesh.position.set(slopePose.x, slopePose.y + idleBob, slopePose.z)
      carrierMesh.scale.set(env.scaleX, env.scaleY, env.scaleZ)
      const returning = level === 'ground' && realmProgress > 0.01 && frozenTransition === null
      if (isHorizontal) {
        carrierMesh.rotation.set(
          0,
          (returning ? Math.PI : 0) + slopePose.yawY,
          (returning ? -1 : 1) * slopePose.pitchX + env.pitchOffset * 0.45,
        )
      } else if (isDownhill) {
        const skiLean = isMoving ? slopePose.pitchX : 0
        carrierMesh.rotation.set(
          skiLean + env.pitchOffset * 0.35,
          env.moveT > 0.005 && env.moveT < 0.995
            ? slopePose.yawY + (returning ? Math.PI : 0)
            : 0,
          slopePose.rollZ,
        )
      } else if (config.carrier === 'submarine') {
        const divePitch =
          env.moveT > 0.005 && env.moveT < 0.995
            ? -Math.sin(env.moveT * Math.PI) * 0.28 * (returning ? -1 : 1)
            : 0
        carrierMesh.rotation.set(env.pitchOffset * 0.4, 0, divePitch)
      } else {
        carrierMesh.rotation.set(env.pitchOffset, 0, 0)
      }
      if (updateCarrierFn) {
        const moveSpeed = isMoving && realmProgress >= 0.14 ? 1 : 0
        updateCarrierFn(elapsed, env.settleWave, moveSpeed, realmProgress)
      }
      const seabed = contentGroup.getObjectByName('seabed')
      const farWater = contentGroup.getObjectByName('far-water')
      const midWater = contentGroup.getObjectByName('mid-water')
      const shallowsWater = contentGroup.getObjectByName('shallows-water')
      const shorelineFoam = contentGroup.getObjectByName('shoreline-foam')
      const waterRipples = contentGroup.getObjectByName('water-ripples')
      const waterGlints = contentGroup.getObjectByName('water-shimmer-glints')
      const smoothTerrainGrp = contentGroup.getObjectByName('smooth-terrain-group')
      const isSubDiving = config.carrier === 'submarine' && env.moveT > 0.045
      const hideSea = (isDownhill && env.moveT > 0.12) || isSubDiving
      if (seabed) seabed.visible = !hideSea
      if (farWater) farWater.visible = !hideSea
      if (midWater) midWater.visible = !hideSea
      if (shallowsWater) shallowsWater.visible = !hideSea
      if (shorelineFoam) shorelineFoam.visible = !hideSea
      if (waterRipples) waterRipples.visible = !hideSea
      if (waterGlints) waterGlints.visible = !hideSea && config.biome !== 'desert' && config.biome !== 'grassland'
      if (smoothTerrainGrp && config.carrier === 'submarine') {
        smoothTerrainGrp.visible = env.moveT < 0.16
      }
    }

    // 3-Act Cinematic Transition Camera Choreography (Round 9 Gap c)
    const isCrossingFlight = Boolean(flight && flight.midPos && flight.midTarget)
    if (frozenTransition !== null || isCrossingFlight || isMoving) {
      if (flight) {
        flight.t = Math.min(1, flight.t + dt / Math.max(0.01, flight.duration))
        if (flight.t >= 1) {
          flight = null
          controls.enabled = true
        }
      }
      const gPose = getOverviewPose('ground')
      const rPose = getOverviewPose('realm')
      const cinePose = computeCameraPose(
        realmProgress,
        config.carrier,
        gPose.pos,
        gPose.target,
        layout.carrier.midCameraPosition,
        layout.carrier.midCameraTarget,
        rPose.pos,
        rPose.target,
        carrierMesh ? carrierMesh.position : layout.carrier.homePosition,
        35,
      )
      camera.position.set(cinePose.pos.x, cinePose.pos.y, cinePose.pos.z)
      controls.target.set(cinePose.target.x, cinePose.target.y, cinePose.target.z)
      camera.lookAt(controls.target)
      if (Math.abs(cinePose.rollZ) > 1e-4) {
        camera.rotation.z += cinePose.rollZ
      }
      if (Math.abs(camera.fov - cinePose.fov) > 1e-3) {
        camera.fov = cinePose.fov
        camera.updateProjectionMatrix()
      }
    } else if (flight) {
      flight.t = Math.min(1, flight.t + dt / Math.max(0.01, flight.duration))
      const k = easeInOutCubic(flight.t)
      camera.position.lerpVectors(flight.fromPos, flight.toPos, k)
      controls.target.lerpVectors(flight.fromTarget, flight.toTarget, k)
      camera.lookAt(controls.target)
      if (Math.abs(camera.fov - 35) > 1e-3) {
        camera.fov = 35
        camera.updateProjectionMatrix()
      }
      if (flight.t >= 1) {
        flight = null
        controls.enabled = true
      }
    } else {
      if (Math.abs(camera.fov - 35) > 1e-3) {
        camera.fov = 35
        camera.updateProjectionMatrix()
      }
      controls.update()
    }

    for (const fn of ticks) {
      fn(elapsed, dt)
    }
    updateFoliageWindSway(contentGroup, elapsed)

    camera.updateMatrixWorld()
    const width = canvas.clientWidth || window.innerWidth
    const height = canvas.clientHeight || window.innerHeight

    if (carrierMesh && carrierButton) {
      tempVec.copy(carrierMesh.position).add(new THREE.Vector3(0, 3.8, 0)).project(camera)
      carrierButton.classList.toggle('hover', hoveredId === '__carrier__')
      if (tempVec.z < 1 && !selectedId) {
        carrierButton.style.display = ''
        const sx = (tempVec.x * 0.5 + 0.5) * width
        const sy = (-tempVec.y * 0.5 + 0.5) * height
        carrierButton.style.transform = `translate(-50%, -100%) translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)`
      } else {
        carrierButton.style.display = 'none'
      }
    }

    const sinceRebuild = Math.max(0, elapsed - rebuildStartSec)
    const isBuild = document.body.classList.contains('build-mode') && width > 900
    const drawerOpen = (document.body.classList.contains('has-selection') || isBuild) && width > 900
    for (const b of labelBindings) {
      const isHover = hoveredId === b.id || selectedId === b.id
      b.element.classList.toggle('hover', hoveredId === b.id)
      const pop =
        b.level === 'ground'
          ? staggeredPopScale(sinceRebuild, b.index, 0.065)
          : realmProjectRevealScale(realmProgress, b.index)
      b.object.scale.setScalar(pop * (isHover ? 1.07 : 1))
      if (typeof b.object.userData.baseY !== 'number') {
        b.object.userData.baseY = b.object.position.y
      }
      const targetY =
        (b.object.userData.baseY as number) +
        (isHover ? 0.22 + Math.sin(elapsed * 5.2) * 0.04 : 0)
      b.object.position.y += (targetY - b.object.position.y) * Math.min(1, dt * 14 + 0.18)

      tempVec.copy(b.anchor).project(camera)
      const sx = (tempVec.x * 0.5 + 0.5) * width
      const sy = (-tempVec.y * 0.5 + 0.5) * height
      const clippedByDrawer =
        drawerOpen &&
        (sx > width - 480 || (isBuild && sx < 395)) &&
        selectedId !== b.id
      if (tempVec.z < 1 && b.level === level && !clippedByDrawer) {
        b.element.style.display = ''
        b.element.style.transform = `translate(-50%, -100%) translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)`
      } else {
        b.element.style.display = 'none'
      }
    }

    const selGizmo = contentGroup.getObjectByName('build-selection-gizmo')
    if (selGizmo) {
      const selBinding = selectedId ? labelBindings.find((b) => b.id === selectedId) : undefined
      if (selBinding && selBinding.level === level) {
        selGizmo.visible = true
        const baseObjY =
          typeof selBinding.object.userData.baseY === 'number'
            ? (selBinding.object.userData.baseY as number)
            : selBinding.object.position.y
        selGizmo.position.set(selBinding.object.position.x, baseObjY, selBinding.object.position.z)
        const ring = selGizmo.getObjectByName('selection-ring')
        const halo = selGizmo.getObjectByName('selection-outer-halo')
        const plumbob = selGizmo.getObjectByName('selection-plumbob')
        const ringPulse = 1 + Math.sin(elapsed * 4.2) * 0.05
        if (ring) ring.scale.set(ringPulse, ringPulse, 1)
        if (halo) halo.scale.set(2 - ringPulse, 2 - ringPulse, 1)
        if (plumbob) {
          plumbob.position.y =
            Math.max(4.8, selBinding.anchor.y - baseObjY + 1.15) + Math.sin(elapsed * 3.6) * 0.22
          plumbob.rotation.y = elapsed * 1.85
        }
      } else {
        selGizmo.visible = false
      }
    }

    renderer.render(scene, camera)
  }

  function renderAt(timeSec: number): void {
    frozenSec = timeSec
    stepFrame(timeSec, 0.016)
  }

  function resetOverview(): void {
    if (camPreset) return
    const pose = getOverviewPose(level)
    flight = null
    camera.position.copy(pose.pos)
    controls.target.copy(pose.target)
    controls.update()
    camera.lookAt(controls.target)
    updateCameraFraming(0)
  }

  window.renderAt = renderAt

  buildSceneContent()
  const auditPose = computeAuditCameraPose(
    camPreset,
    layout.carrier.realmCameraPosition,
    layout.carrier.realmCameraTarget,
  )
  const initialPose = auditPose
    ? { pos: toVec3(auditPose.pos), target: toVec3(auditPose.target) }
    : getOverviewPose(level)
  if (auditPose) {
    controls.autoRotate = false
  }
  camera.position.copy(initialPose.pos)
  controls.target.copy(initialPose.target)
  controls.update()

  renderer.setAnimationLoop(() => {
    if (frozenSec !== null) {
      stepFrame(frozenSec, 0)
      return
    }
    const dt = Math.min(clock.getDelta(), 0.1)
    stepFrame(clock.elapsedTime, dt)
  })

  return {
    focusEntity,
    toggleRealm,
    rebuild,
    getLevel: () => level,
    getLayout: () => layout,
    renderAt,
    resetOverview,
  }
}
