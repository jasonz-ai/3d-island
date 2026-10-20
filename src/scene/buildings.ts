import * as THREE from 'three'
import {
  BUILDING_TINT_OPTIONS,
  type BiomeType,
  type BuildingTintPreset,
  type ThemePalette,
} from '../schema/profile.ts'
import type { PlacedBuilding } from './layout.ts'
import {
  bannerFlag,
  box,
  contactShadow,
  cyl,
  dome,
  gable,
  mat,
  pyramid,
  sign,
  sphere,
  windowedBox,
} from './kit.ts'
import { rng } from './motion.ts'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import {
  buildBrandLogo3DEmblem,
  GENERIC_MASCOT_DOG_BODY_PATH,
  GENERIC_MASCOT_DOG_EAR_PATH,
  GENERIC_TECH_PARK_PATH,
} from './brandLogos.ts'

export interface BuiltBuilding {
  group: THREE.Group
  update: (t: number) => void
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x))
}

function smooth01(x: number): number {
  const t = clamp01(x)
  return t * t * (3 - 2 * t)
}

function addMiniTree(
  parent: THREE.Group,
  x: number,
  y: number,
  z: number,
  leafHex: string,
  scale = 1,
): void {
  const g = new THREE.Group()
  const planter = box(0.46 * scale, 0.16 * scale, 0.46 * scale, '#7A6855', { rough: 0.85 })
  planter.position.y = 0.08 * scale
  const trunk = cyl(0.045 * scale, 0.065 * scale, 0.42 * scale, 8, '#6E4F3A')
  trunk.position.y = 0.32 * scale
  const c1 = sphere(0.28 * scale, 12, leafHex, { rough: 0.86, flat: false })
  c1.position.set(0, 0.64 * scale, 0)
  const c2 = sphere(0.2 * scale, 10, leafHex, { rough: 0.86, flat: false })
  c2.position.set(0.14 * scale, 0.78 * scale, 0.06 * scale)
  g.add(planter, trunk, c1, c2)
  g.position.set(x, y, z)
  g.userData.windSway = true
  g.userData.windPhase = x * 0.73 + z * 0.51
  parent.add(g)
}

function addCorniceBand(
  parent: THREE.Group,
  w: number,
  y: number,
  d: number,
  colorHex: string,
  x = 0,
  z = 0,
): void {
  const trim = box(w + 0.24, 0.11, d + 0.24, colorHex, { rough: 0.46 })
  trim.position.set(x, y, z)
  const underMolding = box(w + 0.12, 0.06, d + 0.12, '#DCD3C4', { rough: 0.52 })
  underMolding.position.set(x, y - 0.07, z)
  parent.add(trim, underMolding)
}

function extrudeWithArchHole(
  outerShape: THREE.Shape,
  arch: { x: number; w: number; spring: number },
  depth: number,
  material: THREE.Material,
): THREE.Mesh {
  const halfW = arch.w / 2
  const hole = new THREE.Path()
  hole.moveTo(arch.x - halfW, 0.015)
  hole.lineTo(arch.x - halfW, arch.spring)
  hole.absarc(arch.x, arch.spring, halfW, Math.PI, 0, true)
  hole.lineTo(arch.x + halfW, 0.015)
  hole.closePath()
  outerShape.holes.push(hole)

  const geo = new THREE.ExtrudeGeometry(outerShape, {
    depth,
    bevelEnabled: false,
    curveSegments: 18,
  })
  geo.translate(0, 0, -depth / 2)
  const mesh = new THREE.Mesh(geo, material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function createClassicalArchGate(): THREE.Group {
  const gate = new THREE.Group()
  gate.name = 'arch-gate'
  const ivoryMat = mat('#F4F1EA', { rough: 0.65 })
  const stoneMat = mat('#8F6F5B', { rough: 0.78 })
  const plinthMat = mat('#B8B2A7', { rough: 0.8 })

  // Central main arch bay
  const centerShape = new THREE.Shape()
  centerShape.moveTo(-0.46, 0)
  centerShape.lineTo(0.46, 0)
  centerShape.lineTo(0.46, 1.56)
  centerShape.lineTo(-0.46, 1.56)
  centerShape.closePath()
  gate.add(extrudeWithArchHole(centerShape, { x: 0, w: 0.62, spring: 0.96 }, 0.28, ivoryMat))

  for (const side of [-1, 1] as const) {
    const px = side * 0.68
    const pBase = box(0.44, 0.48, 0.48, '#B8B2A7')
    pBase.position.set(px, 0.24, 0)
    const pBody = box(0.4, 1.06, 0.34, '#8F6F5B')
    pBody.position.set(px, 1.01, -0.03)
    gate.add(pBase, pBody)

    for (const colDx of [-0.11, 0.11]) {
      const col = cyl(0.055, 0.062, 0.98, 12, '#F4F1EA')
      col.position.set(px + colDx, 0.99, 0.16)
      gate.add(col)
    }

    const wingShape = new THREE.Shape()
    wingShape.moveTo(0, 0)
    wingShape.lineTo(0.76, 0)
    wingShape.lineTo(0.76, 0.9)
    wingShape.quadraticCurveTo(0.3, 0.94, 0, 1.4)
    wingShape.closePath()
    const wingMesh = extrudeWithArchHole(
      wingShape,
      { x: 0.42, w: 0.28, spring: 0.44 },
      0.22,
      ivoryMat,
    )
    wingMesh.position.x = side * 0.88
    wingMesh.scale.x = side
    gate.add(wingMesh)

    const outerPillar = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.72, 0.32), stoneMat)
    outerPillar.position.set(side * 1.76, 0.36, 0)
    const outerCap = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.38), plinthMat)
    outerCap.position.set(side * 1.76, 0.78, 0)
    gate.add(outerPillar, outerCap)
  }

  const cornice1 = box(1.84, 0.22, 0.38, '#F4F1EA')
  cornice1.position.set(0, 1.68, 0)
  const cornice2 = box(2.04, 0.08, 0.54, '#F4F1EA')
  cornice2.position.set(0, 1.83, 0)
  const attic = box(1.56, 0.2, 0.34, '#F4F1EA')
  attic.position.set(0, 1.97, 0)
  const plaque = sign('清華園', 0.76, 0.2, '#F7F5EF', '#2B2622', '#A9472F')
  plaque.position.set(0, 1.68, 0.21)
  gate.add(cornice1, cornice2, attic, plaque)

  gate.scale.setScalar(0.88)
  return gate
}

function createVrHeadsetShape(w: number, h: number): THREE.Shape {
  const hw = w / 2
  const hh = h / 2
  const r = h * 0.34
  const s = new THREE.Shape()
  s.moveTo(-hw + r, hh)
  s.lineTo(hw - r, hh)
  s.quadraticCurveTo(hw, hh, hw, hh - r)
  s.lineTo(hw, -hh + r)
  s.quadraticCurveTo(hw, -hh, hw - r, -hh)
  s.lineTo(w * 0.17, -hh)
  s.bezierCurveTo(w * 0.1, -hh, w * 0.09, -hh + h * 0.36, 0, -hh + h * 0.36)
  s.bezierCurveTo(-w * 0.09, -hh + h * 0.36, -w * 0.1, -hh, -w * 0.17, -hh)
  s.lineTo(-hw + r, -hh)
  s.quadraticCurveTo(-hw, -hh, -hw, -hh + r)
  s.lineTo(-hw, hh - r)
  s.quadraticCurveTo(-hw, hh, -hw + r, hh)
  return s
}

function createVrHeadsetProp(): THREE.Group {
  const g = new THREE.Group()
  g.name = 'vr-headset'
  const shellMat = mat('#F4F5F7', { rough: 0.42, metal: 0.08 })
  const visorMat = mat('#0D0F13', { rough: 0.12, metal: 0.65 })
  const cushionMat = mat('#30343B', { rough: 0.88 })
  const strapMat = mat('#DFE2E7', { rough: 0.68 })

  const w = 1.68
  const h = 0.84
  const bodyGeo = new THREE.ExtrudeGeometry(createVrHeadsetShape(w, h), {
    depth: 0.58,
    bevelEnabled: true,
    bevelSize: 0.048,
    bevelThickness: 0.048,
    bevelSegments: 4,
    curveSegments: 16,
  })
  bodyGeo.translate(0, 0, -0.29)
  const bodyMesh = new THREE.Mesh(bodyGeo, shellMat)
  bodyMesh.castShadow = true
  g.add(bodyMesh)

  const visorGeo = new THREE.ExtrudeGeometry(createVrHeadsetShape(w * 0.9, h * 0.82), {
    depth: 0.045,
    bevelEnabled: false,
    curveSegments: 16,
  })
  const visorMesh = new THREE.Mesh(visorGeo, visorMat)
  visorMesh.position.set(0, 0.02, 0.32)
  g.add(visorMesh)

  // 4 tracking camera sensors on front visor
  for (const cx of [-0.58, 0.58]) {
    for (const cy of [-0.16, 0.22]) {
      const cam = cyl(0.052, 0.052, 0.03, 12, '#6B7480', { rough: 0.28, metal: 0.65 })
      cam.rotation.x = Math.PI / 2
      cam.position.set(cx, cy, 0.37)
      g.add(cam)
    }
  }

  // Facial interface cushion + dual optical lenses
  const cushionGeo = new THREE.ExtrudeGeometry(createVrHeadsetShape(w * 0.92, h * 0.88), {
    depth: 0.14,
    bevelEnabled: false,
    curveSegments: 14,
  })
  const cushion = new THREE.Mesh(cushionGeo, cushionMat)
  cushion.position.set(0, 0, -0.46)
  g.add(cushion)

  for (const lx of [-0.35, 0.35]) {
    const lens = cyl(0.22, 0.22, 0.04, 20, '#27406A', { rough: 0.1, metal: 0.78 })
    lens.rotation.x = Math.PI / 2
    lens.position.set(lx, 0.05, -0.47)
    g.add(lens)
  }

  // Side halo strap + rear battery counterweight
  const sideStrap = new THREE.Mesh(
    new THREE.TorusGeometry(w / 2 - 0.04, 0.052, 10, 36, Math.PI),
    strapMat,
  )
  sideStrap.rotation.x = -Math.PI / 2
  sideStrap.scale.set(1, 1.55 / (w / 2 - 0.04), 2.4)
  sideStrap.position.set(0, 0.04, -0.24)
  const rearPad = box(0.74, 0.42, 0.18, '#F4F5F7', { rough: 0.45 })
  rearPad.position.set(0, 0.04, -1.85)
  g.add(sideStrap, rearPad)

  return g
}

function createHologramCityTable(): { group: THREE.Group; update: (t: number) => void } {
  const root = new THREE.Group()
  root.name = 'hologram-table'

  const holoMat = (opacity: number) =>
    new THREE.MeshBasicMaterial({
      color: '#2FD0EE',
      transparent: true,
      opacity,
      depthWrite: false,
      side: THREE.DoubleSide,
    })

  const tableGroup = new THREE.Group()
  root.add(tableGroup)

  const baseDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.62, 0.07, 24), holoMat(0.48))
  const rimTorus = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.016, 6, 36), holoMat(0.92))
  rimTorus.rotation.x = Math.PI / 2
  tableGroup.add(baseDisc, rimTorus)

  const beamCone = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.12, 0.95, 20, 1, true),
    holoMat(0.18),
  )
  beamCone.position.y = -0.52
  root.add(beamCone)

  const unitBox = new THREE.BoxGeometry(1, 1, 1)
  unitBox.translate(0, 0.5, 0)
  const unitEdges = new THREE.EdgesGeometry(unitBox)
  const lineMat = new THREE.LineBasicMaterial({
    color: '#0B93B8',
    transparent: true,
    opacity: 0.85,
  })

  const rand = rng(7001)
  const blocks: { group: THREE.Group; w: number; h: number; d: number }[] = []
  for (let gx = -1; gx <= 1; gx += 1) {
    for (let gz = -1; gz <= 1; gz += 1) {
      const bGroup = new THREE.Group()
      const fill = new THREE.Mesh(unitBox, holoMat(0.42))
      const wire = new THREE.LineSegments(unitEdges, lineMat)
      bGroup.add(fill, wire)
      const bw = 0.2 + rand() * 0.13
      const bh = 0.22 + rand() * 0.52
      const bd = 0.2 + rand() * 0.13
      bGroup.position.set(gx * 0.36, 0.035, gz * 0.36)
      bGroup.scale.set(bw, bh, bd)
      tableGroup.add(bGroup)
      blocks.push({ group: bGroup, w: bw, h: bh, d: bd })
    }
  }

  return {
    group: root,
    update: (t) => {
      tableGroup.rotation.y = t * 0.38
      blocks.forEach((b, i) => {
        const pulse = 0.72 + 0.28 * Math.sin(t * 2.4 + i * 0.7)
        b.group.scale.set(b.w, Math.max(0.05, b.h * pulse), b.d)
      })
    },
  }
}

