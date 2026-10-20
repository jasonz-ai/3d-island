import * as THREE from 'three';

export interface MatOpts {
  rough?: number;
  metal?: number;
  emissive?: number | string;
  emissiveIntensity?: number;
  opacity?: number;
  flat?: boolean;
  doubleSide?: boolean;
}

const matCache = new Map<string, THREE.MeshStandardMaterial>();
const windowTexCache = new Map<string, THREE.CanvasTexture>();

export function mat(color: number | string, opts: MatOpts = {}): THREE.MeshStandardMaterial {
  const key = `${color}_${opts.rough ?? 0.46}_${opts.metal ?? 0.04}_${opts.emissive ?? 0}_${
    opts.emissiveIntensity ?? 0
  }_${opts.opacity ?? 1}_${opts.flat ?? false}_${opts.doubleSide ?? false}`;
  const cached = matCache.get(key);
  if (cached) return cached;

  const isTransparent = opts.opacity !== undefined && opts.opacity < 1;
  const m = new THREE.MeshStandardMaterial({
    color,
    roughness: opts.rough ?? 0.46,
    metalness: opts.metal ?? 0.04,
    envMapIntensity: 0.44,
    flatShading: opts.flat ?? false,
    transparent: isTransparent,
    depthWrite: !isTransparent,
    opacity: opts.opacity ?? 1,
    side: opts.doubleSide ? THREE.DoubleSide : THREE.FrontSide,
  });
  if (opts.emissive !== undefined) {
    m.emissive = new THREE.Color(opts.emissive);
    m.emissiveIntensity = opts.emissiveIntensity ?? 0.55;
  }
  matCache.set(key, m);
  return m;
}

export function shadow(
  mesh: THREE.Object3D,
  cast = true,
  receive = true,
): THREE.Object3D {
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

export function createRoundedBoxGeometry(
  w: number,
  h: number,
  d: number,
  bevelRatio = 0.065,
): THREE.BufferGeometry {
  const segs = 3;
  const g = new THREE.BoxGeometry(w, h, d, segs, segs, segs);
  const hw = w / 2;
  const hh = h / 2;
  const hd = d / 2;
  const r = Math.min(w, h, d) * bevelRatio;
  if (r > 0.001) {
    const pos = g.attributes.position;
    const innerX = Math.max(0.0001, hw - r);
    const innerY = Math.max(0.0001, hh - r);
    const innerZ = Math.max(0.0001, hd - r);
    for (let i = 0; i < pos.count; i += 1) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);
      const cx = Math.max(-innerX, Math.min(innerX, vx));
      const cy = Math.max(-innerY, Math.min(innerY, vy));
      const cz = Math.max(-innerZ, Math.min(innerZ, vz));
      const dx = vx - cx;
      const dy = vy - cy;
      const dz = vz - cz;
      const len = Math.hypot(dx, dy, dz);
      if (len > 0.00001) {
        const s = r / len;
        pos.setXYZ(i, cx + dx * s, cy + dy * s, cz + dz * s);
      }
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
  }
  g.userData.isRoundedMiniature = true;
  return g;
}

export function box(
  w: number,
  h: number,
  d: number,
  color: number | string,
  opts?: MatOpts,
): THREE.Mesh {
  const m = new THREE.Mesh(createRoundedBoxGeometry(w, h, d), mat(color, opts));
  shadow(m);
  return m;
}

export function cyl(
  rt: number,
  rb: number,
  h: number,
  segs: number,
  color: number | string,
  opts?: MatOpts,
): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(rt, rb, h, segs),
    mat(color, opts),
  );
  shadow(m);
  return m;
}

export function sphere(
  r: number,
  segs: number,
  color: number | string,
  opts?: MatOpts,
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, segs, segs), mat(color, opts));
  shadow(m);
  return m;
}

export function pyramid(
  w: number,
  h: number,
  d: number,
  color: number | string,
  opts?: MatOpts,
): THREE.Mesh {
  const g = new THREE.ConeGeometry(1, h, 4);
  g.rotateY(Math.PI / 4);
  const s = Math.SQRT1_2;
  g.scale(w * s, 1, d * s);
  const m = new THREE.Mesh(g, mat(color, opts));
  shadow(m);
  return m;
}

