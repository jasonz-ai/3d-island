export function rng(seed = 123456789): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0 || 1));
  return t * t * (3 - 2 * t);
}

export function easeOutExpo(t: number): number {
  const x = clamp01(t);
  return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
}

export function easeInOutCubic(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export function easeInOutQuart(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2;
}

export function easeOutBack(t: number, overshoot = 1.55): number {
  const x = clamp01(t);
  const c3 = overshoot + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + overshoot * Math.pow(x - 1, 2);
}

/**
 * Analytical damped harmonic oscillator step response (0 -> 1 with spring overshoot).
 * Reference: @flxrnc 3D motion engineering spec.
 */
export function spring(t: number, zeta = 0.68, freq = 2.2): number {
  if (t <= 0) return 0;
  if (t > 6) return 1;
  const clampedZeta = Math.min(0.995, Math.max(0.05, zeta));
  const w = 2 * Math.PI * freq;
  const wd = w * Math.sqrt(1 - clampedZeta * clampedZeta);
  return (
    1 -
    Math.exp(-clampedZeta * w * t) *
      (Math.cos(wd * t) + ((clampedZeta * w) / wd) * Math.sin(wd * t))
  );
}

/**
 * Decaying secondary oscillation around 0 for follow-through (flags, antennas, baskets).
 */
export function springSettle(t: number, amp = 0.14, zeta = 0.22, freq = 2.2): number {
  if (t <= 0 || t > 8) return 0;
  const w = 2 * Math.PI * freq;
  return amp * Math.exp(-zeta * w * t) * Math.sin(w * t);
}

/**
 * Staggered spring pop-in scale factor for buildings and props when a world loads or switches.
 */
export function staggeredPopScale(
  elapsedSec: number,
  index: number,
  staggerSec = 0.065,
  zeta = 0.66,
  freq = 2.2,
): number {
  const localT = elapsedSec - index * staggerSec;
  if (localT <= 0) return 0.001;
  return Math.max(0.001, spring(localT, zeta, freq));
}

export interface CarrierLaunchEnvelope {
  moveT: number;
  lagMoveT: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  pitchOffset: number;
  settleWave: number;
}

/**
 * Combines 5 classical animation principles into a single deterministic envelope:
 * 1. Anticipation (0.00..0.14): crouches down (1.15 x 0.82) & winds back slightly
 * 2. Squash & Stretch (0.14..0.38): stretches (0.86 x 1.24) during peak takeoff/dive
 * 3. Arcs & Slow-In/Out (0.14..0.90): smooth quartic travel along trajectory
 * 4. Overlapping Action: lagMoveT trails primary moveT by ~150ms equivalent
 * 5. Follow-through (0.86..1.00): damped spring settle on arrival
 */
export function carrierLaunchEnvelope(progress: number): CarrierLaunchEnvelope {
  const p = clamp01(progress);

  if (p <= 0) {
    return {
      moveT: 0,
      lagMoveT: 0,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      pitchOffset: 0,
      settleWave: 0,
    };
  }

  const anticipationEnd = 0.14;
  let moveT = 0;
  if (p >= anticipationEnd) {
    const travelNorm = (p - anticipationEnd) / (1 - anticipationEnd);
    moveT = easeInOutQuart(travelNorm);
  }

  const lagP = clamp01(p - 0.045);
  const lagMoveT =
    lagP < anticipationEnd
      ? 0
      : easeInOutQuart((lagP - anticipationEnd) / (1 - anticipationEnd));

  let scaleX = 1;
  let scaleY = 1;
  let scaleZ = 1;
  let pitchOffset = 0;

  if (p < anticipationEnd) {
    // Principle 1: Anticipation crouch
    const crouch = Math.sin((p / anticipationEnd) * Math.PI);
    scaleX = 1 + 0.15 * crouch;
    scaleY = 1 - 0.18 * crouch;
    scaleZ = 1 + 0.15 * crouch;
    pitchOffset = -0.09 * crouch;
  } else if (p < 0.38) {
    // Principle 2: Takeoff stretch
    const burst = Math.sin(((p - anticipationEnd) / (0.38 - anticipationEnd)) * Math.PI);
    scaleX = 1 - 0.14 * burst;
    scaleY = 1 + 0.24 * burst;
    scaleZ = 1 - 0.14 * burst;
    pitchOffset = 0.14 * burst;
  } else if (p > 0.82) {
    // Principle 5: Arrival squash & spring settle
    const landT = (p - 0.82) / 0.18;
    const bounce = Math.sin(landT * Math.PI * 2) * Math.exp(-landT * 3.2);
    scaleX = 1 + 0.08 * bounce;
    scaleY = 1 - 0.1 * bounce;
    scaleZ = 1 + 0.08 * bounce;
    pitchOffset = -0.06 * bounce;
  }

  const settleWave = p > 0.78 ? springSettle((p - 0.78) * 10, 0.16, 0.22, 2.2) : 0;

  return {
    moveT,
    lagMoveT,
    scaleX,
    scaleY,
    scaleZ,
    pitchOffset,
    settleWave,
  };
}

/**
 * Cinematic realm transition duration (seconds).
 * Slowed from 2.15s to 4.4s so carriers walk/ski/dive along an unfolding trail with atmospheric weather.
 */
export const REALM_TRANSITION_DURATION = 4.4;

/**
 * Computes the spring-unfolding scale (0..1) for segment `segmentIndex` of `totalSegments`
 * along the connecting path between the Main Island and the Second Realm.
 * Unfurls ahead of the carrier so the path is visibly built in front of the traveler.
 */
export function trailSegmentUnfoldScale(
  progress: number,
  segmentIndex: number,
  totalSegments: number,
): number {
  const p = clamp01(progress);
  if (p <= 0.01) return 0;
  const u = segmentIndex / Math.max(1, totalSegments - 1);
  const localT = (p - 0.02 - u * 0.62) * 3.6;
  if (localT <= 0) return 0;
  return Math.max(0.001, spring(localT, 0.66, 2.1));
}

/**
 * Computes the normalized intensity (0..1) of transition weather particles
 * (desert sand-wind streaks, alpine snow spray, abyssal bubble curtain, sky slipstream).
 */
export function weatherBurstIntensity(progress: number): number {
  const p = clamp01(progress);
  if (p <= 0.01) return 0;
  const transitBell = Math.sin(p * Math.PI);
  const realmAmbient = smoothstep(0.55, 1.0, p) * 0.38;
  return Math.min(1, transitBell * 0.92 + realmAmbient);
}

export interface SlalomWeavePose {
  lateralX: number;
  rollZ: number;
  yawOffset: number;
}

/**
 * Computes deterministic S-curve Slalom lateral weaving, inward carving roll, and tangent yaw
 * for the downhill skiing snowman (`snowball`) during transition (`0 < moveT < 1`).
 */
export function computeSlalomWeave(moveT: number): SlalomWeavePose {
  const u = clamp01(moveT);
  if (u <= 0.005 || u >= 0.995) {
    return { lateralX: 0, rollZ: 0, yawOffset: 0 };
  }
  const env = Math.sin(u * Math.PI);
  const phase = u * Math.PI * 4;
  const wave = Math.sin(phase);
  const deriv = Math.cos(phase);
  return {
    lateralX: wave * 1.65 * env,
    rollZ: -wave * 0.34 * env,
    yawOffset: deriv * 0.28 * env,
  };
}

/**
 * Computes the continuous ribbon reveal fraction (0..1) ahead of the traveling carrier
 * so `continuous-causeway` unfurls smoothly from the Main Island to the Second Realm.
 */
export function causewayRevealFraction(progress: number): number {
  const p = clamp01(progress);
  if (p <= 0.01) return 0;
  return clamp01((p - 0.01) / 0.72);
}

export interface SlopePose {
  x: number;
  y: number;
  z: number;
  pitchX: number;
  yawY: number;
  rollZ: number;
}

/**
 * Computes ground-clamped 3D position and slope-normal tangent orientation (pitch, yaw, carving roll)
 * along the continuous causeway / downhill ski slope so Camel and Snowman never float or ski flat.
 */
export function sampleSlopePose(
  moveT: number,
  hp: { x: number; y: number; z: number },
  ro: { x: number; y: number; z: number },
  carrier: 'submarine' | 'camel' | 'snowball' | 'rocket' | 'balloon',
): SlopePose {
  const u = clamp01(moveT);
  const isHorizontal = carrier === 'camel';
  const isDownhill = carrier === 'snowball';
  const destZ = ro.z - 2.6;
  const destY = ro.y + (isHorizontal || isDownhill ? 0.04 : 1.1);

  const isSubmarine = carrier === 'submarine';
  const evalPt = (t: number) => {
    const tc = clamp01(t);
    const arc = Math.sin(tc * Math.PI) * 2.2;
    const slalom = isDownhill
      ? computeSlalomWeave(tc)
      : { lateralX: 0, rollZ: 0, yawOffset: 0 };
    const subProgressZ = isSubmarine ? Math.pow(tc, 1.48) : tc;
    const subSeawardArc = isSubmarine ? Math.sin(tc * Math.PI) * 5.4 : 0;
    const subDiveY = isSubmarine ? Math.pow(tc, 0.84) : tc;
    return {
      x: hp.x + (ro.x - hp.x) * tc + (isDownhill ? slalom.lateralX : isHorizontal ? 0 : arc),
      y:
        hp.y +
        (destY - hp.y) * subDiveY -
        (isDownhill ? Math.sin(tc * Math.PI) * 0.85 : 0) +
        (isHorizontal ? Math.sin(tc * Math.PI) * 0.14 : 0),
      z: hp.z + (destZ - hp.z) * subProgressZ + (isHorizontal ? -arc : subSeawardArc),
      slalom,
    };
  };

  const cur = evalPt(u);
  if (u <= 0.005 || u >= 0.995) {
    return { x: cur.x, y: cur.y, z: cur.z, pitchX: 0, yawY: 0, rollZ: 0 };
  }

  const du = 0.015;
  const p0 = evalPt(Math.max(0, u - du));
  const p1 = evalPt(Math.min(1, u + du));
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const dz = p1.z - p0.z;
  const horiz = Math.max(1e-4, Math.hypot(dx, dz));
  const slopePitch = -Math.atan2(dy, horiz);

  if (isDownhill) {
    return {
      x: cur.x,
      y: cur.y,
      z: cur.z,
      pitchX: slopePitch * 0.78,
      yawY: Math.atan2(dx, dz),
      rollZ: cur.slalom.rollZ,
    };
  }
  if (isHorizontal) {
    return {
      x: cur.x,
      y: cur.y,
      z: cur.z,
      pitchX: slopePitch * 0.65,
      yawY: -Math.cos(u * Math.PI) * 0.16,
      rollZ: 0,
    };
  }
  return {
    x: cur.x,
    y: cur.y,
    z: cur.z,
    pitchX: slopePitch * 0.25,
    yawY: 0,
    rollZ: 0,
  };
}

export type TransitionAct = 'idle' | 'act1-departure' | 'act2-rush' | 'act3-reveal';

export interface CinematicCameraPose {
  act: TransitionAct;
  pos: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  fov: number;
  fovDelta: number;
  rollZ: number;
  carrierFocusWeight: number;
  lowAngleDip: number;
  springArrival: number;
}

/**
 * Round 9 Gap (c): 3-Act Cinematic Transition Camera Choreography
 * - Act I (`realmProgress ∈ [0.02, 0.22]`): Departure Focus — camera banks smoothly toward the active carrier with low-angle heroic framing
 * - Act II (`realmProgress ∈ [0.22, 0.72]`): Threshold Rush — dynamic FOV breathing (`+3.5°` speed sensation) and smooth banking roll across the threshold
 * - Act III (`realmProgress ∈ [0.72, 1.0]`): Realm Reveal — damped spring arrival into the Second Realm hero overview
 */
export function computeCameraPose(
  progress: number,
  carrier: 'submarine' | 'camel' | 'snowball' | 'rocket' | 'balloon',
  groundPos: { x: number; y: number; z: number },
  groundTarget: { x: number; y: number; z: number },
  midPos: { x: number; y: number; z: number },
  midTarget: { x: number; y: number; z: number },
  realmPos: { x: number; y: number; z: number },
  realmTarget: { x: number; y: number; z: number },
  carrierPos?: { x: number; y: number; z: number },
  baseFov = 35,
): CinematicCameraPose {
  const p = clamp01(progress);
  const act: TransitionAct =
    p < 0.02
      ? 'idle'
      : p <= 0.22
        ? 'act1-departure'
        : p <= 0.72
          ? 'act2-rush'
          : 'act3-reveal';

  // Act I: Departure Focus & Heroic Low-Angle Framing
  const act1Bell =
    p > 0.01 && p < 0.3
      ? Math.sin(clamp01((p - 0.01) / 0.29) * Math.PI)
      : 0;
  const lowAngleDip = act1Bell * 2.2;
  const carrierFocusWeight =
    smoothstep(0.01, 0.11, p) * (1 - smoothstep(0.54, 0.76, p)) * 0.65;

  // Act II: Threshold Rush — Dynamic FOV breathing (+3.5° at peak) & banking roll
  const rushBell =
    p > 0.18 && p < 0.76
      ? Math.sin(clamp01((p - 0.18) / (0.76 - 0.18)) * Math.PI)
      : 0;
  const fovDelta = 3.5 * rushBell;
  const fov = baseFov + fovDelta;
  const bankSign = carrier === 'camel' || carrier === 'snowball' ? -1 : 1;
  const rollZ = bankSign * (act1Bell * 0.022 + rushBell * 0.058);

  // Act III: Damped Spring Arrival into Second Realm Overview
  let springArrival = 0;
  if (p <= 0.72) {
    springArrival = easeInOutCubic(p / 0.72) * 0.76;
  } else {
    const revealU = (p - 0.72) / 0.28;
    const rawSpring = 0.76 + 0.24 * spring(revealU, 0.42, 1.32);
    const endSettle = smoothstep(0.93, 1.0, p);
    springArrival = lerp(rawSpring, 1.0, endSettle);
  }

  const k = springArrival;
  const omk = 1 - k;
  const b0 = omk * omk;
  const b1 = 2 * omk * k;
  const b2 = k * k;

  let posX = b0 * groundPos.x + b1 * midPos.x + b2 * realmPos.x;
  let posY = b0 * groundPos.y + b1 * midPos.y + b2 * realmPos.y - lowAngleDip;
  let posZ = b0 * groundPos.z + b1 * midPos.z + b2 * realmPos.z;

  let tarX = b0 * groundTarget.x + b1 * midTarget.x + b2 * realmTarget.x;
  let tarY = b0 * groundTarget.y + b1 * midTarget.y + b2 * realmTarget.y + lowAngleDip * 0.24;
  let tarZ = b0 * groundTarget.z + b1 * midTarget.z + b2 * realmTarget.z;

  if (carrierPos && carrierFocusWeight > 1e-4) {
    tarX = lerp(tarX, carrierPos.x, carrierFocusWeight);
    tarY = lerp(tarY, carrierPos.y + 0.8, carrierFocusWeight * 0.75);
    tarZ = lerp(tarZ, carrierPos.z, carrierFocusWeight);
    posX = lerp(posX, carrierPos.x + (posX - tarX) * 0.82, carrierFocusWeight * 0.24);
  }

  return {
    act,
    pos: { x: posX, y: posY, z: posZ },
    target: { x: tarX, y: tarY, z: tarZ },
    fov,
    fovDelta,
    rollZ,
    carrierFocusWeight,
    lowAngleDip,
    springArrival,
  };
}

/**
 * Staggered scale-bounce reveal on Second Realm project nodes during Act III (`realmProgress ∈ [0.72, 1.0]`).
 */
export function realmProjectRevealScale(
  realmProgress: number,
  projectIndex: number,
): number {
  const p = clamp01(realmProgress);
  if (p < 0.68) return 0.15;
  if (p >= 0.995) return 1.0;
  const startP = 0.7 + projectIndex * 0.045;
  const u = (p - startP) / 0.24;
  if (u <= 0) return 0.15;
  const raw = 0.15 + 0.85 * spring(u, 0.38, 1.25);
  const endSettle = smoothstep(0.94, 1.0, p);
  return lerp(raw, 1.0, endSettle);
}


