import {
  BIOME_OPTIONS,
  BUILDING_STYLE_OPTIONS,
  BUILDING_TINT_OPTIONS,
  CARRIER_OPTIONS,
  decodeProfileShareHash,
  DECOR_PROP_OPTIONS,
  encodeProfileShareHash,
  getActivePlaces,
  getBuildingStyleOptionsForKind,
  nudgePlaceInProfile,
  parseProfileJson,
  PROJECT_BOOTH_OPTIONS,
  resolvePalette,
  resolveSatellites,
  resolveWorldShape,
  rotatePlaceInProfile,
  SATELLITE_THEME_OPTIONS,
  serializeProfileJson,
  setPlaceScaleInProfile,
  setPlaceTintInProfile,
  swapPlaceOrderInProfile,
  TIME_OF_DAY_OPTIONS,
  toggleDecorPropInProfile,
  WEATHER_OPTIONS,
  WORLD_SHAPE_OPTIONS,
  type BuildingStyle,
  type BuildingTintPreset,
  type DecorPropId,
  type PlaceEntry,
  type PlaceKind,
  type ProfileConfig,
  type ProjectBoothStyle,
  type ProjectEntry,
  type RoleEntry,
  type SatelliteTheme,
  type TimeOfDay,
  type WeatherType,
  type WorldShapeType,
} from '../schema/profile'
import { getBrandLogoInfo } from '../scene/brandLogos'
import { GENERIC_PERSONA_PRESETS } from '../data/personaPresets'
import { computeGuidedTourStopList, type WorldController, type WorldLevel } from '../scene/world'
import { soundFx } from '../scene/sound'
import { soundscape } from './soundscape'

export const PROFILE_STORAGE_KEY = '3d-island.profile.v2'
export const ONBOARDING_STORAGE_KEY = '3d-island.onboarding-seen.v1'

function createEl<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  if (className) el.className = className
  if (text !== undefined) el.textContent = text
  return el
}