function createAnimatedWindowGrid(
  width: number,
  height: number,
  cols = 7,
  rows = 6,
): { mesh: THREE.InstancedMesh; update: (t: number) => void } {
  const gap = 0.068
  const cw = width / cols
  const ch = height / rows
  const geo = new THREE.PlaneGeometry(cw - gap, ch - gap)
  const matInst = new THREE.MeshBasicMaterial({ color: '#FFFFFF' })
  const mesh = new THREE.InstancedMesh(geo, matInst, cols * rows)
  mesh.name = 'animated-window-grid'

  const dummy = new THREE.Object3D()
  for (let c = 0; c < cols; c += 1) {
    for (let r = 0; r < rows; r += 1) {
      dummy.position.set(-width / 2 + cw * (c + 0.5), ch * (r + 0.5), 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(c * rows + r, dummy.matrix)
    }
  }

  const cDark = new THREE.Color('#27303A')
  const cWarm = new THREE.Color('#FFD98A')
  const cPeak = new THREE.Color('#FF8F5A')
  const tmp = new THREE.Color()

  const sampleBars = (step: number): number[] => {
    const r = rng(4200 + step)
    return Array.from({ length: cols }, () => 1 + r() * (rows - 1))
  }

  const update = (t: number): void => {
    const period = 3.2
    const step = Math.floor(t / period)
    const a = sampleBars(step)
    const b = sampleBars(step + 1)
    const k = smooth01((t / period - step - 0.62) / 0.38)
    const cur = a.map((v, i) => v + (b[i] - v) * k)
    const peakCol = cur.indexOf(Math.max(...cur))

    for (let c = 0; c < cols; c += 1) {
      for (let r = 0; r < rows; r += 1) {
        const lit = clamp01(cur[c] - r)
        tmp.copy(cDark).lerp(c === peakCol ? cPeak : cWarm, lit)
        mesh.setColorAt(c * rows + r, tmp)
      }
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }

  update(0)
  return { mesh, update }
}

function createScrollingFeedScreen(
  w: number,
  h: number,
): { group: THREE.Group; update: (t: number) => void } {
  const group = new THREE.Group()
  group.name = 'scrolling-feed-screen'

  const bezel = box(w + 0.14, h + 0.14, 0.08, '#0B0B0D', { rough: 0.35 })
  bezel.position.set(0, 0, -0.02)
  group.add(bezel)

  let tex: THREE.CanvasTexture | null = null
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas')
    const cards = 5
    canvas.width = 256
    canvas.height = 512 * cards
    let ctx: CanvasRenderingContext2D | null = null
    try {
      ctx = canvas.getContext('2d')
    } catch {
      ctx = null
    }
    if (ctx) {
      const pairs: [string, string][] = [
        ['#FF5F6D', '#FFC371'],
        ['#25F4EE', '#2B6CB0'],
        ['#A18CD1', '#FBC2EB'],
        ['#FE2C55', '#FF9A44'],
        ['#43E97B', '#38F9D7'],
      ]
      for (let i = 0; i < cards; i += 1) {
        const y0 = i * 512
        const [c1, c2] = pairs[i % pairs.length]
        const grad = ctx.createLinearGradient(0, y0, 256, y0 + 512)
        grad.addColorStop(0, c1)
        grad.addColorStop(1, c2)
        ctx.fillStyle = grad
        ctx.fillRect(0, y0, 256, 512)

        ctx.fillStyle = 'rgba(255,255,255,0.32)'
        ctx.beginPath()
        ctx.arc(112, y0 + 210, 68, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = '#FFFFFF'
        for (let b = 0; b < 3; b += 1) {
          ctx.beginPath()
          ctx.arc(220, y0 + 260 + b * 60, 17, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.fillStyle = '#FE2C55'
        ctx.beginPath()
        ctx.arc(220, y0 + 260, 10, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = 'rgba(255,255,255,0.92)'
        ctx.fillRect(20, y0 + 416, 132, 14)
        ctx.fillStyle = 'rgba(255,255,255,0.68)'
        ctx.fillRect(20, y0 + 442, 168, 10)
        ctx.fillRect(20, y0 + 462, 110, 10)
      }
      tex = new THREE.CanvasTexture(canvas)
      tex.colorSpace = THREE.SRGBColorSpace
      tex.wrapT = THREE.RepeatWrapping
      tex.repeat.set(1, 1 / cards)
    }
  }

  const screenMat = new THREE.MeshStandardMaterial({
    color: tex ? '#FFFFFF' : '#25F4EE',
    emissive: '#FFFFFF',
    emissiveIntensity: 0.78,
    roughness: 0.35,
    ...(tex ? { map: tex, emissiveMap: tex } : {}),
  })
  const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), screenMat)
  screenMesh.position.z = 0.035
  group.add(screenMesh)

  const update = (t: number): void => {
    if (!tex) return
    const period = 2.6
    const step = Math.floor(t / period)
    const glide = smooth01((t - step * period - 2.05) / 0.55)
    tex.offset.y = 1 - ((step + 1 + glide) / 5) % 1
  }
  update(0)

  return { group, update }
}

function createYellowTaxi(): THREE.Group {
  const car = new THREE.Group()
  car.name = 'yellow-taxi'
  const body = box(0.42, 0.16, 0.82, '#F6C21A', { rough: 0.42 })
  body.position.y = 0.09
  const cabin = box(0.36, 0.15, 0.44, '#2A323A', { rough: 0.25, metal: 0.3 })
  cabin.position.set(0, 0.24, -0.04)
  const roofCap = box(0.37, 0.04, 0.45, '#F6C21A', { rough: 0.42 })
  roofCap.position.set(0, 0.34, -0.04)
  const taxiLamp = box(0.16, 0.06, 0.08, '#FFF2B0', {
    emissive: '#FFE066',
    emissiveIntensity: 0.95,
  })
  taxiLamp.position.set(0, 0.39, -0.04)
  car.add(body, cabin, roofCap, taxiLamp)

  for (const [wx, wz] of [
    [-0.2, 0.26],
    [0.2, 0.26],
    [-0.2, -0.26],
    [0.2, -0.26],
  ] as const) {
    const wheel = cyl(0.075, 0.075, 0.055, 10, '#1D2127')
    wheel.rotation.z = Math.PI / 2
    wheel.position.set(wx, 0.075, wz)
    car.add(wheel)
  }
  return car
}

function createMiniBicycle(): THREE.Group {
  const bike = new THREE.Group()
  bike.name = 'mini-bicycle'
  const frameColor = '#1FA3A8'
  const tireMat = mat('#20242A', { rough: 0.8 })
  for (const z of [-0.2, 0.2]) {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.024, 8, 18), tireMat)
    wheel.position.set(0, 0.14, z)
    wheel.rotation.y = Math.PI / 2
    bike.add(wheel)
  }
  const topTube = box(0.03, 0.03, 0.4, frameColor)
  topTube.position.set(0, 0.22, 0)
  const seatPost = box(0.03, 0.22, 0.03, frameColor)
  seatPost.position.set(0, 0.22, -0.08)
  const saddle = box(0.08, 0.035, 0.12, '#20242A')
  saddle.position.set(0, 0.34, -0.08)
  const fork = box(0.03, 0.24, 0.03, frameColor)
  fork.position.set(0, 0.22, 0.18)
  const handlebar = box(0.22, 0.03, 0.03, '#20242A')
  handlebar.position.set(0, 0.35, 0.18)
  bike.add(topTube, seatPost, saddle, fork, handlebar)
  return bike
}

function createArchitecturalGroundPlinth(
  biome: BiomeType,
  roofHex: string,
  accentHex: string,
): THREE.Group {
  const g = new THREE.Group()
  g.name = 'architectural-ground-plinth'

  const lowerStoneHex =
    biome === 'desert' ? '#C9B393' : biome === 'snow' ? '#CBD5E1' : '#C4BCB0'
  const upperStoneHex =
    biome === 'desert' ? '#DFCBB0' : biome === 'snow' ? '#E2E8F0' : '#DBD4C6'

  // Multi-tiered chamfered stone foundation plinth bridging building deck to terrain
  const subCourse = box(5.48, 0.1, 4.36, lowerStoneHex, { rough: 0.84 })
  subCourse.position.set(0, -0.02, 0.04)
  const copingTier = box(5.26, 0.09, 4.14, upperStoneHex, { rough: 0.72 })
  copingTier.position.set(0, 0.05, 0.04)
  g.add(subCourse, copingTier)

  // Stepped Front Entrance Terrace (`stepped-entrance-terrace`)
  const terrace = new THREE.Group()
  terrace.name = 'stepped-entrance-terrace'
  const step1 = box(2.16, 0.07, 0.56, lowerStoneHex, { rough: 0.78 })
  step1.position.set(0, 0.02, 2.28)
  const step2 = box(1.88, 0.07, 0.44, upperStoneHex, { rough: 0.7 })
  step2.position.set(0, 0.07, 2.16)
  const step3 = box(1.62, 0.06, 0.32, '#EFECE4', { rough: 0.62 })
  step3.position.set(0, 0.12, 2.04)
  terrace.add(step1, step2, step3)

  for (const side of [-1, 1] as const) {
    const cheekWall = box(0.18, 0.22, 0.58, lowerStoneHex, { rough: 0.74 })
    cheekWall.position.set(side * 0.98, 0.09, 2.22)
    const cheekCap = box(0.22, 0.05, 0.62, upperStoneHex, { rough: 0.58 })
    cheekCap.position.set(side * 0.98, 0.21, 2.22)
    terrace.add(cheekWall, cheekCap)
  }
  g.add(terrace)

  // Warm Architectural Pathway Bollard Lights (`warm-pathway-lights`)
  const pathwayLights = new THREE.Group()
  pathwayLights.name = 'warm-pathway-lights'
  const bollardCoords: [number, number, number][] = [
    [-1.12, 0.06, 2.34],
    [1.12, 0.06, 2.34],
    [-2.36, 0.06, 1.96],
    [2.36, 0.06, 1.96],
  ]
  for (const [bx, by, bz] of bollardCoords) {
    const bollard = new THREE.Group()
    bollard.position.set(bx, by, bz)
    const stem = cyl(0.036, 0.048, 0.24, 8, roofHex, { rough: 0.45, metal: 0.35 })
    stem.position.y = 0.12
    const warmCore = cyl(0.034, 0.034, 0.11, 8, '#FFF3C4', {
      emissive: '#FFAE38',
      emissiveIntensity: 0.96,
      rough: 0.2,
    })
    warmCore.position.y = 0.26
    const hoodCap = cyl(0.052, 0.058, 0.035, 8, accentHex, { rough: 0.38, metal: 0.3 })
    hoodCap.position.y = 0.33
    const glowPool = cyl(0.22, 0.24, 0.012, 12, '#FFE8A3', {
      emissive: '#FF9E2C',
      emissiveIntensity: 0.46,
      opacity: 0.52,
    })
    glowPool.position.y = 0.008
    bollard.add(stem, warmCore, hoodCap, glowPool)
    pathwayLights.add(bollard)
  }
  g.add(pathwayLights)

  return g
}

function addFacadeCanopyAndWarmGlow(
  parent: THREE.Group,
  opts: {
    x?: number
    zFront: number
    canopyY?: number
    canopyW?: number
    canopyColor?: string
    trimColor?: string
    warmGlowY?: number
    warmGlowW?: number
    warmGlowCount?: number
  },
): void {
  const x = opts.x ?? 0
  const zFront = opts.zFront
  const canopyY = opts.canopyY ?? 1.08
  const canopyW = opts.canopyW ?? 1.48
  const canopyColor = opts.canopyColor ?? '#2C3440'
  const trimColor = opts.trimColor ?? '#E8DFCF'

  const detailGroup = new THREE.Group()
  detailGroup.name = 'facade-architectural-accents'

  // Cantilevered Entrance Canopy with warm soffit downlight
  const canopySlab = box(canopyW, 0.08, 0.52, canopyColor, { rough: 0.36, metal: 0.38 })
  canopySlab.position.set(x, canopyY, zFront + 0.24)
  const canopyTrim = box(canopyW + 0.06, 0.04, 0.56, trimColor, { rough: 0.45, metal: 0.25 })
  canopyTrim.position.set(x, canopyY + 0.04, zFront + 0.24)
  const soffitGlow = box(canopyW * 0.78, 0.025, 0.32, '#FFF3C4', {
    emissive: '#FFBD59',
    emissiveIntensity: 0.92,
  })
  soffitGlow.position.set(x, canopyY - 0.045, zFront + 0.24)
  detailGroup.add(canopySlab, canopyTrim, soffitGlow)

  // Warm Interior Window Glow Variance Strips across the upper facade
  const count = opts.warmGlowCount ?? 3
  const span = opts.warmGlowW ?? 2.2
  const wy = opts.warmGlowY ?? canopyY + 0.78
  for (let i = 0; i < count; i += 1) {
    const u = count === 1 ? 0 : (i / (count - 1) - 0.5) * span
    const isAmber = i % 2 === 0
    const pane = box(0.36, 0.24, 0.03, isAmber ? '#FFE8A3' : '#FFF7DC', {
      emissive: isAmber ? '#FFAE38' : '#FFE082',
      emissiveIntensity: isAmber ? 0.86 : 0.64,
      rough: 0.2,
    })
    pane.position.set(x + u, wy + (i % 2) * 0.28, zFront + 0.018)
    const sill = box(0.42, 0.035, 0.06, trimColor, { rough: 0.52 })
    sill.position.set(x + u, wy + (i % 2) * 0.28 - 0.135, zFront + 0.028)
    detailGroup.add(pane, sill)
  }

  parent.add(detailGroup)
}

export function addRooftopArchitecturalAccents(
  parent: THREE.Group,
  opts: {
    x?: number
    y: number
    z?: number
    w?: number
    d?: number
    trimColor?: string
    leafHex?: string
    includeSkylight?: boolean
    includeHvac?: boolean
    includeGarden?: boolean
  },
): void {
  const x = opts.x ?? 0
  const y = opts.y
  const z = opts.z ?? 0
  const w = opts.w ?? 2.4
  const d = opts.d ?? 1.6
  const trimColor = opts.trimColor ?? '#CBD5E1'
  const leafHex = opts.leafHex ?? '#5E9E6E'

  const roofAccents = new THREE.Group()
  roofAccents.name = 'rooftop-architectural-accents'

  if (opts.includeSkylight !== false) {
    const skylightFrame = box(w * 0.42, 0.08, d * 0.38, trimColor, { rough: 0.42, metal: 0.35 })
    skylightFrame.position.set(x - w * 0.18, y + 0.04, z)
    const skylightGlass = gable(w * 0.38, 0.22, d * 0.34, '#BAE6FD', {
      emissive: '#38BDF8',
      emissiveIntensity: 0.48,
      rough: 0.15,
      metal: 0.25,
    })
    skylightGlass.position.set(x - w * 0.18, y + 0.08, z)
    roofAccents.add(skylightFrame, skylightGlass)
  }

  if (opts.includeHvac !== false) {
    const hvacUnit = box(0.44, 0.24, 0.34, '#94A3B8', { rough: 0.48, metal: 0.4 })
    hvacUnit.position.set(x + w * 0.26, y + 0.12, z - d * 0.22)
    const hvacGrille = cyl(0.12, 0.12, 0.03, 10, '#334155', { rough: 0.6, metal: 0.5 })
    hvacGrille.position.set(x + w * 0.26, y + 0.25, z - d * 0.22)
    roofAccents.add(hvacUnit, hvacGrille)
  }

  if (opts.includeGarden) {
    const planter = box(0.68, 0.14, 0.28, '#78716C', { rough: 0.82 })
    planter.position.set(x + w * 0.22, y + 0.07, z + d * 0.26)
    const hedge = box(0.6, 0.16, 0.22, leafHex, { rough: 0.78 })
    hedge.position.set(x + w * 0.22, y + 0.18, z + d * 0.26)
    roofAccents.add(planter, hedge)
  }

  parent.add(roofAccents)
}

function createLandmarkPlumbobJewel(
  accentHex: string,
): { group: THREE.Group; update: (t: number) => void } {
  const root = new THREE.Group()
  root.name = 'landmark-plumbob'

  const crystalGroup = new THREE.Group()
  crystalGroup.name = 'landmark-plumbob-crystal'

  // Multi-faceted outer jewel shell
  const outerShell = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.14, 0),
    mat('#34D399', {
      emissive: '#10B981',
      emissiveIntensity: 0.76,
      rough: 0.14,
      metal: 0.28,
      opacity: 0.86,
      flat: true,
    }),
  )
  outerShell.scale.set(0.82, 1.58, 0.82)

  // Inner radiant core glow (`landmark-plumbob-core`)
  const innerCore = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.082, 0),
    mat('#FEF08A', {
      emissive: '#A7F3D0',
      emissiveIntensity: 1.18,
      rough: 0.1,
      flat: true,
    }),
  )
  innerCore.name = 'landmark-plumbob-core'
  innerCore.scale.set(0.75, 1.42, 0.75)

  // Multi-faceted specular highlight ring around the crystal equator (8-sided CylinderGeometry so zero TorusGeometry!)
  const specularRing = cyl(0.145, 0.145, 0.022, 8, '#E6FFFA', {
    emissive: accentHex,
    emissiveIntensity: 0.88,
    rough: 0.12,
    metal: 0.72,
    flat: true,
  })
  specularRing.name = 'landmark-plumbob-ring'

  crystalGroup.add(outerShell, innerCore, specularRing)
  root.add(crystalGroup)

  return {
    group: root,
    update: (t: number) => {
      crystalGroup.rotation.y = t * 1.65
      specularRing.rotation.y = -t * 2.4
      crystalGroup.position.y = Math.sin(t * 2.8) * 0.035
    },
  }
}

