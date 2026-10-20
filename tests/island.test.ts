import { describe, expect, it } from 'vitest'
import { defaultProfile } from '../src/data/defaultProfile'
import {
  applyProfilePatch,
  BIOME_OPTIONS,
  BUILDING_STYLE_OPTIONS,
  CARRIER_OPTIONS,
  clampCompanyCount,
  decodeProfileShareHash,
  DECOR_PROP_OPTIONS,
  encodeProfileShareHash,
  getActivePlaces,
  parseProfileJson,
  PROJECT_BOOTH_OPTIONS,
  resolvePalette,
  rotatePlaceInProfile,
  SATELLITE_THEME_OPTIONS,
  serializeProfileJson,
  swapPlaceOrderInProfile,
  toggleDecorPropInProfile,
  validateProfileConfig,
  WORLD_SHAPE_OPTIONS,
} from '../src/schema/profile'
import {
  computeCarrierPlacement,
  computeWorldLayout,
  getCoastRadius,
  getRiverCenterX,
  getTerrainHeight,
} from '../src/scene/layout'

describe('M-001: Profile Schema & Theme Palette Contracts (C-001, S-001)', () => {
  it('validates defaultProfile and enforces single accent #E8643A', () => {
    const validation = validateProfileConfig(defaultProfile)
    expect(validation.valid).toBe(true)
    expect(validation.errors).toHaveLength(0)

    const palette = resolvePalette('ocean', 'submarine')
    expect(palette.shared.accent.toUpperCase()).toBe('#E8643A')
    expect(palette.shared.roof.toUpperCase()).toBe('#3A3F36')
  })

  it('supports parametric company tower count from 1 to 6', () => {
    for (let count = 1; count <= 6; count++) {
      const active = getActivePlaces({ ...defaultProfile, companyCount: count })
      const careers = active.filter((p) => p.kind === 'career')
      expect(careers).toHaveLength(count)
    }
    expect(clampCompanyCount(0)).toBe(1)
    expect(clampCompanyCount(9)).toBe(6)
  })

  it('applies live profile customization patches and safely round-trips / sanitizes JSON', async () => {
    const patched = applyProfilePatch(defaultProfile, {
      name: '  Island World  ',
      tagline: '  Architect of 3D Islands  ',
      companyCount: 99,
      biome: 'desert',
      carrier: 'camel',
    })
    expect(patched.name).toBe('Island World')
    expect(patched.tagline).toBe('Architect of 3D Islands')
    expect(patched.companyCount).toBe(6)
    expect(patched.biome).toBe('desert')
    expect(patched.carrier).toBe('camel')

    const raw = serializeProfileJson(patched)
    const roundTripped = parseProfileJson(raw, defaultProfile)
    expect(roundTripped.name).toBe('Island World')
    expect(roundTripped.companyCount).toBe(6)

    // Studio Customizer 2.0 & Sims Build Mode: 37 building styles across strict categories (10 education, 10 landmark, 17 career)
    expect(BUILDING_STYLE_OPTIONS).toHaveLength(37)
    expect(PROJECT_BOOTH_OPTIONS).toHaveLength(5)
    const { getBuildingStyleOptionsForKind } = await import('../src/schema/profile')
    const { renderStylePreviewSvg } = await import('../src/ui/appUi')
    expect(getBuildingStyleOptionsForKind('education')).toHaveLength(10)
    expect(getBuildingStyleOptionsForKind('landmark')).toHaveLength(10)
    expect(getBuildingStyleOptionsForKind('career')).toHaveLength(17)
    for (const opt of BUILDING_STYLE_OPTIONS) {
      expect(renderStylePreviewSvg(opt.id, opt.colors)).toContain('<svg')
    }
    for (const booth of PROJECT_BOOTH_OPTIONS) {
      expect(renderStylePreviewSvg(booth.id, booth.colors)).toContain('<svg')
    }
    for (const shape of WORLD_SHAPE_OPTIONS) {
      expect(renderStylePreviewSvg(shape.id, shape.colors)).toContain('<svg')
    }

    // Verify applyProfilePatch strictly prevents cross-category building style mixing
    const crossCategoryPatch = applyProfilePatch(defaultProfile, {
      places: defaultProfile.places.map((p) =>
        p.kind === 'education'
          ? { ...p, style: 'factory' } // invalid category for education!
          : p.kind === 'landmark'
            ? { ...p, style: 'b612-rose-hill' } // valid landmark!
            : p,
      ),
    })
    expect(crossCategoryPatch.places.find((p) => p.kind === 'education')?.style).toBe('university')
    expect(crossCategoryPatch.places.find((p) => p.kind === 'landmark')?.style).toBe(
      'b612-rose-hill',
    )

    const customPatch = applyProfilePatch(defaultProfile, {
      places: defaultProfile.places.map((p, idx) =>
        idx === 0
          ? { ...p, style: 'uni-gothic', link: '  https://example.edu/ai  ' }
          : p,
      ),
      projects: Array.from({ length: 8 }, (_, idx) => ({
        id: `p-${idx}`,
        name: `Prod ${idx}`,
        summary: 'Product summary',
        boothStyle: PROJECT_BOOTH_OPTIONS[idx % PROJECT_BOOTH_OPTIONS.length].id,
        tag: '  AI App  ',
        link: '  https://app.example.com  ',
        repoUrl: '  https://github.com/example/repo  ',
      })),
    })
    expect(customPatch.places[0].style).toBe('uni-gothic')
    expect(customPatch.places[0].link).toBe('https://example.edu/ai')
    expect(customPatch.projects).toHaveLength(6)
    expect(customPatch.projects[0].boothStyle).toBe('booth-holo')
    expect(customPatch.projects[1].boothStyle).toBe('booth-crystal')
    expect(customPatch.projects[0].tag).toBe('AI App')
    expect(customPatch.projects[0].link).toBe('https://app.example.com')
    expect(customPatch.projects[0].repoUrl).toBe('https://github.com/example/repo')

    // Corrupted or invalid JSON falls back safely without throwing
    expect(parseProfileJson('{not-valid-json', defaultProfile).name).toBe(defaultProfile.name)
    expect(parseProfileJson('{"places":[]}', defaultProfile).places.length).toBeGreaterThan(0)
  })
})

describe('M-002: Multi-Biome & Multi-Carrier World Layout Contracts (C-002)', () => {
  it('computes distinct terrain heights and non-overlapping layouts across all 4 biomes and 5 carriers', () => {
    for (const biomeOpt of BIOME_OPTIONS) {
      for (const carrierOpt of CARRIER_OPTIONS) {
        const activePlaces = getActivePlaces({
          ...defaultProfile,
          biome: biomeOpt.id,
          carrier: carrierOpt.id,
          companyCount: 6,
        })
        const layout = computeWorldLayout(
          activePlaces,
          defaultProfile.projects,
          biomeOpt.id,
          carrierOpt.id,
        )

        expect(layout.buildings.length).toBe(activePlaces.length)
        expect(layout.paths.length).toBe(activePlaces.length)
        expect(layout.projects.length).toBe(defaultProfile.projects.length)
        expect(layout.foliage.length).toBeGreaterThan(10)

        // Ensure foliage never collides with buildings, river channel, or outer caravan ring
        for (const tree of layout.foliage) {
          expect(Math.abs(tree.x - getRiverCenterX(tree.z))).toBeGreaterThanOrEqual(2.6)
          expect(Math.hypot(tree.x, tree.z)).toBeLessThanOrEqual(15.3)
          for (const b of layout.buildings) {
            const dist = Math.hypot(tree.x - b.position.x, tree.z - b.position.z)
            expect(dist).toBeGreaterThanOrEqual(3.4)
          }
        }

        // Ensure stone paths never walk across open river water
        for (const path of layout.paths) {
          for (const pt of path) {
            expect(Math.abs(pt.x - getRiverCenterX(pt.z))).toBeGreaterThanOrEqual(2.3)
          }
        }

        // Ensure buildings have generous 3D spacing (>= 6.0), distinct screen-X lanes (>= 1.4), and river clearance (>= 3.5)
        for (let i = 0; i < layout.buildings.length; i++) {
          const b1 = layout.buildings[i]
          const riverCenter = getRiverCenterX(b1.position.z)
          expect(Math.abs(b1.position.x - riverCenter)).toBeGreaterThanOrEqual(3.5)
          for (let j = i + 1; j < layout.buildings.length; j++) {
            const b2 = layout.buildings[j]
            const dist3D = Math.hypot(b1.position.x - b2.position.x, b1.position.z - b2.position.z)
            const dx = Math.abs(b1.position.x - b2.position.x)
            expect(dist3D).toBeGreaterThanOrEqual(6.0)
            expect(dx).toBeGreaterThanOrEqual(1.4)
          }
        }
      }
      expect(getTerrainHeight(4, 0, biomeOpt.id)).toBeGreaterThan(0.5)
      expect(getTerrainHeight(getRiverCenterX(0), 0, biomeOpt.id)).toBeLessThan(-0.5)
      expect(getTerrainHeight(-8, -8, biomeOpt.id)).toBeGreaterThan(
        getTerrainHeight(getRiverCenterX(0), 0, biomeOpt.id) + 0.5,
      )
      expect(getTerrainHeight(30, 30, biomeOpt.id)).toBeLessThan(0)
    }
  })

  it('places submarine realm underwater, camel oasis horizontally, snowball downhill in valley, and rocket/balloon aloft', () => {
    const subLayout = computeWorldLayout([], defaultProfile.projects, 'ocean', 'submarine')
    expect(subLayout.carrier.realmOrigin.y).toBeLessThan(-20)

    const camelLayout = computeWorldLayout([], defaultProfile.projects, 'desert', 'camel')
    expect(camelLayout.carrier.realmOrigin.x).toBeGreaterThan(50)

    const snowLayout = computeWorldLayout([], defaultProfile.projects, 'snow', 'snowball')
    expect(snowLayout.carrier.realmOrigin.y).toBeLessThanOrEqual(-10)
    expect(snowLayout.carrier.realmOrigin.x).toBeGreaterThan(15)

    const rocketLayout = computeWorldLayout([], defaultProfile.projects, 'ocean', 'rocket')
    expect(rocketLayout.carrier.realmOrigin.y).toBeGreaterThan(100)
  })
})

import * as THREE from 'three'
import {
  buildBuildingGroup,
  buildCarrierAndRealm,
  buildTerrainAndFoliage,
  type TickFn,
} from '../src/scene/builders'
import { buildAmbientLife } from '../src/scene/life'
import {
  REALM_TRANSITION_DURATION,
  carrierLaunchEnvelope,
  computeSlalomWeave,
  rng,
  sampleSlopePose,
  spring,
  staggeredPopScale,
  trailSegmentUnfoldScale,
  weatherBurstIntensity,
} from '../src/scene/motion'