export function gable(
  w: number,
  h: number,
  d: number,
  color: number | string,
  opts?: MatOpts,
): THREE.Mesh {
  const hw = w / 2;
  const hd = d / 2;
  const verts = new Float32Array([
    -hw, 0,  hd,   hw, 0,  hd,   0, h,  hd,
     hw, 0, -hd,  -hw, 0, -hd,   0, h, -hd,
    -hw, 0, -hd,  -hw, 0,  hd,   0, h,  hd,
    -hw, 0, -hd,   0, h,  hd,   0, h, -hd,
     hw, 0,  hd,   hw, 0, -hd,   0, h, -hd,
     hw, 0,  hd,   0, h, -hd,   0, h,  hd,
    -hw, 0, -hd,   hw, 0, -hd,   hw, 0,  hd,
    -hw, 0, -hd,   hw, 0,  hd,  -hw, 0,  hd,
  ]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat(color, opts));
  shadow(m);
  return m;
}

export function dome(
  r: number,
  color: number | string,
  opts?: MatOpts,
): THREE.Mesh {
  const g = new THREE.SphereGeometry(r, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const m = new THREE.Mesh(g, mat(color, opts));
  shadow(m);
  return m;
}

function makeWindowTile(wallHex: string, winHex: string, frameHex: string): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const cacheKey = `${wallHex}_${winHex}_${frameHex}_v2`;
  const hit = windowTexCache.get(cacheKey);
  if (hit) return hit;

  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  // Base stucco / stone facade
  ctx.fillStyle = wallHex;
  ctx.fillRect(0, 0, 128, 128);

  // Subtle horizontal floor slab spandrel band & vertical pilaster shadow
  ctx.fillStyle = 'rgba(28, 24, 18, 0.11)';
  ctx.fillRect(0, 0, 128, 10);
  ctx.fillRect(0, 118, 128, 10);
  ctx.fillStyle = 'rgba(255, 252, 244, 0.25)';
  ctx.fillRect(0, 10, 128, 3);

  // Outer recessed stone frame
  ctx.fillStyle = frameHex;
  ctx.fillRect(22, 18, 84, 88);

  // Top lintel & protruding bottom sill shadow
  ctx.fillStyle = 'rgba(20, 18, 15, 0.22)';
  ctx.fillRect(22, 18, 84, 5);
  ctx.fillRect(18, 104, 92, 6);

  // Deep window glass pane
  ctx.fillStyle = winHex;
  ctx.fillRect(28, 24, 72, 74);

  // Warm interior top glow + diagonal sky reflection
  const grad = ctx.createLinearGradient(28, 24, 28, 98);
  grad.addColorStop(0, 'rgba(255, 228, 162, 0.52)');
  grad.addColorStop(0.5, 'rgba(135, 192, 232, 0.16)');
  grad.addColorStop(1, 'rgba(255, 206, 122, 0.42)');
  ctx.fillStyle = grad;
  ctx.fillRect(28, 24, 72, 74);

  // Crisp window mullions (cross-bars)
  ctx.fillStyle = frameHex;
  ctx.fillRect(61, 24, 6, 74);
  ctx.fillRect(28, 58, 72, 5);

  // Specular glass highlight in upper-left & warm lamp glow in lower-right panes
  ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
  ctx.fillRect(33, 29, 22, 24);
  ctx.fillStyle = 'rgba(255, 232, 168, 0.54)';
  ctx.fillRect(71, 66, 23, 26);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  windowTexCache.set(cacheKey, tex);
  return tex;
}

export function windowedBox(
  w: number,
  h: number,
  d: number,
  wallHex: string,
  cols = 4,
  rows = 3,
  winHex = '#4E5D6C',
  frameHex = '#D2C8B8',
): THREE.Mesh {
  const baseTex = makeWindowTile(wallHex, winHex, frameHex);
  if (!baseTex) {
    return box(w, h, d, wallHex);
  }
  const frontTex = baseTex.clone();
  frontTex.needsUpdate = true;
  frontTex.repeat.set(cols, rows);

  const sideCols = Math.max(1, Math.round((cols * d) / Math.max(0.1, w)));
  const sideTex = baseTex.clone();
  sideTex.needsUpdate = true;
  sideTex.repeat.set(sideCols, rows);

  const frontMat = new THREE.MeshStandardMaterial({
    map: frontTex,
    roughness: 0.48,
    metalness: 0.05,
    emissive: new THREE.Color('#FFE4A8'),
    emissiveMap: frontTex,
    emissiveIntensity: 0.12,
  });
  const sideMat = new THREE.MeshStandardMaterial({
    map: sideTex,
    roughness: 0.48,
    metalness: 0.05,
    emissive: new THREE.Color('#FFE4A8'),
    emissiveMap: sideTex,
    emissiveIntensity: 0.1,
  });
  const capMat = mat(wallHex, { rough: 0.52 });

  const m = new THREE.Mesh(createRoundedBoxGeometry(w, h, d, 0.045), [
    sideMat,
    sideMat,
    capMat,
    capMat,
    frontMat,
    frontMat,
  ]);
  shadow(m);
  return m;
}