export function escapeHtml(raw: string): string {
  return String(raw)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function formatNameWithAccentDot(name: string): string {
  const trimmed = String(name || 'Alex Rivera').replace(/\.+$/, '')
  return `${escapeHtml(trimmed)}<span class="dot">.</span>`
}

export function renderStylePreviewSvg(
  styleId: BuildingStyle | ProjectBoothStyle | WorldShapeType | SatelliteTheme | DecorPropId,
  colors: [string, string, string],
): string {
  const [c1, c2, c3] = colors
  switch (styleId) {
    case 'university':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <ellipse cx="60" cy="68" rx="46" ry="8" fill="#DCE3D5"/>
        <rect x="26" y="34" width="68" height="30" rx="3" fill="${c1}"/>
        <path d="M42 34 A18 16 0 0 1 78 34 Z" fill="${c2}"/>
        <line x1="60" y1="10" x2="60" y2="20" stroke="#3A3F36" stroke-width="2"/>
        <path d="M60 10 L74 14 L60 18 Z" fill="#E8643A"/>
        <rect x="38" y="46" width="44" height="20" rx="2" fill="${c3}" stroke="${c1}" stroke-width="1.5"/>
        <path d="M45 66 V54 A5 5 0 0 1 55 54 V66 M55 66 V52 A5 5 0 0 1 65 52 V66 M65 66 V54 A5 5 0 0 1 75 54 V66" fill="#2C3531"/>
      </svg>`
    case 'uni-gothic':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <ellipse cx="60" cy="68" rx="46" ry="8" fill="#DCE3D5"/>
        <rect x="30" y="36" width="60" height="28" rx="2" fill="${c1}"/>
        <rect x="26" y="24" width="16" height="40" fill="${c1}"/>
        <polygon points="24,24 34,8 44,24" fill="${c2}"/>
        <rect x="78" y="24" width="16" height="40" fill="${c1}"/>
        <polygon points="76,24 86,8 96,24" fill="${c2}"/>
        <rect x="50" y="18" width="20" height="46" fill="#E8E1D3"/>
        <polygon points="48,18 60,4 72,18" fill="${c2}"/>
        <circle cx="60" cy="30" r="6.5" fill="#FAF6EE" stroke="${c2}" stroke-width="1.5"/>
        <line x1="60" y1="30" x2="60" y2="25" stroke="#1C1F1A" stroke-width="1.5"/>
        <line x1="60" y1="30" x2="64" y2="30" stroke="#E8643A" stroke-width="1.5"/>
      </svg>`
    case 'uni-modern':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <ellipse cx="60" cy="68" rx="46" ry="8" fill="#DCE3D5"/>
        <rect x="24" y="42" width="54" height="22" rx="3" fill="${c1}" stroke="#CBD5E1"/>
        <rect x="40" y="22" width="54" height="22" rx="3" fill="${c2}"/>
        <rect x="44" y="26" width="46" height="14" rx="2" fill="${c3}" opacity="0.85"/>
        <polygon points="48,16 62,12 64,18 50,22" fill="#2563EB"/>
        <polygon points="68,16 82,12 84,18 70,22" fill="#2563EB"/>
        <circle cx="32" cy="56" r="6" fill="none" stroke="#E8643A" stroke-width="2.5"/>
      </svg>`
    case 'uni-academy':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <ellipse cx="60" cy="68" rx="46" ry="8" fill="#DCE3D5"/>
        <rect x="24" y="34" width="72" height="28" rx="2" fill="${c1}" stroke="#C8BFA8"/>
        <polygon points="18,35 60,18 102,35" fill="${c2}"/>
        <rect x="42" y="52" width="36" height="10" rx="2" fill="#59B4C2"/>
        <rect x="46" y="28" width="28" height="10" rx="2" fill="#FFF5D6" stroke="#8E3524" stroke-width="1.5"/>
        <line x1="28" y1="62" x2="28" y2="36" stroke="${c3}" stroke-width="3"/>
        <circle cx="28" cy="34" r="6" fill="#68B672"/>
        <line x1="34" y1="62" x2="34" y2="40" stroke="${c3}" stroke-width="2.5"/>
        <circle cx="34" cy="38" r="5" fill="#68B672"/>
      </svg>`
    case 'pagoda':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <ellipse cx="60" cy="68" rx="44" ry="8" fill="#DCE3D5"/>
        <rect x="42" y="50" width="36" height="14" fill="${c1}"/>
        <polygon points="34,50 60,40 86,50" fill="${c2}"/>
        <rect x="46" y="36" width="28" height="12" fill="${c1}"/>
        <polygon points="38,36 60,27 82,36" fill="${c2}"/>
        <rect x="50" y="23" width="20" height="11" fill="${c1}"/>
        <polygon points="43,23 60,14 77,23" fill="${c2}"/>
        <line x1="60" y1="5" x2="60" y2="15" stroke="${c3}" stroke-width="2.5"/>
        <circle cx="38" cy="52" r="3" fill="${c3}"/>
        <circle cx="82" cy="52" r="3" fill="${c3}"/>
      </svg>`
    case 'watertown':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <ellipse cx="60" cy="68" rx="46" ry="8" fill="#DCE3D5"/>
        <rect x="24" y="32" width="34" height="26" fill="${c1}" stroke="#CBD5E1"/>
        <polygon points="22,32 41,20 60,32" fill="${c2}"/>
        <rect x="62" y="36" width="32" height="22" fill="${c1}" stroke="#CBD5E1"/>
        <polygon points="60,36 78,25 96,36" fill="${c2}"/>
        <rect x="20" y="56" width="80" height="10" rx="4" fill="${c3}"/>
        <path d="M44 58 Q60 44 76 58" fill="none" stroke="#B6AFA0" stroke-width="5"/>
        <polygon points="78,61 92,61 88,65 80,65" fill="#5C4033"/>
      </svg>`
    case 'coastal-town':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <ellipse cx="60" cy="68" rx="46" ry="8" fill="#DCE3D5"/>
        <rect x="26" y="38" width="44" height="26" rx="2" fill="${c1}"/>
        <polygon points="24,38 48,26 72,38" fill="${c2}"/>
        <rect x="74" y="18" width="14" height="46" rx="2" fill="#FAF6EE"/>
        <rect x="74" y="28" width="14" height="7" fill="${c2}"/>
        <rect x="74" y="42" width="14" height="7" fill="${c2}"/>
        <circle cx="81" cy="15" r="5" fill="#FDE047"/>
        <polygon points="81,15 108,6 108,24" fill="${c3}" opacity="0.45"/>
      </svg>`
    case 'metro-landmark':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <ellipse cx="60" cy="68" rx="46" ry="8" fill="#DCE3D5"/>
        <rect x="28" y="34" width="18" height="30" rx="2" fill="${c2}"/>
        <rect x="76" y="28" width="18" height="36" rx="2" fill="${c2}"/>
        <rect x="42" y="42" width="38" height="5" fill="#38BDF8"/>
        <line x1="60" y1="6" x2="60" y2="64" stroke="${c1}" stroke-width="4"/>
        <circle cx="60" cy="44" r="9" fill="${c3}"/>
        <circle cx="60" cy="24" r="6.5" fill="${c3}"/>
      </svg>`
    case 'b612-rose-hill':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <path d="M18 66 Q60 36 102 66 Z" fill="${c1}"/>
        <polygon points="26,58 35,50 42,59" fill="#7E877B"/>
        <polygon points="80,57 88,49 95,59" fill="#7E877B"/>
        <ellipse cx="60" cy="36" rx="24" ry="7" fill="none" stroke="#FBBF24" stroke-width="2" transform="rotate(-14 60 36)"/>
        <path d="M46 52 V28 A14 14 0 0 1 74 28 V52 Z" fill="#E0F2FE" opacity="0.65" stroke="#BAE6FD" stroke-width="1.5"/>
        <line x1="60" y1="50" x2="60" y2="34" stroke="#2E7D32" stroke-width="2.5"/>
        <circle cx="60" cy="31" r="7" fill="${c3}"/>
        <circle cx="57" cy="29" r="3" fill="#FB7185"/>
      </svg>`
    case 'tower':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <ellipse cx="60" cy="68" rx="44" ry="8" fill="#DCE3D5"/>
        <rect x="38" y="14" width="44" height="52" rx="4" fill="${c1}"/>
        <line x1="40" y1="16" x2="40" y2="64" stroke="${c2}" stroke-width="2.5"/>
        <line x1="80" y1="16" x2="80" y2="64" stroke="${c3}" stroke-width="2.5"/>
        <rect x="48" y="24" width="24" height="34" rx="3" fill="#1E293B" stroke="${c2}" stroke-width="1.2"/>
        <rect x="52" y="28" width="16" height="9" rx="1.5" fill="${c3}"/>
        <rect x="52" y="40" width="16" height="9" rx="1.5" fill="${c2}"/>
      </svg>`
    case 'tech':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <ellipse cx="60" cy="68" rx="44" ry="8" fill="#DCE3D5"/>
        <rect x="30" y="30" width="60" height="34" rx="4" fill="${c1}" stroke="${c2}" stroke-width="2"/>
        <rect x="36" y="36" width="48" height="14" rx="2" fill="${c2}"/>
        <rect x="40" y="14" width="40" height="14" rx="7" fill="#1E293B" stroke="${c3}" stroke-width="2"/>
        <circle cx="52" cy="21" r="4" fill="${c3}"/>
        <circle cx="68" cy="21" r="4" fill="${c3}"/>
      </svg>`
    case 'factory':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <ellipse cx="60" cy="68" rx="46" ry="8" fill="#DCE3D5"/>
        <rect x="24" y="36" width="70" height="28" rx="2" fill="${c1}" stroke="${c2}" stroke-width="1.5"/>
        <polygon points="24,36 40,26 40,36 56,26 56,36 72,26 72,36" fill="${c2}"/>
        <rect x="78" y="16" width="8" height="20" fill="${c2}"/>
        <circle cx="82" cy="11" r="4" fill="#FFFFFF" opacity="0.85"/>
        <path d="M44 58 L44 44 L58 38 L66 44" fill="none" stroke="${c3}" stroke-width="4" stroke-linecap="round"/>
      </svg>`
    case 'studio':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <ellipse cx="60" cy="68" rx="44" ry="8" fill="#DCE3D5"/>
        <rect x="28" y="30" width="64" height="34" rx="5" fill="${c1}" stroke="#E2E8F0" stroke-width="2"/>
        <rect x="26" y="24" width="68" height="8" rx="4" fill="${c2}"/>
        <circle cx="60" cy="52" r="9" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5"/>
        <rect x="42" y="34" width="14" height="8" rx="3" fill="#FFFFFF" stroke="${c2}" stroke-width="1.5"/>
        <rect x="64" y="34" width="14" height="8" rx="3" fill="#FFFFFF" stroke="${c3}" stroke-width="1.5"/>
      </svg>`
    case 'biotech':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <ellipse cx="60" cy="68" rx="44" ry="8" fill="#DCE3D5"/>
        <rect x="26" y="46" width="68" height="18" rx="3" fill="${c1}" stroke="${c2}" stroke-width="1.5"/>
        <rect x="34" y="32" width="52" height="14" rx="3" fill="${c1}" stroke="${c2}" stroke-width="1.5"/>
        <path d="M52 10 Q68 18 52 26 Q36 34 52 42" fill="none" stroke="${c2}" stroke-width="2.5"/>
        <path d="M68 10 Q52 18 68 26 Q84 34 68 42" fill="none" stroke="${c3}" stroke-width="2.5"/>
      </svg>`
    case 'game-arcade':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <ellipse cx="60" cy="68" rx="44" ry="8" fill="#DCE3D5"/>
        <rect x="32" y="28" width="56" height="36" rx="5" fill="${c1}" stroke="${c2}" stroke-width="2"/>
        <rect x="40" y="10" width="40" height="18" rx="9" fill="#F8FAFC" stroke="${c2}" stroke-width="2"/>
        <line x1="50" y1="15" x2="50" y2="23" stroke="${c1}" stroke-width="2.5"/>
        <line x1="46" y1="19" x2="54" y2="19" stroke="${c1}" stroke-width="2.5"/>
        <circle cx="67" cy="17" r="2.5" fill="${c3}"/>
        <circle cx="72" cy="21" r="2.5" fill="#38BDF8"/>
      </svg>`
    case 'cloud-logistics':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <ellipse cx="60" cy="68" rx="46" ry="8" fill="#DCE3D5"/>
        <rect x="28" y="34" width="64" height="30" rx="8" fill="${c1}" stroke="${c2}" stroke-width="2"/>
        <ellipse cx="60" cy="26" rx="34" ry="8" fill="none" stroke="${c3}" stroke-width="2.5"/>
        <circle cx="60" cy="16" r="4.5" fill="${c2}"/>
        <line x1="50" y1="14" x2="70" y2="14" stroke="#1E293B" stroke-width="2"/>
      </svg>`
    case 'indie-lab':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <ellipse cx="60" cy="68" rx="44" ry="8" fill="#DCE3D5"/>
        <polygon points="28,64 54,24 80,64" fill="${c1}" stroke="#7C5638" stroke-width="2"/>
        <rect x="46" y="46" width="16" height="18" fill="#FEF3C7"/>
        <path d="M72 28 A14 14 0 0 1 94 14" fill="none" stroke="#E2E8F0" stroke-width="4"/>
        <line x1="83" y1="21" x2="92" y2="12" stroke="${c3}" stroke-width="2"/>
        <circle cx="92" cy="12" r="3" fill="${c3}"/>
      </svg>`
    case 'uni-observatory':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <ellipse cx="60" cy="68" rx="46" ry="8" fill="#DCE3D5"/>
        <rect x="28" y="42" width="64" height="22" rx="3" fill="${c1}"/>
        <path d="M36 42 A24 22 0 0 1 84 42 Z" fill="${c2}"/>
        <line x1="60" y1="30" x2="88" y2="12" stroke="#1E293B" stroke-width="5" stroke-linecap="round"/>
        <circle cx="88" cy="12" r="4" fill="#38BDF8"/>
        <ellipse cx="60" cy="34" rx="28" ry="8" fill="none" stroke="${c3}" stroke-width="2"/>
      </svg>`
    case 'uni-art-bauhaus':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <ellipse cx="60" cy="68" rx="46" ry="8" fill="#DCE3D5"/>
        <rect x="22" y="38" width="46" height="26" rx="2" fill="${c1}" stroke="#CBD5E1"/>
        <rect x="44" y="20" width="52" height="22" rx="2" fill="#FFFFFF" stroke="#1E293B" stroke-width="1.5"/>
        <polygon points="22,38 38,26 52,38" fill="${c2}"/>
        <rect x="28" y="44" width="14" height="14" fill="${c3}"/>
        <circle cx="80" cy="54" r="8" fill="${c2}"/>
      </svg>`
    case 'uni-gate-palace':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <ellipse cx="60" cy="68" rx="46" ry="8" fill="#DCE3D5"/>
        <rect x="24" y="34" width="72" height="30" fill="${c1}"/>
        <polygon points="14,34 60,16 106,34" fill="${c2}"/>
        <polygon points="22,24 60,10 98,24" fill="${c2}"/>
        <rect x="46" y="24" width="28" height="9" rx="1.5" fill="#1E3A8A" stroke="${c3}" stroke-width="1.5"/>
        <circle cx="34" cy="42" r="3.5" fill="#EF4444"/>
        <circle cx="86" cy="42" r="3.5" fill="#EF4444"/>
      </svg>`
    case 'uni-conservatory':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <ellipse cx="60" cy="68" rx="46" ry="8" fill="#DCE3D5"/>
        <path d="M24 64 V38 A18 18 0 0 1 60 38 V64 Z" fill="${c1}" opacity="0.82" stroke="${c3}" stroke-width="1.8"/>
        <path d="M44 64 V28 A22 22 0 0 1 88 28 V64 Z" fill="${c1}" opacity="0.88" stroke="${c3}" stroke-width="2"/>
        <circle cx="66" cy="46" r="10" fill="${c2}"/>
        <circle cx="42" cy="50" r="7" fill="${c2}"/>
      </svg>`
    case 'siheyuan-courtyard':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <ellipse cx="60" cy="68" rx="46" ry="8" fill="#DCE3D5"/>
        <rect x="22" y="30" width="76" height="34" rx="2" fill="${c1}"/>
        <polygon points="18,30 60,16 102,30" fill="${c1}"/>
        <rect x="44" y="42" width="32" height="22" fill="${c2}"/>
        <circle cx="76" cy="24" r="9" fill="#EF4444" opacity="0.85"/>
        <circle cx="46" cy="48" r="3" fill="${c3}"/>
        <circle cx="74" cy="48" r="3" fill="${c3}"/>
      </svg>`
    case 'mountain-stilts':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <ellipse cx="60" cy="68" rx="46" ry="8" fill="#DCE3D5"/>
        <line x1="34" y1="48" x2="34" y2="66" stroke="${c1}" stroke-width="3.5"/>
        <line x1="60" y1="48" x2="60" y2="66" stroke="${c1}" stroke-width="3.5"/>
        <line x1="86" y1="48" x2="86" y2="66" stroke="${c1}" stroke-width="3.5"/>
        <rect x="26" y="32" width="68" height="18" fill="${c1}"/>
        <polygon points="20,32 60,18 100,32" fill="#374151"/>
        <rect x="38" y="20" width="44" height="14" fill="${c1}"/>
        <polygon points="32,20 60,8 88,20" fill="#374151"/>
        <circle cx="38" cy="40" r="3.5" fill="${c2}"/>
        <circle cx="60" cy="40" r="3.5" fill="${c3}"/>
        <circle cx="82" cy="40" r="3.5" fill="${c2}"/>
      </svg>`
    case 'euro-castle':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <ellipse cx="60" cy="68" rx="46" ry="8" fill="#DCE3D5"/>
        <rect x="34" y="34" width="52" height="30" fill="${c1}"/>
        <rect x="26" y="20" width="14" height="44" fill="${c1}"/>
        <polygon points="24,20 33,6 42,20" fill="${c2}"/>
        <rect x="80" y="20" width="14" height="44" fill="${c1}"/>
        <polygon points="78,20 87,6 96,20" fill="${c2}"/>
        <rect x="52" y="14" width="16" height="50" fill="${c1}"/>
        <polygon points="49,14 60,2 71,14" fill="${c2}"/>
        <path d="M54 64 V50 A6 6 0 0 1 66 50 V64 Z" fill="#451A03"/>
      </svg>`
    case 'tulou-roundhouse':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <ellipse cx="60" cy="68" rx="46" ry="8" fill="#DCE3D5"/>
        <ellipse cx="60" cy="48" rx="36" ry="18" fill="${c1}"/>
        <ellipse cx="60" cy="34" rx="38" ry="14" fill="${c2}"/>
        <ellipse cx="60" cy="34" rx="20" ry="8" fill="#FEF3C7"/>
        <circle cx="48" cy="46" r="3" fill="${c3}"/>
        <circle cx="60" cy="48" r="3" fill="${c3}"/>
        <circle cx="72" cy="46" r="3" fill="${c3}"/>
      </svg>`
    case 'snow-chalet-village':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <ellipse cx="60" cy="68" rx="46" ry="8" fill="#E2E8F0"/>
        <polygon points="26,64 60,18 94,64" fill="${c1}"/>
        <polygon points="22,42 60,14 98,42 86,42 60,22 34,42" fill="${c2}"/>
        <rect x="50" y="44" width="20" height="14" rx="2" fill="${c3}"/>
        <rect x="74" y="18" width="7" height="16" fill="#7F1D1D"/>
      </svg>`
    case 'medical-center':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <ellipse cx="60" cy="68" rx="46" ry="8" fill="#DCE3D5"/>
        <rect x="28" y="24" width="64" height="40" rx="5" fill="${c1}" stroke="${c2}" stroke-width="2"/>
        <ellipse cx="60" cy="22" rx="22" ry="6" fill="#334155" stroke="${c2}" stroke-width="1.5"/>
        <rect x="56" y="32" width="8" height="22" rx="1.5" fill="${c3}"/>
        <rect x="49" y="39" width="22" height="8" rx="1.5" fill="${c3}"/>
      </svg>`
    case 'law-palace':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <ellipse cx="60" cy="68" rx="46" ry="8" fill="#DCE3D5"/>
        <rect x="22" y="58" width="76" height="6" fill="${c1}"/>
        <polygon points="20,30 60,12 100,30" fill="${c1}" stroke="${c2}" stroke-width="1.5"/>
        <rect x="30" y="30" width="7" height="28" fill="${c1}"/>
        <rect x="47" y="30" width="7" height="28" fill="${c1}"/>
        <rect x="66" y="30" width="7" height="28" fill="${c1}"/>
        <rect x="83" y="30" width="7" height="28" fill="${c1}"/>
        <circle cx="60" cy="23" r="4.5" fill="${c2}"/>
      </svg>`
    case 'film-stage':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <ellipse cx="60" cy="68" rx="46" ry="8" fill="#DCE3D5"/>
        <rect x="24" y="28" width="72" height="36" rx="4" fill="${c1}" stroke="${c2}" stroke-width="2"/>
        <rect x="24" y="28" width="72" height="9" fill="${c3}"/>
        <polygon points="44,64 60,52 76,64" fill="${c2}"/>
        <circle cx="42" cy="45" r="7" fill="none" stroke="${c3}" stroke-width="2"/>
        <circle cx="78" cy="45" r="7" fill="none" stroke="${c3}" stroke-width="2"/>
      </svg>`
    case 'coffee-roastery':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <ellipse cx="60" cy="68" rx="46" ry="8" fill="#DCE3D5"/>
        <rect x="24" y="34" width="52" height="30" rx="3" fill="${c1}"/>
        <rect x="22" y="32" width="56" height="7" rx="3" fill="${c3}"/>
        <rect x="78" y="20" width="16" height="44" rx="7" fill="${c2}"/>
        <circle cx="50" cy="50" r="8" fill="#FEF3C7"/>
      </svg>`
    case 'ruc-mingde':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <ellipse cx="60" cy="68" rx="46" ry="8" fill="#DCE3D5"/>
        <rect x="20" y="36" width="22" height="28" rx="2" fill="${c1}"/>
        <rect x="78" y="36" width="22" height="28" rx="2" fill="${c1}"/>
        <rect x="38" y="22" width="44" height="42" rx="2" fill="${c1}" stroke="${c2}" stroke-width="1.5"/>
        <rect x="44" y="42" width="32" height="22" fill="${c2}"/>
        <ellipse cx="60" cy="62" rx="14" ry="5" fill="#9CA3AF"/>
        <circle cx="24" cy="30" r="6" fill="${c3}"/>
        <circle cx="96" cy="30" r="6" fill="${c3}"/>
      </svg>`
    case 'unimelb-clocktower':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <ellipse cx="60" cy="68" rx="46" ry="8" fill="#DCE3D5"/>
        <rect x="22" y="36" width="52" height="28" rx="2" fill="${c1}"/>
        <polygon points="20,36 48,22 76,36" fill="#2C3540"/>
        <rect x="74" y="18" width="18" height="46" fill="${c1}"/>
        <polygon points="72,18 83,4 94,18" fill="${c2}"/>
        <circle cx="83" cy="26" r="5" fill="#FFFBEB" stroke="${c2}" stroke-width="1.5"/>
        <circle cx="28" cy="48" r="8" fill="${c3}"/>
      </svg>`
    case 'xiaomi-park':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <ellipse cx="60" cy="68" rx="46" ry="8" fill="#DCE3D5"/>
        <rect x="24" y="26" width="32" height="38" rx="3" fill="${c2}" stroke="${c3}" stroke-width="1.5"/>
        <rect x="64" y="30" width="32" height="34" rx="3" fill="${c2}" stroke="${c3}" stroke-width="1.5"/>
        <rect x="52" y="36" width="16" height="12" fill="#38BDF8"/>
        <rect x="31" y="10" width="18" height="14" rx="4" fill="${c1}"/>
        <text x="40" y="20" text-anchor="middle" font-size="9" font-weight="800" fill="#FFFFFF">MI</text>
        <circle cx="80" cy="20" r="6" fill="#38BDF8" stroke="${c1}" stroke-width="1.5"/>
      </svg>`
    case 'jd-hq':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <ellipse cx="60" cy="68" rx="46" ry="8" fill="#DCE3D5"/>
        <rect x="24" y="20" width="18" height="44" rx="2" fill="${c2}" stroke="${c3}" stroke-width="1.2"/>
        <rect x="51" y="20" width="18" height="44" rx="2" fill="${c2}" stroke="${c3}" stroke-width="1.2"/>
        <rect x="78" y="20" width="18" height="44" rx="2" fill="${c2}" stroke="${c3}" stroke-width="1.2"/>
        <rect x="24" y="28" width="72" height="7" fill="#38BDF8" opacity="0.85"/>
        <rect x="24" y="42" width="72" height="6" fill="#38BDF8" opacity="0.85"/>
        <rect x="22" y="16" width="76" height="4" rx="2" fill="${c1}"/>
        <circle cx="84" cy="58" r="5" fill="#FFFFFF" stroke="${c1}" stroke-width="1.5"/>
      </svg>`
    case 'bytedance-hq':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <ellipse cx="60" cy="68" rx="46" ry="8" fill="#DCE3D5"/>
        <rect x="26" y="46" width="66" height="18" rx="2" fill="${c3}" stroke="#CBD5E1"/>
        <rect x="32" y="32" width="64" height="14" rx="2" fill="#0F172A"/>
        <rect x="24" y="22" width="58" height="12" rx="2" fill="${c3}" stroke="${c1}"/>
        <rect x="40" y="6" width="5" height="14" rx="1.5" fill="${c1}"/>
        <rect x="48" y="10" width="5" height="10" rx="1.5" fill="#3C8CFF"/>
        <rect x="56" y="9" width="5" height="11" rx="1.5" fill="${c2}"/>
        <rect x="64" y="5" width="5" height="15" rx="1.5" fill="#00DCA5"/>
      </svg>`
    case 'taikang-tower':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <ellipse cx="60" cy="68" rx="46" ry="8" fill="#DCE3D5"/>
        <rect x="30" y="50" width="60" height="14" rx="2" fill="${c3}"/>
        <rect x="38" y="18" width="44" height="34" rx="2" fill="${c2}" stroke="${c3}" stroke-width="1.2"/>
        <rect x="42" y="10" width="36" height="8" rx="2" fill="${c1}"/>
        <circle cx="84" cy="56" r="4.5" fill="${c1}"/>
      </svg>`
    case 'cscec-tower':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <ellipse cx="60" cy="68" rx="46" ry="8" fill="#DCE3D5"/>
        <rect x="32" y="18" width="56" height="46" rx="2" fill="${c1}" stroke="${c2}" stroke-width="2.5"/>
        <line x1="32" y1="34" x2="88" y2="34" stroke="${c2}" stroke-width="2"/>
        <line x1="32" y1="48" x2="88" y2="48" stroke="${c2}" stroke-width="2"/>
        <rect x="53" y="6" width="14" height="12" rx="2" fill="${c1}" stroke="#38BDF8" stroke-width="1.5"/>
        <rect x="22" y="48" width="6" height="16" fill="${c3}"/>
      </svg>`
    case 'crescent-bay':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <rect x="8" y="10" width="104" height="60" rx="10" fill="${c1}" opacity="0.22"/>
        <path d="M84 18 C42 10 16 28 20 50 C24 68 56 70 86 58 C66 58 44 50 44 38 C44 26 66 22 84 18 Z" fill="${c2}"/>
        <path d="M78 22 C44 16 24 30 26 48 C30 62 54 64 78 56 C60 54 38 48 38 38 C38 28 60 24 78 22 Z" fill="${c3}"/>
        <rect x="80" y="46" width="6" height="14" fill="#FAF6EE"/>
        <circle cx="83" cy="44" r="3.5" fill="#EF4444"/>
        <polygon points="62,42 68,32 72,42" fill="#FFFFFF"/>
      </svg>`
    case 'floating-terraces':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <polygon points="18,48 60,66 102,48 60,30" fill="${c3}"/>
        <polygon points="28,36 60,50 92,36 60,22" fill="${c1}"/>
        <polygon points="40,24 60,34 80,24 60,14" fill="${c2}"/>
        <rect x="55" y="34" width="10" height="30" fill="#38BDF8" opacity="0.88"/>
        <circle cx="60" cy="64" r="7" fill="#BAE6FD"/>
      </svg>`
    case 'archipelago':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <rect x="8" y="10" width="104" height="60" rx="10" fill="${c1}" opacity="0.25"/>
        <path d="M22 44 C18 28 38 18 54 26 C64 32 76 18 94 28 C104 36 98 54 82 54 C68 54 62 42 50 48 C36 54 24 56 22 44 Z" fill="${c2}"/>
        <path d="M26 42 C24 30 38 22 52 28 C62 34 74 22 90 30 C96 36 92 48 80 48 C68 48 62 38 50 44 C38 48 28 50 26 42 Z" fill="${c3}"/>
        <circle cx="24" cy="60" r="7" fill="${c2}"/><circle cx="24" cy="60" r="4.5" fill="${c3}"/>
        <circle cx="94" cy="58" r="8" fill="${c2}"/><circle cx="94" cy="58" r="5" fill="${c3}"/>
        <line x1="30" y1="55" x2="36" y2="48" stroke="#8B6244" stroke-width="2.5"/>
        <line x1="88" y1="53" x2="82" y2="46" stroke="#8B6244" stroke-width="2.5"/>
      </svg>`
    case 'b612-highland':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <ellipse cx="60" cy="46" rx="48" ry="14" fill="none" stroke="#F59E0B" stroke-width="2" stroke-dasharray="4 3"/>
        <path d="M24 58 Q60 12 96 58 Z" fill="${c1}"/>
        <path d="M32 58 Q60 22 88 58 Z" fill="#529A4E" opacity="0.55"/>
        <ellipse cx="38" cy="48" rx="9" ry="6" fill="#C8BCA6"/><ellipse cx="38" cy="45" rx="8" ry="3.5" fill="${c1}"/>
        <ellipse cx="82" cy="46" rx="10" ry="7" fill="#C8BCA6"/><ellipse cx="82" cy="43" rx="9" ry="4" fill="${c1}"/>
        <polygon points="48,36 55,20 62,36" fill="${c2}"/>
        <circle cx="55" cy="16" r="3.5" fill="#F8FAFC"/>
        <circle cx="68" cy="26" r="5" fill="${c3}"/>
      </svg>`
    case 'canyon-mesa':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <polygon points="16,58 34,26 54,26 62,58" fill="${c1}"/>
        <polygon points="22,26 36,16 50,16 54,26" fill="${c2}"/>
        <polygon points="64,58 72,22 94,22 106,58" fill="${c1}"/>
        <polygon points="72,22 78,14 90,14 94,22" fill="${c2}"/>
        <path d="M54 58 Q60 40 66 58" fill="${c3}"/>
        <path d="M46 32 Q60 18 74 32" fill="none" stroke="${c1}" stroke-width="4"/>
      </svg>`
    case 'alpine-valley':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <polygon points="18,60 44,14 68,60" fill="${c3}"/>
        <polygon points="34,32 44,14 54,32" fill="${c1}"/>
        <polygon points="52,60 78,18 104,60" fill="${c2}"/>
        <polygon points="68,34 78,18 88,34" fill="${c1}"/>
        <path d="M36 60 Q60 46 92 62" fill="none" stroke="${c1}" stroke-width="5"/>
      </svg>`
    case 'b612-rose':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <ellipse cx="60" cy="66" rx="40" ry="8" fill="#DCE3D5"/>
        <ellipse cx="60" cy="62" rx="22" ry="5" fill="#D6CFC2"/>
        <ellipse cx="60" cy="38" rx="34" ry="10" fill="none" stroke="${c3}" stroke-width="2" transform="rotate(-14 60 38)"/>
        <path d="M44 60 V28 A16 16 0 0 1 76 28 V60 Z" fill="${c2}" opacity="0.65" stroke="#BAE6FD" stroke-width="1.8"/>
        <circle cx="60" cy="11" r="3" fill="${c2}"/>
        <line x1="60" y1="58" x2="60" y2="34" stroke="#2E7D32" stroke-width="2.6"/>
        <ellipse cx="54" cy="46" rx="5" ry="2.5" fill="#4CAF50" transform="rotate(-24 54 46)"/>
        <circle cx="60" cy="31" r="8" fill="${c1}"/>
        <circle cx="57" cy="29" r="3.5" fill="#FB7185"/>
      </svg>`
    case 'fox-bench':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <ellipse cx="60" cy="66" rx="44" ry="8" fill="#DCE3D5"/>
        <rect x="28" y="48" width="42" height="6" rx="2" fill="${c2}"/>
        <rect x="28" y="38" width="42" height="7" rx="2" fill="#A47551"/>
        <line x1="34" y1="54" x2="34" y2="64" stroke="#374151" stroke-width="3"/>
        <line x1="64" y1="54" x2="64" y2="64" stroke="#374151" stroke-width="3"/>
        <line x1="88" y1="64" x2="88" y2="20" stroke="#27272A" stroke-width="3"/>
        <circle cx="80" cy="22" r="6" fill="${c3}"/>
        <polygon points="72,62 80,44 88,62" fill="${c1}"/>
        <circle cx="80" cy="40" r="6" fill="${c1}"/>
        <polygon points="75,35 77,28 80,35" fill="${c1}"/>
        <polygon points="80,35 83,28 85,35" fill="${c1}"/>
        <ellipse cx="90" cy="58" rx="8" ry="4" fill="${c1}"/>
        <circle cx="96" cy="57" r="3" fill="#FFFBEB"/>
      </svg>`
    case 'cherry-grove':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <ellipse cx="60" cy="66" rx="44" ry="8" fill="#FDE8EF"/>
        <path d="M54 64 Q56 44 48 32 M56 50 Q66 40 72 32" fill="none" stroke="${c3}" stroke-width="4.5" stroke-linecap="round"/>
        <circle cx="46" cy="26" r="14" fill="${c1}"/>
        <circle cx="64" cy="22" r="16" fill="${c2}"/>
        <circle cx="76" cy="30" r="12" fill="${c1}"/>
        <circle cx="36" cy="34" r="10" fill="${c2}"/>
        <rect x="82" y="48" width="10" height="16" rx="2" fill="#9CA3AF"/>
        <polygon points="78,48 87,40 96,48" fill="#6B7280"/>
        <circle cx="87" cy="53" r="3" fill="#FDE047"/>
      </svg>`
    case 'campfire-tent':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <ellipse cx="60" cy="66" rx="46" ry="8" fill="#DCE3D5"/>
        <polygon points="22,62 46,24 70,62" fill="${c2}" stroke="#D97706" stroke-width="1.5"/>
        <polygon points="38,62 46,38 54,62" fill="#451A03"/>
        <rect x="74" y="58" width="22" height="5" rx="2.5" fill="${c3}"/>
        <polygon points="78,58 85,38 92,58" fill="${c1}"/>
        <polygon points="81,58 85,44 89,58" fill="#FDE047"/>
      </svg>`
    case 'dutch-windmill':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <ellipse cx="60" cy="66" rx="44" ry="8" fill="#DCE3D5"/>
        <polygon points="44,64 50,24 70,24 76,64" fill="${c1}"/>
        <path d="M48 24 A12 10 0 0 1 72 24 Z" fill="#2C3531"/>
        <line x1="32" y1="12" x2="88" y2="52" stroke="${c2}" stroke-width="3"/>
        <line x1="88" y1="12" x2="32" y2="52" stroke="${c2}" stroke-width="3"/>
        <circle cx="60" cy="32" r="4" fill="${c3}"/>
        <circle cx="34" cy="62" r="3.5" fill="#F43F5E"/>
        <circle cx="42" cy="63" r="3.5" fill="${c3}"/>
        <circle cx="82" cy="62" r="3.5" fill="#EC4899"/>
      </svg>`
    case 'pet-corgi':
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <ellipse cx="60" cy="66" rx="44" ry="8" fill="#DCE3D5"/>
        <rect x="24" y="38" width="32" height="24" rx="2" fill="${c2}"/>
        <polygon points="20,38 40,22 60,38" fill="${c3}"/>
        <path d="M34 62 V48 A6 6 0 0 1 46 48 V62 Z" fill="#27272A"/>
        <rect x="66" y="46" width="24" height="12" rx="6" fill="${c1}"/>
        <ellipse cx="72" cy="52" rx="6" ry="5" fill="${c2}"/>
        <circle cx="66" cy="42" r="7" fill="${c1}"/>
        <polygon points="61,36 63,28 66,36" fill="${c1}"/>
        <polygon points="67,36 71,28 73,36" fill="${c1}"/>
        <ellipse cx="96" cy="60" rx="6" ry="3" fill="#3B82F6"/>
      </svg>`
    default:
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
        <ellipse cx="60" cy="66" rx="42" ry="9" fill="#DCE3D5"/>
        <ellipse cx="60" cy="58" rx="30" ry="7" fill="${c1}"/>
        <circle cx="60" cy="34" r="16" fill="none" stroke="${c2}" stroke-width="2.5"/>
        <polygon points="60,16 72,34 60,52 48,34" fill="${c3}" opacity="0.88"/>
      </svg>`
  }
}

function renderRole(role: RoleEntry): HTMLElement {
  const div = createEl('div', 'role')
  div.appendChild(createEl('h3', undefined, role.title))
  const meta = [role.period, role.location].filter(Boolean).join(' · ')
  if (meta) {
    div.appendChild(createEl('p', 'meta', meta))
  }
  if (role.notes?.length) {
    const ul = createEl('ul')
    for (const note of role.notes) {
      ul.appendChild(createEl('li', undefined, note))
    }
    div.appendChild(ul)
  }
  return div
}

const GENERIC_SHOWCASE_DEMOS = [
  {
    key: 'ai-builder',
    label: '01 · AI 产品 Builder',
    shortLabel: '01 AI Builder',
    title: '3D Island Studio · AI 产品 Builder 作品展台与 JSON 配置蓝图',
    url: '/demos/generic-showcase/index.html?template=ai-builder',
  },
  {
    key: 'creative-designer',
    label: '02 · 创意技术设计师',
    shortLabel: '02 创意设计师',
    title: '3D Island Studio · 创意技术设计师 作品展台与 JSON 配置蓝图',
    url: '/demos/generic-showcase/index.html?template=creative-designer',
  },
  {
    key: 'indie-founder',
    label: '03 · 出海独立创客',
    shortLabel: '03 独立创客',
    title: '3D Island Studio · 出海独立创客 作品展台与 JSON 配置蓝图',
    url: '/demos/generic-showcase/index.html?template=indie-founder',
  },
  {
    key: 'research-scholar',
    label: '04 · 前沿科研学者',
    shortLabel: '04 科研学者',
    title: '3D Island Studio · 前沿科研学者 作品展台与 JSON 配置蓝图',
    url: '/demos/generic-showcase/index.html?template=research-scholar',
  },
] as const

export function openDemoPreviewModal(demoUrl: string, customTitle?: string): void {
  if (typeof document === 'undefined') return
  let modal = document.getElementById('demo-preview-modal')
  if (!modal) {
    modal = createEl('div', 'demo-preview-modal')
    modal.id = 'demo-preview-modal'
    modal.innerHTML = `
      <div class="demo-preview-shell" id="demo-preview-shell">
        <header class="demo-preview-header">
          <div class="demo-preview-brand">
            <span class="demo-live-dot"></span>
            <strong id="demo-preview-title">Interactive Studio Showcase</strong>
          </div>
          <div class="demo-preview-switcher" id="demo-preview-switcher"></div>
          <div class="demo-preview-actions">
            <div class="demo-device-toggle" id="demo-device-toggle" role="group" aria-label="Device Frame">
              <button type="button" class="demo-device-btn active" data-device="desktop">🖥 Desktop</button>
              <button type="button" class="demo-device-btn" data-device="mobile">📱 Mobile</button>
            </div>
            <a id="demo-preview-ext" class="demo-btn-ext" href="#" target="_blank" rel="noopener noreferrer">新窗口全屏 ↗</a>
            <button type="button" id="demo-preview-close" class="demo-btn-close">✕ 返回 3D 岛屿</button>
          </div>
        </header>
        <div class="demo-preview-stage" id="demo-preview-stage">
          <iframe id="demo-preview-iframe" class="demo-preview-iframe" src="about:blank" allow="autoplay"></iframe>
        </div>
      </div>
    `
    document.body.appendChild(modal)
    const switcher = modal.querySelector('#demo-preview-switcher')!
    for (const item of GENERIC_SHOWCASE_DEMOS) {
      const btn = createEl('button', 'demo-switch-pill', item.label)
      btn.type = 'button'
      btn.dataset.demoUrl = item.url
      btn.addEventListener('click', () => openDemoPreviewModal(item.url, item.title))
      switcher.appendChild(btn)
    }
    modal.querySelectorAll('.demo-device-btn').forEach((el) => {
      const btn = el as HTMLButtonElement
      btn.addEventListener('click', () => {
        const mode = btn.dataset.device ?? 'desktop'
        modal?.querySelectorAll('.demo-device-btn').forEach((b) => {
          b.classList.toggle('active', b === btn)
        })
        modal?.querySelector('#demo-preview-stage')?.classList.toggle('mobile-frame', mode === 'mobile')
      })
    })
    const closeDemoModal = () => {
      modal?.classList.remove('open')
      const frame = modal?.querySelector('#demo-preview-iframe') as HTMLIFrameElement | null
      if (frame) frame.src = 'about:blank'
    }
    modal.querySelector('#demo-preview-close')?.addEventListener('click', closeDemoModal)
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeDemoModal()
      }
    })
    window.addEventListener('message', (ev) => {
      if (ev.data && typeof ev.data === 'object' && ev.data.type === 'close-demo-modal') {
        closeDemoModal()
      }
    })
  }
  const matched = GENERIC_SHOWCASE_DEMOS.find((d) => demoUrl.includes(d.key) || d.url === demoUrl)
  const resolvedUrl = matched?.url ?? demoUrl
  const iframeUrl = resolvedUrl
  const resolvedTitle = customTitle ?? matched?.title ?? '3D Island Studio · Interactive Showcase'
  const titleEl = modal.querySelector('#demo-preview-title')
  if (titleEl) titleEl.textContent = resolvedTitle
  const extLink = modal.querySelector('#demo-preview-ext') as HTMLAnchorElement | null
  if (extLink) extLink.href = resolvedUrl
  const iframe = modal.querySelector('#demo-preview-iframe') as HTMLIFrameElement | null
  if (iframe && iframe.src !== iframeUrl) {
    iframe.src = iframeUrl
  }
  const defaultMobile = false
  modal.classList.toggle('is-showcase-embed', iframeUrl.includes('/demos/generic-showcase/index.html'))
  modal.querySelector('#demo-preview-stage')?.classList.toggle('mobile-frame', defaultMobile)
  modal.querySelectorAll('.demo-device-btn').forEach((el) => {
    const b = el as HTMLElement
    b.classList.toggle('active', b.dataset.device === (defaultMobile ? 'mobile' : 'desktop'))
  })
  modal.querySelectorAll('.demo-switch-pill').forEach((el) => {
    const btn = el as HTMLElement
    btn.classList.toggle('active', btn.dataset.demoUrl === resolvedUrl)
  })
  modal.classList.add('open')
}

