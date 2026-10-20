import type { BiomeType, CarrierType } from '../schema/profile'

export const AUDIO_STORAGE_KEY = '3d-island.audio-enabled.v1'
export const BGM_STATION_STORAGE_KEY = '3d-island.bgm-station.v1'
export const BGM_CUSTOM_URL_STORAGE_KEY = '3d-island.bgm-custom-url.v1'
export const BGM_VOLUME_STORAGE_KEY = '3d-island.bgm-volume.v1'

export type BgmStationId =
  | 'morning-breeze'
  | 'warm-sunset'
  | 'starlight-ambient'
  | 'custom-lyria'

export interface BgmStationSpec {
  id: BgmStationId
  shortLabel: string
  label: string
  subtitle: string
  audioTrackUrl?: string
  tempoBpm: number
  progressionHz: [number, number, number, number][]
  melodyScaleHz: number[]
  padWaveform: OscillatorType
  pluckWaveform: OscillatorType
  filterCutoffHz: number
}

export const BGM_STATIONS: readonly BgmStationSpec[] = [
  {
    id: 'morning-breeze',
    shortLabel: '☀️ 晨风轻钢琴',
    label: '☀️ 晨风轻钢琴 · Morning Breeze',
    subtitle: '温暖柔和的原声毡音立式钢琴七和弦与海风立体声景，适合日间漫游',
    audioTrackUrl: '/audio/morning-breeze.mp3',
    tempoBpm: 68,
    progressionHz: [
      [261.63, 329.63, 392.0, 493.88], // Cmaj7
      [220.0, 261.63, 329.63, 392.0], // Am7
      [174.61, 220.0, 261.63, 329.63], // Fmaj7
      [196.0, 246.94, 293.66, 392.0], // G6
    ],
    melodyScaleHz: [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5],
    padWaveform: 'sine',
    pluckWaveform: 'triangle',
    filterCutoffHz: 720,
  },
  {
    id: 'warm-sunset',
    shortLabel: '🌅 落日木吉他',
    label: '🌅 落日木吉他 · Warm Sunset',
    subtitle: '物理建模尼龙弦原声木吉他指弹分解和弦与暮色大提琴暖垫，致敬 B-612 第 44 次日落',
    audioTrackUrl: '/audio/warm-sunset.mp3',
    tempoBpm: 60,
    progressionHz: [
      [196.0, 246.94, 293.66, 369.99], // Gmaj7
      [164.81, 246.94, 293.66, 329.63], // Em9
      [261.63, 329.63, 392.0, 493.88], // Cmaj7
      [293.66, 369.99, 440.0, 523.25], // D9sus4
    ],
    melodyScaleHz: [392.0, 440.0, 493.88, 587.33, 659.25, 783.99],
    padWaveform: 'triangle',
    pluckWaveform: 'sine',
    filterCutoffHz: 580,
  },
  {
    id: 'starlight-ambient',
    shortLabel: '🌙 星夜环境音',
    label: '🌙 星夜环境音 · Starlight Ambient',
    subtitle: '空灵钢片琴泛音、立体声音乐厅混响与深邃星际长音，适合夜间与第二秘境探索',
    audioTrackUrl: '/audio/starlight-ambient.mp3',
    tempoBpm: 52,
    progressionHz: [
      [174.61, 261.63, 329.63, 440.0], // Fmaj9
      [164.81, 246.94, 329.63, 392.0], // Em7
      [146.83, 220.0, 261.63, 349.23], // Dm7
      [196.0, 261.63, 329.63, 392.0], // C/G
    ],
    melodyScaleHz: [523.25, 659.25, 783.99, 880.0, 1046.5, 1318.5],
    padWaveform: 'sine',
    pluckWaveform: 'sine',
    filterCutoffHz: 460,
  },
  {
    id: 'custom-lyria',
    shortLabel: '🎵 Google Lyria / 自定义',
    label: '🎵 专属配乐 · Google Lyria / Custom MP3',
    subtitle: '支持一键生成 Google MusicFX (Lyria) 专属提示词，或直接拖入本地 MP3/WAV 轻音乐',
    tempoBpm: 64,
    progressionHz: [
      [261.63, 329.63, 392.0, 493.88],
      [220.0, 261.63, 329.63, 392.0],
      [174.61, 220.0, 261.63, 329.63],
      [196.0, 246.94, 293.66, 392.0],
    ],
    melodyScaleHz: [523.25, 587.33, 659.25, 783.99, 880.0],
    padWaveform: 'sine',
    pluckWaveform: 'triangle',
    filterCutoffHz: 680,
  },
] as const

