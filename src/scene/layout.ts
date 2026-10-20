import {
  resolveWorldShape,
  type BiomeType,
  type CarrierType,
  type PlaceEntry,
  type ProjectEntry,
  type WorldShapeType,
} from '../schema/profile'

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface PlacedBuilding {
  place: PlaceEntry
  position: Vec3
  rotationY: number
  cameraTarget: Vec3
  cameraPosition: Vec3
  labelAnchor: Vec3
}

export interface PlacedProject {
  project: ProjectEntry
  index: number
  position: Vec3
  cameraTarget: Vec3
  cameraPosition: Vec3
  labelAnchor: Vec3
}

export interface CarrierPlacement {
  carrier: CarrierType
  homePosition: Vec3
  realmOrigin: Vec3
  realmCameraPosition: Vec3
  realmCameraTarget: Vec3
  midCameraPosition: Vec3
  midCameraTarget: Vec3
}

export interface WorldLayout {
  buildings: PlacedBuilding[]
  paths: Vec3[][]
  foliage: { x: number; y: number; z: number; scale: number; variant: number }[]
  carrier: CarrierPlacement
  projects: PlacedProject[]
  worldShape: WorldShapeType
}

const EDUCATION_SLOTS: [number, number, number][] = [
  [-12.6, -0.6, 0.28],
  [-7.2, 6.4, 0.18],
]

const LANDMARK_SLOTS: [number, number, number][] = [
  [-9.2, -8.2, 0.2],
  [-13.0, 4.8, 0.35],
]

const CAREER_SLOTS: [number, number, number][] = [
  [6.4, 7.6, -0.16],
  [12.4, 3.2, -0.26],
  [4.8, -2.6, -0.1],
  [10.8, -2.8, -0.22],
  [8.6, -10.2, -0.16],
  [1.8, -10.2, 0.08],
]

// B-612 Planetoid Dome slots: Hometown Landmark at central summit (0, -2.4), flanked by terraced hillside pavilions
const B612_LANDMARK_SLOTS: [number, number, number][] = [
  [0.0, -2.4, 0.0],
  [-11.2, -5.8, 0.32],
]

const B612_EDUCATION_SLOTS: [number, number, number][] = [
  [-8.8, 1.4, 0.28],
  [-7.2, 7.6, 0.22],
]

const B612_CAREER_SLOTS: [number, number, number][] = [
  [8.4, 1.6, -0.24],
  [5.4, 7.8, -0.16],
  [9.6, -5.2, -0.28],
  [-2.2, 9.2, 0.08],
  [3.6, -9.2, -0.12],
  [-7.8, -8.2, 0.24],
]

// Crescent-Bay C-Shaped Atoll slots: arranged along the sweeping C-shaped peninsula ridge around the inner harbor bay (2.4, 3.2)
const CRESCENT_LANDMARK_SLOTS: [number, number, number][] = [
  [-8.2, -8.8, 0.28],
  [10.8, 8.6, -0.45],
]

const CRESCENT_EDUCATION_SLOTS: [number, number, number][] = [
  [-11.8, -1.6, 0.36],
  [-9.6, 6.8, 0.42],
]

const CRESCENT_CAREER_SLOTS: [number, number, number][] = [
  [2.2, -10.2, 0.05],
  [8.8, -7.8, -0.22],
  [12.4, -1.4, -0.35],
  [-4.4, -10.8, 0.16],
  [6.4, -3.2, -0.18],
  [-6.8, 11.2, 0.25],
]

// Floating-Terraces Monument-Valley Stepped Ark slots: aligned orthogonal to the 3 stepped architectural platforms
const TERRACE_LANDMARK_SLOTS: [number, number, number][] = [
  [-7.8, -9.2, 0.0],
  [-12.8, 4.6, 0.0],
]

const TERRACE_EDUCATION_SLOTS: [number, number, number][] = [
  [-11.4, -1.6, 0.0],
  [-9.2, 7.4, 0.0],
]

const TERRACE_CAREER_SLOTS: [number, number, number][] = [
  [5.8, 7.8, 0.0],
  [12.2, 3.2, 0.0],
  [4.8, -3.0, 0.0],
  [10.8, -5.0, 0.0],
  [2.2, -9.6, 0.0],
  [8.6, -11.0, 0.0],
]

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

