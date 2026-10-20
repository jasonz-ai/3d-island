import * as THREE from 'three'
import type { CarrierType, ProjectBoothStyle, ThemePalette } from '../schema/profile.ts'
import type { WorldLayout } from './layout.ts'
import { box, cumulusCloud, cyl, dome, gable, mat, pyramid, shadow, sign, sphere } from './kit.ts'
import { headingFromVelocityX } from './life.ts'
import {
  causewayRevealFraction,
  computeSlalomWeave,
  rng,
  trailSegmentUnfoldScale,
  weatherBurstIntensity,
} from './motion.ts'

export interface BuiltCarrierAndRealm {
  carrierGroup: THREE.Group
  realmGroup: THREE.Group
  projectMeshes: Map<string, THREE.Object3D>
  updateCarrier: (t: number, settleWave?: number, moveSpeed?: number, realmProgress?: number) => void
  updateRealm: (t: number) => void
}

export function getRealmCoastRadius(angle: number, carrier: CarrierType): number {
  if (carrier === 'balloon') {
    // 3-Lobed Clover / Three-Island Sky Archipelago Silhouette (11.2 .. 18.6)
    return 14.8 + Math.cos(3 * angle - 0.52) * 3.1 + Math.sin(2 * angle + 0.4) * 0.95
  }
  if (carrier === 'submarine') {
    // Elongated Stepped Abyssal Coral Trench Silhouette (11.8 .. 18.8)
    return 15.2 + Math.cos(2 * angle - 0.35) * 2.75 + Math.sin(3 * angle + 0.2) * 1.35
  }
  if (carrier === 'rocket') {
    // Articulated 6-Pointed Star / Hexagonal Orbital Truss Deck Silhouette (11.4 .. 17.6)
    return 14.2 + Math.cos(6 * angle) * 2.45 + Math.cos(2 * angle) * 0.95
  }
  if (carrier === 'camel') {
    // Asymmetric Crescent Canyon Oasis Basin Silhouette (11.8 .. 18.9)
    return 15.6 + Math.cos(2 * angle + 0.5) * 2.55 - Math.sin(angle - 0.4) * 1.65
  }
  // snowball: U-Shaped Glacial Amphitheater opening toward NW ski slope (11.6 .. 18.8)
  const nwOpenCut = Math.max(0, Math.sin(angle + 2.3)) * 2.65
  return 15.8 + Math.cos(3 * angle - 0.3) * 2.65 - nwOpenCut
}