export function sign(
  text: string,
  w = 2.6,
  h = 0.62,
  bg = '#2B302C',
  fg = '#FAF6EE',
  border = '#E8643A',
): THREE.Mesh {
  if (typeof document === 'undefined') {
    return box(w, h, 0.08, bg);
  }
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = Math.max(96, Math.round(512 * (h / w)));
  const ctx = c.getContext('2d');
  if (!ctx) return box(w, h, 0.08, bg);

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = border;
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, c.width - 16, c.height - 16);

  ctx.fillStyle = fg;
  const label = text.slice(0, 22);
  let fontSize = Math.round(c.height * 0.42);
  ctx.font = `700 ${fontSize}px "Space Grotesk", "PingFang SC", sans-serif`;
  const maxTextW = c.width - 56;
  const measured = ctx.measureText(label).width;
  if (measured > maxTextW && measured > 0) {
    fontSize = Math.max(22, Math.floor((fontSize * maxTextW) / measured));
    ctx.font = `700 ${fontSize}px "Space Grotesk", "PingFang SC", sans-serif`;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, c.width / 2, c.height / 2 + 2, maxTextW);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const faceMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.42 });
  const rimMat = mat(bg, { rough: 0.5 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), [
    rimMat,
    rimMat,
    rimMat,
    rimMat,
    faceMat,
    faceMat,
  ]);
  shadow(m, true, false);
  return m;
}

export function bannerFlag(
  w = 1.0,
  h = 0.52,
  colorHex = '#E8643A',
): { mesh: THREE.Mesh; update: (t: number) => void } {
  const geo = new THREE.PlaneGeometry(w, h, 10, 3);
  geo.translate(w / 2, 0, 0);
  const mesh = new THREE.Mesh(
    geo,
    mat(colorHex, { rough: 0.55, doubleSide: true, emissive: colorHex, emissiveIntensity: 0.12 }),
  );
  shadow(mesh, true, false);
  const posAttr = geo.attributes.position as THREE.BufferAttribute;

  const update = (t: number) => {
    for (let i = 0; i < posAttr.count; i += 1) {
      const x = posAttr.getX(i);
      const pin = Math.min(1, x / Math.max(0.05, w));
      posAttr.setZ(i, Math.sin(x * 3.4 - t * 3.8) * 0.11 * pin);
    }
    posAttr.needsUpdate = true;
    geo.computeVertexNormals();
  };
  return { mesh, update };
}

export function streetLamp(accentHex = '#E8643A', poleHex = '#3A3F36'): THREE.Group {
  const g = new THREE.Group();
  const base = cyl(0.14, 0.18, 0.22, 8, poleHex, { metal: 0.35, rough: 0.45 });
  base.position.y = 0.11;
  const pole = cyl(0.055, 0.07, 1.85, 8, poleHex, { metal: 0.35, rough: 0.45 });
  pole.position.y = 1.02;
  const arm = box(0.42, 0.06, 0.06, poleHex, { metal: 0.35, rough: 0.45 });
  arm.position.set(0.16, 1.92, 0);
  const cap = pyramid(0.38, 0.16, 0.38, accentHex, { rough: 0.42 });
  cap.position.set(0.32, 1.98, 0);
  const bulb = sphere(0.13, 10, '#FFE4A3', {
    emissive: '#FFB347',
    emissiveIntensity: 0.95,
    rough: 0.2,
  });
  bulb.position.set(0.32, 1.82, 0);
  g.add(base, pole, arm, cap, bulb);
  return g;
}

let contactShadowTex: THREE.CanvasTexture | null = null;

function getContactShadowTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  if (contactShadowTex) return contactShadowTex;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
  grad.addColorStop(0, 'rgba(24, 20, 16, 0.85)');
  grad.addColorStop(0.55, 'rgba(24, 20, 16, 0.38)');
  grad.addColorStop(1, 'rgba(24, 20, 16, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  contactShadowTex = new THREE.CanvasTexture(c);
  return contactShadowTex;
}

/**
 * Soft radial ground contact shadow decal (ambient occlusion pad) under buildings, trees, and pavilions.
 */
