import * as THREE from 'three'
import type { BiomeType as BiomeId, ThemePalette as ThemeJson } from '../schema/profile.ts'
import type { PlacedBuilding } from './layout.ts'
import { rng, spring } from './motion.ts'
import { mat, box, cyl, sphere, pyramid, shadow, cumulusCloud } from './kit.ts'

export interface BuiltLife {
  group: THREE.Group
  update: (t: number) => void
}

type Updater = (t: number) => void

/**
 * Converts a 2D velocity vector (vx, vz) into Three.js Y-rotation
 * for a mesh whose local forward axis is +X.
 */
export function headingFromVelocityX(vx: number, vz: number): number {
  return Math.atan2(-vz, vx)
}

function makeBirds(theme: ThemeJson): { group: THREE.Group; update: Updater } {
  const group = new THREE.Group()
  group.name = 'primary-birds'
  const wings: { left: THREE.Mesh; right: THREE.Mesh; phase: number }[] = []
  const wingMat = mat(theme.shared.roof, { rough: 0.75, doubleSide: true })

  // Delicate V-formation facing +X: leader at (0,0,0), followers trailing at -X and ±Z
  const offsets: [number, number][] = [
    [0, 0],
    [-0.65, -0.68],
    [-0.65, 0.68],
    [-1.3, -1.35],
    [-1.3, 1.35],
    [-1.95, -2.0],
    [-1.95, 2.0],
  ]

  offsets.forEach(([x, z], i) => {
    const bird = new THREE.Group()
    const body = sphere(0.065, 8, theme.shared.roof, { rough: 0.75 })
    body.scale.set(1.85, 0.52, 0.62)

    const leftGeo = new THREE.PlaneGeometry(0.13, 0.36)
    leftGeo.rotateX(Math.PI / 2)
    leftGeo.translate(0, 0, -0.18)
    const rightGeo = new THREE.PlaneGeometry(0.13, 0.36)
    rightGeo.rotateX(Math.PI / 2)
    rightGeo.translate(0, 0, 0.18)

    const left = new THREE.Mesh(leftGeo, wingMat)
    const right = new THREE.Mesh(rightGeo, wingMat)
    bird.add(body, left, right)
    bird.position.set(x, -Math.abs(z) * 0.04, z)
    group.add(bird)
    wings.push({ left, right, phase: i * 0.55 })
  })

  return {
    group,
    update: (t) => {
      const a = t * 0.16 + 0.35
      const r = 14.5
      const x = Math.cos(a) * r + 3.5
      const z = Math.sin(a) * r - 7.5
      const vx = -Math.sin(a) * r
      const vz = Math.cos(a) * r
      group.position.set(x, 11.2 + Math.sin(t * 0.6) * 0.45, z)
      group.rotation.y = headingFromVelocityX(vx, vz)
      wings.forEach(({ left, right, phase }) => {
        const flap = Math.sin(t * 7.4 + phase) * 0.52
        left.rotation.x = -flap
        right.rotation.x = flap
      })
    },
  }
}

function makeSecondaryBirds(theme: ThemeJson): { group: THREE.Group; update: Updater } {
  const group = new THREE.Group()
  group.name = 'secondary-birds'
  const wings: { left: THREE.Mesh; right: THREE.Mesh; phase: number }[] = []
  const wingMat = mat(theme.shared.roof, { rough: 0.72, doubleSide: true })

  const offsets: [number, number][] = [
    [0, 0],
    [-0.6, -0.62],
    [-0.6, 0.62],
    [-1.2, -1.24],
  ]

  offsets.forEach(([x, z], i) => {
    const bird = new THREE.Group()
    const body = sphere(0.058, 8, theme.shared.roof, { rough: 0.7 })
    body.scale.set(1.8, 0.5, 0.6)
    bird.add(body)

    const leftGeo = new THREE.PlaneGeometry(0.12, 0.32)
    leftGeo.rotateX(Math.PI / 2)
    leftGeo.translate(0, 0, -0.16)
    const rightGeo = new THREE.PlaneGeometry(0.12, 0.32)
    rightGeo.rotateX(Math.PI / 2)
    rightGeo.translate(0, 0, 0.16)

    const left = new THREE.Mesh(leftGeo, wingMat)
    const right = new THREE.Mesh(rightGeo, wingMat)
    bird.add(left, right)
    bird.position.set(x, 0, z)
    group.add(bird)
    wings.push({ left, right, phase: i * 0.6 })
  })

  return {
    group,
    update: (t) => {
      // Counter-clockwise orbit over northern/eastern horizon
      const a = -t * 0.17 + 2.2
      const r = 17.5
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r - 8.5
      const vx = Math.sin(a) * r
      const vz = -Math.cos(a) * r
      group.position.set(x, 11.8 + Math.cos(t * 0.7) * 0.45, z)
      group.rotation.y = headingFromVelocityX(vx, vz)
      wings.forEach(({ left, right, phase }) => {
        const flap = Math.sin(t * 7.8 + phase) * 0.48
        left.rotation.x = -flap
        right.rotation.x = flap
      })
    },
  }
}

