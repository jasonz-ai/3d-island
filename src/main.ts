import './style.css'
import { defaultProfile } from './data/defaultProfile'
import { GENERIC_PERSONA_PRESETS } from './data/personaPresets'
import {
  BIOME_OPTIONS,
  CARRIER_OPTIONS,
  decodeProfileShareHash,
  DECOR_PROP_OPTIONS,
  getActivePlaces,
  parseProfileJson,
  resolveWorldShape,
  TIME_OF_DAY_OPTIONS,
  WEATHER_OPTIONS,
  WORLD_SHAPE_OPTIONS,
  type BiomeType,
  type CarrierType,
  type DecorPropId,
  type TimeOfDay,
  type WeatherType,
  type WorldShapeType,
} from './schema/profile'
import { computeWorldLayout } from './scene/layout'
import { createWorldController, type WorldLevel } from './scene/world'
import { bindAppUi, PROFILE_STORAGE_KEY } from './ui/appUi'

const canvas = document.querySelector<HTMLCanvasElement>('#scene')!
const labelsRoot = document.querySelector<HTMLElement>('#labels')!
const veilEl = document.querySelector<HTMLElement>('#transition-veil')!

const params = new URLSearchParams(window.location.search)
const presetParam = params.get('preset')
const matchedPersonaPreset = GENERIC_PERSONA_PRESETS.find((item) => item.id === presetParam)

const preferredDefault = matchedPersonaPreset
  ? structuredClone(matchedPersonaPreset.profile)
  : defaultProfile
const storedRaw = window.localStorage.getItem(PROFILE_STORAGE_KEY)
const storedProfile =
  presetParam !== null
    ? preferredDefault
    : storedRaw
      ? parseProfileJson(storedRaw, preferredDefault)
      : preferredDefault
const hashProfile = decodeProfileShareHash(window.location.hash, storedProfile)
const baseProfile = hashProfile ?? storedProfile

const biomeParam = params.get('biome') as BiomeType | null
const carrierParam = params.get('carrier') as CarrierType | null
const timeParam = params.get('time') as TimeOfDay | null
const weatherParam = params.get('weather') as WeatherType | null
const shapeParam = params.get('shape') as WorldShapeType | null
const archParam = params.get('arch')
const decorParam = params.get('decor')

const altPlaces =
  archParam === 'b612'
    ? baseProfile.places.map((p) => {
        if (p.id === 'hometown-pagoda') return { ...p, style: 'b612-rose-hill' as const }
        if (p.id === 'university') return { ...p, style: 'uni-academy' as const }
        return p
      })
    : archParam === 'alt'
      ? baseProfile.places.map((p) => {
          if (p.id === 'university') return { ...p, style: 'uni-gothic' as const }
          if (p.id === 'hometown-pagoda') return { ...p, style: 'watertown' as const }
          if (p.id === 'career-1') return { ...p, style: 'biotech' as const }
          if (p.id === 'career-2') return { ...p, style: 'game-arcade' as const }
          if (p.id === 'career-3') return { ...p, style: 'cloud-logistics' as const }
          if (p.id === 'career-4') return { ...p, style: 'indie-lab' as const }
          return p
        })
      : archParam === 'modern'
        ? baseProfile.places.map((p) => {
            if (p.id === 'university') return { ...p, style: 'uni-modern' as const }
            if (p.id === 'hometown-pagoda') return { ...p, style: 'coastal-town' as const }
            if (p.id === 'career-1') return { ...p, style: 'metro-landmark' as const }
            return p
          })
        : baseProfile.places

const resolvedDecorProps: DecorPropId[] | undefined =
  decorParam === 'all'
    ? DECOR_PROP_OPTIONS.map((d) => d.id)
    : decorParam
      ? (decorParam
          .split(',')
          .map((s) => s.trim())
          .filter((id) => DECOR_PROP_OPTIONS.some((d) => d.id === id)) as DecorPropId[])
      : baseProfile.decorProps

const resolvedBiome = BIOME_OPTIONS.some((b) => b.id === biomeParam) ? biomeParam! : baseProfile.biome

const initialProfile = {
  ...baseProfile,
  places: altPlaces,
  biome: resolvedBiome,
  carrier: CARRIER_OPTIONS.some((c) => c.id === carrierParam) ? carrierParam! : baseProfile.carrier,
  worldShape: WORLD_SHAPE_OPTIONS.some((s) => s.id === shapeParam)
    ? shapeParam!
    : biomeParam
      ? resolveWorldShape(resolvedBiome)
      : baseProfile.worldShape,
  timeOfDay: TIME_OF_DAY_OPTIONS.some((t) => t.id === timeParam)
    ? timeParam!
    : (baseProfile.timeOfDay ?? 'day'),
  weather: WEATHER_OPTIONS.some((w) => w.id === weatherParam)
    ? weatherParam!
    : (baseProfile.weather ?? 'clear'),
  ...(resolvedDecorProps ? { decorProps: resolvedDecorProps } : {}),
}

let world: ReturnType<typeof createWorldController>
try {
  world = createWorldController(canvas, labelsRoot, veilEl, initialProfile, {
    onSelectEntity: (id) => {
      const fn = (window as unknown as { __selectEntity?: (id: string | null) => void }).__selectEntity
      if (fn) fn(id)
    },
    onLevelChange: (level: WorldLevel) => {
      const fn = (window as unknown as { __onLevelChange?: (level: WorldLevel) => void })
        .__onLevelChange
      if (fn) fn(level)
    },
  })
} catch {
  let fallbackLevel: WorldLevel = 'ground'
  const fallbackLayout = computeWorldLayout(
    getActivePlaces(initialProfile),
    initialProfile.projects,
    initialProfile.biome,
    initialProfile.carrier,
    initialProfile.worldShape,
  )
  world = {
    rebuild: () => {},
    focusEntity: () => {},
    toggleRealm: () => {
      fallbackLevel = fallbackLevel === 'ground' ? 'realm' : 'ground'
    },
    getLevel: () => fallbackLevel,
    getLayout: () => fallbackLayout,
    renderAt: () => {},
  }
}

bindAppUi(initialProfile, world, defaultProfile)