export function getCoastRadius(
  angle: number,
  biome: BiomeType = 'ocean',
  worldShape?: WorldShapeType,
): number {
  const shape = resolveWorldShape(biome, worldShape)

  if (shape === 'canyon-mesa') {
    // Angular Box / Stepped Sandstone Tableland Silhouette (Chebyshev square-norm + canyon mouth notches: 13.6 .. 22.1)
    const rotA = angle - 0.16
    const boxNorm = 1 / Math.max(0.66, Math.max(Math.abs(Math.cos(rotA)), Math.abs(Math.sin(rotA))))
    const canyonNotch = Math.pow(Math.abs(Math.sin(angle)), 6) * 4.2
    const stepLedge = Math.cos(4 * rotA) * 1.15
    return Math.min(22.2, Math.max(13.6, 15.6 * boxNorm - canyonNotch + stepLedge))
  }
  if (shape === 'alpine-valley') {
    // Horseshoe / U-Shaped Glacial Amphitheater: broad northern peaks & deeply indented SE fjord bay (12.6 .. 22.1)
    const seBayCut = Math.pow(Math.max(0, Math.sin(angle - 0.55)), 2) * 6.2
    const northMassif = Math.max(0, -Math.sin(angle)) * 2.8
    return Math.min(
      22.2,
      Math.max(12.6, 18.4 + northMassif - seBayCut + Math.cos(3 * angle - 0.4) * 1.85),
    )
  }
  if (shape === 'b612-highland') {
    // Compact 3-Lobed Little Prince Asteroid Star Silhouette (deep waist indentations: 12.8 .. 20.6)
    return (
      16.4 +
      Math.cos(3 * angle - 0.35) * 3.45 +
      Math.sin(2 * angle + 0.6) * 0.85 +
      Math.cos(6 * angle) * 0.42
    )
  }
  if (shape === 'crescent-bay') {
    // Dramatic C-Shaped Crescent Moon Peninsula with deep southern-eastern harbor mouth indentation (11.4 .. 22.1)
    const bayMouthCut = Math.pow(Math.max(0, Math.sin(angle - 0.45)), 2) * 8.2
    const westSpine = Math.max(0, -Math.cos(angle - 0.3)) * 2.8
    return Math.min(
      22.2,
      Math.max(11.4, 19.2 + westSpine - bayMouthCut + Math.cos(2 * angle + 0.4) * 1.6),
    )
  }
  if (shape === 'floating-terraces') {
    // Monument-Valley Orthogonal Stepped Square Ark Silhouette (zero circular disc: 13.2 .. 22.2)
    const cx = Math.abs(Math.cos(angle))
    const sz = Math.abs(Math.sin(angle))
    const rectR = Math.min(18.0 / Math.max(0.56, cx), 17.2 / Math.max(0.56, sz))
    const cornerStep = Math.cos(4 * angle) > 0.2 ? 1.45 : -1.65
    const southWaterGate = Math.pow(Math.max(0, Math.sin(angle)), 8) * 3.8
    return Math.min(22.2, Math.max(13.2, rectR * 0.86 + cornerStep - southWaterGate))
  }
  // archipelago: Broad West & East Coral Island Lobes with deep North/South river-mouth bays (13.4 .. 22.0)
  const southHarborCut = Math.pow(Math.max(0, Math.sin(angle - 0.07)), 6) * 6.2
  const northMouthCut = Math.pow(Math.max(0, -Math.sin(angle + 0.08)), 10) * 4.6
  const sideStraitRipple = Math.cos(4 * angle) * 0.85 + Math.sin(3 * angle) * 0.65
  return Math.min(22.0, Math.max(13.4, 19.8 + sideStraitRipple - southHarborCut - northMouthCut))
}

export function getRiverCenterX(z: number): number {
  return Math.sin(z * 0.13) * 2.6 - 0.8
}