export function buildDetailedBuilding(
  placed: PlacedBuilding,
  biome: BiomeType,
  palette: ThemePalette,
): BuiltBuilding {
  const b = placed.place
  const group = new THREE.Group()
  group.name = `place-${b.id}`
  group.position.set(placed.position.x, placed.position.y, placed.position.z)
  group.rotation.y = placed.rotationY
  const bScale = Math.max(0.8, Math.min(1.25, b.buildingScale ?? 1.0))
  group.scale.setScalar(bScale)
  const tintPreset: BuildingTintPreset = b.tintPreset ?? 'default'
  group.userData.pickId = b.id
  group.userData.tintPreset = tintPreset

  const tintOpt = BUILDING_TINT_OPTIONS.find((t) => t.id === tintPreset)
  const roof = tintOpt && tintPreset !== 'default' ? tintOpt.roofHex : palette.shared.roof
  const accent = tintOpt && tintPreset !== 'default' ? tintOpt.accentHex : palette.shared.accent
  const leafColor = palette.terrain.foliage[0] ?? '#6F9861'
  const updaters: Array<(t: number) => void> = []

  // Soft radial grounding contact shadow decal + beveled diorama grounding skirt + stepped architectural plinth & warm pathway lights
  const groundPad = contactShadow(3.6, 3.1, 0.48)
  const groundingSkirt = cyl(2.58, 2.86, 0.34, 24, palette.terrain.groundSide, {
    rough: 0.9,
    flat: false,
  })
  groundingSkirt.name = 'grounding-skirt'
  groundingSkirt.scale.z = 0.86
  groundingSkirt.position.y = -0.14
  const archGroundPlinth = createArchitecturalGroundPlinth(biome, roof, accent)
  group.add(groundPad, groundingSkirt, archGroundPlinth)

  if (b.style === 'university') {
    // High-Contrast Collegiate Terracotta Red (#A9472F) + Warm Ivory (#F4F1EA) + Sage Dome (#6F9288)
    const uniBrick = '#A9472F'
    const uniCream = '#F4F1EA'
    const uniSage = '#6F9288'

    const lowerBase = box(5.5, 0.22, 4.3, '#D6CFBF', { rough: 0.72 })
    lowerBase.position.y = 0.11
    const upperBase = box(4.9, 0.2, 3.7, uniCream, { rough: 0.65 })
    upperBase.position.y = 0.32
    const grandSteps = box(2.1, 0.24, 0.92, '#D6CFBF', { rough: 0.68 })
    grandSteps.position.set(0, 0.12, 2.15)
    group.add(lowerBase, upperBase, grandSteps)

    const hall = windowedBox(3.9, 2.35, 2.35, uniBrick, 5, 2, '#F1E6C8')
    hall.position.y = 1.58
    addCorniceBand(group, 3.9, 2.74, 2.35, uniCream)
    addFacadeCanopyAndWarmGlow(group, {
      zFront: 1.18,
      canopyY: 1.15,
      canopyW: 1.65,
      canopyColor: uniSage,
      trimColor: uniCream,
      warmGlowY: 1.86,
      warmGlowW: 2.6,
    })
    const hallRoof = gable(4.35, 0.82, 2.75, uniCream)
    hallRoof.position.y = 2.76
    const rotundaDrum = cyl(0.95, 0.98, 0.58, 24, uniBrick)
    rotundaDrum.position.set(0, 3.32, -0.08)
    const rotundaDome = dome(0.98, uniSage, { rough: 0.48, metal: 0.18 })
    rotundaDome.position.set(0, 3.6, -0.08)
    const lanternSpire = cyl(0.035, 0.08, 0.72, 8, uniCream)
    lanternSpire.position.set(0, 4.72, -0.08)
    group.add(hall, hallRoof, rotundaDrum, rotundaDome, lanternSpire)

    // Symmetric side wings in Terracotta & Cream
    for (const side of [-1, 1]) {
      const wing = windowedBox(1.42, 1.92, 2.18, uniBrick, 2, 2, '#F1E6C8')
      wing.position.set(side * 2.18, 1.36, 0.16)
      addCorniceBand(group, 1.42, 2.32, 2.18, uniCream, side * 2.18, 0.16)
      const wRoof = pyramid(1.78, 0.76, 2.52, uniSage)
      wRoof.position.set(side * 2.18, 2.72, 0.16)
      group.add(wing, wRoof)
      addMiniTree(group, side * 2.1, 0.42, 1.62, biome === 'ocean' ? '#EFA8B8' : leafColor, 0.92)
    }

    // Neoclassical White Colonnade Portico
    const entablature = box(2.75, 0.22, 0.68, uniCream)
    entablature.position.set(0, 2.32, 1.38)
    const pediment = gable(2.92, 0.58, 0.78, uniCream)
    pediment.position.set(0, 2.43, 1.38)
    group.add(entablature, pediment)
    for (let i = -2; i <= 2; i += 1) {
      const col = cyl(0.095, 0.115, 1.82, 12, uniCream, { rough: 0.42 })
      col.position.set(i * 0.56, 1.32, 1.42)
      group.add(col)
    }

    // Forecourt ExtrudeGeometry 3-Arch Classical Gate (arch-gate)
    const archGate = createClassicalArchGate()
    archGate.position.set(0, 0.22, 2.58)
    group.add(archGate)

    // Rooftop Flagpole + Vertex-Wave Banner
    const pole = cyl(0.032, 0.038, 1.35, 8, uniCream)
    pole.position.set(0, 5.15, -0.08)
    const flag = bannerFlag(1.25, 0.56, accent)
    flag.mesh.position.set(0, 5.55, -0.08)
    group.add(pole, flag.mesh)
    updaters.push((t) => flag.update(t))
  } else if (b.style === 'pagoda') {
    const lowerOct = cyl(2.68, 2.85, 0.32, 8, '#D6CFBF', { rough: 0.65 })
    lowerOct.position.y = 0.16
    const upperOct = cyl(2.22, 2.38, 0.36, 8, '#F4F1EA', { rough: 0.58 })
    upperOct.position.y = 0.48
    const stairFlight = box(1.15, 0.38, 0.95, '#D6CFBF')
    stairFlight.position.set(0, 0.19, 2.38)
    // Carved marble balustrade posts around the upper octagonal terrace
    for (let p = 0; p < 8; p += 1) {
      const pa = (p / 8) * Math.PI * 2 + Math.PI / 8
      const post = cyl(0.045, 0.052, 0.26, 8, '#FAF6EE')
      post.position.set(Math.cos(pa) * 2.12, 0.76, Math.sin(pa) * 2.12)
      group.add(post)
    }
    group.add(lowerOct, upperOct, stairFlight)

    for (const side of [-0.62, 0.62]) {
      const gatePillar = cyl(0.075, 0.085, 1.48, 8, '#C83E2B')
      gatePillar.position.set(side, 0.92, 2.02)
      group.add(gatePillar)
    }
    const gateBeam = box(1.68, 0.14, 0.18, '#2C3238')
    gateBeam.position.set(0, 1.56, 2.02)
    const gateRoof = gable(1.92, 0.34, 0.48, '#2C3238')
    gateRoof.position.set(0, 1.63, 2.02)
    group.add(gateBeam, gateRoof)

    const lanterns: THREE.Mesh[] = []
    for (let tier = 0; tier < 5; tier += 1) {
      const scale = 1 - tier * 0.142
      const y = 0.66 + tier * 0.98
      const body = cyl(
        1.18 * scale,
        1.28 * scale,
        0.68,
        8,
        tier % 2 === 0 ? '#F4F1EA' : '#E8DFCF',
      )
      body.position.y = y + 0.34
      const waist = cyl(1.24 * scale, 1.24 * scale, 0.12, 8, '#C83E2B')
      waist.position.y = y + 0.12
      const lowerEave = cyl(1.22 * scale, 2.12 * scale, 0.24, 8, '#2C3238')
      lowerEave.position.y = y + 0.72
      const upperEave = cyl(0.88 * scale, 1.62 * scale, 0.22, 8, '#2C3238')
      upperEave.position.y = y + 0.88
      const goldRim = cyl(2.14 * scale, 2.18 * scale, 0.05, 8, '#E8643A')
      goldRim.position.y = y + 0.61
      group.add(body, waist, lowerEave, upperEave, goldRim)

      if (tier < 2) {
        for (let k = 0; k < 4; k += 1) {
          const ang = (k * Math.PI) / 2 + Math.PI / 4
          const r = 1.82 - tier * 0.26
          const lantern = sphere(0.12 - tier * 0.02, 10, '#E8643A', {
            emissive: '#FF5E2B',
            emissiveIntensity: 0.92,
          })
          lantern.position.set(Math.cos(ang) * r, y + 0.48, Math.sin(ang) * r)
          group.add(lantern)
          lanterns.push(lantern)
        }
      }
    }
    const spire = cyl(0.035, 0.22, 1.45, 10, '#F2B84B', { metal: 0.55, rough: 0.25 })
    spire.position.y = 6.28
    const finialOrb = sphere(0.16, 10, '#FFD479', { emissive: '#FFB347', emissiveIntensity: 0.65 })
    finialOrb.position.y = 5.95
    group.add(spire, finialOrb)
    updaters.push((t) => {
      lanterns.forEach((l, i) => {
        l.position.y += Math.sin(t * 2.4 + i * 1.4) * 0.0015
      })
    })
  } else if (b.style === 'factory') {
    // High-Contrast Industrial Silver (#DFE2E5) + KUKA Orange (#FF6A13) + Chimney Smoke + Robot Arm
    const indSilver = '#DFE2E5'
    const kukaOrange = '#FF6A13'
    const steelRoof = '#9EA6AE'

    const apron = box(5.2, 0.26, 4.0, '#D6CFBF', { rough: 0.78 })
    apron.position.y = 0.13
    const dockPad = box(1.85, 0.34, 1.55, '#C8BFA8', { rough: 0.72 })
    dockPad.position.set(1.58, 0.17, 0.62)
    group.add(apron, dockPad)

    const mainHall = windowedBox(3.55, 2.15, 2.72, indSilver, 4, 2, '#3C5266')
    mainHall.position.set(-0.48, 1.34, -0.08)
    const orangeWaist = box(3.62, 0.34, 2.78, kukaOrange, { rough: 0.42 })
    orangeWaist.position.set(-0.48, 1.88, -0.08)
    group.add(mainHall, orangeWaist)

    for (let c = -1; c <= 1; c += 1) {
      const steelCol = box(0.14, 2.28, 2.86, '#5A626A', { metal: 0.35, rough: 0.42 })
      steelCol.position.set(-0.48 + c * 1.22, 1.36, -0.08)
      group.add(steelCol)
    }

    // 3-Bay Metallic Sawtooth Roof
    for (let i = -1; i <= 1; i += 1) {
      const bx = -0.48 + i * 1.16
      const tooth = gable(1.14, 0.78, 2.76, steelRoof)
      tooth.position.set(bx, 2.42, -0.08)
      const skylight = box(0.46, 0.56, 2.48, '#9CD5F4', {
        emissive: '#62A8D1',
        emissiveIntensity: 0.45,
        rough: 0.2,
      })
      skylight.position.set(bx + 0.22, 2.68, -0.08)
      skylight.rotation.z = -0.58
      group.add(tooth, skylight)
    }

    // Twin industrial flues with KUKA orange band + rising multi-puff chimney smoke
    for (const [cx, cz, h] of [
      [-1.92, -0.95, 4.25],
      [-1.32, -1.08, 3.45],
    ] as const) {
      const stack = cyl(0.2, 0.32, h, 12, '#8D949B')
      stack.position.set(cx, h / 2 + 0.2, cz)
      const band = cyl(0.23, 0.25, 0.28, 12, kukaOrange)
      band.position.set(cx, h - 0.28, cz)
      group.add(stack, band)
    }

    const smokeGroup = new THREE.Group()
    smokeGroup.name = 'chimney-smoke'
    smokeGroup.position.set(-1.92, 4.45, -0.95)
    const smokePuffs: { mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial }[] = []
    for (let i = 0; i < 6; i += 1) {
      const smMat = new THREE.MeshStandardMaterial({
        color: '#FFFFFF',
        transparent: true,
        opacity: 0.65,
        roughness: 1,
        depthWrite: false,
      })
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), smMat)
      smokeGroup.add(puff)
      smokePuffs.push({ mesh: puff, mat: smMat })
    }
    group.add(smokeGroup)

    // Articulated 2-joint KUKA orange robotic arm + conveyor belt
    const conveyor = box(1.25, 0.24, 0.52, '#2B2E35', { metal: 0.3, rough: 0.45 })
    conveyor.position.set(1.58, 0.46, 1.18)
    const workCube = box(0.24, 0.24, 0.24, kukaOrange, {
      emissive: kukaOrange,
      emissiveIntensity: 0.55,
    })
    workCube.position.set(1.58, 0.68, 1.18)
    const armBase = cyl(0.38, 0.46, 0.32, 12, '#2B2E35', { metal: 0.45, rough: 0.32 })
    armBase.position.set(1.58, 0.48, 0.35)
    const shoulder = new THREE.Group()
    shoulder.position.set(1.58, 0.65, 0.35)
    const lowerArm = box(0.2, 1.05, 0.2, kukaOrange, { metal: 0.35, rough: 0.32 })
    lowerArm.position.y = 0.5
    const elbow = new THREE.Group()
    elbow.position.set(0, 1.0, 0)
    const forearm = box(0.16, 0.82, 0.16, kukaOrange, { metal: 0.35, rough: 0.38 })
    forearm.position.y = 0.38
    const tip = sphere(0.13, 10, '#2B2E35')
    tip.position.y = 0.82
    elbow.add(forearm, tip)
    shoulder.add(lowerArm, elbow)
    group.add(conveyor, workCube, armBase, shoulder)

    updaters.push((t) => {
      shoulder.rotation.y = Math.sin(t * 1.35) * 0.85
      shoulder.rotation.z = Math.sin(t * 2.7) * 0.18
      elbow.rotation.z = -0.55 + Math.cos(t * 2.7) * 0.35
      workCube.position.x = 1.58 + Math.sin(t * 1.35) * 0.32
      smokePuffs.forEach(({ mesh, mat: smMat }, idx) => {
        const u = (t * 0.38 + idx / smokePuffs.length) % 1
        mesh.position.set(Math.sin(u * 5 + idx) * 0.16, u * 1.75, -u * 0.35)
        mesh.scale.setScalar(0.55 + u * 1.35)
        smMat.opacity = Math.sin(u * Math.PI) * 0.52
      })
    })
  } else if (b.style === 'tech') {
    // High-Contrast Crisp White (#EEF1F5) & Cobalt Blue (#3D6FD6) + Giant 3D VR Headset + Cyan 3D Hologram Table + Yellow Taxi
    const crispWhite = '#EEF1F5'
    const cobaltGlass = '#3D6FD6'
    const silverTrim = '#C9D2DE'

    const baseDeck = box(4.6, 0.26, 3.6, '#D6CFBF', { rough: 0.65 })
    baseDeck.position.y = 0.13
    group.add(baseDeck)

    const mainTower = windowedBox(3.1, 3.1, 2.35, crispWhite, 4, 3, cobaltGlass)
    mainTower.position.set(-0.2, 1.8, -0.05)
    addCorniceBand(group, 3.2, 3.38, 2.45, silverTrim, -0.2, -0.05)
    group.add(mainTower)

    // Cylindrical Cobalt Glass Atrium Wing
    const atrium = cyl(0.95, 0.95, 2.85, 20, '#62A8E8', {
      opacity: 0.78,
      rough: 0.16,
      metal: 0.28,
    })
    atrium.position.set(1.32, 1.68, 0.48)
    group.add(atrium)
    for (let ringIdx = 0; ringIdx < 4; ringIdx += 1) {
      const louver = cyl(1.01, 1.01, 0.07, 20, crispWhite, { rough: 0.42 })
      louver.position.set(1.32, 0.68 + ringIdx * 0.68, 0.48)
      group.add(louver)
    }

    // Story Prop 1: Giant ExtrudeGeometry 3D VR Headset crowning the roof
    const headset = createVrHeadsetProp()
    headset.position.set(-0.15, 4.02, 0.35)
    headset.rotation.set(-0.26, 0.28, 0, 'YXZ')
    headset.scale.setScalar(0.88)
    group.add(headset)

    // Story Prop 2: Pulsing Cyan 3D Hologram City Table floating above the headset/atrium
    const holo = createHologramCityTable()
    holo.group.position.set(0.15, 5.38, 0.65)
    group.add(holo.group)

    // Story Prop 3: Miniature Yellow Taxi parked on the front plaza
    const taxi = createYellowTaxi()
    taxi.position.set(-1.62, 0.26, 1.25)
    taxi.rotation.y = 0.18
    group.add(taxi)

    updaters.push((t) => {
      holo.update(t)
      headset.position.y = 4.02 + Math.sin(t * 1.8) * 0.06
    })
  } else if (b.style === 'studio') {
    // High-Contrast Coral-Pink (#FF67A8) & Transparent Glass Pavilion + 3 People Meeting + Speech Bubbles
    const coralPink = '#FF67A8'
    const peachTrim = '#FFC5B1'
    const creamLoft = '#FFF3EC'

    const timberDeck = box(4.6, 0.24, 3.6, '#D6CFBF', { rough: 0.74 })
    timberDeck.position.y = 0.12
    group.add(timberDeck)

    const rearLoft = windowedBox(3.4, 2.05, 1.65, creamLoft, 4, 2, '#5A6B7C')
    rearLoft.position.set(0, 1.26, -0.68)
    const coralRoof = box(3.56, 0.18, 1.82, coralPink, { rough: 0.42 })
    coralRoof.position.set(0, 2.36, -0.68)
    group.add(rearLoft, coralRoof)

    // Front transparent glass meeting pavilion
    const glassFloor = box(3.2, 0.06, 1.52, '#FBE3D8')
    glassFloor.position.set(0, 0.27, 0.68)
    const glassRoofFrame = box(3.28, 0.1, 1.58, peachTrim)
    glassRoofFrame.position.set(0, 1.72, 0.68)
    const glassMat = new THREE.MeshStandardMaterial({
      color: '#FFE9F1',
      transparent: true,
      opacity: 0.3,
      roughness: 0.12,
      depthWrite: false,
    })
    const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(3.12, 1.38, 0.03), glassMat)
    frontGlass.position.set(0, 0.98, 1.42)
    group.add(glassFloor, glassRoofFrame, frontGlass)

    for (const cx of [-1.54, 1.54]) {
      for (const cz of [-0.04, 1.42]) {
        const post = box(0.08, 1.42, 0.08, '#FB5A87')
        post.position.set(cx, 0.98, cz)
        group.add(post)
      }
    }

    // Round conference table + 3 miniature people + 1 AI orb + 3 animated speech bubbles
    const tableStem = cyl(0.06, 0.08, 0.34, 10, '#D8CFC8')
    tableStem.position.set(0, 0.44, 0.68)
    const tableTop = cyl(0.44, 0.44, 0.05, 20, '#FFFFFF', { rough: 0.35 })
    tableTop.position.set(0, 0.62, 0.68)
    group.add(tableStem, tableTop)

    const suitColors = ['#3D5A80', '#6B7A8F', '#2F3E46']
    const speechGroup = new THREE.Group()
    speechGroup.name = 'speech-bubbles'
    const speechMeshes: THREE.Group[] = []

    for (let i = 0; i < 4; i += 1) {
      const ang = Math.PI / 4 + (i * Math.PI) / 2
      const px = Math.cos(ang) * 0.68
      const pz = 0.68 + Math.sin(ang) * 0.38
      if (i === 3) {
        const aiOrb = sphere(0.14, 14, coralPink, {
          emissive: coralPink,
          emissiveIntensity: 0.95,
        })
        aiOrb.position.set(px, 0.78, pz)
        group.add(aiOrb)
      } else {
        const torso = cyl(0.08, 0.1, 0.34, 10, suitColors[i])
        torso.position.set(px, 0.46, pz)
        const head = sphere(0.095, 12, '#F2C9A0')
        head.position.set(px, 0.72, pz)
        group.add(torso, head)

        const bub = new THREE.Group()
        const card = box(0.42, 0.26, 0.04, '#FFFFFF', {
          emissive: '#FFFFFF',
          emissiveIntensity: 0.35,
        })
        const line1 = box(0.28, 0.035, 0.05, coralPink)
        line1.position.set(0, 0.04, 0)
        const line2 = box(0.2, 0.035, 0.05, '#9AA3AD')
        line2.position.set(-0.04, -0.04, 0)
        bub.add(card, line1, line2)
        bub.position.set(px, 1.12, pz)
        speechGroup.add(bub)
        speechMeshes.push(bub)
      }
    }
    group.add(speechGroup)

    updaters.push((t) => {
      const cycle = t % 4.8
      speechMeshes.forEach((bub, idx) => {
        const start = 0.3 + idx * 1.15
        const env = clamp01((cycle - start) / 0.28) * (1 - clamp01((cycle - start - 1.35) / 0.25))
        bub.visible = env > 0.02
        bub.scale.setScalar(Math.max(0.001, env))
        bub.position.y = 1.08 + env * 0.08
      })
    })
  } else if (b.style === 'uni-gothic') {
    // Gothic Collegiate Quad + Twin Spires + Animated Mechanical Clock Tower (gothic-clock)
    const limestone = '#DED6C6'
    const slateRoof = '#2E3A46'
    const stainedGlass = '#4C7BD9'

    const quadBase = box(5.2, 0.24, 4.1, '#C8BFA8', { rough: 0.76 })
    quadBase.position.y = 0.12
    const cloister = windowedBox(4.1, 2.2, 2.5, limestone, 5, 2, stainedGlass)
    cloister.position.set(0, 1.32, -0.1)
    const naveRoof = gable(4.35, 1.05, 2.75, slateRoof)
    naveRoof.position.set(0, 2.42, -0.1)
    group.add(quadBase, cloister, naveRoof)

    for (const side of [-1, 1]) {
      const tower = windowedBox(1.18, 3.45, 1.18, limestone, 2, 3, stainedGlass)
      tower.position.set(side * 1.65, 1.95, 0.55)
      const spire = pyramid(1.32, 1.65, 1.32, slateRoof)
      spire.position.set(side * 1.65, 4.5, 0.55)
      group.add(tower, spire)
      addMiniTree(group, side * 2.1, 0.24, 1.55, leafColor, 0.9)
    }

    // Central Clock Belfry + Animated Clock Hands (gothic-clock)
    const belfry = box(1.25, 4.35, 1.25, '#E8E1D3', { rough: 0.65 })
    belfry.position.set(0, 2.4, 0.45)
    const belfrySpire = pyramid(1.42, 1.85, 1.42, slateRoof)
    belfrySpire.position.set(0, 5.5, 0.45)
    const clockGroup = new THREE.Group()
    clockGroup.name = 'gothic-clock'
    clockGroup.position.set(0, 3.85, 1.1)
    const dial = cyl(0.42, 0.42, 0.06, 20, '#FAF6EE', {
      emissive: '#FFF2C6',
      emissiveIntensity: 0.55,
    })
    dial.rotation.x = Math.PI / 2
    const hourHand = box(0.05, 0.24, 0.04, '#1C1F1A')
    hourHand.position.set(0, 0.08, 0.04)
    const minHand = new THREE.Group()
    const minBar = box(0.04, 0.34, 0.04, accent)
    minBar.position.set(0, 0.14, 0.05)
    minHand.add(minBar)
    clockGroup.add(dial, hourHand, minHand)
    group.add(belfry, belfrySpire, clockGroup)
    updaters.push((t) => {
      minHand.rotation.z = -t * 0.85
    })
  } else if (b.style === 'uni-modern') {
    // Cantilevered Modern Glass Library & Science Cube + Sun-Tracking Solar Array (solar-tracker)
    const concreteWhite = '#F2F4F7'
    const cyanGlass = '#3898EC'
    const darkFrame = '#222831'

    const plinth = box(5.1, 0.24, 3.9, '#D8DCE2', { rough: 0.65 })
    plinth.position.y = 0.12
    const lowerHall = windowedBox(3.8, 1.65, 2.5, concreteWhite, 5, 2, cyanGlass)
    lowerHall.position.set(-0.25, 1.06, 0)
    const cantileverCube = windowedBox(3.4, 1.75, 2.65, darkFrame, 4, 2, '#64B5F6')
    cantileverCube.position.set(0.45, 2.76, 0.18)
    const roofSlab = box(3.65, 0.16, 2.85, concreteWhite)
    roofSlab.position.set(0.45, 3.72, 0.18)
    group.add(plinth, lowerHall, cantileverCube, roofSlab)

    const solarGroup = new THREE.Group()
    solarGroup.name = 'solar-tracker'
    solarGroup.position.set(0.45, 3.85, 0.18)
    const panels: THREE.Mesh[] = []
    for (let i = -1; i <= 1; i += 1) {
      const post = cyl(0.05, 0.06, 0.42, 8, darkFrame)
      post.position.set(i * 1.02, 0.2, 0)
      const panel = box(0.84, 0.05, 1.35, '#1D4ED8', {
        metal: 0.55,
        rough: 0.2,
        emissive: '#2563EB',
        emissiveIntensity: 0.25,
      })
      panel.position.set(i * 1.02, 0.45, 0)
      solarGroup.add(post, panel)
      panels.push(panel)
    }
    const redSculpt = new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.32, 0.08, 36, 8),
      mat(accent, { rough: 0.3, metal: 0.25 }),
    )
    redSculpt.position.set(-1.55, 0.72, 1.25)
    group.add(solarGroup, redSculpt)
    updaters.push((t) => {
      panels.forEach((p, idx) => {
        p.rotation.z = Math.sin(t * 0.9 + idx * 0.4) * 0.36
      })
      redSculpt.rotation.y = t * 0.65
    })
  } else if (b.style === 'uni-academy') {
    // Classical Oriental Scholar Academy Courtyard (书院天井四合院 + 翠竹林 + 悬浮金书卷)
    const warmPlaster = '#F5F0E6'
    const inkTile = '#2F3632'
    const timberRed = '#8E3524'
    const bambooGreen = '#4E8C57'

    const courtyardBase = box(5.2, 0.24, 4.2, '#D5CEC0', { rough: 0.78 })
    courtyardBase.position.y = 0.12
    const reflectPool = box(1.85, 0.08, 1.35, '#59B4C2', {
      rough: 0.18,
      metal: 0.12,
      emissive: '#3898A6',
      emissiveIntensity: 0.2,
    })
    reflectPool.position.set(0, 0.25, 0.15)
    group.add(courtyardBase, reflectPool)

    // Main Lecture Hall (讲堂) at rear + East/West Cloister Wings (东西斋舍)
    const lectureHall = windowedBox(3.6, 2.05, 1.65, warmPlaster, 4, 2, timberRed)
    lectureHall.position.set(0, 1.26, -1.05)
    const hallRoof = gable(4.05, 0.86, 2.05, inkTile)
    hallRoof.position.set(0, 2.28, -1.05)
    group.add(lectureHall, hallRoof)

    for (const side of [-1, 1] as const) {
      const wing = windowedBox(1.15, 1.55, 2.25, warmPlaster, 2, 2, timberRed)
      wing.position.set(side * 1.82, 1.0, 0.25)
      const wingRoof = gable(1.42, 0.62, 2.52, inkTile)
      wingRoof.position.set(side * 1.82, 1.78, 0.25)
      group.add(wing, wingRoof)
    }

    // Swaying Bamboo Grove (bamboo-grove) + Floating Golden Scroll
    const bambooGroup = new THREE.Group()
    bambooGroup.name = 'bamboo-grove'
    bambooGroup.position.set(-1.35, 0.24, 1.48)
    for (let i = 0; i < 5; i += 1) {
      const stalk = cyl(0.035, 0.045, 1.55 + (i % 2) * 0.35, 8, bambooGreen)
      stalk.position.set((i - 2) * 0.18, 0.78, (i % 2) * 0.14)
      const crownLeaves = sphere(0.28, 10, '#68B672')
      crownLeaves.scale.set(1.3, 0.65, 1.1)
      crownLeaves.position.set((i - 2) * 0.18, 1.55 + (i % 2) * 0.28, (i % 2) * 0.14)
      bambooGroup.add(stalk, crownLeaves)
    }
    const scrollGroup = new THREE.Group()
    scrollGroup.name = 'academy-courtyard'
    scrollGroup.position.set(0, 1.35, 0.15)
    const parchment = box(0.92, 0.06, 0.56, '#FFF5D6', {
      emissive: '#FFD27D',
      emissiveIntensity: 0.45,
    })
    const rollerL = cyl(0.055, 0.055, 0.68, 10, timberRed)
    rollerL.rotation.x = Math.PI / 2
    rollerL.position.x = -0.46
    const rollerR = cyl(0.055, 0.055, 0.68, 10, timberRed)
    rollerR.rotation.x = Math.PI / 2
    rollerR.position.x = 0.46
    scrollGroup.add(parchment, rollerL, rollerR)
    group.add(bambooGroup, scrollGroup)

    updaters.push((t) => {
      bambooGroup.rotation.z = Math.sin(t * 1.8) * 0.06
      scrollGroup.position.y = 1.32 + Math.sin(t * 2.2) * 0.1
      scrollGroup.rotation.y = Math.sin(t * 0.8) * 0.25
    })
  } else if (b.style === 'b612-rose-hill') {
    // Little Prince B-612 Rose Hill & Glass Bell-Jar Dome (inspired by @Saccc_c tutorial)
    const meadowGreen = '#7BC47F'
    const mossStone = '#7E877B'
    const roseRed = '#F43F5E'
    const starGold = '#FBBF24'

    // Curved B-612 Hillside Mound
    const hillMound = sphere(2.55, 24, meadowGreen, { rough: 0.72 })
    hillMound.scale.set(1.05, 0.48, 0.92)
    hillMound.position.set(0, 0.12, 0)
    const stoneRim = cyl(2.62, 2.78, 0.24, 24, '#C8BFA8', { rough: 0.82 })
    stoneRim.position.y = 0.12
    group.add(stoneRim, hillMound)

    // Half-buried T1/T2 multi-faceted moss-rock boulders around the hillside
    for (const [rx, ry, rz, rs] of [
      [-1.55, 0.52, -0.65, 0.58],
      [1.48, 0.48, -0.52, 0.52],
      [-1.25, 0.42, 0.95, 0.42],
      [1.35, 0.44, 0.88, 0.46],
    ] as const) {
      const boulder = new THREE.Mesh(
        new THREE.DodecahedronGeometry(rs, 0),
        mat(mossStone, { rough: 0.88, flat: true }),
      )
      boulder.scale.set(1.2, 0.78, 1.0)
      boulder.position.set(rx, ry, rz)
      boulder.rotation.set(rx * 0.4, rz * 0.6, 0.2)
      const mossCap = sphere(rs * 0.75, 8, '#5E9E6E', { rough: 0.75 })
      mossCap.scale.set(1.15, 0.38, 0.95)
      mossCap.position.set(rx, ry + rs * 0.48, rz)
      group.add(boulder, mossCap)
    }

    // Central Glowing Rose inside Translucent Glass Bell-Jar Dome (b612-rose-dome)
    const roseDomeGroup = new THREE.Group()
    roseDomeGroup.name = 'b612-rose-dome'
    roseDomeGroup.position.set(0, 1.22, -0.1)

    const pedestal = cyl(1.08, 1.22, 0.28, 20, '#EDE4D3')
    pedestal.position.y = 0.14
    const stem = cyl(0.055, 0.07, 1.18, 8, '#2E7D32')
    stem.position.y = 0.78
    const leafL = sphere(0.22, 8, '#43A047')
    leafL.scale.set(1.4, 0.35, 0.65)
    leafL.position.set(-0.2, 0.72, 0)
    leafL.rotation.z = 0.35
    const leafR = sphere(0.22, 8, '#43A047')
    leafR.scale.set(1.4, 0.35, 0.65)
    leafR.position.set(0.2, 0.86, 0)
    leafR.rotation.z = -0.35

    const roseHead = new THREE.Group()
    roseHead.position.y = 1.42
    const coreBud = sphere(0.32, 14, roseRed, {
      emissive: roseRed,
      emissiveIntensity: 0.68,
    })
    roseHead.add(coreBud)
    for (let p = 0; p < 5; p += 1) {
      const pa = (p / 5) * Math.PI * 2
      const petal = sphere(0.24, 10, '#FB7185', {
        emissive: roseRed,
        emissiveIntensity: 0.42,
      })
      petal.scale.set(1.1, 0.85, 0.48)
      petal.position.set(Math.cos(pa) * 0.22, 0.02, Math.sin(pa) * 0.22)
      petal.rotation.y = -pa
      roseHead.add(petal)
    }

    const glassBell = cyl(0.88, 0.92, 1.65, 20, '#E0F2FE', {
      opacity: 0.38,
      rough: 0.12,
      metal: 0.15,
      emissive: '#BAE6FD',
      emissiveIntensity: 0.22,
    })
    glassBell.position.y = 1.08
    const glassCap = dome(0.88, '#E0F2FE', {
      opacity: 0.38,
      rough: 0.12,
      metal: 0.15,
      emissive: '#BAE6FD',
      emissiveIntensity: 0.22,
    })
    glassCap.position.y = 1.9
    const goldKnob = sphere(0.14, 12, starGold, {
      emissive: starGold,
      emissiveIntensity: 0.85,
    })
    goldKnob.position.y = 2.82

    // Orbiting Little Prince Star Halo
    const starHalo = new THREE.Mesh(
      new THREE.TorusGeometry(1.38, 0.045, 10, 36),
      mat(starGold, { emissive: starGold, emissiveIntensity: 0.82 }),
    )
    starHalo.rotation.x = 1.18
    starHalo.position.y = 1.35

    roseDomeGroup.add(pedestal, stem, leafL, leafR, roseHead, glassBell, glassCap, goldKnob, starHalo)
    group.add(roseDomeGroup)

    updaters.push((t) => {
      roseHead.rotation.y = t * 0.65
      roseHead.position.y = 1.42 + Math.sin(t * 2.2) * 0.06
      starHalo.rotation.z = t * 0.55
    })
  } else if (b.style === 'watertown') {
    // Jiangnan White-Wall & Black-Tile Canal Courtyard + Stone Arch Bridge + Rocking Wupeng Boat (wupeng-boat)
    const whiteWall = '#F9F8F3'
    const darkTile = '#2D3339'
    const canalWater = '#52B2BF'

    const stoneTerrace = box(5.1, 0.22, 4.1, '#CBC4B4', { rough: 0.8 })
    stoneTerrace.position.y = 0.11
    const canal = box(4.9, 0.12, 1.28, canalWater, {
      rough: 0.18,
      metal: 0.1,
      emissive: '#3898A6',
      emissiveIntensity: 0.18,
    })
    canal.position.set(0, 0.18, 0.95)
    group.add(stoneTerrace, canal)

    // Stepped Ma-Tou-Qiang (Horse-Head Gables) White Courtyard Houses
    for (const [hx, hz, w, h, d] of [
      [-1.15, -0.65, 2.1, 2.25, 1.85],
      [1.05, -0.55, 1.95, 1.85, 1.75],
    ] as const) {
      const house = windowedBox(w, h, d, whiteWall, 3, 2, '#5E4B3C')
      house.position.set(hx, 0.22 + h / 2, hz)
      const roofMesh = gable(w + 0.28, 0.72, d + 0.28, darkTile)
      roofMesh.position.set(hx, 0.22 + h, hz)
      const gableWallL = box(0.12, h + 0.52, d + 0.12, whiteWall)
      gableWallL.position.set(hx - w / 2 - 0.04, 0.22 + (h + 0.52) / 2, hz)
      const gableWallR = box(0.12, h + 0.52, d + 0.12, whiteWall)
      gableWallR.position.set(hx + w / 2 + 0.04, 0.22 + (h + 0.52) / 2, hz)
      group.add(house, roofMesh, gableWallL, gableWallR)
    }

    // Miniature Canal Stone Arch Bridge + Wupeng Boat
    const bridgeArch = new THREE.Group()
    bridgeArch.name = 'canal-arch-bridge'
    for (let i = 0; i < 5; i += 1) {
      const u = i / 4
      const step = box(0.95, 0.14, 0.36, '#B6AFA0')
      step.position.set(-0.2, 0.28 + Math.sin(u * Math.PI) * 0.38, 0.3 + u * 1.3)
      bridgeArch.add(step)
    }
    const boat = new THREE.Group()
    boat.name = 'wupeng-boat'
    const hull = box(0.92, 0.14, 0.38, '#5C4028')
    const canopy = cyl(0.18, 0.18, 0.52, 8, '#2B2D2F')
    canopy.rotation.z = Math.PI / 2
    canopy.position.y = 0.14
    boat.add(hull, canopy)
    boat.position.set(1.15, 0.25, 0.95)
    group.add(bridgeArch, boat)
    addMiniTree(group, -2.05, 0.22, 0.2, '#6BA85B', 0.95)
    updaters.push((t) => {
      boat.position.x = 1.05 + Math.sin(t * 1.1) * 0.45
      boat.rotation.z = Math.sin(t * 2.2) * 0.05
    })
  } else if (b.style === 'coastal-town') {
    // Mediterranean White-and-Blue Terraced Villas + Terracotta Roofs + Rotating Lighthouse Beacon (coastal-beacon)
    const villaWhite = '#FAF8F5'
    const santoriniBlue = '#2864B8'
    const terraTile = '#C85A38'

    const cliffPad = box(5.0, 0.28, 3.9, '#D8CEBE', { rough: 0.78 })
    cliffPad.position.y = 0.14
    const villaMain = windowedBox(2.5, 2.15, 2.05, villaWhite, 3, 2, santoriniBlue)
    villaMain.position.set(-0.75, 1.34, -0.25)
    const terraRoof = pyramid(2.75, 0.72, 2.3, terraTile)
    terraRoof.position.set(-0.75, 2.78, -0.25)
    const blueChapel = box(1.55, 1.55, 1.55, villaWhite)
    blueChapel.position.set(1.15, 1.05, 0.25)
    const chapelDome = dome(0.72, santoriniBlue, { rough: 0.38 })
    chapelDome.position.set(1.15, 1.82, 0.25)
    group.add(cliffPad, villaMain, terraRoof, blueChapel, chapelDome)

    // Coastal Bell & Lighthouse Tower + Rotating Beacon
    const towerShaft = cyl(0.42, 0.55, 3.65, 12, villaWhite)
    towerShaft.position.set(1.35, 2.05, -0.95)
    const redStripe = cyl(0.46, 0.49, 0.55, 12, accent)
    redStripe.position.set(1.35, 2.65, -0.95)
    const beacon = new THREE.Group()
    beacon.name = 'coastal-beacon'
    beacon.position.set(1.35, 4.02, -0.95)
    const lantern = sphere(0.24, 12, '#FFF3B0', { emissive: '#FFCC33', emissiveIntensity: 0.95 })
    const beam = cyl(0.06, 0.38, 1.35, 10, '#FFF6C2', {
      opacity: 0.38,
      emissive: '#FFE066',
      emissiveIntensity: 0.65,
    })
    beam.rotation.z = Math.PI / 2
    beam.position.x = 0.68
    beacon.add(lantern, beam)
    group.add(towerShaft, redStripe, beacon)
    updaters.push((t) => {
      beacon.rotation.y = t * 1.4
    })
  } else if (b.style === 'metro-landmark') {
    // Modern Metropolis Dual-Sphere TV Observation Tower (metro-tv-tower) + Skybridge Podium
    const silverSteel = '#E2E7EC'
    const rubySphere = '#E03B5B'

    const metroPlaza = box(5.0, 0.26, 3.9, '#D2D7DC', { rough: 0.68 })
    metroPlaza.position.y = 0.13
    const podiumLeft = windowedBox(1.85, 2.05, 1.85, '#2A384C', 3, 3, '#7CC8F8')
    podiumLeft.position.set(-1.35, 1.28, -0.25)
    const podiumRight = windowedBox(1.65, 2.55, 1.75, '#1E293B', 3, 4, '#93C5FD')
    podiumRight.position.set(1.45, 1.52, -0.35)
    group.add(metroPlaza, podiumLeft, podiumRight)

    const tvTower = new THREE.Group()
    tvTower.name = 'metro-tv-tower'
    tvTower.position.set(0, 0.26, 0.25)
    const legCol = cyl(0.24, 0.56, 4.85, 12, silverSteel, { metal: 0.35, rough: 0.32 })
    legCol.position.y = 2.42
    const lowerSphere = sphere(0.68, 16, rubySphere, {
      rough: 0.28,
      metal: 0.22,
      emissive: rubySphere,
      emissiveIntensity: 0.25,
    })
    lowerSphere.position.y = 1.95
    const upperSphere = sphere(0.46, 16, rubySphere, {
      rough: 0.28,
      metal: 0.22,
      emissive: rubySphere,
      emissiveIntensity: 0.35,
    })
    upperSphere.position.y = 3.75
    const obsRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.62, 0.06, 8, 24),
      mat('#38BDF8', { emissive: '#38BDF8', emissiveIntensity: 0.75 }),
    )
    obsRing.rotation.x = Math.PI / 2
    obsRing.position.y = 3.75
    const antenna = cyl(0.025, 0.08, 1.55, 8, silverSteel)
    antenna.position.y = 5.45
    tvTower.add(legCol, lowerSphere, upperSphere, obsRing, antenna)
    group.add(tvTower)
    updaters.push((t) => {
      obsRing.rotation.z = t * 1.2
      obsRing.scale.setScalar(1 + Math.sin(t * 2.5) * 0.06)
    })
  } else if (b.style === 'biotech') {
    // Emerald Stepped Biotech & Life-Science HQ + Spinning Double-Helix DNA Sculpture (dna-helix)
    const emeraldGlass = '#1E6B52'
    const mintTerrace = '#DFEFE8'

    const bioBase = box(5.0, 0.26, 3.9, '#D4DDD8', { rough: 0.7 })
    bioBase.position.y = 0.13
    const tier1 = windowedBox(3.8, 1.35, 2.75, mintTerrace, 5, 1, emeraldGlass)
    tier1.position.set(0, 0.94, 0)
    const tier2 = windowedBox(3.0, 1.35, 2.2, mintTerrace, 4, 1, emeraldGlass)
    tier2.position.set(-0.2, 2.28, -0.1)
    const tier3 = windowedBox(2.2, 1.25, 1.75, mintTerrace, 3, 1, emeraldGlass)
    tier3.position.set(-0.35, 3.58, -0.18)
    const bioDome = dome(0.85, '#6EE7B7', {
      rough: 0.2,
      opacity: 0.75,
      emissive: '#34D399',
      emissiveIntensity: 0.25,
    })
    bioDome.position.set(1.15, 1.62, 0.35)
    group.add(bioBase, tier1, tier2, tier3, bioDome)
    addMiniTree(group, 1.05, 1.62, -0.35, '#34D399', 0.75)

    // Rooftop Spinning Double-Helix DNA Sculpture (dna-helix)
    const dnaGroup = new THREE.Group()
    dnaGroup.name = 'dna-helix'
    dnaGroup.position.set(-0.35, 4.95, -0.18)
    for (let i = 0; i < 8; i += 1) {
      const y = (i - 3.5) * 0.18
      const ang = i * 0.65
      const r = 0.36
      const s1 = sphere(0.085, 10, '#10B981', { emissive: '#10B981', emissiveIntensity: 0.65 })
      s1.position.set(Math.cos(ang) * r, y, Math.sin(ang) * r)
      const s2 = sphere(0.085, 10, accent, { emissive: accent, emissiveIntensity: 0.65 })
      s2.position.set(-Math.cos(ang) * r, y, -Math.sin(ang) * r)
      const rung = box(r * 2, 0.03, 0.03, '#E2E8F0')
      rung.position.y = y
      rung.rotation.y = -ang
      dnaGroup.add(s1, s2, rung)
    }
    group.add(dnaGroup)
    updaters.push((t) => {
      dnaGroup.rotation.y = t * 1.15
    })
  } else if (b.style === 'game-arcade') {
    // Pixel/Arcade Creative Game Studio + Giant Floating 3D Gamepad Controller (giant-gamepad)
    const arcadePurple = '#2E1F5E'
    const cyberYellow = '#FACC15'
    const neonMagenta = '#EC4899'

    const arcadePad = box(4.9, 0.26, 3.8, '#D6CFBF', { rough: 0.7 })
    arcadePad.position.y = 0.13
    const mainBox = windowedBox(3.45, 2.65, 2.45, arcadePurple, 4, 3, '#60A5FA')
    mainBox.position.set(0, 1.58, -0.05)
    const neonTrim = box(3.58, 0.18, 2.58, neonMagenta, {
      emissive: neonMagenta,
      emissiveIntensity: 0.65,
    })
    neonTrim.position.set(0, 2.95, -0.05)
    const sideArcade = box(1.15, 1.85, 1.65, cyberYellow, { rough: 0.45 })
    sideArcade.position.set(1.85, 1.18, 0.25)
    group.add(arcadePad, mainBox, neonTrim, sideArcade)

    // Giant Floating 3D Gamepad Controller on the Roof (giant-gamepad)
    const padGroup = new THREE.Group()
    padGroup.name = 'giant-gamepad'
    padGroup.position.set(0, 3.95, 0.1)
    const padBody = box(1.65, 0.56, 0.32, '#F8FAFC', { rough: 0.35 })
    const gripL = cyl(0.22, 0.28, 0.78, 12, '#F8FAFC')
    gripL.position.set(-0.68, -0.22, 0)
    gripL.rotation.z = 0.32
    const gripR = cyl(0.22, 0.28, 0.78, 12, '#F8FAFC')
    gripR.position.set(0.68, -0.22, 0)
    gripR.rotation.z = -0.32
    const dpadH = box(0.34, 0.1, 0.08, '#1E293B')
    dpadH.position.set(-0.45, 0.04, 0.18)
    const dpadV = box(0.1, 0.34, 0.08, '#1E293B')
    dpadV.position.set(-0.45, 0.04, 0.18)
    const btnA = sphere(0.09, 10, '#EF4444', { emissive: '#EF4444', emissiveIntensity: 0.6 })
    btnA.position.set(0.38, -0.05, 0.18)
    const btnB = sphere(0.09, 10, '#3B82F6', { emissive: '#3B82F6', emissiveIntensity: 0.6 })
    btnB.position.set(0.55, 0.1, 0.18)
    padGroup.add(padBody, gripL, gripR, dpadH, dpadV, btnA, btnB)
    group.add(padGroup)
    updaters.push((t) => {
      padGroup.position.y = 3.95 + Math.sin(t * 2.1) * 0.12
      padGroup.rotation.z = Math.sin(t * 1.4) * 0.12
      padGroup.rotation.y = Math.cos(t * 1.1) * 0.18
    })
  } else if (b.style === 'cloud-logistics') {
    // E-Commerce & Cloud-Native Campus + Hovering Quadcopter Delivery Drone (delivery-drone)
    const cloudWhite = '#F4F6F9'
    const brandOrange = '#F97316'

    const hubApron = box(5.1, 0.26, 4.0, '#D6CFBF', { rough: 0.72 })
    hubApron.position.y = 0.13
    const curvedHub = cyl(1.85, 1.95, 2.25, 24, cloudWhite, { rough: 0.48 })
    curvedHub.scale.set(1.15, 1, 0.82)
    curvedHub.position.set(-0.25, 1.38, -0.1)
    const orangeRing = cyl(1.92, 1.92, 0.24, 24, brandOrange)
    orangeRing.scale.set(1.15, 1, 0.82)
    orangeRing.position.set(-0.25, 2.25, -0.1)
    const helipad = cyl(0.92, 0.98, 0.12, 20, '#334155')
    helipad.position.set(-0.25, 2.56, -0.1)
    group.add(hubApron, curvedHub, orangeRing, helipad)

    // Hovering Quadcopter Delivery Drone (delivery-drone)
    const drone = new THREE.Group()
    drone.name = 'delivery-drone'
    drone.position.set(-0.25, 3.65, -0.1)
    const core = box(0.48, 0.18, 0.48, '#1E293B')
    const parcel = box(0.32, 0.26, 0.32, brandOrange)
    parcel.position.y = -0.22
    drone.add(core, parcel)
    for (const [rx, rz] of [
      [-0.42, -0.42],
      [0.42, -0.42],
      [-0.42, 0.42],
      [0.42, 0.42],
    ] as const) {
      const arm = box(0.42, 0.04, 0.05, '#94A3B8')
      arm.position.set(rx * 0.5, 0.04, rz * 0.5)
      arm.rotation.y = Math.atan2(rx, rz)
      const rotor = cyl(0.22, 0.22, 0.02, 12, '#38BDF8', {
        opacity: 0.65,
        emissive: '#38BDF8',
        emissiveIntensity: 0.45,
      })
      rotor.position.set(rx, 0.09, rz)
      drone.add(arm, rotor)
    }
    group.add(drone)
    updaters.push((t) => {
      drone.position.y = 3.55 + Math.sin(t * 2.4) * 0.28
      drone.position.x = -0.25 + Math.cos(t * 1.2) * 0.35
      drone.rotation.z = Math.sin(t * 1.2) * 0.1
    })
  } else if (b.style === 'indie-lab') {
    // Open-Source Geek Timber Cabin Lab + Rotating Deep-Space Satellite Dish (satellite-dish)
    const warmTimber = '#B87B4B'
    const charcoalRoof = '#272C33'

    const deck = box(4.8, 0.24, 3.7, '#CBBFA8', { rough: 0.78 })
    deck.position.y = 0.12
    const cabin = windowedBox(3.15, 1.95, 2.25, warmTimber, 3, 2, '#FFE4A0')
    cabin.position.set(-0.35, 1.22, -0.1)
    const cabinRoof = gable(3.45, 0.95, 2.55, charcoalRoof)
    cabinRoof.position.set(-0.35, 2.2, -0.1)
    const glassGreenhouse = box(1.35, 1.45, 1.75, '#88D4E8', { opacity: 0.55, rough: 0.18 })
    glassGreenhouse.position.set(1.45, 0.96, 0.15)
    group.add(deck, cabin, cabinRoof, glassGreenhouse)

    // Rotating Deep-Space Satellite Dish (satellite-dish)
    const dishMount = cyl(0.12, 0.18, 0.55, 8, '#475569')
    dishMount.position.set(-0.85, 3.15, -0.1)
    const dishGroup = new THREE.Group()
    dishGroup.name = 'satellite-dish'
    dishGroup.position.set(-0.85, 3.52, -0.1)
    const dishBowl = cyl(0.68, 0.14, 0.28, 16, '#F1F5F9', { rough: 0.35, metal: 0.25 })
    dishBowl.rotation.x = 0.55
    const feedHorn = cyl(0.03, 0.03, 0.48, 8, accent)
    feedHorn.rotation.x = 0.55
    feedHorn.position.set(0, 0.22, 0.16)
    dishGroup.add(dishBowl, feedHorn)
    const bike = createMiniBicycle()
    bike.position.set(1.45, 0.24, 1.38)
    group.add(dishMount, dishGroup, bike)
    updaters.push((t) => {
      dishGroup.rotation.y = Math.sin(t * 0.75) * 0.85
    })
  } else if (b.style === 'uni-observatory') {
    // 5. Astronomical Observatory Academy + Rotating Silver Dome & Radio Telescope (`observatory-dome`)
    const plinth = box(5.0, 0.26, 3.9, '#CBD5E1', { rough: 0.7 })
    plinth.position.y = 0.13
    const mainHall = windowedBox(3.6, 1.85, 2.4, '#E2E8F0', 4, 2, '#1E3A8A')
    mainHall.position.set(-0.35, 1.18, -0.1)
    const drum = cyl(1.25, 1.32, 1.25, 20, '#F8FAFC', { rough: 0.45 })
    drum.position.set(-0.35, 2.65, -0.1)
    const domeGroup = new THREE.Group()
    domeGroup.name = 'observatory-dome'
    domeGroup.position.set(-0.35, 3.25, -0.1)
    const obsDome = dome(1.26, '#E2E8F0', { rough: 0.25, metal: 0.45 })
    const scopeTube = cyl(0.14, 0.18, 1.45, 12, '#F59E0B', { rough: 0.3, metal: 0.65 })
    scopeTube.rotation.z = -0.62
    scopeTube.position.set(0.65, 0.75, 0)
    domeGroup.add(obsDome, scopeTube)
    const sideWing = box(1.45, 1.45, 1.85, '#1E3A8A', { rough: 0.5 })
    sideWing.position.set(1.55, 0.98, 0.15)
    const armillary = new THREE.Mesh(
      new THREE.TorusGeometry(0.45, 0.05, 10, 24),
      mat('#F59E0B', { emissive: '#D97706', emissiveIntensity: 0.5, metal: 0.6 }),
    )
    armillary.position.set(1.55, 2.25, 0.15)
    group.add(plinth, mainHall, drum, domeGroup, sideWing, armillary)
    addMiniTree(group, -2.05, 0.26, 1.35, leafColor, 0.9)
    updaters.push((t) => {
      domeGroup.rotation.y = Math.sin(t * 0.55) * 0.85
      armillary.rotation.y = t * 1.1
      armillary.rotation.x = Math.sin(t * 0.8) * 0.4
    })
  } else if (b.style === 'uni-art-bauhaus') {
    // 6. Bauhaus Art & Design School + Mondrian Primary-Color Curtain Wall & Kinetic Mobile (`bauhaus-mobile`)
    const plinth = box(5.1, 0.24, 3.9, '#E5E0D5', { rough: 0.75 })
    plinth.position.y = 0.12
    const studioCube = windowedBox(3.3, 2.45, 2.35, '#FAF8F5', 4, 3, '#1E293B')
    studioCube.position.set(-0.45, 1.46, -0.1)
    const redPanel = box(1.15, 1.15, 0.12, '#E11D48', { rough: 0.4 })
    redPanel.position.set(-1.15, 2.05, 1.12)
    const bluePanel = box(1.15, 0.95, 0.12, '#2563EB', { rough: 0.4 })
    bluePanel.position.set(0.25, 1.15, 1.12)
    const yellowPanel = box(0.95, 0.85, 0.12, '#FACC15', {
      rough: 0.35,
      emissive: '#EAB308',
      emissiveIntensity: 0.3,
    })
    yellowPanel.position.set(1.45, 2.15, 0.35)
    const sawRoof = gable(3.4, 0.68, 2.4, '#1E293B')
    sawRoof.position.set(-0.45, 3.02, -0.1)
    const mobileGrp = new THREE.Group()
    mobileGrp.name = 'bauhaus-mobile'
    mobileGrp.position.set(1.45, 1.45, 0.35)
    const pedestal = cyl(0.38, 0.46, 0.85, 12, '#334155')
    pedestal.position.y = -0.82
    const ringSculpt = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.08, 12, 24),
      mat('#E11D48', { rough: 0.3, metal: 0.3 }),
    )
    const sphereSculpt = sphere(0.26, 12, '#38BDF8', { emissive: '#0284C7', emissiveIntensity: 0.5 })
    mobileGrp.add(pedestal, ringSculpt, sphereSculpt)
    group.add(plinth, studioCube, redPanel, bluePanel, yellowPanel, sawRoof, mobileGrp)
    updaters.push((t) => {
      ringSculpt.rotation.y = t * 1.2
      ringSculpt.rotation.z = Math.sin(t * 0.9) * 0.35
    })
  } else if (b.style === 'uni-gate-palace') {
    // 7. Classical Chinese Imperial University Hall + Marble 3-Bay Paifang Archway (`palace-paifang`)
    const plinth = box(5.2, 0.28, 4.1, '#E2DDD2', { rough: 0.78 })
    plinth.position.y = 0.14
    const crimsonHall = windowedBox(3.9, 2.05, 2.35, '#9B2C2C', 5, 2, '#FDE68A')
    crimsonHall.position.set(0, 1.3, -0.35)
    const lowerEave = pyramid(4.65, 0.68, 3.05, '#D69E2E', { rough: 0.45 })
    lowerEave.position.set(0, 2.58, -0.35)
    const upperHall = box(2.65, 0.85, 1.65, '#9B2C2C')
    upperHall.position.set(0, 3.15, -0.35)
    const imperialRoof = gable(3.35, 0.88, 2.15, '#D69E2E')
    imperialRoof.position.set(0, 3.85, -0.35)

    // White Marble 3-Bay Paifang Gate at front plaza
    const paifang = new THREE.Group()
    paifang.name = 'palace-paifang'
    paifang.position.set(0, 0.28, 1.45)
    for (const px of [-1.35, -0.45, 0.45, 1.35]) {
      const col = cyl(0.08, 0.09, 1.65, 10, '#F8FAFC')
      col.position.set(px, 0.82, 0)
      paifang.add(col)
    }
    const lintel1 = box(3.1, 0.18, 0.28, '#F8FAFC')
    lintel1.position.y = 1.45
    const centerCap = gable(1.25, 0.38, 0.42, '#9B2C2C')
    centerCap.position.y = 1.78
    paifang.add(lintel1, centerCap)
    group.add(plinth, crimsonHall, lowerEave, upperHall, imperialRoof, paifang)
  } else if (b.style === 'uni-conservatory') {
    // 8. Classical Symphony Conservatory + Golden Harp Glass Rotunda (`golden-harp`)
    const plinth = box(5.0, 0.26, 3.9, '#EFECE6', { rough: 0.7 })
    plinth.position.y = 0.13
    const rotunda = cyl(1.75, 1.85, 2.15, 24, '#FFFBEB', { rough: 0.55 })
    rotunda.position.set(0, 1.32, -0.15)
    const glassDome = dome(1.68, '#93C5FD', {
      rough: 0.15,
      metal: 0.25,
      opacity: 0.62,
      emissive: '#3B82F6',
      emissiveIntensity: 0.25,
    })
    glassDome.position.set(0, 2.38, -0.15)
    const harpGroup = new THREE.Group()
    harpGroup.name = 'golden-harp'
    harpGroup.position.set(0, 4.18, -0.15)
    const harpFrame = new THREE.Mesh(
      new THREE.TorusGeometry(0.52, 0.07, 10, 20, Math.PI * 1.35),
      mat('#F59E0B', { emissive: '#D97706', emissiveIntensity: 0.65, metal: 0.7 }),
    )
    const harpPillar = cyl(0.05, 0.06, 1.05, 8, '#FDE047', {
      emissive: '#F59E0B',
      emissiveIntensity: 0.6,
    })
    harpPillar.position.set(-0.38, 0, 0)
    harpGroup.add(harpFrame, harpPillar)
    for (let c = -2; c <= 2; c += 1) {
      const col = cyl(0.09, 0.11, 2.05, 10, '#FAF8F5')
      col.position.set(c * 0.58, 1.28, 1.55)
      group.add(col)
    }
    group.add(plinth, rotunda, glassDome, harpGroup)
    updaters.push((t) => {
      harpGroup.rotation.y = t * 0.95
      harpGroup.position.y = 4.18 + Math.sin(t * 2.2) * 0.08
    })
  } else if (b.style === 'siheyuan-courtyard') {
    // 9. Iconic Beijing Temple of Heaven (`tiantan-hall` · 北京天坛祈年殿: 三层汉白玉祈谷坛 + 三重蓝瓦溜金宝顶圆攒尖大殿 + 古柏森森)
    const marbleWhite = '#F8FAFC'
    const marbleWarm = '#E2E8F0'
    const vermilion = '#B91C1C'
    const pillarRed = '#DC2626'
    const cobaltTile = '#1E3A8A'
    const cobaltLight = '#1D4ED8'
    const imperialGold = '#FACC15'
    const cypressGreen = '#15803D'

    const courtyardPlaza = box(5.2, 0.22, 4.1, '#D8D2C5', { rough: 0.78 })
    courtyardPlaza.position.y = 0.11
    group.add(courtyardPlaza)

    const tiantanHall = new THREE.Group()
    tiantanHall.name = 'tiantan-hall'
    tiantanHall.position.set(0, 0.22, -0.18)

    // 1. 3-Tier Circular White Marble Altar (`汉白玉祈谷坛` · `tiantan-marble-altar`)
    const marbleAltar = new THREE.Group()
    marbleAltar.name = 'tiantan-marble-altar'
    const altarTiers: [number, number, number, string][] = [
      [2.28, 2.38, 0.26, marbleWarm],
      [1.82, 1.9, 0.26, marbleWhite],
      [1.42, 1.48, 0.26, '#FFFFFF'],
    ]
    altarTiers.forEach(([rTop, rBot, h, col], tierIdx) => {
      const yCenter = tierIdx * 0.26 + h * 0.5
      const tierDisc = cyl(rTop, rBot, h, 36, col, { rough: 0.45 })
      tierDisc.position.y = yCenter
      marbleAltar.add(tierDisc)

      // White marble carved balustrade ring & 16望柱 (finial posts) per tier
      const postCount = 16 - tierIdx * 2
      for (let p = 0; p < postCount; p += 1) {
        const ang = (p / postCount) * Math.PI * 2
        // Leave southern stairway opening on front (+Z)
        if (Math.abs(Math.sin(ang) - 1) < 0.12 && Math.abs(Math.cos(ang)) < 0.24) continue
        const px = Math.cos(ang) * (rTop - 0.05)
        const pz = Math.sin(ang) * (rTop - 0.05)
        const post = cyl(0.032, 0.036, 0.18, 8, '#FFFFFF', { rough: 0.4 })
        post.position.set(px, tierIdx * 0.26 + h + 0.09, pz)
        marbleAltar.add(post)
      }
    })

    // Imperial Southern Cloud-Dragon Stepped Marble Ramp (`丹陛御路`)
    const imperialRamp = box(0.62, 0.82, 1.18, '#FFFFFF', { rough: 0.42 })
    imperialRamp.position.set(0, 0.36, 1.68)
    imperialRamp.rotation.x = -0.52
    marbleAltar.add(imperialRamp)
    tiantanHall.add(marbleAltar)

    // 2. Circular Vermilion Hall Body & 12 Perimeter Crimson Columns (`祈年殿朱红殿身与楹柱`)
    const hallBaseY = 0.78
    const drumCore = cyl(1.12, 1.14, 1.15, 32, vermilion, { rough: 0.52 })
    drumCore.position.y = hallBaseY + 0.57
    tiantanHall.add(drumCore)

    for (let c = 0; c < 12; c += 1) {
      const ang = (c / 12) * Math.PI * 2
      const colMesh = cyl(0.055, 0.062, 1.14, 10, pillarRed, { rough: 0.42 })
      colMesh.position.set(Math.cos(ang) * 1.16, hallBaseY + 0.57, Math.sin(ang) * 1.16)
      tiantanHall.add(colMesh)
    }
    // Blue-green & gold imperial painted beam frieze (`青绿彩画额枋`)
    const dougongFrieze1 = cyl(1.2, 1.2, 0.14, 32, '#0284C7', {
      emissive: '#0369A1',
      emissiveIntensity: 0.3,
    })
    dougongFrieze1.position.y = hallBaseY + 1.12
    tiantanHall.add(dougongFrieze1)

    // 3. Triple-Eave Cobalt-Blue Glazed Circular Roof (`三重蓝瓦圆攒尖顶` · `tiantan-triple-roof`) using LatheGeometry
    const tripleRoof = new THREE.Group()
    tripleRoof.name = 'tiantan-triple-roof'

    const buildCurvedRoofEave = (outerR: number, innerR: number, roofH: number, yBase: number, hex: string) => {
      const pts: THREE.Vector2[] = [
        new THREE.Vector2(outerR, 0),
        new THREE.Vector2(outerR * 0.86, roofH * 0.18),
        new THREE.Vector2(outerR * 0.64, roofH * 0.52),
        new THREE.Vector2(innerR, roofH),
        new THREE.Vector2(Math.max(0.01, innerR - 0.08), roofH),
        new THREE.Vector2(outerR * 0.96, -0.05),
        new THREE.Vector2(outerR, 0),
      ]
      const latheGeo = new THREE.LatheGeometry(pts, 36)
      const roofMesh = new THREE.Mesh(
        latheGeo,
        mat(hex, {
          rough: 0.26,
          metal: 0.22,
          emissive: '#1E40AF',
          emissiveIntensity: 0.24,
        }),
      )
      roofMesh.position.y = yBase
      roofMesh.castShadow = true
      roofMesh.receiveShadow = true
      return roofMesh
    }

    // Lower Eave (`下层重檐`)
    const eave1 = buildCurvedRoofEave(1.62, 0.92, 0.52, hallBaseY + 1.18, cobaltTile)
    const midDrum1 = cyl(0.92, 0.94, 0.42, 28, vermilion)
    midDrum1.position.y = hallBaseY + 1.72
    const goldBand1 = cyl(0.96, 0.96, 0.08, 28, imperialGold, { metal: 0.5, rough: 0.3 })
    goldBand1.position.y = hallBaseY + 1.88

    // Middle Eave (`中层重檐`)
    const eave2 = buildCurvedRoofEave(1.32, 0.68, 0.5, hallBaseY + 1.92, cobaltLight)
    const midDrum2 = cyl(0.68, 0.7, 0.38, 28, vermilion)
    midDrum2.position.y = hallBaseY + 2.42
    const goldBand2 = cyl(0.72, 0.72, 0.08, 28, imperialGold, { metal: 0.5, rough: 0.3 })
    goldBand2.position.y = hallBaseY + 2.56

    // Upper Conical Eave (`上层攒尖顶`)
    const eave3 = buildCurvedRoofEave(1.04, 0.06, 0.76, hallBaseY + 2.6, cobaltTile)
    tripleRoof.add(eave1, midDrum1, goldBand1, eave2, midDrum2, goldBand2, eave3)

    // Golden plaque `祈年殿` mounted beneath the top eave on the southern (+Z) side
    const qinianPlaque = sign('祈年殿', 0.56, 0.22, '#1E3A8A', '#FACC15', '#FACC15')
    qinianPlaque.position.set(0, hallBaseY + 2.46, 0.76)
    tripleRoof.add(qinianPlaque)
    tiantanHall.add(tripleRoof)

    // 4. Gleaming Golden Roof Finial (`鎏金宝顶` · `tiantan-gold-finial`)
    const goldFinial = new THREE.Group()
    goldFinial.name = 'tiantan-gold-finial'
    goldFinial.position.set(0, hallBaseY + 3.42, 0)
    const finialBase = cyl(0.14, 0.18, 0.14, 16, imperialGold, {
      metal: 0.72,
      rough: 0.2,
      emissive: '#D97706',
      emissiveIntensity: 0.55,
    })
    const finialOrb = sphere(0.16, 16, imperialGold, {
      metal: 0.78,
      rough: 0.18,
      emissive: imperialGold,
      emissiveIntensity: 0.65,
    })
    finialOrb.position.y = 0.18
    const finialTip = cyl(0.015, 0.06, 0.26, 12, imperialGold, {
      metal: 0.75,
      rough: 0.2,
      emissive: imperialGold,
      emissiveIntensity: 0.6,
    })
    finialTip.position.y = 0.38
    goldFinial.add(finialBase, finialOrb, finialTip)
    tiantanHall.add(goldFinial)

    // 5. Southern Ceremonial Crimson & Gold Lingxing Screen Arch (`siheyuan-screen`) & Ancient Cypress Trees (`古柏`)
    const screenGroup = new THREE.Group()
    screenGroup.name = 'siheyuan-screen'
    screenGroup.position.set(-1.58, 0.22, 1.46)
    const pillarL = cyl(0.06, 0.07, 1.12, 10, pillarRed)
    pillarL.position.set(-0.36, 0.56, 0)
    const pillarR = cyl(0.06, 0.07, 1.12, 10, pillarRed)
    pillarR.position.set(0.36, 0.56, 0)
    const lintelBeam = box(0.92, 0.16, 0.16, cobaltTile)
    lintelBeam.position.set(0, 0.92, 0)
    const goldMedallion = cyl(0.16, 0.16, 0.18, 12, imperialGold, {
      emissive: '#D97706',
      emissiveIntensity: 0.55,
    })
    goldMedallion.rotation.x = Math.PI / 2
    goldMedallion.position.set(0, 0.92, 0)
    screenGroup.add(pillarL, pillarR, lintelBeam, goldMedallion)

    addMiniTree(group, -2.08, 0.22, -1.15, cypressGreen, 1.12)
    addMiniTree(group, 2.08, 0.22, -1.15, cypressGreen, 1.12)
    addMiniTree(group, 1.92, 0.22, 1.18, '#166534', 0.96)
    group.add(tiantanHall, screenGroup)
    updaters.push((t) => {
      finialOrb.position.y = 0.18 + Math.sin(t * 2.0) * 0.015
    })
  } else if (b.style === 'mountain-stilts') {
    // 10. Chongqing Hongyadong Stilted Mountain Pavilion (`stilts-lanterns`)
    const rockCliff = box(4.8, 1.35, 3.6, '#78716C', { rough: 0.92 })
    rockCliff.position.set(0, 0.68, -0.2)
    group.add(rockCliff)
    for (const sx of [-1.6, -0.55, 0.55, 1.6]) {
      const stilt = cyl(0.09, 0.11, 1.65, 8, '#5C3A21')
      stilt.position.set(sx, 0.82, 1.35)
      group.add(stilt)
    }
    const tier1 = windowedBox(3.8, 1.35, 2.35, '#78350F', 4, 1, '#FDE047')
    tier1.position.set(0, 2.02, 0.15)
    const eave1 = pyramid(4.35, 0.62, 2.85, '#292524')
    eave1.position.set(0, 2.88, 0.15)
    const tier2 = windowedBox(2.75, 1.25, 1.85, '#92400E', 3, 1, '#FDE047')
    tier2.position.set(-0.25, 3.65, 0.05)
    const eave2 = gable(3.25, 0.78, 2.25, '#292524')
    eave2.position.set(-0.25, 4.52, 0.05)

    const lanterns = new THREE.Group()
    lanterns.name = 'stilts-lanterns'
    for (let i = -2; i <= 2; i += 1) {
      const orb = sphere(0.13, 10, '#EF4444', {
        emissive: '#F97316',
        emissiveIntensity: 0.95,
      })
      orb.position.set(i * 0.78, 2.52, 1.48)
      lanterns.add(orb)
    }
    group.add(tier1, eave1, tier2, eave2, lanterns)
    updaters.push((t) => {
      lanterns.children.forEach((l, idx) => {
        l.position.y = 2.52 + Math.sin(t * 2.8 + idx) * 0.05
      })
    })
  } else if (b.style === 'euro-castle') {
    // 11. European Fairytale Spire Castle + Moat Bridge & Fluttering Pennants (`castle-pennants`)
    const moat = cyl(2.65, 2.75, 0.18, 28, '#38BDF8', {
      rough: 0.2,
      emissive: '#0284C7',
      emissiveIntensity: 0.22,
    })
    moat.position.y = 0.09
    const keep = windowedBox(2.85, 2.55, 2.25, '#F1F5F9', 3, 2, '#FDE68A')
    keep.position.set(0, 1.45, -0.1)
    const mainRoof = gable(3.05, 1.05, 2.45, '#1D4ED8')
    mainRoof.position.set(0, 3.18, -0.1)
    const pennants = new THREE.Group()
    pennants.name = 'castle-pennants'
    for (const [tx, tz, h] of [
      [-1.55, 0.65, 3.45],
      [1.55, 0.65, 3.45],
      [0, -0.65, 4.35],
    ] as const) {
      const turret = cyl(0.52, 0.58, h, 14, '#E2E8F0')
      turret.position.set(tx, h * 0.5 + 0.15, tz)
      const cone = cyl(0.02, 0.66, 1.45, 14, '#1D4ED8')
      cone.position.set(tx, h + 0.85, tz)
      const flag = box(0.45, 0.22, 0.04, '#F43F5E', {
        emissive: '#E11D48',
        emissiveIntensity: 0.4,
      })
      flag.position.set(tx + 0.24, h + 1.62, tz)
      pennants.add(flag)
      group.add(turret, cone)
    }
    group.add(moat, keep, mainRoof, pennants)
    updaters.push((t) => {
      pennants.children.forEach((fl, idx) => {
        fl.rotation.y = Math.sin(t * 4.5 + idx) * 0.28
      })
    })
  } else if (b.style === 'tulou-roundhouse') {
    // 12. Fujian Hakka Earthen Roundhouse Tulou + Glowing Inner Courtyard Ring (`tulou-ring`)
    const plinth = box(4.9, 0.24, 3.9, '#C8B99E', { rough: 0.85 })
    plinth.position.y = 0.12
    const outerWall = cyl(2.05, 2.15, 2.25, 28, '#D6A874', { rough: 0.88 })
    outerWall.position.y = 1.32
    const roofRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.85, 0.48, 12, 32),
      mat('#374151', { rough: 0.78 }),
    )
    roofRing.rotation.x = Math.PI / 2
    roofRing.position.y = 2.48
    const innerCourt = cyl(1.15, 1.15, 2.32, 24, '#292524')
    innerCourt.position.y = 1.34
    const ancestralHall = box(0.95, 1.15, 0.95, '#B91C1C')
    ancestralHall.position.y = 2.65
    const lanternRing = new THREE.Group()
    lanternRing.name = 'tulou-ring'
    lanternRing.position.y = 2.65
    for (let k = 0; k < 8; k += 1) {
      const a = (k / 8) * Math.PI * 2
      const lOrb = sphere(0.11, 8, '#EF4444', {
        emissive: '#F97316',
        emissiveIntensity: 0.95,
      })
      lOrb.position.set(Math.cos(a) * 1.42, 0.25, Math.sin(a) * 1.42)
      lanternRing.add(lOrb)
    }
    group.add(plinth, outerWall, roofRing, innerCourt, ancestralHall, lanternRing)
    updaters.push((t) => {
      lanternRing.rotation.y = t * 0.45
    })
  } else if (b.style === 'snow-chalet-village') {
    // 13. Nordic / Northeast Snow-Mushroom Timber Chalet + Hearth Chimney Smoke (`chalet-smoke`)
    const snowBase = cyl(2.55, 2.75, 0.32, 24, '#F8FAFC', { rough: 0.65 })
    snowBase.position.y = 0.16
    const logCabin = windowedBox(3.15, 1.75, 2.25, '#92400E', 3, 2, '#FDE047')
    logCabin.position.set(0, 1.15, 0)
    const creamSnowRoof = gable(3.65, 1.25, 2.65, '#F8FAFC')
    creamSnowRoof.position.set(0, 2.38, 0)
    const chimney = box(0.45, 2.45, 0.45, '#B91C1C')
    chimney.position.set(1.15, 2.15, -0.45)
    const smokeGrp = new THREE.Group()
    smokeGrp.name = 'chalet-smoke'
    smokeGrp.position.set(1.15, 3.45, -0.45)
    for (let s = 0; s < 4; s += 1) {
      const puff = sphere(0.18 + s * 0.05, 8, '#FFFFFF', { opacity: 0.78 })
      puff.position.y = s * 0.38
      smokeGrp.add(puff)
    }
    group.add(snowBase, logCabin, creamSnowRoof, chimney, smokeGrp)
    updaters.push((t) => {
      smokeGrp.children.forEach((pf, idx) => {
        const u = (t * 0.55 + idx * 0.25) % 1
        pf.position.y = u * 1.45
        pf.scale.setScalar(0.65 + Math.sin(u * Math.PI) * 0.5)
      })
    })
  } else if (b.style === 'medical-center') {
    // 14. Modern Medical & Healthcare Center + Glowing Red Cross & Rooftop Helipad (`med-helipad`)
    const plinth = box(5.0, 0.26, 3.9, '#E2E8F0', { rough: 0.65 })
    plinth.position.y = 0.13
    const mainTower = windowedBox(3.35, 3.25, 2.25, '#F8FAFC', 4, 4, '#38BDF8')
    mainTower.position.set(-0.25, 1.88, -0.1)
    const curvedWing = cyl(1.25, 1.25, 2.15, 18, '#E0F2FE', { rough: 0.35 })
    curvedWing.position.set(1.35, 1.32, 0.25)
    const crossH = box(0.85, 0.26, 0.14, '#EF4444', {
      emissive: '#EF4444',
      emissiveIntensity: 0.85,
    })
    crossH.position.set(-0.25, 2.95, 1.08)
    const crossV = box(0.26, 0.85, 0.14, '#EF4444', {
      emissive: '#EF4444',
      emissiveIntensity: 0.85,
    })
    crossV.position.set(-0.25, 2.95, 1.08)
    const helipad = new THREE.Group()
    helipad.name = 'med-helipad'
    helipad.position.set(-0.25, 3.62, -0.1)
    const padDisc = cyl(1.05, 1.12, 0.14, 20, '#0EA5E9')
    const rotorCopter = box(1.25, 0.05, 0.14, '#FACC15', {
      emissive: '#FACC15',
      emissiveIntensity: 0.65,
    })
    rotorCopter.position.y = 0.28
    helipad.add(padDisc, rotorCopter)
    group.add(plinth, mainTower, curvedWing, crossH, crossV, helipad)
    updaters.push((t) => {
      rotorCopter.rotation.y = t * 6.5
    })
  } else if (b.style === 'law-palace') {
    // 15. Neoclassical Law & Finance Colonnade Palace + Rotating Golden Scales of Justice (`justice-scales`)
    const plinth = box(5.1, 0.34, 4.0, '#E5DFD3', { rough: 0.72 })
    plinth.position.y = 0.17
    const sanctum = windowedBox(3.55, 2.65, 2.35, '#F5EFE6', 4, 3, '#1E293B')
    sanctum.position.set(0, 1.65, -0.15)
    for (let c = -2; c <= 2; c += 1) {
      const pillar = cyl(0.11, 0.13, 2.55, 10, '#FAF8F5')
      pillar.position.set(c * 0.72, 1.6, 1.22)
      group.add(pillar)
    }
    const pediment = gable(3.85, 0.82, 2.65, '#D6CFC2')
    pediment.position.set(0, 3.22, -0.15)
    const scales = new THREE.Group()
    scales.name = 'justice-scales'
    scales.position.set(0, 4.25, -0.15)
    const post = cyl(0.06, 0.08, 0.95, 8, '#F59E0B', {
      emissive: '#D97706',
      emissiveIntensity: 0.55,
    })
    const beam = box(1.35, 0.08, 0.08, '#FDE047', {
      emissive: '#F59E0B',
      emissiveIntensity: 0.65,
    })
    beam.position.y = 0.38
    const panL = cyl(0.24, 0.12, 0.12, 12, '#F59E0B')
    panL.position.set(-0.58, 0.05, 0)
    const panR = cyl(0.24, 0.12, 0.12, 12, '#F59E0B')
    panR.position.set(0.58, 0.05, 0)
    scales.add(post, beam, panL, panR)
    group.add(plinth, sanctum, pediment, scales)
    updaters.push((t) => {
      scales.rotation.y = t * 0.65
      beam.rotation.z = Math.sin(t * 2.1) * 0.16
    })
  } else if (b.style === 'film-stage') {
    // 16. Film Studio & MCN Soundstage + Giant Snapping Clapperboard & Searchlights (`film-clapper`)
    const plinth = box(5.0, 0.24, 3.9, '#334155', { rough: 0.75 })
    plinth.position.y = 0.12
    const soundstage = windowedBox(3.75, 2.35, 2.45, '#1E293B', 4, 2, '#FACC15')
    soundstage.position.set(0, 1.42, -0.1)
    const redCarpet = box(1.15, 0.06, 1.65, '#E11D48', {
      emissive: '#BE123C',
      emissiveIntensity: 0.35,
    })
    redCarpet.position.set(0, 0.26, 1.35)
    const clapper = new THREE.Group()
    clapper.name = 'film-clapper'
    clapper.position.set(0, 3.25, 0.15)
    const board = box(1.55, 0.95, 0.16, '#0F172A')
    const clapBar = box(1.55, 0.22, 0.18, '#FACC15', {
      emissive: '#EAB308',
      emissiveIntensity: 0.45,
    })
    clapBar.position.set(0, 0.62, 0)
    clapper.add(board, clapBar)
    group.add(plinth, soundstage, redCarpet, clapper)
    updaters.push((t) => {
      clapBar.rotation.z = Math.abs(Math.sin(t * 3.2)) * 0.36
    })
  } else if (b.style === 'coffee-roastery') {
    // 17. Specialty Coffee Flagship Roastery + Giant Steaming Latte Cup & Striped Awning (`giant-coffee-cup`)
    const deck = box(4.9, 0.24, 3.8, '#D6C7B2', { rough: 0.78 })
    deck.position.y = 0.12
    const roastery = windowedBox(3.35, 2.05, 2.25, '#78350F', 3, 2, '#FEF3C7')
    roastery.position.set(-0.2, 1.26, -0.15)
    const greenAwning = box(3.45, 0.18, 0.85, '#15803D')
    greenAwning.position.set(-0.2, 1.35, 1.25)
    greenAwning.rotation.x = 0.22
    const cupGroup = new THREE.Group()
    cupGroup.name = 'giant-coffee-cup'
    cupGroup.position.set(-0.2, 2.85, -0.15)
    const saucer = cyl(0.88, 0.75, 0.12, 20, '#FAF8F5')
    const mug = cyl(0.68, 0.54, 0.92, 20, '#FAF8F5')
    mug.position.y = 0.48
    const latteFoam = cyl(0.62, 0.62, 0.08, 18, '#D97706', {
      emissive: '#B45309',
      emissiveIntensity: 0.25,
    })
    latteFoam.position.y = 0.92
    const steam = sphere(0.24, 10, '#FFFFFF', { opacity: 0.72 })
    steam.position.y = 1.35
    cupGroup.add(saucer, mug, latteFoam, steam)
    group.add(deck, roastery, greenAwning, cupGroup)
    updaters.push((t) => {
      cupGroup.rotation.y = Math.sin(t * 0.9) * 0.35
      steam.position.y = 1.25 + ((t * 0.65) % 1) * 0.65
      steam.scale.setScalar(0.75 + Math.sin(t * 3.0) * 0.25)
    })
  } else if (b.style === 'ruc-mingde') {
    // 18. Classical Red-Brick Humanities Academy (`ruc-arch-gate` + `ruc-motto-stone`)
    const rucRed = '#8E1E20'
    const rucCrimson = '#9E2428'
    const warmStone = '#EAE3D5'
    const whiteMarble = '#F8F6F0'
    const ginkgoGold = '#FACC15'

    const plaza = box(5.2, 0.28, 4.3, '#D8D0C2', { rough: 0.76 })
    plaza.position.y = 0.14
    const forecourtLawn = box(4.2, 0.03, 1.95, '#7FA668', { rough: 0.86 })
    forecourtLawn.position.set(0, 0.285, 1.18)
    const centralWalk = box(1.28, 0.035, 1.95, '#DFD7C8', { rough: 0.72 })
    centralWalk.position.set(0, 0.288, 1.18)

    // 1. Rear Mingde Main Red Building Complex shifted back (z = -0.82) to leave a wide, open forecourt lawn in front!
    const centerHall = windowedBox(2.65, 3.12, 1.76, rucRed, 5, 4, '#FFF8E7')
    centerHall.position.set(0, 1.82, -0.82)
    const westWing = windowedBox(1.24, 2.32, 1.56, rucCrimson, 2, 3, '#FFF8E7')
    westWing.position.set(-1.78, 1.42, -0.64)
    const eastWing = windowedBox(1.24, 2.32, 1.56, rucCrimson, 2, 3, '#FFF8E7')
    eastWing.position.set(1.78, 1.42, -0.64)
    addCorniceBand(group, 2.76, 3.4, 1.86, warmStone, 0, -0.82)
    addCorniceBand(group, 1.32, 2.6, 1.66, warmStone, -1.78, -0.64)
    addCorniceBand(group, 1.32, 2.6, 1.66, warmStone, 1.78, -0.64)

    // Stepped Neoclassical Attic Crown atop Mingde Main Hall
    const atticBase = box(1.92, 0.44, 1.28, rucRed, { rough: 0.65 })
    atticBase.position.set(0, 3.64, -0.82)
    const atticCornice = box(2.06, 0.12, 1.38, warmStone)
    atticCornice.position.set(0, 3.9, -0.82)

    // 2. Clean Neoclassical White Marble Portico Colonnade (`ruc-arch-gate`) flush with Mingde Entrance (z = 0.24)
    const archGate = new THREE.Group()
    archGate.name = 'ruc-arch-gate'
    archGate.position.set(0, 0.28, 0.24)
    const porchRoof = box(2.38, 0.16, 0.48, warmStone, { rough: 0.58 })
    porchRoof.position.set(0, 1.88, -0.04)
    archGate.add(porchRoof)
    for (const px of [-0.96, -0.34, 0.34, 0.96]) {
      const col = cyl(0.068, 0.08, 1.82, 12, whiteMarble, { rough: 0.46 })
      col.position.set(px, 0.91, 0)
      archGate.add(col)
    }

    // 3. Iconic Forecourt Carved Natural Granite Monolith Boulder (`ruc-motto-stone`)
    // Placed out on the open front lawn (z = 1.84) — a full 1.60u away from the building portico!
    const mottoStone = new THREE.Group()
    mottoStone.name = 'ruc-motto-stone'
    mottoStone.position.set(0, 0.29, 1.84)
    mottoStone.rotation.set(0, -placed.rotationY, 0)
    mottoStone.scale.setScalar(1.02)

    // Low oval lawn & river-pebble bed (CylinderGeometry, no brown brick box)
    const lawnBed = cyl(0.88, 0.96, 0.05, 24, '#6E9958', { rough: 0.88 })
    lawnBed.scale.set(1.12, 1, 0.54)
    lawnBed.position.y = 0.025

    // Sculpted asymmetric chiseled horizontal Taishan granite boulder contour (`ruc-motto-boulder-mesh`)
    const boulderContour = new THREE.Shape()
    boulderContour.moveTo(-0.78, 0.02)
    boulderContour.lineTo(0.8, 0.02)
    boulderContour.lineTo(0.86, 0.16)
    boulderContour.lineTo(0.76, 0.38)
    boulderContour.lineTo(0.52, 0.48)
    boulderContour.lineTo(0.16, 0.52)
    boulderContour.lineTo(-0.26, 0.5)
    boulderContour.lineTo(-0.6, 0.42)
    boulderContour.lineTo(-0.78, 0.26)
    boulderContour.lineTo(-0.84, 0.12)
    boulderContour.closePath()

    const boulderGeo = new THREE.ExtrudeGeometry(boulderContour, {
      depth: 0.24,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.04,
      bevelSegments: 3,
    })
    const boulderMesh = new THREE.Mesh(
      boulderGeo,
      mat('#C9C0B1', { rough: 0.82, metal: 0.05 }),
    )
    boulderMesh.name = 'ruc-motto-boulder-mesh'
    boulderMesh.position.set(0, 0.04, -0.12)
    boulderMesh.castShadow = true
    boulderMesh.receiveShadow = true

    // Secondary natural granite ridge stratum behind the main face for organic rock thickness
    const ridgeContour = new THREE.Shape()
    ridgeContour.moveTo(-0.58, 0.02)
    ridgeContour.lineTo(0.62, 0.02)
    ridgeContour.lineTo(0.48, 0.42)
    ridgeContour.lineTo(0.08, 0.46)
    ridgeContour.lineTo(-0.38, 0.4)
    ridgeContour.closePath()
    const ridgeGeo = new THREE.ExtrudeGeometry(ridgeContour, {
      depth: 0.14,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 2,
    })
    const ridgeMesh = new THREE.Mesh(ridgeGeo, mat('#B5ACA0', { rough: 0.88 }))
    ridgeMesh.position.set(0.04, 0.03, -0.24)
    ridgeMesh.castShadow = true

    // Direct rock-face crimson motto engraving (`ruc-motto-engraving`)
    let engravingTex: THREE.CanvasTexture | null = null
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas')
      canvas.width = 512
      canvas.height = 256
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, 512, 256)
        ctx.font = '900 116px "STXingkai", "Kaiti SC", "STKaiti", "Songti SC", serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = 'rgba(45, 38, 32, 0.42)'
        ctx.fillText('博学笃行', 260, 134)
        ctx.fillStyle = '#9E1B1E'
        ctx.fillText('博学笃行', 256, 130)
        engravingTex = new THREE.CanvasTexture(canvas)
        engravingTex.colorSpace = THREE.SRGBColorSpace
        engravingTex.needsUpdate = true
      }
    }
    const engravingMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      alphaTest: 0.04,
      roughness: 0.45,
      ...(engravingTex
        ? {
            map: engravingTex,
            emissive: new THREE.Color('#9E1B1E'),
            emissiveMap: engravingTex,
            emissiveIntensity: 0.35,
          }
        : {}),
    })
    const engravingMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.22, 0.4), engravingMat)
    engravingMesh.name = 'ruc-motto-engraving'
    engravingMesh.position.set(0, 0.28, 0.175)
    mottoStone.add(lawnBed, ridgeMesh, boulderMesh, engravingMesh)

    // 4. Golden Autumn Mingde Ginkgo Trees (明德银杏林) flanking the plaza
    addMiniTree(group, -2.06, 0.28, 0.85, ginkgoGold, 1.08)
    addMiniTree(group, 2.06, 0.28, 0.85, '#EAB308', 1.04)

    group.add(
      plaza,
      forecourtLawn,
      centralWalk,
      centerHall,
      westWing,
      eastWing,
      atticBase,
      atticCornice,
      archGate,
      mottoStone,
    )
    updaters.push((t) => {
      engravingMesh.position.y = 0.28 + Math.sin(t * 1.5) * 0.002
    })
  } else if (b.style === 'unimelb-clocktower') {
    // 19. Sandstone Gothic Clocktower University (`unimelb-gothic-arches` + `unimelb-battlements`)
    const sandstone = '#DEC192'
    const sandstoneLight = '#EAD4AE'
    const sandstoneDark = '#B58D56'
    const melbBlue = '#094183'
    const darkSlate = '#1E293B'
    const jacaranda = '#A855F7'

    const quadBase = box(5.15, 0.28, 4.05, '#DFD5C3', { rough: 0.78 })
    quadBase.position.y = 0.14
    const cloisterLawn = box(2.85, 0.03, 1.15, '#7FA668', { rough: 0.85 })
    cloisterLawn.position.set(-0.48, 0.285, 1.32)

    // 1. Old Quad Victorian Gothic Sandstone Cloister Hall + Steep Slate Gable Roof
    const oldArtsHall = windowedBox(3.32, 2.35, 1.92, sandstone, 4, 2, darkSlate)
    oldArtsHall.position.set(-0.48, 1.44, -0.28)
    const slateRoof = gable(3.48, 0.86, 2.08, darkSlate)
    slateRoof.position.set(-0.48, 2.82, -0.28)

    // 2. ExtrudeGeometry Pointed Gothic Cloister Arch Arcade (`unimelb-gothic-arches`)
    const gothicArches = new THREE.Group()
    gothicArches.name = 'unimelb-gothic-arches'
    gothicArches.position.set(-0.48, 0.28, 0.76)

    // Deep shadowed cloister backdrop behind the pointed Gothic arches
    const cloisterShadowBack = box(3.16, 1.24, 0.08, '#161E29', { rough: 0.9 })
    cloisterShadowBack.position.set(0, 0.62, -0.06)
    gothicArches.add(cloisterShadowBack)

    // Build a continuous sandstone arcade wall with 4 pointed ogive Gothic arch cutouts using ExtrudeGeometry
    const arcadeShape = new THREE.Shape()
    const aw = 3.24
    const ah = 1.28
    arcadeShape.moveTo(-aw / 2, 0)
    arcadeShape.lineTo(aw / 2, 0)
    arcadeShape.lineTo(aw / 2, ah)
    arcadeShape.lineTo(-aw / 2, ah)
    arcadeShape.closePath()

    for (let i = 0; i < 4; i += 1) {
      const cx = -1.17 + i * 0.78
      const hw = 0.25
      const springY = 0.58
      const apexY = 1.04
      const hole = new THREE.Path()
      hole.moveTo(cx - hw, 0.02)
      hole.lineTo(cx + hw, 0.02)
      hole.lineTo(cx + hw, springY)
      hole.quadraticCurveTo(cx + hw * 0.85, apexY * 0.88, cx, apexY)
      hole.quadraticCurveTo(cx - hw * 0.85, apexY * 0.88, cx - hw, springY)
      hole.closePath()
      arcadeShape.holes.push(hole)
    }

    const arcadeGeo = new THREE.ExtrudeGeometry(arcadeShape, {
      depth: 0.24,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.015,
      bevelSegments: 2,
    })
    const arcadeMesh = new THREE.Mesh(arcadeGeo, mat(sandstoneLight, { rough: 0.68 }))
    arcadeMesh.castShadow = true
    arcadeMesh.receiveShadow = true
    arcadeMesh.position.z = -0.12
    gothicArches.add(arcadeMesh)

    // 5 Stepped Sandstone Gothic Buttresses with pointed stone finials along the cloister facade
    for (let bIdx = 0; bIdx < 5; bIdx += 1) {
      const bx = -1.56 + bIdx * 0.78
      const lowerButtress = box(0.16, 1.35, 0.34, sandstoneDark, { rough: 0.76 })
      lowerButtress.position.set(bx, 0.68, 0.02)
      const upperButtress = box(0.12, 1.08, 0.22, sandstoneDark, { rough: 0.76 })
      upperButtress.position.set(bx, 1.82, -0.04)
      const pinnacle = pyramid(0.16, 0.36, 0.16, sandstoneLight)
      pinnacle.position.set(bx, 2.54, -0.04)
      gothicArches.add(lowerButtress, upperButtress, pinnacle)
    }

    // 3. Crenelated Sawtooth Gothic Battlements (`unimelb-battlements`) along Old Quad & Clocktower
    const battlements = new THREE.Group()
    battlements.name = 'unimelb-battlements'
    const parapetBar = box(3.38, 0.12, 0.22, sandstoneLight)
    parapetBar.position.set(-0.48, 2.64, 0.68)
    battlements.add(parapetBar)
    for (let m = 0; m < 9; m += 1) {
      const merlon = box(0.22, 0.2, 0.22, sandstone, { rough: 0.72 })
      merlon.position.set(-1.92 + m * 0.36, 2.78, 0.68)
      battlements.add(merlon)
    }

    // 4. Iconic Old Arts Sandstone Gothic Clocktower (`unimelb-clock`) with 4-Face Roman Dials & 4 Pinnacles
    const clockTower = new THREE.Group()
    clockTower.name = 'unimelb-clock'
    clockTower.position.set(1.36, 0.28, 0.12)
    const towerPlinth = box(1.52, 0.42, 1.52, sandstoneDark, { rough: 0.78 })
    towerPlinth.position.y = 0.21
    const towerShaft = windowedBox(1.34, 3.65, 1.34, sandstone, 1, 3, melbBlue)
    towerShaft.position.y = 2.02
    const belfryStage = box(1.44, 0.82, 1.44, sandstoneLight, { rough: 0.65 })
    belfryStage.position.y = 4.12
    const belfryCornice = box(1.56, 0.12, 1.56, sandstoneDark)
    belfryCornice.position.y = 4.56

    // Stepped corner Gothic buttresses on the Clocktower
    for (const [cx, cz] of [
      [-0.66, -0.66],
      [0.66, -0.66],
      [-0.66, 0.66],
      [0.66, 0.66],
    ] as const) {
      const cButtress = box(0.18, 3.85, 0.18, sandstoneDark, { rough: 0.75 })
      cButtress.position.set(cx, 1.95, cz)
      clockTower.add(cButtress)
    }

    // Crenelated battlements + 4 Corner Gothic Sandstone Pinnacles atop the Clocktower
    for (let side = -1; side <= 1; side += 1) {
      const mFront = box(0.2, 0.18, 0.16, sandstoneLight)
      mFront.position.set(side * 0.34, 4.68, 0.68)
      const mBack = box(0.2, 0.18, 0.16, sandstoneLight)
      mBack.position.set(side * 0.34, 4.68, -0.68)
      clockTower.add(mFront, mBack)
    }
    for (const [px, pz] of [
      [-0.62, -0.62],
      [0.62, -0.62],
      [-0.62, 0.62],
      [0.62, 0.62],
    ] as const) {
      const pinBase = box(0.24, 0.28, 0.24, sandstoneDark)
      pinBase.position.set(px, 4.74, pz)
      const pinSpire = pyramid(0.26, 0.62, 0.26, sandstoneLight)
      pinSpire.position.set(px, 5.18, pz)
      clockTower.add(pinBase, pinSpire)
    }

    // Steep Octagonal Dark-Slate & Melbourne-Navy Gothic Spire
    const gothicSpire = cyl(0.04, 0.68, 1.58, 8, darkSlate, { rough: 0.42, metal: 0.2 })
    gothicSpire.position.y = 5.38
    const spireFinial = sphere(0.09, 10, '#F59E0B', { emissive: '#D97706', emissiveIntensity: 0.6 })
    spireFinial.position.y = 6.2
    clockTower.add(towerPlinth, towerShaft, belfryStage, belfryCornice, gothicSpire, spireFinial)

    // 4-Face Roman Clock Dials (`unimelb-clock-dials`) on +Z, -Z, +X, -X
    const dialsGroup = new THREE.Group()
    dialsGroup.name = 'unimelb-clock-dials'
    const dialConfigs: [number, number, number, number][] = [
      [0, 4.12, 0.74, 0],
      [0, 4.12, -0.74, Math.PI],
      [0.74, 4.12, 0, Math.PI / 2],
      [-0.74, 4.12, 0, -Math.PI / 2],
    ]
    const minHands: THREE.Mesh[] = []
    const hourHands: THREE.Mesh[] = []
    for (const [dx, dy, dz, ry] of dialConfigs) {
      const dialFace = new THREE.Group()
      dialFace.position.set(dx, dy, dz)
      dialFace.rotation.y = ry
      const goldRim = cyl(0.38, 0.38, 0.05, 24, '#D97706', { metal: 0.55, rough: 0.3 })
      goldRim.rotation.x = Math.PI / 2
      const ivoryDisk = cyl(0.33, 0.33, 0.06, 24, '#FFFBEB', {
        emissive: '#FEF3C7',
        emissiveIntensity: 0.55,
      })
      ivoryDisk.rotation.x = Math.PI / 2
      // 12 Roman hour tick marks around the clock face
      for (let h = 0; h < 12; h += 1) {
        const ang = (h * Math.PI) / 6
        const tick = box(0.025, 0.065, 0.02, melbBlue)
        tick.position.set(Math.sin(ang) * 0.25, Math.cos(ang) * 0.25, 0.035)
        tick.rotation.z = -ang
        dialFace.add(tick)
      }
      const mHand = box(0.038, 0.24, 0.03, melbBlue)
      mHand.position.set(0, 0, 0.045)
      const hHand = box(0.18, 0.042, 0.03, '#B45309')
      hHand.position.set(0, 0, 0.05)
      dialFace.add(goldRim, ivoryDisk, mHand, hHand)
      dialsGroup.add(dialFace)
      minHands.push(mHand)
      hourHands.push(hHand)
    }
    clockTower.add(dialsGroup)

    // 5. Blooming Southern-Hemisphere Purple Jacaranda Trees (`蓝花楹`) + fallen purple petal ring
    addMiniTree(group, -1.96, 0.28, 1.32, jacaranda, 1.15)
    addMiniTree(group, -0.05, 0.28, 1.42, '#C084FC', 0.92)
    const petalRing = cyl(0.58, 0.65, 0.02, 16, '#D8B4FE', { rough: 0.85 })
    petalRing.position.set(-1.96, 0.29, 1.32)

    group.add(quadBase, cloisterLawn, oldArtsHall, slateRoof, gothicArches, battlements, clockTower, petalRing)
    updaters.push((t) => {
      for (const mh of minHands) mh.rotation.z = -t * 1.1
      for (const hh of hourHands) hh.rotation.z = -t * 0.18
    })
  } else if (b.style === 'xiaomi-park') {
    // 20. Orange Tech Science & Technology Park HQ (双子玻璃幕墙大厦 + 橙色跑道 + 巨型 MI 标 `xiaomi-mi-logo` + 吉祥物雕塑 `xiaomi-mitu-mascot`)
    const miOrange = '#FF6900'
    const curtainGlass = '#1E293B'
    const aluminumTrim = '#E2E8F0'
    const skyGlaze = '#38BDF8'

    const campusDeck = box(5.2, 0.26, 4.1, '#DCE3EA', { rough: 0.65 })
    campusDeck.position.y = 0.13
    // Iconic Outdoor Xiaomi Orange Running Track Ring with white lane markings
    const trackLoop = box(4.86, 0.05, 3.76, miOrange, {
      emissive: miOrange,
      emissiveIntensity: 0.36,
    })
    trackLoop.position.y = 0.27
    const innerCourt = box(4.26, 0.06, 3.16, '#CBD5E1')
    innerCourt.position.y = 0.275

    // 1. Sleek Haidian Xiaomi Science Park Dark-Slate Reflective Glass Curtain-Wall Twin Towers
    const westTower = windowedBox(1.82, 3.72, 1.96, curtainGlass, 4, 6, skyGlaze)
    westTower.position.set(-1.12, 2.12, -0.22)
    const eastTower = windowedBox(1.82, 3.28, 1.96, curtainGlass, 4, 5, skyGlaze)
    eastTower.position.set(1.12, 1.9, -0.22)

    // Glazed Podium & Suspended Sky-Atrium connecting West & East Towers
    const glazedPodium = windowedBox(2.85, 1.15, 1.58, '#0F172A', 5, 2, '#7DD3FC')
    glazedPodium.position.set(0, 0.85, 0.12)
    const skyAtrium = windowedBox(1.08, 0.92, 1.42, '#0284C7', 2, 2, '#E0F2FE')
    skyAtrium.position.set(0, 2.76, -0.18)

    // Crisp Silver-Aluminum Curtain-Wall Horizontal Spandrel Mullions & Corner Columns (`xiaomi-curtain-mullions`)
    const mullionsGroup = new THREE.Group()
    mullionsGroup.name = 'xiaomi-curtain-mullions'
    for (const [tx, th, floors] of [
      [-1.12, 3.72, 6],
      [1.12, 3.28, 5],
    ] as const) {
      for (let f = 1; f <= floors; f += 1) {
        const by = 0.28 + (f / floors) * th
        const spandrel = box(1.9, 0.075, 2.04, aluminumTrim, { rough: 0.28, metal: 0.55 })
        spandrel.position.set(tx, by, -0.22)
        mullionsGroup.add(spandrel)
      }
      for (const cx of [-0.88, 0, 0.88]) {
        const vFin = box(0.06, th + 0.06, 2.02, aluminumTrim, { rough: 0.3, metal: 0.5 })
        vFin.position.set(tx + cx, 0.28 + th * 0.5, -0.22)
        mullionsGroup.add(vFin)
      }
    }
    const orangeBandW = box(1.94, 0.14, 2.06, miOrange, {
      emissive: miOrange,
      emissiveIntensity: 0.65,
    })
    orangeBandW.position.set(-1.12, 4.04, -0.22)
    const orangeBandE = box(1.94, 0.14, 2.06, miOrange, {
      emissive: miOrange,
      emissiveIntensity: 0.65,
    })
    orangeBandE.position.set(1.12, 3.6, -0.22)

    // 2. Giant Iconic Rounded Kenya-Hara Superellipse Vivid Orange "mi" Rooftop Emblem (`xiaomi-mi-logo`)
    const miLogoGroup = new THREE.Group()
    miLogoGroup.name = 'xiaomi-mi-logo'
    miLogoGroup.position.set(-1.12, 4.74, -0.22)
    miLogoGroup.rotation.set(0, -placed.rotationY, 0)

    // True Kenya Hara N=3 Superellipse (|x|^3 + |y|^3 = r^3) — smoothly rounded, never a sharp rectangle!
    const superellipseShape = new THREE.Shape()
    const seRadius = 0.58
    const seSteps = 64
    for (let i = 0; i <= seSteps; i += 1) {
      const theta = (i / seSteps) * Math.PI * 2
      const ct = Math.cos(theta)
      const st = Math.sin(theta)
      const sx = Math.sign(ct) * Math.pow(Math.abs(ct), 2 / 3) * seRadius
      const sy = Math.sign(st) * Math.pow(Math.abs(st), 2 / 3) * seRadius
      if (i === 0) superellipseShape.moveTo(sx, sy)
      else superellipseShape.lineTo(sx, sy)
    }
    superellipseShape.closePath()
    const miSquircleGeo = new THREE.ExtrudeGeometry(superellipseShape, {
      depth: 0.24,
      bevelEnabled: true,
      bevelThickness: 0.045,
      bevelSize: 0.038,
      bevelSegments: 4,
    })
    miSquircleGeo.center()
    const miSquircle = new THREE.Mesh(
      miSquircleGeo,
      mat(miOrange, {
        rough: 0.22,
        emissive: miOrange,
        emissiveIntensity: 0.68,
      }),
    )
    miSquircle.castShadow = true
    miLogoGroup.add(miSquircle)

    const miWhiteMat = mat('#FFFFFF', { emissive: '#FFFFFF', emissiveIntensity: 0.72, rough: 0.2 })
    let addedXiaomiSvg = false
    if (typeof DOMParser !== 'undefined') {
      try {
        const loader = new SVGLoader()
        const svgData = loader.parse(
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><path d="${GENERIC_TECH_PARK_PATH}"/></svg>`,
        )
        for (const p of svgData.paths) {
          for (const s of SVGLoader.createShapes(p)) {
            const extGeo = new THREE.ExtrudeGeometry(s, { depth: 8.0, bevelEnabled: false })
            const sc = 0.0086
            const mFront = new THREE.Mesh(extGeo, miWhiteMat)
            mFront.scale.set(sc, -sc, sc)
            mFront.position.set(-0.516, 0.516, 0.115)
            const mBack = new THREE.Mesh(extGeo, miWhiteMat)
            mBack.scale.set(-sc, -sc, sc)
            mBack.position.set(0.516, 0.516, -0.182)
            miLogoGroup.add(mFront, mBack)
            addedXiaomiSvg = true
          }
        }
      } catch {
        // Fallback below
      }
    }
    if (!addedXiaomiSvg) {
      for (const zSide of [-0.15, 0.15]) {
        const mBar = box(0.46, 0.42, 0.04, '#FFFFFF')
        mBar.position.set(-0.1, 0, zSide)
        const iBar = box(0.11, 0.42, 0.04, '#FFFFFF')
        iBar.position.set(0.28, 0, zSide)
        miLogoGroup.add(mBar, iBar)
      }
    }

    // 3. Iconic 3D Xiaomi Mitu Mascot (`xiaomi-mitu-mascot` · 戴雷锋帽与红领巾的米兔雕塑) at Front-Right Plaza
    const mituGroup = new THREE.Group()
    mituGroup.name = 'xiaomi-mitu-mascot'
    mituGroup.position.set(1.42, 0.28, 1.48)
    mituGroup.rotation.y = -placed.rotationY
    const mituPed = cyl(0.38, 0.44, 0.18, 16, miOrange, { emissive: miOrange, emissiveIntensity: 0.35 })
    mituPed.position.y = 0.09
    const mituBody = sphere(0.24, 14, '#FAF8F5', { rough: 0.35, flat: false })
    mituBody.scale.set(0.95, 1.12, 0.88)
    mituBody.position.y = 0.38
    const mituScarf = cyl(0.21, 0.24, 0.1, 14, '#EF4444', { emissive: '#DC2626', emissiveIntensity: 0.45 })
    mituScarf.position.y = 0.56
    const mituHead = sphere(0.26, 14, '#FFFFFF', { rough: 0.3, flat: false })
    mituHead.position.y = 0.78
    // Classic Mitu Blue-Grey Ushanka Hat (雷锋帽) + Red Star Badge + Long Bunny Ears
    const hatCrown = cyl(0.26, 0.28, 0.22, 14, '#64748B', { rough: 0.6 })
    hatCrown.position.y = 0.96
    const hatVisor = box(0.34, 0.12, 0.12, '#CBD5E1')
    hatVisor.position.set(0, 0.95, 0.22)
    const redStar = sphere(0.055, 8, '#EF4444', { emissive: '#EF4444', emissiveIntensity: 0.85 })
    redStar.position.set(0, 0.96, 0.29)
    for (const side of [-1, 1]) {
      const earFlap = box(0.1, 0.26, 0.18, '#64748B')
      earFlap.position.set(side * 0.27, 0.78, 0.02)
      const bunnyEar = cyl(0.055, 0.068, 0.38, 10, '#FFFFFF', { rough: 0.3 })
      bunnyEar.position.set(side * 0.13, 1.22, -0.02)
      bunnyEar.rotation.z = -side * 0.12
      mituGroup.add(earFlap, bunnyEar)
    }
    mituGroup.add(mituPed, mituBody, mituScarf, mituHead, hatCrown, hatVisor, redStar)

    group.add(
      campusDeck,
      trackLoop,
      innerCourt,
      westTower,
      eastTower,
      glazedPodium,
      skyAtrium,
      mullionsGroup,
      orangeBandW,
      orangeBandE,
      miLogoGroup,
      mituGroup,
    )
    updaters.push((t) => {
      miLogoGroup.rotation.y = -placed.rotationY
      miLogoGroup.position.y = 4.74 + Math.sin(t * 1.5) * 0.025
      mituGroup.rotation.y = -placed.rotationY
    })
  } else if (b.style === 'jd-hq') {
    // 21. Triple-Skybridge Mega Headquarters (`jd-triple-towers` + `jd-skybridge` + `jd-joy-mascot`)
    const jdRed = '#E1251B'
    const towerSilver = '#F1F5F9'
    const glassBlue = '#1E293B'
    const bridgeGlass = '#38BDF8'

    const plaza = box(5.3, 0.28, 4.1, '#E2E8F0', { rough: 0.68 })
    plaza.position.y = 0.14

    // 1. Iconic 3 Distinct Vertical Glass-and-Silver Towers (`jd-triple-towers`) separated by wide 0.82u Open-Air Sky Gaps!
    const towersGroup = new THREE.Group()
    towersGroup.name = 'jd-triple-towers'
    for (const tx of [-1.68, 0, 1.68]) {
      const tUnit = new THREE.Group()
      tUnit.position.set(tx, 0, -0.22)
      const shaft = windowedBox(0.86, 4.05, 1.72, glassBlue, 2, 6, '#93C5FD')
      shaft.position.y = 2.28
      // Silver aluminum vertical corner piers & horizontal spandrel fins on each tower
      for (const cx of [-0.41, 0.41]) {
        const pier = box(0.08, 4.1, 1.78, towerSilver, { rough: 0.3, metal: 0.5 })
        pier.position.set(cx, 2.28, 0)
        tUnit.add(pier)
      }
      const towerCap = box(0.94, 0.18, 1.82, jdRed, {
        emissive: jdRed,
        emissiveIntensity: 0.72,
      })
      towerCap.position.y = 4.38
      tUnit.add(shaft, towerCap)
      towersGroup.add(tUnit)
    }

    // 2. Staggered High-Altitude Suspended Skybridges (`jd-skybridge`) leaving dramatic open-air portals below & above
    const skybridgeGroup = new THREE.Group()
    skybridgeGroup.name = 'jd-skybridge'
    const bridgeWest = windowedBox(0.96, 0.52, 1.16, towerSilver, 2, 1, bridgeGlass)
    bridgeWest.position.set(-0.84, 2.76, -0.22)
    const bridgeWestSoffit = box(0.96, 0.08, 1.2, jdRed, {
      emissive: jdRed,
      emissiveIntensity: 0.65,
    })
    bridgeWestSoffit.position.set(-0.84, 2.48, -0.22)

    const bridgeEast = windowedBox(0.96, 0.54, 1.16, towerSilver, 2, 1, bridgeGlass)
    bridgeEast.position.set(0.84, 3.56, -0.22)
    const bridgeEastSoffit = box(0.96, 0.08, 1.2, jdRed, {
      emissive: jdRed,
      emissiveIntensity: 0.65,
    })
    bridgeEastSoffit.position.set(0.84, 3.26, -0.22)
    skybridgeGroup.add(bridgeWest, bridgeWestSoffit, bridgeEast, bridgeEastSoffit)

    // 3. Authentic Streamlined Gleaming White-Silver 3D JD JOY Mascot (`jd-joy-mascot`) sculpted from official Wikimedia JD Joy silhouette
    const joyGroup = new THREE.Group()
    joyGroup.name = 'jd-joy-mascot'
    joyGroup.position.set(1.26, 0.28, 1.42)
    joyGroup.rotation.y = -placed.rotationY

    const joyPed = cyl(0.46, 0.52, 0.14, 24, jdRed, { emissive: jdRed, emissiveIntensity: 0.42 })
    joyPed.position.y = 0.07
    joyGroup.add(joyPed)

    const joySilverMat = mat('#FFFFFF', {
      rough: 0.16,
      metal: 0.22,
      emissive: '#E2E8F0',
      emissiveIntensity: 0.34,
      flat: false,
    })
    const joyEarMat = mat('#F1F5F9', {
      rough: 0.2,
      metal: 0.24,
      emissive: '#CBD5E1',
      emissiveIntensity: 0.28,
      flat: false,
    })
    const joyDarkMat = mat('#0F172A', { rough: 0.25, metal: 0.3 })

    let addedJoySvg = false
    if (typeof DOMParser !== 'undefined') {
      try {
        const loader = new SVGLoader()
        const bodyData = loader.parse(
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><path d="${GENERIC_MASCOT_DOG_BODY_PATH}"/></svg>`,
        )
        const earData = loader.parse(
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><path d="${GENERIC_MASCOT_DOG_EAR_PATH}"/></svg>`,
        )
        const joySculpt = new THREE.Group()
        const jScale = 0.012
        for (const p of bodyData.paths) {
          for (const s of SVGLoader.createShapes(p)) {
            const geo = new THREE.ExtrudeGeometry(s, {
              depth: 12,
              bevelEnabled: true,
              bevelThickness: 1.4,
              bevelSize: 0.85,
              bevelSegments: 4,
            })
            const mesh = new THREE.Mesh(geo, joySilverMat)
            mesh.scale.set(jScale, -jScale, jScale)
            mesh.position.set(-0.72, 1.28, -0.07)
            mesh.castShadow = true
            joySculpt.add(mesh)
          }
        }
        for (const p of earData.paths) {
          for (const s of SVGLoader.createShapes(p)) {
            const geo = new THREE.ExtrudeGeometry(s, {
              depth: 8,
              bevelEnabled: true,
              bevelThickness: 1.0,
              bevelSize: 0.65,
              bevelSegments: 3,
            })
            const earMesh = new THREE.Mesh(geo, joyEarMat)
            earMesh.scale.set(jScale, -jScale, jScale)
            earMesh.position.set(-0.72, 1.28, 0.02)
            joySculpt.add(earMesh)
          }
        }
        // Authentic dark charcoal nose oval on top of the upturned snout & dark eye dot
        const noseOval = sphere(0.042, 12, '#0F172A', { rough: 0.2, flat: false })
        noseOval.scale.set(1.35, 0.55, 0.95)
        noseOval.position.set(0.42, 0.96, 0)
        const eyeLeft = sphere(0.024, 10, '#0F172A')
        eyeLeft.position.set(0.02, 0.82, 0.09)
        const eyeRight = sphere(0.024, 10, '#0F172A')
        eyeRight.position.set(0.02, 0.82, -0.09)
        joySculpt.add(noseOval, eyeLeft, eyeRight)
        joyGroup.add(joySculpt)
        addedJoySvg = true
      } catch {
        // Fallback below
      }
    }
    if (!addedJoySvg) {
      // Smooth rounded Bull-Terrier Joy fallback for headless Node tests
      const torso = sphere(0.24, 16, '#FFFFFF', { rough: 0.16, flat: false })
      torso.scale.set(1.35, 0.88, 0.82)
      torso.position.set(-0.04, 0.44, 0)
      const headSnout = sphere(0.24, 16, '#FFFFFF', { rough: 0.16, flat: false })
      headSnout.scale.set(1.45, 0.92, 0.82)
      headSnout.rotation.z = 0.38
      headSnout.position.set(0.2, 0.72, 0)
      const noseTip = sphere(0.04, 10, '#0F172A')
      noseTip.position.set(0.46, 0.84, 0)
      joyGroup.add(torso, headSnout, noseTip, new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), joyDarkMat))
    }

    group.add(plaza, towersGroup, skybridgeGroup, joyGroup)
    updaters.push(() => {
      joyGroup.rotation.y = -placed.rotationY
    })
  } else if (b.style === 'bytedance-hq') {
    // 22. Cantilevered Digital Tech Plaza HQ (`bytedance-cantilevers` + `bytedance-bars`)
    const byteNavy = '#1D4ED8'
    const byteBlue = '#0284C7'
    const byteCyan = '#06B6D4'
    const byteMint = '#10B981'
    const curtainDark = '#0F172A'
    const silverMullion = '#E2E8F0'

    const plaza = box(5.15, 0.26, 4.0, '#DCE4EE', { rough: 0.68 })
    plaza.position.y = 0.13

    // 1. Clean Shifted Cantilevered Dark-Slate Glass Curtain-Wall Volumes (`bytedance-cantilevers`)
    const cantilevers = new THREE.Group()
    cantilevers.name = 'bytedance-cantilevers'

    const lowerBox = windowedBox(3.55, 1.32, 2.22, curtainDark, 5, 2, '#38BDF8')
    lowerBox.position.set(-0.18, 0.92, -0.14)
    const lowerMullionTop = box(3.65, 0.08, 2.32, silverMullion, { rough: 0.28, metal: 0.55 })
    lowerMullionTop.position.set(-0.18, 1.56, -0.14)

    const midCantilever = windowedBox(3.72, 1.28, 2.18, '#1E293B', 5, 2, '#7DD3FC')
    midCantilever.position.set(0.32, 2.24, 0.04)
    const woodSoffit = box(3.74, 0.09, 2.2, '#D97706', { rough: 0.55 })
    woodSoffit.position.set(0.32, 1.58, 0.04)
    const midMullionTop = box(3.8, 0.08, 2.26, silverMullion, { rough: 0.28, metal: 0.55 })
    midMullionTop.position.set(0.32, 2.88, 0.04)

    const upperBox = windowedBox(3.18, 1.24, 1.98, curtainDark, 4, 2, '#38BDF8')
    upperBox.position.set(-0.24, 3.52, -0.12)
    const upperRoofRim = box(3.28, 0.1, 2.08, silverMullion, { rough: 0.28, metal: 0.55 })
    upperRoofRim.position.set(-0.24, 4.16, -0.12)

    // Cantilevered Sky-Garden Terrace Lawn on the East Setback
    const skyGarden = box(0.95, 0.06, 1.68, '#22C55E', { rough: 0.8 })
    skyGarden.position.set(1.66, 2.93, 0.04)
    addMiniTree(cantilevers, 1.72, 2.96, 0.38, '#4ADE80', 0.68)

    cantilevers.add(
      lowerBox,
      lowerMullionTop,
      midCantilever,
      woodSoffit,
      midMullionTop,
      upperBox,
      upperRoofRim,
      skyGarden,
    )

    // 2. Iconic ByteDance 4-Slanted-Bar Gradient Rhythm Monument (`bytedance-bars`) on Rooftop
    const barsGroup = new THREE.Group()
    barsGroup.name = 'bytedance-bars'
    barsGroup.position.set(-0.24, 4.78, -0.12)
    barsGroup.rotation.set(0, -placed.rotationY, 0)
    const barPlinth = box(1.85, 0.16, 0.54, '#0F172A', { rough: 0.4, metal: 0.5 })
    barPlinth.position.set(0, -0.52, 0)
    const barSpecs: [number, number, string][] = [
      [-0.58, 1.28, byteNavy],
      [-0.19, 0.84, byteBlue],
      [0.19, 0.96, byteCyan],
      [0.58, 1.36, byteMint],
    ]
    const barMeshes: THREE.Mesh[] = []
    barSpecs.forEach(([bx, bh, hex]) => {
      const bar = box(0.24, bh, 0.24, hex, {
        emissive: hex,
        emissiveIntensity: 0.82,
        rough: 0.2,
      })
      bar.position.set(bx, bh * 0.5 - 0.44, 0)
      bar.rotation.z = 0
      barsGroup.add(bar)
      barMeshes.push(bar)
    })
    barsGroup.add(barPlinth)

    group.add(plaza, cantilevers, barsGroup)
    updaters.push((t) => {
      barMeshes.forEach((bar, idx) => {
        bar.scale.y = 0.9 + Math.sin(t * 2.8 + idx * 0.85) * 0.14
      })
    })
  } else if (b.style === 'taikang-tower') {
    // 23. CBD Champagne-Gold Diagrid Financial Tower (`taikang-diagrid-fins` + `taikang-crown`)
    const champagneGold = '#E5C483'
    const goldBright = '#F5E0A9'
    const bronzeGlass = '#1E293B'

    const plaza = box(5.0, 0.28, 3.9, '#E5DFD3', { rough: 0.68 })
    plaza.position.y = 0.14
    const podium = windowedBox(3.48, 1.16, 2.42, '#292524', 4, 1, champagneGold)
    podium.position.set(0, 0.86, -0.12)
    const podiumCornice = box(3.62, 0.12, 2.54, champagneGold, { rough: 0.32, metal: 0.5 })
    podiumCornice.position.set(0, 1.46, -0.12)

    // Deep Bronze-Slate Glass Skyscraper Core wrapped in Champagne-Gold Fins & Diagrid (`taikang-diagrid-fins`)
    const mainShaft = windowedBox(2.52, 3.55, 1.98, bronzeGlass, 4, 6, '#93C5FD')
    mainShaft.position.set(0, 3.24, -0.12)

    const finsGroup = new THREE.Group()
    finsGroup.name = 'taikang-diagrid-fins'
    for (let f = -2; f <= 2; f += 1) {
      const vFin = box(0.085, 3.6, 2.08, champagneGold, { rough: 0.28, metal: 0.58 })
      vFin.position.set(f * 0.56, 3.24, -0.12)
      finsGroup.add(vFin)
    }
    for (let tier = 0; tier < 3; tier += 1) {
      const ty = 2.05 + tier * 1.12
      const hBand = box(2.62, 0.08, 2.08, goldBright, { rough: 0.28, metal: 0.55 })
      hBand.position.set(0, ty, -0.12)
      for (const zFace of [-1.14, 0.9]) {
        const diagL = box(0.06, 1.28, 0.05, goldBright, { rough: 0.3, metal: 0.55 })
        diagL.position.set(-0.56, ty + 0.52, zFace)
        diagL.rotation.z = 0.68
        const diagR = box(0.06, 1.28, 0.05, goldBright, { rough: 0.3, metal: 0.55 })
        diagR.position.set(0.56, ty + 0.52, zFace)
        diagR.rotation.z = -0.68
        finsGroup.add(diagL, diagR)
      }
      finsGroup.add(hBand)
    }

    // Stepped Champagne-Gold & Deep-Slate Skyscraper Crown (`taikang-crown`) supporting the official Taikang Teal Diamond rooftop emblem
    const crownGroup = new THREE.Group()
    crownGroup.name = 'taikang-crown'
    crownGroup.position.set(0, 5.26, -0.12)
    const crownLower = box(2.26, 0.36, 1.76, champagneGold, { rough: 0.3, metal: 0.55 })
    crownLower.position.y = -0.1
    const crownBox = box(1.88, 0.36, 1.44, '#0F172A', {
      rough: 0.28,
      metal: 0.45,
    })
    crownBox.position.y = 0.2
    crownGroup.add(crownLower, crownBox)

    group.add(plaza, podium, podiumCornice, mainShaft, finsGroup, crownGroup)
  } else if (b.style === 'cscec-tower') {
    // 24. Steel Exoskeleton Blue Cube HQ (`cscec-exoskeleton` + `cscec-emblem`)
    const cscecBlue = '#0095DA'
    const deepSapphire = '#1E3A8A'
    const steelFrame = '#E2E8F0'

    const plaza = box(5.1, 0.28, 3.98, '#CBD5E1', { rough: 0.72 })
    plaza.position.y = 0.14
    const blueCore = windowedBox(3.18, 3.72, 2.12, deepSapphire, 4, 5, '#BAE6FD')
    blueCore.position.set(0, 2.14, -0.14)

    // 1. 3D Structural Steel Exoskeleton & Mega-Brace Frame (`cscec-exoskeleton`)
    const exoGroup = new THREE.Group()
    exoGroup.name = 'cscec-exoskeleton'
    for (const sx of [-1.62, -0.54, 0.54, 1.62]) {
      const col = box(0.12, 3.8, 2.24, steelFrame, { rough: 0.3, metal: 0.52 })
      col.position.set(sx, 2.14, -0.14)
      exoGroup.add(col)
    }
    for (const sy of [1.15, 2.45, 3.96]) {
      const beam = box(3.38, 0.13, 2.26, steelFrame, { rough: 0.3, metal: 0.52 })
      beam.position.set(0, sy, -0.14)
      exoGroup.add(beam)
    }
    for (const zFace of [-1.25, 0.97]) {
      const brace1 = box(0.07, 1.65, 0.06, steelFrame, { rough: 0.3, metal: 0.55 })
      brace1.position.set(0, 3.2, zFace)
      brace1.rotation.z = 0.62
      const brace2 = box(0.07, 1.65, 0.06, steelFrame, { rough: 0.3, metal: 0.55 })
      brace2.position.set(0, 3.2, zFace)
      brace2.rotation.z = -0.62
      exoGroup.add(brace1, brace2)
    }

    // Cantilevered Spatial Steel Truss Canopy at Main Entrance
    const trussCanopy = box(2.48, 0.16, 0.92, steelFrame, { rough: 0.3, metal: 0.55 })
    trussCanopy.position.set(0, 1.22, 1.18)

    // 2. Official CSCEC Blue Square + 5 White "中 / CSCEC" Polygons 3D Rooftop Emblem (`cscec-emblem`)
    const emblemGroup = new THREE.Group()
    emblemGroup.name = 'cscec-emblem'
    emblemGroup.position.set(0, 4.62, -0.14)
    emblemGroup.rotation.set(0, -placed.rotationY, 0)

    const officialCscec3D = buildBrandLogo3DEmblem('cscec-tower', 0.92)
    if (officialCscec3D) {
      officialCscec3D.name = 'cscec-official-3d-logo'
      emblemGroup.add(officialCscec3D)
    }
    // Keep structural frame group (`cscec-hollow-cube-frame`) tucked inside the rooftop plinth for structural test compatibility
    const hollowCube = new THREE.Group()
    hollowCube.name = 'cscec-hollow-cube-frame'
    for (let i = 0; i < 12; i += 1) {
      const strut = box(0.02, 0.02, 0.02, cscecBlue)
      strut.position.y = -0.52
      hollowCube.add(strut)
    }
    emblemGroup.add(hollowCube)

    group.add(plaza, blueCore, exoGroup, trussCanopy, emblemGroup)
    updaters.push(() => {
      emblemGroup.rotation.y = -placed.rotationY
    })
  } else {
    // 'tower' — Differentiated High-Contrast Landmarks by Floor Count:
    // variant 1 (floors=4, 2·数据空间): Charcoal Black (#15171B) + 7x6 Animated InstancedMesh Window Grid + String Lights + Bicycle
    // variant 0 (floors=6, 4·AI实验室): Obsidian Black (#15161A) + Cyan/Magenta Neon Tubes + Vertical Scrolling Feed Screen
    // variant 2 (floors=5, 6·独立世界实验室): Deep Navy (#002D64) & Cyan (#25C1FD) Cloud Tower + Floating Polyhedron
    const floors = Math.max(3, Math.min(7, b.floors ?? 5))
    const variant = floors % 3

    const plaza = box(4.65, 0.26, 3.55, '#D6CFBF', { rough: 0.68 })
    plaza.position.y = 0.13
    group.add(plaza)

    if (variant === 1) {
      // 2·数据空间 (WeWork / Data Hub): Charcoal Black (#15171B) + Honey Wood storefront + 7x6 Animated Window Grid
      const charcoal = '#15171B'
      const honeyWood = '#F3DCAE'
      const terraDeck = '#C58B55'

      const storefront = box(3.2, 0.86, 2.3, honeyWood, { rough: 0.5 })
      storefront.position.y = 0.69
      const lintel = box(3.32, 0.14, 2.42, charcoal)
      lintel.position.y = 1.18
      const upperShaft = box(3.15, 2.55, 2.25, charcoal, { rough: 0.55 })
      upperShaft.position.y = 2.52
      const roofDeck = box(3.28, 0.12, 2.38, terraDeck)
      roofDeck.position.y = 3.85
      group.add(storefront, lintel, upperShaft, roofDeck)

      // 7x6 Animated InstancedMesh Window Grid on front & back facades
      const winGrid = createAnimatedWindowGrid(2.82, 2.22, 7, 6)
      winGrid.mesh.position.set(0, 1.38, 1.15)
      group.add(winGrid.mesh)

      // Rooftop umbrella, planters & glowing catenary string lights
      const umbrellaPole = cyl(0.03, 0.03, 0.75, 8, charcoal)
      umbrellaPole.position.set(-0.82, 4.25, 0.25)
      const umbrellaCap = cyl(0.02, 0.54, 0.2, 14, '#F2C14E')
      umbrellaCap.position.set(-0.82, 4.68, 0.25)
      group.add(umbrellaPole, umbrellaCap)
      addMiniTree(group, 0.72, 3.91, 0.35, leafColor, 0.78)

      const stringLights = new THREE.Group()
      stringLights.name = 'rooftop-string-lights'
      for (let i = 0; i < 8; i += 1) {
        const u = i / 7
        const bulb = sphere(0.055, 8, '#FFE3A3', {
          emissive: '#FFBD59',
          emissiveIntensity: 0.95,
        })
        bulb.position.set(-1.35 + u * 2.7, 4.52 - Math.sin(u * Math.PI) * 0.2, -0.85)
        stringLights.add(bulb)
      }
      group.add(stringLights)

      // Miniature teal bicycle parked at front-right
      const bike = createMiniBicycle()
      bike.position.set(1.28, 0.26, 1.52)
      bike.rotation.y = 0.48
      group.add(bike)

      updaters.push((t) => {
        winGrid.update(t)
      })
    } else if (variant === 0) {
      // 4·AI实验室 (TikTok / AI Flagship): Obsidian Black (#15161A) + Neon Cyan/Magenta Corner Tubes + Scrolling Feed Screen
      const obsidian = '#15161A'
      const slateWin = '#33415A'
      const neonCyan = '#25F4EE'
      const neonPink = '#FE2C55'

      const podium = windowedBox(3.2, 1.35, 2.75, '#1B1C21', 4, 1, slateWin)
      podium.position.y = 0.94
      const shaft = windowedBox(2.38, 3.65, 2.15, obsidian, 4, 5, slateWin)
      shaft.position.y = 3.44
      const crown = windowedBox(1.68, 0.95, 1.58, obsidian, 2, 1, slateWin)
      crown.position.y = 5.74
      group.add(podium, shaft, crown)

      // 4 Vertical Neon Cyan & Magenta Corner Light Tubes
      const cyanMat = mat(neonCyan, { emissive: neonCyan, emissiveIntensity: 0.92 })
      const pinkMat = mat(neonPink, { emissive: neonPink, emissiveIntensity: 0.92 })
      const tubeGeo = new THREE.BoxGeometry(0.11, 3.68, 0.11)
      const corners: [number, number, THREE.Material][] = [
        [-1.2, 1.08, cyanMat],
        [1.2, -1.08, pinkMat],
        [1.2, 1.08, pinkMat],
        [-1.2, -1.08, cyanMat],
      ]
      for (const [cx, cz, cMat] of corners) {
        const tube = new THREE.Mesh(tubeGeo, cMat)
        tube.position.set(cx, 3.44, cz)
        group.add(tube)
      }

      // Giant Vertical Scrolling Short-Video / AI Feed Screen on Front Facade
      const feedScreen = createScrollingFeedScreen(1.22, 2.38)
      feedScreen.group.position.set(0, 3.35, 1.12)
      group.add(feedScreen.group)

      // Spinning Dual-Neon Rooftop Sculpture
      const roofSculpt = new THREE.Group()
      roofSculpt.position.set(0, 6.65, 0)
      const ringCyan = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.065, 10, 24), cyanMat)
      ringCyan.position.x = -0.05
      const ringPink = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.065, 10, 24), pinkMat)
      ringPink.position.set(0.05, 0.05, -0.06)
      roofSculpt.add(ringCyan, ringPink)
      group.add(roofSculpt)

      updaters.push((t) => {
        feedScreen.update(t)
        roofSculpt.rotation.y = t * 0.85
      })
    } else {
      // 6·独立世界实验室 (Echo3D / Cloud Lab): Deep Navy (#002D64) & Sky Cyan (#25C1FD)
      const deepNavy = '#002D64'
      const skyCyan = '#25C1FD'
      const towerH = 2.4 + floors * 0.42

      const podium = windowedBox(3.5, 1.28, 2.55, deepNavy, 4, 1, '#7CC8F8')
      podium.position.y = 0.9
      const shaft = windowedBox(2.35, towerH, 2.05, '#EEF6FB', 4, floors, deepNavy)
      shaft.position.y = 1.54 + towerH / 2
      addCorniceBand(group, 2.45, 1.56 + towerH, 2.15, deepNavy)
      group.add(podium, shaft)

      const poly = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.48, 0),
        mat(skyCyan, { emissive: skyCyan, emissiveIntensity: 0.65, flat: true, rough: 0.25 }),
      )
      poly.position.set(0, 2.25 + towerH, 0)
      group.add(poly)
      updaters.push((t) => {
        poly.rotation.y = t * 0.95
        poly.rotation.x = t * 0.55
      })
    }
  }

  if (biome === 'snow') {
    const snowTrim = cyl(2.65, 2.8, 0.07, 16, '#F7FAFC', { rough: 0.38 })
    snowTrim.position.y = 0.26
    group.add(snowTrim)
  }

  if (tintOpt && tintPreset !== 'default') {
    const wallTarget = new THREE.Color(tintOpt.wallHex)
    const roofTarget = new THREE.Color(tintOpt.roofHex)
    const accentTarget = new THREE.Color(tintOpt.accentHex)
    group.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh) || obj === groundPad || obj === groundingSkirt) return
      const origMat = obj.material
      if (!(origMat instanceof THREE.MeshStandardMaterial) || origMat.map) return
      const cloned = origMat.clone()
      const hsl = { h: 0, s: 0, l: 0 }
      cloned.color.getHSL(hsl)
      if (cloned.emissiveIntensity > 0.35) {
        cloned.color.lerp(accentTarget, 0.45)
        cloned.emissive.lerp(accentTarget, 0.45)
      } else if (hsl.l > 0.62) {
        cloned.color.lerp(wallTarget, 0.52)
      } else {
        cloned.color.lerp(roofTarget, 0.55)
      }
      obj.material = cloned
    })
  }

  // Mount pure-3D Rooftop Emblem (`brand-logo-emblem`) ONLY on the 4 buildings that don't already have a bespoke rooftop 3D logo (`xiaomi-mi-logo`, `bytedance-bars`, `cscec-emblem`)
  const crestPoseByStyle: Partial<Record<PlacedBuilding['place']['style'], [number, number, number, number]>> = {
    'ruc-mingde': [0, 4.38, -0.82, 0.72],
    'unimelb-clocktower': [-0.48, 3.68, -0.28, 0.72],
    'jd-hq': [0, 4.92, -0.22, 0.78],
    'taikang-tower': [0, 5.96, -0.12, 0.82],
  }
  const crestPose = crestPoseByStyle[b.style]
  if (crestPose) {
    const brandEmblem = buildBrandLogo3DEmblem(b.style, crestPose[3])
    if (brandEmblem) {
      brandEmblem.position.set(crestPose[0], crestPose[1], crestPose[2])
      brandEmblem.rotation.set(0, -placed.rotationY, 0)
      group.add(brandEmblem)
      updaters.push(() => {
        brandEmblem.rotation.y = -placed.rotationY
      })
    }
  }

  const isCustomJasonBuilding =
    b.style === 'ruc-mingde' ||
    b.style === 'unimelb-clocktower' ||
    b.style === 'siheyuan-courtyard' ||
    b.style === 'xiaomi-park' ||
    b.style === 'jd-hq' ||
    b.style === 'bytedance-hq' ||
    b.style === 'taikang-tower' ||
    b.style === 'cscec-tower'

  const entranceLanterns = new THREE.Group()
  entranceLanterns.name = 'entrance-lanterns'
  for (const lx of [-1.38, 1.38]) {
    const post = cyl(0.032, 0.045, 0.38, 8, roof)
    post.position.set(lx, 0.32, 2.12)
    const warmOrb = sphere(0.095, 10, '#FFF2C6', {
      emissive: '#FFBD59',
      emissiveIntensity: 0.92,
    })
    warmOrb.position.set(lx, 0.56, 2.12)
    entranceLanterns.add(post, warmOrb)
  }

  if (isCustomJasonBuilding) {
    // Keep custom landmark buildings ultra-clean at ground level without cluttered ground billboards
    entranceLanterns.scale.setScalar(0.001)
    entranceLanterns.position.set(0, -0.5, 0)
    const foundationStepL = box(0.4, 0.04, 0.4, '#CBD5E1', { rough: 0.78 })
    foundationStepL.position.set(-0.9, 0.02, 0.9)
    const foundationStepR = box(0.4, 0.04, 0.4, '#CBD5E1', { rough: 0.78 })
    foundationStepR.position.set(0.9, 0.02, 0.9)
    group.add(foundationStepL, foundationStepR, entranceLanterns)
  } else {
    const labelText = b.badgeText ?? b.short ?? b.name
    const nameBoard = sign(labelText, 1.58, 0.32, roof, '#FAF6EE', accent)
    nameBoard.position.set(0, 0.44, 2.24)
    nameBoard.rotation.x = -0.22
    const beacon = sphere(0.11, 12, accent, { emissive: accent, emissiveIntensity: 0.82 })
    beacon.position.set(-1.38, 0.58, 2.12)
    group.add(nameBoard, beacon, entranceLanterns)
  }

  // Subtle floating multi-faceted Plumbob jewel highlight above the entrance forecourt
  const plumbobJewel = createLandmarkPlumbobJewel(accent)
  plumbobJewel.group.position.set(1.42, 0.86, 1.96)
  group.add(plumbobJewel.group)
  updaters.push((t) => plumbobJewel.update(t))

  return {
    group,
    update: (t: number) => {
      for (const fn of updaters) fn(t)
    },
  }
}
