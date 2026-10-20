import * as THREE from 'three'
import type {
  BiomeType,
  CarrierType,
  DecorPropId,
  SatelliteTheme,
  ThemePalette,
} from '../schema/profile.ts'
import type { PlacedBuilding, WorldLayout } from './layout.ts'
import { buildRichTerrain } from './terrain.ts'
import { buildAmbientLife } from './life.ts'
import { buildDetailedBuilding } from './buildings.ts'
import { buildDetailedCarrierAndRealm } from './realms.ts'

export type TickFn = (elapsed: number, delta: number) => void

export function buildTerrainAndFoliage(
  biome: BiomeType,
  palette: ThemePalette,
  layout: WorldLayout,
  ticks: TickFn[],
  satellites?: SatelliteTheme[],
  decorProps?: DecorPropId[],
): THREE.Group {
  const root = new THREE.Group()
  root.name = `terrain-${biome}`

  const terrain = buildRichTerrain(
    biome,
    palette,
    layout.foliage,
    layout.buildings,
    layout.worldShape,
    satellites,
    decorProps,
  )
  const life = buildAmbientLife(biome, palette, layout.buildings)

  root.add(terrain.group, life.group)
  ticks.push((elapsed) => {
    terrain.update(elapsed)
    life.update(elapsed)
  })

  return root
}

export function buildBuildingGroup(
  placed: PlacedBuilding,
  biome: BiomeType,
  palette: ThemePalette,
  ticks: TickFn[],
): THREE.Group {
  const built = buildDetailedBuilding(placed, biome, palette)
  ticks.push((elapsed) => {
    built.update(elapsed)
  })
  return built.group
}

export function buildCarrierAndRealm(
  carrier: CarrierType,
  palette: ThemePalette,
  layout: WorldLayout,
  ticks: TickFn[],
): {
  carrierGroup: THREE.Group
  realmGroup: THREE.Group
  projectMeshes: Map<string, THREE.Object3D>
  updateCarrierMotion: (
    elapsed: number,
    settleWave: number,
    moveSpeed?: number,
    realmProgress?: number,
  ) => void
} {
  const built = buildDetailedCarrierAndRealm(carrier, palette, layout)
  ticks.push((elapsed) => {
    built.updateRealm(elapsed)
  })
  return {
    carrierGroup: built.carrierGroup,
    realmGroup: built.realmGroup,
    projectMeshes: built.projectMeshes,
    updateCarrierMotion: built.updateCarrier,
  }
}