function makeBiplane(theme: ThemeJson): { group: THREE.Group; update: Updater } {
  // Local forward axis is +X (nose at +X, tail at -X, wings along Z)
  const group = new THREE.Group()
  group.name = 'biplane'
  const accent = theme.shared.accent
  const cream = '#FAF6EE'
  const dark = theme.shared.roof

  const fuselage = cyl(0.24, 0.16, 1.95, 10, cream, { rough: 0.45 })
  fuselage.rotation.z = -Math.PI / 2
  const noseCowling = cyl(0.25, 0.25, 0.36, 10, accent, { rough: 0.4 })
  noseCowling.rotation.z = -Math.PI / 2
  noseCowling.position.x = 1.02

  // Upper & lower biplane wings spanning Z
  const upperWing = box(0.56, 0.07, 2.85, accent, { rough: 0.45 })
  upperWing.position.set(0.18, 0.36, 0)
  const lowerWing = box(0.52, 0.07, 2.55, cream, { rough: 0.48 })
  lowerWing.position.set(0.12, -0.14, 0)

  // Interplane struts
  for (const sz of [-0.95, 0.95]) {
    const strut = cyl(0.025, 0.025, 0.5, 6, dark)
    strut.position.set(0.15, 0.11, sz)
    group.add(strut)
  }

  // Tail fin & horizontal stabilizer at -X
  const tailFin = box(0.42, 0.46, 0.06, accent)
  tailFin.position.set(-0.88, 0.24, 0)
  const tailPlane = box(0.36, 0.05, 0.96, cream)
  tailPlane.position.set(-0.88, 0.04, 0)

  // Pilot head in open cockpit
  const pilot = sphere(0.14, 8, dark)
  pilot.position.set(-0.08, 0.24, 0)

  // Spinning nose propeller at +X
  const propGroup = new THREE.Group()
  propGroup.position.set(1.24, 0, 0)
  const spinner = sphere(0.1, 8, dark)
  const blade1 = box(0.04, 0.78, 0.09, dark)
  const blade2 = box(0.04, 0.09, 0.78, dark)
  propGroup.add(spinner, blade1, blade2)

  // Trailing white contrail puffs behind tail (-X)
  const contrail: THREE.Mesh[] = []
  for (let i = 0; i < 8; i += 1) {
    const puff = sphere(0.13 + i * 0.025, 7, '#FFFFFF', { opacity: Math.max(0.12, 0.56 - i * 0.06) })
    puff.position.set(-1.35 - i * 0.42, 0, 0)
    group.add(puff)
    contrail.push(puff)
  }

  group.add(fuselage, noseCowling, upperWing, lowerWing, tailFin, tailPlane, pilot, propGroup)
  group.scale.setScalar(0.92)

  return {
    group,
    update: (t) => {
      // Inter-island air-bridge circuit linking Main Island, West Hub & East Skyline Airfield (18.8, -13.2)
      const a = -t * 0.22 + 1.15
      const rx = 18.8
      const rz = 12.2
      const theta = -0.36
      const cosT = Math.cos(theta)
      const sinT = Math.sin(theta)
      const u = Math.cos(a) * rx
      const v = Math.sin(a) * rz
      const du = Math.sin(a) * rx
      const dv = -Math.cos(a) * rz
      const x = 2.8 + u * cosT - v * sinT
      const z = -5.2 + u * sinT + v * cosT
      const vx = du * cosT - dv * sinT
      const vz = du * sinT + dv * cosT
      group.position.set(x, 10.6 + Math.sin(t * 0.8) * 0.72, z)
      group.rotation.y = headingFromVelocityX(vx, vz)
      group.rotation.x = 0.18 + Math.sin(t * 0.8) * 0.06 // inward bank
      propGroup.rotation.x = t * 32
      contrail.forEach((puff, i) => {
        puff.position.y = Math.sin(t * 5 - i * 0.6) * 0.06
        puff.scale.setScalar(0.85 + ((t * 1.8 + i * 0.15) % 1) * 0.55)
      })
    },
  }
}

