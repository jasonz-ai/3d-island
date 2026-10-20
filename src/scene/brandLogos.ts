import * as THREE from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import type { BuildingStyle } from '../schema/profile'
import { mat } from './kit'

export interface BrandLogoSpec {
  id: 'ruc' | 'unimelb' | 'beijing' | 'xiaomi' | 'jd' | 'bytedance' | 'taikang' | 'cscec'
  style: BuildingStyle
  label: string
  svgUrl: string
  primaryHex: string
  accentHex: string
  shape: 'circle' | 'shield' | 'squircle' | 'diamond'
  svgMarkup: string
}

// Generic geometric vector paths for rooftop 3D relief emblems & UI badges
export const GENERIC_ACADEMY_CREST_PATH =
  'M60 22 L92 38 L60 54 L28 38 Z M36 48 L60 60 L84 48 L84 76 L60 88 L36 76 Z'

export const GENERIC_TECH_PARK_PATH =
  'M30 36 L52 36 L52 84 L38 84 L38 50 L30 50 Z M60 36 L90 36 L90 50 L74 50 L74 84 L60 84 Z'

export const GENERIC_MASCOT_DOG_BODY_PATH =
  'M101.68 27.23 C89.93 20.66 66.34 23.42 51.34 29.25 C43.70 32.02 37.17 35.52 32.45 40.16 C28.32 44.31 28.30 48.91 32.06 53.91 C38.22 61.14 49.67 68.45 64.90 71.50 L51.43 96.00 L55.20 96.00 L62.49 86.80 L61.90 96.00 L65.60 96.00 L68.20 87.20 L71.10 87.20 L72.80 96.00 L76.50 96.00 L76.50 71.00 C84.10 69.10 91.57 65.08 99.42 54.30 C105.69 44.86 108.95 30.75 101.68 27.23 Z'

export const GENERIC_MASCOT_DOG_EAR_PATH =
  'M31.95 46.93 C31.80 45.29 31.36 43.75 30.73 42.27 L24.23 38.83 C21.87 37.68 19.39 39.37 19.09 41.87 C17.65 50.45 14.50 52.67 12.54 58.52 C11.54 61.53 12.12 63.49 13.50 64.49 C15.02 65.53 15.80 65.97 19.61 64.49 C26.95 61.46 30.23 57.33 28.21 47.27 L30.58 48.67 C31.52 49.17 32.08 48.84 31.95 46.93 Z'

export const GENERIC_DIAMOND_CREST_PATH =
  'M60 18 L96 60 L60 102 L24 60 Z M60 36 L78 60 L60 84 L42 60 Z'

export const GENERIC_CUBE_FRAME_PATH =
  'M24 24 L96 24 L96 96 L24 96 Z M42 42 L78 42 L78 78 L42 78 Z'