describe('M-003 & M-004: Directed Motion & Rich 3D Builder Contracts', () => {
  it('enforces deterministic PRNG, damped spring overshoot, 5-principle carrier envelope, and 4.4s cinematic trail unfolding', () => {
    const r1 = rng(42)
    const r2 = rng(42)
    expect(r1()).toBe(r2())
    expect(r1()).toBe(r2())

    expect(spring(0)).toBe(0)
    expect(spring(0.28, 0.68, 2.2)).toBeGreaterThan(1) // spring overshoot
    expect(spring(4.0, 0.68, 2.2)).toBeCloseTo(1, 3)

    // Principle 1: Anticipation crouch at p = 0.07
    const crouch = carrierLaunchEnvelope(0.07)
    expect(crouch.scaleY).toBeLessThan(0.9)
    expect(crouch.scaleX).toBeGreaterThan(1.08)

    // Principle 2: Takeoff stretch at p = 0.25
    const stretch = carrierLaunchEnvelope(0.25)
    expect(stretch.scaleY).toBeGreaterThan(1.12)
    expect(stretch.scaleX).toBeLessThan(0.94)
    expect(stretch.lagMoveT).toBeLessThan(stretch.moveT)

    expect(staggeredPopScale(0.02, 3, 0.065)).toBeCloseTo(0.001, 4)
    expect(staggeredPopScale(1.5, 3, 0.065)).toBeGreaterThan(0.95)

    // Round 2 Gap (c): Cinematic transition duration >= 4.0s + sequential trail unfolding + weather burst
    expect(REALM_TRANSITION_DURATION).toBeGreaterThanOrEqual(4.0)
    expect(trailSegmentUnfoldScale(0, 0, 16)).toBe(0)
    expect(trailSegmentUnfoldScale(0.32, 1, 16)).toBeGreaterThan(0.8)
    expect(trailSegmentUnfoldScale(0.32, 14, 16)).toBe(0)
    expect(trailSegmentUnfoldScale(0.95, 15, 16)).toBeGreaterThan(0.95)
    expect(weatherBurstIntensity(0)).toBe(0)
    expect(weatherBurstIntensity(0.5)).toBeGreaterThan(0.85)
  })

  it('builds rich terrain, ambient life, detailed buildings, and realms for all 4 biomes & 5 carriers', () => {
    for (const biomeOpt of BIOME_OPTIONS) {
      const palette = resolvePalette(biomeOpt.id, biomeOpt.defaultCarrier)
      const places = getActivePlaces({ ...defaultProfile, biome: biomeOpt.id, companyCount: 6 })
      const layout = computeWorldLayout(
        places,
        defaultProfile.projects,
        biomeOpt.id,
        biomeOpt.defaultCarrier,
      )
      const ticks: TickFn[] = []
      const terrain = buildTerrainAndFoliage(biomeOpt.id, palette, layout, ticks)
      expect(terrain.children.length).toBeGreaterThanOrEqual(2)
      const smoothTerrain = terrain.getObjectByName('smooth-terrain') as THREE.Mesh
      expect(smoothTerrain).toBeDefined()
      expect((smoothTerrain.material as THREE.MeshStandardMaterial).vertexColors).toBe(true)
      expect((smoothTerrain.material as THREE.MeshStandardMaterial).flatShading).toBe(false)
      expect(smoothTerrain.geometry.attributes.position.count).toBe(221 * 221)
      // Verify outer vertices of smooth-terrain are clamped to coast toe (r <= 21.5) so downhill ski run is never occluded
      const terrainPos = smoothTerrain.geometry.attributes.position
      for (let vi = 0; vi < terrainPos.count; vi += 47) {
        expect(Math.hypot(terrainPos.getX(vi), terrainPos.getZ(vi))).toBeLessThanOrEqual(23.5)
      }
      const continuousPaths = terrain.getObjectByName('continuous-paths')
      const roadMesh = terrain.getObjectByName('road-ribbon-mesh') as THREE.Mesh
      expect(continuousPaths).toBeDefined()
      expect(roadMesh).toBeDefined()
      expect((roadMesh.material as THREE.MeshStandardMaterial).flatShading).toBe(false)
      expect(roadMesh.geometry.index?.count).toBeGreaterThan(300)
      const satellites = terrain.getObjectByName('satellite-islands')
      const microScenery = terrain.getObjectByName('micro-scenery')
      const shorelineFoam = terrain.getObjectByName('shoreline-foam')
      const waterRipples = terrain.getObjectByName('water-ripples')
      expect(satellites?.children.length).toBeGreaterThanOrEqual(6)
      expect(layout.foliage.length).toBeGreaterThanOrEqual(65)
      const westSkyline = satellites?.getObjectByName('west-skyline-island')
      const westCluster = westSkyline?.getObjectByName('west-skyline-cluster') as THREE.InstancedMesh
      expect(westSkyline).toBeDefined()
      expect(westCluster?.count).toBe(18)
      expect(westSkyline?.getObjectByName('empire-spire')).toBeDefined()
      expect(westSkyline?.getObjectByName('west-statue')).toBeDefined()
      const aerialTram = satellites?.getObjectByName('aerial-tram')
      expect(aerialTram?.getObjectByName('aerial-tram-cabin')).toBeDefined()
      expect(aerialTram?.getObjectByName('tram-station-main')).toBeDefined()
      expect(aerialTram?.getObjectByName('tram-station-west')).toBeDefined()
      const grandSeaBridge = satellites?.getObjectByName('grand-sea-bridge')
      expect(grandSeaBridge).toBeDefined()
      expect(grandSeaBridge?.getObjectByName('bridge-vehicles')?.children.length).toBeGreaterThanOrEqual(2)
      const eastSkyline = satellites?.getObjectByName('east-skyline-island')
      const eastCluster = eastSkyline?.getObjectByName('east-skyline-cluster') as THREE.InstancedMesh
      expect(eastSkyline?.getObjectByName('oriental-pearl-tower')).toBeDefined()
      expect(eastSkyline?.getObjectByName('twisted-tower')).toBeDefined()
      expect(eastSkyline?.getObjectByName('bottle-opener-tower')).toBeDefined()
      expect(eastSkyline?.getObjectByName('east-airstrip')).toBeDefined()
      expect(eastSkyline?.getObjectByName('airfield-control-tower')).toBeDefined()
      expect(eastCluster?.count).toBe(14)
      expect(satellites?.getObjectByName('shuttle-ferry')).toBeDefined()
      expect(satellites?.getObjectByName('east-island-pier')).toBeDefined()
      expect(microScenery?.children.length).toBeGreaterThanOrEqual(20)
      expect(shorelineFoam?.children.length).toBeGreaterThanOrEqual(5)
      if (biomeOpt.id === 'grassland' || biomeOpt.id === 'desert') {
        expect(shorelineFoam?.visible).toBe(false)
      } else {
        expect(shorelineFoam?.visible).toBe(true)
      }
      expect(waterRipples?.children.length).toBe(32)
      const macroLandforms = terrain.getObjectByName('biome-macro-landforms')
      expect(macroLandforms).toBeDefined()
      const farWater = terrain.getObjectByName('far-water') as THREE.Mesh
      expect(farWater).toBeDefined()
      expect((farWater.material as THREE.MeshStandardMaterial).vertexColors).toBe(true)
      if (biomeOpt.id === 'grassland') {
        expect(macroLandforms?.getObjectByName('terrace-walls')).toBeDefined()
        expect(macroLandforms?.getObjectByName('pastoral-windmills')).toBeDefined()
        expect(macroLandforms?.getObjectByName('flower-meadows')).toBeDefined()
        expect(macroLandforms?.getObjectByName('pastoral-sheep')).toBeDefined()
      } else if (biomeOpt.id === 'ocean') {
        expect(macroLandforms?.getObjectByName('crescent-beach-props')).toBeDefined()
        expect(macroLandforms?.getObjectByName('coral-sea-stacks')).toBeDefined()
      } else if (biomeOpt.id === 'desert') {
        expect(macroLandforms?.getObjectByName('mesa-buttes')).toBeDefined()
        expect(macroLandforms?.getObjectByName('canyon-rock-arch')).toBeDefined()
        expect(macroLandforms?.getObjectByName('crescent-oasis-pool')).toBeDefined()
      } else if (biomeOpt.id === 'snow') {
        expect(macroLandforms?.getObjectByName('alpine-twin-peaks')).toBeDefined()
        expect(macroLandforms?.getObjectByName('ski-bowl-gates')).toBeDefined()
        expect(macroLandforms?.getObjectByName('glacial-icebergs')).toBeDefined()
        expect(getTerrainHeight(-5.6, -13.2, 'snow')).toBeGreaterThan(2.5)
        expect(getTerrainHeight(-5.6, -13.2, 'snow')).toBeGreaterThan(
          getTerrainHeight(-5.6, -13.2, 'ocean') + 0.8,
        )
      }
      const life = buildAmbientLife(biomeOpt.id, palette, layout.buildings)
      const skyClouds = life.group.getObjectByName('sky-clouds')
      expect(skyClouds?.children.length).toBe(8)
      const firstCloudPuff = skyClouds?.children[0]?.children[0] as THREE.Mesh
      expect((firstCloudPuff.material as THREE.MeshStandardMaterial).flatShading).toBe(false)

      for (const b of layout.buildings) {
        const bg = buildBuildingGroup(b, biomeOpt.id, palette, ticks)
        expect(bg.userData.pickId).toBe(b.place.id)
        expect(bg.children.length).toBeGreaterThanOrEqual(12)
        const entranceLanterns = bg.getObjectByName('entrance-lanterns')
        expect(entranceLanterns?.children.length).toBe(4)
        const roundedMesh = bg.children.find(
          (c) => (c as THREE.Mesh).geometry?.userData?.isRoundedMiniature === true,
        )
        expect(roundedMesh).toBeDefined()

        if (b.place.style === 'university') {
          expect(bg.getObjectByName('arch-gate')).toBeDefined()
        } else if (b.place.style === 'factory') {
          expect(bg.getObjectByName('chimney-smoke')?.children.length).toBe(6)
        } else if (b.place.style === 'tech') {
          expect(bg.getObjectByName('vr-headset')).toBeDefined()
          expect(bg.getObjectByName('hologram-table')).toBeDefined()
          expect(bg.getObjectByName('yellow-taxi')).toBeDefined()
        } else if (b.place.style === 'studio') {
          expect(bg.getObjectByName('speech-bubbles')?.children.length).toBe(3)
        } else if (b.place.id === 'career-2') {
          const winGrid = bg.getObjectByName('animated-window-grid') as THREE.InstancedMesh
          expect(winGrid).toBeDefined()
          expect(winGrid.count).toBe(42)
        } else if (b.place.id === 'career-4') {
          expect(bg.getObjectByName('scrolling-feed-screen')).toBeDefined()
        }
      }

      const cr = buildCarrierAndRealm(biomeOpt.defaultCarrier, palette, layout, ticks)
      expect(cr.carrierGroup.userData.pickId).toBe('__carrier__')
      expect(cr.projectMeshes.size).toBe(defaultProfile.projects.length)
      cr.updateCarrierMotion(1.25, 0.08, 1, 0.45)

      for (const fn of ticks) {
        fn(1.25, 0.016)
      }
    }

    // Verify all 37 selectable 3D building archetypes across Education (10), Landmark (10), and Career (17)
    expect(BUILDING_STYLE_OPTIONS.length).toBe(37)
    expect(BUILDING_STYLE_OPTIONS.filter((o) => o.category === 'education').length).toBe(10)
    expect(BUILDING_STYLE_OPTIONS.filter((o) => o.category === 'landmark').length).toBe(10)
    expect(BUILDING_STYLE_OPTIONS.filter((o) => o.category === 'career').length).toBe(17)

    const samplePalette = resolvePalette('ocean', 'submarine')
    const basePlaced = computeWorldLayout(
      defaultProfile.places,
      defaultProfile.projects,
      'ocean',
      'submarine',
    ).buildings[0]
    const expectedProps: Partial<Record<string, string>> = {
      'uni-gothic': 'gothic-clock',
      'uni-modern': 'solar-tracker',
      'uni-academy': 'bamboo-grove',
      'uni-observatory': 'observatory-dome',
      'uni-art-bauhaus': 'bauhaus-mobile',
      'uni-gate-palace': 'palace-paifang',
      'uni-conservatory': 'golden-harp',
      'ruc-mingde': 'ruc-motto-stone',
      'unimelb-clocktower': 'unimelb-clock',
      watertown: 'wupeng-boat',
      'coastal-town': 'coastal-beacon',
      'metro-landmark': 'metro-tv-tower',
      'b612-rose-hill': 'b612-rose-dome',
      'siheyuan-courtyard': 'siheyuan-screen',
      'mountain-stilts': 'stilts-lanterns',
      'euro-castle': 'castle-pennants',
      'tulou-roundhouse': 'tulou-ring',
      'snow-chalet-village': 'chalet-smoke',
      biotech: 'dna-helix',
      'game-arcade': 'giant-gamepad',
      'cloud-logistics': 'delivery-drone',
      'indie-lab': 'satellite-dish',
      'medical-center': 'med-helipad',
      'law-palace': 'justice-scales',
      'film-stage': 'film-clapper',
      'coffee-roastery': 'giant-coffee-cup',
      'xiaomi-park': 'xiaomi-mi-logo',
      'jd-hq': 'jd-joy-mascot',
      'bytedance-hq': 'bytedance-bars',
      'taikang-tower': 'taikang-crown',
      'cscec-tower': 'cscec-emblem',
    }
    for (const opt of BUILDING_STYLE_OPTIONS) {
      const styleTicks: TickFn[] = []
      const bg = buildBuildingGroup(
        {
          ...basePlaced,
          place: { ...basePlaced.place, id: `test-${opt.id}`, style: opt.id, kind: opt.category },
        },
        'ocean',
        samplePalette,
        styleTicks,
      )
      expect(bg.children.length).toBeGreaterThanOrEqual(8)
      expect(bg.getObjectByName('entrance-lanterns')?.children.length).toBe(4)
      const propName = expectedProps[opt.id]
      if (propName) {
        expect(bg.getObjectByName(propName)).toBeDefined()
      }
      styleTicks.forEach((fn) => fn(2.0, 0.016))
    }

    // Verify all 5 Second Realms have 96x96 sculpted vertex terrain, central hub building, radial walkways, unfolding trail, weather FX & 5 selectable project booths
    expect(PROJECT_BOOTH_OPTIONS.length).toBe(5)
    const fiveBoothProjects = PROJECT_BOOTH_OPTIONS.map((opt, idx) => ({
      id: `proj-test-${opt.id}`,
      name: `Test ${opt.label}`,
      summary: 'Booth test summary',
      boothStyle: opt.id,
      tag: `Tag ${idx}`,
    }))
    for (const carrierOpt of CARRIER_OPTIONS) {
      const palette = resolvePalette('ocean', carrierOpt.id)
      const layout = computeWorldLayout([], fiveBoothProjects, 'ocean', carrierOpt.id)
      const ticks: TickFn[] = []
      const cr = buildCarrierAndRealm(carrierOpt.id, palette, layout, ticks)
      expect(cr.realmGroup.children.length).toBeGreaterThanOrEqual(12)
      const realmTerrainMesh = cr.realmGroup.getObjectByName('realm-terrain-mesh') as THREE.Mesh
      expect(realmTerrainMesh).toBeDefined()
      expect((realmTerrainMesh.material as THREE.MeshStandardMaterial).vertexColors).toBe(true)
      expect((realmTerrainMesh.material as THREE.MeshStandardMaterial).flatShading).toBe(false)
      expect(realmTerrainMesh.geometry.attributes.position.count).toBe(97 * 97)
      const hubBuilding = cr.realmGroup.getObjectByName('realm-hub-building')
      expect(hubBuilding).toBeDefined()
      expect(hubBuilding?.children.length).toBeGreaterThanOrEqual(5)
      const walkways = cr.realmGroup.getObjectByName('realm-walkways')
      expect(walkways).toBeDefined()
      expect(walkways?.children.length).toBe(fiveBoothProjects.length)
      const trail = cr.realmGroup.getObjectByName('unfolding-trail')
      expect(trail?.children.length).toBe(17)
      const contCauseway = trail?.getObjectByName('continuous-causeway') as THREE.Mesh
      expect(contCauseway).toBeDefined()
      expect(contCauseway.geometry.attributes.position.count).toBe(49 * 4)
      cr.updateCarrierMotion(1.0, 0, 0, 0)
      expect(contCauseway.geometry.drawRange.count).toBe(0)
      cr.updateCarrierMotion(1.0, 0, 1, 0.4)
      expect(contCauseway.geometry.drawRange.count).toBeGreaterThan(180)
      expect(contCauseway.geometry.drawRange.count).toBeLessThan(864)
      cr.updateCarrierMotion(1.0, 0, 0, 0.85)
      expect(contCauseway.geometry.drawRange.count).toBe(864)
      expect(trail?.getObjectByName('causeway-deck')).toBeDefined()
      expect(cr.realmGroup.getObjectByName('transition-weather-fx')?.children.length).toBe(28)
      if (carrierOpt.id === 'submarine') {
        expect(cr.carrierGroup.getObjectByName('sub-portholes')?.children.length).toBe(12)
        expect(cr.carrierGroup.getObjectByName('dive-planes')).toBeDefined()
        expect(cr.carrierGroup.getObjectByName('propeller-shroud')).toBeDefined()
      } else if (carrierOpt.id === 'camel') {
        expect(cr.carrierGroup.getObjectByName('saddle-blanket')).toBeDefined()
        expect(cr.carrierGroup.getObjectByName('camel-lantern')).toBeDefined()
        expect(cr.carrierGroup.getObjectByName('neck-pivot')).toBeDefined()
        expect(cr.carrierGroup.getObjectByName('camel-torso')).toBeDefined()
        expect(cr.realmGroup.getObjectByName('oasis-landing-plaza')).toBeDefined()
        const legFl = cr.carrierGroup.getObjectByName('leg-fl')
        const legFr = cr.carrierGroup.getObjectByName('leg-fr')
        const legBl = cr.carrierGroup.getObjectByName('leg-bl')
        const legBr = cr.carrierGroup.getObjectByName('leg-br')
        expect(legFl?.getObjectByName('knee-joint')).toBeDefined()
        expect(legFr?.getObjectByName('knee-joint')).toBeDefined()
        expect(legBl?.getObjectByName('knee-joint')).toBeDefined()
        expect(legBr?.getObjectByName('knee-joint')).toBeDefined()
        cr.updateCarrierMotion(0.25, 0, 1, 0.5)
        expect(Math.abs(legFl!.rotation.z)).toBeGreaterThan(0.1)
        expect(legFl!.rotation.z * legFr!.rotation.z).toBeLessThan(0)
        expect(legFl!.rotation.z * legBr!.rotation.z).toBeGreaterThan(0)
      } else if (carrierOpt.id === 'snowball') {
        expect(cr.carrierGroup.getObjectByName('snowman-skis')).toBeDefined()
        expect(cr.carrierGroup.getObjectByName('ski-goggles')).toBeDefined()
        expect(cr.carrierGroup.getObjectByName('fluttering-scarf')).toBeDefined()
        expect(cr.carrierGroup.getObjectByName('pole-left')).toBeDefined()
        expect(cr.carrierGroup.getObjectByName('pole-right')).toBeDefined()
        expect(cr.carrierGroup.getObjectByName('ski-snow-spray')?.children.length).toBe(10)
        expect(cr.realmGroup.getObjectByName('ski-slope')).toBeDefined()
        expect(cr.realmGroup.getObjectByName('nordic-ski-lodge')).toBeDefined()
        expect(cr.realmGroup.getObjectByName('alpine-string-lights')?.children.length).toBe(6)
        expect(cr.realmGroup.getObjectByName('hotspring-pool')).toBeDefined()
        expect(cr.realmGroup.getObjectByName('hotspring-rocks')).toBeDefined()
        expect(cr.realmGroup.getObjectByName('hotspring-steam')?.children.length).toBe(6)
        expect(cr.realmGroup.getObjectByName('aurora-crystal-arch')).toBeDefined()
        expect(cr.realmGroup.getObjectByName('realm-pine-forest')?.children.length).toBe(20)
      } else if (carrierOpt.id === 'rocket') {
        expect(cr.carrierGroup.getObjectByName('interstage-ring')).toBeDefined()
        expect(cr.carrierGroup.getObjectByName('rocket-portholes')).toBeDefined()
        expect(cr.carrierGroup.getObjectByName('booster-pods')).toBeDefined()
        expect(cr.carrierGroup.getObjectByName('thruster-plume')).toBeDefined()
        cr.updateCarrierMotion(1.0, 0, 1, 0.5)
        expect(contCauseway.visible).toBe(false)
        cr.updateCarrierMotion(1.0, 0, 0, 1.0)
        expect(contCauseway.visible).toBe(false)
        expect(cr.realmGroup.getObjectByName('transition-weather-fx')?.visible).toBe(false)
      } else if (carrierOpt.id === 'balloon') {
        expect(cr.carrierGroup.getObjectByName('balloon-gores')?.children.length).toBe(12)
        expect(cr.carrierGroup.getObjectByName('burner-flame')).toBeDefined()
        expect(cr.carrierGroup.getObjectByName('sandbags')?.children.length).toBe(4)
        expect(cr.realmGroup.getObjectByName('b612-rose-dome')).toBeDefined()
        expect(cr.realmGroup.getObjectByName('b612-volcano')).toBeDefined()
        expect(cr.realmGroup.getObjectByName('baobab-saplings')?.children.length).toBe(3)
        expect(cr.realmGroup.getObjectByName('b612-fox-bench')).toBeDefined()
        expect(cr.realmGroup.getObjectByName('b612-star-ring')).toBeDefined()
        cr.updateCarrierMotion(1.0, 0, 1, 0.5)
        expect(contCauseway.visible).toBe(false)
        cr.updateCarrierMotion(1.0, 0, 0, 1.0)
        expect(contCauseway.visible).toBe(false)
        expect(cr.realmGroup.getObjectByName('transition-weather-fx')?.visible).toBe(false)
      }
      for (const opt of PROJECT_BOOTH_OPTIONS) {
        const projGroup = cr.projectMeshes.get(`proj-test-${opt.id}`)
        expect(projGroup).toBeDefined()
        const showcase = projGroup?.getObjectByName(`realm-showcase-${carrierOpt.id}`)
        expect(showcase).toBeDefined()
        expect(showcase?.children.length).toBeGreaterThanOrEqual(5)
        const booth = projGroup?.getObjectByName(`project-booth-${opt.id}`)
        expect(booth).toBeDefined()
        expect(booth?.children.length).toBeGreaterThanOrEqual(4)
      }
    }

    expect(computeSlalomWeave(0).lateralX).toBe(0)
    expect(computeSlalomWeave(1).lateralX).toBe(0)
    const slalomTurn1 = computeSlalomWeave(0.15)
    const slalomTurn2 = computeSlalomWeave(0.38)
    expect(slalomTurn1.lateralX).toBeGreaterThan(0.4)
    expect(slalomTurn1.rollZ).toBeLessThan(-0.08)
    expect(slalomTurn2.lateralX).toBeLessThan(-0.4)
    expect(slalomTurn2.rollZ).toBeGreaterThan(0.08)

    // Ground-clamped slope-normal physics contract (sampleSlopePose)
    const snowPoseMid = sampleSlopePose(
      0.5,
      { x: 11.2, y: 1.4, z: 9.8 },
      { x: 26, y: -16, z: 32 },
      'snowball',
    )
    expect(snowPoseMid.pitchX).toBeGreaterThan(0.28)
    const camelPoseClimb = sampleSlopePose(
      0.22,
      { x: 13.8, y: 0.7, z: 2.2 },
      { x: 64, y: 0.6, z: 4 },
      'camel',
    )
    const camelPoseDesc = sampleSlopePose(
      0.78,
      { x: 13.8, y: 0.7, z: 2.2 },
      { x: 64, y: 0.6, z: 4 },
      'camel',
    )
    expect(camelPoseClimb.pitchX).toBeLessThan(0)
    expect(camelPoseDesc.pitchX).toBeGreaterThan(0)
  })

  it('pins forward heading alignment (dot > 0.98) and zero-clipping clearance from all islands across t in [0, 40]', () => {
    for (const biome of ['desert', 'ocean', 'grassland'] as const) {
      const palette = resolvePalette(biome, biome === 'desert' ? 'camel' : 'submarine')
      const life = buildAmbientLife(biome, palette, [])
      const birdsGroup = life.group.children[0]
      const vehicleGroup = life.group.children[1]
      const biplaneGroup = life.group.getObjectByName('biplane')!
      const secondaryBirdsGroup = life.group.getObjectByName('secondary-birds')!
      expect(biplaneGroup).toBeDefined()
      expect(secondaryBirdsGroup).toBeDefined()
      if (biome === 'ocean') {
        expect(life.group.getObjectByName('sailboat-fleet')).toBeDefined()
      } else if (biome === 'grassland') {
        expect(life.group.getObjectByName('pastoral-tractor')).toBeDefined()
      } else if (biome === 'desert') {
        expect(life.group.getObjectByName('desert-caravan')?.children.length).toBe(12)
      }

      for (const target of [birdsGroup, vehicleGroup, biplaneGroup, secondaryBirdsGroup]) {
        life.update(2.0)
        const p0 = target.position.clone()
        const forward = new THREE.Vector3(1, 0, 0)
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), target.rotation.y)
          .setY(0)
          .normalize()

        life.update(2.05)
        const p1 = target.position.clone()
        const vel = p1.sub(p0).setY(0).normalize()

        expect(forward.dot(vel)).toBeGreaterThan(0.98)
      }

      // Zero-Clipping Contract: sailboat, pastoral tractor & desert camel caravan never clip main island or any satellite island across t = 0..40
      for (let t = 0; t <= 40; t += 0.5) {
        life.update(t)
        const vx = vehicleGroup.position.x
        const vz = vehicleGroup.position.z
        expect(Math.hypot(vx, vz)).toBeGreaterThanOrEqual(28.0)
        expect(Math.hypot(vx - -21.8, vz - -4.8)).toBeGreaterThanOrEqual(6.8)
        expect(Math.hypot(vx - 18.8, vz - -13.2)).toBeGreaterThanOrEqual(6.5)
        expect(Math.hypot(vx - -22.2, vz - 14.2)).toBeGreaterThanOrEqual(4.6)
      }
    }
  })

  it('enforces warm-key / cool-fill lighting contrast, tight shadow frustum, and dark-sky realm detection', async () => {
    const { computeLightingRig } = await import('../src/scene/world')
    for (const biomeOpt of BIOME_OPTIONS) {
      const groundRig = computeLightingRig(biomeOpt.id, biomeOpt.defaultCarrier, 0)
      // Key-to-fill ratio >= 3.0 prevents flat washed-out overexposure
      expect(groundRig.sunIntensity / groundRig.hemiIntensity).toBeGreaterThanOrEqual(3.0)
      // Tight shadow frustum & normalBias for crisp miniature shadows
      expect(groundRig.shadowFrustumHalfSize).toBeLessThanOrEqual(24)
      expect(groundRig.shadowNormalBias).toBeGreaterThanOrEqual(0.01)
      expect(groundRig.isDarkSky).toBe(false)
    }

    // Dark-sky Second Realms (submarine, snowball, rocket) vs Light-sky Realms (camel, balloon)
    expect(computeLightingRig('ocean', 'submarine', 1).isDarkSky).toBe(true)
    expect(computeLightingRig('snow', 'snowball', 1).isDarkSky).toBe(true)
    expect(computeLightingRig('grassland', 'rocket', 1).isDarkSky).toBe(true)
    expect(computeLightingRig('desert', 'camel', 1).isDarkSky).toBe(false)
    expect(computeLightingRig('ocean', 'balloon', 1).isDarkSky).toBe(false)

    // Editorial camera framing (setViewOffset): -12% on desktop default, +13% when drawer opens, 0% in Sims Build Mode, disabled on mobile
    const { computeCameraViewOffset, computeAuditCameraPose } = await import('../src/scene/world')
    const desktopDefault = computeCameraViewOffset(1440, 900, false)
    expect(desktopDefault.enabled).toBe(true)
    expect(desktopDefault.ratio).toBeCloseTo(-0.12, 3)
    expect(desktopDefault.offsetX).toBe(Math.round(-0.12 * 1440))

    const desktopDrawer = computeCameraViewOffset(1440, 900, true)
    expect(desktopDrawer.enabled).toBe(true)
    expect(desktopDrawer.ratio).toBeCloseTo(0.13, 3)
    expect(desktopDrawer.offsetX).toBe(Math.round(0.13 * 1440))

    const desktopBuildMode = computeCameraViewOffset(1440, 900, true, true)
    expect(desktopBuildMode.enabled).toBe(true)
    expect(desktopBuildMode.ratio).toBe(0)
    expect(desktopBuildMode.offsetX).toBe(0)

    const mobile = computeCameraViewOffset(390, 844, false)
    expect(mobile.enabled).toBe(false)
    expect(mobile.offsetX).toBe(0)

    const mobileLandscape = computeCameraViewOffset(844, 390, false)
    expect(mobileLandscape.enabled).toBe(false)
    expect(mobileLandscape.offsetX).toBe(0)

    const immersiveFullscreen = computeCameraViewOffset(1440, 900, false, false, true)
    expect(immersiveFullscreen.enabled).toBe(false)
    expect(immersiveFullscreen.offsetX).toBe(0)

    // Multi-camera visual blind-audit harness (?cam=overview|closeup|side|realm)
    const rPos = { x: 0, y: 120, z: 32 }
    const rTar = { x: 0, y: 100, z: 0 }
    expect(computeAuditCameraPose(null, rPos, rTar)).toBeNull()
    const auditOverview = computeAuditCameraPose('overview', rPos, rTar)
    const auditCloseup = computeAuditCameraPose('closeup', rPos, rTar)
    const auditSide = computeAuditCameraPose('side', rPos, rTar)
    const auditRealm = computeAuditCameraPose('realm', rPos, rTar)
    expect(auditOverview?.pos.z).toBeCloseTo(44.5, 2)
    expect(auditCloseup?.pos.z).toBeCloseTo(21.5, 2)
    expect(auditSide?.pos.x).toBeLessThan(-30)
    expect(auditRealm?.forceRealm).toBe(true)
    expect(auditRealm?.pos.y).toBe(120)

    // Round 6 Gap (a): 3-mode Time-of-Day atmosphere ('day' | 'sunset' | 'night') & 3D starfield
    const { TIME_OF_DAY_OPTIONS } = await import('../src/schema/profile')
    const { buildStarfieldGroup } = await import('../src/scene/world')
    expect(TIME_OF_DAY_OPTIONS.map((o: { id: string }) => o.id)).toEqual(['day', 'sunset', 'night'])
    const patchedSunset = applyProfilePatch(defaultProfile, { timeOfDay: 'sunset' })
    expect(patchedSunset.timeOfDay).toBe('sunset')

    const dayRig = computeLightingRig('ocean', 'submarine', 0, 'day')
    const sunsetRig = computeLightingRig('ocean', 'submarine', 0, 'sunset')
    const nightRig = computeLightingRig('ocean', 'submarine', 0, 'night')

    expect(dayRig.isDarkSky).toBe(false)
    expect(dayRig.emissiveBoost).toBeCloseTo(1.0, 2)
    expect(dayRig.starfieldOpacity).toBe(0)
    expect(dayRig.sunPosition.y).toBeGreaterThanOrEqual(34)

    // 44th Sunset: low-angle golden sunlight, warm emissive boost, twilight stars emerging
    expect(sunsetRig.sunPosition.y).toBeLessThan(22)
    expect(sunsetRig.emissiveBoost).toBeGreaterThan(1.5)
    expect(sunsetRig.starfieldOpacity).toBeGreaterThan(0.25)

    // Starry Night: dark sky on ground level, strong warm window emissive boost, full starfield
    expect(nightRig.isDarkSky).toBe(true)
    expect(nightRig.emissiveBoost).toBeGreaterThan(2.2)
    expect(nightRig.starfieldOpacity).toBeGreaterThan(0.85)

    const starGroup = buildStarfieldGroup()
    expect(starGroup.name).toBe('night-starfield')
    expect(starGroup.getObjectByName('celestial-stars')).toBeDefined()
    expect(starGroup.getObjectByName('island-fireflies')).toBeDefined()
  })

  it('builds 6 distinct non-disc multi-silhouette world topologies and 6 customizable non-circular satellite outposts', async () => {
    expect(WORLD_SHAPE_OPTIONS).toHaveLength(6)
    expect(SATELLITE_THEME_OPTIONS).toHaveLength(6)

    // Verify coast radius breaks the uniform oval disc with > 4.5u bay-to-headland spread on every silhouette
    for (const shapeOpt of WORLD_SHAPE_OPTIONS) {
      let minCoast = Infinity
      let maxCoast = -Infinity
      for (let i = 0; i < 64; i++) {
        const angle = (i / 64) * Math.PI * 2
        const r = getCoastRadius(angle, 'ocean', shapeOpt.id)
        minCoast = Math.min(minCoast, r)
        maxCoast = Math.max(maxCoast, r)
      }
      expect(maxCoast - minCoast).toBeGreaterThanOrEqual(4.5)
    }

    const palette = resolvePalette('ocean', 'submarine')
    const places = getActivePlaces(defaultProfile)

    // Verify bespoke 3D silhouette landmarks for each WorldShapeType
    const expectedFeatures: Record<string, string[]> = {
      archipelago: ['archipelago-coral-keys', 'archipelago-boardwalks'],
      'b612-highland': [
        'b612-terrain-boulders',
        'b612-mini-volcano',
        'b612-planetary-ring',
        'b612-fox-bench',
        'b612-baobab-saplings',
      ],
      'canyon-mesa': ['canyon-monoliths'],
      'alpine-valley': ['alpine-ridge-crest', 'alpine-overlook-chalet'],
      'crescent-bay': ['crescent-cape-lighthouse', 'crescent-bay-boardwalk', 'crescent-bay-sailboats'],
      'floating-terraces': ['terrace-ark-walls', 'terrace-grand-stairs', 'terrace-sky-waterfall'],
    }
    for (const shapeOpt of WORLD_SHAPE_OPTIONS) {
      const layout = computeWorldLayout(places, defaultProfile.projects, 'ocean', 'submarine', shapeOpt.id)
      const ticks: TickFn[] = []
      const terrain = buildTerrainAndFoliage('ocean', palette, layout, ticks)
      const shapeGroup = terrain.getObjectByName('world-shape-features')
      expect(shapeGroup).toBeDefined()
      for (const featName of expectedFeatures[shapeOpt.id]) {
        expect(shapeGroup?.getObjectByName(featName)).toBeDefined()
      }
    }

    // Verify customizable satellite outposts (including B612 observatory, windmill ranch, and hidden slot)
    const customLayout = computeWorldLayout(places, defaultProfile.projects, 'ocean', 'submarine', 'b612-highland')
    const customTerrain = buildTerrainAndFoliage('ocean', palette, customLayout, [], [
      'b612-observatory',
      'windmill-ranch',
      'hidden',
    ])
    const satGroup = customTerrain.getObjectByName('satellite-islands')!
    const westIsle = satGroup.getObjectByName('west-skyline-island')!
    const eastIsle = satGroup.getObjectByName('east-skyline-island')!
    const swIsle = satGroup.getObjectByName('sw-reef-island')!
    expect(westIsle.getObjectByName('satellite-organic-base')).toBeDefined()
    expect(westIsle.getObjectByName('satellite-theme-b612-observatory')).toBeDefined()
    expect(eastIsle.getObjectByName('satellite-theme-windmill-ranch')).toBeDefined()
    expect(swIsle.visible).toBe(false)

    // Round 6 Gap (b): True Interior Topology & Adaptive Building Layouts per worldShape
    // 1. b612-highland has NO central river canal—center is a high domed summit (y >= 2.8) with landmark at crown
    expect(getTerrainHeight(0, -2.4, 'ocean', 'b612-highland')).toBeGreaterThanOrEqual(2.8)
    expect(getTerrainHeight(getRiverCenterX(0), 0, 'ocean', 'archipelago')).toBeLessThan(-0.3)
    expect(getTerrainHeight(2.2, 3.8, 'ocean', 'crescent-bay')).toBeLessThan(-0.3)

    const b612Landmark = customLayout.buildings.find((b) => b.place.kind === 'landmark')!
    expect(Math.hypot(b612Landmark.position.x, b612Landmark.position.z + 2.4)).toBeLessThan(2.0)
    expect(b612Landmark.position.y).toBeGreaterThanOrEqual(2.8)
    expect(customTerrain.getObjectByName('b612-spiral-path')).toBeDefined()
    expect(customTerrain.getObjectByName('river-bridge')?.visible).toBe(false)
    expect(customTerrain.getObjectByName('river-flow')?.visible).toBe(false)
    expect(customTerrain.getObjectByName('mid-water')?.visible).toBe(false)

    // 2. canyon-mesa has stepped plateau tiers (building elevation spread >= 1.1), timber suspension bridge & Camel Oasis clearance
    const canyonLayout = computeWorldLayout(places, defaultProfile.projects, 'desert', 'camel', 'canyon-mesa')
    const canyonTerrain = buildTerrainAndFoliage('desert', palette, canyonLayout, [])
    expect(canyonTerrain.getObjectByName('canyon-suspension-bridge')).toBeDefined()
    const canyonYs = canyonLayout.buildings.map((b) => b.position.y)
    expect(Math.max(...canyonYs) - Math.min(...canyonYs)).toBeGreaterThanOrEqual(1.1)

    // Verify desert far-water never submerges the Camel Oasis Second Realm around (85, 0)
    const desertFarWater = canyonTerrain.getObjectByName('far-water') as THREE.Mesh
    const fwPos = desertFarWater.geometry.attributes.position
    for (let i = 0; i < fwPos.count; i++) {
      const fx = fwPos.getX(i)
      const fz = fwPos.getZ(i)
      if (Math.hypot(fx - 85, fz) < 20) {
        expect(fwPos.getY(i)).toBeLessThanOrEqual(-0.5)
      }
    }

    // 3. alpine-valley has a central mirror tarn lake & horseshoe ridge building layout
    const alpineLayout = computeWorldLayout(places, defaultProfile.projects, 'snow', 'snowball', 'alpine-valley')
    const alpineTerrain = buildTerrainAndFoliage('snow', palette, alpineLayout, [])
    expect(alpineTerrain.getObjectByName('alpine-central-lake')).toBeDefined()
    for (const b of alpineLayout.buildings) {
      expect(Math.hypot(b.position.x, b.position.z - 1.0)).toBeGreaterThanOrEqual(5.8)
    }

    // Round 6 Gap (c): Natural S-Curve Mountain Ski Trail & Desert Dune Causeway Embankments
    const snowRealmBuilt = buildCarrierAndRealm(
      'snowball',
      resolvePalette('snow', 'snowball'),
      alpineLayout,
      [],
    )
    const skiShoulders = snowRealmBuilt.realmGroup.getObjectByName('ski-slope-shoulders')
    const skiTrailPines = snowRealmBuilt.realmGroup.getObjectByName('ski-trail-pines')
    const skiFinishArch = snowRealmBuilt.realmGroup.getObjectByName('ski-finish-arch')
    expect(skiShoulders).toBeDefined()
    expect(skiShoulders!.children.length).toBeGreaterThanOrEqual(12)
    expect(skiTrailPines).toBeDefined()
    expect(skiTrailPines!.children.length).toBeGreaterThanOrEqual(10)
    expect(skiFinishArch).toBeDefined()

    const camelRealmBuilt = buildCarrierAndRealm(
      'camel',
      resolvePalette('desert', 'camel'),
      canyonLayout,
      [],
    )
    const camelDuneCauseway = camelRealmBuilt.realmGroup.getObjectByName('camel-dune-causeway')
    expect(camelDuneCauseway).toBeDefined()
    expect(camelDuneCauseway!.children.length).toBeGreaterThanOrEqual(12)

    // Round 6 Gap (d): Sims Builder Depth: Building Rotation, Slot Swapping & Placeable Island Decor Props
    expect(DECOR_PROP_OPTIONS.map((d) => d.id)).toEqual([
      'b612-rose',
      'fox-bench',
      'cherry-grove',
      'campfire-tent',
      'dutch-windmill',
      'pet-corgi',
    ])

    const rotatedProfile = rotatePlaceInProfile(defaultProfile, 'career-1', Math.PI / 2)
    const rotatedLayout = computeWorldLayout(
      getActivePlaces(rotatedProfile),
      rotatedProfile.projects,
      rotatedProfile.biome,
      rotatedProfile.carrier,
    )
    const baseCareer1 = computeWorldLayout(
      getActivePlaces(defaultProfile),
      defaultProfile.projects,
      defaultProfile.biome,
      defaultProfile.carrier,
    ).buildings.find((b) => b.place.id === 'career-1')!
    const rotCareer1 = rotatedLayout.buildings.find((b) => b.place.id === 'career-1')!
    expect(rotCareer1.rotationY).toBeCloseTo(baseCareer1.rotationY + Math.PI / 2, 4)

    const swappedProfile = swapPlaceOrderInProfile(defaultProfile, 'career-1', 1)
    const swappedCareers = getActivePlaces(swappedProfile).filter((p) => p.kind === 'career')
    expect(swappedCareers[0].id).toBe('career-2')
    expect(swappedCareers[1].id).toBe('career-1')

    let decorProfile = toggleDecorPropInProfile(defaultProfile, 'b612-rose')
    decorProfile = toggleDecorPropInProfile(decorProfile, 'pet-corgi')
    expect(decorProfile.decorProps).toEqual(['b612-rose', 'pet-corgi'])

    const decorTicks: TickFn[] = []
    const decorTerrain = buildTerrainAndFoliage(
      'ocean',
      palette,
      rotatedLayout,
      decorTicks,
      undefined,
      decorProfile.decorProps,
    )
    const decorGroup = decorTerrain.getObjectByName('island-decor-props')
    expect(decorGroup).toBeDefined()
    expect(decorGroup?.getObjectByName('decor-prop-b612-rose')).toBeDefined()
    expect(decorGroup?.getObjectByName('decor-prop-pet-corgi')).toBeDefined()

    // Round 6 Gap (e): Personal Homepage Product Closure — #island=<base64url> Share Hash Round-Trip
    const customShareProfile = applyProfilePatch(decorProfile, {
      name: 'B-612 Little Prince',
      tagline: '第 44 次日落与玫瑰星球',
      biome: 'grassland',
      carrier: 'balloon',
      timeOfDay: 'sunset',
      worldShape: 'b612-highland',
      places: rotatedProfile.places,
    })
    const shareHash = encodeProfileShareHash(customShareProfile)
    expect(shareHash.startsWith('#island=')).toBe(true)
    const decodedShare = decodeProfileShareHash(shareHash, defaultProfile)
    expect(decodedShare).not.toBeNull()
    expect(decodedShare?.name).toBe('B-612 Little Prince')
    expect(decodedShare?.tagline).toBe('第 44 次日落与玫瑰星球')
    expect(decodedShare?.timeOfDay).toBe('sunset')
    expect(decodedShare?.worldShape).toBe('b612-highland')
    expect(decodedShare?.decorProps).toEqual(['b612-rose', 'pet-corgi'])
    expect( decodedShare?.places.find((p) => p.id === 'career-1')?.rotationOffset).toBeCloseTo(
      Math.PI / 2,
      4,
    )
    expect(decodeProfileShareHash('#/career-1', defaultProfile)).toBeNull()

    // Round 8 Gap (a): Break the Single Round Disc in ALL 5 Second Realms
    const { getRealmCoastRadius } = await import('../src/scene/realms')
    const expectedRealmLandmarks: Record<string, string[]> = {
      balloon: ['sky-arch-bridges', 'east-windmill-isle'],
      submarine: ['abyssal-hydro-vents', 'sunken-ship-bow'],
      rocket: ['orbital-docking-arms', 'orbital-comm-array'],
      camel: ['oasis-canyon-cliffs', 'oasis-bazaar-stalls'],
      snowball: ['valley-gondola-station'],
    }
    for (const cOpt of CARRIER_OPTIONS) {
      let minR = Infinity
      let maxR = -Infinity
      for (let i = 0; i < 64; i++) {
        const ang = (i / 64) * Math.PI * 2
        const rr = getRealmCoastRadius(ang, cOpt.id)
        minR = Math.min(minR, rr)
        maxR = Math.max(maxR, rr)
      }
      expect(maxR - minR).toBeGreaterThanOrEqual(4.5)

      const rLayout = computeWorldLayout(places, defaultProfile.projects, 'ocean', cOpt.id)
      const rBuilt = buildCarrierAndRealm(cOpt.id, resolvePalette('ocean', cOpt.id), rLayout, [])
      for (const landmarkName of expectedRealmLandmarks[cOpt.id]) {
        expect(rBuilt.realmGroup.getObjectByName(landmarkName)).toBeDefined()
      }
    }

    // Round 8 Gap (b): Sims Builder 3.0 — Building Color/Roof Swatches (tintPreset), 8-Directional Fine Nudging (offsetX, offsetZ) & Scale Toggle
    const {
      BUILDING_TINT_OPTIONS,
      nudgePlaceInProfile,
      setPlaceScaleInProfile,
      setPlaceTintInProfile,
    } = await import('../src/schema/profile')
    const { buildDetailedBuilding } = await import('../src/scene/buildings')

    expect(BUILDING_TINT_OPTIONS.map((t: { id: string }) => t.id)).toEqual([
      'default',
      'sakura',
      'mint',
      'amber',
      'cyber',
      'nordic',
    ])

    let sims3Profile = setPlaceTintInProfile(defaultProfile, 'career-1', 'sakura')
    sims3Profile = nudgePlaceInProfile(sims3Profile, 'career-1', 1.2, -0.8)
    sims3Profile = setPlaceScaleInProfile(sims3Profile, 'career-1', 1.15)

    const c1 = sims3Profile.places.find((p) => p.id === 'career-1')!
    expect(c1.tintPreset).toBe('sakura')
    expect(c1.offsetX).toBeCloseTo(1.2, 3)
    expect(c1.offsetZ).toBeCloseTo(-0.8, 3)
    expect(c1.buildingScale).toBeCloseTo(1.15, 3)

    // Verify clamping to [-2.0, 2.0] and reset
    const clampedNudge = nudgePlaceInProfile(sims3Profile, 'career-1', 5.0, -5.0).places.find(
      (p) => p.id === 'career-1',
    )!
    expect(clampedNudge.offsetX).toBe(2.0)
    expect(clampedNudge.offsetZ).toBe(-2.0)
    const resetNudge = nudgePlaceInProfile(sims3Profile, 'career-1', 0, 0, true).places.find(
      (p) => p.id === 'career-1',
    )!
    expect(resetNudge.offsetX).toBe(0)
    expect(resetNudge.offsetZ).toBe(0)

    // Verify layout position nudging + automatic terrain height re-clamping + 3D building scale & tintPreset
    const sims3Layout = computeWorldLayout(
      getActivePlaces(sims3Profile),
      sims3Profile.projects,
      'grassland',
      'balloon',
      'b612-highland',
    )
    const baseB612Layout = computeWorldLayout(
      getActivePlaces(defaultProfile),
      defaultProfile.projects,
      'grassland',
      'balloon',
      'b612-highland',
    )
    const nudgedCareer1 = sims3Layout.buildings.find((b) => b.place.id === 'career-1')!
    const origCareer1 = baseB612Layout.buildings.find((b) => b.place.id === 'career-1')!
    expect(nudgedCareer1.position.x).toBeCloseTo(origCareer1.position.x + 1.2, 3)
    expect(nudgedCareer1.position.z).toBeCloseTo(origCareer1.position.z - 0.8, 3)
    expect(nudgedCareer1.position.y).toBeCloseTo(
      Math.max(0.28, getTerrainHeight(nudgedCareer1.position.x, nudgedCareer1.position.z, 'grassland', 'b612-highland')),
      3,
    )

    const builtTinted = buildDetailedBuilding(nudgedCareer1, 'grassland', palette)
    expect(builtTinted.group.userData.tintPreset).toBe('sakura')
    expect(builtTinted.group.scale.x).toBeCloseTo(1.15, 3)

    // Round 8 Gap (c): Dynamic 3D Weather & Living Particle Ecosystem
    const { WEATHER_OPTIONS } = await import('../src/schema/profile')
    const { buildWeatherParticlesGroup, computeGuidedTourStopList } = await import('../src/scene/world')
    expect(WEATHER_OPTIONS.map((w: { id: string }) => w.id)).toEqual([
      'clear',
      'sakura',
      'snowfall',
      'meteor',
      'fireflies',
    ])
    const sakuraProfile = applyProfilePatch(defaultProfile, { weather: 'sakura' })
    expect(sakuraProfile.weather).toBe('sakura')
    for (const wId of ['sakura', 'snowfall', 'meteor', 'fireflies'] as const) {
      const wGroup = buildWeatherParticlesGroup(wId)
      expect(wGroup.name).toBe('weather-particles')
      expect(wGroup.getObjectByName(`weather-${wId}`)).toBeDefined()
      expect(wGroup.getObjectByName(`weather-${wId}`)!.children.length).toBeGreaterThanOrEqual(8)
    }

    // Round 8 Gap (d): One-Click Guided Story Tour (`computeGuidedTourStopList`)
    const tourStops = computeGuidedTourStopList(defaultProfile)
    expect(tourStops.length).toBeGreaterThanOrEqual(7)
    expect(tourStops[0].id).toBeNull()
    expect(tourStops[0].level).toBe('ground')
    expect(tourStops.some((s: { id: string | null }) => s.id === 'hometown-pagoda')).toBe(true)
    expect(tourStops.some((s: { id: string | null }) => s.id === 'university')).toBe(true)
    expect(tourStops.some((s: { level: string }) => s.level === 'realm')).toBe(true)
    expect(tourStops[tourStops.length - 1].id).toBeNull()
    expect(tourStops[tourStops.length - 1].level).toBe('ground')

    // Round 8 Gap (e): Full-Matrix Zero-Clipping & Terrain-Clearance Contract Suite across 6 worldShapes × 4 biomes × 5 carriers
    for (const shapeOpt of WORLD_SHAPE_OPTIONS) {
      for (const biomeOpt of BIOME_OPTIONS) {
        const mLayout = computeWorldLayout(
          places,
          defaultProfile.projects,
          biomeOpt.id,
          biomeOpt.defaultCarrier,
          shapeOpt.id,
        )
        // 1. Every building rests at or above local terrain height (zero terrain burial)
        for (const b of mLayout.buildings) {
          const groundY = getTerrainHeight(b.position.x, b.position.z, biomeOpt.id, shapeOpt.id)
          expect(b.position.y).toBeGreaterThanOrEqual(groundY - 0.01)
          expect(b.position.y).toBeGreaterThanOrEqual(0.28)
        }
        // 2. Pairwise 2D distance between any two buildings is >= 3.8u (zero building overlap)
        for (let i = 0; i < mLayout.buildings.length; i++) {
          for (let j = i + 1; j < mLayout.buildings.length; j++) {
            const bi = mLayout.buildings[i].position
            const bj = mLayout.buildings[j].position
            expect(Math.hypot(bi.x - bj.x, bi.z - bj.z)).toBeGreaterThanOrEqual(3.8)
          }
        }
        // 3. Carrier homePosition is never buried below local terrain
        const ch = mLayout.carrier.homePosition
        const cGround = getTerrainHeight(ch.x, ch.z, biomeOpt.id, shapeOpt.id)
        expect(ch.y).toBeGreaterThanOrEqual(cGround - 0.9)

        // 4. Submarine harbor berth & seaward dive trajectory maintain strict zero-clipping clearance from the island & dock
        const subPlacement = computeCarrierPlacement('submarine', biomeOpt.id, shapeOpt.id)
        const subR = Math.hypot(subPlacement.homePosition.x, subPlacement.homePosition.z)
        const subCoastR = getCoastRadius(
          Math.atan2(subPlacement.homePosition.z, subPlacement.homePosition.x),
          biomeOpt.id,
          shapeOpt.id,
        )
        expect(subPlacement.homePosition.z).toBeGreaterThanOrEqual(17.0)
        expect(subR).toBeGreaterThan(subCoastR + 1.8)
        for (const u of [0.05, 0.12, 0.2, 0.3, 0.4]) {
          const divePose = sampleSlopePose(
            u,
            subPlacement.homePosition,
            subPlacement.realmOrigin,
            'submarine',
          )
          // While above y = -18, submarine stays seaward at z >= 16.5 (never cuts northward into the island skirt!)
          if (divePose.y > -18) {
            expect(divePose.z).toBeGreaterThanOrEqual(16.5)
          }
        }
      }
    }

    // Round 9 Gap (a): Living Water Shorelines, Foliage Wind-Sway & Soft Contact Grounding
    const { updateFoliageWindSway } = await import('../src/scene/world')
    const { buildRichTerrain } = await import('../src/scene/terrain')
    const oceanArchLayout = computeWorldLayout(
      places,
      defaultProfile.projects,
      'ocean',
      'submarine',
      'archipelago',
    )
    const r9OceanTerrain = buildRichTerrain(
      'ocean',
      palette,
      oceanArchLayout.foliage,
      oceanArchLayout.buildings,
      'archipelago',
      undefined,
      ['cherry-grove', 'dutch-windmill'],
    )
    const animFoam = r9OceanTerrain.group.getObjectByName('animated-shoreline-foam')
    const shimmerGlints = r9OceanTerrain.group.getObjectByName('water-shimmer-glints')
    expect(animFoam).toBeDefined()
    expect(animFoam!.children.length).toBeGreaterThanOrEqual(3)
    expect(shimmerGlints).toBeDefined()
    expect(shimmerGlints!.children.length).toBeGreaterThanOrEqual(24)

    r9OceanTerrain.update(0.5)
    const foamScaleT0 = animFoam!.children[0].scale.x
    r9OceanTerrain.update(1.4)
    const foamScaleT1 = animFoam!.children[0].scale.x
    expect(Math.abs(foamScaleT1 - foamScaleT0)).toBeGreaterThan(0.002)

    // Soft Contact Grounding (`contact-grounding-disc`) on buildings and satellite outposts
    const sampleBuilding = buildDetailedBuilding(oceanArchLayout.buildings[0], 'ocean', palette)
    expect(sampleBuilding.group.getObjectByName('contact-grounding-disc')).toBeDefined()
    expect(sampleBuilding.group.getObjectByName('grounding-skirt')).toBeDefined()
    const r9SatGroup = r9OceanTerrain.group.getObjectByName('satellite-islands')!
    let satGroundingCount = 0
    r9SatGroup.traverse((obj) => {
      if (obj.name === 'contact-grounding-disc') satGroundingCount += 1
    })
    expect(satGroundingCount).toBeGreaterThanOrEqual(3)

    // Global Foliage Wind-Sway pass (`updateFoliageWindSway`)
    const swayedCount = updateFoliageWindSway(r9OceanTerrain.group, 2.35)
    expect(swayedCount).toBeGreaterThanOrEqual(25)

    // Round 9 Gap (b): Articulated Carrier Mechanics & Threshold Burst FX (`carrier-fx-group`)
    const { buildDetailedCarrierAndRealm } = await import('../src/scene/realms')
    const { buildAmbientLife } = await import('../src/scene/life')

    // 1. Submarine: sub-propeller, sub-bubble-stream, sub-splash-crown (bursts when diving across y=0)
    const subCR = buildDetailedCarrierAndRealm('submarine', palette, oceanArchLayout)
    expect(subCR.carrierGroup.getObjectByName('carrier-fx-group')).toBeDefined()
    expect(subCR.carrierGroup.getObjectByName('sub-propeller')).toBeDefined()
    expect(subCR.carrierGroup.getObjectByName('sub-bubble-stream')).toBeDefined()
    const subSplash = subCR.carrierGroup.getObjectByName('sub-splash-crown')!
    expect(subSplash).toBeDefined()
    subCR.updateCarrier(1.2, 0, 0, 0)
    expect(subSplash.visible).toBe(false)
    subCR.updateCarrier(1.5, 0, 1, 0.22)
    expect(subSplash.visible).toBe(true)
    expect(subSplash.scale.x).toBeGreaterThan(0.5)

    // 2. Camel: camel-leg-fl/fr/bl/br + camel-sand-puffs + desert-caravan articulated legs
    const camelLayout = computeWorldLayout(places, defaultProfile.projects, 'desert', 'camel')
    const camelCR = buildDetailedCarrierAndRealm('camel', resolvePalette('desert', 'camel'), camelLayout)
    expect(camelCR.carrierGroup.getObjectByName('carrier-fx-group')).toBeDefined()
    expect(camelCR.carrierGroup.getObjectByName('camel-leg-fl')).toBeDefined()
    expect(camelCR.carrierGroup.getObjectByName('camel-leg-fr')).toBeDefined()
    expect(camelCR.carrierGroup.getObjectByName('camel-leg-bl')).toBeDefined()
    expect(camelCR.carrierGroup.getObjectByName('camel-leg-br')).toBeDefined()
    expect(camelCR.carrierGroup.getObjectByName('camel-sand-puffs')).toBeDefined()
    const desertLife = buildAmbientLife('desert', resolvePalette('desert', 'camel'), camelLayout.buildings)
    const caravan = desertLife.group.getObjectByName('desert-caravan')!
    expect(caravan.getObjectByName('camel-leg-fl')).toBeDefined()
    expect(caravan.getObjectByName('camel-sand-puffs')).toBeDefined()

    // 3. Rocket: rocket-exhaust-plume + rocket-launch-smoke
    const rocketLayout = computeWorldLayout(places, defaultProfile.projects, 'desert', 'rocket')
    const rocketCR = buildDetailedCarrierAndRealm('rocket', palette, rocketLayout)
    expect(rocketCR.carrierGroup.getObjectByName('carrier-fx-group')).toBeDefined()
    expect(rocketCR.carrierGroup.getObjectByName('rocket-exhaust-plume')).toBeDefined()
    expect(rocketCR.carrierGroup.getObjectByName('rocket-launch-smoke')).toBeDefined()

    // 4. Balloon: balloon-burner-pulse + basket pendulum sway
    const balloonLayout = computeWorldLayout(places, defaultProfile.projects, 'grassland', 'balloon')
    const balloonCR = buildDetailedCarrierAndRealm('balloon', palette, balloonLayout)
    expect(balloonCR.carrierGroup.getObjectByName('carrier-fx-group')).toBeDefined()
    expect(balloonCR.carrierGroup.getObjectByName('balloon-burner-pulse')).toBeDefined()

    // 5. Snowball: ski-powder-spray
    const snowLayout = computeWorldLayout(places, defaultProfile.projects, 'snow', 'snowball')
    const snowballCR = buildDetailedCarrierAndRealm('snowball', palette, snowLayout)
    expect(snowballCR.carrierGroup.getObjectByName('carrier-fx-group')).toBeDefined()
    expect(snowballCR.carrierGroup.getObjectByName('ski-powder-spray')).toBeDefined()

    // Round 9 Gap (c): 3-Act Cinematic Transition Camera Choreography (`computeCameraPose` & `realmProjectRevealScale`)
    const { computeCameraPose, realmProjectRevealScale } = await import('../src/scene/motion')
    const gPos = { x: 2.8, y: 25.5, z: 44.5 }
    const gTar = { x: 0, y: 1.6, z: 0 }
    const mPos = oceanArchLayout.carrier.midCameraPosition
    const mTar = oceanArchLayout.carrier.midCameraTarget
    const rPos = oceanArchLayout.carrier.realmCameraPosition
    const rTar = oceanArchLayout.carrier.realmCameraTarget
    const cHome = oceanArchLayout.carrier.homePosition

    // Act I — Departure Focus (realmProgress in [0.02, 0.22]): banks toward active carrier with low-angle heroic framing
    const poseAct1 = computeCameraPose(0.12, 'submarine', gPos, gTar, mPos, mTar, rPos, rTar, cHome)
    expect(poseAct1.act).toBe('act1-departure')
    expect(poseAct1.carrierFocusWeight).toBeGreaterThan(0.35)
    expect(poseAct1.lowAngleDip).toBeGreaterThan(0.8)
    expect(Math.abs(poseAct1.rollZ)).toBeGreaterThan(0.005)

    // Act II — Threshold Rush (realmProgress in [0.22, 0.72]): dynamic FOV breathing (+3.5° peak) & banking roll
    const poseAct2Peak = computeCameraPose(0.47, 'submarine', gPos, gTar, mPos, mTar, rPos, rTar, cHome)
    expect(poseAct2Peak.act).toBe('act2-rush')
    expect(poseAct2Peak.fovDelta).toBeCloseTo(3.5, 1)
    expect(poseAct2Peak.fov).toBeCloseTo(38.5, 1)
    expect(Math.abs(poseAct2Peak.rollZ)).toBeGreaterThan(0.025)

    // Act III — Realm Reveal (realmProgress in [0.72, 1.0]): damped spring arrival + staggered scale-bounce on project nodes
    const poseAct3 = computeCameraPose(0.84, 'submarine', gPos, gTar, mPos, mTar, rPos, rTar, cHome)
    const poseEnd = computeCameraPose(1.0, 'submarine', gPos, gTar, mPos, mTar, rPos, rTar, cHome)
    expect(poseAct3.act).toBe('act3-reveal')
    expect(poseAct3.springArrival).toBeGreaterThan(1.0) // Damped spring overshoot during reveal
    expect(poseEnd.fov).toBeCloseTo(35, 2)
    expect(poseEnd.rollZ).toBeCloseTo(0, 4)
    expect(poseEnd.pos.x).toBeCloseTo(rPos.x, 2)
    expect(poseEnd.pos.y).toBeCloseTo(rPos.y, 2)
    expect(poseEnd.pos.z).toBeCloseTo(rPos.z, 2)

    // Staggered scale-bounce reveal on realm project nodes
    const scalePre = realmProjectRevealScale(0.5, 0)
    const scaleAct3Node0 = realmProjectRevealScale(0.82, 0)
    const scaleAct3Node2 = realmProjectRevealScale(0.82, 2)
    const scaleSettled = realmProjectRevealScale(1.0, 0)
    expect(scalePre).toBeLessThan(0.25)
    expect(scaleAct3Node0).toBeGreaterThan(1.01) // Node 0 is already in spring bounce overshoot
    expect(scaleAct3Node0).toBeGreaterThan(scaleAct3Node2 + 0.15) // Staggered behind Node 0
    expect(scaleSettled).toBeCloseTo(1.0, 2)

    // Round 9 Gap (d): Signed-Distance Obstacle Clearance Field (`sampleObstacleClearance` & `computeObstacleClearanceField`)
    const { sampleObstacleClearance, computeObstacleClearanceField } = await import(
      '../src/scene/layout'
    )
    // Simulate a user heavily customizing buildings in Sims Build Mode: nudging by ±2.0m and scaling to 1.15x
    let customizedProfile = defaultProfile
    for (const p of customizedProfile.places) {
      customizedProfile = nudgePlaceInProfile(
        customizedProfile,
        p.id,
        p.kind === 'education' ? 1.8 : -1.6,
        p.kind === 'landmark' ? 1.9 : -1.5,
      )
      customizedProfile = setPlaceScaleInProfile(customizedProfile, p.id, 1.15)
    }
    const sdfLayout = computeWorldLayout(
      getActivePlaces(customizedProfile),
      customizedProfile.projects,
      'ocean',
      'submarine',
      'archipelago',
    )
    const sdfField = computeObstacleClearanceField(sdfLayout, 'archipelago')

    // 1. Inside any nudged + 1.15x scaled building center or doorway, SDF is strictly negative (< -2.5)
    for (const b of sdfLayout.buildings) {
      expect(sampleObstacleClearance(b.position.x, b.position.z, sdfLayout, 'archipelago')).toBeLessThan(
        -2.5,
      )
    }
    // 2. Every procedural tree in sdfLayout.foliage maintains positive SDF clearance (>= 0) from all scaled/nudged buildings, bridges, docks, and roads
    expect(sdfLayout.foliage.length).toBeGreaterThanOrEqual(45)
    for (const f of sdfLayout.foliage) {
      expect(sampleObstacleClearance(f.x, f.z, sdfLayout, 'archipelago')).toBeGreaterThanOrEqual(0)
      for (const b of sdfLayout.buildings) {
        const minR = 3.25 * (b.place.buildingScale ?? 1.0)
        expect(Math.hypot(f.x - b.position.x, f.z - b.position.z)).toBeGreaterThanOrEqual(minR - 1e-3)
      }
    }
    // 3. Street lamps and benches in buildRichTerrain are radially nudged outside every building footprint
    const sdfTerrain = buildRichTerrain(
      'ocean',
      palette,
      sdfLayout.foliage,
      sdfLayout.buildings,
      'archipelago',
      undefined,
      ['b612-rose', 'fox-bench', 'campfire-tent'],
    )
    let lampCount = 0
    sdfTerrain.group.traverse((obj) => {
      if (obj.name === 'street-lamp') {
        lampCount += 1
        expect(sdfField.sampleBuildingClearance(obj.position.x, obj.position.z)).toBeGreaterThanOrEqual(
          0.2,
        )
      }
    })
    expect(lampCount).toBe(4)

    // Round 9 Gap (e): Zero-Dependency Procedural WebAudio Tactile & Spatial Soundscape (`src/ui/soundscape.ts`)
    const {
      computeSoundscapeSpec,
      ProceduralSoundscape,
      soundscape,
    } = await import('../src/ui/soundscape')

    const oceanSpec = computeSoundscapeSpec('ocean', 'submarine', 'ground')
    const oceanRealmSpec = computeSoundscapeSpec('ocean', 'submarine', 'realm')
    const desertSpec = computeSoundscapeSpec('desert', 'camel', 'ground')
    expect(oceanSpec.chordHz.length).toBe(3)
    expect(oceanSpec.ambientFilterHz).not.toBe(desertSpec.ambientFilterHz)
    expect(oceanRealmSpec.ambientFilterHz).toBeLessThan(oceanSpec.ambientFilterHz) // Deeper underwater lowpass in submarine realm

    const testAudio = new ProceduralSoundscape()
    expect(testAudio.isEnabled()).toBe(true)
    expect(testAudio.getButtonLabel()).toBe('🎵 音乐: 开')

    // Gracefully no-ops in headless Node environment without throwing
    expect(() => {
      testAudio.playHoverTick()
      testAudio.playSelectChime('ocean')
      testAudio.playBuildSnap()
      testAudio.playCarrierTransition('submarine', 'ocean')
      testAudio.syncAmbientWorld('snow', 'snowball', 'realm')
    }).not.toThrow()

    expect(testAudio.toggle()).toBe(false)
    expect(testAudio.isEnabled()).toBe(false)
    expect(testAudio.getButtonLabel()).toBe('🔇 音乐: 关')
    expect(soundscape.getButtonLabel()).toContain('音乐')

    // 8-Building Spatial De-Crowding, 37 Building Styles & Open-Source Edition Contracts
    const eightBuildingProfile = {
      ...defaultProfile,
      companyCount: 5,
      places: [
        {
          id: 'ruc-university',
          name: 'Classical Red-Brick University',
          short: 'Red-Brick Uni',
          kind: 'education' as const,
          style: 'ruc-mingde' as const,
          roles: [{ title: 'B.A. Management', period: '2014 — 2018', notes: ['Honors Graduate'] }],
        },
        {
          id: 'unimelb-master',
          name: 'Sandstone Clocktower University',
          short: 'Clocktower Uni',
          kind: 'education' as const,
          style: 'unimelb-clocktower' as const,
          roles: [{ title: 'M.S. Strategy', period: '2018 — 2020', notes: ['First Class Honors'] }],
        },
        {
          id: 'hometown-beijing',
          name: 'Imperial Altar Landmark',
          short: 'Altar Landmark',
          kind: 'landmark' as const,
          style: 'siheyuan-courtyard' as const,
          roles: [{ title: 'Home Base', period: '2014 — 2026', notes: ['Creative Studio Hub'] }],
        },
        {
          id: 'career-1',
          name: 'Twin-Bridge Tech Park',
          short: 'Tech Park',
          kind: 'career' as const,
          style: 'xiaomi-park' as const,
          roles: [{ title: 'Principal AI Architect', period: '2025 — Present', notes: ['AI Agent Platform'] }],
        },
        {
          id: 'career-2',
          name: 'Triple-Skybridge Mega HQ',
          short: 'Mega HQ',
          kind: 'career' as const,
          style: 'jd-hq' as const,
          roles: [{ title: 'Staff Product Builder', period: '2024 — 2025', notes: ['Global Cloud Systems'] }],
        },
        {
          id: 'career-3',
          name: 'Cantilevered Rhythm HQ',
          short: 'Rhythm HQ',
          kind: 'career' as const,
          style: 'bytedance-hq' as const,
          roles: [{ title: 'Senior Product Lead', period: '2021 — 2024', notes: ['Global Growth Engine'] }],
        },
        {
          id: 'career-4',
          name: 'CBD Diamond Core Tower',
          short: 'Diamond Tower',
          kind: 'career' as const,
          style: 'taikang-tower' as const,
          roles: [{ title: 'Product Specialist', period: '2020 — 2021', notes: ['Enterprise Suite'] }],
        },
        {
          id: 'career-5',
          name: 'Blue Cube HQ Tower',
          short: 'Blue Cube HQ',
          kind: 'career' as const,
          style: 'cscec-tower' as const,
          roles: [{ title: 'Associate Engineer', period: '2019 — 2020', notes: ['Infrastructure Systems'] }],
        },
      ],
    }
    const eightValid = validateProfileConfig(eightBuildingProfile)
    expect(eightValid.valid).toBe(true)
    const eightActive = getActivePlaces(eightBuildingProfile)
    expect(eightActive).toHaveLength(8)

    const archipelago8Layout = computeWorldLayout(
      eightActive,
      eightBuildingProfile.projects,
      'ocean',
      'submarine',
      'archipelago',
    )
    for (const b of archipelago8Layout.buildings) {
      for (const dx of [-2.1, 2.1]) {
        for (const dz of [-2.1, 2.1]) {
          const cornerY = getTerrainHeight(
            b.position.x + dx,
            b.position.z + dz,
            'ocean',
            'archipelago',
          )
          expect(cornerY).toBeGreaterThanOrEqual(0.38)
        }
      }
    }

    const rucPlaced = archipelago8Layout.buildings.find((b) => b.place.id === 'ruc-university')!
    const rucGroup = buildDetailedBuilding(rucPlaced, 'ocean', palette).group
    expect(rucGroup.getObjectByName('ruc-arch-gate')).toBeDefined()
    expect(rucGroup.getObjectByName('ruc-motto-stone')).toBeDefined()

    const unimelbPlaced = archipelago8Layout.buildings.find((b) => b.place.id === 'unimelb-master')!
    const unimelbGroup = buildDetailedBuilding(unimelbPlaced, 'ocean', palette).group
    expect(unimelbGroup.getObjectByName('unimelb-gothic-arches')).toBeDefined()
    expect(unimelbGroup.getObjectByName('unimelb-clock')).toBeDefined()

    const parkPlaced = archipelago8Layout.buildings.find((b) => b.place.id === 'career-1')!
    const parkGroup = buildDetailedBuilding(parkPlaced, 'ocean', palette).group
    expect(parkGroup.getObjectByName('xiaomi-mi-logo')).toBeDefined()
    expect(parkGroup.getObjectByName('xiaomi-mitu-mascot')).toBeDefined()

    const jdPlaced = archipelago8Layout.buildings.find((b) => b.place.id === 'career-2')!
    const jdGroup = buildDetailedBuilding(jdPlaced, 'ocean', palette).group
    expect(jdGroup.getObjectByName('jd-triple-towers')).toBeDefined()
    expect(jdGroup.getObjectByName('jd-skybridge')).toBeDefined()

    const bytePlaced = archipelago8Layout.buildings.find((b) => b.place.id === 'career-3')!
    const byteGroup = buildDetailedBuilding(bytePlaced, 'ocean', palette).group
    expect(byteGroup.getObjectByName('bytedance-cantilevers')).toBeDefined()
    expect(byteGroup.getObjectByName('bytedance-bars')).toBeDefined()

    const taikangPlaced = archipelago8Layout.buildings.find((b) => b.place.id === 'career-4')!
    const taikangGroup = buildDetailedBuilding(taikangPlaced, 'ocean', palette).group
    expect(taikangGroup.getObjectByName('taikang-diagrid-fins')).toBeDefined()
    expect(taikangGroup.getObjectByName('taikang-crown')).toBeDefined()

    const cscecPlaced = archipelago8Layout.buildings.find((b) => b.place.id === 'career-5')!
    const cscecGroup = buildDetailedBuilding(cscecPlaced, 'ocean', palette).group
    expect(cscecGroup.getObjectByName('cscec-exoskeleton')).toBeDefined()
    expect(cscecGroup.getObjectByName('cscec-emblem')).toBeDefined()

    const beijingPlaced = archipelago8Layout.buildings.find((b) => b.place.id === 'hometown-beijing')!
    const beijingGroup = buildDetailedBuilding(beijingPlaced, 'ocean', palette).group
    expect(beijingGroup.getObjectByName('tiantan-hall')).toBeDefined()
    expect(beijingGroup.getObjectByName('landmark-plumbob')).toBeDefined()

    // Open-Source Studio Edition Contracts:
    const fsModName = 'node:fs'
    const fs = (await import(/* @vite-ignore */ fsModName)) as {
      readFileSync: (path: string, encoding: string) => string
      existsSync: (path: string) => boolean
    }
    const indexHtml = fs.readFileSync('index.html', 'utf-8')
    const appUiTs = fs.readFileSync('src/ui/appUi.ts', 'utf-8')
    const soundscapeTs = fs.readFileSync('src/ui/soundscape.ts', 'utf-8')
    const styleCss = fs.readFileSync('src/style.css', 'utf-8')
    const viteConfigTs = fs.readFileSync('vite.config.ts', 'utf-8')

    // 1. Physical isolation: zero personal photos, zero private admin console, zero personal demos
    expect(fs.existsSync('public/assets')).toBe(false)
    expect(fs.existsSync('public/admin')).toBe(false)
    expect(fs.existsSync('public/demos/mi-english')).toBe(false)
    expect(fs.existsSync('public/demos/ambassador-guide')).toBe(false)
    expect(fs.existsSync('public/demos/ld-portal')).toBe(false)
    expect(fs.existsSync('public/demos/showcase')).toBe(false)
    expect(fs.existsSync('public/demos/generic-showcase/index.html')).toBe(true)

    // 2. Open-Source HUD & Default Entry
    expect(indexHtml).toContain('<title>3D Island Studio · 千人千世界 3D 个人主页生成器</title>')
    expect(indexHtml).not.toContain('class="personal-edition"')
    expect(indexHtml).not.toContain('id="preset-switch-btn"')
    expect(indexHtml).not.toContain('id="link-email"')
    expect(indexHtml).not.toContain('/demos/showcase/demo-auth.js')
    expect(indexHtml).toContain('id="hero-quick-strip"')
    expect(indexHtml).toContain('id="open-customize"')
    expect(indexHtml).toContain('id="guided-tour-btn"')
    expect(indexHtml).toContain('id="open-showcase-btn"')
    expect(indexHtml).toContain('id="open-list"')
    expect(indexHtml).toContain('id="link-github"')
    expect(indexHtml).toContain('id="toggle-audio-btn"')

    // 3. 4 Curated Persona Presets & Generic Showcase
    const { GENERIC_PERSONA_PRESETS } = await import('../src/data/personaPresets')
    expect(GENERIC_PERSONA_PRESETS).toHaveLength(4)
    for (const preset of GENERIC_PERSONA_PRESETS) {
      const validation = validateProfileConfig(preset.profile)
      expect(validation.valid).toBe(true)
    }

    // 4. Soundscape (lightweight MP3), Generic Archetypes + Custom Building Guide Modal, XSS safety, and open-source governance files
    const {
      formatNameWithAccentDot,
      openCustomBuildingGuideModal,
      renderPlaceDetails,
      renderProjectDetails,
    } = await import('../src/ui/appUi')
    expect(formatNameWithAccentDot('<img src=x onerror=alert(1)>')).toBe(
      '&lt;img src=x onerror=alert(1)&gt;<span class="dot">.</span>',
    )
    expect(formatNameWithAccentDot('Alex Rivera')).toBe('Alex Rivera<span class="dot">.</span>')
    expect(renderPlaceDetails).toBeTypeOf('function')
    expect(renderProjectDetails).toBeTypeOf('function')
    expect(openCustomBuildingGuideModal).toBeTypeOf('function')
    expect(soundscapeTs).toContain('BGM_STATIONS')
    expect(soundscapeTs).toContain('/audio/morning-breeze.mp3')
    expect(soundscapeTs).toContain('/audio/warm-sunset.mp3')
    expect(soundscapeTs).toContain('/audio/starlight-ambient.mp3')
    expect(fs.existsSync('public/audio/morning-breeze.mp3')).toBe(true)
    expect(fs.existsSync('public/audio/warm-sunset.mp3')).toBe(true)
    expect(fs.existsSync('public/audio/starlight-ambient.mp3')).toBe(true)
    expect(fs.existsSync('public/audio/morning-breeze.wav')).toBe(false)
    expect(soundscapeTs).toContain('🎵 音乐: 开')
    expect(soundscapeTs).toContain('🔇 音乐: 关')
    expect(styleCss).toContain('labels-intro-peek')
    expect(styleCss).toContain('.sims-card-custom-cta')
    expect(appUiTs).toContain('✦ 预设模板：')
    expect(appUiTs).toContain('定制专属母校 / 企业大楼')
    expect(appUiTs).toContain('一键复制 AI 建模 Prompt')
    expect(indexHtml).toContain('id="cust-custom-building-btn"')
    expect(viteConfigTs).toContain('manualChunks')
    expect(viteConfigTs).toContain('vendor-three')
    expect(defaultProfile.github).toBe('https://github.com/jasonz-ai/3d-island')
    expect(indexHtml).not.toContain('Marcozc19')
    expect(fs.existsSync('README.md')).toBe(true)
    expect(fs.existsSync('README.en.md')).toBe(true)
    expect(fs.existsSync('CONTRIBUTING.md')).toBe(true)
    expect(fs.existsSync('LICENSE')).toBe(true)
    const readmeZh = fs.readFileSync('README.md', 'utf-8')
    const readmeEn = fs.readFileSync('README.en.md', 'utf-8')
    expect(readmeZh).toContain('./README.en.md')
    expect(readmeEn).toContain('./README.md')
  })
})