function sailBoat(theme: ThemeJson): { group: THREE.Group; update: Updater } {
  // Local forward is +X (bow at +X, stern at -X)
  const group = new THREE.Group()
  group.name = 'sailboat-fleet'
  const hull = sphere(1.45, 12, '#73503A', { rough: 0.8, flat: true })
  hull.scale.set(1.45, 0.38, 0.68)
  hull.position.y = 0.25
  group.add(hull)

  const mast = cyl(0.05, 0.07, 3.5, 8, theme.shared.roof)
  mast.position.y = 2.05
  group.add(mast)

  const tri = (w: number, h: number, color: string) => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 0, 0, w, 0, 0, 0, h, 0], 3),
    )
    geo.computeVertexNormals()
    return shadow(
      new THREE.Mesh(geo, mat(color, { rough: 0.55, doubleSide: true })),
      true,
      false,
    ) as THREE.Mesh
  }

  // Main sail trails aft (-X), jib extends forward (+X) along the hull
  const main = tri(-1.55, 2.75, '#F8EBD3')
  main.position.set(-0.08, 0.72, 0)
  main.rotation.y = 0.14
  const jib = tri(1.1, 1.95, theme.shared.accent)
  jib.position.set(0.1, 1.1, 0)
  jib.rotation.y = -0.12
  const flag = box(0.48, 0.24, 0.035, theme.shared.accent, {
    emissive: theme.shared.accent,
    emissiveIntensity: 0.15,
  })
  flag.position.set(-0.24, 3.78, 0)
  const wake = new THREE.Mesh(
    new THREE.TorusGeometry(1.55, 0.055, 6, 30, Math.PI * 1.45),
    mat('#FFFFFF', { opacity: 0.54 }),
  )
  wake.rotation.x = Math.PI / 2
  wake.position.y = 0.05
  group.add(main, jib, flag, wake)

  // Trailing escort dinghy sailing in echelon formation
  const dinghy = new THREE.Group()
  dinghy.name = 'escort-dinghy'
  dinghy.position.set(-2.9, 0, 1.35)
  dinghy.scale.setScalar(0.58)
  const dHull = sphere(1.3, 10, '#FAF6EE', { rough: 0.65 })
  dHull.scale.set(1.4, 0.36, 0.65)
  dHull.position.y = 0.22
  const dMast = cyl(0.045, 0.06, 2.8, 8, theme.shared.roof)
  dMast.position.y = 1.65
  const dSail = tri(-1.25, 2.2, '#38BDF8')
  dSail.position.set(-0.06, 0.6, 0)
  dinghy.add(dHull, dMast, dSail)
  group.add(dinghy)

  return {
    group,
    update: (t) => {
      // Outer obstacle-free maritime sea lane (r = 32.4) strictly outside all satellite islands
      const a = t * 0.072 - 0.52
      const r = 32.4
      const vx = -Math.sin(a) * r
      const vz = Math.cos(a) * r
      group.position.set(
        Math.cos(a) * r,
        -0.02 + Math.sin(t * 1.25) * 0.12,
        Math.sin(a) * r,
      )
      group.rotation.y = headingFromVelocityX(vx, vz)
      group.rotation.x = Math.sin(t * 1.1) * 0.045
      group.scale.setScalar(spring(Math.min(t + 0.4, 1.4), 0.72, 1.8))
      flag.rotation.y = Math.sin(t * 4.2) * 0.24
      wake.scale.setScalar(0.95 + Math.sin(t * 2) * 0.08)
    },
  }
}