export const BRAND_LOGO_SPECS: Record<string, BrandLogoSpec> = {
  'ruc-mingde': {
    id: 'ruc',
    style: 'ruc-mingde',
    label: '东方红砖学府 · Classical Academy',
    svgUrl: '/logos/ruc.svg',
    primaryHex: '#8E1E20',
    accentHex: '#FFFFFF',
    shape: 'circle',
    svgMarkup: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
      <path fill="#FFFFFF" d="${GENERIC_ACADEMY_CREST_PATH}"/>
    </svg>`,
  },
  'unimelb-clocktower': {
    id: 'unimelb',
    style: 'unimelb-clocktower',
    label: '砂岩哥特钟楼大学 · Clocktower University',
    svgUrl: '/logos/unimelb.svg',
    primaryHex: '#000F46',
    accentHex: '#FFFFFF',
    shape: 'shield',
    svgMarkup: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
      <path fill="#FFFFFF" d="M34 38 L58 42 L58 72 L34 68 Z M62 42 L86 38 L86 68 L62 72 Z"/>
      <polygon fill="#FACC15" points="60,18 63,25 70,25 64,29 66,36 60,32 54,36 56,29 50,25 57,25"/>
      <polygon fill="#FACC15" points="60,78 63,85 70,85 64,89 66,96 60,92 54,96 56,89 50,85 57,85"/>
    </svg>`,
  },
  'xiaomi-park': {
    id: 'xiaomi',
    style: 'xiaomi-park',
    label: '双子连廊科技园 · Twin-Tower Tech Park',
    svgUrl: '/logos/xiaomi.svg',
    primaryHex: '#FF6900',
    accentHex: '#FFFFFF',
    shape: 'squircle',
    svgMarkup: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
      <path fill="#FFFFFF" d="${GENERIC_TECH_PARK_PATH}"/>
    </svg>`,
  },
  'jd-hq': {
    id: 'jd',
    style: 'jd-hq',
    label: '三联高空连廊总部 · Skybridge Mega HQ',
    svgUrl: '/logos/jd.svg',
    primaryHex: '#E1251B',
    accentHex: '#FFFFFF',
    shape: 'squircle',
    svgMarkup: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
      <path fill="#FFFFFF" d="M26 28 L46 28 L46 92 L26 92 Z M52 46 L68 46 L68 64 L52 64 Z M74 28 L94 28 L94 92 L74 92 Z"/>
    </svg>`,
  },
  'bytedance-hq': {
    id: 'bytedance',
    style: 'bytedance-hq',
    label: '错层悬挑数智广场 · Cantilever Tech Plaza',
    svgUrl: '/logos/bytedance.svg',
    primaryHex: '#0F172A',
    accentHex: '#00E5B8',
    shape: 'squircle',
    svgMarkup: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
      <polygon points="22,30 36,24 36,92 22,86" fill="#165DFF"/>
      <polygon points="44,48 58,42 58,92 44,86" fill="#0094FF"/>
      <polygon points="66,40 80,34 80,92 66,86" fill="#00C8D2"/>
      <polygon points="88,24 102,30 102,86 88,92" fill="#00E5B8"/>
    </svg>`,
  },
  'taikang-tower': {
    id: 'taikang',
    style: 'taikang-tower',
    label: '斜交网格金融高塔 · Diagrid Financial Tower',
    svgUrl: '/logos/taikang.svg',
    primaryHex: '#009995',
    accentHex: '#FFFFFF',
    shape: 'diamond',
    svgMarkup: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
      <path fill="#009995" d="${GENERIC_DIAMOND_CREST_PATH}"/>
    </svg>`,
  },
  'cscec-tower': {
    id: 'cscec',
    style: 'cscec-tower',
    label: '外框钢构蓝立方大厦 · Steel Exoskeleton Cube',
    svgUrl: '/logos/cscec.svg',
    primaryHex: '#0095DA',
    accentHex: '#FFFFFF',
    shape: 'squircle',
    svgMarkup: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
      <path fill="#FFFFFF" d="${GENERIC_CUBE_FRAME_PATH}"/>
    </svg>`,
  },
  'siheyuan-courtyard': {
    id: 'beijing',
    style: 'siheyuan-courtyard',
    label: '东方三重攒尖祈年坛 · Classical Altar Landmark',
    svgUrl: '/logos/beijing.svg',
    primaryHex: '#1E3A8A',
    accentHex: '#FACC15',
    shape: 'circle',
    svgMarkup: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
      <path fill="#FACC15" d="M60 24 L86 42 L34 42 Z M60 44 L96 62 L24 62 Z"/>
    </svg>`,
  },
}

export function getBrandLogoInfo(style: BuildingStyle): BrandLogoSpec | null {
  return BRAND_LOGO_SPECS[style] ?? null
}

/**
 * Builds a pure 3D Architectural Rooftop Emblem (`brand-logo-emblem`)
 */