export interface SoundscapePresetSpec {
  biome: BiomeType
  carrier: CarrierType
  level: 'ground' | 'realm'
  chordHz: [number, number, number]
  ambientFilterHz: number
  carrierSweepHz: [number, number]
  uiPopHz: number
}

/**
 * Pure deterministic synthesizer specification per (biome, carrier, level).
 * Used by both WebAudio nodes in the browser and headless contract assertions.
 */
export function computeSoundscapeSpec(
  biome: BiomeType,
  carrier: CarrierType,
  level: 'ground' | 'realm' = 'ground',
): SoundscapePresetSpec {
  const chordMap: Record<BiomeType, [number, number, number]> = {
    ocean: [261.63, 329.63, 392.0], // C4-E4-G4 warm coastal chord
    desert: [293.66, 369.99, 440.0], // D4-F#4-A4 Silk Road amber chord
    snow: [349.23, 440.0, 523.25], // F4-A4-C5 crystalline aurora chord
    grassland: [392.0, 493.88, 587.33], // G4-B4-D5 pastoral B-612 chord
  }

  const baseFilterMap: Record<BiomeType, number> = {
    ocean: 480,
    desert: 640,
    snow: 820,
    grassland: 560,
  }

  const sweepMap: Record<CarrierType, [number, number]> = {
    submarine: [920, 280],
    camel: [320, 480],
    snowball: [420, 760],
    rocket: [140, 680],
    balloon: [260, 540],
  }

  const ambientFilterHz =
    level === 'realm'
      ? carrier === 'submarine'
        ? Math.round(baseFilterMap[biome] * 0.48) // Deep underwater low-pass
        : Math.round(baseFilterMap[biome] * 0.78)
      : baseFilterMap[biome]

  return {
    biome,
    carrier,
    level,
    chordHz: chordMap[biome] ?? chordMap.ocean,
    ambientFilterHz,
    carrierSweepHz: sweepMap[carrier] ?? sweepMap.submarine,
    uiPopHz: biome === 'snow' ? 740 : biome === 'desert' ? 580 : 660,
  }
}

/**
 * Generates a tailored, soothing instrumental prompt for Google MusicFX (Lyria)
 * based on the island's biome, time of day, weather, and personal theme.
 */
export function generateLyriaMusicPrompt(context: {
  name?: string
  biome?: BiomeType
  timeOfDay?: string
  weather?: string
  carrier?: CarrierType
}): string {
  const biomeMood: Record<BiomeType, string> = {
    ocean: 'warm coastal archipelago, gentle ocean breeze, Rhodes electric piano and soft acoustic guitar',
    desert: 'serene golden oasis at dusk, warm nylon-string guitar, soft kalimba and ambient desert wind pad',
    snow: 'peaceful Nordic alpine valley, crystalline felt piano, celesta harmonics and warm analog synth pad',
    grassland: 'cozy B-612 pastoral highland, soothing fingerstyle acoustic guitar, warm upright bass and soft strings',
  }
  const timeMood =
    context.timeOfDay === 'night'
      ? 'starry midnight atmosphere, dreamy slow tempo 56 BPM, ambient lullaby'
      : context.timeOfDay === 'sunset'
        ? 'golden hour sunset glow, nostalgic and heartwarming, 62 BPM'
        : 'sunlit morning clarity, calm and uplifting, 68 BPM'

  const baseBiome = context.biome ?? 'ocean'
  return `Soothing instrumental light music for a miniature 3D personal island website, ${biomeMood[baseBiome]}, ${timeMood}, clean studio mix, seamless loop, no vocals, no drums, healing and relaxing atmosphere.`
}