export function getTerrainHeight(
  x: number,
  z: number,
  biome: BiomeType,
  worldShape?: WorldShapeType,
): number {
  const shape = resolveWorldShape(biome, worldShape)
  const isExplicitShape = worldShape !== undefined
  const r = Math.hypot(x, z)
  const angle = Math.atan2(z, x)
  const coastR = getCoastRadius(angle, biome, shape)

  // 1. B-612 HIGHLAND: 3-Lobed Star Planetoid Dome with Central Summit (NO central river split!)
  if (worldShape === 'b612-highland') {
    const islandMask = smoothstep(1.02, 0.8, r / coastR)
    if (islandMask <= 0) return -1.6
    const crownDist = Math.hypot(x, (z + 2.4) * 0.9)
    const planetoidDome =
      smoothstep(16.0, 0.0, crownDist) * 1.65 + smoothstep(7.5, 0.0, crownDist) * 0.68
    const step1 = smoothstep(16.5, 13.2, r) * 0.38
    const step2 = smoothstep(12.2, 8.6, r) * 0.34
    const rollingMeadow = Math.sin(x * 0.15) * Math.cos(z * 0.15) * 0.14
    const rearRise = smoothstep(4.5, -11.0, z) * 0.55
    return -1.6 + islandMask * (2.25 + planetoidDome + step1 + step2 + rollingMeadow + rearRise)
  }

  // 2. CRESCENT-BAY: Hollow C-Shaped Crescent Atoll wrapping around a Giant Open Southeast Lagoon (NO N-S river!)
  if (isExplicitShape && shape === 'crescent-bay') {
    const outerMask = smoothstep(1.02, 0.82, r / coastR)
    if (outerMask <= 0) return -1.6
    // Giant open lagoon centered at (2.2, 3.8) opening wide through the Southeast sea mouth
    const lagoonDist = Math.hypot((x - 2.2) * 0.86, (z - 3.8) * 0.82)
    const lagoonCut = smoothstep(6.8, 4.2, lagoonDist)
    const mouthAxisDist = Math.abs((x - 2.2) * 0.65 - (z - 3.8) * 0.76)
    const mouthCut =
      x > -1.5 && z > 1.8 ? smoothstep(5.4, 2.4, mouthAxisDist) * smoothstep(1.8, 4.5, z) : 0
    const waterCut = Math.max(lagoonCut, mouthCut)
    const landMask = outerMask * (1 - waterCut)
    if (landMask <= 0.02) return -1.55
    const spineRidge =
      smoothstep(4.5, 9.5, lagoonDist) * smoothstep(19.0, 9.5, r) * 1.15 +
      smoothstep(4.0, -10.5, z) * 0.72 +
      0.18 * Math.sin(x * 0.18 - z * 0.16)
    return -1.55 + landMask * (2.28 + spineRidge)
  }

  // 3. FLOATING-TERRACES: Pure Orthogonal Stepped Monument-Valley Sky Ark (NO circular disc, NO meandering river!)
  if (isExplicitShape && shape === 'floating-terraces') {
    const absX = Math.abs(x)
    const absZ = Math.abs(z)
    // Crisp rectangular outer bounds: |x| <= 15.6, |z| <= 14.4
    const rectMaskX = smoothstep(16.2, 14.8, absX)
    const rectMaskZ = smoothstep(15.0, 13.6, absZ)
    // Stepped L/T-shaped architectural corner cutouts in SE & SW quadrants + South Water Gate
    const cornerCut =
      z > 5.8 && absX > 10.6 ? smoothstep(5.8, 7.2, z) * smoothstep(10.6, 12.0, absX) : 0
    const southGateCut =
      z > 7.5 && absX < 1.8 ? smoothstep(7.5, 9.2, z) * smoothstep(1.8, 0.7, absX) : 0
    const arkMask = rectMaskX * rectMaskZ * (1 - Math.max(cornerCut, southGateCut))
    if (arkMask <= 0.02) return -1.6

    // 3 Quantized Flat Architectural Platforms (South Plaza -> Middle Terrace -> North Upper Citadel)
    const tier2Step = smoothstep(3.2, 1.8, z) * 0.88
    const tier3Step = smoothstep(-3.8, -5.2, z) * 0.96
    const upperCitadelPad = smoothstep(11.5, 9.5, absX) * smoothstep(-3.5, -5.5, z) * 0.34
    // Narrow straight central aqueduct channel feeding the SE waterfall
    const aqueductCut =
      z > -2.5 && absX < 1.05 ? smoothstep(1.05, 0.35, absX) * smoothstep(-2.5, 0.5, z) * 0.55 : 0
    return -1.6 + arkMask * (2.32 + tier2Step + tier3Step + upperCitadelPad - aqueductCut)
  }

  // 4. ARCHIPELAGO: Multi-Island Coral Archipelago split by 3 Wide Open-Water Sea Straits
  if (isExplicitShape && shape === 'archipelago') {
    const outerMask = smoothstep(1.02, 0.85, r / coastR)
    if (outerMask <= 0) return -1.6
    const riverDist = Math.abs(x - getRiverCenterX(z))
    const mainStrait = smoothstep(2.05, 0.85, riverDist)
    // West Coral Strait slicing between NW Island and SW Island around z = 2.65
    const westStrait =
      x < -0.5 ? smoothstep(1.15, 0.48, Math.abs(z - 2.65)) : 0
    // East Lagoon Strait slicing between NE Island and SE Island around z = -6.55
    const eastStrait =
      x > 0.5 ? smoothstep(1.05, 0.45, Math.abs(z + 6.55)) : 0
    const straitCut = Math.max(mainStrait, westStrait, eastStrait)
    const landMask = outerMask * (1 - straitCut)
    if (landMask <= 0.02) return -1.55

    const nwHill = smoothstep(8.2, 2.2, Math.hypot(x + 9.2, z + 5.2)) * 1.15
    const swKey = smoothstep(6.8, 1.8, Math.hypot(x + 10.6, z - 6.8)) * 0.72
    const nePlateau = smoothstep(8.5, 2.5, Math.hypot(x - 6.8, z + 9.6)) * 1.25
    const seHarborHill = smoothstep(8.8, 2.4, Math.hypot(x - 8.2, z - 2.2)) * 0.88
    return -1.55 + landMask * (2.22 + nwHill + swKey + nePlateau + seHarborHill)
  }

  // 5. CANYON-MESA: Angular Stepped Red-Sandstone Tablelands split by a Deep Dry Canyon Gorge
  if (isExplicitShape && shape === 'canyon-mesa') {
    const rotX = x * 0.98 - z * 0.16
    const rotZ = x * 0.16 + z * 0.98
    const boxMask =
      smoothstep(16.8, 14.6, Math.abs(rotX)) * smoothstep(15.8, 13.6, Math.abs(rotZ))
    // Angular corner notches so the tableland has a stepped polygonal rim
    const swNotch =
      x < -9.8 && z > 8.2 ? smoothstep(-9.8, -12.0, x) * smoothstep(8.2, 10.4, z) : 0
    const neNotch =
      x > 10.4 && z < -8.6 ? smoothstep(10.4, 12.6, x) * smoothstep(-8.6, -10.8, z) : 0
    const mesaFootprint = boxMask * (1 - Math.max(swNotch, neNotch))
    if (mesaFootprint <= 0.02) return -1.6

    const gorgeDist = Math.abs(x - getRiverCenterX(z))
    const gorgeCut = smoothstep(2.15, 0.78, gorgeDist)
    const bankRise = smoothstep(2.0, 4.8, gorgeDist)
    // Stepped flat-topped sandstone tiers (South lower bench y ~ 0.9 -> Middle mesa y ~ 1.65 -> North buttes y ~ 2.45)
    const stepMid = smoothstep(5.5, 2.5, z) * bankRise * 0.74
    const stepNorth = smoothstep(-1.5, -5.5, z) * bankRise * 0.88
    const nwButte = smoothstep(6.8, 2.8, Math.hypot(x + 8.2, z + 8.2)) * 0.65
    const neButte = smoothstep(6.4, 2.6, Math.hypot(x - 8.8, z + 6.4)) * 0.58
    return (
      -1.6 +
      mesaFootprint *
        ((2.32 + stepMid + stepNorth + nwButte + neButte) * (1 - gorgeCut * 0.92) - gorgeCut * 0.45)
    )
  }

  // 6. ALPINE-VALLEY: Horseshoe Snow Amphitheater wrapping around a Central Tarn Lake & SE Fjord Inlet
  if (isExplicitShape && shape === 'alpine-valley') {
    const outerMask = smoothstep(1.02, 0.82, r / coastR)
    if (outerMask <= 0) return -1.6
    // Central Glacial Mirror Tarn Basin at (-0.4, 1.0) + Southeast Fjord Inlet (x > 0, z > 3.5)
    const tarnDist = Math.hypot((x + 0.4) * 0.95, (z - 1.0) * 0.82)
    const tarnBasin = smoothstep(4.6, 2.2, tarnDist)
    const fjordInlet =
      z > 2.2 && x > -2.2
        ? smoothstep(3.8, 1.4, Math.abs(x - (z - 1.0) * 0.42)) * smoothstep(2.2, 6.5, z)
        : 0
    const waterBasinCut = Math.max(tarnBasin * 0.82, fjordInlet)
    // Horseshoe mountain wall rising steeply around the West, North, and East of the central tarn
    const horseshoeWall = smoothstep(4.2, 9.8, tarnDist) * smoothstep(19.5, 10.2, r) * 0.95
    const westPeak = smoothstep(7.2, 1.6, Math.hypot(x + 5.8, z + 12.6)) * 2.35
    const eastPeak = smoothstep(6.8, 1.6, Math.hypot(x - 5.6, z + 12.8)) * 2.15
    const northCrown = smoothstep(3.5, -11.5, z) * 0.92
    const relief = (horseshoeWall + westPeak + eastPeak + northCrown) * (1 - waterBasinCut * 0.95)
    return -1.55 + outerMask * (2.25 + relief - waterBasinCut * 1.45)
  }

  // Default / Legacy fallback when worldShape is omitted in unit tests
  const islandMask = smoothstep(1.04, 0.82, r / coastR)
  if (islandMask <= 0) return -1.6
  const riverDist = Math.abs(x - getRiverCenterX(z))
  const riverMask = smoothstep(1.98, 0.68, riverDist)
  const plateauMask = smoothstep(18.2, 11.5, r)
  const rearRise = smoothstep(4.5, -11.0, z)
  const bankRise = smoothstep(2.0, 5.8, riverDist)
  const highland = plateauMask * rearRise * bankRise * 1.12
  const snowPeakBoost =
    biome === 'snow'
      ? smoothstep(6.2, 1.4, Math.hypot(x + 5.6, z + 13.2)) * 2.35 +
        smoothstep(5.8, 1.4, Math.hypot(x - 5.4, z + 13.4)) * 2.15
      : 0
  const coastalUndulation =
    0.24 * Math.sin(0.19 * x + 0.5) * Math.cos(0.17 * z - 0.3) + 0.12 * Math.cos(0.31 * (x - z))
  return -1.6 + islandMask * (2.22 + highland + snowPeakBoost + coastalUndulation - riverMask * 1.62)
}