function pastoralTractor(theme: ThemeJson): { group: THREE.Group; update: Updater } {
  // Local forward is +X: vintage farm tractor + hay-bale trailer cruising the outer pastoral meadow
  const group = new THREE.Group()
  group.name = 'pastoral-tractor'
  const accent = theme.shared.accent
  const dark = theme.shared.roof

  const hood = box(1.05, 0.46, 0.62, accent, { rough: 0.55 })
  hood.position.set(0.28, 0.48, 0)
  const cab = box(0.62, 0.58, 0.66, '#FAF6EE', { rough: 0.6 })
  cab.position.set(-0.28, 0.74, 0)
  const cabRoof = box(0.7, 0.1, 0.72, accent, { rough: 0.5 })
  cabRoof.position.set(-0.28, 1.06, 0)
  const pipe = cyl(0.04, 0.05, 0.52, 8, dark)
  pipe.position.set(0.56, 0.88, 0.18)
  group.add(hood, cab, cabRoof, pipe)

  const wheelsGroup = new THREE.Group()
  wheelsGroup.name = 'tractor-wheels'
  const wheelMeshes: THREE.Mesh[] = []
  for (const [wx, wy, wz, wr] of [
    [-0.28, 0.34, -0.38, 0.34],
    [-0.28, 0.34, 0.38, 0.34],
    [0.58, 0.22, -0.34, 0.22],
    [0.58, 0.22, 0.34, 0.22],
  ] as const) {
    const w = cyl(wr, wr, 0.16, 12, dark, { rough: 0.85 })
    w.rotation.x = Math.PI / 2
    w.position.set(wx, wy, wz)
    wheelsGroup.add(w)
    wheelMeshes.push(w)
  }
  group.add(wheelsGroup)

  // Towed wooden hay-bale trailer at -X
  const trailer = new THREE.Group()
  trailer.name = 'tractor-trailer'
  trailer.position.set(-1.65, 0, 0)
  const hitch = box(0.55, 0.08, 0.12, dark)
  hitch.position.set(0.82, 0.26, 0)
  const bed = box(1.35, 0.14, 0.82, '#8C6239', { rough: 0.85 })
  bed.position.set(0, 0.32, 0)
  const bale1 = cyl(0.32, 0.32, 0.68, 12, '#DEB853', { rough: 0.88 })
  bale1.rotation.x = Math.PI / 2
  bale1.position.set(0.28, 0.66, 0)
  const bale2 = cyl(0.32, 0.32, 0.68, 12, '#E5C365', { rough: 0.88 })
  bale2.rotation.x = Math.PI / 2
  bale2.position.set(-0.32, 0.66, 0)
  trailer.add(hitch, bed, bale1, bale2)
  group.add(trailer)

  return {
    group,
    update: (t) => {
      const a = t * 0.068 - 0.52
      const r = 32.4
      const vx = -Math.sin(a) * r
      const vz = Math.cos(a) * r
      group.position.set(
        Math.cos(a) * r,
        0.22 + Math.abs(Math.sin(t * 6.5)) * 0.025,
        Math.sin(a) * r,
      )
      group.rotation.y = headingFromVelocityX(vx, vz)
      wheelMeshes.forEach((w) => {
        w.rotation.y = -t * 3.8
      })
    },
  }
}

function sampleOuterDesertDuneHeight(x: number, z: number): number {
  const r = Math.hypot(x, z)
  const satClear =
    Math.min(1, Math.max(0, (Math.hypot(x + 21.8, z + 4.8) - 5.2) / 3.0)) *
    Math.min(1, Math.max(0, (Math.hypot(x - 18.8, z + 13.2) - 5.0) / 3.0)) *
    Math.min(1, Math.max(0, (Math.hypot(x + 22.2, z - 14.2) - 3.8) / 2.6))
  const dunes = 0.32 + 0.44 * Math.sin(x * 0.095 + z * 0.065)
  const outerMask = r > 25.5 ? satClear : 0
  return Math.max(0.08, -0.12 + outerMask * dunes)
}