function createEntityCtaRow(
  primaryUrl?: string,
  primaryLabel = '立即访问产品 ↗',
  secondaryUrl?: string,
  secondaryLabel = '源码 / 详情 ↗',
  entityTitle?: string,
): HTMLElement | null {
  const pUrl = primaryUrl?.trim()
  const sUrl = secondaryUrl?.trim()
  if (!pUrl && !sUrl) return null
  const row = createEl('div', 'entity-cta-row')
  if (pUrl) {
    if (pUrl.startsWith('/demos/')) {
      const liveBtn = createEl('button', 'entity-cta primary demo-live-trigger', '✨ 岛内沉浸交互体验')
      liveBtn.type = 'button'
      liveBtn.dataset.demoUrl = pUrl
      liveBtn.addEventListener('click', () => openDemoPreviewModal(pUrl, entityTitle))
      row.appendChild(liveBtn)

      const extA = createEl('a', 'entity-cta secondary', '新窗口全屏 ↗')
      extA.href = pUrl
      extA.target = '_blank'
      extA.rel = 'noopener noreferrer'
      row.appendChild(extA)
    } else {
      const a = createEl('a', 'entity-cta primary', primaryLabel)
      a.href = pUrl
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      row.appendChild(a)
    }
  }
  if (sUrl) {
    const a = createEl('a', 'entity-cta secondary', secondaryLabel)
    a.href = sUrl
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    row.appendChild(a)
  }
  return row
}

export function renderPlaceDetails(
  place: PlaceEntry,
  onEnterBuildMode?: (id: string) => void,
): HTMLElement[] {
  const kindLabel =
    place.kind === 'education'
      ? 'Education · 求学'
      : place.kind === 'landmark'
        ? 'Landmark · 城市坐标'
        : 'Experience · 工作履历'
  const logoSpec = getBrandLogoInfo(place.style)
  const headerRow = createEl('div', 'place-header-row')
  if (logoSpec && place.kind !== 'landmark') {
    const logoBadge = createEl('span', 'brand-logo-badge')
    logoBadge.dataset.logoId = logoSpec.id
    logoBadge.dataset.svgUrl = logoSpec.svgUrl
    logoBadge.title = logoSpec.label
    const logoImg = createEl('img', 'brand-logo-img') as HTMLImageElement
    logoImg.src = logoSpec.svgUrl
    logoImg.alt = logoSpec.label
    logoBadge.appendChild(logoImg)
    headerRow.appendChild(logoBadge)
  }
  headerRow.appendChild(createEl('h2', 'place-name', place.name))

  const nodes: HTMLElement[] = [
    createEl('p', 'kind', kindLabel),
    headerRow,
  ]

  const styleMeta = BUILDING_STYLE_OPTIONS.find((s) => s.id === place.style)
  if (styleMeta) {
    const chipWrap = createEl('div', 'place-exhibit-chips')
    chipWrap.appendChild(createEl('span', 'place-exhibit-chip', `🏛 ${styleMeta.shortLabel}`))
    if (place.roles[0]?.period) {
      chipWrap.appendChild(createEl('span', 'place-exhibit-chip', `🗓 ${place.roles[0].period}`))
    }
    if (place.roles[0]?.location) {
      chipWrap.appendChild(createEl('span', 'place-exhibit-chip', `📍 ${place.roles[0].location}`))
    }
    nodes.push(chipWrap)
    nodes.push(createEl('p', 'place-arch-caption', `🏛 3D 建筑母型：${styleMeta.propHint}`))
  }

  nodes.push(...place.roles.map(renderRole))

  const ctaRow = createEntityCtaRow(place.link, '访问官网 ↗', undefined, undefined, place.name)
  if (ctaRow) nodes.push(ctaRow)
  if (onEnterBuildMode) {
    const buildRow = createEl('div', 'entity-build-trigger-row')
    const buildBtn = createEl('button', 'btn-sims-inline', '🛠 更换建筑外观 / 编辑文案')
    buildBtn.type = 'button'
    buildBtn.addEventListener('click', () => onEnterBuildMode(place.id))
    buildRow.appendChild(buildBtn)
    nodes.push(buildRow)
  }
  return nodes
}

export function renderProjectDetails(
  project: ProjectEntry,
  onEnterBuildMode?: (id: string) => void,
): HTMLElement[] {
  const boothMeta = PROJECT_BOOTH_OPTIONS.find((b) => b.id === project.boothStyle)
  const tagText = [project.tag, boothMeta?.shortLabel].filter(Boolean).join(' · ')
  const nodes: HTMLElement[] = [
    createEl('p', 'kind', tagText ? `Project · ${tagText}` : 'Project · 作品秘境'),
    createEl('h2', 'place-name', project.name),
    createEl('p', 'summary', project.summary),
  ]
  const ctaRow = createEntityCtaRow(
    project.link,
    '立即访问产品 ↗',
    project.repoUrl,
    '源码 / 详情 ↗',
    project.name,
  )
  if (ctaRow) nodes.push(ctaRow)
  if (onEnterBuildMode) {
    const buildRow = createEl('div', 'entity-build-trigger-row')
    const buildBtn = createEl(
      'button',
      'btn-sims-inline',
      '🛠 模拟人生建造态 · 看图更换此展台与外链',
    )
    buildBtn.type = 'button'
    buildBtn.addEventListener('click', () => onEnterBuildMode(project.id))
    buildRow.appendChild(buildBtn)
    nodes.push(buildRow)
  }
  return nodes
}

function getKindMeta(kind: PlaceKind): { icon: string; badge: string; title: string; sub: string } {
  if (kind === 'education') {
    return {
      icon: '🎓',
      badge: 'EDUCATION CATALOG · 高等学府建筑库（10款通用母型 + 支持定制）',
      title: '求学母校 · 10 款校园建筑通用母型',
      sub: '含东方红砖人文学府、维多利亚砂岩钟楼、古典穹顶、哥特双塔、东方书院、包豪斯工坊与天文台；支持 AI 或联系作者定制专属母校。',
    }
  }
  if (kind === 'landmark') {
    return {
      icon: '🏮',
      badge: 'HOMETOWN CATALOG · 家乡与精神地标库（10款通用母型 + 支持定制）',
      title: '家乡印记 · 10 款城市与文化地标',
      sub: '含东方宝塔、江南水乡、滨海灯塔、摩天双塔、B-612星丘、四合院祈年坛、吊脚楼、古堡、土楼与雪屋；支持 AI 或联系作者定制专属地标。',
    }
  }
  return {
    icon: '🏢',
    badge: 'CAREER HQ CATALOG · 行业总部大厦库（17款通用母型 + 支持定制）',
    title: '职业履历 · 17 款行业代表建筑母型',
    sub: '含双子连廊科技园、三联连廊总部、错层数智广场、斜交网格金融塔、钢构蓝立方及 AI、XR、智造、生科等；支持 AI 或联系作者定制专属名企。',
  }
}