export function computeCarrierPlacement(
  carrier: CarrierType,
  biome: BiomeType,
  worldShape?: WorldShapeType,
): CarrierPlacement {
  const shape = resolveWorldShape(biome, worldShape)
  const pickDryPad = (candidates: [number, number][]): { x: number; y: number; z: number } => {
    for (const [cx, cz] of candidates) {
      const cy = getTerrainHeight(cx, cz, biome, shape)
      if (cy >= 0.34) {
        return { x: cx, y: cy, z: cz }
      }
    }
    const [fx, fz] = candidates[0]
    return { x: fx, y: Math.max(0.34, getTerrainHeight(fx, fz, biome, shape)), z: fz }
  }
  if (carrier === 'submarine') {
    const hx = -1.2
    const hz = 17.6
    return {
      carrier,
      homePosition: { x: hx, y: 0.08, z: hz },
      realmOrigin: { x: 0, y: -45, z: 0 },
      realmCameraTarget: { x: 0, y: -44, z: -1 },
      realmCameraPosition: { x: 0, y: -33, z: 24 },
      midCameraPosition: { x: 0, y: -16, z: 30 },
      midCameraTarget: { x: 0, y: -18, z: 10 },
    }
  }
  if (carrier === 'camel') {
    const home = pickDryPad([
      [8.6, 12.2],
      [11.6, 4.8],
      [8.8, 9.2],
      [7.4, 10.6],
    ])
    return {
      carrier,
      homePosition: home,
      realmOrigin: { x: 85, y: 0.4, z: 0 },
      realmCameraTarget: { x: 85, y: 2.2, z: -1 },
      realmCameraPosition: { x: 85, y: 15, z: 26 },
      midCameraPosition: { x: 44, y: 12, z: 22 },
      midCameraTarget: { x: 48, y: 2, z: 0 },
    }
  }
  if (carrier === 'snowball') {
    const home = pickDryPad([
      [8.8, 12.2],
      [9.2, 13.8],
      [11.6, 4.8],
      [7.8, 10.2],
    ])
    return {
      carrier,
      homePosition: home,
      realmOrigin: { x: 28, y: -16, z: 26 },
      realmCameraTarget: { x: 28, y: -14.2, z: 25 },
      realmCameraPosition: { x: 28, y: -2.2, z: 51 },
      midCameraPosition: { x: 18, y: 8.5, z: 46 },
      midCameraTarget: { x: 18, y: -5.5, z: 20 },
    }
  }
  if (carrier === 'rocket') {
    const home = pickDryPad([
      [-4.6, 10.6],
      [-7.8, 9.8],
      [-6.8, 10.4],
    ])
    return {
      carrier,
      homePosition: home,
      realmOrigin: { x: 0, y: 135, z: 0 },
      realmCameraTarget: { x: 0, y: 136.5, z: -1 },
      realmCameraPosition: { x: 0, y: 148, z: 26 },
      midCameraPosition: { x: -2, y: 68, z: 30 },
      midCameraTarget: { x: 0, y: 68, z: 0 },
    }
  }
  const home = pickDryPad([
    [-4.8, 11.4],
    [-7.8, 9.8],
    [-6.8, 10.4],
  ])
  return {
    carrier: 'balloon',
    homePosition: home,
    realmOrigin: { x: 0, y: 95, z: 0 },
    realmCameraTarget: { x: 0, y: 96.5, z: -1 },
    realmCameraPosition: { x: 0, y: 108, z: 25 },
    midCameraPosition: { x: 2, y: 48, z: 28 },
    midCameraTarget: { x: 0, y: 48, z: 0 },
  }
}