function desertCaravan(theme: ThemeJson, random: () => number): { group: THREE.Group; update: Updater } {
  // Local forward is +X: camel 0 is the leader at x=0, camels 1..3 follow along the curved outer Silk-Road arc (r = 32.4)
  const group = new THREE.Group()
  group.name = 'desert-caravan'
  const dust: THREE.Mesh[] = []
  const legs: { mesh: THREE.Mesh; phase: number }[] = []
  const necks: THREE.Mesh[] = []
  const camels: THREE.Group[] = []
  const r = 32.4

  for (let i = 0; i < 4; i += 1) {
    const camel = new THREE.Group()
    const fur = i === 0 ? '#C8965A' : '#B58348'
    const body = box(1.28, 0.68, 0.62, fur, { rough: 0.82 })
    body.position.y = 1.08
    const hump1 = sphere(0.32, 8, fur, { rough: 0.85 })
    hump1.position.set(-0.22, 1.52, 0)
    const hump2 = sphere(0.3, 8, fur, { rough: 0.85 })
    hump2.position.set(0.22, 1.48, 0)
    const pack = box(0.76, 0.24, 0.74, i % 2 === 0 ? theme.shared.accent : theme.shared.roof)
    pack.position.set(0, 1.36, 0)
    const neck = box(0.26, 0.82, 0.26, fur, { rough: 0.82 })
    neck.position.set(0.68, 1.45, 0)
    neck.rotation.z = -0.26
    const head = box(0.44, 0.26, 0.26, fur, { rough: 0.82 })
    head.position.set(0.92, 1.84, 0)
    camel.add(body, hump1, hump2, pack, neck, head)
    necks.push(neck)

    for (const [legName, lx, lz, pOff] of [
      ['camel-leg-bl', -0.42, -0.2, 0],
      ['camel-leg-br', -0.42, 0.2, Math.PI],
      ['camel-leg-fl', 0.42, -0.2, Math.PI],
      ['camel-leg-fr', 0.42, 0.2, 0],
    ] as const) {
      const leg = cyl(0.07, 0.06, 0.78, 6, '#8F6332')
      leg.name = legName
      leg.position.set(lx, 0.39, lz)
      camel.add(leg)
      legs.push({ mesh: leg, phase: pOff + i * 0.7 })
    }

    const dTheta = i * 0.085
    const localX = -r * Math.sin(dTheta)
    const localZ = -r * (1 - Math.cos(dTheta))
    camel.position.set(localX, 0, localZ)
    camel.rotation.y = dTheta
    group.add(camel)
    camels.push(camel)
  }

  // Dust puffs trail behind the caravan along the curved arc (`camel-sand-puffs`)
  const sandPuffsGroup = new THREE.Group()
  sandPuffsGroup.name = 'camel-sand-puffs'
  camels[0].add(sandPuffsGroup)
  for (let i = 0; i < 8; i += 1) {
    const puff = sphere(0.14 + random() * 0.12, 6, '#D6B071', { opacity: 0.32 })
    puff.position.set(-1.4 - random() * 6.2, 0.18 + random() * 0.45, (random() - 0.5) * 1.2)
    group.add(puff)
    dust.push(puff)
  }
  group.scale.setScalar(1.06)

  return {
    group,
    update: (t) => {
      const a = t * 0.055 + 1.88
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r
      const vx = -Math.sin(a) * r
      const vz = Math.cos(a) * r
      const leadY = sampleOuterDesertDuneHeight(x, z)
      group.position.set(x, leadY, z)
      group.rotation.y = headingFromVelocityX(vx, vz)
      camels.forEach((camel, i) => {
        const ai = a - i * 0.085
        const cx = Math.cos(ai) * r
        const cz = Math.sin(ai) * r
        const cy = sampleOuterDesertDuneHeight(cx, cz)
        camel.position.y = (cy - leadY) + Math.abs(Math.sin(t * 4.6 + i * 0.7)) * 0.05
        necks[i].rotation.z = -0.26 + Math.sin(t * 4.6 + i * 0.7) * 0.06
      })
      legs.forEach(({ mesh, phase }) => {
        mesh.rotation.z = Math.sin(t * 4.6 + phase) * 0.26
      })
      dust.forEach((p, i) => {
        p.position.y = 0.15 + (((t * 0.18 + i / dust.length) % 1) * 0.65)
        p.scale.setScalar(0.55 + ((t * 0.15 + i * 0.07) % 1) * 0.45)
      })
    },
  }
}