export function contactShadow(rx = 2.8, rz = rx, opacity = 0.48): THREE.Mesh {
  const tex = getContactShadowTexture();
  const geo = new THREE.CircleGeometry(1, 32);
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({
      ...(tex ? { map: tex } : {}),
      color: tex ? '#FFFFFF' : '#241E18',
      transparent: true,
      opacity: tex ? opacity : opacity * 0.42,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    }),
  );
  m.name = 'contact-grounding-disc';
  m.scale.set(rx, 1, rz);
  m.position.y = 0.025;
  shadow(m, false, false);
  return m;
}

/**
 * Generates a procedural studio PMREM environment map in code (no external .hdr needed).
 * Gives every ceramic/wood primitive warm highlights and soft dark-to-light falloff.
 */
export function createStudioEnv(
  renderer: THREE.WebGLRenderer,
  accentHex = '#E8643A',
  skyHex = '#DDE6EE',
): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(skyHex);

  // Warm overhead softbox
  const topBox = new THREE.Mesh(
    new THREE.PlaneGeometry(28, 28),
    new THREE.MeshBasicMaterial({ color: '#FFF5E0', side: THREE.DoubleSide }),
  );
  topBox.position.set(0, 18, 0);
  topBox.rotation.x = Math.PI / 2;
  envScene.add(topBox);

  // Key warm studio card
  const keyPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 12),
    new THREE.MeshBasicMaterial({ color: '#FFDFB0', side: THREE.DoubleSide }),
  );
  keyPanel.position.set(-16, 11, 14);
  keyPanel.lookAt(0, 0, 0);
  envScene.add(keyPanel);

  // Cool slate-sky fill card on opposite side
  const fillPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 12),
    new THREE.MeshBasicMaterial({ color: '#8FB8DE', side: THREE.DoubleSide }),
  );
  fillPanel.position.set(16, 8, -12);
  fillPanel.lookAt(0, 0, 0);
  envScene.add(fillPanel);

  // Accent rim strip
  const rimStrip = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 4),
    new THREE.MeshBasicMaterial({ color: accentHex, side: THREE.DoubleSide }),
  );
  rimStrip.position.set(-12, 6, 16);
  rimStrip.lookAt(0, 0, 0);
  envScene.add(rimStrip);

  // Ground bounce plane (deeper warm earth to preserve underside contrast)
  const groundBounce = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshBasicMaterial({ color: '#7D7262', side: THREE.DoubleSide }),
  );
  groundBounce.position.set(0, -12, 0);
  groundBounce.rotation.x = -Math.PI / 2;
  envScene.add(groundBounce);

  const rt = pmrem.fromScene(envScene, 0.04);
  pmrem.dispose();
  return rt.texture;
}

/**
 * Soft, high-subdivision multi-puff cumulus marshmallow cloud cluster.
 * Uses smooth shading (flat=false) and warm sunlit self-illumination so clouds never look like faceted grey rocks.
 */
export function cumulusCloud(scale = 1, topHex = '#FFFDF9', underHex = '#EEF2F6'): THREE.Group {
  const g = new THREE.Group();
  g.name = 'cumulus-cloud';
  const topMat = mat(topHex, {
    rough: 0.48,
    metal: 0.0,
    flat: false,
    emissive: '#F5EFE4',
    emissiveIntensity: 0.36,
  });
  const underMat = mat(underHex, {
    rough: 0.54,
    metal: 0.0,
    flat: false,
    emissive: '#DEE6F0',
    emissiveIntensity: 0.28,
  });

  const puffs: [number, number, number, number, number, number, boolean][] = [
    [0, 0.42, 0, 1.15, 0.88, 0.96, true],
    [-0.95, 0.18, 0.12, 0.86, 0.72, 0.82, true],
    [0.98, 0.22, -0.08, 0.9, 0.76, 0.84, true],
    [-0.38, 0.56, -0.34, 0.78, 0.72, 0.76, true],
    [0.44, 0.48, 0.32, 0.74, 0.68, 0.74, true],
    [0, -0.06, 0, 1.48, 0.36, 1.08, false],
  ];

  for (const [px, py, pz, sx, sy, sz, isTop] of puffs) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 16), isTop ? topMat : underMat);
    mesh.position.set(px, py, pz);
    mesh.scale.set(sx, sy, sz);
    shadow(mesh, false, false);
    g.add(mesh);
  }

  g.scale.setScalar(scale);
  return g;
}