export class ProceduralSoundscape {
  private ctx: AudioContext | null = null
  private enabled = true
  private lastHoverMs = 0
  private currentSpec: SoundscapePresetSpec = computeSoundscapeSpec('ocean', 'submarine', 'ground')
  private currentStationId: BgmStationId = 'morning-breeze'
  private volume = 0.45
  private bgmTimer: number | null = null
  private bgmStepIndex = 0
  private customAudioEl: HTMLAudioElement | null = null
  private customAudioUrl = ''
  private customAudioLabel = '未导入本地音频（当前使用内置轻音乐合成）'

  constructor() {
    this.enabled = this.readInitialState()
    const realPool: BgmStationId[] = ['morning-breeze', 'warm-sunset', 'starlight-ambient']
    this.currentStationId = realPool[Math.floor(Math.random() * realPool.length)]
    this.volume = this.readInitialVolume()
    this.customAudioUrl = this.readInitialCustomUrl()
    if (this.customAudioUrl) {
      this.customAudioLabel = '自定义音频流 (Custom BGM URL)'
    }
    this.setupAutoStartGestureUnlock()
  }

  private setupAutoStartGestureUnlock(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return
    const events = ['pointerdown', 'touchstart', 'click', 'keydown', 'wheel'] as const
    const removeAll = () => {
      for (const ev of events) {
        window.removeEventListener(ev, unlock)
      }
    }
    const unlock = () => {
      if (!this.enabled) {
        removeAll()
        return
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume().catch(() => {})
      }
      if (!this.isBgmPlaying()) {
        this.startBgm()
      }
      if (this.customAudioEl && !this.customAudioEl.paused) {
        removeAll()
      } else if (this.ctx && this.ctx.state === 'running' && this.bgmTimer !== null) {
        removeAll()
      }
    }
    for (const ev of events) {
      window.addEventListener(ev, unlock, { passive: true })
    }
  }

  public pickNextRandomStation(): BgmStationSpec {
    const realPool: BgmStationId[] = ['morning-breeze', 'warm-sunset', 'starlight-ambient']
    const candidates = realPool.filter((id) => id !== this.currentStationId)
    const nextId = candidates[Math.floor(Math.random() * candidates.length)] ?? realPool[0]
    this.currentStationId = nextId
    this.persistState()
    return this.getCurrentStation()
  }