export function buildDetailedCarrierAndRealm(
  carrier: CarrierType,
  palette: ThemePalette,
  layout: WorldLayout,
): BuiltCarrierAndRealm {
  const carrierGroup = new THREE.Group()
  carrierGroup.name = `carrier-${carrier}`
  const hp = layout.carrier.homePosition
  carrierGroup.position.set(hp.x, hp.y, hp.z)
  carrierGroup.userData.pickId = '__carrier__'

  const wall = palette.shared.building
  const wall2 = palette.shared.buildingShade
  const roof = palette.shared.roof
  const accent = palette.shared.accent

  const carrierUpdaters: Array<(t: number, settle: number, speed: number, progress: number) => void> = []
  const realmUpdaters: Array<(t: number) => void> = []
  const fxGroup = new THREE.Group()
  fxGroup.name = 'carrier-fx-group'
  carrierGroup.add(fxGroup)

  if (carrier === 'submarine') {
    // Toy-Grade Deep-Sea Research Submarine with Brass Portholes, Dive Planes & Shrouded Propeller
    const hull = cyl(0.84, 0.84, 2.85, 24, accent, { rough: 0.32, metal: 0.22 })
    hull.rotation.z = Math.PI / 2
    hull.position.y = 1.05
    const bellyStripe = cyl(0.85, 0.85, 2.5, 24, '#FAF6EE', { rough: 0.38 })
    bellyStripe.rotation.z = Math.PI / 2
    bellyStripe.scale.set(1, 1, 0.42)
    bellyStripe.position.set(0, 0.72, 0)
    const keel = box(2.3, 0.18, 0.46, roof, { rough: 0.45, metal: 0.3 })
    keel.position.set(-0.1, 0.24, 0)

    const nose = sphere(0.84, 22, accent, { rough: 0.32, metal: 0.22 })
    nose.position.set(1.42, 1.05, 0)
    const tail = cyl(0.24, 0.84, 1.05, 22, roof, { rough: 0.38, metal: 0.28 })
    tail.rotation.z = -Math.PI / 2
    tail.position.set(-1.92, 1.05, 0)

    const tower = cyl(0.38, 0.5, 0.98, 18, wall, { rough: 0.36 })
    tower.position.set(0.12, 1.88, 0)
    const towerCap = cyl(0.41, 0.41, 0.14, 18, roof)
    towerCap.position.set(0.12, 2.4, 0)
    const periscope = cyl(0.05, 0.05, 0.72, 10, roof, { metal: 0.55 })
    periscope.position.set(0.12, 2.68, 0)
    const periscopeLens = box(0.22, 0.1, 0.1, '#38BDF8', {
      emissive: '#38BDF8',
      emissiveIntensity: 0.85,
    })
    periscopeLens.position.set(0.2, 3.02, 0)

    const viewport = sphere(0.46, 18, '#8CE8FF', {
      emissive: '#38B6FF',
      emissiveIntensity: 0.82,
      opacity: 0.88,
    })
    viewport.position.set(1.78, 1.08, 0)

    // 6 Brass Portholes (3 per side)
    const portholes = new THREE.Group()
    portholes.name = 'sub-portholes'
    for (const side of [-1, 1]) {
      for (const px of [-0.75, 0.05, 0.85]) {
        const bezel = new THREE.Mesh(
          new THREE.TorusGeometry(0.17, 0.038, 10, 18),
          mat('#F4B942', { rough: 0.28, metal: 0.65 }),
        )
        bezel.position.set(px, 1.12, side * 0.82)
        const glass = cyl(0.14, 0.14, 0.05, 14, '#8CE8FF', {
          emissive: '#38BDF8',
          emissiveIntensity: 0.75,
        })
        glass.rotation.x = Math.PI / 2
        glass.position.set(px, 1.12, side * 0.81)
        portholes.add(bezel, glass)
      }
    }

    // Bow Dive Planes
    const divePlanes = new THREE.Group()
    divePlanes.name = 'dive-planes'
    for (const side of [-1, 1]) {
      const plane = box(0.48, 0.07, 0.62, roof, { metal: 0.35 })
      plane.position.set(1.15, 1.02, side * 0.92)
      divePlanes.add(plane)
    }

    // Shrouded Kort-Nozzle Propeller Ring + 4-Blade Brass Propeller (`sub-propeller`)
    const shroud = new THREE.Mesh(
      new THREE.TorusGeometry(0.48, 0.07, 12, 24),
      mat(accent, { rough: 0.35, metal: 0.3 }),
    )
    shroud.name = 'propeller-shroud'
    shroud.rotation.y = Math.PI / 2
    shroud.position.set(-2.42, 1.05, 0)

    const prop = new THREE.Group()
    prop.name = 'sub-propeller'
    prop.position.set(-2.45, 1.05, 0)
    prop.add(
      box(0.08, 0.82, 0.18, '#F4B942', { metal: 0.6, rough: 0.25 }),
      box(0.08, 0.18, 0.82, '#F4B942', { metal: 0.6, rough: 0.25 }),
    )

    // Trailing Rising Bubble Stream (`sub-bubble-stream`)
    const bubbleStream = new THREE.Group()
    bubbleStream.name = 'sub-bubble-stream'
    const bubbles: THREE.Mesh[] = []
    for (let i = 0; i < 12; i += 1) {
      const bMesh = sphere(0.07 + (i % 3) * 0.035, 8, '#E0F7FA', {
        emissive: '#38BDF8',
        emissiveIntensity: 0.55,
        opacity: 0.72,
        flat: false,
      })
      bMesh.position.set(-2.65 - i * 0.22, 1.05 + (i % 3) * 0.08, ((i % 2) - 0.5) * 0.24)
      bubbleStream.add(bMesh)
      bubbles.push(bMesh)
    }

    // Surface Water-Splash Crown Ring (`sub-splash-crown`) that bursts as submarine dives across y = 0
    const splashCrown = new THREE.Group()
    splashCrown.name = 'sub-splash-crown'
    splashCrown.visible = false
    const crownRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.65, 0.085, 8, 28),
      mat('#FFFFFF', { emissive: '#E0F2FE', emissiveIntensity: 0.65, opacity: 0.78 }),
    )
    crownRing.rotation.x = Math.PI / 2
    crownRing.position.y = 0.65
    splashCrown.add(crownRing)
    for (let k = 0; k < 12; k += 1) {
      const ang = (k / 12) * Math.PI * 2
      const drop = sphere(0.13 + (k % 2) * 0.04, 8, '#FFFFFF', {
        emissive: '#BAE6FD',
        emissiveIntensity: 0.55,
        opacity: 0.85,
      })
      drop.position.set(Math.cos(ang) * 1.75, 0.88 + (k % 3) * 0.18, Math.sin(ang) * 1.15)
      splashCrown.add(drop)
    }
    fxGroup.add(bubbleStream, splashCrown)

    carrierGroup.add(
      hull,
      bellyStripe,
      keel,
      nose,
      tail,
      tower,
      towerCap,
      periscope,
      periscopeLens,
      viewport,
      portholes,
      divePlanes,
      shroud,
      prop,
    )
    carrierUpdaters.push((t, settle, speed, progress) => {
      prop.rotation.x = t * (9.5 + speed * 14.0)
      periscope.rotation.z = settle * 1.4
      divePlanes.rotation.z = Math.sin(t * 2.2) * 0.08
      bubbles.forEach((bMesh, idx) => {
        const cycle = (t * (1.8 + speed * 2.4) + idx * 0.14) % 1
        bMesh.position.set(
          -2.58 - cycle * (1.8 + speed * 1.4),
          1.02 + cycle * 0.85 + Math.sin(t * 5 + idx) * 0.06,
          Math.cos(t * 4 + idx * 1.3) * 0.26 * cycle,
        )
        bMesh.scale.setScalar(Math.max(0.25, (1 - cycle * 0.65) * (0.75 + speed * 0.55)))
      })
      const inSplashWindow = progress >= 0.02 && progress <= 0.34
      splashCrown.visible = inSplashWindow
      if (inSplashWindow) {
        const u = (progress - 0.02) / 0.32
        const burst = 0.68 + Math.sin(u * Math.PI) * 0.82
        splashCrown.scale.set(burst, 0.6 + Math.sin(u * Math.PI) * 0.7, burst)
      }
    })
  } else if (carrier === 'camel') {
    // Sculpted Silk-Road Leader Camel with Articulated 4-Beat Diagonal Gait, Neck Pivot & Brass Lantern
    const torsoGroup = new THREE.Group()
    torsoGroup.name = 'camel-torso'
    const body = sphere(0.76, 16, '#C89B62', { rough: 0.65, flat: false })
    body.scale.set(1.45, 0.78, 0.72)
    body.position.y = 1.48
    const hump1 = sphere(0.5, 14, '#B6864C', { rough: 0.68, flat: false })
    hump1.position.set(-0.42, 2.14, 0)
    const hump2 = sphere(0.46, 14, '#B6864C', { rough: 0.68, flat: false })
    hump2.position.set(0.38, 2.1, 0)

    // Ornate Persian Saddle Blanket & Side Cargo Packs
    const blanketGroup = new THREE.Group()
    blanketGroup.name = 'saddle-blanket'
    const crimsonRug = box(1.32, 0.36, 1.18, '#C83E2B', { rough: 0.72 })
    crimsonRug.position.set(0, 1.88, 0)
    const goldTrim = box(1.38, 0.12, 1.24, '#F2B84B', { rough: 0.55 })
    goldTrim.position.set(0, 1.72, 0)
    for (const side of [-1, 1]) {
      const pack = box(0.68, 0.42, 0.24, '#2A6F68', { rough: 0.68 })
      pack.position.set(0, 1.56, side * 0.62)
      blanketGroup.add(pack)
    }
    blanketGroup.add(crimsonRug, goldTrim)

    // Articulated Neck Pivot Group (`neck-pivot`)
    const neckPivot = new THREE.Group()
    neckPivot.name = 'neck-pivot'
    neckPivot.position.set(0.82, 1.62, 0)
    const neck = cyl(0.22, 0.28, 1.28, 12, '#C89B62', { rough: 0.65, flat: false })
    neck.position.set(0.2, 0.5, 0)
    neck.rotation.z = -0.28
    const head = box(0.68, 0.38, 0.4, '#C89B62')
    head.position.set(0.62, 1.06, 0)
    const snout = sphere(0.2, 10, '#B6864C', { flat: false })
    snout.scale.set(1.2, 0.8, 0.9)
    snout.position.set(0.9, 1.02, 0)
    const earL = box(0.12, 0.24, 0.1, '#A97B42')
    earL.position.set(0.4, 1.32, 0.16)
    const earR = box(0.12, 0.24, 0.1, '#A97B42')
    earR.position.set(0.4, 1.32, -0.16)
    const lantern = sphere(0.14, 10, '#FFE082', {
      emissive: '#FF9824',
      emissiveIntensity: 0.95,
    })
    lantern.name = 'camel-lantern'
    lantern.position.set(0.3, 0.1, 0.42)
    neckPivot.add(neck, head, snout, earL, earR, lantern)

    const tail = cyl(0.05, 0.03, 0.65, 6, '#8F6332')
    tail.position.set(-1.06, 1.35, 0)
    tail.rotation.z = 0.28

    torsoGroup.add(body, hump1, hump2, blanketGroup, neckPivot, tail)
    carrierGroup.add(torsoGroup)

    // 4 Articulated Legs (`leg-fl`/`camel-leg-fl`, etc.) with Upper Thigh, Knee Joint & Lower Shin/Foot
    const legSpecs: Array<{ name: string; alias: string; lx: number; lz: number; phase: number }> = [
      { name: 'leg-fl', alias: 'camel-leg-fl', lx: 0.62, lz: 0.3, phase: 0 },
      { name: 'leg-fr', alias: 'camel-leg-fr', lx: 0.62, lz: -0.3, phase: Math.PI },
      { name: 'leg-bl', alias: 'camel-leg-bl', lx: -0.62, lz: 0.3, phase: Math.PI },
      { name: 'leg-br', alias: 'camel-leg-br', lx: -0.62, lz: -0.3, phase: 0 },
    ]
    const articulatedLegs: Array<{
      hip: THREE.Group
      knee: THREE.Group
      phase: number
    }> = []

    for (const spec of legSpecs) {
      const hip = new THREE.Group()
      hip.name = spec.name
      hip.position.set(spec.lx, 1.08, spec.lz)

      const aliasNode = new THREE.Group()
      aliasNode.name = spec.alias
      hip.add(aliasNode)

      const upperLeg = cyl(0.13, 0.1, 0.56, 10, '#B6864C', { rough: 0.68, flat: false })
      upperLeg.name = 'upper-leg'
      upperLeg.position.y = -0.26

      const knee = new THREE.Group()
      knee.name = 'knee-joint'
      knee.position.set(0, -0.52, 0)

      const lowerLeg = cyl(0.095, 0.08, 0.54, 10, '#A97B42', { rough: 0.7, flat: false })
      lowerLeg.name = 'lower-leg'
      lowerLeg.position.y = -0.26

      const footPad = cyl(0.12, 0.14, 0.09, 10, '#7A5438', { rough: 0.8 })
      footPad.name = 'camel-foot'
      footPad.position.set(0.04, -0.52, 0)

      knee.add(lowerLeg, footPad)
      hip.add(upperLeg, knee)
      carrierGroup.add(hip)
      articulatedLegs.push({ hip, knee, phase: spec.phase })
    }

    // Trailing Golden Sand-Dust Puffs (`camel-sand-puffs`)
    const sandPuffsGroup = new THREE.Group()
    sandPuffsGroup.name = 'camel-sand-puffs'
    const sandPuffs: THREE.Mesh[] = []
    for (let i = 0; i < 8; i += 1) {
      const puff = sphere(0.14 + (i % 3) * 0.04, 8, '#E6C280', {
        emissive: '#D4A359',
        emissiveIntensity: 0.22,
        opacity: 0.52,
        flat: false,
      })
      puff.position.set(-0.85 - i * 0.24, 0.16 + (i % 2) * 0.08, ((i % 2) - 0.5) * 0.42)
      sandPuffsGroup.add(puff)
      sandPuffs.push(puff)
    }
    fxGroup.add(sandPuffsGroup)

    carrierUpdaters.push((t, settle, speed) => {
      const activeSpeed = Math.min(1, Math.max(0, speed))
      const strideAmp = activeSpeed > 0.02 ? 0.38 * activeSpeed : 0.04
      const freq = 6.8
      for (const leg of articulatedLegs) {
        const gPhase = t * freq + leg.phase
        leg.hip.rotation.z = Math.sin(gPhase) * strideAmp
        // Bend the knee backward as the leg lifts forward in the swing phase
        const lift = Math.max(0, Math.cos(gPhase))
        leg.knee.rotation.z = -lift * strideAmp * 1.18
      }
      // Natural camel torso bob, subtle pitch rock, and counter-nodding neck
      torsoGroup.position.y = Math.abs(Math.sin(t * freq)) * 0.08 * activeSpeed
      torsoGroup.rotation.z = Math.cos(t * freq) * 0.035 * activeSpeed
      neckPivot.rotation.z =
        Math.sin(t * 1.8) * 0.04 - Math.sin(t * freq) * 0.08 * activeSpeed + settle * 1.1
      lantern.position.z = 0.42 + Math.sin(t * freq * 0.5) * 0.06 * activeSpeed
      sandPuffs.forEach((puff, idx) => {
        const cycle = (t * (1.6 + activeSpeed * 2.5) + idx * 0.16) % 1
        puff.position.x = -0.78 - cycle * (1.2 + activeSpeed * 1.5)
        puff.position.y = 0.12 + cycle * 0.38
        puff.scale.setScalar((0.45 + activeSpeed * 0.75) * (1 - cycle * 0.55))
      })
    })
  } else if (carrier === 'snowball') {
    // Alpine Skier Snowman with Twin-Tip Racing Skis, Cyan Ski Goggles, Named Ski Poles & Snow-Spray Emitter
    const skiGroup = new THREE.Group()
    skiGroup.name = 'snowman-skis'
    for (const sx of [-0.46, 0.46]) {
      const skiBlade = box(0.28, 0.08, 2.52, accent, { rough: 0.28, metal: 0.18 })
      skiBlade.position.set(sx, 0.05, 0.1)
      const skiStripe = box(0.12, 0.09, 2.1, '#FAF6EE', { rough: 0.3 })
      skiStripe.position.set(sx, 0.055, 0.1)
      const skiTip = box(0.26, 0.08, 0.5, accent, { rough: 0.28 })
      skiTip.position.set(sx, 0.16, 1.48)
      skiTip.rotation.x = -0.48
      const binding = box(0.3, 0.11, 0.38, roof)
      binding.position.set(sx, 0.11, 0)
      skiGroup.add(skiBlade, skiStripe, skiTip, binding)
    }

    // Dual Ski-Tail Powder Snow-Spray Emitter (`ski-snow-spray` + `ski-powder-spray` with dual carved tracks)
    const snowSprayGroup = new THREE.Group()
    snowSprayGroup.name = 'ski-snow-spray'
    const sprayPuffs: THREE.Mesh[] = []
    for (let i = 0; i < 10; i += 1) {
      const side = i % 2 === 0 ? -0.46 : 0.46
      const puff = sphere(0.16 + (i % 3) * 0.05, 8, '#FFFFFF', {
        emissive: '#E0F2FE',
        emissiveIntensity: 0.45,
        opacity: 0.82,
        flat: false,
      })
      puff.position.set(side, 0.18 + (i % 3) * 0.08, -1.15 - Math.floor(i / 2) * 0.28)
      snowSprayGroup.add(puff)
      sprayPuffs.push(puff)
    }

    const skiPowderSpray = new THREE.Group()
    skiPowderSpray.name = 'ski-powder-spray'
    for (const sx of [-0.46, 0.46]) {
      const trackRibbon = box(0.18, 0.025, 2.4, '#DCEEF8', {
        emissive: '#BAE6FD',
        emissiveIntensity: 0.3,
        opacity: 0.72,
      })
      trackRibbon.position.set(sx, 0.02, -1.95)
      skiPowderSpray.add(trackRibbon)
    }
    fxGroup.add(skiPowderSpray)

    const b1 = sphere(1.08, 22, '#FFFFFF', { rough: 0.32, flat: false })
    b1.position.y = 1.16
    const b2 = sphere(0.78, 20, '#F4F8FC', { rough: 0.32, flat: false })
    b2.position.y = 2.58

    // Coal buttons on snowman belly
    for (const by of [1.05, 1.38, 1.7]) {
      const btn = sphere(0.085, 8, roof)
      btn.position.set(0, by, 1.04)
      carrierGroup.add(btn)
    }

    // Reflective Cyan Alpine Ski Goggles (`ski-goggles`)
    const goggles = new THREE.Group()
    goggles.name = 'ski-goggles'
    const goggleFrame = box(0.88, 0.28, 0.22, roof, { rough: 0.35 })
    goggleFrame.position.set(0, 2.76, 0.68)
    const goggleLens = box(0.78, 0.2, 0.24, '#38BDF8', {
      emissive: '#0EA5E9',
      emissiveIntensity: 0.68,
      rough: 0.15,
      metal: 0.4,
    })
    goggleLens.position.set(0, 2.76, 0.69)
    goggles.add(goggleFrame, goggleLens)

    const scarf = new THREE.Mesh(
      new THREE.TorusGeometry(0.6, 0.14, 12, 24),
      mat('#D93829', { rough: 0.65 }),
    )
    scarf.rotation.x = Math.PI / 2
    scarf.position.y = 2.02

    const scarfTail = box(0.24, 0.68, 0.1, '#D93829', { rough: 0.65 })
    scarfTail.name = 'fluttering-scarf'
    scarfTail.position.set(0.52, 1.75, -0.35)
    scarfTail.rotation.z = 0.32

    const nose = cyl(0.02, 0.13, 0.58, 10, accent)
    nose.rotation.x = Math.PI / 2
    nose.position.set(0, 2.56, 0.88)
    const hatBrim = cyl(0.58, 0.58, 0.1, 16, roof)
    hatBrim.position.y = 3.28
    const hatTop = cyl(0.4, 0.36, 0.64, 16, roof)
    hatTop.position.y = 3.62

    // Snowman arms holding alpine ski poles (`pole-left`, `pole-right`)
    const poleL = new THREE.Group()
    poleL.name = 'pole-left'
    poleL.position.set(-0.92, 1.95, 0.2)
    const armL = cyl(0.06, 0.08, 0.72, 8, '#7A563C')
    armL.rotation.z = 0.65
    const shaftL = cyl(0.035, 0.035, 1.85, 8, roof, { metal: 0.5 })
    shaftL.position.set(-0.22, -0.82, 0.15)
    shaftL.rotation.x = 0.22
    const basketL = cyl(0.14, 0.14, 0.04, 10, accent)
    basketL.position.set(-0.22, -1.58, -0.02)
    poleL.add(armL, shaftL, basketL)

    const poleR = new THREE.Group()
    poleR.name = 'pole-right'
    poleR.position.set(0.92, 1.95, 0.2)
    const armR = cyl(0.06, 0.08, 0.72, 8, '#7A563C')
    armR.rotation.z = -0.65
    const shaftR = cyl(0.035, 0.035, 1.85, 8, roof, { metal: 0.5 })
    shaftR.position.set(0.22, -0.82, 0.15)
    shaftR.rotation.x = 0.22
    const basketR = cyl(0.14, 0.14, 0.04, 10, accent)
    basketR.position.set(0.22, -1.58, -0.02)
    poleR.add(armR, shaftR, basketR)

    carrierGroup.add(
      skiGroup,
      snowSprayGroup,
      b1,
      b2,
      goggles,
      scarf,
      scarfTail,
      nose,
      hatBrim,
      hatTop,
      poleL,
      poleR,
    )
    carrierUpdaters.push((t, settle, speed) => {
      const activeSpeed = Math.min(1, Math.max(0, speed))
      const carve = activeSpeed > 0.02 ? Math.sin(t * 5.4) * 0.24 : 0
      hatTop.rotation.z = settle * 1.5 + carve * 0.5
      hatBrim.rotation.z = settle * 1.5 + carve * 0.5
      scarfTail.rotation.x = -0.25 - Math.min(0.6, activeSpeed * 0.5) + Math.sin(t * 9.0) * 0.18
      poleL.rotation.x = Math.sin(t * 5.4) * 0.36 * Math.min(1, activeSpeed + 0.15)
      poleR.rotation.x = -Math.sin(t * 5.4) * 0.36 * Math.min(1, activeSpeed + 0.15)
      skiGroup.rotation.z = carve * 0.42
      snowSprayGroup.visible = activeSpeed > 0.02
      skiPowderSpray.visible = activeSpeed > 0.02
      sprayPuffs.forEach((puff, idx) => {
        const side = idx % 2 === 0 ? -0.46 : 0.46
        const cycle = (t * 4.5 + idx * 0.21) % 1
        puff.position.set(
          side - carve * 0.85 * cycle,
          0.14 + cycle * 0.75,
          -1.08 - cycle * 1.55,
        )
        puff.scale.setScalar(Math.max(0.01, (1 - cycle * 0.65) * (0.6 + activeSpeed * 0.75)))
      })
    })
  } else if (carrier === 'rocket') {
    // Multi-Stage Retro-Futuristic Starship with Side Booster Pods & Porthole Windows
    const pad = cyl(1.52, 1.74, 0.3, 20, roof, { metal: 0.42 })
    pad.position.y = 0.15
    const body = cyl(0.68, 0.84, 3.25, 22, wall, { rough: 0.28, metal: 0.22 })
    body.position.y = 1.98
    const interstage = cyl(0.73, 0.76, 0.36, 22, accent, { rough: 0.32, metal: 0.25 })
    interstage.name = 'interstage-ring'
    interstage.position.y = 2.95
    const cone = cyl(0.04, 0.68, 1.35, 22, accent, { rough: 0.28, metal: 0.22 })
    cone.position.y = 4.28

    // 2 Vertical Porthole Windows
    const portholeGroup = new THREE.Group()
    portholeGroup.name = 'rocket-portholes'
    for (const py of [2.42, 1.75]) {
      const win = cyl(0.24, 0.24, 0.12, 16, '#8CE8FF', {
        emissive: '#38B6FF',
        emissiveIntensity: 0.85,
      })
      win.rotation.x = Math.PI / 2
      win.position.set(0, py, 0.72)
      portholeGroup.add(win)
    }

    // Side Strap-On Booster Pods (`booster-pods`)
    const boosterGroup = new THREE.Group()
    boosterGroup.name = 'booster-pods'
    for (const side of [-1, 1]) {
      const pod = cyl(0.24, 0.28, 1.85, 14, '#FAF6EE', { rough: 0.32, metal: 0.2 })
      pod.position.set(side * 0.96, 1.38, 0)
      const podCone = cyl(0.02, 0.24, 0.48, 14, accent, { rough: 0.32 })
      podCone.position.set(side * 0.96, 2.54, 0)
      boosterGroup.add(pod, podCone)
    }

    const flame = cyl(0.5, 0.12, 1.02, 14, accent, {
      emissive: accent,
      emissiveIntensity: 0.98,
    })
    flame.name = 'thruster-plume'
    flame.position.y = 0.42

    // Multi-layered flickering thruster exhaust plume (`rocket-exhaust-plume`) & launchpad smoke ring (`rocket-launch-smoke`)
    const exhaustPlume = new THREE.Group()
    exhaustPlume.name = 'rocket-exhaust-plume'
    const innerCore = cyl(0.28, 0.05, 1.35, 12, '#FFFBEB', {
      emissive: '#FDE047',
      emissiveIntensity: 1.35,
      opacity: 0.92,
    })
    innerCore.position.y = -0.18
    const outerPlume = cyl(0.56, 0.16, 1.75, 14, '#FB923C', {
      emissive: '#F97316',
      emissiveIntensity: 0.95,
      opacity: 0.68,
    })
    outerPlume.position.y = -0.35
    exhaustPlume.add(innerCore, outerPlume)

    const launchSmoke = new THREE.Group()
    launchSmoke.name = 'rocket-launch-smoke'
    const smokePuffs: THREE.Mesh[] = []
    for (let k = 0; k < 10; k += 1) {
      const ang = (k / 10) * Math.PI * 2
      const puff = sphere(0.24 + (k % 2) * 0.08, 8, '#F1F5F9', {
        emissive: '#FDE68A',
        emissiveIntensity: 0.25,
        opacity: 0.58,
        flat: false,
      })
      puff.position.set(Math.cos(ang) * 1.45, 0.18, Math.sin(ang) * 1.45)
      launchSmoke.add(puff)
      smokePuffs.push(puff)
    }
    fxGroup.add(exhaustPlume, launchSmoke)

    for (let i = 0; i < 4; i += 1) {
      const a = (i * Math.PI) / 2
      const fin = box(0.15, 1.12, 0.74, roof, { metal: 0.32 })
      fin.position.set(Math.cos(a) * 0.84, 0.92, Math.sin(a) * 0.84)
      fin.rotation.y = -a
      carrierGroup.add(fin)
    }
    carrierGroup.add(pad, body, interstage, cone, portholeGroup, boosterGroup, flame)
    carrierUpdaters.push((t, _settle, speed) => {
      flame.scale.y = 0.85 + 0.3 * Math.sin(t * 16)
      const thrustBoost = 0.85 + speed * 0.75 + 0.28 * Math.sin(t * 22)
      exhaustPlume.scale.set(1 + speed * 0.22, thrustBoost, 1 + speed * 0.22)
      smokePuffs.forEach((puff, idx) => {
        const ang = (idx / smokePuffs.length) * Math.PI * 2
        const pulse = 1.35 + ((t * 1.5 + idx * 0.15) % 1) * (0.65 + speed * 1.1)
        puff.position.set(Math.cos(ang) * pulse, 0.16 + Math.sin(t * 4 + idx) * 0.06, Math.sin(ang) * pulse)
        puff.scale.setScalar(0.75 + 0.35 * Math.sin(t * 5 + idx))
      })
    })
  } else {
    // 'balloon' — Benchmark-Grade Multi-Gore Vertical-Striped Hot-Air Balloon (#E8643A / #FAF6EE / #F4B942)
    const envelope = new THREE.Group()
    envelope.name = 'balloon-envelope'
    envelope.position.y = 3.85

    // 12 Sculpted Vertical Gores alternating Coral Orange, Warm Cream & Golden Yellow (Zero overlap Z-fighting)
    const goreGroup = new THREE.Group()
    goreGroup.name = 'balloon-gores'
    const goreColors = [accent, '#FAF6EE', '#F4B942']
    const goreCount = 12
    for (let g = 0; g < goreCount; g += 1) {
      const phiStart = (g / goreCount) * Math.PI * 2
      const phiLen = (Math.PI * 2) / goreCount
      const goreGeo = new THREE.SphereGeometry(1.78, 8, 18, phiStart, phiLen, 0, Math.PI * 0.84)
      // Elongate lower hemisphere into teardrop profile & add subtle ribbed lobe bulge to prevent coplanar Z-fighting
      const pos = goreGeo.attributes.position
      for (let i = 0; i < pos.count; i += 1) {
        let x = pos.getX(i)
        let y = pos.getY(i)
        let z = pos.getZ(i)
        const ang = Math.atan2(z, x)
        const relPhi = ((ang - phiStart) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)
        const lobe = 1 + 0.032 * Math.sin(Math.min(1, relPhi / phiLen) * Math.PI)
        x *= lobe
        z *= lobe
        if (y < 0) {
          const k = 1 - Math.min(0.32, (-y / 1.78) * 0.28)
          x *= k
          z *= k
          y *= 1.12
        }
        pos.setXYZ(i, x, y, z)
      }
      goreGeo.computeVertexNormals()
      const goreMesh = new THREE.Mesh(
        goreGeo,
        mat(goreColors[g % goreColors.length], { rough: 0.42, flat: false }),
      )
      goreMesh.castShadow = true
      goreGroup.add(goreMesh)
    }

    const goldCollar = new THREE.Mesh(
      new THREE.TorusGeometry(0.68, 0.065, 10, 24),
      mat('#F4B942', { rough: 0.3, metal: 0.45 }),
    )
    goldCollar.rotation.x = Math.PI / 2
    goldCollar.position.y = -1.48

    const neck = cyl(0.64, 0.42, 0.48, 18, roof)
    neck.position.y = -1.62

    const burner = new THREE.Group()
    burner.name = 'burner-flame'
    burner.position.y = -1.96
    const outerFlame = sphere(0.28, 12, '#FFD26A', {
      emissive: '#FF9824',
      emissiveIntensity: 1.1,
    })
    const innerFlame = cyl(0.04, 0.18, 0.42, 10, '#FFFBEB', {
      emissive: '#FDE047',
      emissiveIntensity: 1.2,
    })
    innerFlame.position.y = 0.08
    burner.add(outerFlame, innerFlame)

    // Warm pulsing throat glow (`balloon-burner-pulse`) inside carrier-fx-group
    const burnerPulse = sphere(0.42, 12, '#FDE68A', {
      emissive: '#FB923C',
      emissiveIntensity: 1.15,
      opacity: 0.55,
      flat: false,
    })
    burnerPulse.name = 'balloon-burner-pulse'
    burnerPulse.position.set(0, 2.02, 0)
    fxGroup.add(burnerPulse)

    envelope.add(goreGroup, goldCollar, neck, burner)

    const basketGroup = new THREE.Group()
    basketGroup.position.y = 0.52
    const basket = box(1.04, 0.84, 1.04, '#9E7446', { rough: 0.72 })
    const rim = box(1.16, 0.14, 1.16, '#6E4B2E', { rough: 0.65 })
    rim.position.y = 0.42

    // 4 Hanging Sandbags on Basket Corners
    const sandbags = new THREE.Group()
    sandbags.name = 'sandbags'
    for (const [sx, sz] of [
      [-0.54, 0.36],
      [0.54, 0.36],
      [-0.54, -0.36],
      [0.54, -0.36],
    ] as const) {
      const bag = sphere(0.13, 8, '#D6B88C', { rough: 0.85, flat: false })
      bag.scale.set(0.85, 1.25, 0.85)
      bag.position.set(sx, 0.18, sz)
      sandbags.add(bag)
    }
    basketGroup.add(basket, rim, sandbags)

    for (const rx of [-0.38, 0.38]) {
      for (const rz of [-0.38, 0.38]) {
        const rope = cyl(0.024, 0.024, 1.52, 6, roof)
        rope.position.set(rx, 1.52, rz)
        carrierGroup.add(rope)
      }
    }
    carrierGroup.add(envelope, basketGroup)
    carrierUpdaters.push((t, settle, speed) => {
      const pulse = 0.9 + 0.25 * Math.sin(t * 9.5) + speed * 0.22
      burner.scale.setScalar(pulse)
      burnerPulse.scale.setScalar(pulse * 1.15)
      basketGroup.rotation.z = settle * 1.6 + Math.sin(t * 2.1) * 0.045
      basketGroup.rotation.x = Math.cos(t * 1.7) * 0.035
    })
  }

  // =========================================================================
  // BESPOKE SECOND REALMS (5 completely distinct 3D worlds with 96x96 Sculpted Terrain & Hub!)
  // =========================================================================
  const realmGroup = new THREE.Group()
  realmGroup.name = `realm-${carrier}`
  const ro = layout.carrier.realmOrigin
  const rand = rng(carrier.charCodeAt(0) * 997 + 42)

  // 0A. 96x96 Smooth Vertex-Colored Sculpted Realm Terrain (`realm-terrain` + `realm-terrain-mesh`)
  const realmTerrainGroup = new THREE.Group()
  realmTerrainGroup.name = 'realm-terrain'
  realmTerrainGroup.position.set(ro.x, ro.y, ro.z)
  const rGeo = new THREE.PlaneGeometry(42, 42, 96, 96)
  rGeo.rotateX(-Math.PI / 2)
  const rPos = rGeo.attributes.position as THREE.BufferAttribute
  const rColors = new Float32Array(rPos.count * 3)
  const cBase = new THREE.Color(
    carrier === 'submarine'
      ? '#1A4256'
      : carrier === 'camel'
        ? '#DFB87B'
        : carrier === 'snowball'
          ? '#EEF7FB'
          : carrier === 'rocket'
            ? '#2A3648'
            : '#7EB862',
  )
  const cMid = new THREE.Color(
    carrier === 'submarine'
      ? '#265E78'
      : carrier === 'camel'
        ? '#CE9654'
        : carrier === 'snowball'
          ? '#D4EBF5'
          : carrier === 'rocket'
            ? '#3E4F69'
            : '#94CA74',
  )
  const cRidge = new THREE.Color(
    carrier === 'submarine'
      ? '#22D3EE'
      : carrier === 'camel'
        ? '#F4D599'
        : carrier === 'snowball'
          ? '#FFFFFF'
          : carrier === 'rocket'
            ? '#38BDF8'
            : '#EAD8AC',
  )
  const tmpCol = new THREE.Color()
  const smooth01 = (e0: number, e1: number, x: number): number => {
    const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)
  }

  for (let i = 0; i < rPos.count; i += 1) {
    let lx = rPos.getX(i)
    let lz = rPos.getZ(i)
    const r = Math.hypot(lx, lz)
    const ang = Math.atan2(lz, lx)
    const rimR = getRealmCoastRadius(ang, carrier)

    if (r > rimR + 1.15) {
      const clampR = rimR + 1.15
      lx = Math.cos(ang) * clampR
      lz = Math.sin(ang) * clampR
      rPos.setX(i, lx)
      rPos.setZ(i, lz)
    }

    const rClamped = Math.hypot(lx, lz)
    const edgeDrop = smooth01(rimR - 0.85, rimR + 1.1, rClamped)
    const rimMask = smooth01(9.2, rimR - 1.2, rClamped) * (1 - edgeDrop)
    const backBias = smooth01(2.5, -10.5, lz)

    let ly = 0
    if (carrier === 'submarine') {
      // Stepped Abyssal Coral Trench: deep glowing central rift flanked by two basalt shelf tiers
      const trenchRift = smooth01(3.8, 1.1, Math.abs(lx - Math.sin(lz * 0.18) * 1.4)) * -0.42
      const basaltStep1 = smooth01(5.2, 8.8, Math.abs(lx)) * 0.55
      const basaltStep2 = rimMask * (1.25 + 1.55 * backBias + 0.45 * Math.sin(lx * 0.45) * Math.cos(lz * 0.45))
      ly = basaltStep1 + basaltStep2 + trenchRift
    } else if (carrier === 'camel') {
      // Asymmetric Crescent Canyon Oasis: sheer red-sandstone rear canyon walls & foreground crescent basin
      const canyonWall = rimMask * (1.45 + 1.85 * backBias + 0.55 * Math.sin(lx * 0.38 + lz * 0.32))
      const lagoonDip = smooth01(5.2, 1.8, Math.hypot(lx + 2.2, lz - 3.2)) * -0.24
      ly = canyonWall + lagoonDip
    } else if (carrier === 'snowball') {
      // U-Shaped Glacial Amphitheater: NW downhill ski gate open, steep horseshoe snow walls on N/E/W
      const skiEntryClear = 1 - smooth01(5.8, 1.8, Math.hypot(lx + 7.5, lz + 7.5))
      ly =
        rimMask *
        skiEntryClear *
        (1.45 + 2.15 * backBias + 0.52 * Math.cos(lx * 0.42 - lz * 0.36))
    } else if (carrier === 'rocket') {
      // Flat Articulated Hexagonal Metallic Station Deck with raised perimeter command rim
      const hexRim = smooth01(11.2, rimR - 0.9, rClamped) * (1 - edgeDrop) * 0.38
      ly = hexRim
    } else {
      // balloon: 3-Lobed Clover Sky Archipelago with stepped garden hills on the 3 lobes
      const lobeHills =
        (smooth01(6.5, 1.8, Math.hypot(lx + 7.5, lz + 3.2)) +
          smooth01(6.5, 1.8, Math.hypot(lx - 7.5, lz + 3.2)) +
          smooth01(7.2, 2.0, Math.hypot(lx, lz + 8.5))) *
        0.78
      ly = rimMask * (0.65 + 0.85 * backBias) + lobeHills
    }
    ly = ly * (1 - edgeDrop) - edgeDrop * 1.65
    rPos.setY(i, ly)

    const wave = 0.5 + 0.5 * Math.sin(lx * 0.24 - lz * 0.22)
    tmpCol.copy(cBase).lerp(cMid, wave * 0.72)
    if (ly > 0.45) {
      tmpCol.lerp(cRidge, smooth01(0.45, 2.4, ly) * 0.68)
    }
    rColors[i * 3] = tmpCol.r
    rColors[i * 3 + 1] = tmpCol.g
    rColors[i * 3 + 2] = tmpCol.b
  }
  rGeo.setAttribute('color', new THREE.BufferAttribute(rColors, 3))
  rGeo.computeVertexNormals()

  const realmTerrainMesh = new THREE.Mesh(
    rGeo,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: carrier === 'rocket' ? 0.42 : 0.84,
      metalness: carrier === 'rocket' ? 0.32 : 0.04,
      flatShading: false,
    }),
  )
  realmTerrainMesh.name = 'realm-terrain-mesh'
  realmTerrainMesh.castShadow = true
  realmTerrainMesh.receiveShadow = true
  realmTerrainGroup.add(realmTerrainMesh)
  realmGroup.add(realmTerrainGroup)

  // 0B. Central Mother Station Landmark (`realm-hub-building`) at Rear of Realm Plaza
  const hubBuilding = new THREE.Group()
  hubBuilding.name = 'realm-hub-building'
  hubBuilding.position.set(ro.x, ro.y, ro.z - 7.8)
  if (carrier === 'submarine') {
    // Deep-Sea Aquanaut Pressurized Habitat Dome & Lab Wings
    const plinth = cyl(3.4, 3.8, 0.38, 24, '#1E3A4C', { rough: 0.6, metal: 0.25 })
    plinth.position.y = 0.19
    const mainDome = dome(2.25, '#E2E8F0', { rough: 0.3, metal: 0.35 })
    mainDome.position.y = 0.36
    const bayWindow = cyl(1.65, 1.65, 0.55, 20, '#38BDF8', {
      emissive: '#0EA5E9',
      emissiveIntensity: 0.82,
    })
    bayWindow.position.set(0, 1.05, 0.75)
    const wingL = cyl(0.78, 0.78, 2.6, 16, '#CBD5E1', { rough: 0.35, metal: 0.3 })
    wingL.rotation.z = Math.PI / 2
    wingL.position.set(-2.4, 0.95, 0.2)
    const wingR = cyl(0.78, 0.78, 2.6, 16, '#CBD5E1', { rough: 0.35, metal: 0.3 })
    wingR.rotation.z = Math.PI / 2
    wingR.position.set(2.4, 0.95, 0.2)
    const sonarMast = cyl(0.08, 0.12, 1.45, 10, accent)
    sonarMast.position.set(0, 2.85, 0)
    const sonarBar = box(1.25, 0.12, 0.18, '#38E8D8', {
      emissive: '#22D3EE',
      emissiveIntensity: 0.9,
    })
    sonarBar.position.set(0, 3.58, 0)
    hubBuilding.add(plinth, mainDome, bayWindow, wingL, wingR, sonarMast, sonarBar)
    realmUpdaters.push((t) => {
      sonarBar.rotation.y = t * 1.8
    })
  } else if (carrier === 'camel') {
    // Silk-Road Caravanserai Citadel with Golden Dome & Twin Watchtowers
    const plinth = box(5.4, 0.38, 3.2, '#C89F65', { rough: 0.85 })
    plinth.position.y = 0.19
    const mainHall = box(3.6, 2.1, 2.4, '#EAD7B7', { rough: 0.78 })
    mainHall.position.y = 1.42
    const goldDome = dome(1.38, '#F4B942', {
      rough: 0.3,
      metal: 0.45,
      emissive: '#D97706',
      emissiveIntensity: 0.32,
    })
    goldDome.position.y = 2.45
    const towerL = cyl(0.62, 0.72, 3.1, 12, '#DFC496', { rough: 0.8 })
    towerL.position.set(-2.2, 1.72, 0.2)
    const towerR = cyl(0.62, 0.72, 3.1, 12, '#DFC496', { rough: 0.8 })
    towerR.position.set(2.2, 1.72, 0.2)
    const capL = dome(0.64, accent)
    capL.position.set(-2.2, 3.25, 0.2)
    const capR = dome(0.64, accent)
    capR.position.set(2.2, 3.25, 0.2)
    const archGate = box(1.35, 1.45, 0.35, '#FFE082', {
      emissive: '#F59E0B',
      emissiveIntensity: 0.75,
    })
    archGate.position.set(0, 0.98, 1.15)
    hubBuilding.add(plinth, mainHall, goldDome, towerL, towerR, capL, capR, archGate)
  } else if (carrier === 'snowball') {
    // Aurora Alpine Timber Chalet & Geodesic Observatory
    const foundation = box(5.2, 0.42, 3.2, '#7A8896', { rough: 0.85 })
    foundation.position.y = 0.21
    const lodgeBody = box(3.4, 1.85, 2.4, '#8C583A', { rough: 0.78 })
    lodgeBody.position.y = 1.34
    const snowRoof = gable(3.85, 1.25, 2.75, '#F8FCFD')
    snowRoof.position.y = 2.25
    const warmWindow = box(1.65, 0.85, 0.15, '#FFE082', {
      emissive: '#FF9E2C',
      emissiveIntensity: 0.9,
    })
    warmWindow.position.set(0, 1.32, 1.18)
    const chimney = box(0.48, 2.65, 0.48, '#64748B')
    chimney.position.set(-1.35, 2.15, -0.45)
    const geoDome = dome(1.25, '#38BDF8', {
      emissive: '#0284C7',
      emissiveIntensity: 0.45,
      rough: 0.2,
    })
    geoDome.position.set(2.15, 0.42, 0.15)
    hubBuilding.add(foundation, lodgeBody, snowRoof, warmWindow, chimney, geoDome)
  } else if (carrier === 'rocket') {
    // Orbital Deep-Space Command Core & Holo-Bridge
    const baseHex = cyl(2.8, 3.2, 0.55, 8, '#1E293B', { metal: 0.55, rough: 0.3 })
    baseHex.position.y = 0.28
    const commandTower = cyl(1.35, 1.75, 3.4, 8, '#E2E8F0', { metal: 0.45, rough: 0.28 })
    commandTower.position.y = 2.25
    const bridgeVisor = cyl(1.48, 1.48, 0.58, 16, '#38BDF8', {
      emissive: '#0EA5E9',
      emissiveIntensity: 0.88,
    })
    bridgeVisor.position.y = 3.15
    const holoRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.35, 0.08, 10, 36),
      mat(accent, { emissive: accent, emissiveIntensity: 0.85 }),
    )
    holoRing.rotation.x = Math.PI / 2
    holoRing.position.y = 2.65
    const beaconOrb = sphere(0.55, 16, '#38BDF8', {
      emissive: '#0EA5E9',
      emissiveIntensity: 0.95,
    })
    beaconOrb.position.y = 4.45
    hubBuilding.add(baseHex, commandTower, bridgeVisor, holoRing, beaconOrb)
    realmUpdaters.push((t) => {
      holoRing.rotation.z = t * 1.1
    })
  } else {
    // Cloud-Top Laputa Wind-Temple Sanctuary
    const stylobate = cyl(2.95, 3.35, 0.48, 18, '#F5EFE2', { rough: 0.65 })
    stylobate.position.y = 0.24
    const innerSanctum = cyl(1.55, 1.72, 2.45, 16, '#FAF6EE', { rough: 0.55 })
    innerSanctum.position.y = 1.7
    const templeDome = dome(1.62, '#F4B942', {
      rough: 0.3,
      metal: 0.45,
      emissive: '#D97706',
      emissiveIntensity: 0.28,
    })
    templeDome.position.y = 2.92
    for (let c = 0; c < 6; c += 1) {
      const ca = (c / 6) * Math.PI * 2
      const col = cyl(0.14, 0.17, 2.35, 10, '#E5DFD2')
      col.position.set(Math.cos(ca) * 2.35, 1.65, Math.sin(ca) * 2.35)
      hubBuilding.add(col)
    }
    const finial = sphere(0.28, 12, '#FEF08A', { emissive: '#FACC15', emissiveIntensity: 0.95 })
    finial.position.y = 4.68
    hubBuilding.add(stylobate, innerSanctum, templeDome, finial)
  }
  realmGroup.add(hubBuilding)

  // 0C. Radial Illuminated Walkways (`realm-walkways`) from Central Hub Plaza to Every Project Booth
  const walkwaysGroup = new THREE.Group()
  walkwaysGroup.name = 'realm-walkways'
  const hubPlaza = new THREE.Vector3(ro.x, ro.y + 0.08, ro.z - 2.2)
  for (const pp of layout.projects) {
    const branch = new THREE.Group()
    const target = new THREE.Vector3(pp.position.x, pp.position.y + 0.08, pp.position.z)
    const dir = target.clone().sub(hubPlaza)
    const len = dir.length()
    const mid = hubPlaza.clone().add(target).multiplyScalar(0.5)
    const walkDeck = box(
      1.15,
      0.1,
      Math.max(1.2, len - 2.2),
      carrier === 'rocket' || carrier === 'submarine' ? '#38BDF8' : '#E8DFCE',
      {
        rough: 0.65,
        emissive: carrier === 'rocket' || carrier === 'submarine' ? '#0284C7' : undefined,
        emissiveIntensity: carrier === 'rocket' || carrier === 'submarine' ? 0.42 : 0,
      },
    )
    walkDeck.position.copy(mid)
    walkDeck.lookAt(target)
    const lamp = sphere(0.11, 8, '#FFE082', { emissive: '#FFAB2E', emissiveIntensity: 0.9 })
    lamp.position.set(mid.x, mid.y + 0.45, mid.z)
    branch.add(walkDeck, lamp)
    walkwaysGroup.add(branch)
  }
  realmGroup.add(walkwaysGroup)

  if (carrier === 'submarine') {
    // 1. ABYSSAL BIOLUMINESCENT TRENCH, STEPPED HYDROTHERMAL VENTS & SUNKEN SHIP BOW (no circular disc!)
    const glowingTrench = box(3.4, 0.18, 12.5, '#22D3EE', {
      emissive: '#06B6D4',
      emissiveIntensity: 0.78,
      opacity: 0.72,
    })
    glowingTrench.position.set(ro.x, ro.y - 0.18, ro.z + 0.8)
    realmGroup.add(glowingTrench)

    // Stepped Basalt Hydrothermal Vents (`abyssal-hydro-vents`) with rising bioluminescent bubble plumes
    const hydroVents = new THREE.Group()
    hydroVents.name = 'abyssal-hydro-vents'
    for (const [vx, vz, vh] of [
      [-10.4, -3.2, 2.8],
      [-11.8, -1.4, 2.1],
      [10.6, -2.8, 3.1],
      [11.8, -0.8, 2.3],
    ] as const) {
      const ventStack = new THREE.Group()
      ventStack.position.set(ro.x + vx, ro.y + 0.15, ro.z + vz)
      const chimney = cyl(0.32, 0.78, vh, 7, '#1E293B', { rough: 0.9 })
      chimney.position.y = vh * 0.5
      const glowRim = cyl(0.28, 0.32, 0.18, 7, '#22D3EE', {
        emissive: '#06B6D4',
        emissiveIntensity: 0.92,
      })
      glowRim.position.y = vh + 0.04
      ventStack.add(chimney, glowRim)
      hydroVents.add(ventStack)
    }
    realmGroup.add(hydroVents)

    // Sunken Explorer Ship Bow (`sunken-ship-bow`) perched on the western coral shelf
    const shipBow = new THREE.Group()
    shipBow.name = 'sunken-ship-bow'
    shipBow.position.set(ro.x - 10.8, ro.y + 0.35, ro.z + 3.6)
    shipBow.rotation.set(0.18, 0.55, -0.22)
    const hullWreck = box(3.2, 1.35, 1.45, '#5C4033', { rough: 0.88 })
    const prow = pyramid(1.45, 1.85, 1.35, '#4A3228', { rough: 0.88 })
    prow.rotation.z = -Math.PI / 2
    prow.position.set(2.1, 0.05, 0)
    const brokenMast = cyl(0.08, 0.12, 2.8, 8, '#3E2723')
    brokenMast.position.set(-0.2, 1.6, 0)
    brokenMast.rotation.z = -0.25
    shipBow.add(hullWreck, prow, brokenMast)
    realmGroup.add(shipBow)

    // Sunken Atlantis Colonnade & Broken Archway at rear of trench
    for (let i = -3; i <= 3; i += 1) {
      if (i === 0) continue
      const ang = Math.PI + i * 0.28
      const cx = ro.x + Math.cos(ang) * 12.2
      const cz = ro.z + Math.sin(ang) * 10.5 - 1.5
      const colH = i % 2 === 0 ? 4.2 : 2.6
      const colBase = box(1.1, 0.36, 1.1, '#8FA8B8')
      colBase.position.set(cx, ro.y + 0.18, cz)
      const colShaft = cyl(0.36, 0.42, colH, 10, '#B0C4D1', { rough: 0.65 })
      colShaft.position.set(cx, ro.y + 0.36 + colH / 2, cz)
      realmGroup.add(colBase, colShaft)
      if (Math.abs(i) === 1) {
        const lintel = box(3.8, 0.48, 0.88, '#8FA8B8')
        lintel.position.set(ro.x, ro.y + 4.6, cz)
        realmGroup.add(lintel)
      }
    }

    // Bioluminescent Coral Clusters & Swaying Kelp Forest
    const kelps: THREE.Group[] = []
    const coralColors = ['#FF6B6B', '#38E8D8', '#A78BFA', '#FBBF24']
    for (let i = 0; i < 18; i += 1) {
      const a = (i / 18) * Math.PI * 2 + rand() * 0.2
      const r = 6.2 + rand() * 8.8
      const kx = ro.x + Math.cos(a) * r
      const kz = ro.z + Math.sin(a) * r
      const cHex = coralColors[i % coralColors.length]
      if (i % 2 === 0) {
        const kelp = new THREE.Group()
        kelp.position.set(kx, ro.y, kz)
        for (let seg = 0; seg < 4; seg += 1) {
          const leaf = sphere(0.34 - seg * 0.05, 8, cHex, {
            emissive: cHex,
            emissiveIntensity: 0.62,
          })
          leaf.scale.set(0.65, 1.85, 0.45)
          leaf.position.set(Math.sin(seg) * 0.12, 0.55 + seg * 0.72, 0)
          kelp.add(leaf)
        }
        realmGroup.add(kelp)
        kelps.push(kelp)
      } else {
        const brainCoral = dome(0.62 + rand() * 0.45, cHex, {
          emissive: cHex,
          emissiveIntensity: 0.55,
          rough: 0.5,
        })
        brainCoral.position.set(kx, ro.y + 0.05, kz)
        realmGroup.add(brainCoral)
      }
    }

    // Giant Glowing Jellyfish & Forward-Aligned Fish School
    const jelly = new THREE.Group()
    jelly.position.set(ro.x - 5.5, ro.y + 6.2, ro.z - 4.0)
    const bell = dome(1.45, '#F472B6', {
      emissive: '#EC4899',
      emissiveIntensity: 0.85,
      opacity: 0.78,
    })
    jelly.add(bell)
    for (let tIdx = 0; tIdx < 6; tIdx += 1) {
      const ta = (tIdx / 6) * Math.PI * 2
      const tentacle = cyl(0.04, 0.02, 2.2, 6, '#F9A8D4', {
        emissive: '#F472B6',
        emissiveIntensity: 0.7,
      })
      tentacle.position.set(Math.cos(ta) * 0.65, -1.1, Math.sin(ta) * 0.65)
      jelly.add(tentacle)
    }
    realmGroup.add(jelly)

    const fishes: { mesh: THREE.Group; baseAngle: number; radius: number; yOff: number }[] = []
    for (let i = 0; i < 16; i += 1) {
      const fg = new THREE.Group()
      const fColor = i % 2 === 0 ? accent : '#38E8D8'
      const fBody = sphere(0.28, 10, fColor, { emissive: fColor, emissiveIntensity: 0.68 })
      fBody.scale.set(1.8, 0.75, 0.45) // +X nose
      const fTail = pyramid(0.28, 0.36, 0.1, fColor, { emissive: fColor, emissiveIntensity: 0.5 })
      fTail.rotation.z = Math.PI / 2
      fTail.position.set(-0.48, 0, 0)
      fg.add(fBody, fTail)
      realmGroup.add(fg)
      fishes.push({
        mesh: fg,
        baseAngle: (i / 16) * Math.PI * 2,
        radius: 10.5 + (i % 3) * 1.8,
        yOff: 2.4 + (i % 4) * 0.85,
      })
    }

    realmUpdaters.push((t) => {
      jelly.position.y = ro.y + 6.2 + Math.sin(t * 1.6) * 0.65
      jelly.scale.set(1 + Math.sin(t * 3.2) * 0.08, 1 - Math.sin(t * 3.2) * 0.1, 1 + Math.sin(t * 3.2) * 0.08)
      kelps.forEach((k, i) => {
        k.rotation.z = Math.sin(t * 1.4 + i) * 0.12
      })
      fishes.forEach((f, i) => {
        const a = f.baseAngle + t * 0.38
        const vx = -Math.sin(a)
        const vz = Math.cos(a)
        f.mesh.position.set(
          ro.x + Math.cos(a) * f.radius,
          ro.y + f.yOff + Math.sin(t * 2.2 + i) * 0.25,
          ro.z + Math.sin(a) * f.radius,
        )
        f.mesh.rotation.y = headingFromVelocityX(vx, vz)
      })
    })
  } else if (carrier === 'camel') {
    // 2. CRESCENT MOON DESERT OASIS & CANYON NOMAD BAZAAR (月牙泉红岩峡谷绿洲 · 无圆形底盘)
    // Sandstone Caravanserai Arrival Plaza so the Camel & Walkways sit high and dry
    const landingPlaza = box(6.8, 0.14, 5.2, '#E8D3AE', { rough: 0.82 })
    landingPlaza.name = 'oasis-landing-plaza'
    landingPlaza.position.set(ro.x, ro.y - 0.02, ro.z - 2.6)
    // Shimmering Crescent Lagoon (positioned cleanly in the foreground basin south of the arrival plaza)
    const lagoon = cyl(4.2, 4.5, 0.14, 32, '#2AB7A9', {
      rough: 0.18,
      metal: 0.18,
      emissive: '#1D8A7E',
      emissiveIntensity: 0.28,
    })
    lagoon.position.set(ro.x - 2.2, ro.y + 0.02, ro.z + 3.2)
    const crescentSand = cyl(2.6, 3.0, 0.18, 28, '#E5C48B', { rough: 0.84, flat: false })
    crescentSand.position.set(ro.x - 0.4, ro.y + 0.04, ro.z + 4.4)
    realmGroup.add(landingPlaza, lagoon, crescentSand)

    // Stepped Red-Sandstone Canyon Cliff Buttresses (`oasis-canyon-cliffs`) framing the Oasis
    const canyonCliffs = new THREE.Group()
    canyonCliffs.name = 'oasis-canyon-cliffs'
    for (const [cx, cz, cw, ch, cd] of [
      [-12.8, -5.8, 3.6, 3.8, 2.8],
      [-9.6, -9.8, 4.2, 4.5, 3.0],
      [9.8, -9.4, 4.0, 4.2, 2.8],
      [13.2, -5.2, 3.4, 3.5, 2.6],
    ] as const) {
      const mesaBlock = new THREE.Group()
      mesaBlock.position.set(ro.x + cx, ro.y, ro.z + cz)
      const lowerTier = box(cw, ch * 0.58, cd, '#C8643B', { rough: 0.9 })
      lowerTier.position.y = ch * 0.29
      const upperTier = box(cw * 0.76, ch * 0.45, cd * 0.78, '#DF8B4E', { rough: 0.88 })
      upperTier.position.y = ch * 0.78
      mesaBlock.add(lowerTier, upperTier)
      canyonCliffs.add(mesaBlock)
    }
    realmGroup.add(canyonCliffs)

    // Silk-Road Merchant Bazaar Stalls (`oasis-bazaar-stalls`) with colorful woven awnings
    const bazaarStalls = new THREE.Group()
    bazaarStalls.name = 'oasis-bazaar-stalls'
    for (const [bx, bz, awningCol, rotY] of [
      [-5.6, -5.2, '#E8643A', 0.35],
      [5.6, -5.2, '#2AB7A9', -0.35],
    ] as const) {
      const stall = new THREE.Group()
      stall.position.set(ro.x + bx, ro.y + 0.08, ro.z + bz)
      stall.rotation.y = rotY
      const counter = box(1.8, 0.52, 0.9, '#C89F65', { rough: 0.85 })
      counter.position.y = 0.26
      const canopy = box(2.1, 0.12, 1.35, awningCol, { rough: 0.65 })
      canopy.position.y = 1.45
      canopy.rotation.x = 0.14
      stall.add(counter, canopy)
      bazaarStalls.add(stall)
    }
    realmGroup.add(bazaarStalls)

    // Traditional Crescent Moon Pavilion (月牙阁) overlooking the oasis
    const pavX = ro.x - 9.2
    const pavZ = ro.z - 7.2
    const pavPlinth = box(4.2, 0.42, 3.4, wall2)
    pavPlinth.position.set(pavX, ro.y + 0.21, pavZ)
    const pavBody = box(3.2, 1.85, 2.5, wall)
    pavBody.position.set(pavX, ro.y + 1.34, pavZ)
    const pavEave1 = pyramid(4.4, 0.78, 3.6, roof)
    pavEave1.position.set(pavX, ro.y + 2.58, pavZ)
    const pavUpper = box(2.1, 1.15, 1.7, wall2)
    pavUpper.position.set(pavX, ro.y + 3.3, pavZ)
    const pavEave2 = pyramid(3.1, 0.72, 2.6, accent)
    pavEave2.position.set(pavX, ro.y + 4.18, pavZ)
    realmGroup.add(pavPlinth, pavBody, pavEave1, pavUpper, pavEave2)

    // Bedouin Nomad Tents + Cracking Campfire + Palm Grove
    for (const [tx, tz, rot] of [
      [ro.x + 7.2, ro.z - 4.6, -0.4],
      [ro.x + 9.4, ro.z + 1.2, -0.9],
    ] as const) {
      const tent = gable(2.8, 1.65, 2.4, '#F5E6CC')
      tent.position.set(tx, ro.y + 0.05, tz)
      tent.rotation.y = rot
      const stripe = gable(2.86, 0.42, 2.44, accent)
      stripe.position.set(tx, ro.y + 0.06, tz)
      stripe.rotation.y = rot
      realmGroup.add(tent, stripe)
    }

    // Palm tree grove around the outer perimeter of the crescent water
    for (const [px, pz, s] of [
      [-12.2, 1.8, 1.15],
      [-10.4, -3.5, 0.95],
      [11.6, 4.2, 1.08],
      [10.8, -2.8, 1.2],
      [-2.2, -9.2, 1.05],
      [3.6, -8.8, 0.96],
    ] as const) {
      const palm = new THREE.Group()
      palm.position.set(ro.x + px, ro.y, ro.z + pz)
      const trunk = cyl(0.12 * s, 0.2 * s, 2.8 * s, 8, '#7C5638')
      trunk.position.y = 1.4 * s
      trunk.rotation.z = 0.08
      palm.add(trunk)
      for (let f = 0; f < 5; f += 1) {
        const fa = (f / 5) * Math.PI * 2
        const frond = box(1.35 * s, 0.08, 0.38 * s, '#4E8C57')
        frond.position.set(Math.cos(fa) * 0.65 * s, 2.75 * s, Math.sin(fa) * 0.65 * s)
        frond.rotation.y = -fa
        frond.rotation.z = -0.32
        palm.add(frond)
      }
      realmGroup.add(palm)
    }

    const fire = pyramid(0.95, 1.2, 0.95, accent, {
      emissive: '#FF8424',
      emissiveIntensity: 0.98,
    })
    fire.position.set(ro.x + 4.2, ro.y + 0.6, ro.z + 3.2)
    realmGroup.add(fire)

    // Natural Sand-Dune Ridge Embankment (`camel-dune-causeway`) with Oasis Palms & Wayfinder Cairns
    const camelDuneCauseway = new THREE.Group()
    camelDuneCauseway.name = 'camel-dune-causeway'
    for (let di = 1; di <= 14; di += 1) {
      const u = di * 0.055
      const arc = Math.sin(u * Math.PI) * 2.2
      const cx = hp.x + (ro.x - hp.x) * u
      const cy = hp.y + (ro.y - hp.y) * u + Math.sin(u * Math.PI) * 0.14
      const cz = hp.z + (ro.z - 2.6 - hp.z) * u - arc
      const side = di % 2 === 0 ? 1 : -1
      const duneMound = new THREE.Group()
      duneMound.position.set(cx + (di % 3 - 1) * 0.4, cy - 0.35, cz + side * 2.45)
      const sandBank = sphere(1.45 + (di % 3) * 0.25, 12, di % 2 === 0 ? '#DFB476' : '#D4A365', {
        rough: 0.88,
        flat: false,
      })
      sandBank.scale.set(1.85, 0.46, 1.15)
      duneMound.add(sandBank)
      if (di % 3 === 0) {
        const cairnBase = cyl(0.22, 0.3, 0.55, 7, '#B86B43', { rough: 0.9 })
        cairnBase.position.y = 0.52
        const cairnBeacon = sphere(0.14, 8, '#FDE047', {
          emissive: '#F59E0B',
          emissiveIntensity: 0.85,
        })
        cairnBeacon.position.y = 0.92
        duneMound.add(cairnBase, cairnBeacon)
      }
      camelDuneCauseway.add(duneMound)
    }
    realmGroup.add(camelDuneCauseway)

    realmUpdaters.push((t) => {
      fire.scale.y = 0.88 + 0.24 * Math.sin(t * 8.5)
    })
  } else if (carrier === 'snowball') {
    // 3. DOWNHILL AURORA ICE VALLEY & U-SHAPED ALPINE SKI RESORT + HOT-SPRING SANCTUARY (山脚极光冰谷 · 北欧木屋温泉村)
    // U-shaped ski valley ridges are sculpted directly into realm-terrain-mesh (no circular glacierBase/snowCap discs!)
    const gondolaStation = new THREE.Group()
    gondolaStation.name = 'valley-gondola-station'
    gondolaStation.position.set(ro.x + 8.6, ro.y + 0.18, ro.z + 2.4)
    gondolaStation.rotation.y = -0.45
    const stationDeck = box(3.2, 0.28, 2.4, '#475569', { rough: 0.72 })
    stationDeck.position.y = 0.14
    const stationFrame = box(2.6, 1.85, 1.9, '#334155', { metal: 0.35, rough: 0.45 })
    stationFrame.position.y = 1.15
    const stationRoof = gable(3.1, 0.85, 2.3, '#E2E8F0')
    stationRoof.position.y = 2.08
    const cablePylon = cyl(0.14, 0.22, 4.2, 10, '#64748B', { metal: 0.5, rough: 0.35 })
    cablePylon.position.set(-1.8, 2.1, 0.6)
    const pylonCross = box(1.6, 0.14, 0.16, '#94A3B8', { metal: 0.5 })
    pylonCross.position.set(-1.8, 4.1, 0.6)
    const gondolaCabin = box(0.95, 0.82, 0.68, accent, {
      emissive: accent,
      emissiveIntensity: 0.32,
      rough: 0.3,
    })
    gondolaCabin.position.set(-1.8, 3.15, 0.6)
    gondolaStation.add(stationDeck, stationFrame, stationRoof, cablePylon, pylonCross, gondolaCabin)
    realmGroup.add(gondolaStation)

    // Slalom Gate Flags flanking the S-curve downhill ski run (stopping before valley plaza so zero overlap!)
    const skiSlope = new THREE.Group()
    skiSlope.name = 'ski-slope'
    const steps = 10
    for (let i = 1; i <= 7; i += 1) {
      const u = i / steps
      const weave = computeSlalomWeave(u)
      const sx = hp.x + (ro.x - hp.x) * u + weave.lateralX * 0.72
      const sy = hp.y - 0.08 + (ro.y + 0.08 - hp.y) * u - Math.sin(u * Math.PI) * 0.85
      const sz = hp.z + (ro.z - 2.6 - hp.z) * u
      const side = i % 2 === 0 ? -1 : 1
      const gateColor = side < 0 ? accent : '#38BDF8'
      const pole = cyl(0.04, 0.04, 1.25, 6, gateColor)
      pole.position.set(sx + side * 1.95, sy + 0.55, sz)
      const flag = box(0.42, 0.28, 0.04, gateColor, {
        emissive: gateColor,
        emissiveIntensity: 0.45,
      })
      flag.position.set(sx + side * 1.72, sy + 0.95, sz)
      skiSlope.add(pole, flag)
    }
    realmGroup.add(skiSlope)

    // Natural S-Curve Snow-Banked Mountain Trail Shoulders (`ski-slope-shoulders`) & Flanking Pines (`ski-trail-pines`)
    const skiShoulders = new THREE.Group()
    skiShoulders.name = 'ski-slope-shoulders'
    const skiTrailPines = new THREE.Group()
    skiTrailPines.name = 'ski-trail-pines'
    for (let si = 1; si <= 14; si += 1) {
      const u = si * 0.052 // Spans u = 0.052 .. 0.728 along the upper mountain slope, stopping cleanly above the valley plaza!
      const weave = computeSlalomWeave(u)
      const cx = hp.x + (ro.x - hp.x) * u + weave.lateralX * 0.72
      const cy = hp.y - 0.18 + (ro.y - hp.y) * u - Math.sin(u * Math.PI) * 0.85
      const cz = hp.z + (ro.z - 2.6 - hp.z) * u
      const side = si % 2 === 0 ? 1 : -1
      const shoulder = new THREE.Group()
      shoulder.position.set(cx + side * 2.55, cy - 0.22, cz)
      const snowBank = sphere(1.35 + (si % 3) * 0.22, 12, '#F1F8FC', {
        rough: 0.48,
        flat: false,
      })
      snowBank.scale.set(1.35, 0.52, 1.55)
      const cragRock = pyramid(0.85, 0.75, 0.85, '#7A8B99', { rough: 0.85, flat: false })
      cragRock.position.set(side * 0.45, 0.15, 0)
      shoulder.add(snowBank, cragRock)
      skiShoulders.add(shoulder)

      if (si <= 12) {
        const pine = new THREE.Group()
        const ps = 0.78 + (si % 3) * 0.14
        pine.position.set(cx + side * 3.15, cy + 0.05, cz + (si % 2 === 0 ? 0.3 : -0.3))
        const pTrunk = cyl(0.08 * ps, 0.12 * ps, 0.75 * ps, 8, '#6E4C36')
        pTrunk.position.y = 0.38 * ps
        const pCone1 = cyl(0.06 * ps, 0.68 * ps, 1.05 * ps, 10, '#356859', { rough: 0.82, flat: false })
        pCone1.position.y = 0.98 * ps
        const pSnow1 = cyl(0.08 * ps, 0.7 * ps, 0.36 * ps, 10, '#FFFFFF', { rough: 0.48, flat: false })
        pSnow1.position.y = 1.24 * ps
        pine.add(pTrunk, pCone1, pSnow1)
        skiTrailPines.add(pine)
      }
    }
    realmGroup.add(skiShoulders, skiTrailPines)

    // Festive Alpine Ski Finish Banner Arch (`ski-finish-arch`) at the Upper Valley Slope Gate (u = 0.78)
    const archU = 0.78
    const archWeave = computeSlalomWeave(archU)
    const skiFinishArch = new THREE.Group()
    skiFinishArch.name = 'ski-finish-arch'
    skiFinishArch.position.set(
      hp.x + (ro.x - hp.x) * archU + archWeave.lateralX * 0.72,
      hp.y + (ro.y - hp.y) * archU - Math.sin(archU * Math.PI) * 0.85,
      hp.z + (ro.z - 2.6 - hp.z) * archU,
    )
    skiFinishArch.rotation.y = 0.48
    for (const side of [-1, 1]) {
      const post = cyl(0.12, 0.15, 3.25, 10, '#8C583A', { rough: 0.78 })
      post.position.set(side * 2.45, 1.62, 0)
      const postBase = box(0.48, 0.32, 0.48, '#F8FAFC', { rough: 0.5 })
      postBase.position.set(side * 2.45, 0.16, 0)
      const beacon = sphere(0.18, 10, side < 0 ? accent : '#38BDF8', {
        emissive: side < 0 ? accent : '#38BDF8',
        emissiveIntensity: 0.9,
      })
      beacon.position.set(side * 2.45, 3.35, 0)
      skiFinishArch.add(post, postBase, beacon)
    }
    const finishBeam = box(5.3, 0.46, 0.22, accent, {
      emissive: accent,
      emissiveIntensity: 0.35,
      rough: 0.4,
    })
    finishBeam.position.set(0, 2.98, 0)
    const finishSign = sign('FINISH · SKI VALLEY', 3.5, 0.42, '#1E293B', '#FAF6EE', '#38BDF8')
    finishSign.position.set(0, 2.98, 0.14)
    skiFinishArch.add(finishBeam, finishSign)
    realmGroup.add(skiFinishArch)

    // 3A. Multi-Story Nordic Timber Ski Lodge & Aprés-Ski Terrace (`nordic-ski-lodge`) on West Valley Terrace
    const skiLodge = new THREE.Group()
    skiLodge.name = 'nordic-ski-lodge'
    skiLodge.position.set(ro.x - 8.2, ro.y + 0.12, ro.z - 2.6)
    skiLodge.rotation.y = 0.52
    const lodgeDeck = box(4.6, 0.28, 3.4, '#6E4B32', { rough: 0.82 })
    lodgeDeck.position.y = 0.14
    const lodgeHall = box(3.4, 1.75, 2.3, '#8C583A', { rough: 0.78 })
    lodgeHall.position.set(-0.2, 1.15, -0.15)
    const lodgeUpper = box(2.4, 1.15, 1.85, '#9E6644', { rough: 0.76 })
    lodgeUpper.position.set(-0.2, 2.45, -0.15)
    const mainRoof = gable(3.9, 1.25, 2.75, '#F8FCFD')
    mainRoof.position.set(-0.2, 2.02, -0.15)
    const upperRoof = gable(2.85, 1.05, 2.2, '#F8FCFD')
    upperRoof.position.set(-0.2, 3.02, -0.15)
    const stoneChimney = box(0.54, 3.45, 0.54, '#64748B', { rough: 0.86 })
    stoneChimney.position.set(-1.55, 1.95, -0.65)
    const chimneyCap = box(0.68, 0.14, 0.68, '#F8FAFC')
    chimneyCap.position.set(-1.55, 3.72, -0.65)
    skiLodge.add(lodgeDeck, lodgeHall, lodgeUpper, mainRoof, upperRoof, stoneChimney, chimneyCap)

    // Glowing multi-pane amber windows + colorful standing ski rack on porch
    for (const [wx, wy, wz, ww, wh] of [
      [-0.85, 1.15, 1.02, 0.72, 0.68],
      [0.45, 1.15, 1.02, 0.72, 0.68],
      [-0.2, 2.48, 0.79, 0.88, 0.54],
    ] as const) {
      const winGlow = box(ww, wh, 0.08, '#FFE082', {
        emissive: '#FF9E2C',
        emissiveIntensity: 0.95,
      })
      winGlow.position.set(wx, wy, wz)
      const mullionV = box(0.05, wh + 0.04, 0.11, '#5C3A24')
      mullionV.position.set(wx, wy, wz)
      const mullionH = box(ww + 0.04, 0.05, 0.11, '#5C3A24')
      mullionH.position.set(wx, wy, wz)
      skiLodge.add(winGlow, mullionV, mullionH)
    }
    for (const [sx, col] of [
      [1.35, '#E8643A'],
      [1.52, '#38BDF8'],
      [1.69, '#FACC15'],
    ] as const) {
      const standingSki = box(0.1, 1.18, 0.04, col, { rough: 0.35 })
      standingSki.position.set(sx, 0.82, 0.85)
      standingSki.rotation.x = -0.15
      skiLodge.add(standingSki)
    }
    // Warm string-light garland across lodge terrace
    const stringLights = new THREE.Group()
    stringLights.name = 'alpine-string-lights'
    for (let li = 0; li < 6; li += 1) {
      const lx = -1.6 + li * 0.64
      const bulb = sphere(0.08, 8, '#FEF08A', { emissive: '#F59E0B', emissiveIntensity: 0.95 })
      bulb.position.set(lx, 1.72 - Math.sin((li / 5) * Math.PI) * 0.18, 1.28)
      stringLights.add(bulb)
    }
    skiLodge.add(stringLights)
    realmGroup.add(skiLodge)

    // 3B. Steaming Outdoor Turquoise Hot-Spring Pool (`hotspring-pool`) & Snow-Boulders (`hotspring-rocks`) on East Terrace
    const hotspringGroup = new THREE.Group()
    hotspringGroup.name = 'hotspring-pool'
    hotspringGroup.position.set(ro.x + 7.2, ro.y + 0.08, ro.z - 2.4)
    const cedarDeck = box(2.2, 0.18, 1.3, '#8A5A3B', { rough: 0.8 })
    cedarDeck.position.set(-1.5, 0.12, 0.7)
    cedarDeck.rotation.y = 0.45
    const poolWater = cyl(2.15, 2.35, 0.22, 28, '#22D3EE', {
      emissive: '#06B6D4',
      emissiveIntensity: 0.92,
      rough: 0.14,
      metal: 0.12,
    })
    poolWater.position.y = 0.11
    hotspringGroup.add(cedarDeck, poolWater)

    const rocksGroup = new THREE.Group()
    rocksGroup.name = 'hotspring-rocks'
    for (let ri = 0; ri < 14; ri += 1) {
      const ra = (ri / 14) * Math.PI * 2
      const rr = 2.18 + (ri % 2) * 0.16
      const rockSize = 0.28 + (ri % 3) * 0.09
      const boulder = sphere(rockSize, 12, '#64748B', { rough: 0.85, flat: false })
      boulder.scale.set(1.22, 0.72, 1.02)
      boulder.position.set(Math.cos(ra) * rr, 0.18, Math.sin(ra) * rr)
      const snowCapRock = sphere(rockSize * 0.84, 10, '#F8FCFD', { rough: 0.48, flat: false })
      snowCapRock.scale.set(1.14, 0.38, 0.95)
      snowCapRock.position.set(Math.cos(ra) * rr, 0.34, Math.sin(ra) * rr)
      rocksGroup.add(boulder, snowCapRock)
    }
    hotspringGroup.add(rocksGroup)

    // Two cozy bathing figures (snow-monkeys / capybaras with folded red head-towels) + rising steam puffs
    for (const [bx, bz] of [
      [-0.55, -0.25],
      [0.65, 0.35],
    ] as const) {
      const batherHead = sphere(0.26, 12, '#C89D7C', { rough: 0.75, flat: false })
      batherHead.position.set(bx, 0.32, bz)
      const headTowel = box(0.28, 0.08, 0.22, accent, { rough: 0.65 })
      headTowel.position.set(bx, 0.55, bz)
      hotspringGroup.add(batherHead, headTowel)
    }
    const steamGroup = new THREE.Group()
    steamGroup.name = 'hotspring-steam'
    const steamPuffs: THREE.Mesh[] = []
    for (let si = 0; si < 6; si += 1) {
      const sp = sphere(0.26 + (si % 2) * 0.08, 12, '#FFFFFF', {
        opacity: 0.48,
        rough: 0.4,
        flat: false,
        emissive: '#E0F7FA',
        emissiveIntensity: 0.38,
      })
      sp.position.set(Math.cos(si * 1.1) * 0.95, 0.5 + si * 0.35, Math.sin(si * 1.1) * 0.95)
      steamGroup.add(sp)
      steamPuffs.push(sp)
    }
    hotspringGroup.add(steamGroup)
    realmGroup.add(hotspringGroup)

    // 3C. Faceted Aurora Ice Crystal Archway (`aurora-crystal-arch`) & Brick-Coursed Inuit Igloo Nook
    const crystalArch = new THREE.Group()
    crystalArch.name = 'aurora-crystal-arch'
    crystalArch.position.set(ro.x, ro.y, ro.z - 5.2)
    for (let ci = -3; ci <= 3; ci += 1) {
      const u = ci / 3
      const archX = u * 3.4
      const archY = Math.cos(u * Math.PI * 0.46) * 3.2
      const cCol = Math.abs(ci) % 2 === 0 ? '#7DD3FC' : '#C4B5FD'
      const shard = cyl(0.08, 0.42, 1.45, 6, cCol, {
        emissive: ci % 2 === 0 ? '#38BDF8' : '#8B5CF6',
        emissiveIntensity: 0.65,
        opacity: 0.86,
        rough: 0.16,
      })
      shard.position.set(archX, archY, 0)
      shard.rotation.z = -u * 0.85
      crystalArch.add(shard)
    }
    realmGroup.add(crystalArch)

    // Refined Snow Igloo with Warm Lantern on NE Terrace (clear of central snowman parking!)
    const iglooGroup = new THREE.Group()
    iglooGroup.position.set(ro.x + 5.2, ro.y + 0.05, ro.z - 6.8)
    iglooGroup.rotation.y = -0.45
    const iglooDome = dome(1.75, '#F4F9FC', { rough: 0.35 })
    const iglooRing1 = new THREE.Mesh(
      new THREE.TorusGeometry(1.42, 0.055, 8, 24),
      mat('#DCEEF2', { rough: 0.45, flat: false }),
    )
    iglooRing1.rotation.x = Math.PI / 2
    iglooRing1.position.y = 0.78
    const iglooTunnel = cyl(0.62, 0.66, 0.95, 14, '#E6F2F7', { flat: false })
    iglooTunnel.rotation.x = Math.PI / 2
    iglooTunnel.position.set(0, 0.42, 1.55)
    const iglooGlow = sphere(0.44, 12, '#FFD27D', {
      emissive: '#FF9E2C',
      emissiveIntensity: 0.92,
      flat: false,
    })
    iglooGlow.position.set(0, 0.42, 1.82)
    iglooGroup.add(iglooDome, iglooRing1, iglooTunnel, iglooGlow)
    realmGroup.add(iglooGroup)

    // 3D. Snow-Laden Alpine Pine Forest (`realm-pine-forest`) around Valley Rim
    const pineForest = new THREE.Group()
    pineForest.name = 'realm-pine-forest'
    for (let pi = 0; pi < 20; pi += 1) {
      const ang = Math.PI * 0.68 + (pi / 19) * Math.PI * 1.64
      const dist = 11.4 + (pi % 3) * 1.65
      const px = ro.x + Math.cos(ang) * dist
      const pz = ro.z + Math.sin(ang) * dist
      const s = 0.88 + (pi % 4) * 0.16
      const pine = new THREE.Group()
      pine.position.set(px, ro.y + 0.35, pz)
      const trunk = cyl(0.1 * s, 0.15 * s, 0.9 * s, 8, '#6E4C36')
      trunk.position.y = 0.45 * s
      const tier1 = cyl(0.08 * s, 0.82 * s, 1.25 * s, 12, '#356859', { rough: 0.82, flat: false })
      tier1.position.y = 1.15 * s
      const snow1 = cyl(0.1 * s, 0.85 * s, 0.42 * s, 12, '#F8FCFD', { rough: 0.5, flat: false })
      snow1.position.y = 1.48 * s
      const tier2 = cyl(0.04 * s, 0.62 * s, 1.05 * s, 12, '#3D7866', { rough: 0.8, flat: false })
      tier2.position.y = 1.92 * s
      const snow2 = cyl(0.03 * s, 0.58 * s, 0.45 * s, 12, '#FFFFFF', { rough: 0.48, flat: false })
      snow2.position.y = 2.18 * s
      pine.add(trunk, tier1, snow1, tier2, snow2)
      pineForest.add(pine)
    }
    realmGroup.add(pineForest)

    // Translucent Blue Ice Crystal Spires along the outer glacier rim
    for (let i = 0; i < 10; i += 1) {
      const ang = Math.PI * 0.78 + (i / 9) * Math.PI * 1.44
      const dist = 14.2 + (i % 2) * 1.6
      const h = 2.4 + (i % 3) * 1.35
      const spire = pyramid(1.15, h, 1.15, '#7DD3FC', {
        emissive: '#38BDF8',
        emissiveIntensity: 0.45,
        opacity: 0.84,
        rough: 0.18,
      })
      spire.position.set(ro.x + Math.cos(ang) * dist, ro.y + h / 2 - 0.1, ro.z + Math.sin(ang) * dist)
      spire.rotation.y = i * 0.5
      realmGroup.add(spire)
    }

    // Double-Curtain Undulating Aurora Borealis (Emerald + Violet)
    const auroraGeo1 = new THREE.PlaneGeometry(36, 7.2, 28, 2)
    const aurora1 = new THREE.Mesh(
      auroraGeo1,
      mat('#5EEAD4', {
        emissive: '#10B981',
        emissiveIntensity: 0.92,
        opacity: 0.56,
        doubleSide: true,
      }),
    )
    aurora1.position.set(ro.x, ro.y + 9.2, ro.z - 13.5)

    const auroraGeo2 = new THREE.PlaneGeometry(32, 5.8, 24, 2)
    const aurora2 = new THREE.Mesh(
      auroraGeo2,
      mat('#C4B5FD', {
        emissive: '#8B5CF6',
        emissiveIntensity: 0.82,
        opacity: 0.46,
        doubleSide: true,
      }),
    )
    aurora2.position.set(ro.x + 1.5, ro.y + 11.4, ro.z - 15.2)

    const posAttr1 = auroraGeo1.attributes.position as THREE.BufferAttribute
    const posAttr2 = auroraGeo2.attributes.position as THREE.BufferAttribute
    realmGroup.add(aurora1, aurora2)
    realmUpdaters.push((t) => {
      for (let i = 0; i < posAttr1.count; i += 1) {
        const x = posAttr1.getX(i)
        posAttr1.setZ(i, Math.sin(x * 0.26 + t * 1.8) * 2.1)
      }
      for (let i = 0; i < posAttr2.count; i += 1) {
        const x = posAttr2.getX(i)
        posAttr2.setZ(i, Math.cos(x * 0.22 - t * 1.5) * 2.4)
      }
      posAttr1.needsUpdate = true
      posAttr2.needsUpdate = true
      steamPuffs.forEach((sp, idx) => {
        const u = (t * 0.38 + idx * 0.16) % 1
        sp.position.y = 0.35 + u * 1.85
        sp.scale.setScalar(0.65 + Math.sin(u * Math.PI) * 0.55)
      })
    })
  } else if (carrier === 'rocket') {
    // 4. DEEP-SPACE ARTICULATED HEXAGONAL ORBITAL STATION & ASTEROID BELT
    // Hexagonal modular station deck is sculpted into realm-terrain-mesh (no circular coreDeck/innerGrid discs!)
    const centralSpire = cyl(1.2, 1.8, 5.6, 6, wall, { metal: 0.45, rough: 0.28 })
    centralSpire.position.set(ro.x, ro.y + 2.8, ro.z - 4.2)
    const coreBeacon = sphere(0.95, 16, '#38BDF8', {
      emissive: '#0EA5E9',
      emissiveIntensity: 0.95,
    })
    coreBeacon.position.set(ro.x, ro.y + 6.1, ro.z - 4.2)
    realmGroup.add(centralSpire, coreBeacon)

    // Articulated Hexagonal Docking Arms (`orbital-docking-arms`) & Deep-Space Comm Array (`orbital-comm-array`)
    const dockingArms = new THREE.Group()
    dockingArms.name = 'orbital-docking-arms'
    for (const side of [-1, 1] as const) {
      const armTruss = box(5.4, 0.42, 1.15, '#334155', { metal: 0.62, rough: 0.28 })
      armTruss.position.set(ro.x + side * 12.6, ro.y + 0.15, ro.z - 1.2)
      const dockCollar = cyl(0.95, 1.05, 0.55, 6, '#64748B', { metal: 0.58, rough: 0.3 })
      dockCollar.position.set(ro.x + side * 15.2, ro.y + 0.25, ro.z - 1.2)
      const shuttleHull = cyl(0.32, 0.68, 2.2, 8, '#F8FAFC', { metal: 0.35, rough: 0.32 })
      shuttleHull.position.set(ro.x + side * 15.2, ro.y + 1.45, ro.z - 1.2)
      const shuttleBeacon = sphere(0.18, 10, '#38BDF8', {
        emissive: '#0EA5E9',
        emissiveIntensity: 0.9,
      })
      shuttleBeacon.position.set(ro.x + side * 15.2, ro.y + 2.65, ro.z - 1.2)
      dockingArms.add(armTruss, dockCollar, shuttleHull, shuttleBeacon)
    }
    realmGroup.add(dockingArms)

    const commArray = new THREE.Group()
    commArray.name = 'orbital-comm-array'
    commArray.position.set(ro.x + 5.8, ro.y + 0.2, ro.z - 6.8)
    const commMast = cyl(0.14, 0.22, 3.4, 8, '#94A3B8', { metal: 0.65, rough: 0.28 })
    commMast.position.y = 1.7
    const commDish = cyl(1.45, 0.22, 0.55, 16, '#E2E8F0', { metal: 0.55, rough: 0.25 })
    commDish.position.set(0, 3.25, 0.2)
    commDish.rotation.x = 0.65
    const dishFeed = sphere(0.2, 10, accent, { emissive: accent, emissiveIntensity: 0.92 })
    dishFeed.position.set(0, 3.65, 0.55)
    commArray.add(commMast, commDish, dishFeed)
    realmGroup.add(commArray)

    // 4 Radial Habitat Spokes + Giant Solar Array Wings
    for (let i = 0; i < 4; i += 1) {
      const a = (i * Math.PI) / 2 + Math.PI / 4
      const spoke = box(14.5, 0.55, 0.85, wall2, { metal: 0.45, rough: 0.3 })
      spoke.position.set(ro.x + Math.cos(a) * 6.5, ro.y - 0.2, ro.z + Math.sin(a) * 6.5)
      spoke.rotation.y = -a
      const solarWing = box(6.8, 0.08, 2.4, '#1D4ED8', {
        emissive: '#1E40AF',
        emissiveIntensity: 0.48,
        metal: 0.6,
        rough: 0.2,
      })
      solarWing.position.set(ro.x + Math.cos(a) * 16.2, ro.y + 0.2, ro.z + Math.sin(a) * 16.2)
      solarWing.rotation.y = -a
      solarWing.rotation.x = 0.28
      realmGroup.add(spoke, solarWing)
    }

    const outerRing = new THREE.Mesh(
      new THREE.TorusGeometry(15.2, 0.48, 14, 6),
      mat(wall, { metal: 0.55, rough: 0.25 }),
    )
    outerRing.rotation.x = Math.PI / 2
    outerRing.position.set(ro.x, ro.y + 0.35, ro.z)

    const innerHalo = new THREE.Mesh(
      new THREE.TorusGeometry(12.2, 0.16, 10, 6),
      mat(accent, { emissive: accent, emissiveIntensity: 0.85 }),
    )
    innerHalo.rotation.x = Math.PI / 2
    innerHalo.position.set(ro.x, ro.y + 0.55, ro.z)
    realmGroup.add(outerRing, innerHalo)

    // Orbiting Asteroid Belt + Distant Ringed Planet
    const planetGroup = new THREE.Group()
    planetGroup.position.set(ro.x - 16, ro.y + 11, ro.z - 22)
    const planet = sphere(4.2, 24, '#E879F9', {
      emissive: '#A21CAF',
      emissiveIntensity: 0.35,
      rough: 0.55,
    })
    const pRing = new THREE.Mesh(
      new THREE.TorusGeometry(6.8, 0.42, 8, 40),
      mat('#FDE047', { emissive: '#EAB308', emissiveIntensity: 0.4, opacity: 0.78 }),
    )
    pRing.rotation.x = 1.15
    pRing.rotation.y = 0.35
    planetGroup.add(planet, pRing)
    realmGroup.add(planetGroup)

    const asteroidBelt = new THREE.Group()
    asteroidBelt.position.set(ro.x, ro.y, ro.z)
    for (let i = 0; i < 20; i += 1) {
      const a = (i / 20) * Math.PI * 2
      const dist = 18.5 + rand() * 7.5
      const rock = sphere(0.45 + rand() * 0.65, 6, i % 4 === 0 ? '#38BDF8' : '#64748B', {
        rough: 0.85,
        flat: true,
        emissive: i % 4 === 0 ? '#0284C7' : undefined,
        emissiveIntensity: i % 4 === 0 ? 0.55 : 0,
      })
      rock.scale.set(1.3, 0.8, 1.0)
      rock.position.set(Math.cos(a) * dist, (rand() - 0.5) * 5.5, Math.sin(a) * dist)
      asteroidBelt.add(rock)
    }
    realmGroup.add(asteroidBelt)

    realmUpdaters.push((t) => {
      outerRing.rotation.z = t * 0.25
      innerHalo.rotation.z = -t * 0.42
      asteroidBelt.rotation.y = t * 0.08
      planetGroup.rotation.y = t * 0.12
    })
  } else {
    // 5. 'balloon' — 3-ISLAND SKY CLOUD ARCHIPELAGO & B-612 LITTLE PRINCE SANCTUARY (云端三浮岛 · 彩虹天桥群岛)
    // Multi-lobed 3-island sky archipelago is sculpted in realm-terrain-mesh (no single round mainGrass cylinder!)
    const invertedRock = cyl(11.8, 2.6, 6.2, 18, '#8B7B6B', { rough: 0.9, flat: false })
    invertedRock.position.set(ro.x, ro.y - 4.4, ro.z)
    realmGroup.add(invertedRock)

    for (const [sx, sy, sz, sr] of [
      [-15.2, 2.2, -6.5, 4.2],
      [0, 3.4, -14.8, 4.6],
    ] as const) {
      const satTop = cyl(sr, sr * 1.06, 0.65, 24, palette.realm.stageColor, { rough: 0.68, flat: false })
      satTop.position.set(ro.x + sx, ro.y + sy, ro.z + sz)
      const satCone = cyl(sr * 0.95, 0.8, sr * 1.15, 18, '#8B7B6B', { rough: 0.9, flat: false })
      satCone.position.set(ro.x + sx, ro.y + sy - sr * 0.62, ro.z + sz)
      realmGroup.add(satTop, satCone)
    }

    // Dedicated East Windmill Cloud Isle (`east-windmill-isle`) & Arched Rainbow/Timber Sky Bridges (`sky-arch-bridges`)
    const eastWindmillIsle = new THREE.Group()
    eastWindmillIsle.name = 'east-windmill-isle'
    eastWindmillIsle.position.set(ro.x + 15.6, ro.y + 1.8, ro.z - 5.8)
    const eastTop = cyl(4.2, 4.45, 0.68, 24, palette.realm.stageColor, { rough: 0.68, flat: false })
    const eastCone = cyl(3.95, 0.85, 4.6, 18, '#8B7B6B', { rough: 0.9, flat: false })
    eastCone.position.y = -2.45
    const eastMillTower = cyl(0.75, 1.12, 2.65, 14, wall, { flat: false })
    eastMillTower.position.y = 1.55
    const eastMillCap = dome(0.82, roof)
    eastMillCap.position.y = 2.88
    eastWindmillIsle.add(eastTop, eastCone, eastMillTower, eastMillCap)
    realmGroup.add(eastWindmillIsle)

    const skyArchBridges = new THREE.Group()
    skyArchBridges.name = 'sky-arch-bridges'
    for (const [bx, bz, by, yaw] of [
      [-10.2, -3.4, 0.95, 0.36],
      [10.4, -3.1, 0.85, -0.34],
    ] as const) {
      const bridgeGroup = new THREE.Group()
      bridgeGroup.position.set(ro.x + bx, ro.y + by, ro.z + bz)
      bridgeGroup.rotation.y = yaw
      for (let bi = -4; bi <= 4; bi += 1) {
        const u = bi / 4
        const plank = box(0.85, 0.14, 1.35, '#A16207', { rough: 0.78 })
        plank.position.set(u * 3.8, Math.cos(u * Math.PI * 0.48) * 1.15, 0)
        const railCol = bi % 2 === 0 ? '#FBBF24' : '#38BDF8'
        const rail = box(0.78, 0.08, 0.08, railCol, {
          emissive: railCol,
          emissiveIntensity: 0.48,
        })
        rail.position.set(u * 3.8, Math.cos(u * Math.PI * 0.48) * 1.15 + 0.45, 0.62)
        bridgeGroup.add(plank, rail)
      }
      skyArchBridges.add(bridgeGroup)
    }
    realmGroup.add(skyArchBridges)

    // 5A. B-612 Glass Bell-Jar Rose Conservatory (`b612-rose-dome`) on West Garden Terrace
    const roseGarden = new THREE.Group()
    roseGarden.name = 'b612-rose-dome'
    roseGarden.position.set(ro.x - 5.4, ro.y + 0.08, ro.z - 3.6)
    const mound1 = cyl(1.65, 1.95, 0.36, 24, '#8CCB5E', { rough: 0.84, flat: false })
    mound1.position.y = 0.18
    const mound2 = cyl(1.25, 1.48, 0.32, 24, '#AEDB6E', { rough: 0.82, flat: false })
    mound2.position.y = 0.5
    const roseStem = cyl(0.05, 0.07, 0.95, 10, '#2F7D32', { flat: false })
    roseStem.position.y = 1.12
    const roseBloom = sphere(0.32, 16, '#E11D48', {
      emissive: '#BE123C',
      emissiveIntensity: 0.48,
      rough: 0.35,
      flat: false,
    })
    roseBloom.position.y = 1.65
    for (let pi = 0; pi < 5; pi += 1) {
      const pa = (pi / 5) * Math.PI * 2
      const petal = sphere(0.22, 12, '#F43F5E', {
        emissive: '#E11D48',
        emissiveIntensity: 0.32,
        flat: false,
      })
      petal.scale.set(1.15, 0.72, 0.85)
      petal.position.set(Math.cos(pa) * 0.2, 1.62, Math.sin(pa) * 0.2)
      roseGarden.add(petal)
    }
    const bellJar = cyl(1.02, 1.08, 1.45, 24, '#E0F2FE', {
      opacity: 0.34,
      rough: 0.1,
      metal: 0.15,
      flat: false,
    })
    bellJar.position.y = 1.38
    const bellCap = dome(1.02, '#E0F2FE', { opacity: 0.34, rough: 0.1, metal: 0.15 })
    bellCap.position.y = 2.1
    const bellKnob = sphere(0.14, 12, '#F59E0B', {
      emissive: '#D97706',
      emissiveIntensity: 0.55,
      metal: 0.65,
      flat: false,
    })
    bellKnob.position.y = 3.16
    roseGarden.add(mound1, mound2, roseStem, roseBloom, bellJar, bellCap, bellKnob)
    realmGroup.add(roseGarden)

    // 5B. Puffing B-612 Volcano Chimney (`b612-volcano`) & Baobab Saplings (`baobab-saplings`) on East Terrace
    const volcanoGroup = new THREE.Group()
    volcanoGroup.name = 'b612-volcano'
    volcanoGroup.position.set(ro.x + 5.6, ro.y + 0.08, ro.z - 3.6)
    const vCone = cyl(0.52, 1.55, 1.95, 24, '#A86448', { rough: 0.86, flat: false })
    vCone.position.y = 0.98
    const vRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.12, 10, 24),
      mat('#7C4632', { rough: 0.84, flat: false }),
    )
    vRim.rotation.x = Math.PI / 2
    vRim.position.y = 1.95
    const vLava = sphere(0.36, 12, '#FF6A13', {
      emissive: '#FF5500',
      emissiveIntensity: 0.9,
      flat: false,
    })
    vLava.scale.y = 0.35
    vLava.position.y = 1.9
    volcanoGroup.add(vCone, vRim, vLava)
    const vPuffs: THREE.Mesh[] = []
    for (let vi = 0; vi < 4; vi += 1) {
      const vp = sphere(0.24 + vi * 0.05, 12, '#FFFDF9', {
        rough: 0.5,
        flat: false,
        emissive: '#F1F5F9',
        emissiveIntensity: 0.35,
      })
      vp.position.set(0, 2.2 + vi * 0.45, 0)
      volcanoGroup.add(vp)
      vPuffs.push(vp)
    }
    realmGroup.add(volcanoGroup)

    const baobabGroup = new THREE.Group()
    baobabGroup.name = 'baobab-saplings'
    for (const [bx, bz, bs] of [
      [ro.x + 7.4, ro.z - 1.8, 1.0],
      [ro.x - 7.6, ro.z - 1.6, 0.88],
      [ro.x + 3.8, ro.z - 6.8, 0.92],
    ] as const) {
      const tree = new THREE.Group()
      tree.position.set(bx, ro.y + 0.08, bz)
      const bottleTrunk = cyl(0.24 * bs, 0.42 * bs, 1.35 * bs, 14, '#9E7B56', {
        rough: 0.84,
        flat: false,
      })
      bottleTrunk.position.y = 0.68 * bs
      const crown1 = sphere(0.68 * bs, 14, '#7BC658', { rough: 0.78, flat: false })
      crown1.scale.set(1.25, 0.78, 1.15)
      crown1.position.set(0, 1.52 * bs, 0)
      const crown2 = sphere(0.48 * bs, 12, '#98DC6A', { rough: 0.76, flat: false })
      crown2.position.set(0.32 * bs, 1.82 * bs, 0.12 * bs)
      tree.add(bottleTrunk, crown1, crown2)
      baobabGroup.add(tree)
    }
    realmGroup.add(baobabGroup)

    // 5C. Little Prince & Fox Sunset Overlook Bench (`b612-fox-bench`) + Golden Star Ring (`b612-star-ring`)
    const foxBench = new THREE.Group()
    foxBench.name = 'b612-fox-bench'
    foxBench.position.set(ro.x - 2.8, ro.y + 0.08, ro.z - 1.2)
    foxBench.rotation.y = 0.35
    const seat = box(1.25, 0.1, 0.42, '#8C5A3C', { rough: 0.8 })
    seat.position.y = 0.32
    const backrest = box(1.25, 0.28, 0.08, '#8C5A3C', { rough: 0.8 })
    backrest.position.set(0, 0.5, -0.17)
    // Little Prince figure (green coat, golden hair, fluttering yellow scarf)
    const princeTorso = cyl(0.11, 0.14, 0.38, 10, '#4ADE80', { flat: false })
    princeTorso.position.set(-0.22, 0.56, 0)
    const princeHead = sphere(0.13, 12, '#FDE047', { flat: false })
    princeHead.position.set(-0.22, 0.84, 0)
    const princeScarf = box(0.38, 0.07, 0.09, '#FACC15', {
      emissive: '#EAB308',
      emissiveIntensity: 0.45,
    })
    princeScarf.position.set(-0.02, 0.72, 0.05)
    // Little orange Fox beside him
    const foxBody = sphere(0.14, 10, '#F97316', { flat: false })
    foxBody.scale.set(0.9, 1.2, 0.9)
    foxBody.position.set(0.28, 0.48, 0.02)
    const foxTail = cyl(0.04, 0.09, 0.28, 8, '#FB923C', { flat: false })
    foxTail.position.set(0.42, 0.46, -0.06)
    foxTail.rotation.z = -0.6
    foxBench.add(seat, backrest, princeTorso, princeHead, princeScarf, foxBody, foxTail)
    realmGroup.add(foxBench)

    const starRing = new THREE.Group()
    starRing.name = 'b612-star-ring'
    starRing.position.set(ro.x, ro.y + 2.4, ro.z)
    starRing.rotation.x = 0.18
    starRing.rotation.z = -0.12
    const ringTorus = new THREE.Mesh(
      new THREE.TorusGeometry(16.8, 0.07, 10, 84),
      mat('#FDE047', { emissive: '#F59E0B', emissiveIntensity: 0.65 }),
    )
    ringTorus.rotation.x = Math.PI / 2
    starRing.add(ringTorus)
    for (let si = 0; si < 8; si += 1) {
      const sa = (si / 8) * Math.PI * 2
      const gem = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.28, 0),
        mat('#FEF08A', { emissive: '#F59E0B', emissiveIntensity: 0.9 }),
      )
      gem.position.set(Math.cos(sa) * 16.8, 0, Math.sin(sa) * 16.8)
      starRing.add(gem)
    }
    realmGroup.add(starRing)

    // Sky Windmill Sanctuary (云端风车塔) on Rear Satellite Island
    const millX = ro.x
    const millZ = ro.z - 14.8
    const millY = ro.y + 3.4
    const millTower = cyl(1.05, 1.55, 3.8, 16, wall, { flat: false })
    millTower.position.set(millX, millY + 1.9, millZ)
    const millCap = dome(1.12, roof)
    millCap.position.set(millX, millY + 3.75, millZ)
    const rotorHub = new THREE.Group()
    rotorHub.position.set(millX, millY + 3.25, millZ + 1.18)
    const noseCap = sphere(0.24, 10, accent, { flat: false })
    rotorHub.add(noseCap)
    for (let i = 0; i < 4; i += 1) {
      const bladeGroup = new THREE.Group()
      bladeGroup.rotation.z = (i * Math.PI) / 2
      const spar = box(0.1, 2.35, 0.08, roof)
      spar.position.y = 1.18
      const sail = box(0.52, 1.85, 0.04, '#FFF8EA', {
        emissive: '#FFE4A3',
        emissiveIntensity: 0.25,
      })
      sail.position.set(0.22, 1.28, 0.03)
      bladeGroup.add(spar, sail)
      rotorHub.add(bladeGroup)
    }
    realmGroup.add(millTower, millCap, rotorHub)

    // Sea of Clouds (Smooth high-subdivision marshmallow puffs + hero cumulus clusters strictly outside island rim r >= 22.8!)
    const puffGeo = new THREE.SphereGeometry(1, 18, 14)
    const puffMat = mat('#FFFDF9', {
      rough: 0.48,
      flat: false,
      emissive: '#F3EEE3',
      emissiveIntensity: 0.36,
    })
    const clouds = new THREE.InstancedMesh(puffGeo, puffMat, 220)
    clouds.name = 'realm-cloud-sea'
    shadow(clouds, false, false)
    const dummy = new THREE.Object3D()
    for (let i = 0; i < 220; i += 1) {
      const ang = rand() * Math.PI * 2
      const dist = 22.8 + rand() * 28
      dummy.position.set(
        ro.x + Math.cos(ang) * dist,
        ro.y - 3.8 + (rand() - 0.5) * 2.2,
        ro.z + Math.sin(ang) * dist,
      )
      const s = 1.6 + rand() * 2.4
      dummy.scale.set(s * 1.42, s * 0.62, s * 1.18)
      dummy.rotation.y = rand() * Math.PI
      dummy.updateMatrix()
      clouds.setMatrixAt(i, dummy.matrix)
    }
    realmGroup.add(clouds)

    const heroClouds: THREE.Group[] = []
    for (let i = 0; i < 8; i += 1) {
      const ang = (i / 8) * Math.PI * 2 + 0.3
      const dist = 23.8 + (i % 2) * 3.8
      const hc = cumulusCloud(1.65 + (i % 3) * 0.35, '#FFFDF9', '#EAEEF5')
      hc.position.set(
        ro.x + Math.cos(ang) * dist,
        ro.y - 2.2 + (i % 2) * 0.8,
        ro.z + Math.sin(ang) * dist,
      )
      hc.rotation.y = -ang
      realmGroup.add(hc)
      heroClouds.push(hc)
    }

    realmUpdaters.push((t) => {
      rotorHub.rotation.z = -t * 0.85
      starRing.rotation.y = t * 0.22
      vPuffs.forEach((vp, idx) => {
        const u = (t * 0.42 + idx * 0.25) % 1
        vp.position.y = 2.05 + u * 1.65
        vp.scale.setScalar(0.65 + Math.sin(u * Math.PI) * 0.55)
      })
      heroClouds.forEach((hc, idx) => {
        hc.position.y = ro.y - 2.2 + (idx % 2) * 0.8 + Math.sin(t * 0.65 + idx) * 0.22
      })
    })
  }

  // =========================================================================
  // 5 REALM-NATIVE INTERACTIVE PROJECT SHRINES & ARTIFACTS
  // =========================================================================
  const projectMeshes = new Map<string, THREE.Object3D>()
  for (const pp of layout.projects) {
    const pg = new THREE.Group()
    pg.name = `project-${pp.project.id}`
    pg.position.set(pp.position.x, pp.position.y, pp.position.z)
    pg.userData.pickId = pp.project.id

    const showcase = new THREE.Group()
    showcase.name = `realm-showcase-${carrier}`

    if (carrier === 'submarine') {
      // 1. Abyssal Giant Bioluminescent Clam Shell & Sunken Treasure Altar
      const coralPed = cyl(1.65, 1.92, 0.56, 12, '#274C5E', { rough: 0.78 })
      coralPed.position.y = 0.28
      const lowerShell = cyl(1.52, 1.05, 0.36, 14, '#F4A2B8', { rough: 0.45 })
      lowerShell.scale.set(1.12, 1, 0.92)
      lowerShell.position.y = 0.72
      const pearlBed = cyl(1.26, 1.1, 0.14, 14, '#E0F7FA', {
        emissive: '#38E8D8',
        emissiveIntensity: 0.52,
      })
      pearlBed.position.y = 0.86
      const upperShellPivot = new THREE.Group()
      upperShellPivot.position.set(0, 0.88, -0.82)
      const upperShell = dome(1.42, '#F9C6D3', {
        emissive: '#EC4899',
        emissiveIntensity: 0.28,
        rough: 0.4,
      })
      upperShell.scale.set(1.08, 0.52, 0.92)
      upperShell.position.set(0, 0, 0.82)
      upperShellPivot.rotation.x = -0.82
      upperShellPivot.add(upperShell)

      // Sunken Brass-Bound Treasure Chest beside the clam
      const chestBox = box(0.78, 0.46, 0.52, '#784B2A')
      chestBox.position.set(1.25, 0.56, 0.45)
      chestBox.rotation.y = -0.35
      const chestGold = box(0.82, 0.12, 0.56, '#FBBF24', {
        emissive: '#F59E0B',
        emissiveIntensity: 0.75,
        metal: 0.65,
      })
      chestGold.position.set(1.25, 0.82, 0.45)
      chestGold.rotation.y = -0.35
      showcase.add(coralPed, lowerShell, pearlBed, upperShellPivot, chestBox, chestGold)
      realmUpdaters.push((t) => {
        upperShellPivot.rotation.x = -0.82 + Math.sin(t * 1.6 + pp.index) * 0.08
      })
    } else if (carrier === 'camel') {
      // 2. Silk-Road Oasis Canopy Pavilion & Woven Persian Carpet Altar
      const carpetOuter = box(3.4, 0.12, 3.1, accent, { rough: 0.82 })
      carpetOuter.position.y = 0.06
      const carpetInner = box(2.9, 0.14, 2.6, '#EAD4AA', { rough: 0.78 })
      carpetInner.position.y = 0.08
      const sandstoneAltar = cyl(1.12, 1.28, 0.78, 8, '#D8B37C', { rough: 0.7 })
      sandstoneAltar.position.y = 0.48
      showcase.add(carpetOuter, carpetInner, sandstoneAltar)

      for (const [cx, cz] of [
        [-1.32, -1.15],
        [1.32, -1.15],
        [-1.32, 1.15],
        [1.32, 1.15],
      ] as const) {
        const post = cyl(0.08, 0.1, 3.35, 8, '#7A5438')
        post.position.set(cx, 1.72, cz)
        showcase.add(post)
      }
      const canopyValence = box(3.15, 0.22, 2.85, accent)
      canopyValence.position.y = 3.42
      const silkTentRoof = pyramid(3.35, 0.86, 3.05, '#FAF0DC')
      silkTentRoof.position.y = 3.92
      const finial = sphere(0.18, 10, '#FBBF24', { metal: 0.65, emissive: '#D97706', emissiveIntensity: 0.5 })
      finial.position.y = 4.44
      const lanternL = sphere(0.18, 10, '#FDE047', { emissive: '#F97316', emissiveIntensity: 0.95 })
      lanternL.position.set(-1.15, 3.05, 1.15)
      const lanternR = sphere(0.18, 10, '#FDE047', { emissive: '#F97316', emissiveIntensity: 0.95 })
      lanternR.position.set(1.15, 3.05, 1.15)
      showcase.add(canopyValence, silkTentRoof, finial, lanternL, lanternR)
    } else if (carrier === 'snowball') {
      // 3. Carved Translucent Ice-Crystal Shrine & Warm Aurora Braziers
      const iceBase = cyl(1.75, 1.98, 0.38, 6, '#CFEBF6', { rough: 0.28 })
      iceBase.position.y = 0.19
      const iceAltar = cyl(1.18, 1.35, 0.68, 6, '#E2F5FC', {
        emissive: '#38BDF8',
        emissiveIntensity: 0.25,
        rough: 0.2,
      })
      iceAltar.position.y = 0.68
      showcase.add(iceBase, iceAltar)

      // 3 Carved Ice Crystal Pillars curving behind the artifact
      for (const [ang, h, tilt] of [
        [Math.PI * 0.72, 2.95, -0.16],
        [Math.PI, 3.45, 0],
        [Math.PI * 1.28, 2.95, 0.16],
      ] as const) {
        const crystal = pyramid(0.68, h, 0.68, '#7DD3FC', {
          emissive: '#0284C7',
          emissiveIntensity: 0.52,
          opacity: 0.82,
          rough: 0.15,
        })
        crystal.position.set(Math.cos(ang) * 1.38, h * 0.5 + 0.15, Math.sin(ang) * 1.28)
        crystal.rotation.z = tilt
        showcase.add(crystal)
      }
      // Twin Warm Aurora Fire Braziers on front corners
      for (const bx of [-1.25, 1.25]) {
        const bowl = cyl(0.26, 0.16, 0.45, 8, roof, { metal: 0.5 })
        bowl.position.set(bx, 0.42, 0.95)
        const flame = pyramid(0.32, 0.46, 0.32, accent, {
          emissive: '#FF9824',
          emissiveIntensity: 0.98,
        })
        flame.position.set(bx, 0.82, 0.95)
        showcase.add(bowl, flame)
      }
    } else if (carrier === 'rocket') {
      // 4. Zero-G Holographic Orbital Pod & Gyroscopic Energy Rings
      const emitterPad = cyl(1.62, 1.85, 0.32, 6, '#2A3444', { metal: 0.65, rough: 0.25 })
      emitterPad.position.y = 0.16
      const projectorCore = cyl(0.95, 1.1, 0.22, 16, '#38BDF8', {
        emissive: '#0EA5E9',
        emissiveIntensity: 0.88,
      })
      projectorCore.position.y = 0.42
      const holoBeam = cyl(1.15, 0.88, 2.35, 18, '#38BDF8', {
        emissive: '#0284C7',
        emissiveIntensity: 0.45,
        opacity: 0.18,
      })
      holoBeam.position.y = 1.65
      const gyroRing1 = new THREE.Mesh(
        new THREE.TorusGeometry(1.38, 0.045, 10, 32),
        mat('#22D3EE', { emissive: '#06B6D4', emissiveIntensity: 0.85 }),
      )
      gyroRing1.position.y = 2.02
      const gyroRing2 = new THREE.Mesh(
        new THREE.TorusGeometry(1.18, 0.04, 10, 28),
        mat(accent, { emissive: accent, emissiveIntensity: 0.82 }),
      )
      gyroRing2.position.y = 2.02
      showcase.add(emitterPad, projectorCore, holoBeam, gyroRing1, gyroRing2)
      realmUpdaters.push((t) => {
        gyroRing1.rotation.x = t * 0.9 + pp.index
        gyroRing1.rotation.y = t * 0.55
        gyroRing2.rotation.z = -t * 1.1 + pp.index
        gyroRing2.rotation.x = Math.PI / 3
      })
    } else {
      // 5. 'balloon' — Floating Sky-Stone Rune Monolith & Cumulus Cloud Altar
      for (const [cx, cy, cz, cr] of [
        [0, 0.36, 0, 1.15],
        [-0.85, 0.28, 0.35, 0.82],
        [0.88, 0.3, 0.28, 0.86],
        [0, 0.26, -0.72, 0.78],
      ] as const) {
        const cloudPuff = sphere(cr, 14, '#FFFFFF', { rough: 0.75 })
        cloudPuff.scale.set(1.25, 0.58, 1.1)
        cloudPuff.position.set(cx, cy, cz)
        showcase.add(cloudPuff)
      }
      const runeAltar = cyl(1.18, 0.92, 0.62, 8, '#8B7B6B', { rough: 0.85, flat: true })
      runeAltar.position.y = 0.68
      const monoL = box(0.38, 2.55, 0.32, wall2, { rough: 0.75 })
      monoL.position.set(-1.28, 1.52, -0.35)
      monoL.rotation.z = -0.08
      const monoR = box(0.38, 2.55, 0.32, wall2, { rough: 0.75 })
      monoR.position.set(1.28, 1.52, -0.35)
      monoR.rotation.z = 0.08
      const runeGlowL = box(0.1, 1.75, 0.35, '#38BDF8', { emissive: '#0EA5E9', emissiveIntensity: 0.85 })
      runeGlowL.position.set(-1.28, 1.55, -0.35)
      runeGlowL.rotation.z = -0.08
      const runeGlowR = box(0.1, 1.75, 0.35, '#38BDF8', { emissive: '#0EA5E9', emissiveIntensity: 0.85 })
      runeGlowR.position.set(1.28, 1.55, -0.35)
      runeGlowR.rotation.z = 0.08
      const astrolabe = new THREE.Mesh(
        new THREE.TorusGeometry(1.25, 0.05, 10, 32),
        mat('#F59E0B', { metal: 0.65, rough: 0.25, emissive: '#D97706', emissiveIntensity: 0.45 }),
      )
      astrolabe.rotation.x = Math.PI / 2
      astrolabe.position.y = 2.92
      showcase.add(runeAltar, monoL, monoR, runeGlowL, runeGlowR, astrolabe)
      realmUpdaters.push((t) => {
        astrolabe.rotation.z = t * 0.65 + pp.index
      })
    }

    // Selectable 3D Project Booth Model (`project-booth-${boothStyle}`)
    const defaultBooths: ProjectBoothStyle[] = [
      'booth-holo',
      'booth-crystal',
      'booth-monolith',
      'booth-mech',
      'booth-arcade',
    ]
    const boothStyle: ProjectBoothStyle =
      pp.project.boothStyle ?? defaultBooths[pp.index % defaultBooths.length]
    const artifact = new THREE.Group()
    artifact.name = `project-booth-${boothStyle}`
    artifact.position.y = 1.92

    if (boothStyle === 'booth-holo') {
      // 1. Holographic App Pod: Dual Gyro Rings + Floating App Screens + Cyan Emitter Core
      const emitterDisk = cyl(0.58, 0.68, 0.16, 16, '#0284C7', {
        emissive: '#38BDF8',
        emissiveIntensity: 0.78,
      })
      emitterDisk.position.y = -0.52
      const screenMain = box(0.92, 0.64, 0.06, '#E0F2FE', {
        emissive: '#38BDF8',
        emissiveIntensity: 0.65,
        rough: 0.15,
      })
      screenMain.position.set(0, 0.12, 0)
      const screenSide = box(0.54, 0.42, 0.05, accent, {
        emissive: accent,
        emissiveIntensity: 0.62,
      })
      screenSide.position.set(0.58, 0.24, 0.22)
      screenSide.rotation.y = -0.45
      const orbitRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.88, 0.038, 8, 28),
        mat('#38BDF8', { emissive: '#0EA5E9', emissiveIntensity: 0.8 }),
      )
      orbitRing.rotation.x = Math.PI / 3
      const appCore = sphere(0.24, 14, '#FACC15', {
        emissive: '#F59E0B',
        emissiveIntensity: 0.9,
      })
      appCore.position.set(-0.48, 0.32, 0.18)
      artifact.add(emitterDisk, screenMain, screenSide, orbitRing, appCore)
    } else if (boothStyle === 'booth-crystal') {
      // 2. AI Compute Crystal Matrix: Levitating Octahedron Core + 4 Orbiting Shards + Energy Halo
      const core = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.54, 0),
        mat(accent, { emissive: accent, emissiveIntensity: 0.82, rough: 0.18 }),
      )
      const ringA = new THREE.Mesh(
        new THREE.TorusGeometry(0.82, 0.042, 8, 28),
        mat('#38BDF8', { emissive: '#38BDF8', emissiveIntensity: 0.75 }),
      )
      const ringB = new THREE.Mesh(
        new THREE.TorusGeometry(0.66, 0.038, 8, 24),
        mat('#FBBF24', { emissive: '#FBBF24', emissiveIntensity: 0.75 }),
      )
      ringB.rotation.x = Math.PI / 2
      artifact.add(core, ringA, ringB)
      for (let s = 0; s < 4; s += 1) {
        const sa = (s / 4) * Math.PI * 2
        const shard = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.2, 0),
          mat('#A855F7', { emissive: '#9333EA', emissiveIntensity: 0.75 }),
        )
        shard.position.set(Math.cos(sa) * 0.92, (s % 2 === 0 ? 1 : -1) * 0.22, Math.sin(sa) * 0.92)
        artifact.add(shard)
      }
    } else if (boothStyle === 'booth-monolith') {
      // 3. Open-Source Code Monolith: Twin Obsidian Slabs + Glowing Rune Strips + Golden Codex
      const slabL = box(0.34, 1.32, 0.22, '#1E293B', { metal: 0.45, rough: 0.3 })
      slabL.position.set(-0.48, 0.08, -0.1)
      const slabR = box(0.34, 1.32, 0.22, '#1E293B', { metal: 0.45, rough: 0.3 })
      slabR.position.set(0.48, 0.08, -0.1)
      const codeGlowL = box(0.12, 1.05, 0.24, '#38BDF8', {
        emissive: '#0EA5E9',
        emissiveIntensity: 0.9,
      })
      codeGlowL.position.set(-0.48, 0.08, -0.1)
      const codeGlowR = box(0.12, 1.05, 0.24, accent, {
        emissive: accent,
        emissiveIntensity: 0.9,
      })
      codeGlowR.position.set(0.48, 0.08, -0.1)
      const codexCube = box(0.44, 0.44, 0.44, '#F59E0B', {
        metal: 0.65,
        rough: 0.22,
        emissive: '#D97706',
        emissiveIntensity: 0.65,
      })
      codexCube.rotation.set(0.6, 0.6, 0.4)
      codexCube.position.set(0, 0.24, 0.18)
      artifact.add(slabL, slabR, codeGlowL, codeGlowR, codexCube)
    } else if (boothStyle === 'booth-mech') {
      // 4. Robotics & Hardware Lab Bench: Turntable + Articulated Servo Arm + Laser Scanner Arch
      const turntable = cyl(0.68, 0.76, 0.18, 16, '#334155', { metal: 0.55, rough: 0.3 })
      turntable.position.y = -0.48
      const baseShoulder = cyl(0.24, 0.28, 0.34, 12, '#FF6A13', { rough: 0.35 })
      baseShoulder.position.set(-0.22, -0.24, 0)
      const lowerArm = box(0.18, 0.68, 0.18, '#FF6A13', { rough: 0.35 })
      lowerArm.position.set(-0.12, 0.18, 0)
      lowerArm.rotation.z = -0.32
      const upperArm = box(0.58, 0.15, 0.15, '#E2E8F0', { metal: 0.45, rough: 0.3 })
      upperArm.position.set(0.18, 0.46, 0)
      upperArm.rotation.z = 0.22
      const laserArch = new THREE.Mesh(
        new THREE.TorusGeometry(0.76, 0.04, 8, 24, Math.PI),
        mat('#22D3EE', { emissive: '#06B6D4', emissiveIntensity: 0.85 }),
      )
      laserArch.position.y = -0.38
      artifact.add(turntable, baseShoulder, lowerArm, upperArm, laserArch)
    } else {
      // 5. 'booth-arcade' — Interactive Indie Arcade Pod: Neon Cabinet + Pixel Star + Glowing Screen
      const cabinet = box(0.76, 1.24, 0.52, '#312E81', { rough: 0.4, metal: 0.25 })
      cabinet.position.y = 0.05
      const crtScreen = box(0.62, 0.48, 0.08, '#38BDF8', {
        emissive: '#0EA5E9',
        emissiveIntensity: 0.88,
      })
      crtScreen.position.set(0, 0.22, 0.24)
      const marquee = box(0.78, 0.2, 0.56, '#F43F5E', {
        emissive: '#E11D48',
        emissiveIntensity: 0.85,
      })
      marquee.position.set(0, 0.62, 0.04)
      const joyDeck = box(0.78, 0.12, 0.32, '#FACC15', {
        emissive: '#EAB308',
        emissiveIntensity: 0.55,
      })
      joyDeck.position.set(0, -0.08, 0.32)
      const starBadge = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.28, 0),
        mat('#FDE047', { emissive: '#FACC15', emissiveIntensity: 0.95 }),
      )
      starBadge.position.set(0, 0.98, 0)
      artifact.add(cabinet, crtScreen, marquee, joyDeck, starBadge)
    }

    const board = sign(pp.project.name, 2.45, 0.54, roof, '#FAF6EE', accent)
    board.position.set(0, 0.72, 1.72)
    pg.add(showcase, artifact, board)
    realmGroup.add(pg)
    projectMeshes.set(pp.project.id, pg)

    realmUpdaters.push((t) => {
      artifact.position.y = 1.92 + Math.sin(t * 2.1 + pp.index * 1.3) * 0.15
      artifact.rotation.y = t * 0.85 + pp.index
    })
  }

  // =========================================================================
  // DYNAMIC UNFOLDING TRAIL & BIOME-SPECIFIC WEATHER FX (Round 2 Gap c + Round 4 Gap e)
  // =========================================================================
  const unfoldingTrail = new THREE.Group()
  unfoldingTrail.name = 'unfolding-trail'
  const trailSegments: THREE.Object3D[] = []
  const trailCount = 16
  const destZ = ro.z - 2.6
  const isHorizontal = carrier === 'camel'
  const isDownhill = carrier === 'snowball'

  const isSubmarine = carrier === 'submarine'
  const sampleTrailPoint = (u: number): THREE.Vector3 => {
    const arc = Math.sin(u * Math.PI) * 2.2
    const slalomX = isDownhill ? computeSlalomWeave(u).lateralX * 0.72 : 0
    const subProgressZ = isSubmarine ? Math.pow(u, 1.48) : u
    const subSeawardArc = isSubmarine ? Math.sin(u * Math.PI) * 5.4 : 0
    const subDiveY = isSubmarine ? Math.pow(u, 0.84) : u
    const tx = hp.x + (ro.x - hp.x) * u + (isDownhill ? slalomX : isHorizontal ? 0 : arc)
    const ty =
      hp.y +
      (ro.y - hp.y) * subDiveY -
      (isDownhill ? Math.sin(u * Math.PI) * 0.85 : 0)
    const tz = hp.z + (destZ - hp.z) * subProgressZ + (isHorizontal ? -arc : subSeawardArc)
    return new THREE.Vector3(tx, ty, tz)
  }

  // Continuous Smooth CatmullRomCurve3 Ribbon Causeway / Ski Slope / Guide Stream (`continuous-causeway`)
  const causewayControlPts: THREE.Vector3[] = []
  for (let k = 0; k <= 12; k += 1) {
    causewayControlPts.push(sampleTrailPoint(k / 12))
  }
  const causewayCurve = new THREE.CatmullRomCurve3(causewayControlPts)
  const causewaySegCount = 48
  const ribbonVertCount = (causewaySegCount + 1) * 4
  const ribbonPos = new Float32Array(ribbonVertCount * 3)
  const ribbonCol = new Float32Array(ribbonVertCount * 3)
  const ribbonIndices: number[] = []

  const halfW = carrier === 'snowball' ? 1.85 : carrier === 'camel' ? 1.45 : 1.25
  const innerW = halfW * 0.76
  const curbLift = carrier === 'snowball' ? 0.22 : carrier === 'camel' ? 0.16 : 0.08
  const deckColor = new THREE.Color(
    carrier === 'camel'
      ? '#DEB881'
      : carrier === 'snowball'
        ? '#FFFFFF'
        : carrier === 'submarine'
          ? '#22D3EE'
          : carrier === 'rocket'
            ? '#38BDF8'
            : '#F4E8D1',
  )
  const curbColor = new THREE.Color(
    carrier === 'camel'
      ? accent
      : carrier === 'snowball'
        ? '#DCEEF8'
        : carrier === 'submarine'
          ? '#06B6D4'
          : carrier === 'rocket'
            ? accent
            : '#F4B942',
  )

  for (let k = 0; k <= causewaySegCount; k += 1) {
    const u = k / causewaySegCount
    const pt = causewayCurve.getPoint(u)
    const tan = causewayCurve.getTangent(u)
    const right = new THREE.Vector3(-tan.z, 0, tan.x)
    if (right.lengthSq() < 1e-4) {
      right.set(1, 0, 0)
    } else {
      right.normalize()
    }
    const offsets = [-halfW, -innerW, innerW, halfW]
    const lifts = [curbLift, -0.02, -0.02, curbLift]
    for (let c = 0; c < 4; c += 1) {
      const vIdx = (k * 4 + c) * 3
      ribbonPos[vIdx] = pt.x + right.x * offsets[c]
      ribbonPos[vIdx + 1] = pt.y + lifts[c]
      ribbonPos[vIdx + 2] = pt.z + right.z * offsets[c]
      const col = c === 0 || c === 3 ? curbColor : deckColor
      ribbonCol[vIdx] = col.r
      ribbonCol[vIdx + 1] = col.g
      ribbonCol[vIdx + 2] = col.b
    }
    if (k < causewaySegCount) {
      const base = k * 4
      for (let c = 0; c < 3; c += 1) {
        const a = base + c
        const b = base + c + 1
        const d = base + 4 + c
        const e = base + 4 + c + 1
        ribbonIndices.push(a, d, b, b, d, e)
      }
    }
  }

  const continuousCausewayGeo = new THREE.BufferGeometry()
  continuousCausewayGeo.setAttribute('position', new THREE.BufferAttribute(ribbonPos, 3))
  continuousCausewayGeo.setAttribute('color', new THREE.BufferAttribute(ribbonCol, 3))
  continuousCausewayGeo.setIndex(ribbonIndices)
  continuousCausewayGeo.computeVertexNormals()

  const continuousCausewayMesh = new THREE.Mesh(
    continuousCausewayGeo,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: carrier === 'snowball' ? 0.28 : 0.65,
      metalness: carrier === 'submarine' || carrier === 'rocket' ? 0.35 : 0.08,
      emissive:
        carrier === 'submarine' || carrier === 'rocket'
          ? new THREE.Color('#0284C7')
          : new THREE.Color('#000000'),
      emissiveIntensity: carrier === 'submarine' || carrier === 'rocket' ? 0.55 : 0,
      transparent: carrier === 'submarine' || carrier === 'rocket',
      opacity: carrier === 'submarine' || carrier === 'rocket' ? 0.72 : 1,
      side: THREE.DoubleSide,
      flatShading: false,
    }),
  )
  continuousCausewayMesh.name = 'continuous-causeway'
  continuousCausewayMesh.receiveShadow = true
  unfoldingTrail.add(continuousCausewayMesh)

  for (let i = 0; i < trailCount; i += 1) {
    const u = (i + 0.5) / trailCount
    const uNext = Math.min(1, u + 1 / trailCount)
    const pt = sampleTrailPoint(u)
    const nextPt = sampleTrailPoint(uNext)

    const segGroup = new THREE.Group()
    segGroup.position.copy(pt)
    segGroup.lookAt(nextPt)

    if (carrier === 'camel') {
      // Sandstone Causeway Arch Pier & Roadside Lanterns under Continuous Ribbon Deck
      const deck = box(1.2, 0.08, 0.28, '#C89F68', { rough: 0.85 })
      deck.name = 'causeway-deck'
      deck.position.set(0, -0.09, 0)
      const pier = cyl(0.28, 0.38, 0.95, 8, '#C89F68', { rough: 0.85 })
      pier.position.set(0, -0.55, 0)
      segGroup.add(deck, pier)
      if (i % 3 === 1) {
        const post = cyl(0.06, 0.08, 1.45, 6, '#7A5438')
        post.position.set(-1.35, 0.82, 0)
        const lantern = sphere(0.18, 8, '#FDE047', {
          emissive: '#F97316',
          emissiveIntensity: 0.95,
        })
        lantern.position.set(-1.35, 1.52, 0)
        segGroup.add(post, lantern)
      }
    } else if (carrier === 'snowball') {
      // Alpine Slalom Gates flanking the Smooth Continuous Ski Ribbon
      const deck = box(1.2, 0.06, 0.24, '#DCEEF8', { rough: 0.35, flat: false })
      deck.name = 'causeway-deck'
      deck.position.set(0, -0.08, 0)
      segGroup.add(deck)
      if (i % 2 === 0) {
        const side = (i / 2) % 2 === 0 ? -1 : 1
        const gColor = side < 0 ? accent : '#38BDF8'
        const gatePole = cyl(0.045, 0.045, 1.35, 6, gColor)
        gatePole.position.set(side * 1.55, 0.68, 0)
        const banner = box(0.46, 0.3, 0.05, gColor, { emissive: gColor, emissiveIntensity: 0.45 })
        banner.position.set(side * 1.32, 1.12, 0)
        segGroup.add(gatePole, banner)
      }
    } else if (carrier === 'submarine') {
      // Wide Bioluminescent Abyssal Dive Tunnel Ring (r = 3.1 > submarine half-length 2.45 so it NEVER clips the hull!)
      const sonarRing = new THREE.Mesh(
        new THREE.TorusGeometry(3.1, 0.055, 10, 28),
        mat('#22D3EE', { emissive: '#06B6D4', emissiveIntensity: 0.85, opacity: i < 2 ? 0 : 0.72 }),
      )
      sonarRing.visible = i >= 2
      const guideRailL = sphere(0.14, 8, '#38BDF8', {
        emissive: '#06B6D4',
        emissiveIntensity: 0.85,
      })
      guideRailL.name = 'causeway-deck'
      guideRailL.position.set(-3.1, 0, 0)
      guideRailL.visible = i >= 2
      const guideRailR = sphere(0.14, 8, '#38BDF8', {
        emissive: '#06B6D4',
        emissiveIntensity: 0.85,
      })
      guideRailR.position.set(3.1, 0, 0)
      guideRailR.visible = i >= 2
      segGroup.add(sonarRing, guideRailL, guideRailR)
    } else if (carrier === 'rocket') {
      // Soft Rocket Exhaust Contrail Puff (NO solid sky-track!)
      const puff = sphere(0.42, 10, '#E0F2FE', {
        emissive: '#38BDF8',
        emissiveIntensity: 0.45,
        opacity: 0.52,
        flat: false,
      })
      puff.name = 'causeway-deck'
      segGroup.add(puff)
    } else {
      // Soft Drifting Cumulus Cloud Puff for Hot-Air Balloon (NO solid sky-track!)
      const puff1 = sphere(0.78, 12, '#FFFFFF', {
        rough: 0.72,
        opacity: 0.68,
        flat: false,
      })
      puff1.name = 'causeway-deck'
      puff1.scale.set(1.35, 0.55, 1.1)
      segGroup.add(puff1)
    }

    unfoldingTrail.add(segGroup)
    trailSegments.push(segGroup)
  }
  realmGroup.add(unfoldingTrail)

  // Biome-Specific Weather FX Particles (Sand-wind streaks, Snow flurry, Abyssal bubbles, Sky wind)
  const weatherGroup = new THREE.Group()
  weatherGroup.name = 'transition-weather-fx'
  const weatherItems: { mesh: THREE.Object3D; uBase: number; offset: THREE.Vector3; speed: number }[] = []
  for (let i = 0; i < 28; i += 1) {
    const uBase = (i / 28 + rand() * 0.05) % 1
    const offset = new THREE.Vector3(
      (rand() - 0.5) * 14,
      0.8 + rand() * 5.2,
      (rand() - 0.5) * 12,
    )
    let wMesh: THREE.Object3D
    if (carrier === 'camel') {
      // Sweeping golden sand-wind ribbon + desert dust mote
      wMesh =
        i % 2 === 0
          ? box(2.8 + rand() * 1.8, 0.07, 0.14, '#E8C589', {
              emissive: '#D9A760',
              emissiveIntensity: 0.38,
              opacity: 0.78,
            })
          : sphere(0.32 + rand() * 0.25, 8, '#E6C288', { opacity: 0.62, rough: 0.9 })
    } else if (carrier === 'snowball') {
      // Swirling alpine snow-spray flurry & ice crystal streak
      wMesh =
        i % 2 === 0
          ? sphere(0.2 + rand() * 0.16, 8, '#FFFFFF', {
              emissive: '#E0F2FE',
              emissiveIntensity: 0.55,
            })
          : box(0.12, 0.12, 1.85, '#BAE6FD', {
              emissive: '#38BDF8',
              emissiveIntensity: 0.48,
              opacity: 0.78,
            })
    } else if (carrier === 'submarine') {
      // Rising abyssal bubble curtain
      wMesh = sphere(0.18 + rand() * 0.22, 10, '#8CE8FF', {
        emissive: '#22D3EE',
        emissiveIntensity: 0.75,
        opacity: 0.74,
      })
    } else {
      // Soft high-altitude cloud/starlight mote (NO thin vertical stick boxes!)
      wMesh = sphere(0.24 + rand() * 0.16, 10, '#FFFDF9', {
        emissive: '#E0F2FE',
        emissiveIntensity: 0.48,
        opacity: 0.62,
        flat: false,
      })
    }
    weatherGroup.add(wMesh)
    weatherItems.push({
      mesh: wMesh,
      uBase,
      offset,
      speed: 0.55 + rand() * 0.65,
    })
  }
  realmGroup.add(weatherGroup)

  let currentRealmProgress = 0.65

  const syncTransitionFX = (t: number, progress: number) => {
    const revealFrac = causewayRevealFraction(progress)
    const activeSegs = Math.floor(revealFrac * causewaySegCount)
    // Only ground/slope carriers (camel & snowball) have a physical road/ski ribbon!
    const hasPhysicalRoad = carrier === 'camel' || carrier === 'snowball'
    continuousCausewayMesh.visible = hasPhysicalRoad && activeSegs > 0
    continuousCausewayGeo.setDrawRange(0, activeSegs * 18)

    trailSegments.forEach((seg, idx) => {
      const s = trailSegmentUnfoldScale(progress, idx, trailSegments.length)
      const fadeInSky =
        !hasPhysicalRoad && progress > 0.88 ? Math.max(0, (1 - progress) / 0.12) : 1
      seg.visible = s * fadeInSky > 0.005
      seg.scale.setScalar(Math.max(0.001, s * fadeInSky))
    })

    const wIntensity = weatherBurstIntensity(progress)
    const transitFade = progress > 0.88 ? Math.max(0, (0.96 - progress) / 0.08) : 1
    weatherGroup.visible = wIntensity * transitFade > 0.01
    weatherItems.forEach((item, idx) => {
      const u = (item.uBase + t * 0.18 * item.speed) % 1
      const cx = hp.x + (ro.x - hp.x) * u
      const cy = hp.y + (ro.y - hp.y) * u
      const cz = hp.z + (destZ - hp.z) * u
      const swirlX = Math.sin(t * 2.8 + idx) * 1.8
      const swirlY = Math.cos(t * 2.2 + idx * 0.7) * 0.95
      item.mesh.position.set(
        cx + item.offset.x + swirlX,
        cy + item.offset.y + swirlY,
        cz + item.offset.z,
      )
      item.mesh.scale.setScalar(
        Math.max(0.001, wIntensity * transitFade * (0.85 + 0.25 * Math.sin(t * 4 + idx))),
      )
    })
  }
  syncTransitionFX(0, currentRealmProgress)

  return {
    carrierGroup,
    realmGroup,
    projectMeshes,
    updateCarrier: (t: number, settleWave = 0, moveSpeed = 0, realmProgress?: number) => {
      if (typeof realmProgress === 'number') {
        currentRealmProgress = realmProgress
      }
      for (const fn of carrierUpdaters) fn(t, settleWave, moveSpeed, currentRealmProgress)
      syncTransitionFX(t, currentRealmProgress)
    },
    updateRealm: (t: number) => {
      for (const fn of realmUpdaters) fn(t)
      syncTransitionFX(t, currentRealmProgress)
    },
  }
}