function seededRandom(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

export function computeWorldLayout(
  places: PlaceEntry[],
  projects: ProjectEntry[],
  biome: BiomeType,
  carrier: CarrierType,
  worldShape?: WorldShapeType,
): WorldLayout {
  const resolvedShape = resolveWorldShape(biome, worldShape)
  const isB612Dome = worldShape === 'b612-highland'
  const isCrescentBay = worldShape === 'crescent-bay'
  const isFloatingTerraces = worldShape === 'floating-terraces'
  const heightShape = isB612Dome ? 'b612-highland' : worldShape
  let eduIdx = 0
  let landIdx = 0
  let careerIdx = 0

  const eduSlots = isB612Dome
    ? B612_EDUCATION_SLOTS
    : isCrescentBay
      ? CRESCENT_EDUCATION_SLOTS
      : isFloatingTerraces
        ? TERRACE_EDUCATION_SLOTS
        : EDUCATION_SLOTS
  const landSlots = isB612Dome
    ? B612_LANDMARK_SLOTS
    : isCrescentBay
      ? CRESCENT_LANDMARK_SLOTS
      : isFloatingTerraces
        ? TERRACE_LANDMARK_SLOTS
        : LANDMARK_SLOTS
  const careerSlots = isB612Dome
    ? B612_CAREER_SLOTS
    : isCrescentBay
      ? CRESCENT_CAREER_SLOTS
      : isFloatingTerraces
        ? TERRACE_CAREER_SLOTS
        : CAREER_SLOTS

  const buildings: PlacedBuilding[] = places.map((place) => {
    let slot: [number, number, number]
    if (place.kind === 'education') {
      slot = eduSlots[eduIdx++ % eduSlots.length]
    } else if (place.kind === 'landmark') {
      slot = landSlots[landIdx++ % landSlots.length]
    } else {
      slot = careerSlots[careerIdx++ % careerSlots.length]
    }
    const [baseX, baseZ, baseRotY] = slot
    const ox = Math.max(-2.0, Math.min(2.0, place.offsetX ?? 0))
    const oz = Math.max(-2.0, Math.min(2.0, place.offsetZ ?? 0))
    const x = baseX + ox
    const z = baseZ + oz
    const rotY = baseRotY + (place.rotationOffset ?? 0)
    const y = Math.max(0.28, getTerrainHeight(x, z, biome, heightShape))
    const bScale = Math.max(0.8, Math.min(1.25, place.buildingScale ?? 1.0))
    const floors = place.floors ?? (place.style === 'pagoda' ? 5 : 4)
    const styleHeight =
      place.style === 'pagoda' ||
      place.style === 'metro-landmark' ||
      place.style === 'euro-castle' ||
      place.style === 'mountain-stilts' ||
      place.style === 'taikang-tower'
        ? 7.2
        : place.style === 'university' ||
            place.style === 'uni-gothic' ||
            place.style === 'uni-observatory' ||
            place.style === 'uni-gate-palace' ||
            place.style === 'ruc-mingde' ||
            place.style === 'unimelb-clocktower' ||
            place.style === 'jd-hq' ||
            place.style === 'xiaomi-park'
          ? 6.6
          : place.style === 'tower' ||
              place.style === 'law-palace' ||
              place.style === 'medical-center' ||
              place.style === 'bytedance-hq' ||
              place.style === 'cscec-tower'
            ? 4.4 + floors * 0.48
            : place.style === 'biotech' || place.style === 'uni-conservatory'
              ? 5.8
              : place.style === 'tech' ||
                  place.style === 'uni-modern' ||
                  place.style === 'uni-art-bauhaus' ||
                  place.style === 'coastal-town' ||
                  place.style === 'tulou-roundhouse'
                ? 5.0
                : place.style === 'factory' ||
                    place.style === 'game-arcade' ||
                    place.style === 'cloud-logistics' ||
                    place.style === 'film-stage'
                  ? 4.7
                  : 4.2
    const topY = y + styleHeight * bScale
    const isTallTower =
      place.style === 'taikang-tower' ||
      place.style === 'bytedance-hq' ||
      place.style === 'cscec-tower'
    const targetH = (isTallTower ? 3.35 : 2.95) * bScale
    const camH = (isTallTower ? 6.05 : 5.65) * bScale
    const baseDist = isTallTower ? 10.1 : 9.1
    const camTarget = { x, y: y + targetH, z }
    const camPos = {
      x: x + Math.sin(rotY) * baseDist,
      y: y + camH,
      z: z + Math.cos(rotY) * baseDist,
    }
    return {
      place,
      position: { x, y, z },
      rotationY: rotY,
      cameraTarget: camTarget,
      cameraPosition: camPos,
      labelAnchor: { x, y: topY, z },
    }
  })

  // Round 10 Gap (e): Unobstructed Courtyard Close-Up Camera Solver
  // Sweep candidate yaw angles around each building's front facade so no foreground building
  // intrudes into the close-up camera frustum (e.g., JD HQ never blocks Taikang's close-up).
  const candidateYaws = [0, -0.18, 0.18, -0.34, 0.34, -0.5, 0.5]
  for (let i = 0; i < buildings.length; i++) {
    const b = buildings[i]
    const bScale = Math.max(0.8, Math.min(1.25, b.place.buildingScale ?? 1.0))
    const isTallTower =
      b.place.style === 'taikang-tower' ||
      b.place.style === 'bytedance-hq' ||
      b.place.style === 'cscec-tower'
    const candidateDists = isTallTower ? [10.2, 9.6] : [9.1, 8.6]
    const camH = (isTallTower ? 6.05 : 5.65) * bScale
    const baseYaw = b.rotationY * 0.65
    let bestScore = -Infinity
    let bestCam = b.cameraPosition
    for (const dist of candidateDists) {
      for (const dyaw of candidateYaws) {
        const yaw = baseYaw + dyaw
        const cx = b.position.x + Math.sin(yaw) * dist
        const cy = b.position.y + camH
        const cz = b.position.z + Math.cos(yaw) * dist
        const lxRaw = b.cameraTarget.x - cx
        const lzRaw = b.cameraTarget.z - cz
        const lLen = Math.hypot(lxRaw, lzRaw) || 1
        const lx = lxRaw / lLen
        const lz = lzRaw / lLen
        let minClearAngle = Math.PI
        for (let j = 0; j < buildings.length; j++) {
          if (i === j) continue
          const other = buildings[j]
          const vx = other.position.x - cx
          const vz = other.position.z - cz
          const dOther = Math.hypot(vx, vz)
          const forwardProj = vx * lx + vz * lz
          if (forwardProj > -1.2 && forwardProj < dist + 2.6) {
            const perpDist = Math.abs(vx * -lz + vz * lx)
            const angleToCenter = Math.atan2(perpDist, Math.max(0.5, forwardProj))
            const angularRadius = Math.atan2(2.35, Math.max(2.5, dOther))
            const clearAngle = angleToCenter - angularRadius
            if (clearAngle < minClearAngle) {
              minClearAngle = clearAngle
            }
          }
        }
        // Cap effective clearance bonus once well outside horizontal FOV (> 0.62 rad ≈ 35.5°),
        // then prefer staying close to natural facade yaw and comfortable primary distance.
        const effectiveClear = Math.min(0.66, minClearAngle)
        const score =
          effectiveClear - Math.abs(dyaw) * 0.08 + (dist === candidateDists[0] ? 0.015 : 0)
        if (score > bestScore) {
          bestScore = score
          bestCam = { x: cx, y: cy, z: cz }
        }
      }
    }
    b.cameraPosition = bestCam
  }

  const carrierPlacement = computeCarrierPlacement(carrier, biome, heightShape)

  // Bridge-aware stone paths (or B-612 summit radial/spiral footpaths when isB612Dome is active)
  const bridgeZ = -4.5
  const bridgeCenterX = getRiverCenterX(bridgeZ)
  const eastBridgeHead = { x: bridgeCenterX + 3.4, z: bridgeZ }
  const westBridgeHead = { x: bridgeCenterX - 3.4, z: bridgeZ }

  const paths: Vec3[][] = buildings.map((b) => {
    if (isB612Dome) {
      const start = { x: 0.0, z: -0.4 }
      const end = { x: b.position.x, z: b.position.z + 1.6 }
      const steps = 8
      const pts: Vec3[] = []
      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const arc = Math.sin(t * Math.PI) * (end.x < 0 ? -0.65 : 0.65)
        const px = start.x + (end.x - start.x) * t + arc * 0.35
        const pz = start.z + (end.z - start.z) * t
        pts.push({ x: px, y: Math.max(0.15, getTerrainHeight(px, pz, biome, heightShape)) + 0.04, z: pz })
      }
      return pts
    }
    const isWestBank = b.position.x < getRiverCenterX(b.position.z)
    const start = isWestBank ? westBridgeHead : eastBridgeHead
    const end = { x: b.position.x, z: b.position.z + 1.8 }
    const steps = 8
    const pts: Vec3[] = []
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const arc = Math.sin(t * Math.PI) * (isWestBank ? -0.9 : 0.9)
      let px = start.x + (end.x - start.x) * t + arc * 0.35
      const pz = start.z + (end.z - start.z) * t + arc * 0.25
      const riverAtZ = getRiverCenterX(pz)
      if (isWestBank && px > riverAtZ - 2.35) {
        px = riverAtZ - 2.35
      } else if (!isWestBank && px < riverAtZ + 2.35) {
        px = riverAtZ + 2.35
      }
      pts.push({ x: px, y: Math.max(0.08, getTerrainHeight(px, pz, biome, heightShape)) + 0.04, z: pz })
    }
    return pts
  })

  // Scatter dense miniature forest (target ~88 trees) avoiding buildings, river channel, bridge approaches, docks, paths, and outer caravan track via Signed-Distance Obstacle Clearance Field
  const obstacleField = computeObstacleClearanceField(
    { buildings, paths, carrier: carrierPlacement },
    heightShape,
  )
  const rand = seededRandom(biome.charCodeAt(0) * 131 + places.length * 17)
  const foliage: WorldLayout['foliage'] = []
  let attempts = 0
  while (foliage.length < 88 && attempts < 3600) {
    attempts++
    const angle = rand() * Math.PI * 2
    const radius = 2.6 + Math.sqrt(rand()) * 12.55 // Keep inside r <= 15.15 so outer caravan ring (r=16.0) is obstacle-free
    const fx = Math.cos(angle) * radius
    const fz = Math.sin(angle) * radius
    const fy = getTerrainHeight(fx, fz, biome, heightShape)
    if (fy < 0.36) continue

    if (obstacleField.sample(fx, fz) < 0) continue

    const nearOther = foliage.some((f) => Math.hypot(f.x - fx, f.z - fz) < 0.96)
    if (nearOther) continue

    foliage.push({
      x: fx,
      y: fy,
      z: fz,
      scale: 0.7 + rand() * 0.48,
      variant: Math.floor(rand() * 5),
    })
  }

  // Place projects in a wide foreground arc inside the second realm, clear of the central carrier berth
  const origin = carrierPlacement.realmOrigin
  const projectsPlaced: PlacedProject[] = projects.map((project, index) => {
    const count = Math.max(1, projects.length)
    const deg = 148 - ((index + 0.5) / count) * 116
    const rad = (deg * Math.PI) / 180
    const px = origin.x + Math.cos(rad) * 9.6
    const py = origin.y + 0.2
    const pz = origin.z - 1.2 + Math.sin(rad) * 7.6
    return {
      project,
      index,
      position: { x: px, y: py, z: pz },
      cameraTarget: { x: px, y: py + 1.2, z: pz },
      cameraPosition: { x: px, y: py + 4.2, z: pz + 8.8 },
      labelAnchor: { x: px, y: py + 3.25, z: pz },
    }
  })

  return {
    buildings,
    paths,
    foliage,
    carrier: carrierPlacement,
    projects: projectsPlaced,
    worldShape: resolvedShape,
  }
}