export function openCustomBuildingGuideModal(defaultKind: PlaceKind = 'career'): void {
  if (typeof document === 'undefined') return
  let modal = document.getElementById('custom-building-guide-modal')
  if (!modal) {
    modal = createEl('div', 'demo-preview-modal')
    modal.id = 'custom-building-guide-modal'
    modal.innerHTML = `
      <div class="custom-guide-dialog" role="dialog" aria-labelledby="custom-guide-title">
        <header class="custom-guide-header">
          <div>
            <span class="custom-guide-eyebrow">CUSTOM 3D LANDMARK · 专属建筑扩展指南</span>
            <h2 id="custom-guide-title">✨ 定制你的专属母校 / 企业总部 3D 地标</h2>
          </div>
          <button type="button" id="custom-guide-close" class="demo-btn-close">✕ 关闭</button>
        </header>
        <div class="custom-guide-body">
          <p class="custom-guide-lead">
            开源通用版默认采用 <strong>37 款去品牌化的通用建筑母型</strong>。如果你希望在岛上 1:1 还原自己真实的<strong>母校标志性校门、就职名企总部大楼或家乡地标</strong>，可以任选以下两种方式：
          </p>
          <div class="custom-guide-grid">
            <section class="custom-guide-card">
              <div class="custom-guide-card-head">
                <span class="custom-guide-tag">方式一 · 零成本自助</span>
                <h3>🤖 复制 AI 建模 Prompt 自己生成</h3>
              </div>
              <p class="custom-guide-desc">
                填写你想定制的学校或企业名称与外观特征，一键复制下方专为本仓库架构定制的 Prompt，直接粘贴给 <strong>Claude Code / Cursor / Codex</strong> 即可自动生成参数化 Three.js 3D 建筑并注册进图鉴：
              </p>
              <div class="custom-guide-inputs">
                <input id="cg-target-name" type="text" placeholder="例如：清华大学二校门 / OpenAI 旧金山总部" value="我的专属企业总部大楼" />
                <input id="cg-target-features" type="text" placeholder="外观特征：例如 三拱古典白石校门 / 玻璃幕墙飞船环形大楼 + 屋顶发光徽标" value="现代双子塔玻璃幕墙 + 高空悬挑连廊 + 屋顶立体发光徽标 + 前坪吉祥物雕塑" />
              </div>
              <textarea id="cg-prompt-area" class="custom-guide-prompt" rows="6" readonly></textarea>
              <button type="button" id="cg-copy-prompt-btn" class="btn-primary custom-guide-btn">📋 一键复制 AI 建模 Prompt</button>
            </section>

            <section class="custom-guide-card highlight">
              <div class="custom-guide-card-head">
                <span class="custom-guide-tag accent">方式二 · 作者专属定制</span>
                <h3>🤝 联系作者定制 1:1 专属 3D 建筑</h3>
              </div>
              <p class="custom-guide-desc">
                想要更高精度的定制级 3D 个人岛屿（含名校校徽浮雕、名企总部地标精雕、专属吉祥物与个人作品集交互展台）？欢迎直接提交定制需求或联系作者交流：
              </p>
              <ul class="custom-guide-list">
                <li>🏛 <strong>专属母校 / 企业地标精雕</strong>：按真实建筑照片与配色还原 Three.js 低多边形地标与屋顶 3D 徽标；</li>
                <li>🎮 <strong>岛内交互式代表作展台</strong>：将你的 AI 产品、微课或前端作品嵌入岛内可试玩沙箱；</li>
                <li>🌍 <strong>全套个人数字名片交付</strong>：开箱即部署到 Vercel / GitHub Pages / 自定义域名。</li>
              </ul>
              <div class="custom-guide-actions">
                <a href="https://github.com/jasonz-ai/3d-island/issues/new?title=%5BCustom+3D+Building%5D+%E7%94%B3%E8%AF%B7%E5%AE%9A%E5%88%B6%E4%B8%93%E5%B1%9E+3D+%E5%BB%BA%E7%AD%91%E6%88%96%E4%B8%AA%E4%BA%BA%E5%B2%9B%E5%B1%BF" target="_blank" rel="noopener noreferrer" class="btn-primary custom-guide-link">💬 在 GitHub 提交定制需求 ↗</a>
                <a href="https://github.com/jasonz-ai" target="_blank" rel="noopener noreferrer" class="btn-secondary custom-guide-link">👤 联系作者 (@jasonz-ai) ↗</a>
              </div>
            </section>
          </div>
        </div>
      </div>
    `
    document.body.appendChild(modal)
    const closeBtn = modal.querySelector('#custom-guide-close')
    const closeModal = () => modal?.classList.remove('open')
    closeBtn?.addEventListener('click', closeModal)
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal()
    })
  }

  const nameInput = modal.querySelector<HTMLInputElement>('#cg-target-name')!
  const featInput = modal.querySelector<HTMLInputElement>('#cg-target-features')!
  const promptArea = modal.querySelector<HTMLTextAreaElement>('#cg-prompt-area')!
  const copyBtn = modal.querySelector<HTMLButtonElement>('#cg-copy-prompt-btn')!

  const kindLabel =
    defaultKind === 'education' ? 'education（求学母校）' : defaultKind === 'landmark' ? 'landmark（城市地标）' : 'career（职业企业总部）'

  const updatePromptText = () => {
    const targetName = nameInput.value.trim() || '我的专属地标建筑'
    const targetFeat = featInput.value.trim() || '标志性主楼轮廓、屋顶立体发光徽标与前坪景观细节'
    promptArea.value = `请在当前 3D Island Studio 仓库中为我新增一款专属 3D 建筑母型：
1. 建筑名称：「${targetName}」，所属分类：${kindLabel}
2. 视觉与结构特征：${targetFeat}
3. 修改文件契约：
   - 在 src/schema/profile.ts 的 BuildingStyle 与 BUILDING_STYLE_OPTIONS 中注册新 style id（category: '${defaultKind}'）；
   - 在 src/ui/appUi.ts 的 renderStylePreviewSvg() 中添加对应的 SVG 缩略图；
   - 在 src/scene/buildings.ts 的 buildDetailedBuilding() 中使用 Three.js 参数化几何体（windowedBox / box / cyl / ExtrudeGeometry）实现该建筑的高辨识度 3D 模型，并确保 npm test -- --run 与 npm run build 通过。`
  }

  nameInput.oninput = updatePromptText
  featInput.oninput = updatePromptText
  updatePromptText()

  copyBtn.onclick = () => {
    navigator.clipboard?.writeText(promptArea.value).catch(() => {})
    copyBtn.textContent = '✓ 已复制 AI 建模 Prompt！可直接粘贴给 Claude / Cursor / Codex'
    window.setTimeout(() => {
      copyBtn.textContent = '📋 一键复制 AI 建模 Prompt'
    }, 2400)
  }

  modal.classList.add('open')
}