export function buildBrandLogo3DEmblem(
  style: BuildingStyle,
  scale = 1.0,
): THREE.Group | null {
  const spec = getBrandLogoInfo(style)
  if (!spec) return null

  const group = new THREE.Group()
  group.name = 'brand-logo-emblem'
  group.userData.logoId = spec.id
  group.userData.svgUrl = spec.svgUrl

  const backingShape = new THREE.Shape()
  if (spec.shape === 'circle') {
    backingShape.absarc(0, 0, 0.5, 0, Math.PI * 2, false)
  } else if (spec.shape === 'shield') {
    backingShape.moveTo(-0.44, 0.48)
    backingShape.lineTo(0.44, 0.48)
    backingShape.lineTo(0.44, -0.06)
    backingShape.quadraticCurveTo(0.44, -0.42, 0, -0.54)
    backingShape.quadraticCurveTo(-0.44, -0.42, -0.44, -0.06)
    backingShape.closePath()
  } else if (spec.shape === 'diamond') {
    const d = 0.56
    const c = 0.08
    backingShape.moveTo(-c, d - c)
    backingShape.quadraticCurveTo(0, d, c, d - c)
    backingShape.lineTo(d - c, c)
    backingShape.quadraticCurveTo(d, 0, d - c, -c)
    backingShape.lineTo(c, -d + c)
    backingShape.quadraticCurveTo(0, -d, -c, -d + c)
    backingShape.lineTo(-d + c, -c)
    backingShape.quadraticCurveTo(-d, 0, -d + c, c)
    backingShape.closePath()
  } else {
    const r = 0.48
    const rad = 0.16
    backingShape.moveTo(-r + rad, -r)
    backingShape.lineTo(r - rad, -r)
    backingShape.quadraticCurveTo(r, -r, r, -r + rad)
    backingShape.lineTo(r, r - rad)
    backingShape.quadraticCurveTo(r, r, r - rad, r)
    backingShape.lineTo(-r + rad, r)
    backingShape.quadraticCurveTo(-r, r, -r, r - rad)
    backingShape.lineTo(-r, -r + rad)
    backingShape.quadraticCurveTo(-r, -r, -r + rad, -r)
    backingShape.closePath()
  }

  const backingColor = spec.shape === 'diamond' ? '#FFFFFF' : spec.primaryHex
  const backingGeo = new THREE.ExtrudeGeometry(backingShape, {
    depth: 0.18,
    bevelEnabled: true,
    bevelThickness: 0.028,
    bevelSize: 0.022,
    bevelSegments: 3,
  })
  backingGeo.center()
  const backingMesh = new THREE.Mesh(
    backingGeo,
    mat(backingColor, {
      rough: 0.28,
      metal: 0.12,
      emissive: backingColor,
      emissiveIntensity: spec.shape === 'diamond' ? 0.3 : 0.22,
    }),
  )
  backingMesh.name = 'brand-logo-backing'
  backingMesh.castShadow = true
  group.add(backingMesh)

  const reliefGroup = new THREE.Group()
  reliefGroup.name = 'brand-logo-3d-relief'

  const reliefColor = spec.shape === 'diamond' ? spec.primaryHex : spec.accentHex
  const reliefMat = mat(reliefColor, {
    emissive: reliefColor,
    emissiveIntensity: 0.62,
    rough: 0.22,
  })

  let addedSvgRelief = false
  if (typeof DOMParser !== 'undefined') {
    try {
      const loader = new SVGLoader()
      const svgData = loader.parse(spec.svgMarkup)
      for (const path of svgData.paths) {
        const shapes = SVGLoader.createShapes(path)
        for (const s of shapes) {
          const extGeo = new THREE.ExtrudeGeometry(s, {
            depth: 8.0,
            bevelEnabled: false,
          })
          const sScale = 0.0074
          const mFront = new THREE.Mesh(extGeo, reliefMat)
          mFront.scale.set(sScale, -sScale, sScale)
          mFront.position.set(-0.444, 0.444, 0.088)
          const mBack = new THREE.Mesh(extGeo, reliefMat)
          mBack.scale.set(-sScale, -sScale, sScale)
          mBack.position.set(0.444, 0.444, -0.146)
          reliefGroup.add(mFront, mBack)
          addedSvgRelief = true
        }
      }
    } catch {
      // Fallback below
    }
  }

  if (!addedSvgRelief) {
    const coreShape = new THREE.Shape()
    coreShape.absarc(0, 0, 0.28, 0, Math.PI * 2, false)
    const coreGeo = new THREE.ExtrudeGeometry(coreShape, { depth: 0.22, bevelEnabled: false })
    coreGeo.center()
    reliefGroup.add(new THREE.Mesh(coreGeo, reliefMat))
  }

  group.add(reliefGroup)
  group.scale.setScalar(scale)
  return group
}