  private readInitialState(): boolean {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(AUDIO_STORAGE_KEY, '1')
      }
    } catch {
      // Ignore storage access errors in restricted/headless environments
    }
    return true
  }

  readInitialStation(): BgmStationId {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(BGM_STATION_STORAGE_KEY) as BgmStationId | null
        if (raw && BGM_STATIONS.some((s) => s.id === raw)) return raw
      }
    } catch {
      // Ignore storage access errors
    }
    return 'morning-breeze'
  }

  private readInitialVolume(): number {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = Number(window.localStorage.getItem(BGM_VOLUME_STORAGE_KEY))
        if (Number.isFinite(raw) && raw >= 0.05 && raw <= 1.0) return raw
      }
    } catch {
      // Ignore storage access errors
    }
    return 0.45
  }

  private readInitialCustomUrl(): string {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(BGM_CUSTOM_URL_STORAGE_KEY) ?? ''
      }
    } catch {
      // Ignore
    }
    return ''
  }

  private persistState(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(AUDIO_STORAGE_KEY, this.enabled ? '1' : '0')
        window.localStorage.setItem(BGM_STATION_STORAGE_KEY, this.currentStationId)
        window.localStorage.setItem(BGM_VOLUME_STORAGE_KEY, String(this.volume))
      }
    } catch {
      // Ignore storage errors
    }
  }

  private ensureCtx(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return null
    try {
      if (!this.ctx) {
        this.ctx = new AudioCtx()
      }
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume().catch(() => {})
      }
      return this.ctx
    } catch {
      return null
    }
  }

  public isEnabled(): boolean {
    return this.enabled
  }

  public setEnabled(next: boolean): boolean {
    this.enabled = Boolean(next)
    this.persistState()
    if (this.enabled) {
      this.playBuildSnap()
      this.startBgm()
    } else {
      this.stopBgm()
    }
    return this.enabled
  }

  public toggle(): boolean {
    return this.setEnabled(!this.enabled)
  }

  public getButtonLabel(): string {
    return this.enabled ? '🎵 音乐: 开' : '🔇 音乐: 关'
  }

  public getCurrentSpec(): SoundscapePresetSpec {
    return this.currentSpec
  }

  public getStations(): readonly BgmStationSpec[] {
    return BGM_STATIONS
  }

  public getStationId(): BgmStationId {
    return this.currentStationId
  }

  public getCurrentStation(): BgmStationSpec {
    return BGM_STATIONS.find((s) => s.id === this.currentStationId) ?? BGM_STATIONS[0]
  }

  public setStation(stationId: BgmStationId): BgmStationSpec {
    if (BGM_STATIONS.some((s) => s.id === stationId)) {
      this.currentStationId = stationId
      this.bgmStepIndex = 0
      this.persistState()
      if (this.enabled) {
        this.stopBgm()
        this.startBgm()
      }
    }
    return this.getCurrentStation()
  }

  public cycleStation(): BgmStationSpec {
    const idx = BGM_STATIONS.findIndex((s) => s.id === this.currentStationId)
    const next = BGM_STATIONS[(idx + 1) % BGM_STATIONS.length]
    return this.setStation(next.id)
  }

  public getVolume(): number {
    return this.volume
  }

  public setVolume(nextVol: number): number {
    this.volume = Math.max(0.05, Math.min(1.0, Number(nextVol) || 0.45))
    if (this.customAudioEl) {
      this.customAudioEl.volume = Math.min(1, this.volume * 0.85)
    }
    this.persistState()
    return this.volume
  }

  public getCustomAudioLabel(): string {
    return this.customAudioLabel
  }

  public getCustomTrackUrl(): string {
    return this.customAudioUrl
  }

  public setCustomTrackUrl(url: string): void {
    this.setCustomAudioUrl(url)
  }

  public setCustomAudioFile(file: File): string {
    if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
      return ''
    }
    const blobUrl = URL.createObjectURL(file)
    this.customAudioUrl = blobUrl
    this.customAudioLabel = `本地音频：${file.name}`
    this.currentStationId = 'custom-lyria'
    this.persistState()
    if (this.enabled) {
      this.stopBgm()
      this.startBgm()
    }
    return blobUrl
  }

  public setCustomAudioUrl(url: string): void {
    const clean = url.trim()
    this.customAudioUrl = clean
    this.customAudioLabel = clean ? `自定义音频：${clean.slice(0, 42)}` : '未导入本地音频'
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (clean) {
          window.localStorage.setItem(BGM_CUSTOM_URL_STORAGE_KEY, clean)
        } else {
          window.localStorage.removeItem(BGM_CUSTOM_URL_STORAGE_KEY)
        }
      }
    } catch {
      // Ignore
    }
    if (clean) {
      this.currentStationId = 'custom-lyria'
      this.persistState()
      if (this.enabled) {
        this.stopBgm()
        this.startBgm()
      }
    }
  }

  public isBgmPlaying(): boolean {
    return this.bgmTimer !== null || Boolean(this.customAudioEl && !this.customAudioEl.paused)
  }

  public startBgm(): void {
    if (!this.enabled || typeof window === 'undefined') return
    // Only run BGM loop if WebAudio is actually available (prevents dangling timers in headless Node tests)
    const ctx = this.ensureCtx()
    if (!ctx) return

    const station = this.getCurrentStation()
    const targetAudioUrl =
      this.currentStationId === 'custom-lyria' && this.customAudioUrl
        ? this.customAudioUrl
        : station.audioTrackUrl ?? ''

    if (targetAudioUrl && typeof Audio !== 'undefined') {
      this.stopBgm()
      try {
        if (!this.customAudioEl) {
          this.customAudioEl = new Audio()
          this.customAudioEl.loop = false
          this.customAudioEl.addEventListener('ended', () => {
            if (!this.enabled) return
            this.pickNextRandomStation()
            this.startBgm()
          })
        }
        if (this.customAudioEl.src !== targetAudioUrl) {
          this.customAudioEl.src = targetAudioUrl
        }
        this.customAudioEl.volume = Math.min(1, this.volume * 0.85)
        void this.customAudioEl.play().catch((err: unknown) => {
          const isAutoplayBlocked =
            err && typeof err === 'object' && 'name' in err && (err as { name?: string }).name === 'NotAllowedError'
          // Only fall back to procedural synth if the audio asset itself failed, not when waiting for first gesture unlock
          if (!isAutoplayBlocked && this.ctx?.state === 'running') {
            this.scheduleProceduralBgmBar()
          }
        })
        return
      } catch {
        // Fallback to procedural synth
      }
    }

    if (this.bgmTimer !== null) return
    this.scheduleProceduralBgmBar()
  }

  public stopBgm(): void {
    if (this.bgmTimer !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.bgmTimer)
      this.bgmTimer = null
    }
    if (this.customAudioEl) {
      try {
        this.customAudioEl.pause()
      } catch {
        // Ignore
      }
    }
  }

  private scheduleProceduralBgmBar(): void {
    if (!this.enabled || typeof window === 'undefined') return
    const ctx = this.ensureCtx()
    if (!ctx) return

    const station = this.getCurrentStation()
    const chord = station.progressionHz[this.bgmStepIndex % station.progressionHz.length]
    const barDurationSec = (60 / station.tempoBpm) * 4
    const now = ctx.currentTime
    const masterGainVal = 0.026 * this.volume

    // 1. Warm soothing pad / Rhodes chord
    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const filter = ctx.createBiquadFilter()
      const gain = ctx.createGain()

      osc.type = station.padWaveform
      osc.frequency.setValueAtTime(freq, now + idx * 0.08)

      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(station.filterCutoffHz, now)

      const noteStart = now + idx * 0.08
      const noteDur = barDurationSec * 0.92
      gain.gain.setValueAtTime(0.0005, noteStart)
      gain.gain.linearRampToValueAtTime(masterGainVal * (idx === 0 ? 1.15 : 0.78), noteStart + 0.45)
      gain.gain.exponentialRampToValueAtTime(0.0006, noteStart + noteDur)

      osc.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)

      osc.start(noteStart)
      osc.stop(noteStart + noteDur + 0.05)
    })

    // 2. Gentle pentatonic acoustic pluck / piano melody notes across the bar
    const scale = station.melodyScaleHz
    const subSteps = 4
    const beatSec = barDurationSec / subSteps
    for (let s = 0; s < subSteps; s++) {
      if ((this.bgmStepIndex + s) % 3 === 1) continue // Leave breathing room (silence)
      const noteFreq = scale[(this.bgmStepIndex * 2 + s * 3) % scale.length]
      const tStart = now + s * beatSec + 0.12
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = station.pluckWaveform
      osc.frequency.setValueAtTime(noteFreq, tStart)

      gain.gain.setValueAtTime(0.0005, tStart)
      gain.gain.linearRampToValueAtTime(masterGainVal * 0.92, tStart + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.0005, tStart + beatSec * 1.35)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(tStart)
      osc.stop(tStart + beatSec * 1.4)
    }

    this.bgmStepIndex += 1
    this.bgmTimer = window.setTimeout(() => {
      this.bgmTimer = null
      if (this.enabled) {
        this.scheduleProceduralBgmBar()
      }
    }, Math.round(barDurationSec * 1000))
  }

  public playHoverTick(): void {
    if (!this.enabled) return
    const nowMs = Date.now()
    if (nowMs - this.lastHoverMs < 70) return
    this.lastHoverMs = nowMs

    const ctx = this.ensureCtx()
    if (!ctx) return
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(this.currentSpec.uiPopHz, t)
    osc.frequency.exponentialRampToValueAtTime(this.currentSpec.uiPopHz * 1.38, t + 0.042)
    gain.gain.setValueAtTime(0.028 * this.volume * 2, t)
    gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.048)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.052)
  }

  public playClickSfx(): void {
    this.playHoverTick()
  }

  public playBuildSnap(): void {
    if (!this.enabled) return
    const ctx = this.ensureCtx()
    if (!ctx) return
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(420, t)
    osc.frequency.exponentialRampToValueAtTime(780, t + 0.065)
    gain.gain.setValueAtTime(0.042 * this.volume * 2, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.075)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.08)
  }

  public playBuildSfx(): void {
    this.playBuildSnap()
  }

  public playSelectChime(biome: BiomeType = this.currentSpec.biome): void {
    if (!this.enabled) return
    const spec = computeSoundscapeSpec(biome, this.currentSpec.carrier, this.currentSpec.level)
    const ctx = this.ensureCtx()
    if (!ctx) return
    if (!this.isBgmPlaying()) {
      this.startBgm()
    }
    spec.chordHz.forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.048
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, t)
      gain.gain.setValueAtTime(0.046 * this.volume * 2, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.26)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.28)
    })
  }

  public playPlumbobSfx(biome: BiomeType = this.currentSpec.biome): void {
    this.playSelectChime(biome)
  }

  public playCarrierTransition(
    carrier: CarrierType,
    biome: BiomeType = this.currentSpec.biome,
  ): void {
    if (!this.enabled) return
    const spec = computeSoundscapeSpec(biome, carrier, this.currentSpec.level)
    const ctx = this.ensureCtx()
    if (!ctx) return
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type =
      carrier === 'submarine' ? 'sine' : carrier === 'rocket' ? 'sawtooth' : 'triangle'
    osc.frequency.setValueAtTime(spec.carrierSweepHz[0], t)
    osc.frequency.exponentialRampToValueAtTime(spec.carrierSweepHz[1], t + 0.62)

    gain.gain.setValueAtTime(0.052 * this.volume * 2, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.66)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.68)
  }

  public syncAmbientWorld(
    biome: BiomeType,
    carrier: CarrierType,
    level: 'ground' | 'realm' = 'ground',
  ): SoundscapePresetSpec {
    this.currentSpec = computeSoundscapeSpec(biome, carrier, level)
    if (!this.enabled) return this.currentSpec
    const ctx = this.ensureCtx()
    if (!ctx) return this.currentSpec

    // Soft healing harmonic shimmer on world/realm switch
    const t = ctx.currentTime
    this.currentSpec.chordHz.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq * (level === 'realm' ? 1.5 : 1.0), t + idx * 0.06)
      gain.gain.setValueAtTime(0.022 * this.volume * 2, t + idx * 0.06)
      gain.gain.exponentialRampToValueAtTime(0.0008, t + idx * 0.06 + 0.45)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(t + idx * 0.06)
      osc.stop(t + idx * 0.06 + 0.48)
    })
    return this.currentSpec
  }
}

export const soundscape = new ProceduralSoundscape()

if (typeof window !== 'undefined') {
  ;(window as unknown as { __islandSoundscape?: ProceduralSoundscape }).__islandSoundscape =
    soundscape
}