export interface ObstacleClearanceField {
  sample: (x: number, z: number) => number
  sampleBuildingClearance: (x: number, z: number) => number
  nudgePoint: (
    x: number,
    z: number,
    minClearance?: number,
  ) => { x: number; z: number; clearance: number }
}

/**
 * Round 9 Gap (d): Deterministic 2D Signed-Distance Obstacle Clearance Field (`computeObstacleClearanceField`)
 * covering all placed buildings (respecting user `offsetX`, `offsetZ`, and `buildingScale`), doorway aprons,
 * road ribbons, bridges, harbor docks, river channels, and carrier berths.
 */
export function computeObstacleClearanceField(
  layout: Pick<WorldLayout, 'buildings'> & Partial<Pick<WorldLayout, 'paths' | 'carrier'>>,
  worldShape?: WorldShapeType,
): ObstacleClearanceField {
  const isB612Dome = worldShape === 'b612-highland'
  const bridgeZ = worldShape === 'canyon-mesa' ? -1.6 : -4.5
  const bridgeCx = getRiverCenterX(bridgeZ)

  const sampleBuildingClearance = (x: number, z: number): number => {
    let minB = Infinity
    for (const b of layout.buildings) {
      const bScale = Math.max(0.8, Math.min(1.25, b.place.buildingScale ?? 1.0))
      const rBuilding = 3.45 * bScale
      const dCenter = Math.hypot(x - b.position.x, z - b.position.z) - rBuilding
      const doorX = b.position.x + Math.sin(b.rotationY) * 1.55 * bScale
      const doorZ = b.position.z + Math.cos(b.rotationY) * 1.55 * bScale
      const dDoor = Math.hypot(x - doorX, z - doorZ) - 1.15 * bScale
      // Mandatory Front-Door Viewing Corridor (x ∈ [b.x - 2.68, b.x + 2.68], z ∈ [b.z, b.z + 4.88])
      // Keeps camera-side approach and ground badge 100% free of trees and beach umbrellas.
      const corridorHalfX = 2.68 * bScale
      const corridorHalfZ = 2.48 * bScale
      const corridorCenterZ = b.position.z + 2.4 * bScale
      const dxCorr = Math.abs(x - b.position.x) - corridorHalfX
      const dzCorr = Math.abs(z - corridorCenterZ) - corridorHalfZ
      const dCorridor =
        Math.hypot(Math.max(dxCorr, 0), Math.max(dzCorr, 0)) +
        Math.min(Math.max(dxCorr, dzCorr), 0)
      if (dCenter < minB) minB = dCenter
      if (dDoor < minB) minB = dDoor
      if (dCorridor < minB) minB = dCorridor
    }
    return minB
  }

  const sample = (x: number, z: number): number => {
    let minD = sampleBuildingClearance(x, z)

    if (layout.carrier) {
      const ch = layout.carrier.homePosition
      const dCarrier = Math.hypot(x - ch.x, z - ch.z) - 3.6
      if (dCarrier < minD) minD = dCarrier
    }

    // Harbor dock box at (cx = 3.2, cz = 15.75, hx = 1.55, hz = 2.25)
    const dxDock = Math.abs(x - 3.2) - 1.55
    const dzDock = Math.abs(z - 15.75) - 2.25
    const dDock =
      Math.hypot(Math.max(dxDock, 0), Math.max(dzDock, 0)) + Math.min(Math.max(dxDock, dzDock), 0)
    if (dDock < minD) minD = dDock

    if (!isB612Dome) {
      const dRiver = Math.abs(x - getRiverCenterX(z)) - 2.65
      if (dRiver < minD) minD = dRiver

      const dxBridge = Math.abs(x - bridgeCx) - 4.1
      const dzBridge = Math.abs(z - bridgeZ) - 2.1
      const dBridge =
        Math.hypot(Math.max(dxBridge, 0), Math.max(dzBridge, 0)) +
        Math.min(Math.max(dxBridge, dzBridge), 0)
      if (dBridge < minD) minD = dBridge
    }

    if (layout.paths) {
      for (const path of layout.paths) {
        for (const pt of path) {
          const dPath = Math.hypot(x - pt.x, z - pt.z) - 0.88
          if (dPath < minD) minD = dPath
        }
      }
    }

    return minD
  }

  const nudgePoint = (
    x: number,
    z: number,
    minClearance = 0.35,
  ): { x: number; z: number; clearance: number } => {
    let nx = x
    let nz = z
    for (let pass = 0; pass < 4; pass++) {
      for (const b of layout.buildings) {
        const bScale = Math.max(0.8, Math.min(1.25, b.place.buildingScale ?? 1.0))
        const targetR = 3.45 * bScale + minClearance
        const dx = nx - b.position.x
        const dz = nz - b.position.z
        const dist = Math.hypot(dx, dz)
        if (dist < targetR) {
          const ux = dist > 1e-4 ? dx / dist : 1
          const uz = dist > 1e-4 ? dz / dist : 0
          nx = b.position.x + ux * (targetR + 0.08)
          nz = b.position.z + uz * (targetR + 0.08)
        }
        const doorX = b.position.x + Math.sin(b.rotationY) * 1.55 * bScale
        const doorZ = b.position.z + Math.cos(b.rotationY) * 1.55 * bScale
        const targetDoorR = 1.15 * bScale + minClearance
        const ddx = nx - doorX
        const ddz = nz - doorZ
        const dDist = Math.hypot(ddx, ddz)
        if (dDist < targetDoorR) {
          const ux = dDist > 1e-4 ? ddx / dDist : 1
          const uz = dDist > 1e-4 ? ddz / dDist : 0
          nx = doorX + ux * (targetDoorR + 0.08)
          nz = doorZ + uz * (targetDoorR + 0.08)
        }
        const corridorHalfX = 2.68 * bScale + minClearance
        const corridorMinZ = b.position.z - 0.08 * bScale - minClearance
        const corridorMaxZ = b.position.z + 4.88 * bScale + minClearance
        if (
          nz >= corridorMinZ &&
          nz <= corridorMaxZ &&
          Math.abs(nx - b.position.x) < corridorHalfX
        ) {
          const dirX = nx >= b.position.x ? 1 : -1
          nx = b.position.x + dirX * (corridorHalfX + 0.12)
        }
      }
    }
    // Exact SDF gradient-ascent polish so overlapping building/corridor unions always achieve clearance >= minClearance
    const eps = 0.04
    for (let step = 0; step < 8; step++) {
      const c = sampleBuildingClearance(nx, nz)
      if (c >= minClearance + 0.04) break
      const gx = sampleBuildingClearance(nx + eps, nz) - sampleBuildingClearance(nx - eps, nz)
      const gz = sampleBuildingClearance(nx, nz + eps) - sampleBuildingClearance(nx, nz - eps)
      const gLen = Math.hypot(gx, gz)
      const ux = gLen > 1e-5 ? gx / gLen : nx >= 0 ? 1 : -1
      const uz = gLen > 1e-5 ? gz / gLen : 0
      const push = Math.max(0.25, minClearance + 0.12 - c)
      nx += ux * push
      nz += uz * push
    }
    return { x: nx, z: nz, clearance: sampleBuildingClearance(nx, nz) }
  }

  return {
    sample,
    sampleBuildingClearance,
    nudgePoint,
  }
}

export function sampleObstacleClearance(
  x: number,
  z: number,
  layout: Pick<WorldLayout, 'buildings'> & Partial<Pick<WorldLayout, 'paths' | 'carrier'>>,
  worldShape?: WorldShapeType,
): number {
  return computeObstacleClearanceField(layout, worldShape).sample(x, z)
}