function iceField(theme: ThemeJson, random: () => number): { group: THREE.Group; update: Updater } {
  const group = new THREE.Group()
  const ice: { chunk: THREE.Object3D; y: number }[] = []
  for (let i = 0; i < 9; i += 1) {
    const chunk =
      i === 0
        ? pyramid(3.4, 5.2, 3.2, '#D9F0F2', { rough: 0.32, metal: 0.1 })
        : cyl(
            0.8 + random(),
            1 + random(),
            0.28 + random() * 0.35,
            6,
            i % 2 ? '#EAF7F7' : theme.terrain.water,
            { rough: 0.3 },
          )
    chunk.position.set(
      Math.cos(i * 0.8) * (4 + random() * 5),
      i === 0 ? 2.45 : 0.05,
      Math.sin(i * 0.8) * (4 + random() * 5),
    )
    group.add(chunk)
    ice.push({ chunk, y: chunk.position.y })
  }
  return {
    group,
    update: (t) => {
      const a = t * 0.025
      group.position.set(Math.cos(a) * 34, -0.22, Math.sin(a) * 34)
      group.rotation.y = -a * 0.7
      ice.forEach(({ chunk, y }, i) => {
        chunk.position.y = y + Math.sin(t * 0.42 + i) * 0.08
        chunk.rotation.y = t * (i % 2 ? 0.018 : -0.014)
      })
    },
  }
}

function makeClouds(random: () => number): { group: THREE.Group; update: Updater } {
  const group = new THREE.Group()
  group.name = 'sky-clouds'
  const slots: { baseX: number; baseY: number; baseZ: number; scale: number; amp: number; speed: number }[] = [
    { baseX: -24.5, baseY: 7.4, baseZ: -16.5, scale: 0.78, amp: 2.2, speed: 0.18 },
    { baseX: -14.2, baseY: 8.6, baseZ: -20.5, scale: 0.72, amp: 1.8, speed: 0.14 },
    { baseX: -2.2, baseY: 9.2, baseZ: -22.5, scale: 0.84, amp: 2.4, speed: 0.16 },
    { baseX: 11.5, baseY: 8.5, baseZ: -20.0, scale: 0.76, amp: 2.0, speed: 0.15 },
    { baseX: 23.8, baseY: 7.2, baseZ: -15.8, scale: 0.82, amp: 2.2, speed: 0.17 },
    { baseX: -27.5, baseY: 6.8, baseZ: -6.5, scale: 0.68, amp: 1.6, speed: 0.19 },
    { baseX: 27.8, baseY: 6.9, baseZ: -5.8, scale: 0.72, amp: 1.8, speed: 0.16 },
    { baseX: 5.2, baseY: 9.5, baseZ: -24.0, scale: 0.68, amp: 1.5, speed: 0.12 },
  ]
  const data = slots.map((s, i) => {
    const baseScale = s.scale + (random() - 0.5) * 0.08
    const cloud = cumulusCloud(1, '#FFFDF9', '#EAEEF4')
    cloud.scale.setScalar(baseScale)
    cloud.rotation.y = (i * 0.7) % Math.PI
    group.add(cloud)
    return { cloud, ...s, baseScale }
  })
  return {
    group,
    update: (t) =>
      data.forEach((d, i) => {
        const driftX = Math.sin(t * d.speed + i * 1.3) * d.amp
        const bobY = Math.sin(t * 0.48 + i * 0.9) * 0.24
        d.cloud.position.set(d.baseX + driftX, d.baseY + bobY, d.baseZ)
        const breath = 1 + Math.sin(t * 0.75 + i) * 0.03
        d.cloud.scale.set(
          d.baseScale * breath,
          d.baseScale * (2 - breath),
          d.baseScale * breath,
        )
      }),
  }
}