export function bindAppUi(
  initialConfig: ProfileConfig,
  world: WorldController,
  fallbackDefault: ProfileConfig = initialConfig,
): void {
  let config: ProfileConfig = structuredClone(initialConfig)
  let isBuildMode = false
  let currentSelectedId: string | null = null

  const badgeEl = document.querySelector<HTMLElement>('#world-badge')!
  const nameEl = document.querySelector<HTMLElement>('#profile-name')!
  const taglineEl = document.querySelector<HTMLElement>('#profile-tagline')!
  const ghLink = document.querySelector<HTMLAnchorElement>('#link-github')!
  const liLink = document.querySelector<HTMLAnchorElement>('#link-linkedin')
  const openListBtn = document.querySelector<HTMLButtonElement>('#open-list')!
  const openCustomizeBtn = document.querySelector<HTMLButtonElement>('#open-customize')!
  const openShowcaseBtn = document.querySelector<HTMLButtonElement>('#open-showcase-btn')
  const hintEl = document.querySelector<HTMLElement>('#scene-hint')!
  const heroQuickStrip = document.querySelector<HTMLElement>('#hero-quick-strip')
  const tourSubtitleBar = document.querySelector<HTMLElement>('#tour-subtitle-bar')

  const simsBuildBar = document.querySelector<HTMLElement>('#sims-build-bar')
  const simsSlotPills = document.querySelector<HTMLElement>('#sims-slot-pills')
  const simsShareLinkBtn = document.querySelector<HTMLButtonElement>('#sims-share-link')
  const simsExportPostcardBtn = document.querySelector<HTMLButtonElement>('#sims-export-postcard')
  const simsOpenFullFormBtn = document.querySelector<HTMLButtonElement>('#sims-open-full-form')
  const simsExitBuildBtn = document.querySelector<HTMLButtonElement>('#sims-exit-build')

  const guidedTourBtn = document.querySelector<HTMLButtonElement>('#guided-tour-btn')
  const toggleAudioBtn = document.querySelector<HTMLButtonElement>('#toggle-audio-btn')
  const fullscreenToggleBtn = document.querySelector<HTMLButtonElement>('#fullscreen-toggle-btn')
  const landscapeFullscreenFab = document.querySelector<HTMLButtonElement>('#landscape-fullscreen-fab')
  const visitorModeToggleBtn = document.querySelector<HTMLButtonElement>('#visitor-mode-toggle')
  const visitorExitBtn = document.querySelector<HTMLButtonElement>('#visitor-exit-btn')
  const shareLinkBtn = document.querySelector<HTMLButtonElement>('#share-link-btn')
  const exportPostcardBtn = document.querySelector<HTMLButtonElement>('#export-postcard-btn')
  const shareToastEl = document.querySelector<HTMLElement>('#share-toast')

  const simsCatalogDock = document.querySelector<HTMLElement>('#sims-catalog-dock')
  const simsCatalogEyebrow = document.querySelector<HTMLElement>('#sims-catalog-eyebrow')
  const simsCatalogTitle = document.querySelector<HTMLElement>('#sims-catalog-title')
  const simsCatalogSubtitle = document.querySelector<HTMLElement>('#sims-catalog-subtitle')
  const simsCatalogGrid = document.querySelector<HTMLElement>('#sims-catalog-grid')

  const studioBar = document.querySelector<HTMLElement>('#studio-bar')
  const studioToggleBtn = document.querySelector<HTMLButtonElement>('#studio-toggle')

  const panelEl = document.querySelector<HTMLElement>('#panel')!
  const panelBody = document.querySelector<HTMLElement>('#panel .panel-body')!
  const panelClose = document.querySelector<HTMLButtonElement>('#panel .close')!

  const custDrawer = document.querySelector<HTMLElement>('#customize-drawer')!
  const custClose = document.querySelector<HTMLButtonElement>('#customize-drawer .close')!
  const custNameInput = document.querySelector<HTMLInputElement>('#cust-name')!
  const custTaglineInput = document.querySelector<HTMLTextAreaElement>('#cust-tagline')!
  const custPlacesList = document.querySelector<HTMLElement>('#cust-places-list')!
  const custProjectsList = document.querySelector<HTMLElement>('#cust-projects-list')!
  const custAddProjBtn = document.querySelector<HTMLButtonElement>('#cust-add-project')
  const custCustomBuildingBtn = document.querySelector<HTMLButtonElement>('#cust-custom-building-btn')
  const custApplyBtn = document.querySelector<HTMLButtonElement>('#cust-apply')!
  const custToggleJsonBtn = document.querySelector<HTMLButtonElement>('#cust-toggle-json')!
  const custResetBtn = document.querySelector<HTMLButtonElement>('#cust-reset')!
  const custJsonWrap = document.querySelector<HTMLElement>('#cust-json-wrap')!
  const custJsonArea = document.querySelector<HTMLTextAreaElement>('#cust-json-area')!
  const custImportJsonBtn = document.querySelector<HTMLButtonElement>('#cust-import-json')!
  const custCopyJsonBtn = document.querySelector<HTMLButtonElement>('#cust-copy-json')!

  const listEl = document.querySelector<HTMLElement>('#list')!
  const listBody = document.querySelector<HTMLElement>('#list .list-body')!
  const listClose = document.querySelector<HTMLButtonElement>('#list .close')!

  const biomeGroup = document.querySelector<HTMLElement>('#biome-Group')!
  const worldShapeGroup = document.querySelector<HTMLElement>('#world-shape-group')
  const carrierGroup = document.querySelector<HTMLElement>('#carrier-group')!
  const timeOfDayGroup = document.querySelector<HTMLElement>('#time-of-day-group')
  const weatherGroup = document.querySelector<HTMLElement>('#weather-group')
  const towerCountGroup = document.querySelector<HTMLElement>('#tower-count-group')!

  let toastTimer: number | null = null
  function showToast(message: string): void {
    if (!shareToastEl) return
    shareToastEl.textContent = message
    shareToastEl.hidden = false
    if (toastTimer !== null) window.clearTimeout(toastTimer)
    toastTimer = window.setTimeout(() => {
      shareToastEl.hidden = true
    }, 3200)
  }

  let isTourActive = false
  let tourTimer: number | null = null

  function getTourStopNarrative(stopId: string | null, stopLabel: string): string {
    if (!stopId) {
      return '全景俯瞰你的专属 3D 人生岛屿与第二秘境作品展台。'
    }
    const place = config.places.find((p) => p.id === stopId)
    if (place) {
      const role = place.roles[0]
      const note = role?.notes?.[0] ?? ''
      return [role?.period, role?.title, note].filter(Boolean).join(' · ')
    }
    const proj = config.projects.find((p) => p.id === stopId)
    if (proj) {
      return `${proj.tag ? `[${proj.tag}] ` : ''}${proj.summary}`
    }
    return stopLabel
  }

  function stopGuidedTour(silent = false): void {
    if (tourTimer !== null) {
      window.clearTimeout(tourTimer)
      tourTimer = null
    }
    if (tourSubtitleBar) {
      tourSubtitleBar.hidden = true
      tourSubtitleBar.innerHTML = ''
    }
    document.body.classList.remove('guided-tour-active')
    if (!isTourActive) return
    isTourActive = false
    if (guidedTourBtn) {
      guidedTourBtn.textContent = '环岛导览'
      guidedTourBtn.classList.remove('tour-active')
    }
    if (!silent) {
      showToast('⏹ 已结束自动环岛导览，可随时自由旋转与点击探索')
    }
  }

  function startGuidedTour(): void {
    if (isBuildMode) setBuildMode(false)
    stopGuidedTour(true)
    isTourActive = true
    document.body.classList.add('guided-tour-active')
    panelEl.hidden = true
    document.body.classList.remove('has-selection')
    if (guidedTourBtn) {
      guidedTourBtn.textContent = '停止导览'
      guidedTourBtn.classList.add('tour-active')
    }
    soundFx.playSelectChime()
    const stops = computeGuidedTourStopList(config)
    let stepIdx = 0

    const goToStep = (nextIdx: number) => {
      if (tourTimer !== null) {
        window.clearTimeout(tourTimer)
        tourTimer = null
      }
      if (!isTourActive || nextIdx >= stops.length) {
        stopGuidedTour(true)
        showToast('✨ 环岛故事导览已完成！欢迎继续点击建筑探索详情')
        return
      }
      stepIdx = Math.max(0, nextIdx)
      const stop = stops[stepIdx]
      const displayNum = stepIdx + 1
      panelEl.hidden = true
      document.body.classList.remove('has-selection')
      currentSelectedId = stop.id
      world.focusEntity(stop.id, stop.level)
      updateHeaderAndHint(stop.level)

      if (tourSubtitleBar) {
        tourSubtitleBar.hidden = false
        tourSubtitleBar.innerHTML = ''
        const metaRow = createEl('div', 'tour-sub-meta')
        metaRow.appendChild(
          createEl(
            'span',
            'tour-sub-step',
            `导览 ${String(displayNum).padStart(2, '0')} / ${String(stops.length).padStart(2, '0')}`,
          ),
        )
        const ctrlGroup = createEl('div', 'tour-sub-ctrls')
        const prevBtn = createEl('button', 'tour-ctrl-btn', '⏮ 上一站')
        prevBtn.type = 'button'
        prevBtn.disabled = stepIdx === 0
        prevBtn.addEventListener('click', () => goToStep(stepIdx - 1))

        const nextBtn = createEl('button', 'tour-ctrl-btn', '下一站 ⏭')
        nextBtn.type = 'button'
        nextBtn.addEventListener('click', () => goToStep(stepIdx + 1))

        if (stop.id !== null) {
          const detailBtn = createEl('button', 'tour-ctrl-btn tour-detail-btn', '📖 详情')
          detailBtn.type = 'button'
          detailBtn.title = '暂停导览并展开该地标的完整履历卡片'
          detailBtn.addEventListener('click', () => {
            const targetId = stop.id
            stopGuidedTour(true)
            selectById(targetId)
          })
          ctrlGroup.appendChild(detailBtn)
        }

        const endBtn = createEl('button', 'tour-ctrl-btn danger', '✕ 结束')
        endBtn.type = 'button'
        endBtn.addEventListener('click', () => stopGuidedTour(false))

        ctrlGroup.append(prevBtn, nextBtn, endBtn)
        metaRow.appendChild(ctrlGroup)

        const titleEl = createEl('strong', 'tour-sub-title', stop.label)
        const copyEl = createEl(
          'p',
          'tour-sub-copy',
          getTourStopNarrative(stop.id, stop.label),
        )
        tourSubtitleBar.append(metaRow, titleEl, copyEl)
      }

      tourTimer = window.setTimeout(() => goToStep(stepIdx + 1), stop.durationMs)
    }

    goToStep(0)
  }

  function setVisitorMode(active: boolean): void {
    if (active && isBuildMode) {
      setBuildMode(false)
    }
    if (active) {
      openCustomizeDrawer(false)
    }
    document.body.classList.toggle('visitor-mode', active)
    if (visitorExitBtn) {
      visitorExitBtn.hidden = !active
    }
    updateHeaderAndHint()
  }

  function copyShareLink(): void {
    const hash = encodeProfileShareHash(config)
    const shareUrl = `${window.location.origin}${window.location.pathname}?view=visitor${hash}`
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${hash}`)
    navigator.clipboard?.writeText(shareUrl).catch(() => {})
    soundFx.playSelectChime()
    showToast('🔗 已生成并复制专属 3D 岛屿分享链接（含全部建筑、地形与装扮）！')
  }

  function exportPolaroidPostcard(): void {
    const sceneCanvas = document.querySelector<HTMLCanvasElement>('#scene')
    if (!sceneCanvas) return
    soundFx.playSelectChime()

    const outW = 1440
    const outH = 1040
    const padX = 48
    const padTop = 44
    const snapW = outW - padX * 2
    const snapH = 770

    const offscreen = document.createElement('canvas')
    offscreen.width = outW
    offscreen.height = outH
    const ctx = offscreen.getContext('2d')
    if (!ctx) return

    // Warm Polaroid paper backdrop
    ctx.fillStyle = '#FAF8F3'
    ctx.fillRect(0, 0, outW, outH)

    // Subtle outer border
    ctx.strokeStyle = '#DED8CA'
    ctx.lineWidth = 4
    ctx.strokeRect(14, 14, outW - 28, outH - 28)

    // Draw 3D WebGL scene snapshot with cover crop
    const srcW = sceneCanvas.width || 1280
    const srcH = sceneCanvas.height || 800
    const targetAspect = snapW / snapH
    const srcAspect = srcW / srcH
    let sx = 0
    let sy = 0
    let sw = srcW
    let sh = srcH
    if (srcAspect > targetAspect) {
      sw = srcH * targetAspect
      sx = (srcW - sw) * 0.5
    } else {
      sh = srcW / targetAspect
      sy = (srcH - sh) * 0.5
    }
    ctx.drawImage(sceneCanvas, sx, sy, sw, sh, padX, padTop, snapW, snapH)

    // Inner photo frame stroke
    ctx.strokeStyle = 'rgba(28, 31, 26, 0.14)'
    ctx.lineWidth = 2
    ctx.strokeRect(padX, padTop, snapW, snapH)

    // Caption area
    const palette = resolvePalette(config.biome, config.carrier)
    const timeMeta = TIME_OF_DAY_OPTIONS.find((t) => t.id === (config.timeOfDay ?? 'day'))
    const badgeTxt = `${palette.terrain.label} · ${palette.realm.label} · ${timeMeta?.short ?? '☀️ 正午'}`

    ctx.fillStyle = '#1C1F1A'
    ctx.font = '600 44px Georgia, "Songti SC", serif'
    ctx.fillText(`${config.name}.`, padX + 8, padTop + snapH + 74)

    ctx.fillStyle = '#6B7064'
    ctx.font = '500 22px "PingFang SC", "Helvetica Neue", sans-serif'
    ctx.fillText(config.tagline.slice(0, 56), padX + 8, padTop + snapH + 116)

    // Right stamp badge
    ctx.fillStyle = '#E8643A'
    ctx.font = '700 20px "PingFang SC", "Helvetica Neue", sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(badgeTxt, outW - padX - 8, padTop + snapH + 68)

    ctx.fillStyle = '#8C8577'
    ctx.font = '600 16px ui-monospace, SFMono-Regular, Menlo, monospace'
    ctx.fillText('B-612 · 3D ISLAND STUDIO POSTCARD', outW - padX - 8, padTop + snapH + 112)
    ctx.textAlign = 'left'

    const dataUrl = offscreen.toDataURL('image/png')
    const a = document.createElement('a')
    const safeName = (config.name || 'island').replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '-')
    a.href = dataUrl
    a.download = `${safeName}-3d-island-postcard.png`
    document.body.appendChild(a)
    a.click()
    a.remove()

    showToast('📸 已生成拍立得岛屿明信片并开始下载！')
  }

  function persistConfig(): void {
    try {
      window.localStorage.setItem(PROFILE_STORAGE_KEY, serializeProfileJson(config))
    } catch {
      // Ignore storage quota errors in restricted environments
    }
  }

  function renderHeroQuickStrip(): void {
    if (!heroQuickStrip) return
    heroQuickStrip.innerHTML = ''
    const labelEl = createEl('span', 'hero-quick-label', '✦ 预设模板：')
    heroQuickStrip.appendChild(labelEl)
    for (const preset of GENERIC_PERSONA_PRESETS) {
      const isCurrent = config.name === preset.profile.name
      const pill = createEl(
        'button',
        `hero-quick-pill ${isCurrent ? 'active' : ''}`,
        preset.shortLabel,
      )
      pill.type = 'button'
      pill.dataset.personaId = preset.id
      pill.title = `${preset.label} — ${preset.description}`
      pill.addEventListener('click', () => {
        stopGuidedTour(true)
        config = structuredClone(preset.profile)
        soundFx.playSelectChime()
        applyConfigChange(false)
        showToast(`✨ 已切换为「${preset.label}」3D 人生世界模板`)
      })
      heroQuickStrip.appendChild(pill)
    }
  }

  function updateHeaderAndHint(level: WorldLevel = world.getLevel()): void {
    const palette = resolvePalette(config.biome, config.carrier)
    const timeMeta = TIME_OF_DAY_OPTIONS.find((t) => t.id === (config.timeOfDay ?? 'day'))
    const timeSuffix = timeMeta && timeMeta.id !== 'day' ? ` · ${timeMeta.short}` : ''
    badgeEl.textContent = `${palette.terrain.label} · ${palette.realm.label}${timeSuffix}`
    nameEl.innerHTML = formatNameWithAccentDot(config.name)
    taglineEl.textContent = config.tagline
    ghLink.href = config.github
    if (liLink) liLink.href = config.linkedin
    renderHeroQuickStrip()

    if (isBuildMode) {
      hintEl.textContent =
        '🛠 建造模式：点击场景中的 3D 建筑，左侧直接看图点选换楼，右侧可旋转朝向、调换槽位与修改文案'
    } else if (level === 'ground') {
      hintEl.textContent = `拖拽旋转 · 点击建筑查看履历 · 点击「${palette.realm.ctaEnter}」探索第二秘境`
    } else {
      hintEl.textContent = `当前位于第二秘境 · 点击展台查看作品与产品链接 · 点击「${palette.realm.ctaExit}」返回主世界`
    }
  }

  function renderSimsBuildUi(): void {
    if (!simsBuildBar || !simsCatalogDock || !simsSlotPills || !simsCatalogGrid) return
    simsBuildBar.hidden = !isBuildMode
    simsCatalogDock.hidden = !isBuildMode
    document.body.classList.toggle('build-mode', isBuildMode)
    if (!isBuildMode) return

    const activePlaces = getActivePlaces(config)
    simsSlotPills.innerHTML = ''

    const worldPill = createEl(
      'button',
      `sims-slot-pill world-pill ${currentSelectedId === 'world-terrain' ? 'active' : ''}`,
      '🌍 世界地形与外围岛',
    )
    worldPill.type = 'button'
    worldPill.dataset.slotId = 'world-terrain'
    worldPill.addEventListener('click', () => {
      soundFx.playSelectChime()
      selectById('world-terrain')
    })
    simsSlotPills.appendChild(worldPill)

    const decorCount = (config.decorProps ?? []).length
    const decorPill = createEl(
      'button',
      `sims-slot-pill decor-pill ${currentSelectedId === 'island-decor' ? 'active' : ''}`,
      `🌸 岛屿装扮 (${decorCount}/6)`,
    )
    decorPill.type = 'button'
    decorPill.dataset.slotId = 'island-decor'
    decorPill.addEventListener('click', () => {
      soundFx.playSelectChime()
      selectById('island-decor')
    })
    simsSlotPills.appendChild(decorPill)

    for (const place of activePlaces) {
      const icon =
        place.kind === 'education' ? '🎓' : place.kind === 'landmark' ? '🏮' : '🏢'
      const pill = createEl(
        'button',
        `sims-slot-pill ${currentSelectedId === place.id ? 'active' : ''}`,
        `${icon} ${place.short ?? place.name}`,
      )
      pill.type = 'button'
      pill.dataset.slotId = place.id
      pill.addEventListener('click', () => {
        soundFx.playSelectChime()
        selectById(place.id)
      })
      simsSlotPills.appendChild(pill)
    }

    for (const proj of config.projects) {
      const pill = createEl(
        'button',
        `sims-slot-pill project-pill ${currentSelectedId === proj.id ? 'active' : ''}`,
        `🚀 ${proj.name}`,
      )
      pill.type = 'button'
      pill.dataset.slotId = proj.id
      pill.addEventListener('click', () => {
        soundFx.playSelectChime()
        selectById(proj.id)
      })
      simsSlotPills.appendChild(pill)
    }

    // Populate Left Visual Catalog Dock strictly by the selected entity's category
    const place = currentSelectedId
      ? activePlaces.find((p) => p.id === currentSelectedId)
      : undefined
    const project = currentSelectedId
      ? config.projects.find((p) => p.id === currentSelectedId)
      : undefined

    simsCatalogGrid.innerHTML = ''
    if (currentSelectedId === 'world-terrain') {
      if (simsCatalogEyebrow) {
        simsCatalogEyebrow.textContent = 'WORLD TOPOLOGY CATALOG · 主岛地形轮廓库（6款）'
      }
      if (simsCatalogTitle) {
        simsCatalogTitle.textContent = '🌍 主岛地形轮廓 · 6 款非圆盘版型可选'
      }
      if (simsCatalogSubtitle) {
        simsCatalogSubtitle.textContent =
          '彻底打破单一大圆盘！点击切换星罗三岛、B-612星丘、红岩峡谷、U型雪湾、新月内海湾与天空方舟台。'
      }

      const activeShape = resolveWorldShape(config.biome, config.worldShape)
      for (const opt of WORLD_SHAPE_OPTIONS) {
        const isCurrent = activeShape === opt.id
        const card = createEl('button', `sims-card ${isCurrent ? 'active' : ''}`)
        card.type = 'button'
        card.dataset.shapeId = opt.id

        const thumb = createEl('div', 'sims-card-thumb')
        thumb.innerHTML = renderStylePreviewSvg(opt.id, opt.colors)
        const statusBadge = createEl(
          'span',
          `sims-card-badge ${isCurrent ? 'current' : ''}`,
          isCurrent ? '✓ 当前地形' : '点击切换',
        )
        thumb.appendChild(statusBadge)

        const titleEl = createEl('div', 'sims-card-title', opt.shortLabel)
        const hintText = createEl('div', 'sims-card-hint', opt.propHint)
        card.append(thumb, titleEl, hintText)

        card.addEventListener('click', () => {
          if (resolveWorldShape(config.biome, config.worldShape) === opt.id) return
          config.worldShape = opt.id
          soundFx.playSelectChime()
          persistConfig()
          renderStudioControls()
          world.rebuild(config, false)
          renderSimsBuildUi()
          renderLiveInspector('world-terrain')
        })

        simsCatalogGrid.appendChild(card)
      }
    } else if (currentSelectedId === 'island-decor') {
      if (simsCatalogEyebrow) {
        simsCatalogEyebrow.textContent = 'ISLAND DECOR CATALOG · 岛屿装扮与萌宠摆件库'
      }
      if (simsCatalogTitle) {
        simsCatalogTitle.textContent = '🌸 岛屿装扮 · 6 款 3D 景观小品可多选'
      }
      if (simsCatalogSubtitle) {
        simsCatalogSubtitle.textContent =
          '点击图卡即可在主岛空地摆放或收回 B-612 玻璃罩玫瑰、小狐狸长椅、樱花林、篝火帐篷、风车与柯基犬。'
      }

      const activeDecors = new Set(config.decorProps ?? [])
      for (const opt of DECOR_PROP_OPTIONS) {
        const isCurrent = activeDecors.has(opt.id)
        const card = createEl('button', `sims-card ${isCurrent ? 'active' : ''}`)
        card.type = 'button'
        card.dataset.decorId = opt.id

        const thumb = createEl('div', 'sims-card-thumb')
        thumb.innerHTML = renderStylePreviewSvg(opt.id, opt.colors)
        const statusBadge = createEl(
          'span',
          `sims-card-badge ${isCurrent ? 'current' : ''}`,
          isCurrent ? '✓ 已摆上岛' : '+ 点击摆放',
        )
        thumb.appendChild(statusBadge)

        const titleEl = createEl('div', 'sims-card-title', opt.shortLabel)
        const hintText = createEl('div', 'sims-card-hint', opt.propHint)
        card.append(thumb, titleEl, hintText)

        card.addEventListener('click', () => {
          config = toggleDecorPropInProfile(config, opt.id)
          soundFx.playSelectChime()
          persistConfig()
          world.rebuild(config, true)
          renderSimsBuildUi()
          renderLiveInspector('island-decor')
        })

        simsCatalogGrid.appendChild(card)
      }
    } else if (place) {
      const meta = getKindMeta(place.kind)
      if (simsCatalogEyebrow) simsCatalogEyebrow.textContent = meta.badge
      if (simsCatalogTitle) {
        simsCatalogTitle.textContent = `${meta.icon} ${place.short ?? place.name} · 建筑图鉴`
      }
      if (simsCatalogSubtitle) simsCatalogSubtitle.textContent = meta.sub

      const strictOptions = getBuildingStyleOptionsForKind(place.kind)
      for (const opt of strictOptions) {
        const isCurrent = place.style === opt.id
        const card = createEl('button', `sims-card ${isCurrent ? 'active' : ''}`)
        card.type = 'button'
        card.dataset.styleId = opt.id
        card.dataset.category = opt.category

        const thumb = createEl('div', 'sims-card-thumb')
        thumb.innerHTML = renderStylePreviewSvg(opt.id, opt.colors)

        const statusBadge = createEl(
          'span',
          `sims-card-badge ${isCurrent ? 'current' : ''}`,
          isCurrent ? '✓ 当前建筑' : '点击换装',
        )
        thumb.appendChild(statusBadge)

        const titleEl = createEl('div', 'sims-card-title', opt.shortLabel)
        const hintText = createEl('div', 'sims-card-hint', opt.propHint)
        card.append(thumb, titleEl, hintText)

        card.addEventListener('click', () => {
          const targetPlace = config.places.find((p) => p.id === place.id)
          if (!targetPlace || targetPlace.style === opt.id) return
          targetPlace.style = opt.id
          soundFx.playSelectChime()
          persistConfig()
          renderListView()
          renderCustomizeDrawer()
          world.rebuild(config, true)
          renderSimsBuildUi()
          renderLiveInspector(place.id)
        })

        simsCatalogGrid.appendChild(card)
      }

      // Append the "Custom University / Enterprise 3D Building (AI Prompt or Contact Author)" card at the end of the catalog
      const customCard = createEl('button', 'sims-card sims-card-custom-cta')
      customCard.type = 'button'
      customCard.id = 'sims-custom-building-cta'
      const customThumb = createEl('div', 'sims-card-thumb')
      customThumb.innerHTML = `<svg viewBox="0 0 120 80" aria-hidden="true">
        <ellipse cx="60" cy="68" rx="44" ry="8" fill="#FDE68A" opacity="0.45"/>
        <rect x="34" y="24" width="52" height="40" rx="6" fill="#FFF7ED" stroke="#EA580C" stroke-width="2" stroke-dasharray="4 3"/>
        <path d="M60 34 L63 43 L72 46 L63 49 L60 58 L57 49 L48 46 L57 43 Z" fill="#EA580C"/>
      </svg>`
      const customBadge = createEl('span', 'sims-card-badge current', '✨ AI / 专属定制')
      customThumb.appendChild(customBadge)
      const customTitle = createEl('div', 'sims-card-title', '定制专属母校 / 企业大楼')
      const customHint = createEl(
        'div',
        'sims-card-hint',
        '没有你的母校或公司？一键复制 AI 建模提示词自行生成，或联系作者专属定制',
      )
      customCard.append(customThumb, customTitle, customHint)
      customCard.addEventListener('click', () => {
        soundFx.playSelectChime()
        openCustomBuildingGuideModal(place.kind)
      })
      simsCatalogGrid.appendChild(customCard)
    } else if (project) {
      if (simsCatalogEyebrow) {
        simsCatalogEyebrow.textContent = 'PROJECT BOOTH CATALOG · 第二秘境作品展台库'
      }
      if (simsCatalogTitle) {
        simsCatalogTitle.textContent = `🚀 ${project.name} · 3D 展台图鉴`
      }
      if (simsCatalogSubtitle) {
        simsCatalogSubtitle.textContent =
          '共 5 款全息与机械互动展台可选，点击图卡即刻替换第二秘境中的 3D 展台。'
      }

      for (const opt of PROJECT_BOOTH_OPTIONS) {
        const isCurrent = (project.boothStyle ?? 'booth-holo') === opt.id
        const card = createEl('button', `sims-card ${isCurrent ? 'active' : ''}`)
        card.type = 'button'
        card.dataset.boothId = opt.id

        const thumb = createEl('div', 'sims-card-thumb')
        thumb.innerHTML = renderStylePreviewSvg(opt.id, opt.colors)
        const statusBadge = createEl(
          'span',
          `sims-card-badge ${isCurrent ? 'current' : ''}`,
          isCurrent ? '✓ 当前展台' : '点击换装',
        )
        thumb.appendChild(statusBadge)

        const titleEl = createEl('div', 'sims-card-title', opt.shortLabel)
        const hintText = createEl('div', 'sims-card-hint', opt.propHint)
        card.append(thumb, titleEl, hintText)

        card.addEventListener('click', () => {
          const targetProj = config.projects.find((p) => p.id === project.id)
          if (!targetProj || targetProj.boothStyle === opt.id) return
          targetProj.boothStyle = opt.id
          soundFx.playSelectChime()
          persistConfig()
          renderListView()
          renderCustomizeDrawer()
          world.rebuild(config, true)
          renderSimsBuildUi()
          renderLiveInspector(project.id)
        })

        simsCatalogGrid.appendChild(card)
      }
    }
  }

  function renderLiveInspector(entityId: string): void {
    const activePlaces = getActivePlaces(config)
    const place = activePlaces.find((p) => p.id === entityId)
    const project = config.projects.find((p) => p.id === entityId)
    const isWorld = entityId === 'world-terrain'
    const isDecor = entityId === 'island-decor'
    if (!place && !project && !isWorld && !isDecor) return

    panelBody.innerHTML = ''
    if (isDecor) {
      const currentDecors = config.decorProps ?? []
      panelBody.appendChild(createEl('p', 'kind', '🌸 岛屿装扮与萌宠摆件 · 实时陈列'))
      panelBody.appendChild(
        createEl('h2', 'place-name', `已摆放 ${currentDecors.length} / 6 件景观小品`),
      )
      panelBody.appendChild(
        createEl(
          'p',
          'sims-inspector-sub',
          '在左侧图鉴点击任意小品卡片即可在主岛草坪、河岸与山麓自由摆放或移除，让你的 3D 主页充满生活气息与小王子彩蛋。',
        ),
      )

      const form = createEl('div', 'sims-inspector-form')
      const actionBox = createEl('div', 'sims-layout-tools')
      const head = createEl('div', 'sims-layout-tools-head')
      head.appendChild(createEl('span', undefined, '快捷装扮预设'))
      head.appendChild(
        createEl('span', 'sims-layout-angle', `${currentDecors.length} 件生效中`),
      )
      actionBox.appendChild(head)

      const btnRow = createEl('div', 'sims-layout-btn-row')
      const fillAllBtn = createEl('button', 'sims-tool-btn', '✨ 一键摆满全部 6 件')
      fillAllBtn.type = 'button'
      fillAllBtn.id = 'sims-decor-fill-all'
      fillAllBtn.addEventListener('click', () => {
        config = {
          ...config,
          decorProps: DECOR_PROP_OPTIONS.map((d) => d.id),
        }
        soundFx.playSelectChime()
        persistConfig()
        world.rebuild(config, true)
        renderSimsBuildUi()
        renderLiveInspector('island-decor')
      })

      const clearAllBtn = createEl('button', 'sims-tool-btn', '🧹 清空全部装扮')
      clearAllBtn.type = 'button'
      clearAllBtn.id = 'sims-decor-clear-all'
      clearAllBtn.addEventListener('click', () => {
        config = {
          ...config,
          decorProps: [],
        }
        soundFx.playSelectChime()
        persistConfig()
        world.rebuild(config, true)
        renderSimsBuildUi()
        renderLiveInspector('island-decor')
      })

      btnRow.append(fillAllBtn, clearAllBtn)
      actionBox.appendChild(btnRow)
      form.appendChild(actionBox)

      for (const opt of DECOR_PROP_OPTIONS) {
        const active = currentDecors.includes(opt.id)
        const itemRow = createEl('div', 'cust-card')
        const titleLine = createEl(
          'div',
          'sims-layout-tools-head',
        )
        titleLine.appendChild(createEl('span', undefined, opt.label))
        titleLine.appendChild(
          createEl('span', 'sims-layout-angle', active ? '✓ 已摆上岛' : '未摆放'),
        )
        const descLine = createEl('div', 'sims-card-hint', opt.propHint)
        itemRow.append(titleLine, descLine)
        form.appendChild(itemRow)
      }

      panelBody.appendChild(form)
    } else if (isWorld) {
      const activeShape = resolveWorldShape(config.biome, config.worldShape)
      const shapeMeta = WORLD_SHAPE_OPTIONS.find((w) => w.id === activeShape)
      panelBody.appendChild(createEl('p', 'kind', '🌍 世界地形与外围副岛 · 自由拼装'))
      panelBody.appendChild(createEl('h2', 'place-name', shapeMeta?.shortLabel ?? '主世界地形'))
      panelBody.appendChild(
        createEl(
          'p',
          'sims-inspector-sub',
          '在左侧切换 6 款非圆盘主岛 3D 地形轮廓；在下方自由定制生态、光影时刻与 3 座外围卫星副岛主题。',
        ),
      )

      const form = createEl('div', 'sims-inspector-form')

      // Time of Day selector pills
      const timeField = createEl('div', 'cust-field')
      timeField.appendChild(createEl('label', undefined, '光影时刻（正午 / 第44次日落 / 星空夜景）'))
      const timeRow = createEl('div', 'sims-mini-pill-row')
      const curTime = config.timeOfDay ?? 'day'
      for (const tOpt of TIME_OF_DAY_OPTIONS) {
        const tBtn = createEl(
          'button',
          `chip ${curTime === tOpt.id ? 'active' : ''}`,
          tOpt.short,
        )
        tBtn.type = 'button'
        tBtn.addEventListener('click', () => {
          config.timeOfDay = tOpt.id
          soundFx.playSelectChime()
          persistConfig()
          renderStudioControls()
          world.rebuild(config, false)
          renderSimsBuildUi()
          renderLiveInspector('world-terrain')
          updateHeaderAndHint()
        })
        timeRow.appendChild(tBtn)
      }
      timeField.appendChild(timeRow)
      form.appendChild(timeField)

      // Biome selector pills
      const biomeField = createEl('div', 'cust-field')
      biomeField.appendChild(createEl('label', undefined, '主世界生态环境（4 选 1）'))
      const biomeRow = createEl('div', 'sims-mini-pill-row')
      for (const bOpt of BIOME_OPTIONS) {
        const bBtn = createEl(
          'button',
          `chip ${config.biome === bOpt.id ? 'active' : ''}`,
          bOpt.label,
        )
        bBtn.type = 'button'
        bBtn.addEventListener('click', () => {
          config.biome = bOpt.id
          config.worldShape = resolveWorldShape(bOpt.id)
          soundFx.playSelectChime()
          persistConfig()
          renderStudioControls()
          world.rebuild(config, false)
          renderSimsBuildUi()
          renderLiveInspector('world-terrain')
        })
        biomeRow.appendChild(bBtn)
      }
      biomeField.appendChild(biomeRow)
      form.appendChild(biomeField)

      // 3 Customizable Satellite Outposts
      const currentSats = resolveSatellites(config.biome, config.satellites)
      const satLabels = [
        '西侧卫星副岛（左岸远景 / 缆车与跨海桥端）',
        '东北卫星副岛（右岸远景 / 渡轮航线端）',
        '西南前景礁湾岛（左下近景地标岛）',
      ]
      satLabels.forEach((labelTxt, satIdx) => {
        const satField = createEl('div', 'cust-field')
        satField.appendChild(createEl('label', undefined, labelTxt))
        const satSelect = createEl('select') as HTMLSelectElement
        for (const sOpt of SATELLITE_THEME_OPTIONS) {
          const optEl = createEl('option', undefined, `${sOpt.shortLabel} — ${sOpt.propHint}`)
          optEl.value = sOpt.id
          if (currentSats[satIdx] === sOpt.id) optEl.selected = true
          satSelect.appendChild(optEl)
        }
        satSelect.addEventListener('change', () => {
          const nextSats = resolveSatellites(config.biome, config.satellites)
          nextSats[satIdx] = satSelect.value as SatelliteTheme
          config.satellites = nextSats
          soundFx.playSelectChime()
          persistConfig()
          world.rebuild(config, false)
          renderSimsBuildUi()
          renderLiveInspector('world-terrain')
        })
        satField.appendChild(satSelect)
        form.appendChild(satField)
      })

      panelBody.appendChild(form)
    } else if (place) {
      const styleMeta = BUILDING_STYLE_OPTIONS.find((s) => s.id === place.style)
      const kindTitle =
        place.kind === 'education'
          ? '🎓 求学母校槽位 · 实时属性编辑'
          : place.kind === 'landmark'
            ? '🏮 家乡印记槽位 · 实时属性编辑'
            : '🏢 职业履历槽位 · 实时属性编辑'

      panelBody.appendChild(createEl('p', 'kind', kindTitle))
      panelBody.appendChild(
        createEl('h2', 'place-name', `${place.short ?? place.name}`),
      )
      panelBody.appendChild(
        createEl(
          'p',
          'sims-inspector-sub',
          `当前 3D 模型：${styleMeta?.label ?? place.style}（可在左侧图鉴一键换楼）`,
        ),
      )

      const form = createEl('div', 'sims-inspector-form')

      // Round 6 Gap (d): Building Rotation & Slot-Swap Toolbar
      const layoutTools = createEl('div', 'sims-layout-tools')
      const degOffset = Math.round((((place.rotationOffset ?? 0) * 180) / Math.PI) % 360)
      const normDeg = degOffset < 0 ? degOffset + 360 : degOffset
      const toolsHead = createEl('div', 'sims-layout-tools-head')
      toolsHead.appendChild(createEl('span', undefined, '3D 建筑朝向与地块布局'))
      toolsHead.appendChild(createEl('span', 'sims-layout-angle', `朝向 +${normDeg}°`))
      layoutTools.appendChild(toolsHead)

      const toolsRow = createEl('div', 'sims-layout-btn-row')
      const rotCwBtn = createEl('button', 'sims-tool-btn', '🔄 顺时针旋转 90°')
      rotCwBtn.type = 'button'
      rotCwBtn.id = 'sims-rotate-cw'
      rotCwBtn.addEventListener('click', () => {
        config = rotatePlaceInProfile(config, place.id, Math.PI / 2)
        soundFx.playSelectChime()
        persistConfig()
        world.rebuild(config, true)
        renderSimsBuildUi()
        renderLiveInspector(place.id)
      })
      const rotCcwBtn = createEl('button', 'sims-tool-btn', '↺ 逆时针旋转 90°')
      rotCcwBtn.type = 'button'
      rotCcwBtn.id = 'sims-rotate-ccw'
      rotCcwBtn.addEventListener('click', () => {
        config = rotatePlaceInProfile(config, place.id, -Math.PI / 2)
        soundFx.playSelectChime()
        persistConfig()
        world.rebuild(config, true)
        renderSimsBuildUi()
        renderLiveInspector(place.id)
      })
      toolsRow.append(rotCwBtn, rotCcwBtn)

      if (place.kind === 'career' && config.companyCount > 1) {
        const swapPrevBtn = createEl('button', 'sims-tool-btn', '⬅ 槽位前移')
        swapPrevBtn.type = 'button'
        swapPrevBtn.id = 'sims-swap-prev'
        swapPrevBtn.addEventListener('click', () => {
          config = swapPlaceOrderInProfile(config, place.id, -1)
          soundFx.playSelectChime()
          persistConfig()
          renderListView()
          renderCustomizeDrawer()
          world.rebuild(config, true)
          renderSimsBuildUi()
          renderLiveInspector(place.id)
        })
        const swapNextBtn = createEl('button', 'sims-tool-btn', '槽位后移 ➡')
        swapNextBtn.type = 'button'
        swapNextBtn.id = 'sims-swap-next'
        swapNextBtn.addEventListener('click', () => {
          config = swapPlaceOrderInProfile(config, place.id, 1)
          soundFx.playSelectChime()
          persistConfig()
          renderListView()
          renderCustomizeDrawer()
          world.rebuild(config, true)
          renderSimsBuildUi()
          renderLiveInspector(place.id)
        })
        toolsRow.append(swapPrevBtn, swapNextBtn)
      }
      layoutTools.appendChild(toolsRow)

      // Round 8 Gap (b): Sims Builder 3.0 — 6 Architectural Color Swatches (tintPreset)
      const activeTint = place.tintPreset ?? 'default'
      const tintHead = createEl('div', 'sims-layout-tools-head sims-subhead')
      tintHead.appendChild(createEl('span', undefined, '🎨 建筑外墙与屋顶色盘'))
      const activeTintOpt = BUILDING_TINT_OPTIONS.find((t) => t.id === activeTint)
      tintHead.appendChild(createEl('span', 'sims-layout-angle', activeTintOpt?.label ?? '原生色'))
      layoutTools.appendChild(tintHead)

      const swatchRow = createEl('div', 'sims-swatch-row')
      swatchRow.id = 'sims-tint-swatches'
      for (const tOpt of BUILDING_TINT_OPTIONS) {
        const swatchBtn = createEl(
          'button',
          `sims-swatch-btn ${activeTint === tOpt.id ? 'active' : ''}`,
          tOpt.label,
        )
        swatchBtn.type = 'button'
        swatchBtn.dataset.tintId = tOpt.id
        swatchBtn.style.setProperty('--swatch-color', tOpt.swatch)
        swatchBtn.addEventListener('click', () => {
          config = setPlaceTintInProfile(config, place.id, tOpt.id)
          soundFx.playSelectChime()
          persistConfig()
          world.rebuild(config, true)
          renderSimsBuildUi()
          renderLiveInspector(place.id)
        })
        swatchRow.appendChild(swatchBtn)
      }
      layoutTools.appendChild(swatchRow)

      // Round 8 Gap (b): 8-Directional Fine Position Nudging (offsetX / offsetZ ∈ [-2.0, 2.0]) + Scale Toggle (0.85x / 1.0x / 1.15x)
      const curOx = place.offsetX ?? 0
      const curOz = place.offsetZ ?? 0
      const nudgeHead = createEl('div', 'sims-layout-tools-head sims-subhead')
      nudgeHead.appendChild(createEl('span', undefined, '🧭 八向微调坐标与建筑缩放'))
      nudgeHead.appendChild(
        createEl(
          'span',
          'sims-layout-angle',
          `偏移 (${curOx >= 0 ? '+' : ''}${curOx.toFixed(1)}, ${curOz >= 0 ? '+' : ''}${curOz.toFixed(1)})`,
        ),
      )
      layoutTools.appendChild(nudgeHead)

      const nudgeWrap = createEl('div', 'sims-nudge-scale-wrap')
      const dpad = createEl('div', 'sims-nudge-grid')
      dpad.id = 'sims-nudge-grid'
      const step = 0.4
      const dirs: Array<{ label: string; dx: number; dz: number; reset?: boolean; id: string }> = [
        { label: '↖', dx: -step, dz: -step, id: 'nudge-nw' },
        { label: '↑', dx: 0, dz: -step, id: 'nudge-n' },
        { label: '↗', dx: step, dz: -step, id: 'nudge-ne' },
        { label: '←', dx: -step, dz: 0, id: 'nudge-w' },
        { label: '复位', dx: 0, dz: 0, reset: true, id: 'nudge-reset' },
        { label: '→', dx: step, dz: 0, id: 'nudge-e' },
        { label: '↙', dx: -step, dz: step, id: 'nudge-sw' },
        { label: '↓', dx: 0, dz: step, id: 'nudge-s' },
        { label: '↘', dx: step, dz: step, id: 'nudge-se' },
      ]
      for (const d of dirs) {
        const dBtn = createEl(
          'button',
          `sims-nudge-btn ${d.reset ? 'reset' : ''}`,
          d.label,
        )
        dBtn.type = 'button'
        dBtn.id = `sims-${d.id}`
        dBtn.addEventListener('click', () => {
          config = nudgePlaceInProfile(config, place.id, d.dx, d.dz, Boolean(d.reset))
          soundFx.playSelectChime()
          persistConfig()
          world.rebuild(config, true)
          renderSimsBuildUi()
          renderLiveInspector(place.id)
        })
        dpad.appendChild(dBtn)
      }
      nudgeWrap.appendChild(dpad)

      const scaleCol = createEl('div', 'sims-scale-col')
      const curScale = place.buildingScale ?? 1.0
      for (const sVal of [0.85, 1.0, 1.15] as const) {
        const isScaleActive = Math.abs(curScale - sVal) < 0.03
        const sBtn = createEl(
          'button',
          `sims-tool-btn sims-scale-btn ${isScaleActive ? 'active' : ''}`,
          `尺寸 ${sVal.toFixed(2)}x`,
        )
        sBtn.type = 'button'
        sBtn.dataset.scaleVal = String(sVal)
        sBtn.addEventListener('click', () => {
          config = setPlaceScaleInProfile(config, place.id, sVal)
          soundFx.playSelectChime()
          persistConfig()
          world.rebuild(config, true)
          renderSimsBuildUi()
          renderLiveInspector(place.id)
        })
        scaleCol.appendChild(sBtn)
      }
      nudgeWrap.appendChild(scaleCol)
      layoutTools.appendChild(nudgeWrap)

      form.appendChild(layoutTools)

      const shortField = createEl('div', 'cust-field')
      shortField.appendChild(createEl('label', undefined, '3D 浮标与门头铭牌短名'))
      const shortInput = createEl('input') as HTMLInputElement
      shortInput.type = 'text'
      shortInput.value = place.short ?? place.name
      shortField.appendChild(shortInput)

      const nameField = createEl('div', 'cust-field')
      nameField.appendChild(createEl('label', undefined, '机构 / 学校 / 家乡完整名称'))
      const nameInput = createEl('input') as HTMLInputElement
      nameInput.type = 'text'
      nameInput.value = place.name
      nameField.appendChild(nameInput)

      const roleField = createEl('div', 'cust-field')
      roleField.appendChild(createEl('label', undefined, '职位 / 学位 / 身份头衔'))
      const roleInput = createEl('input') as HTMLInputElement
      roleInput.type = 'text'
      roleInput.value = place.roles[0]?.title ?? ''
      roleField.appendChild(roleInput)

      const periodField = createEl('div', 'cust-field')
      periodField.appendChild(createEl('label', undefined, '年份 / 阶段与城市'))
      const periodInput = createEl('input') as HTMLInputElement
      periodInput.type = 'text'
      periodInput.value = place.roles[0]?.period ?? ''
      periodField.appendChild(periodInput)

      const notesField = createEl('div', 'cust-field')
      notesField.appendChild(createEl('label', undefined, '核心故事与亮点（每行一条）'))
      const notesArea = createEl('textarea') as HTMLTextAreaElement
      notesArea.rows = 3
      notesArea.value = (place.roles[0]?.notes ?? []).join('\n')
      notesField.appendChild(notesArea)

      const linkField = createEl('div', 'cust-field')
      linkField.appendChild(createEl('label', undefined, '外部主页 / 产品详情链接（URL）'))
      const linkInput = createEl('input') as HTMLInputElement
      linkInput.type = 'url'
      linkInput.placeholder = 'https://...'
      linkInput.value = place.link ?? ''
      linkField.appendChild(linkInput)

      const applyLivePlaceEdit = () => {
        const target = config.places.find((p) => p.id === place.id)
        if (!target) return
        if (shortInput.value.trim()) target.short = shortInput.value.trim()
        if (nameInput.value.trim()) target.name = nameInput.value.trim()
        if (!target.roles[0]) target.roles[0] = { title: target.name }
        if (roleInput.value.trim()) target.roles[0].title = roleInput.value.trim()
        target.roles[0].period = periodInput.value.trim() || undefined
        const lines = notesArea.value
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
        if (lines.length > 0) target.roles[0].notes = lines
        target.link = linkInput.value.trim() || undefined

        persistConfig()
        renderListView()
        renderCustomizeDrawer()
        world.rebuild(config, true)
        renderSimsBuildUi()
      }

      const saveBtn = createEl('button', 'btn-primary sims-save-btn', '✓ 实时更新此建筑文案与铭牌')
      saveBtn.type = 'button'
      saveBtn.addEventListener('click', () => {
        soundFx.playSelectChime()
        applyLivePlaceEdit()
        renderLiveInspector(place.id)
      })

      form.append(shortField, nameField, roleField, periodField, notesField, linkField, saveBtn)
      panelBody.appendChild(form)

      const previewCta = createEntityCtaRow(place.link, '测试访问外链 ↗')
      if (previewCta) panelBody.appendChild(previewCta)
    } else if (project) {
      const boothMeta = PROJECT_BOOTH_OPTIONS.find((b) => b.id === project.boothStyle)
      panelBody.appendChild(createEl('p', 'kind', '🚀 第二秘境作品槽位 · 实时属性编辑'))
      panelBody.appendChild(createEl('h2', 'place-name', project.name))
      panelBody.appendChild(
        createEl(
          'p',
          'sims-inspector-sub',
          `当前 3D 展台：${boothMeta?.label ?? project.boothStyle}（可在左侧图鉴一键换展台）`,
        ),
      )

      const form = createEl('div', 'sims-inspector-form')

      const nameField = createEl('div', 'cust-field')
      nameField.appendChild(createEl('label', undefined, '作品名称'))
      const nameInput = createEl('input') as HTMLInputElement
      nameInput.type = 'text'
      nameInput.value = project.name
      nameField.appendChild(nameInput)

      const tagField = createEl('div', 'cust-field')
      tagField.appendChild(createEl('label', undefined, '作品分类标签（如 AI Agent / WebGL）'))
      const tagInput = createEl('input') as HTMLInputElement
      tagInput.type = 'text'
      tagInput.value = project.tag ?? ''
      tagField.appendChild(tagInput)

      const sumField = createEl('div', 'cust-field')
      sumField.appendChild(createEl('label', undefined, '一句话作品亮点介绍'))
      const sumArea = createEl('textarea') as HTMLTextAreaElement
      sumArea.rows = 3
      sumArea.value = project.summary
      sumField.appendChild(sumArea)

      const linkField = createEl('div', 'cust-field')
      linkField.appendChild(createEl('label', undefined, '产品体验链接（立即访问产品 ↗）'))
      const linkInput = createEl('input') as HTMLInputElement
      linkInput.type = 'url'
      linkInput.placeholder = 'https://...'
      linkInput.value = project.link ?? ''
      linkField.appendChild(linkInput)

      const repoField = createEl('div', 'cust-field')
      repoField.appendChild(createEl('label', undefined, 'GitHub 源码 / 详情链接（源码 / 详情 ↗）'))
      const repoInput = createEl('input') as HTMLInputElement
      repoInput.type = 'url'
      repoInput.placeholder = 'https://github.com/...'
      repoInput.value = project.repoUrl ?? ''
      repoField.appendChild(repoInput)

      const saveBtn = createEl('button', 'btn-primary sims-save-btn', '✓ 实时更新此作品展台与链接')
      saveBtn.type = 'button'
      saveBtn.addEventListener('click', () => {
        const target = config.projects.find((p) => p.id === project.id)
        if (!target) return
        if (nameInput.value.trim()) target.name = nameInput.value.trim()
        target.tag = tagInput.value.trim() || undefined
        if (sumArea.value.trim()) target.summary = sumArea.value.trim()
        target.link = linkInput.value.trim() || undefined
        target.repoUrl = repoInput.value.trim() || undefined
        soundFx.playSelectChime()
        persistConfig()
        renderListView()
        renderCustomizeDrawer()
        world.rebuild(config, true)
        renderSimsBuildUi()
        renderLiveInspector(project.id)
      })

      form.append(nameField, tagField, sumField, linkField, repoField, saveBtn)
      panelBody.appendChild(form)

      const previewCta = createEntityCtaRow(
        project.link,
        '立即访问产品 ↗',
        project.repoUrl,
        '源码 / 详情 ↗',
      )
      if (previewCta) panelBody.appendChild(previewCta)
    }

    panelEl.hidden = false
  }

  function setBuildMode(nextBuildMode: boolean, targetId?: string): void {
    isBuildMode = nextBuildMode
    custDrawer.hidden = true
    document.body.classList.toggle('build-mode', isBuildMode)

    if (isBuildMode) {
      const activePlaces = getActivePlaces(config)
      const matchedTarget =
        targetId === 'world-terrain' || targetId === 'world'
          ? 'world-terrain'
          : targetId === 'island-decor' || targetId === 'decor'
            ? 'island-decor'
            : targetId
              ? (activePlaces.find(
                  (p) =>
                    p.id === targetId ||
                    p.kind === targetId ||
                    p.id.includes(targetId) ||
                    targetId.includes(p.id),
                )?.id ??
                config.projects.find(
                  (pr) => pr.id === targetId || pr.id.includes(targetId) || targetId.includes(pr.id),
                )?.id)
              : undefined
      const defaultId =
        matchedTarget ??
        currentSelectedId ??
        (world.getLevel() === 'realm'
          ? config.projects[0]?.id
          : (activePlaces.find((p) => p.kind === 'landmark') ?? activePlaces[0])?.id) ??
        null
      selectById(defaultId)
      renderSimsBuildUi()
    } else {
      if (simsBuildBar) simsBuildBar.hidden = true
      if (simsCatalogDock) simsCatalogDock.hidden = true
      selectById(null)
    }
    updateHeaderAndHint()
  }

  function renderCustomizeDrawer(): void {
    custNameInput.value = config.name
    custTaglineInput.value = config.tagline
    custJsonArea.value = serializeProfileJson(config)

    custPlacesList.innerHTML = ''
    const activePlaces = getActivePlaces(config)
    for (const place of activePlaces) {
      const card = createEl('div', 'cust-card')
      const topRow = createEl('div', 'cust-item')
      const badge =
        place.kind === 'education' ? '求学' : place.kind === 'landmark' ? '家乡' : '公司'
      const label = createEl('span', 'cust-badge', badge)

      const shortInput = createEl('input', 'cust-input-short') as HTMLInputElement
      shortInput.type = 'text'
      shortInput.value = place.short ?? place.name
      shortInput.placeholder = '浮标短名'
      shortInput.dataset.placeId = place.id
      shortInput.dataset.field = 'short'

      // STRICT CATEGORY FILTERING: never mix education, landmark, and career options!
      const styleSelect = createEl('select', 'cust-select') as HTMLSelectElement
      styleSelect.dataset.placeId = place.id
      styleSelect.dataset.field = 'style'
      const strictKindOptions = getBuildingStyleOptionsForKind(place.kind)
      for (const opt of strictKindOptions) {
        const optionEl = createEl('option', undefined, opt.label) as HTMLOptionElement
        optionEl.value = opt.id
        if (opt.id === place.style) optionEl.selected = true
        styleSelect.appendChild(optionEl)
      }
      topRow.append(label, shortInput, styleSelect)

      const midRow = createEl('div', 'cust-subrow')
      const roleInput = createEl('input', 'cust-input-main') as HTMLInputElement
      roleInput.type = 'text'
      roleInput.value = place.roles[0]?.title ?? place.name
      roleInput.placeholder = '职位 / 学位 / 身份头衔'
      roleInput.dataset.placeId = place.id
      roleInput.dataset.field = 'roleTitle'

      const periodInput = createEl('input', 'cust-input-short') as HTMLInputElement
      periodInput.type = 'text'
      periodInput.value = place.roles[0]?.period ?? ''
      periodInput.placeholder = '年份 / 阶段'
      periodInput.dataset.placeId = place.id
      periodInput.dataset.field = 'period'
      midRow.append(roleInput, periodInput)

      const linkInput = createEl('input', 'cust-input-link') as HTMLInputElement
      linkInput.type = 'url'
      linkInput.value = place.link ?? ''
      linkInput.placeholder = '外部链接（选填，例如 https://...）'
      linkInput.dataset.placeId = place.id
      linkInput.dataset.field = 'link'

      card.append(topRow, midRow, linkInput)
      custPlacesList.appendChild(card)
    }

    custProjectsList.innerHTML = ''
    if (custAddProjBtn) {
      custAddProjBtn.disabled = config.projects.length >= 6
    }
    for (const proj of config.projects) {
      const card = createEl('div', 'cust-card')
      const topRow = createEl('div', 'cust-item proj-top')
      const label = createEl('span', 'cust-badge accent', '作品')

      const titleInput = createEl('input', 'cust-input-short') as HTMLInputElement
      titleInput.type = 'text'
      titleInput.value = proj.name
      titleInput.placeholder = '作品名称'
      titleInput.dataset.projId = proj.id
      titleInput.dataset.field = 'name'

      const boothSelect = createEl('select', 'cust-select') as HTMLSelectElement
      boothSelect.dataset.projId = proj.id
      boothSelect.dataset.field = 'boothStyle'
      for (const opt of PROJECT_BOOTH_OPTIONS) {
        const optionEl = createEl('option', undefined, opt.label) as HTMLOptionElement
        optionEl.value = opt.id
        if (opt.id === (proj.boothStyle ?? 'booth-holo')) optionEl.selected = true
        boothSelect.appendChild(optionEl)
      }

      topRow.append(label, titleInput, boothSelect)
      if (config.projects.length > 1) {
        const delBtn = createEl('button', 'cust-remove-btn', '×')
        delBtn.type = 'button'
        delBtn.title = '移除该作品展台'
        delBtn.addEventListener('click', () => {
          collectDrawerEdits()
          config.projects = config.projects.filter((p) => p.id !== proj.id)
          applyConfigChange(true)
        })
        topRow.appendChild(delBtn)
      }

      const midRow = createEl('div', 'cust-subrow')
      const tagInput = createEl('input', 'cust-input-short') as HTMLInputElement
      tagInput.type = 'text'
      tagInput.value = proj.tag ?? ''
      tagInput.placeholder = '分类标签（如 AI Agent）'
      tagInput.dataset.projId = proj.id
      tagInput.dataset.field = 'tag'

      const sumInput = createEl('input', 'cust-input-main') as HTMLInputElement
      sumInput.type = 'text'
      sumInput.value = proj.summary
      sumInput.placeholder = '一句话核心亮点说明'
      sumInput.dataset.projId = proj.id
      sumInput.dataset.field = 'summary'
      midRow.append(tagInput, sumInput)

      const linkRow = createEl('div', 'cust-subrow')
      const linkInput = createEl('input', 'cust-input-link') as HTMLInputElement
      linkInput.type = 'url'
      linkInput.value = proj.link ?? ''
      linkInput.placeholder = '产品体验链接 https://...'
      linkInput.dataset.projId = proj.id
      linkInput.dataset.field = 'link'

      const repoInput = createEl('input', 'cust-input-link') as HTMLInputElement
      repoInput.type = 'url'
      repoInput.value = proj.repoUrl ?? ''
      repoInput.placeholder = 'GitHub / 详情链接 https://...'
      repoInput.dataset.projId = proj.id
      repoInput.dataset.field = 'repoUrl'
      linkRow.append(linkInput, repoInput)

      card.append(topRow, midRow, linkRow)
      custProjectsList.appendChild(card)
    }
  }

  function collectDrawerEdits(): void {
    const nextName = custNameInput.value.trim()
    const nextTagline = custTaglineInput.value.trim()
    if (nextName) config.name = nextName
    if (nextTagline) config.tagline = nextTagline

    const placeControls = custPlacesList.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
      '[data-place-id]',
    )
    for (const ctrl of placeControls) {
      const pid = ctrl.dataset.placeId
      const field = ctrl.dataset.field
      const target = config.places.find((p) => p.id === pid)
      if (!target) continue
      const val = ctrl.value.trim()
      if (field === 'short' && val) {
        target.short = val
        target.name = val
      } else if (field === 'style' && val) {
        target.style = val as BuildingStyle
      } else if (field === 'roleTitle' && val && target.roles[0]) {
        target.roles[0].title = val
      } else if (field === 'period' && target.roles[0]) {
        target.roles[0].period = val
      } else if (field === 'link') {
        target.link = val || undefined
      }
    }

    const projControls = custProjectsList.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
      '[data-proj-id]',
    )
    for (const ctrl of projControls) {
      const pid = ctrl.dataset.projId
      const field = ctrl.dataset.field
      const target = config.projects.find((p) => p.id === pid)
      if (!target) continue
      const val = ctrl.value.trim()
      if (field === 'name' && val) {
        target.name = val
      } else if (field === 'boothStyle' && val) {
        target.boothStyle = val as ProjectBoothStyle
      } else if (field === 'tag') {
        target.tag = val || undefined
      } else if (field === 'summary' && val) {
        target.summary = val
      } else if (field === 'link') {
        target.link = val || undefined
      } else if (field === 'repoUrl') {
        target.repoUrl = val || undefined
      }
    }
  }

  function renderListView(): void {
    listBody.innerHTML = ''

    // Generic Template Mode List View with Persona Switcher
    const personaBar = createEl('div', 'resume-action-bar no-print')
    const pStrip = createEl('div', 'resume-demo-pills')
    pStrip.appendChild(createEl('span', 'resume-demo-label', '✦ 切换通用人设模板：'))
    for (const preset of GENERIC_PERSONA_PRESETS) {
      const btn = createEl(
        'button',
        `resume-demo-pill ${config.name === preset.profile.name ? 'active' : ''}`,
        preset.shortLabel,
      )
      btn.type = 'button'
      btn.addEventListener('click', () => {
        config = structuredClone(preset.profile)
        soundFx.playSelectChime()
        applyConfigChange(false)
      })
      pStrip.appendChild(btn)
    }
    personaBar.appendChild(pStrip)
    listBody.appendChild(personaBar)

    listBody.appendChild(createEl('h1', undefined, config.name))
    listBody.appendChild(createEl('p', undefined, config.tagline))

    const activePlaces = getActivePlaces(config)
    const section = (title: string, items: PlaceEntry[]) => {
      if (items.length === 0) return
      listBody.appendChild(createEl('h2', undefined, title))
      for (const item of items) {
        const art = createEl('article')
        const headRow = createEl('div', 'place-header-row list-header-row')
        const logoSpec = getBrandLogoInfo(item.style)
        if (logoSpec && item.kind !== 'landmark') {
          const logoBadge = createEl('span', 'brand-logo-badge')
          logoBadge.dataset.logoId = logoSpec.id
          logoBadge.dataset.svgUrl = logoSpec.svgUrl
          const logoImg = createEl('img', 'brand-logo-img') as HTMLImageElement
          logoImg.src = logoSpec.svgUrl
          logoImg.alt = logoSpec.label
          logoBadge.appendChild(logoImg)
          headRow.appendChild(logoBadge)
        }
        headRow.appendChild(createEl('h3', undefined, item.name))
        art.appendChild(headRow)
        for (const r of item.roles) {
          art.appendChild(renderRole(r))
        }
        const cta = createEntityCtaRow(item.link, '访问官网 ↗')
        if (cta) art.appendChild(cta)
        listBody.appendChild(art)
      }
    }

    section(
      'Experience · 工作经历',
      activePlaces.filter((p) => p.kind === 'career'),
    )
    section(
      'Education · 教育背景',
      activePlaces.filter((p) => p.kind === 'education'),
    )
    section(
      'Landmark · 城市印记',
      activePlaces.filter((p) => p.kind === 'landmark'),
    )

    listBody.appendChild(createEl('h2', undefined, 'Projects · 个人作品与探索'))
    for (const proj of config.projects) {
      const art = createEl('article')
      art.appendChild(createEl('h3', undefined, proj.name))
      art.appendChild(createEl('p', 'summary', proj.summary))
      const cta = createEntityCtaRow(
        proj.link,
        '立即访问产品 ↗',
        proj.repoUrl,
        '源码 / 详情 ↗',
      )
      if (cta) art.appendChild(cta)
      listBody.appendChild(art)
    }
  }

  function renderStudioControls(): void {
    biomeGroup.innerHTML = ''
    for (const opt of BIOME_OPTIONS) {
      const btn = createEl(
        'button',
        `studio-pill ${config.biome === opt.id ? 'active' : ''}`,
        opt.label,
      )
      btn.type = 'button'
      btn.addEventListener('click', () => {
        config = {
          ...config,
          biome: opt.id,
          carrier: opt.defaultCarrier,
          worldShape: resolveWorldShape(opt.id),
        }
        applyConfigChange()
      })
      biomeGroup.appendChild(btn)
    }

    if (worldShapeGroup) {
      worldShapeGroup.innerHTML = ''
      const activeShape = resolveWorldShape(config.biome, config.worldShape)
      for (const opt of WORLD_SHAPE_OPTIONS) {
        const btn = createEl(
          'button',
          `studio-pill ${activeShape === opt.id ? 'active' : ''}`,
          opt.shortLabel,
        )
        btn.type = 'button'
        btn.title = `${opt.label} — ${opt.propHint}`
        btn.dataset.shapeId = opt.id
        btn.addEventListener('click', () => {
          config = {
            ...config,
            worldShape: opt.id,
          }
          applyConfigChange()
        })
        worldShapeGroup.appendChild(btn)
      }
    }

    carrierGroup.innerHTML = ''
    for (const opt of CARRIER_OPTIONS) {
      const btn = createEl(
        'button',
        `studio-pill ${config.carrier === opt.id ? 'active-accent' : ''}`,
        opt.short,
      )
      btn.type = 'button'
      btn.title = opt.label
      btn.addEventListener('click', () => {
        config = {
          ...config,
          carrier: opt.id,
        }
        applyConfigChange()
      })
      carrierGroup.appendChild(btn)
    }

    if (timeOfDayGroup) {
      timeOfDayGroup.innerHTML = ''
      const activeTime = config.timeOfDay ?? 'day'
      for (const opt of TIME_OF_DAY_OPTIONS) {
        const btn = createEl(
          'button',
          `studio-pill ${activeTime === opt.id ? 'active-accent' : ''}`,
          opt.short,
        )
        btn.type = 'button'
        btn.title = opt.label
        btn.addEventListener('click', () => {
          config = {
            ...config,
            timeOfDay: opt.id,
          }
          applyConfigChange()
        })
        timeOfDayGroup.appendChild(btn)
      }
    }

    if (weatherGroup) {
      weatherGroup.innerHTML = ''
      const activeWeather = config.weather ?? 'clear'
      for (const opt of WEATHER_OPTIONS) {
        const btn = createEl(
          'button',
          `studio-pill ${activeWeather === opt.id ? 'active-accent' : ''}`,
          opt.short,
        )
        btn.type = 'button'
        btn.title = opt.label
        btn.dataset.weatherId = opt.id
        btn.addEventListener('click', () => {
          config = {
            ...config,
            weather: opt.id,
          }
          applyConfigChange()
        })
        weatherGroup.appendChild(btn)
      }
    }

    towerCountGroup.innerHTML = ''
    for (const count of [1, 2, 3, 4, 5, 6]) {
      const btn = createEl(
        'button',
        `studio-pill ${config.companyCount === count ? 'active' : ''}`,
        `${count} 栋`,
      )
      btn.type = 'button'
      btn.addEventListener('click', () => {
        config = {
          ...config,
          companyCount: count,
        }
        applyConfigChange()
      })
      towerCountGroup.appendChild(btn)
    }
  }

  function applyConfigChange(keepCustomizeOpen = false): void {
    panelEl.hidden = true
    if (!keepCustomizeOpen) {
      custDrawer.hidden = true
      document.body.classList.remove('has-selection')
    }
    persistConfig()
    renderStudioControls()
    renderListView()
    renderCustomizeDrawer()
    world.rebuild(config, isBuildMode)
    if (isBuildMode) {
      renderSimsBuildUi()
      if (currentSelectedId) renderLiveInspector(currentSelectedId)
    }
    updateHeaderAndHint('ground')
  }

  function openCustomizeDrawer(open: boolean): void {
    if (open) {
      panelEl.hidden = true
      renderCustomizeDrawer()
      custDrawer.hidden = false
      document.body.classList.add('has-selection')
    } else {
      custDrawer.hidden = true
      if (!isBuildMode) {
        document.body.classList.remove('has-selection')
      }
    }
  }

  function selectById(id: string | null): void {
    if (isTourActive) {
      stopGuidedTour(true)
    }
    const activePlaces = getActivePlaces(config)
    const place = id
      ? activePlaces.find((p) => p.id === id) ??
        activePlaces.find((p) => p.style === id || p.id.includes(id) || id.includes(p.id))
      : undefined
    const project = id ? config.projects.find((p) => p.id === id) : undefined
    const isWorld = id === 'world-terrain' && isBuildMode
    const isDecor = id === 'island-decor' && isBuildMode
    const resolvedId = place?.id ?? project?.id ?? id

    const hasMatch = Boolean(place || project || isWorld || isDecor)
    currentSelectedId = hasMatch ? resolvedId : null
    if (hasMatch) custDrawer.hidden = true
    document.body.classList.toggle(
      'has-selection',
      hasMatch || !custDrawer.hidden || isBuildMode,
    )

    if (!place && !project && !isWorld && !isDecor) {
      panelEl.hidden = true
      world.focusEntity(null)
      if (!location.hash.startsWith('#island=')) {
        history.replaceState(null, '', location.pathname + location.search)
      }
    } else if (isBuildMode) {
      renderLiveInspector(resolvedId!)
      renderSimsBuildUi()
      world.focusEntity(
        isWorld || isDecor ? null : resolvedId,
        isWorld || isDecor ? 'ground' : undefined,
      )
      if (!location.hash.startsWith('#island=')) {
        history.replaceState(null, '', `#/${resolvedId}`)
      }
    } else {
      panelBody.replaceChildren(
        ...(place
          ? renderPlaceDetails(place, (targetId) => setBuildMode(true, targetId))
          : renderProjectDetails(project!, (targetId) => setBuildMode(true, targetId))),
      )
      panelEl.hidden = false
      panelEl.scrollTop = 0
      world.focusEntity(resolvedId)
      if (!location.hash.startsWith('#island=')) {
        history.replaceState(null, '', `#/${resolvedId}`)
      }
    }
    updateHeaderAndHint()
  }

  panelClose.addEventListener('click', () => {
    stopGuidedTour(true)
    if (isBuildMode) {
      setBuildMode(false)
    } else {
      selectById(null)
    }
  })
  openListBtn.addEventListener('click', () => {
    stopGuidedTour(true)
    listEl.hidden = false
  })
  listClose.addEventListener('click', () => {
    listEl.hidden = true
  })
  openShowcaseBtn?.addEventListener('click', () => {
    stopGuidedTour(true)
    soundFx.playSelectChime()
    const matchedPreset = GENERIC_PERSONA_PRESETS.find((p) => p.profile.name === config.name)
    const templateKey = matchedPreset?.id ?? 'ai-builder'
    openDemoPreviewModal(
      `/demos/generic-showcase/index.html?template=${templateKey}`,
      `3D Island Studio · ${matchedPreset?.label ?? '作品展台与 JSON 配置蓝图'}`,
    )
  })

  studioToggleBtn?.addEventListener('click', () => {
    if (!studioBar) return
    const collapsed = studioBar.classList.toggle('collapsed')
    studioToggleBtn.textContent = collapsed ? '展开定制 ▾' : '收起 ▴'
  })

  openCustomizeBtn.addEventListener('click', () => {
    stopGuidedTour(true)
    setBuildMode(!isBuildMode)
  })
  simsExitBuildBtn?.addEventListener('click', () => {
    setBuildMode(false)
  })
  simsShareLinkBtn?.addEventListener('click', () => {
    copyShareLink()
  })
  simsExportPostcardBtn?.addEventListener('click', () => {
    exportPolaroidPostcard()
  })
  guidedTourBtn?.addEventListener('click', () => {
    if (isTourActive) {
      stopGuidedTour(false)
    } else {
      startGuidedTour()
    }
  })
  if (toggleAudioBtn) {
    const syncAudioBtnText = () => {
      toggleAudioBtn.textContent = soundscape.isEnabled() ? '🎵 音乐: 开' : '🔇 音乐: 关'
      toggleAudioBtn.title = '点击开关舒缓背景轻音乐（后台自动随机切换曲目）'
    }
    syncAudioBtnText()
    if (soundscape.isEnabled()) {
      soundscape.startBgm()
    }
    toggleAudioBtn.addEventListener('click', () => {
      const enabled = soundscape.toggle()
      if (enabled) {
        soundscape.pickNextRandomStation()
        soundscape.syncAmbientWorld(config.biome, config.carrier, world.getLevel())
        soundscape.startBgm()
      }
      syncAudioBtnText()
      showToast(enabled ? '🎵 已开启背景轻音乐（后台自动随机切换）' : '🔇 已关闭背景轻音乐')
    })
  }
  visitorModeToggleBtn?.addEventListener('click', () => {
    soundFx.playSelectChime()
    setVisitorMode(true)
    showToast('👁 已进入纯享访客预览模式（右上角可返回编辑）')
  })
  visitorExitBtn?.addEventListener('click', () => {
    soundFx.playSelectChime()
    setVisitorMode(false)
  })
  shareLinkBtn?.addEventListener('click', () => {
    copyShareLink()
  })
  exportPostcardBtn?.addEventListener('click', () => {
    exportPolaroidPostcard()
  })

  simsOpenFullFormBtn?.addEventListener('click', () => {
    openCustomizeDrawer(custDrawer.hidden)
  })
  custClose.addEventListener('click', () => {
    openCustomizeDrawer(false)
    if (isBuildMode && currentSelectedId) {
      renderLiveInspector(currentSelectedId)
    }
  })
  custCustomBuildingBtn?.addEventListener('click', () => {
    soundFx.playSelectChime()
    openCustomBuildingGuideModal('career')
  })
  custAddProjBtn?.addEventListener('click', () => {
    collectDrawerEdits()
    if (config.projects.length >= 6) return
    const idx = config.projects.length + 1
    const boothOpt = PROJECT_BOOTH_OPTIONS[(idx - 1) % PROJECT_BOOTH_OPTIONS.length]
    config.projects.push({
      id: `proj-custom-${Date.now().toString(36)}-${idx}`,
      name: `新作品 ${idx}`,
      summary: '在这里填写作品的核心亮点与交互价值。',
      boothStyle: boothOpt.id,
      tag: 'AI Product',
      link: 'https://github.com/jasonz-ai',
    })
    applyConfigChange(true)
  })
  custApplyBtn.addEventListener('click', () => {
    collectDrawerEdits()
    applyConfigChange(true)
  })
  custToggleJsonBtn.addEventListener('click', () => {
    custJsonWrap.hidden = !custJsonWrap.hidden
    if (!custJsonWrap.hidden) {
      custJsonArea.value = serializeProfileJson(config)
    }
  })
  custImportJsonBtn.addEventListener('click', () => {
    config = parseProfileJson(custJsonArea.value, config)
    applyConfigChange(true)
  })
  custCopyJsonBtn.addEventListener('click', () => {
    custJsonArea.value = serializeProfileJson(config)
    custJsonArea.select()
    navigator.clipboard?.writeText(custJsonArea.value).catch(() => {})
    custCopyJsonBtn.textContent = '已复制 ✓'
    setTimeout(() => {
      custCopyJsonBtn.textContent = '复制 JSON'
    }, 1500)
  })
  custResetBtn.addEventListener('click', () => {
    window.localStorage.removeItem(PROFILE_STORAGE_KEY)
    config = structuredClone(fallbackDefault)
    applyConfigChange(true)
  })

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (isTourActive) {
        stopGuidedTour(false)
      } else if (!listEl.hidden) {
        listEl.hidden = true
      } else if (!custDrawer.hidden) {
        openCustomizeDrawer(false)
      } else if (isBuildMode) {
        setBuildMode(false)
      } else if (!panelEl.hidden) {
        selectById(null)
      } else if (document.body.classList.contains('island-immersive-fullscreen')) {
        void toggleFullscreenMode()
      } else if (document.body.classList.contains('visitor-mode')) {
        setVisitorMode(false)
      } else if (world.getLevel() === 'realm') {
        world.toggleRealm()
      }
    }
  })

  const parseHash = () => location.hash.replace(/^#\/?/, '')
  window.addEventListener('hashchange', () => {
    if (location.hash.startsWith('#island=')) {
      const shared = decodeProfileShareHash(location.hash, config)
      if (shared) {
        config = shared
        applyConfigChange(false)
      }
      return
    }
    selectById(parseHash() || null)
  })

  renderStudioControls()
  renderListView()
  renderCustomizeDrawer()
  updateHeaderAndHint()

  const searchParams = new URLSearchParams(window.location.search)
  const buildTarget = searchParams.get('slot') || undefined
  const styleOverride = searchParams.get('style') as BuildingStyle | null
  const shapeOverride = searchParams.get('shape') as WorldShapeType | null
  const timeOverride = searchParams.get('time') as TimeOfDay | null
  const weatherOverride = searchParams.get('weather') as WeatherType | null
  const satOverride = searchParams.get('sat')
  const rotateParam = searchParams.get('rotate')
  const swapParam = searchParams.get('swap')
  const tintParam = searchParams.get('tint')
  const nudgeParam = searchParams.get('nudge')
  const scaleParam = searchParams.get('scale')
  let needsRebuild = false
  if (timeOverride && TIME_OF_DAY_OPTIONS.some((t) => t.id === timeOverride)) {
    config.timeOfDay = timeOverride
    needsRebuild = true
  }
  if (weatherOverride && WEATHER_OPTIONS.some((w) => w.id === weatherOverride)) {
    config.weather = weatherOverride
    needsRebuild = true
  }
  if (shapeOverride && WORLD_SHAPE_OPTIONS.some((w) => w.id === shapeOverride)) {
    config.worldShape = shapeOverride
    needsRebuild = true
  }
  if (satOverride) {
    const parts = satOverride.split(',') as SatelliteTheme[]
    config.satellites = resolveSatellites(config.biome, parts)
    needsRebuild = true
  }
  if (rotateParam) {
    for (const token of rotateParam.split(',')) {
      const [pid, degStr] = token.split(':')
      const deg = Number(degStr || '90')
      if (pid && Number.isFinite(deg)) {
        config = rotatePlaceInProfile(config, pid.trim(), (deg * Math.PI) / 180)
        needsRebuild = true
      }
    }
  }
  if (tintParam) {
    for (const token of tintParam.split(',')) {
      const [pid, tId] = token.split(':')
      if (pid && tId && BUILDING_TINT_OPTIONS.some((t) => t.id === tId)) {
        config = setPlaceTintInProfile(config, pid.trim(), tId as BuildingTintPreset)
        needsRebuild = true
      }
    }
  }
  if (nudgeParam) {
    for (const token of nudgeParam.split(',')) {
      const [pid, dxStr, dzStr] = token.split(':')
      const dx = Number(dxStr || '0')
      const dz = Number(dzStr || '0')
      if (pid && Number.isFinite(dx) && Number.isFinite(dz)) {
        config = nudgePlaceInProfile(config, pid.trim(), dx, dz)
        needsRebuild = true
      }
    }
  }
  if (scaleParam) {
    for (const token of scaleParam.split(',')) {
      const [pid, scStr] = token.split(':')
      const sc = Number(scStr || '1')
      if (pid && Number.isFinite(sc)) {
        config = setPlaceScaleInProfile(config, pid.trim(), sc)
        needsRebuild = true
      }
    }
  }
  if (swapParam) {
    const [pid, dirStr] = swapParam.split(':')
    const dir = Number(dirStr) < 0 ? -1 : 1
    if (pid) {
      config = swapPlaceOrderInProfile(config, pid.trim(), dir)
      needsRebuild = true
    }
  }
  if (buildTarget && styleOverride) {
    const placeIdx = config.places.findIndex(
      (p) =>
        p.id === buildTarget ||
        p.kind === buildTarget ||
        p.id.includes(buildTarget) ||
        buildTarget.includes(p.id),
    )
    if (placeIdx >= 0) {
      const validStyles = getBuildingStyleOptionsForKind(config.places[placeIdx].kind)
      if (validStyles.some((s) => s.id === styleOverride)) {
        config.places[placeIdx].style = styleOverride
        needsRebuild = true
      }
    }
  }
  if (needsRebuild) {
    renderStudioControls()
    updateHeaderAndHint()
    world.rebuild(config, false)
  }

  const initialHash = parseHash().split('?')[0]
  const selectParam = searchParams.get('select')
  const initialSelect =
    selectParam || (initialHash && !initialHash.startsWith('island=') ? initialHash : null)
  if (initialSelect) {
    selectById(initialSelect)
  }

  if (searchParams.get('view') === 'visitor') {
    setVisitorMode(true)
  } else if (searchParams.get('customize') === '1' || searchParams.get('build') === '1') {
    setBuildMode(true, buildTarget)
  } else if (searchParams.get('tour') === '1') {
    startGuidedTour()
  }

  const demoParam = searchParams.get('demo')
  if (demoParam) {
    openDemoPreviewModal(demoParam)
  }

  const landscapeHintEl = document.querySelector<HTMLElement>('#mobile-landscape-hint')
  const landscapeTextEl = document.querySelector<HTMLElement>('#mobile-landscape-text')
  const dismissLandscapeBtn = document.querySelector<HTMLButtonElement>('#dismiss-landscape-hint')
  const mobileHintCopyBtn = document.querySelector<HTMLButtonElement>('#mobile-hint-copy-btn')
  const mobileHintFullscreenBtn = document.querySelector<HTMLButtonElement>('#mobile-hint-fullscreen-btn')
  const wechatGuideEl = document.querySelector<HTMLElement>('#wechat-browser-guide')
  const wechatCopyUrlBtn = document.querySelector<HTMLButtonElement>('#wechat-copy-url-btn')
  const wechatDismissBtn = document.querySelector<HTMLButtonElement>('#wechat-dismiss-btn')

  const isWeChatBrowser =
    /\bMicroMessenger\b/i.test(navigator.userAgent || '') || searchParams.get('wechat') === '1'
  const isMobileViewport = () =>
    window.matchMedia('(max-width: 900px), (max-height: 540px)').matches ||
    /\b(Android|iPhone|iPad|iPod|Mobile|HarmonyOS)\b/i.test(navigator.userAgent || '')

  function copyCurrentSiteUrl(sourceLabel = '网址'): void {
    const cleanUrl = window.location.href.replace(/[?&]wechat=1\b/, '')
    soundFx.playSelectChime()
    const fallbackCopy = () => {
      try {
        const ta = document.createElement('textarea')
        ta.value = cleanUrl
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.focus()
        ta.select()
        document.execCommand('copy')
        ta.remove()
      } catch {
        // ignore
      }
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(cleanUrl).catch(fallbackCopy)
    } else {
      fallbackCopy()
    }
    showToast(`📋 ${sourceLabel}已复制！请打开系统浏览器（Safari / Chrome）粘贴访问并横屏全屏观看`)
  }

  let isImmersiveFullscreen = false

  function isNativeFullscreenActive(): boolean {
    const doc = document as Document & {
      webkitFullscreenElement?: Element | null
      mozFullScreenElement?: Element | null
    }
    return Boolean(
      doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement,
    )
  }

  function syncFullscreenButtons(): void {
    const active = isImmersiveFullscreen || isNativeFullscreenActive()
    document.body.classList.toggle('island-immersive-fullscreen', active)
    if (fullscreenToggleBtn) {
      fullscreenToggleBtn.textContent = active ? '✕ 退出全屏' : '⛶ 全屏'
      fullscreenToggleBtn.classList.toggle('active', active)
    }
    if (landscapeFullscreenFab) {
      landscapeFullscreenFab.textContent = active ? '✕ 退出全屏' : '⛶ 全屏观看'
      landscapeFullscreenFab.classList.toggle('is-active', active)
    }
    if (mobileHintFullscreenBtn) {
      mobileHintFullscreenBtn.textContent = active ? '退出全屏' : '⛶ 全屏'
    }
    if (!currentSelectedId) {
      world.resetOverview?.()
      window.setTimeout(() => {
        if (!currentSelectedId) world.resetOverview?.()
      }, 180)
    }
  }

  async function toggleFullscreenMode(): Promise<void> {
    soundFx.playSelectChime()
    const docEl = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void
    }
    const doc = document as Document & {
      webkitExitFullscreen?: () => Promise<void> | void
    }
    const currentlyActive = isImmersiveFullscreen || isNativeFullscreenActive()

    if (currentlyActive) {
      isImmersiveFullscreen = false
      if (isNativeFullscreenActive()) {
        try {
          if (doc.exitFullscreen) {
            await doc.exitFullscreen()
          } else if (doc.webkitExitFullscreen) {
            await doc.webkitExitFullscreen()
          }
        } catch {
          // ignore
        }
      }
      syncFullscreenButtons()
      showToast('已退出全屏观看模式')
      return
    }

    isImmersiveFullscreen = true
    let enteredNative = false
    try {
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen()
        enteredNative = true
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen()
        enteredNative = true
      }
    } catch {
      enteredNative = false
    }

    try {
      const scrOrientation = (
        screen as Screen & {
          orientation?: { lock?: (o: string) => Promise<void> }
        }
      ).orientation
      if (scrOrientation?.lock && isMobileViewport()) {
        await scrOrientation.lock('landscape').catch(() => {})
      }
    } catch {
      // ignore on browsers without orientation lock
    }

    window.scrollTo(0, 0)
    syncFullscreenButtons()
    if (enteredNative) {
      showToast('⛶ 已开启全屏沉浸视角（点右上角「退出全屏」可还原）')
    } else {
      showToast('⛶ 已开启纯净全屏视野（已收起外围栏，点右上角「退出全屏」可还原）')
    }
  }

  window.addEventListener('orientationchange', () => {
    window.scrollTo(0, 0)
    window.setTimeout(() => {
      if (!currentSelectedId) world.resetOverview?.()
    }, 120)
    window.setTimeout(() => {
      if (!currentSelectedId) world.resetOverview?.()
    }, 320)
  })

  fullscreenToggleBtn?.addEventListener('click', () => {
    void toggleFullscreenMode()
  })
  landscapeFullscreenFab?.addEventListener('click', () => {
    void toggleFullscreenMode()
  })
  mobileHintFullscreenBtn?.addEventListener('click', () => {
    void toggleFullscreenMode()
  })
  mobileHintCopyBtn?.addEventListener('click', () => {
    copyCurrentSiteUrl('主页网址')
  })

  const onNativeFullscreenChange = () => {
    if (!isNativeFullscreenActive() && isImmersiveFullscreen) {
      isImmersiveFullscreen = false
    }
    syncFullscreenButtons()
  }
  document.addEventListener('fullscreenchange', onNativeFullscreenChange)
  document.addEventListener('webkitfullscreenchange', onNativeFullscreenChange)

  if (isWeChatBrowser) {
    document.body.classList.add('is-wechat-browser')
    if (landscapeTextEl) {
      landscapeTextEl.innerHTML =
        '微信内默认锁定竖屏 · 请点右上角<strong>「···」选择「在浏览器打开」</strong>以解锁横屏与全屏'
    }
    if (wechatGuideEl) {
      let dismissed = false
      try {
        dismissed = window.sessionStorage.getItem('3d-island.wechat-guide-dismissed') === '1'
      } catch {
        dismissed = false
      }
      if (!dismissed) {
        wechatGuideEl.hidden = false
      }
    }
  }

  wechatCopyUrlBtn?.addEventListener('click', () => {
    copyCurrentSiteUrl('主页网址')
    if (wechatCopyUrlBtn) {
      wechatCopyUrlBtn.textContent = '✓ 已复制，请去浏览器粘贴打开'
    }
  })

  wechatDismissBtn?.addEventListener('click', () => {
    if (wechatGuideEl) {
      wechatGuideEl.hidden = true
    }
    try {
      window.sessionStorage.setItem('3d-island.wechat-guide-dismissed', '1')
    } catch {
      // ignore
    }
  })

  if (landscapeHintEl) {
    try {
      if (window.sessionStorage.getItem('3d-island.landscape-hint-dismissed') === '1') {
        landscapeHintEl.classList.add('is-dismissed')
      }
    } catch {
      // ignore storage errors
    }
    dismissLandscapeBtn?.addEventListener('click', () => {
      landscapeHintEl.classList.add('is-dismissed')
      try {
        window.sessionStorage.setItem('3d-island.landscape-hint-dismissed', '1')
      } catch {
        // ignore storage errors
      }
    })
  }

  // Briefly reveal floating 3D landmark labels on initial entry so visitors immediately see all buildings are clickable
  const labelsContainer = document.querySelector<HTMLElement>('#labels')
  if (labelsContainer && !initialSelect && !demoParam) {
    labelsContainer.classList.add('labels-intro-peek')
    window.setTimeout(() => {
      labelsContainer.classList.remove('labels-intro-peek')
    }, 7500)
  }

  // Expose select handler back to world controller callbacks
  ;(window as unknown as { __selectEntity?: (id: string | null) => void }).__selectEntity =
    selectById
  ;(window as unknown as { __onLevelChange?: (level: WorldLevel) => void }).__onLevelChange =
    updateHeaderAndHint
}

