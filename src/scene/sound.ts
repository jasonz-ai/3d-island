import type { BiomeType, CarrierType } from '../schema/profile.ts'
import { soundscape } from '../ui/soundscape.ts'

export const soundFx = {
  playHoverTick(): void {
    soundscape.playHoverTick()
  },
  playClickSfx(): void {
    soundscape.playClickSfx()
  },
  playSelectChime(biome?: BiomeType): void {
    soundscape.playSelectChime(biome)
  },
  playPlumbobSfx(biome?: BiomeType): void {
    soundscape.playPlumbobSfx(biome)
  },
  playBuildSfx(): void {
    soundscape.playBuildSfx()
  },
  playCarrierWhoosh(carrier: CarrierType, biome?: BiomeType): void {
    soundscape.playCarrierTransition(carrier, biome)
  },
}