function makeSmoke(buildings: PlacedBuilding[], random: () => number): { group: THREE.Group; update: Updater } {
  const group = new THREE.Group()
  const source = buildings.find((b) => b.place.style === 'factory')
  if (!source) return { group, update: () => undefined }
  group.position.set(source.position.x - 1.8, source.position.y + 4.3, source.position.z - 0.8)
  const puffs: { mesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>; seed: number }[] = []
  for (let i = 0; i < 14; i += 1) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.18 + random() * 0.18, 7, 6),
      mat('#D8D4CC', { opacity: 0.34, rough: 1 }).clone(),
    )
    mesh.castShadow = false
    group.add(mesh)
    puffs.push({ mesh, seed: random() })
  }
  return {
    group,
    update: (t) =>
      puffs.forEach(({ mesh, seed }, i) => {
        const u = (t * 0.12 + i / puffs.length + seed * 0.08) % 1
        mesh.position.set(
          Math.sin(u * 7 + seed * 9) * u * 0.85,
          u * 6.2,
          Math.cos(u * 5 + seed) * u * 0.55,
        )
        mesh.scale.setScalar(0.7 + u * 2.4)
        mesh.material.opacity = (1 - u) * 0.34
      }),
  }
}

function makeParticles(biome: BiomeId, theme: ThemeJson, random: () => number): { points: THREE.Points; update: Updater } {
  const count = 96
  const base = new Float32Array(count * 3)
  const seeds = new Float32Array(count)
  for (let i = 0; i < count; i += 1) {
    base[i * 3] = (random() - 0.5) * 52
    base[i * 3 + 1] = random() * 16 + 1
    base[i * 3 + 2] = (random() - 0.5) * 52
    seeds[i] = random()
  }
  const pos = base.slice()
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const color = biome === 'snow' ? '#FFFFFF' : biome === 'desert' ? '#E6BD63' : theme.shared.accent
  const points = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color,
      size: biome === 'snow' ? 0.18 : 0.11,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    }),
  )
  return {
    points,
    update: (t) => {
      const attr = geo.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < count; i += 1) {
        const x = base[i * 3]
        const y0 = base[i * 3 + 1]
        const z = base[i * 3 + 2]
        const s = seeds[i]
        const y =
          biome === 'snow'
            ? 1 + (((y0 - t * (0.8 + s)) % 17 + 17) % 17)
            : y0 + Math.sin(t * (0.35 + s) + s * 9) * 0.8
        attr.setXYZ(
          i,
          x + Math.sin(t * 0.22 + s * 12) * (biome === 'desert' ? 1.2 : 0.45),
          y,
          z + Math.cos(t * 0.18 + s * 8) * 0.55,
        )
      }
      attr.needsUpdate = true
    },
  }
}

export function buildAmbientLife(
  biome: BiomeId,
  theme: ThemeJson,
  buildings: PlacedBuilding[],
): BuiltLife {
  const group = new THREE.Group()
  const random = rng(9917 + biome.charCodeAt(0))
  const updates: Updater[] = []
  const birds = makeBirds(theme)
  const secondaryBirds = makeSecondaryBirds(theme)
  const biplane = makeBiplane(theme)
  const clouds = makeClouds(random)
  const smoke = makeSmoke(buildings, random)
  const particles = makeParticles(biome, theme, random)
  const vehicle =
    biome === 'desert'
      ? desertCaravan(theme, random)
      : biome === 'snow'
        ? iceField(theme, random)
        : biome === 'grassland'
          ? pastoralTractor(theme)
          : sailBoat(theme)
  group.add(
    birds.group,
    vehicle.group,
    clouds.group,
    smoke.group,
    particles.points,
    biplane.group,
    secondaryBirds.group,
  )
  updates.push(
    birds.update,
    vehicle.update,
    clouds.update,
    smoke.update,
    particles.update,
    biplane.update,
    secondaryBirds.update,
  )
  updates.forEach((update) => update(0))
  return { group, update: (t) => updates.forEach((update) => update(t)) }
}

