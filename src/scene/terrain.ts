import * as THREE from 'three';
import {
  resolveSatellites,
  resolveWorldShape,
  type BiomeType as BiomeId,
  type DecorPropId,
  type SatelliteTheme,
  type ThemePalette as ThemeJson,
  type WorldShapeType,
} from '../schema/profile.ts';
import {
  computeObstacleClearanceField,
  getCoastRadius,
  getRiverCenterX,
  getTerrainHeight,
  type ObstacleClearanceField,
  type PlacedBuilding,
  type WorldLayout,
} from './layout.ts';
import { rng } from './motion.ts';
import { mat, box, cyl, sphere, pyramid, streetLamp, contactShadow } from './kit.ts';

type FoliageSpot = WorldLayout['foliage'][number];

export interface BuiltTerrain {
  group: THREE.Group;
  update: (t: number) => void;
}

const riverX = (z: number) => getRiverCenterX(z);

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function createSmoothVertexTerrain(
  biome: BiomeId,
  theme: ThemeJson,
  worldShape?: WorldShapeType,
): THREE.Group {
  const shape = resolveWorldShape(biome, worldShape);
  const group = new THREE.Group();
  group.name = 'smooth-terrain-group';

  const bedHex =
    biome === 'desert'
      ? '#9E4628'
      : biome === 'snow'
        ? '#74B2C8'
        : biome === 'grassland'
          ? '#7AB052'
          : '#4CAEEB';
  const sandHex =
    shape === 'floating-terraces'
      ? '#DDD5C7'
      : biome === 'desert'
        ? '#DF9B56'
        : biome === 'snow'
          ? '#DCECF2'
          : biome === 'grassland'
            ? '#84BC58'
            : '#F2E0AF';
  const grassHex1 =
    shape === 'b612-highland' && biome !== 'desert' && biome !== 'snow'
      ? '#7BC662'
      : shape === 'floating-terraces'
        ? '#88C464'
        : biome === 'desert'
          ? '#DF9B56'
          : biome === 'snow'
            ? '#F2F7F9'
            : biome === 'grassland'
              ? '#86C25A'
              : '#74B859';
  const grassHex2 =
    shape === 'b612-highland' && biome !== 'desert' && biome !== 'snow'
      ? '#529A4E'
      : shape === 'floating-terraces'
        ? '#D8CFC0'
        : biome === 'desert'
          ? '#C2623D'
          : biome === 'snow'
            ? '#D9E8EE'
            : biome === 'grassland'
              ? '#5EA042'
              : '#549845';
  const highHex =
    shape === 'b612-highland'
      ? '#D8E276'
      : shape === 'floating-terraces'
        ? '#F3EDE2'
        : biome === 'desert'
          ? '#E8B87D'
          : biome === 'snow'
            ? '#8B98A4'
            : biome === 'grassland'
              ? '#A8CA58'
              : '#B8AD92';

  const cBed = new THREE.Color(bedHex);
  const cSand = new THREE.Color(sandHex);
  const cGrass1 = new THREE.Color(grassHex1);
  const cGrass2 = new THREE.Color(grassHex2);
  const cHigh = new THREE.Color(highHex);
  const tmpColor = new THREE.Color();
  const tmpGrass = new THREE.Color();

  // Circular seabed disc (r = 46) only under the near-island channel so no square edge bleeds at the horizon
  const seabed = new THREE.Mesh(
    new THREE.CircleGeometry(46, 64),
    new THREE.MeshStandardMaterial({
      color: bedHex,
      roughness: 1.0,
      metalness: 0.0,
    }),
  );
  seabed.name = 'seabed';
  seabed.rotation.x = -Math.PI / 2;
  seabed.position.y = -1.62;
  seabed.receiveShadow = true;
  group.add(seabed);

  // 220x220 smooth vertex-colored island & submerged riverbed mesh
  const geo = new THREE.PlaneGeometry(52, 52, 220, 220);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);

  for (let i = 0; i < pos.count; i += 1) {
    let x = pos.getX(i);
    let z = pos.getZ(i);
    const r = Math.hypot(x, z);
    const angle = Math.atan2(z, x);
    const maxR = Math.min(23.35, getCoastRadius(angle, biome, shape) + 1.15);
    if (r > maxR) {
      x = Math.cos(angle) * maxR;
      z = Math.sin(angle) * maxR;
      pos.setX(i, x);
      pos.setZ(i, z);
    }
    const y = getTerrainHeight(x, z, biome, shape);
    pos.setY(i, y);

    if (y < -0.14) {
      tmpColor.copy(cBed);
    } else if (y < 0.08) {
      const t = smoothstep(-0.14, 0.08, y);
      tmpColor.copy(cBed).lerp(cSand, t);
    } else if (y < 0.42) {
      const t = smoothstep(0.08, 0.42, y);
      const patch = 0.5 + 0.5 * Math.sin(0.24 * x - 0.19 * z);
      tmpGrass.copy(cGrass1).lerp(cGrass2, patch * 0.65);
      tmpColor.copy(cSand).lerp(tmpGrass, t);
    } else if (shape === 'floating-terraces') {
      // Monument-Valley Architectural Marble & Emerald Terrace Gardens
      const isStepEdge = Math.abs(y - 0.72) > 0.14 && Math.abs(y - 1.6) > 0.16 && y < 2.35;
      if (isStepEdge) {
        tmpColor.copy(cSand);
      } else {
        tmpColor.copy(cGrass1).lerp(cHigh, smoothstep(0.8, 2.5, y) * 0.48);
      }
    } else if (shape === 'canyon-mesa' || biome === 'desert') {
      // Stratified Red Sandstone Mesa bands (Ochre -> Terracotta Red -> Sandstone Caprock)
      const band = 0.5 + 0.5 * Math.sin(y * 5.2 + x * 0.12);
      tmpColor.copy(cGrass1).lerp(cGrass2, band * 0.78);
      if (y > 1.65) {
        tmpColor.lerp(cHigh, smoothstep(1.65, 2.15, y) * 0.72);
      }
    } else if (shape === 'alpine-valley' || biome === 'snow') {
      // Alpine Snowpack with exposed granite crags on steep northern twin peaks
      const patch = 0.5 + 0.5 * Math.sin(0.22 * x + 0.25 * z);
      tmpColor.copy(cGrass1).lerp(cGrass2, patch * 0.55);
      if (y > 2.05) {
        const crag = smoothstep(2.05, 3.1, y) * (0.45 + 0.35 * Math.cos(x * 1.4));
        tmpColor.lerp(cHigh, Math.min(0.68, crag));
      }
    } else if (shape === 'b612-highland' || biome === 'grassland') {
      // B-612 / Pastoral Contour Terraces with golden sun-kissed upper dome
      const contour = 0.5 + 0.5 * Math.sin(y * 6.5 + 0.18 * x - 0.18 * z);
      tmpColor.copy(cGrass1).lerp(cGrass2, contour * 0.64);
      if (y > 1.25) {
        tmpColor.lerp(cHigh, smoothstep(1.25, 2.15, y) * 0.58);
      }
    } else {
      const patch = 0.5 + 0.5 * Math.sin(0.24 * x - 0.19 * z);
      const highlandTint = smoothstep(0.95, 1.85, y) * 0.25;
      tmpColor.copy(cGrass1).lerp(cGrass2, Math.min(1, patch * 0.72 + highlandTint));
    }

    colors[i * 3] = tmpColor.r;
    colors[i * 3 + 1] = tmpColor.g;
    colors[i * 3 + 2] = tmpColor.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.94,
    metalness: 0.02,
    flatShading: false,
  });
  const terrainMesh = new THREE.Mesh(geo, terrainMat);
  terrainMesh.name = 'smooth-terrain';
  terrainMesh.castShadow = true;
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // Coastal headwater boulders near the northern river mouth
  const srcZ = -16.8;
  const srcX = riverX(srcZ);
  const grottoRocks: [number, number, number, number][] = [
    [-2.4, -0.4, 0.85, 0.75],
    [2.4, -0.3, 0.88, 0.78],
    [-2.9, 0.5, 0.62, 0.68],
    [2.8, 0.6, 0.65, 0.72],
  ];
  for (const [dx, dz, r, sy] of grottoRocks) {
    const bx = srcX + dx;
    const bz = srcZ + dz;
    const boulder = sphere(r, 12, theme.terrain.groundSide, { rough: 0.92, flat: false });
    boulder.scale.set(1.15, sy, 0.95);
    boulder.position.set(
      bx,
      Math.max(0.05, getTerrainHeight(bx, bz, biome, shape)) + r * sy * 0.35,
      bz,
    );
    group.add(boulder);
  }

  return group;
}

function createSatelliteIslands(
  biome: BiomeId,
  theme: ThemeJson,
  explicitSatellites?: SatelliteTheme[],
): { group: THREE.Group; update: (t: number) => void } {
  const group = new THREE.Group();
  group.name = 'satellite-islands';
  const resolvedSats = resolveSatellites(biome, explicitSatellites);
  const topColor = biome === 'snow' ? '#EAF1F0' : theme.terrain.ground;
  const sideColor = theme.terrain.groundSide;
  const accent = theme.shared.accent;
  const wall = theme.shared.building;
  const updaters: Array<(t: number) => void> = [];

  // Helper to build a multi-lobed organic miniature island base (NOT a single round coin!)
  const shoalColor =
    biome === 'grassland'
      ? '#79AE52'
      : biome === 'desert'
        ? '#DF9B52'
        : biome === 'snow'
          ? '#D6EBF2'
          : '#EAD9A6';
  const makeIsletBase = (x: number, z: number, rx: number, rz: number, h = 0.84): THREE.Group => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const shoal = cyl(rx * 1.15, rx * 1.25, 0.22, 32, shoalColor, { rough: 0.9, flat: false });
    shoal.scale.z = rz / rx;
    shoal.position.y = biome === 'grassland' ? 0.16 : -0.06;
    const seawall = cyl(rx * 0.96, rx * 1.04, h, 32, '#C5BDAC', { rough: 0.86, flat: false });
    seawall.scale.z = rz / rx;
    seawall.position.y = h * 0.36;
    const cap = cyl(rx * 0.9, rx * 0.95, 0.24, 32, topColor, { rough: 0.84, flat: false });
    cap.scale.z = rz / rx;
    cap.position.y = h * 0.74 + 0.08;

    // Multi-lobe organic extensions (`satellite-organic-base`) so satellite islands are never plain circular coins
    const organicBase = new THREE.Group();
    organicBase.name = 'satellite-organic-base';
    for (const [lx, lz, lScaleX, lScaleZ, lHeight] of [
      [-rx * 0.62, rz * 0.38, rx * 0.56, rz * 0.48, h * 0.88],
      [rx * 0.58, -rz * 0.35, rx * 0.52, rz * 0.46, h * 0.82],
      [rx * 0.18, rz * 0.62, rx * 0.44, rz * 0.42, h * 0.74],
    ] as const) {
      const lobeRock = sphere(1, 14, '#B5AB99', { rough: 0.9, flat: false });
      lobeRock.scale.set(lScaleX, lHeight * 0.65, lScaleZ);
      lobeRock.position.set(lx, lHeight * 0.28, lz);
      const lobeMoss = sphere(1, 14, topColor, { rough: 0.84, flat: false });
      lobeMoss.scale.set(lScaleX * 0.92, lHeight * 0.35, lScaleZ * 0.92);
      lobeMoss.position.set(lx, lHeight * 0.62, lz);
      organicBase.add(lobeRock, lobeMoss);
    }
    const isletGrounding = contactShadow(rx * 0.86, rz * 0.82, 0.44);
    isletGrounding.position.y = h * 0.74 + 0.21;
    g.add(shoal, seawall, cap, organicBase, isletGrounding);
    return g;
  };

  // ============================================================================
  // 1. WEST SKYLINE ISLAND (-21.8, -4.8): Miniature Manhattan Skyline + Central Park + Torch Statue
  // ============================================================================
  const westIslet = makeIsletBase(-21.8, -4.8, 4.9, 4.2, 0.88);
  westIslet.name = 'west-skyline-island';
  const topY1 = 0.76;

  // 1a. InstancedMesh cluster of 18 mid-rise & high-rise Manhattan buildings
  const westTowerSpecs: [number, number, number, number, number, string][] = [
    [-2.4, -1.6, 0.72, 2.1, 0.72, '#DCD5C7'],
    [-1.4, -1.9, 0.68, 2.6, 0.68, '#B8C5D1'],
    [-0.3, -2.1, 0.76, 1.9, 0.72, '#C9B5A0'],
    [0.8, -1.8, 0.66, 2.3, 0.66, '#8EA3B8'],
    [1.8, -1.5, 0.7, 1.75, 0.7, '#DCD5C7'],
    [-2.8, -0.5, 0.68, 1.85, 0.68, '#C9B5A0'],
    [-1.7, -0.7, 0.75, 2.85, 0.75, '#9FB1C2'],
    [1.5, -0.4, 0.72, 2.2, 0.72, '#B8C5D1'],
    [2.5, -0.3, 0.64, 1.55, 0.64, '#DCD5C7'],
    [-2.5, 0.7, 0.66, 1.65, 0.66, '#B8C5D1'],
    [-1.5, 0.8, 0.7, 2.05, 0.7, '#DCD5C7'],
    [1.3, 0.8, 0.68, 1.8, 0.68, '#C9B5A0'],
    [2.3, 0.7, 0.62, 1.4, 0.62, '#8EA3B8'],
    [-2.0, 1.8, 0.64, 1.35, 0.64, '#DCD5C7'],
    [-0.9, 1.9, 0.66, 1.55, 0.66, '#9FB1C2'],
    [0.2, 1.8, 0.64, 1.45, 0.64, '#C9B5A0'],
    [1.2, 1.7, 0.6, 1.25, 0.6, '#DCD5C7'],
    [-3.2, 0.4, 0.58, 1.2, 0.58, '#8EA3B8'],
  ];
  const unitBoxGeo = new THREE.BoxGeometry(1, 1, 1);
  const westInstMat = new THREE.MeshStandardMaterial({
    color: '#FFFFFF',
    roughness: 0.62,
    metalness: 0.12,
  });
  const westCluster = new THREE.InstancedMesh(unitBoxGeo, westInstMat, westTowerSpecs.length);
  westCluster.name = 'west-skyline-cluster';
  westCluster.castShadow = true;
  westCluster.receiveShadow = true;
  const dummy = new THREE.Object3D();
  const tmpColor = new THREE.Color();
  westTowerSpecs.forEach(([tx, tz, w, h, d, hex], idx) => {
    dummy.position.set(tx, topY1 + h * 0.5, tz);
    dummy.rotation.set(0, ((idx % 3) - 1) * 0.06, 0);
    dummy.scale.set(w, h, d);
    dummy.updateMatrix();
    westCluster.setMatrixAt(idx, dummy.matrix);
    westCluster.setColorAt(idx, tmpColor.set(hex));
  });
  westCluster.instanceMatrix.needsUpdate = true;
  if (westCluster.instanceColor) westCluster.instanceColor.needsUpdate = true;
  westIslet.add(westCluster);

  // 1b. Hero Empire State Stepped Spire in the center-north of West Island
  const empireGroup = new THREE.Group();
  empireGroup.name = 'empire-spire';
  empireGroup.position.set(-0.4, topY1, -0.5);
  const empBase = box(1.18, 1.8, 1.18, '#E5DFD2', { rough: 0.58 });
  empBase.position.y = 0.9;
  const empMid = box(0.88, 1.35, 0.88, '#D8D1C2', { rough: 0.55 });
  empMid.position.y = 2.45;
  const empTop = box(0.58, 0.78, 0.58, '#9BA8B5', { rough: 0.4, metal: 0.28 });
  empTop.position.y = 3.5;
  const empCrown = cyl(0.16, 0.34, 0.48, 12, '#C2CCD6', { rough: 0.3, metal: 0.4 });
  empCrown.position.y = 4.12;
  const empNeedle = cyl(0.02, 0.06, 0.95, 8, '#E2E8F0', {
    emissive: '#FFD166',
    emissiveIntensity: 0.45,
  });
  empNeedle.position.y = 4.78;
  empireGroup.add(empBase, empMid, empTop, empCrown, empNeedle);
  westIslet.add(empireGroup);

  // 1c. Central Park Green Oasis Patch + Pond in the center-east of West Island
  const parkLawn = box(1.65, 0.08, 1.55, '#5E9E54', { rough: 0.88 });
  parkLawn.position.set(0.35, topY1 + 0.04, 0.45);
  const parkPond = cyl(0.42, 0.42, 0.09, 16, '#5BB5E8', { rough: 0.2, metal: 0.1 });
  parkPond.position.set(0.35, topY1 + 0.05, 0.45);
  westIslet.add(parkLawn, parkPond);
  for (const [px, pz] of [
    [-0.25, 0.05],
    [0.92, 0.1],
    [-0.2, 0.95],
    [0.9, 0.92],
  ] as const) {
    const miniTree = sphere(0.22, 10, '#4E8F46', { rough: 0.85, flat: false });
    miniTree.position.set(px, topY1 + 0.24, pz);
    westIslet.add(miniTree);
  }

  // 1d. Coastal Statue of Liberty / Torch Monument on seaward pedestal
  const statueGroup = new THREE.Group();
  statueGroup.name = 'west-statue';
  statueGroup.position.set(-3.4, 0.15, 2.0);
  const pedBase = cyl(0.62, 0.76, 0.55, 8, '#C5BDAC');
  pedBase.position.y = 0.28;
  const statueRobe = cyl(0.18, 0.32, 0.95, 10, '#72B095', { rough: 0.65 });
  statueRobe.position.y = 1.02;
  const statueCrown = sphere(0.16, 10, '#72B095');
  statueCrown.position.y = 1.6;
  const torchArm = cyl(0.04, 0.05, 0.45, 6, '#72B095');
  torchArm.position.set(0.14, 1.75, 0);
  torchArm.rotation.z = -0.35;
  const torchFlame = sphere(0.14, 10, '#FFE082', { emissive: '#FFAB2E', emissiveIntensity: 1.1 });
  torchFlame.position.set(0.22, 1.98, 0);
  statueGroup.add(pedBase, statueRobe, statueCrown, torchArm, torchFlame);
  westIslet.add(statueGroup);

  group.add(westIslet);

  // ============================================================================
  // 2. CROSS-SEA RED AERIAL CABLE CAR (`aerial-tram`) + TERMINAL STATIONS (`tram-station-main`, `tram-station-west`)
  // ============================================================================
  const tramGroup = new THREE.Group();
  tramGroup.name = 'aerial-tram';
  const mainTowerX = -15.4;
  const mainTowerZ = -5.6;
  const mainTowerY = Math.max(0.35, getTerrainHeight(mainTowerX, mainTowerZ, biome));
  const westTowerX = -18.8;
  const westTowerZ = -5.6;
  const westTowerY = topY1;

  const buildTramStation = (name: string, sx: number, sy: number, sz: number): THREE.Group => {
    const st = new THREE.Group();
    st.name = name;
    st.position.set(sx, sy, sz);
    const platform = box(1.55, 0.22, 1.38, '#D8CFC0', { rough: 0.85 });
    platform.position.y = 0.11;
    const glassHall = box(1.08, 0.64, 0.96, '#E0F2FE', {
      rough: 0.22,
      metal: 0.15,
      emissive: '#BAE6FD',
      emissiveIntensity: 0.28,
    });
    glassHall.position.y = 0.54;
    const canopy = box(1.36, 0.14, 1.18, accent, { rough: 0.48 });
    canopy.position.y = 0.92;
    const beacon = sphere(0.09, 8, '#FFE082', { emissive: '#FFAB2E', emissiveIntensity: 0.9 });
    beacon.position.set(0, 1.08, 0.48);
    st.add(platform, glassHall, canopy, beacon);
    return st;
  };

  const buildPylon = (px: number, py: number, pz: number, h: number): THREE.Group => {
    const p = new THREE.Group();
    p.position.set(px, py, pz);
    const legL = cyl(0.08, 0.14, h, 8, '#64748B', { rough: 0.5, metal: 0.35 });
    legL.position.set(0, h * 0.5, -0.28);
    const legR = cyl(0.08, 0.14, h, 8, '#64748B', { rough: 0.5, metal: 0.35 });
    legR.position.set(0, h * 0.5, 0.28);
    const crossbar = box(0.32, 0.14, 0.92, '#475569', { rough: 0.45, metal: 0.4 });
    crossbar.position.set(0, h, 0);
    const capLight = sphere(0.1, 8, '#FF6A13', { emissive: '#FF6A13', emissiveIntensity: 0.8 });
    capLight.position.set(0, h + 0.14, 0);
    p.add(legL, legR, crossbar, capLight);
    return p;
  };

  const pylonH1 = 2.65;
  const pylonH2 = 2.55;
  tramGroup.add(
    buildTramStation('tram-station-main', mainTowerX, mainTowerY, mainTowerZ),
    buildTramStation('tram-station-west', westTowerX, westTowerY, westTowerZ),
    buildPylon(mainTowerX, mainTowerY, mainTowerZ, pylonH1),
    buildPylon(westTowerX, westTowerY, westTowerZ, pylonH2),
  );

  const topA = new THREE.Vector3(mainTowerX, mainTowerY + pylonH1, mainTowerZ);
  const topB = new THREE.Vector3(westTowerX, westTowerY + pylonH2, westTowerZ);
  const cableVec = new THREE.Vector3().subVectors(topB, topA);
  const cableLen = cableVec.length();
  const cableMid = new THREE.Vector3().addVectors(topA, topB).multiplyScalar(0.5);

  const cableGeo = new THREE.CylinderGeometry(0.025, 0.025, cableLen, 8);
  cableGeo.rotateZ(Math.PI / 2);
  const cableMesh = new THREE.Mesh(
    cableGeo,
    mat('#334155', { rough: 0.4, metal: 0.5 }),
  );
  cableMesh.position.copy(cableMid);
  cableMesh.lookAt(topB);
  cableMesh.rotateY(Math.PI / 2);
  tramGroup.add(cableMesh);

  // Red Aerial Tram Cabin (#C8102E)
  const cabinGroup = new THREE.Group();
  cabinGroup.name = 'aerial-tram-cabin';
  const hanger = cyl(0.03, 0.03, 0.42, 6, '#334155');
  hanger.position.y = -0.21;
  const cabinRoof = box(0.86, 0.1, 0.54, '#FAF6EE', { rough: 0.4 });
  cabinRoof.position.y = -0.42;
  const cabinBody = box(0.92, 0.48, 0.58, '#C8102E', { rough: 0.38 });
  cabinBody.position.y = -0.68;
  const cabinWindows = box(0.94, 0.2, 0.6, '#E0F2FE', {
    emissive: '#BAE6FD',
    emissiveIntensity: 0.45,
    rough: 0.2,
  });
  cabinWindows.position.y = -0.62;
  cabinGroup.add(hanger, cabinRoof, cabinBody, cabinWindows);
  cabinGroup.position.copy(cableMid);
  tramGroup.add(cabinGroup);
  group.add(tramGroup);

  updaters.push((t) => {
    const u = 0.5 + 0.42 * Math.sin(t * 0.55);
    cabinGroup.position.lerpVectors(topA, topB, u);
    cabinGroup.rotation.z = Math.cos(t * 0.55) * 0.055;
  });

  // ============================================================================
  // 2B. GRAND MULTI-ARCH CROSS-SEA BRIDGE (`grand-sea-bridge`) linking Main Island West Coast & West Skyline Island
  // ============================================================================
  const grandBridge = new THREE.Group();
  grandBridge.name = 'grand-sea-bridge';
  const brStart = new THREE.Vector3(-15.2, 0.58, -2.6);
  const brEnd = new THREE.Vector3(-18.2, 0.68, -2.8);
  const brVec = new THREE.Vector3().subVectors(brEnd, brStart);
  const brLen = brVec.length();
  const brAngle = Math.atan2(-brVec.z, brVec.x);
  grandBridge.position.copy(brStart);
  grandBridge.rotation.y = brAngle;

  // Stone piers & arch spans along local +X (0..brLen)
  const pierCount = 5;
  for (let i = 0; i < pierCount; i += 1) {
    const lx = (i / (pierCount - 1)) * brLen;
    const pier = cyl(0.22, 0.32, 1.35, 10, '#C5BDAC', { rough: 0.86 });
    pier.position.set(lx, -0.52, 0);
    grandBridge.add(pier);
    if (i < pierCount - 1) {
      const nextX = ((i + 1) / (pierCount - 1)) * brLen;
      const midX = (lx + nextX) * 0.5;
      const archCrown = box((nextX - lx) * 0.78, 0.16, 1.18, '#D8CFC0', { rough: 0.82 });
      archCrown.position.set(midX, -0.06, 0);
      grandBridge.add(archCrown);
    }
  }

  // Elevated roadway deck + center divider + coral-orange arch truss parapets
  const brDeck = box(brLen + 0.5, 0.16, 1.36, '#475569', { rough: 0.78 });
  brDeck.position.set(brLen * 0.5, 0.08, 0);
  grandBridge.add(brDeck);

  for (let d = 0; d < 6; d += 1) {
    const dash = box(0.45, 0.17, 0.06, '#FACC15', { emissive: '#FACC15', emissiveIntensity: 0.25 });
    dash.position.set((d + 0.5) * (brLen / 6), 0.085, 0);
    grandBridge.add(dash);
  }

  for (const side of [-0.62, 0.62] as const) {
    const parapet = box(brLen + 0.4, 0.14, 0.09, accent, { rough: 0.5 });
    parapet.position.set(brLen * 0.5, 0.24, side);
    grandBridge.add(parapet);
    const topChord = box(brLen * 0.56, 0.08, 0.08, accent, { rough: 0.45 });
    topChord.position.set(brLen * 0.5, 0.78, side);
    grandBridge.add(topChord);
    for (const strutU of [0.22, 0.5, 0.78] as const) {
      const hangerRod = cyl(0.025, 0.025, 0.56, 6, '#CBD5E1');
      hangerRod.position.set(brLen * strutU, 0.5, side);
      grandBridge.add(hangerRod);
    }
  }

  // Animated miniature vehicles (`bridge-vehicles`) shuttling in two lanes across the bridge
  const bridgeVehicles = new THREE.Group();
  bridgeVehicles.name = 'bridge-vehicles';
  const makeMiniCar = (bodyCol: string, roofCol: string, laneZ: number): THREE.Group => {
    const car = new THREE.Group();
    const chassis = box(0.56, 0.18, 0.28, bodyCol, { rough: 0.4 });
    chassis.position.y = 0.24;
    const cabin = box(0.32, 0.14, 0.24, roofCol, { rough: 0.3 });
    cabin.position.y = 0.38;
    const headlights = box(0.58, 0.06, 0.22, '#FEF08A', { emissive: '#FACC15', emissiveIntensity: 0.8 });
    headlights.position.y = 0.24;
    car.add(chassis, cabin, headlights);
    car.position.set(brLen * 0.5, 0, laneZ);
    return car;
  };
  const car1 = makeMiniCar('#F59E0B', '#FEF3C7', -0.28);
  const car2 = makeMiniCar('#F8FAFC', accent, 0.28);
  bridgeVehicles.add(car1, car2);
  grandBridge.add(bridgeVehicles);
  group.add(grandBridge);

  updaters.push((t) => {
    const u1 = (t * 0.26) % 1;
    const u2 = 1 - ((t * 0.22 + 0.45) % 1);
    car1.position.x = 0.35 + u1 * (brLen - 0.7);
    car2.position.x = 0.35 + u2 * (brLen - 0.7);
  });

  // ============================================================================
  // 3. EAST SKYLINE ISLAND (18.8, -13.2): Miniature Pudong Skyline + Island Airport & Control Tower
  // ============================================================================
  const eastIslet = makeIsletBase(18.8, -13.2, 4.6, 4.0, 0.84);
  eastIslet.name = 'east-skyline-island';
  const topY2 = 0.72;

  // 3a. Oriental Pearl Tower (`oriental-pearl-tower`)
  const pearlGroup = new THREE.Group();
  pearlGroup.name = 'oriental-pearl-tower';
  pearlGroup.position.set(-1.35, topY2, 0.35);
  for (let k = 0; k < 3; k += 1) {
    const ang = (k * Math.PI * 2) / 3;
    const strut = cyl(0.08, 0.14, 1.35, 8, '#E2E8F0', { rough: 0.45 });
    strut.position.set(Math.cos(ang) * 0.42, 0.58, Math.sin(ang) * 0.42);
    strut.rotation.z = Math.cos(ang) * 0.32;
    strut.rotation.x = -Math.sin(ang) * 0.32;
    pearlGroup.add(strut);
  }
  const pearlShaft = cyl(0.18, 0.24, 3.85, 12, '#E2E8F0', { rough: 0.4, metal: 0.2 });
  pearlShaft.position.y = 1.92;
  const lowerSphere = sphere(0.58, 16, '#C6557F', {
    rough: 0.32,
    metal: 0.25,
    emissive: '#C6557F',
    emissiveIntensity: 0.18,
  });
  lowerSphere.position.y = 1.25;
  const midSphere = sphere(0.42, 16, '#C6557F', {
    rough: 0.32,
    metal: 0.25,
    emissive: '#C6557F',
    emissiveIntensity: 0.2,
  });
  midSphere.position.y = 2.65;
  const upperSphere = sphere(0.24, 14, '#F1F5F9', { rough: 0.35 });
  upperSphere.position.y = 3.65;
  const pearlSpire = cyl(0.02, 0.06, 1.15, 8, '#F8FAFC', {
    emissive: '#FF67A8',
    emissiveIntensity: 0.6,
  });
  pearlSpire.position.y = 4.42;
  pearlGroup.add(pearlShaft, lowerSphere, midSphere, upperSphere, pearlSpire);
  eastIslet.add(pearlGroup);

  // 3b. Twisted Helical Shanghai Tower (`twisted-tower`)
  const twistedGroup = new THREE.Group();
  twistedGroup.name = 'twisted-tower';
  twistedGroup.position.set(0.45, topY2, -0.55);
  for (let tier = 0; tier < 9; tier += 1) {
    const s = 1 - tier * 0.055;
    const seg = box(0.95 * s, 0.44, 0.72 * s, '#88C4D8', {
      rough: 0.25,
      metal: 0.35,
      emissive: '#38BDF8',
      emissiveIntensity: 0.1,
    });
    seg.position.y = 0.22 + tier * 0.43;
    seg.rotation.y = tier * 0.17;
    twistedGroup.add(seg);
  }
  eastIslet.add(twistedGroup);

  // 3c. Blue Bottle-Opener World Financial Tower (`bottle-opener-tower`)
  const openerGroup = new THREE.Group();
  openerGroup.name = 'bottle-opener-tower';
  openerGroup.position.set(1.65, topY2, 0.4);
  const openerBody = box(0.84, 3.1, 0.56, '#4D7EA8', { rough: 0.3, metal: 0.3 });
  openerBody.position.y = 1.55;
  const openerPillarL = box(0.22, 0.68, 0.56, '#4D7EA8', { rough: 0.3, metal: 0.3 });
  openerPillarL.position.set(-0.31, 3.44, 0);
  const openerPillarR = box(0.22, 0.68, 0.56, '#4D7EA8', { rough: 0.3, metal: 0.3 });
  openerPillarR.position.set(0.31, 3.44, 0);
  const openerBridge = box(0.86, 0.18, 0.58, '#E2E8F0', { rough: 0.28, metal: 0.35 });
  openerBridge.position.set(0, 3.84, 0);
  openerGroup.add(openerBody, openerPillarL, openerPillarR, openerBridge);
  eastIslet.add(openerGroup);

  // 3d. InstancedMesh cluster of 14 surrounding Pudong financial towers
  const eastTowerSpecs: [number, number, number, number, number, string][] = [
    [-2.3, -1.1, 0.64, 1.85, 0.64, '#B8C7D4'],
    [-1.5, -1.6, 0.68, 2.25, 0.68, '#D6CFC2'],
    [-0.5, -1.8, 0.62, 1.95, 0.62, '#96B2C8'],
    [0.7, -1.7, 0.62, 1.75, 0.62, '#C5D1DB'],
    [1.8, -1.3, 0.66, 2.1, 0.66, '#D6CFC2'],
    [2.5, -0.4, 0.58, 1.6, 0.58, '#96B2C8'],
    [-2.5, 0.2, 0.6, 1.5, 0.6, '#D6CFC2'],
    [-0.3, 0.9, 0.7, 2.4, 0.7, '#C5B8A5'],
    [0.8, 1.2, 0.62, 1.7, 0.62, '#B8C7D4'],
    [2.2, 1.1, 0.58, 1.45, 0.58, '#D6CFC2'],
    [-1.9, 1.4, 0.56, 1.35, 0.56, '#96B2C8'],
    [-0.9, 1.7, 0.58, 1.4, 0.58, '#C5D1DB'],
    [0.1, 1.8, 0.56, 1.25, 0.56, '#D6CFC2'],
    [1.2, 1.7, 0.56, 1.3, 0.56, '#96B2C8'],
  ];
  const eastInstMat = new THREE.MeshStandardMaterial({
    color: '#FFFFFF',
    roughness: 0.58,
    metalness: 0.16,
  });
  const eastCluster = new THREE.InstancedMesh(unitBoxGeo, eastInstMat, eastTowerSpecs.length);
  eastCluster.name = 'east-skyline-cluster';
  eastCluster.castShadow = true;
  eastCluster.receiveShadow = true;
  eastTowerSpecs.forEach(([tx, tz, w, h, d, hex], idx) => {
    dummy.position.set(tx, topY2 + h * 0.5, tz);
    dummy.rotation.set(0, ((idx % 3) - 1) * 0.05, 0);
    dummy.scale.set(w, h, d);
    dummy.updateMatrix();
    eastCluster.setMatrixAt(idx, dummy.matrix);
    eastCluster.setColorAt(idx, tmpColor.set(hex));
  });
  eastCluster.instanceMatrix.needsUpdate = true;
  if (eastCluster.instanceColor) eastCluster.instanceColor.needsUpdate = true;
  eastIslet.add(eastCluster);

  // 3e. Coastal Island Airfield Runway (`east-airstrip`) & Airfield Control Tower (`airfield-control-tower`)
  const airstrip = new THREE.Group();
  airstrip.name = 'east-airstrip';
  airstrip.position.set(0.1, topY2 + 0.04, 2.35);
  const runwayDeck = box(4.1, 0.08, 0.82, '#2D343E', { rough: 0.82 });
  airstrip.add(runwayDeck);
  for (let d = -3; d <= 3; d += 1) {
    const dash = box(0.32, 0.09, 0.07, '#F8FAFC');
    dash.position.set(d * 0.54, 0.005, 0);
    airstrip.add(dash);
  }
  for (const lx of [-1.7, 0, 1.7] as const) {
    for (const lz of [-0.36, 0.36] as const) {
      const edgeLight = sphere(0.05, 6, '#38BDF8', {
        emissive: '#38BDF8',
        emissiveIntensity: 0.9,
      });
      edgeLight.position.set(lx, 0.06, lz);
      airstrip.add(edgeLight);
    }
  }
  eastIslet.add(airstrip);

  const controlTower = new THREE.Group();
  controlTower.name = 'airfield-control-tower';
  controlTower.position.set(2.25, topY2, 1.65);
  const ctShaft = cyl(0.22, 0.32, 1.55, 10, '#F1F5F9', { rough: 0.5 });
  ctShaft.position.y = 0.78;
  const ctCab = cyl(0.38, 0.28, 0.34, 8, '#38BDF8', {
    rough: 0.2,
    metal: 0.25,
    emissive: '#0284C7',
    emissiveIntensity: 0.35,
  });
  ctCab.position.y = 1.68;
  const ctRoof = cyl(0.42, 0.42, 0.08, 8, accent, { rough: 0.45 });
  ctRoof.position.y = 1.88;
  const ctRadar = box(0.42, 0.1, 0.06, '#E2E8F0', { rough: 0.3, metal: 0.4 });
  ctRadar.position.y = 2.04;
  controlTower.add(ctShaft, ctCab, ctRoof, ctRadar);
  eastIslet.add(controlTower);
  updaters.push((t) => {
    ctRadar.rotation.y = t * 2.2;
  });

  group.add(eastIslet);

  // ============================================================================
  // 4. CROSS-SEA SHUTTLE FERRY (`shuttle-ferry`) & PIERS (`east-ferry-pier`, `east-island-pier`)
  // ============================================================================
  const ferryGroup = new THREE.Group();
  ferryGroup.name = 'shuttle-ferry';
  const hullLower = box(1.75, 0.24, 0.76, '#2F7D5B', { rough: 0.55 });
  hullLower.position.y = 0.08;
  const hullDeck = box(1.85, 0.14, 0.82, '#F3EFE2', { rough: 0.6 });
  hullDeck.position.y = 0.25;
  const cabin1 = box(1.22, 0.32, 0.62, '#F3EFE2', { rough: 0.5 });
  cabin1.position.y = 0.46;
  const cabinStripe = box(1.26, 0.1, 0.64, '#2F7D5B', { rough: 0.5 });
  cabinStripe.position.y = 0.46;
  const ferryRoof = box(1.3, 0.09, 0.68, '#2F7D5B', { rough: 0.55 });
  ferryRoof.position.y = 0.65;
  const smokestack = cyl(0.1, 0.12, 0.34, 10, '#D9843A', { rough: 0.5 });
  smokestack.position.set(-0.15, 0.82, 0);
  const wakeFoam = box(0.95, 0.02, 0.52, '#FFFFFF', {
    emissive: '#FFFFFF',
    emissiveIntensity: 0.35,
    opacity: 0.55,
  });
  wakeFoam.position.set(-1.25, 0.01, 0);
  ferryGroup.add(hullLower, hullDeck, cabin1, cabinStripe, ferryRoof, smokestack, wakeFoam);

  const pierA = new THREE.Vector3(15.0, -0.02, -10.8);
  const pierB = new THREE.Vector3(16.2, -0.02, -11.8);
  ferryGroup.position.copy(pierA);
  group.add(ferryGroup);

  updaters.push((t) => {
    const phase = t * 0.42;
    const u = 0.5 - 0.5 * Math.cos(phase);
    const dir = Math.sin(phase) >= 0 ? 1 : -1;
    ferryGroup.position.lerpVectors(pierA, pierB, u);
    ferryGroup.position.y = (biome === 'grassland' ? 0.18 : -0.02) + Math.sin(t * 2.4) * 0.025;
    const dx = (pierB.x - pierA.x) * dir;
    const dz = (pierB.z - pierA.z) * dir;
    ferryGroup.rotation.y = Math.atan2(-dz, dx);
    ferryGroup.rotation.z = Math.sin(t * 2.1) * 0.03;
  });

  const buildSatelliteThemeOutpost = (
    satTheme: SatelliteTheme,
    topY: number,
  ): THREE.Group => {
    const outpost = new THREE.Group();
    outpost.name = `satellite-theme-${satTheme}`;
    if (satTheme === 'lighthouse-reef') {
      const lhBase = cyl(0.46, 0.62, 1.85, 16, wall, { rough: 0.68, flat: false });
      lhBase.position.set(0.25, topY + 0.92, 0.1);
      const lhStripe = cyl(0.5, 0.56, 0.58, 16, accent, { rough: 0.65, flat: false });
      lhStripe.position.set(0.25, topY + 0.98, 0.1);
      const lhGallery = cyl(0.54, 0.52, 0.12, 16, '#2D343E', { rough: 0.5 });
      lhGallery.position.set(0.25, topY + 1.88, 0.1);
      const lhLantern = sphere(0.28, 14, '#FFE49E', {
        emissive: '#FFAE34',
        emissiveIntensity: 0.95,
      });
      lhLantern.position.set(0.25, topY + 2.08, 0.1);
      const lhCap = cyl(0.04, 0.36, 0.28, 14, accent, { rough: 0.5, flat: false });
      lhCap.position.set(0.25, topY + 2.32, 0.1);
      const keeperHouse = box(0.95, 0.62, 0.72, '#FAF3E6', { rough: 0.78 });
      keeperHouse.position.set(-0.78, topY + 0.31, 0.25);
      const keeperRoof = box(1.06, 0.18, 0.82, accent, { rough: 0.68 });
      keeperRoof.position.set(-0.78, topY + 0.68, 0.25);
      outpost.add(lhBase, lhStripe, lhGallery, lhLantern, lhCap, keeperHouse, keeperRoof);
    } else if (satTheme === 'windmill-ranch') {
      const millTower = cyl(0.48, 0.68, 1.65, 10, '#B85A3A', { rough: 0.8 });
      millTower.position.set(0.15, topY + 0.82, 0);
      const millCap = sphere(0.5, 12, '#3A3F36', { rough: 0.75, flat: false });
      millCap.scale.set(1, 0.72, 1.1);
      millCap.position.set(0.15, topY + 1.68, 0);
      const sails = new THREE.Group();
      sails.name = 'sat-windmill-sails';
      sails.position.set(0.15, topY + 1.52, 0.54);
      for (let k = 0; k < 4; k += 1) {
        const arm = new THREE.Group();
        arm.rotation.z = (k * Math.PI) / 2;
        const spar = box(0.07, 1.25, 0.05, '#76533B');
        spar.position.y = 0.62;
        const vane = box(0.26, 0.98, 0.03, '#FAF6EE');
        vane.position.set(0.14, 0.68, 0.02);
        arm.add(spar, vane);
        sails.add(arm);
      }
      outpost.add(millTower, millCap, sails);
      for (let row = -1; row <= 1; row += 1) {
        const strip = box(1.15, 0.14, 0.24, row === 0 ? '#F5B041' : '#8E6CD8', { rough: 0.85 });
        strip.position.set(-0.85, topY + 0.07, row * 0.36);
        outpost.add(strip);
      }
      updaters.push((t) => {
        sails.rotation.z = -t * 1.25;
      });
    } else if (satTheme === 'b612-observatory') {
      // Little Prince B-612 Volcano + Brass Telescope Observatory + Moss Boulders
      const volcano = cyl(0.32, 0.92, 1.28, 16, '#A86448', { rough: 0.88, flat: false });
      volcano.position.set(-0.65, topY + 0.64, -0.15);
      const craterRim = new THREE.Mesh(
        new THREE.TorusGeometry(0.3, 0.08, 10, 20),
        mat('#7C4632', { rough: 0.85, flat: false }),
      );
      craterRim.rotation.x = Math.PI / 2;
      craterRim.position.set(-0.65, topY + 1.28, -0.15);
      const lavaGlow = sphere(0.2, 10, '#FF6A13', {
        emissive: '#FF5500',
        emissiveIntensity: 0.85,
      });
      lavaGlow.scale.y = 0.4;
      lavaGlow.position.set(-0.65, topY + 1.24, -0.15);
      const obsDome = sphere(0.68, 16, '#FAF6EE', { rough: 0.45, flat: false });
      obsDome.position.set(0.68, topY + 0.45, 0.25);
      const scopeTube = cyl(0.08, 0.12, 0.88, 12, '#F59E0B', { rough: 0.28, metal: 0.65 });
      scopeTube.position.set(0.85, topY + 0.96, 0.45);
      scopeTube.rotation.x = -0.55;
      const starRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.45, 0.035, 8, 36),
        mat('#FDE047', { emissive: '#F59E0B', emissiveIntensity: 0.65 }),
      );
      starRing.rotation.x = Math.PI / 2 - 0.24;
      starRing.position.set(0, topY + 1.15, 0);
      outpost.add(volcano, craterRim, lavaGlow, obsDome, scopeTube, starRing);
      updaters.push((t) => {
        starRing.rotation.z = t * 0.65;
      });
    } else if (satTheme === 'skyline-cbd') {
      for (const [tx, tz, h, col] of [
        [-0.6, -0.3, 2.2, '#38BDF8'],
        [0.2, -0.4, 2.8, '#1E293B'],
        [0.8, 0.3, 1.9, '#94A3B8'],
        [-0.3, 0.5, 1.6, '#E2E8F0'],
      ] as const) {
        const tw = box(0.58, h, 0.58, col, { rough: 0.35, metal: 0.3 });
        tw.position.set(tx, topY + h * 0.5, tz);
        outpost.add(tw);
      }
    } else if (satTheme === 'airfield-harbor') {
      const strip = box(2.4, 0.08, 0.64, '#2D343E', { rough: 0.82 });
      strip.position.set(0, topY + 0.04, 0.35);
      const tower = cyl(0.18, 0.26, 1.35, 10, '#F1F5F9');
      tower.position.set(0.65, topY + 0.68, -0.45);
      const cab = cyl(0.32, 0.24, 0.28, 8, '#38BDF8', {
        emissive: '#0284C7',
        emissiveIntensity: 0.35,
      });
      cab.position.set(0.65, topY + 1.42, -0.45);
      outpost.add(strip, tower, cab);
    }
    return outpost;
  };

  // ============================================================================
  // 5. SOUTH-WEST FOREGROUND REEF ISLET (-22.2, 14.2) with Customizable Outpost Theme
  // ============================================================================
  const swIslet = makeIsletBase(-22.2, 14.2, 3.2, 2.7, 0.62);
  swIslet.name = 'sw-reef-island';
  const topY3 = 0.55;
  if (resolvedSats[2] === 'hidden') {
    swIslet.visible = false;
  } else {
    swIslet.add(buildSatelliteThemeOutpost(resolvedSats[2], topY3));
  }
  const rockCluster = sphere(0.75, 12, sideColor, { rough: 0.92, flat: false });
  rockCluster.scale.set(1.3, 0.7, 0.95);
  rockCluster.position.set(-0.7, topY3 + 0.35, -0.3);
  swIslet.add(rockCluster);
  group.add(swIslet);

  // 6. East Ferry Timber Pier on Main Island North-East Coast + Receiving Pier on East Skyline Island
  const eastPier = new THREE.Group();
  eastPier.name = 'east-ferry-pier';
  const pierDeck = box(1.5, 0.14, 0.72, '#7A583E', { rough: 0.85 });
  pierDeck.position.set(14.1, 0.22, -10.1);
  pierDeck.rotation.y = 0.6;
  const pierLamp = sphere(0.11, 8, '#FFD995', { emissive: '#FFB85C', emissiveIntensity: 0.9 });
  pierLamp.position.set(14.5, 0.66, -10.4);
  eastPier.add(pierDeck, pierLamp);
  group.add(eastPier);

  const eastIslandPier = new THREE.Group();
  eastIslandPier.name = 'east-island-pier';
  const rPierDeck = box(1.55, 0.14, 0.74, '#7A583E', { rough: 0.85 });
  rPierDeck.position.set(16.2, 0.28, -11.5);
  rPierDeck.rotation.y = 0.6;
  const rPierLamp = sphere(0.11, 8, '#FFD995', { emissive: '#FFB85C', emissiveIntensity: 0.9 });
  rPierLamp.position.set(15.8, 0.72, -11.2);
  eastIslandPier.add(rPierDeck, rPierLamp);
  group.add(eastIslandPier);

  // Apply explicit overrides on Slot 0 (West) and Slot 1 (East) when user customizes satellite themes
  if (resolvedSats[0] === 'hidden') {
    westIslet.visible = false;
    tramGroup.visible = false;
    grandBridge.visible = false;
  } else if (explicitSatellites?.[0] && explicitSatellites[0] !== 'skyline-cbd') {
    westCluster.visible = false;
    empireGroup.visible = false;
    westIslet.add(buildSatelliteThemeOutpost(explicitSatellites[0], topY1));
  }

  if (resolvedSats[1] === 'hidden') {
    eastIslet.visible = false;
    ferryGroup.visible = false;
    eastPier.visible = false;
    eastIslandPier.visible = false;
  } else if (explicitSatellites?.[1] && explicitSatellites[1] !== 'airfield-harbor') {
    eastCluster.visible = false;
    pearlGroup.visible = false;
    twistedGroup.visible = false;
    openerGroup.visible = false;
    eastIslet.add(buildSatelliteThemeOutpost(explicitSatellites[1], topY2));
  }

  return {
    group,
    update: (t) => updaters.forEach((fn) => fn(t)),
  };
}

function createMicroScenery(
  biome: BiomeId,
  theme: ThemeJson,
  worldShape?: WorldShapeType,
  obstacleField?: ObstacleClearanceField,
): THREE.Group {
  const shape = resolveWorldShape(biome, worldShape);
  const g = new THREE.Group();
  g.name = 'micro-scenery';
  const wood = '#7C5A3F';
  const reedColor = biome === 'snow' ? '#B8CFD4' : biome === 'desert' ? '#C49A52' : '#5E8A57';
  const padColor = biome === 'desert' ? '#6D9E71' : '#588B54';

  // 1. Wooden post-and-rail fences along West & East overlooks (only on dry land & clear of buildings)
  const fenceRuns: [number, number, number, number][] = [
    [-12.8, -4.5, -12.2, 1.8],
    [12.4, -6.5, 13.0, -1.2],
    [-6.5, 9.8, -2.8, 11.2],
  ];
  for (const [x1, z1, x2, z2] of fenceRuns) {
    if (
      getTerrainHeight(x1, z1, biome, shape) < 0.28 ||
      getTerrainHeight(x2, z2, biome, shape) < 0.28
    ) {
      continue;
    }
    const posts = 4;
    for (let i = 0; i < posts; i += 1) {
      const u = i / (posts - 1);
      const rawPx = x1 + (x2 - x1) * u;
      const rawPz = z1 + (z2 - z1) * u;
      const nudged = obstacleField ? obstacleField.nudgePoint(rawPx, rawPz, 0.35) : { x: rawPx, z: rawPz };
      const px = nudged.x;
      const pz = nudged.z;
      const py = getTerrainHeight(px, pz, biome, shape);
      const post = cyl(0.06, 0.07, 0.56, 8, wood);
      post.position.set(px, py + 0.26, pz);
      g.add(post);
      if (i < posts - 1) {
        const rawNx = x1 + (x2 - x1) * ((i + 1) / (posts - 1));
        const rawNz = z1 + (z2 - z1) * ((i + 1) / (posts - 1));
        const nudgedNext = obstacleField ? obstacleField.nudgePoint(rawNx, rawNz, 0.35) : { x: rawNx, z: rawNz };
        const nx = nudgedNext.x;
        const nz = nudgedNext.z;
        const ny = getTerrainHeight(nx, nz, biome, shape);
        const len = Math.hypot(nx - px, nz - pz);
        const rail = box(0.06, 0.06, len, wood);
        rail.position.set((px + nx) * 0.5, (py + ny) * 0.5 + 0.38, (pz + nz) * 0.5);
        rail.rotation.y = Math.atan2(nx - px, nz - pz);
        g.add(rail);
      }
    }
  }

  // 2. Riverside reed / cattail clusters & floating lily pads along the riverbanks or highland terraces
  for (const z of [-9.5, -6.8, -1.4, 2.2, 6.4, 9.2]) {
    const side = z % 2 === 0 ? 1 : -1;
    const rx = shape === 'archipelago' ? riverX(z) + side * 1.85 : side * 6.8;
    const ry = Math.max(0.18, getTerrainHeight(rx, z, biome, shape));
    for (let k = 0; k < 4; k += 1) {
      const stalk = cyl(0.025, 0.04, 0.68 + (k % 2) * 0.18, 6, reedColor);
      stalk.position.set(rx + (k - 1.5) * 0.14, ry + 0.32, z + (k % 2) * 0.15);
      stalk.rotation.z = (k - 1.5) * 0.09;
      g.add(stalk);
    }
    if (biome !== 'desert' && shape === 'archipelago') {
      const lily = cyl(0.28, 0.28, 0.03, 12, padColor);
      const lx = riverX(z) + side * 0.95;
      lily.position.set(lx, -0.02, z + 0.35);
      g.add(lily);
    }
  }

  // 3. Wooden park benches near the bridge and plazas (only on dry land & radially nudged clear of buildings)
  for (const [rawBx, rawBz, rot] of [
    [-4.2, -3.2, 0.35],
    [3.6, -3.0, -0.4],
    [-5.4, 4.8, 0.2],
  ] as const) {
    const nudged = obstacleField ? obstacleField.nudgePoint(rawBx, rawBz, 0.4) : { x: rawBx, z: rawBz };
    const bx = nudged.x;
    const bz = nudged.z;
    const by = getTerrainHeight(bx, bz, biome, shape);
    if (by < 0.25) continue;
    const bench = new THREE.Group();
    bench.name = 'park-bench';
    const seat = box(0.86, 0.07, 0.34, wood);
    seat.position.y = 0.26;
    const back = box(0.86, 0.26, 0.06, theme.shared.accent);
    back.position.set(0, 0.42, -0.14);
    bench.add(seat, back);
    bench.position.set(bx, by, bz);
    bench.rotation.y = rot;
    g.add(bench);
  }

  return g;
}

function createRiverFlow(biome: BiomeId, _theme: ThemeJson): { group: THREE.Group; update: (t: number) => void } {
  const group = new THREE.Group();
  group.name = 'river-flow';
  const dry = biome === 'desert';
  const ice = biome === 'snow';

  const flatPoints = Array.from({ length: 21 }, (_, i) => {
    const z = -12.0 + i * 1.1;
    const x = riverX(z);
    return new THREE.Vector3(x, -0.018, z);
  });
  const curve = new THREE.CatmullRomCurve3(flatPoints);

  const streaks = Array.from({ length: 18 }, (_, i) => {
    const laneOffset = ((i % 3) - 1) * 0.46;
    const dash = box(
      dry ? 0.09 : 0.11,
      0.016,
      1.05 + (i % 3) * 0.26,
      ice ? '#EAFBFF' : '#FFFFFF',
      {
        opacity: dry ? 0.36 : 0.58,
        emissive: '#FFFFFF',
        emissiveIntensity: 0.32,
      },
    );
    dash.userData.laneOffset = laneOffset;
    group.add(dash);
    return dash;
  });

  return {
    group,
    update: (t) => {
      streaks.forEach((dash, i) => {
        const u = (i / streaks.length + t * (dry ? 0.032 : 0.055)) % 1;
        const point = curve.getPointAt(u);
        const tangent = curve.getTangentAt(u);
        const laneOffset = (dash.userData.laneOffset as number) ?? 0;
        dash.position.set(
          point.x + tangent.z * laneOffset,
          -0.015 + Math.sin(t * 2.1 + i) * 0.006,
          point.z - tangent.x * laneOffset,
        );
        dash.rotation.y = Math.atan2(tangent.x, tangent.z);
        dash.scale.x = 0.84 + Math.sin(t * 1.7 + i) * 0.14;
      });
    },
  };
}

function createBridge(biome: BiomeId, theme: ThemeJson): THREE.Group {
  const g = new THREE.Group();
  g.name = 'river-bridge';
  const z = -4.5;
  const cx = riverX(z);
  const bankY = Math.max(
    0.48,
    (getTerrainHeight(cx - 3.2, z, biome) + getTerrainHeight(cx + 3.2, z, biome)) * 0.5,
  );
  const stone = theme.terrain.path;
  const rail = theme.shared.roof;
  const accent = theme.shared.accent;
  for (let i = 0; i < 9; i += 1) {
    const u = i / 8;
    const x = (u - 0.5) * 6.6;
    const y = bankY + 0.06 + Math.sin(u * Math.PI) * 0.68;
    const tilt = Math.cos(u * Math.PI) * -0.18;
    const deck = box(0.88, 0.22, 2.2, stone, { rough: 0.85 });
    deck.position.set(cx + x, y, z);
    deck.rotation.z = tilt;
    g.add(deck);
    for (const side of [-1, 1]) {
      const railSeg = box(0.88, 0.09, 0.1, accent, { rough: 0.5 });
      railSeg.position.set(cx + x, y + 0.46, z + side * 0.96);
      railSeg.rotation.z = tilt;
      g.add(railSeg);
      if (i % 2 === 0) {
        const post = cyl(0.07, 0.09, 0.52, 8, rail);
        post.position.set(cx + x, y + 0.24, z + side * 0.96);
        g.add(post);
      }
    }
  }
  return g;
}

function createDock(theme: ThemeJson): THREE.Group {
  const g = new THREE.Group();
  g.name = 'harbor-dock';
  const wood = '#76533B';
  const dark = theme.shared.roof;
  // Wooden pier sits at x = 3.2 (x in [1.9, 4.5], z in [13.8, 17.8]), cleanly east of Submarine nose (x_max = +1.04)
  for (let i = 0; i < 8; i += 1) {
    const plank = box(2.6, 0.16, 0.52, wood, { rough: 0.88 });
    plank.position.set(3.2, 0.38, 13.8 + i * 0.52);
    g.add(plank);
  }
  for (const x of [2.05, 4.35])
    for (const z of [14.2, 17.4]) {
      const pile = cyl(0.12, 0.16, 2.0, 8, dark);
      pile.position.set(x, -0.2, z);
      g.add(pile);
      const bollard = cyl(0.1, 0.13, 0.42, 8, wood);
      bollard.position.set(3.2 + (x - 3.2) * 0.82, 0.4, z);
      g.add(bollard);
      const lamp = sphere(0.12, 10, '#FFD995', { emissive: '#FFB85C', emissiveIntensity: 1 });
      lamp.position.set(x, 1.14, z);
      g.add(lamp);
    }
  return g;
}

function subdivideChaikin(pts: [number, number][], passes = 2): [number, number][] {
  let cur = pts;
  for (let p = 0; p < passes; p += 1) {
    if (cur.length < 3) break;
    const next: [number, number][] = [cur[0]];
    for (let i = 0; i < cur.length - 1; i += 1) {
      const [x0, z0] = cur[i];
      const [x1, z1] = cur[i + 1];
      next.push([x0 * 0.75 + x1 * 0.25, z0 * 0.75 + z1 * 0.25]);
      next.push([x0 * 0.25 + x1 * 0.75, z0 * 0.25 + z1 * 0.75]);
    }
    next.push(cur[cur.length - 1]);
    cur = next;
  }
  return cur;
}

function createContinuousRoads(
  biome: BiomeId,
  theme: ThemeJson,
  buildings: PlacedBuilding[],
  worldShape?: WorldShapeType,
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'continuous-paths';
  const isB612Dome = worldShape === 'b612-highland';

  const positions: number[] = [];
  const indices: number[] = [];
  let vertexOffset = 0;

  const appendRibbon = (rawPoints: [number, number][], width: number, yLift: number): void => {
    const smoothed = subdivideChaikin(rawPoints, 2);
    const dense: [number, number][] = [];
    for (let i = 0; i < smoothed.length - 1; i += 1) {
      const [x0, z0] = smoothed[i];
      const [x1, z1] = smoothed[i + 1];
      const segLen = Math.hypot(x1 - x0, z1 - z0);
      const steps = Math.max(2, Math.ceil(segLen / 0.36));
      for (let s = 0; s < steps; s += 1) {
        const t = s / steps;
        dense.push([x0 + (x1 - x0) * t, z0 + (z1 - z0) * t]);
      }
    }
    dense.push(smoothed[smoothed.length - 1]);
    if (dense.length < 2) return;

    const halfW = width * 0.5;
    for (let i = 0; i < dense.length; i += 1) {
      const [x, z] = dense[i];
      const prev = dense[Math.max(0, i - 1)];
      const next = dense[Math.min(dense.length - 1, i + 1)];
      const dx = next[0] - prev[0];
      const dz = next[1] - prev[1];
      const len = Math.hypot(dx, dz) || 1;
      const nx = -dz / len;
      const nz = dx / len;

      const lx = x + nx * halfW;
      const lz = z + nz * halfW;
      const rx = x - nx * halfW;
      const rz = z - nz * halfW;

      const ly = Math.max(0.18, getTerrainHeight(lx, lz, biome, worldShape)) + yLift;
      const ry = Math.max(0.18, getTerrainHeight(rx, rz, biome, worldShape)) + yLift;

      positions.push(lx, ly, lz, rx, ry, rz);
      if (i < dense.length - 1) {
        const a = vertexOffset + i * 2;
        const b = a + 1;
        const c = a + 2;
        const d = a + 3;
        indices.push(a, c, b, b, c, d);
      }
    }
    vertexOffset += dense.length * 2;
  };

  if (isB612Dome) {
    // B-612 Planetoid Dome: Spiral avenue from South Dock up to the Rose-Hill Summit Plaza (0, -0.4)
    appendRibbon(
      [
        [2.2, 14.8],
        [6.4, 10.4],
        [7.2, 4.2],
        [4.2, -1.6],
        [0.0, -0.4],
        [-4.6, 0.8],
        [-7.8, 5.2],
      ],
      0.92,
      0.044,
    );
    buildings.forEach((b, bi) => {
      const endX = b.position.x;
      const endZ = b.position.z + 1.65;
      const midX = endX * 0.52 + (bi % 2 === 0 ? 0.6 : -0.6);
      const midZ = -0.4 + (endZ + 0.4) * 0.52;
      appendRibbon([[0.0, -0.4], [midX, midZ], [endX, endZ]], 0.78, 0.04);
    });
  } else if (worldShape === 'crescent-bay') {
    // C-Shaped Crescent Atoll: Sweeping coastal boulevard along West & North peninsula ridge (avoiding SE lagoon!)
    appendRibbon(
      [
        [-6.8, 10.8],
        [-9.6, 6.2],
        [-11.2, -1.2],
        [-8.0, -8.2],
        [-2.2, -10.2],
        [4.8, -9.2],
        [9.8, -5.6],
        [11.8, 0.8],
        [11.8, 5.4],
      ],
      0.92,
      0.044,
    );
  } else if (worldShape === 'floating-terraces') {
    // Monument-Valley Orthogonal Stepped Ark: Straight east-west marble avenues on the 3 flat terraces
    appendRibbon(
      [
        [-9.2, 6.8],
        [-3.2, 6.8],
      ],
      0.88,
      0.042,
    );
    appendRibbon(
      [
        [3.2, 6.8],
        [9.2, 6.8],
      ],
      0.88,
      0.042,
    );
    appendRibbon(
      [
        [-11.4, -1.4],
        [-2.4, -1.4],
        [2.4, -1.4],
        [11.4, -1.4],
      ],
      0.92,
      0.042,
    );
    appendRibbon(
      [
        [-8.4, -8.8],
        [0.0, -8.8],
        [8.8, -8.8],
      ],
      0.92,
      0.042,
    );
  } else if (worldShape === 'alpine-valley') {
    // Horseshoe Glacial Amphitheater: U-shaped ridge trail wrapping West -> North -> East around the central tarn lake
    appendRibbon(
      [
        [-9.2, 7.2],
        [-10.4, 0.4],
        [-7.8, -7.8],
        [-2.2, -9.8],
        [3.8, -9.2],
        [9.4, -4.6],
        [10.8, 3.2],
        [6.8, 7.8],
      ],
      0.88,
      0.044,
    );
  } else {
    const bridgeZ = worldShape === 'canyon-mesa' ? -1.6 : -4.5;
    const bridgeCx = riverX(bridgeZ);
    const eastBridgeHead: [number, number] = [bridgeCx + 3.4, bridgeZ];
    const westBridgeHead: [number, number] = [bridgeCx - 3.4, bridgeZ];

    // 1. East-Bank main spine
    appendRibbon(
      [
        [5.4, 8.2],
        [5.2, 2.4],
        eastBridgeHead,
        [4.8, -8.6],
      ],
      0.92,
      0.042,
    );

    // 2. West-Bank main spine
    appendRibbon(
      [
        [-7.6, -8.8],
        [-5.8, -6.2],
        westBridgeHead,
        [-7.6, -1.2],
        [-9.4, 6.8],
      ],
      0.9,
      0.042,
    );

    // 3. Smooth branches to every building front entrance (clamped to solid island ground)
    buildings.forEach((b, bi) => {
      const isWest = b.position.x < riverX(b.position.z);
      const start = isWest ? westBridgeHead : eastBridgeHead;
      const endX = b.position.x;
      const endZ = b.position.z + 1.85;
      let midX = (start[0] + endX) * 0.5 + (isWest ? -0.9 : 0.9) + (bi % 2 ? 0.35 : -0.35);
      const midZ = (start[1] + endZ) * 0.5;
      const rMid = riverX(midZ);
      if (isWest && midX > rMid - 2.85) midX = rMid - 2.85;
      if (!isWest && midX < rMid + 2.85) midX = rMid + 2.85;

      if (getTerrainHeight(midX, midZ, biome, worldShape) > 0.12) {
        appendRibbon([start, [midX, midZ], [endX, endZ]], 0.76, 0.038);
      }
    });
  }

  const roadGeo = new THREE.BufferGeometry();
  roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  roadGeo.setIndex(indices);
  roadGeo.computeVertexNormals();

  const roadMat = new THREE.MeshStandardMaterial({
    color: theme.terrain.path,
    roughness: 0.9,
    metalness: 0.02,
    flatShading: false,
    side: THREE.DoubleSide,
  });
  const roadMesh = new THREE.Mesh(roadGeo, roadMat);
  roadMesh.name = 'road-ribbon-mesh';
  roadMesh.receiveShadow = true;
  group.add(roadMesh);

  return group;
}

function makeFoliage(biome: BiomeId, theme: ThemeJson, f: FoliageSpot): THREE.Group {
  const g = new THREE.Group();
  const colors = theme.terrain.foliage;
  const leaf = colors[f.variant % colors.length] ?? '#6F9861';
  g.add(contactShadow(0.76, 0.76, 0.36));
  if (biome === 'desert' && f.variant === 0) {
    const stem = cyl(0.18, 0.22, 1.8, 8, leaf);
    stem.position.y = 0.9;
    g.add(stem);
    for (const side of [-1, 1]) {
      const arm = cyl(0.1, 0.13, 0.72, 8, leaf);
      arm.position.set(side * 0.32, 0.95, 0);
      arm.rotation.z = side * 0.75;
      g.add(arm);
    }
  } else if (biome === 'desert' && f.variant === 2) {
    const rock = sphere(0.62, 10, '#A85F43', { rough: 0.94, flat: false });
    rock.scale.set(1.35, 0.65, 0.9);
    rock.position.y = 0.38;
    g.add(rock);
  } else if (biome === 'desert') {
    const trunk = cyl(0.08, 0.14, 1.55, 8, '#76533B');
    trunk.position.y = 0.78;
    g.add(trunk);
    for (let i = 0; i < 3; i += 1) {
      const crown = sphere(0.4, 10, leaf, { rough: 0.9, flat: false });
      crown.scale.set(0.72, 1.5, 0.72);
      crown.position.set((i - 1) * 0.18, 1.45 + i * 0.36, 0);
      g.add(crown);
    }
  } else if (biome === 'snow') {
    const trunk = cyl(0.09, 0.14, 0.75, 8, '#665044');
    trunk.position.y = 0.38;
    g.add(trunk);
    for (let i = 0; i < 3; i += 1) {
      const tier = cyl(0, 0.72 - i * 0.13, 0.82, 10, i === 0 ? '#F5FAFB' : leaf);
      tier.position.y = 0.66 + i * 0.48;
      g.add(tier);
    }
    if (f.variant === 2) {
      const crystal = pyramid(0.38, 0.85, 0.38, '#BDEBF4', { emissive: '#9DDEE9', emissiveIntensity: 0.35 });
      crystal.position.set(0.72, 0.42, 0);
      g.add(crystal);
    }
  } else if (f.variant === 3) {
    // Slender Italian Cypress / Pine Cone Tree
    const trunk = cyl(0.08, 0.13, 0.85, 8, '#76533B');
    trunk.position.y = 0.42;
    const cone1 = cyl(0.04, 0.56, 1.45, 12, '#4A8B4B', { rough: 0.86, flat: false });
    cone1.position.y = 1.28;
    const cone2 = cyl(0.02, 0.42, 1.15, 12, '#5CA056', { rough: 0.85, flat: false });
    cone2.position.y = 1.92;
    g.add(trunk, cone1, cone2);
  } else {
    const trunk = cyl(0.1, 0.16, 1.05, 8, '#76533B');
    trunk.position.y = 0.52;
    g.add(trunk);
    const paletteShades = ['#62A84F', '#F4CAD4', '#4E9445', '#7CBE58', '#559E54'];
    const blossom = biome === 'ocean' ? paletteShades[f.variant % paletteShades.length] : leaf;
    [
      [0, 1.42, 0],
      [-0.38, 1.25, 0.08],
      [0.36, 1.28, -0.08],
      [0.05, 1.62, 0.12],
    ].forEach(([x, y, z], i) => {
      const crown = sphere(0.54 - i * 0.025, 12, blossom, { rough: 0.88, flat: false });
      crown.position.set(x, y, z);
      g.add(crown);
    });
    if (biome === 'grassland' && f.variant === 2)
      for (let i = 0; i < 5; i += 1) {
        const flower = sphere(0.07, 8, i % 2 ? '#F2C66D' : '#E9A5AA');
        flower.position.set((i - 2) * 0.2, 0.1, 0.5);
        g.add(flower);
      }
  }
  g.position.set(f.x, f.y, f.z);
  g.scale.setScalar(f.scale);
  g.userData.windSway = true;
  g.userData.windPhase = f.x * 0.41 + f.z * 0.37;
  return g;
}

function createOrganicFoamRing(
  biome: BiomeId,
  radiusScale: number,
  tubeRadius: number,
  matRef: THREE.Material,
  worldShape?: WorldShapeType,
): THREE.Mesh {
  const pts: THREE.Vector3[] = [];
  const segs = 96;
  for (let i = 0; i < segs; i += 1) {
    const a = (i / segs) * Math.PI * 2;
    const r = getCoastRadius(a, biome, worldShape) * radiusScale;
    pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
  }
  const curve = new THREE.CatmullRomCurve3(pts, true);
  const geo = new THREE.TubeGeometry(curve, 120, tubeRadius, 6, true);
  return new THREE.Mesh(geo, matRef);
}

function createLayeredWater(
  biome: BiomeId,
  theme: ThemeJson,
  random: () => number,
  worldShape?: WorldShapeType,
): { group: THREE.Group; update: (t: number) => void } {
  const group = new THREE.Group();
  group.name = 'layered-water';
  const isDesert = biome === 'desert';
  const isSnow = biome === 'snow';
  const isGrassland = biome === 'grassland';

  const deepColor = isDesert
    ? '#DFC08A'
    : isSnow
      ? '#7FA8BC'
      : isGrassland
        ? '#88BA5C'
        : '#55A8E6';
  const midColor = isDesert
    ? '#D4B075'
    : isSnow
      ? '#98C4D6'
      : isGrassland
        ? '#7AB052'
        : '#67BAFA';
  const shallowColor = isDesert
    ? '#7EC8BC'
    : isSnow
      ? '#BEE3EE'
      : isGrassland
        ? '#78C6D6'
        : '#7BC8FD';

  // Seamless Horizon Mesh (680x680 vertex-colored): blends outer sea / inland pastoral meadow / desert sand sea
  // 100% smoothly into theme.terrain.sky at r >= 145 so ZERO circular water disc edge is ever visible!
  const farGeo = new THREE.PlaneGeometry(680, 680, 96, 96);
  farGeo.rotateX(-Math.PI / 2);
  const farPos = farGeo.attributes.position as THREE.BufferAttribute;
  const farColors = new Float32Array(farPos.count * 3);
  const cSky = new THREE.Color(theme.terrain.sky);
  const cNear = new THREE.Color(midColor);
  const cDeep = new THREE.Color(deepColor);
  const cAccentPatch = new THREE.Color(
    isGrassland ? '#E2C366' : isDesert ? '#C68852' : isSnow ? '#B4D6E4' : '#74C2FA',
  );
  const tmpCol = new THREE.Color();

  for (let i = 0; i < farPos.count; i += 1) {
    const x = farPos.getX(i);
    const z = farPos.getZ(i);
    const r = Math.hypot(x, z);

    // Clear satellite hubs, central river channel, AND Second Realms (Camel Oasis at (85,0), Snow Valley at (28,26) & Camel Causeway!)
    const satClear =
      smoothstep(5.2, 8.2, Math.hypot(x + 21.8, z + 4.8)) *
      smoothstep(5.0, 8.0, Math.hypot(x - 18.8, z + 13.2)) *
      smoothstep(3.8, 6.4, Math.hypot(x + 22.2, z - 14.2));
    const camelOasisDist = Math.hypot(x - 85, z);
    const snowValleyDist = Math.hypot(x - 28, z - 26);
    // Distance to Camel Causeway segment from (8.6, 12.2) to (85, -2.6)
    const cwDx = 85 - 8.6;
    const cwDz = -2.6 - 12.2;
    const cwLen2 = cwDx * cwDx + cwDz * cwDz;
    const cwT = Math.max(0, Math.min(1, ((x - 8.6) * cwDx + (z - 12.2) * cwDz) / cwLen2));
    const cwDist = Math.hypot(x - (8.6 + cwDx * cwT), z - (12.2 + cwDz * cwT));
    const realmClear =
      smoothstep(24.5, 31.0, camelOasisDist) *
      smoothstep(22.0, 29.0, snowValleyDist) *
      smoothstep(5.8, 11.2, cwDist);
    const riverClear = Math.abs(z) < 20.5 ? smoothstep(2.0, 4.2, Math.abs(x - riverX(z))) : 1;

    let y = 0;
    if (camelOasisDist < 23.5 || snowValleyDist < 21.5) {
      // Depress outer sand/meadow mesh 1.6m below the Second Realm basin so it NEVER submerges or z-fights the Oasis or Ice Valley!
      y = -1.6 * (1 - smoothstep(18.5, 23.5, Math.min(camelOasisDist, snowValleyDist)));
    } else if (isGrassland && r > 19.5) {
      // Inland Rolling Pastoral Plains & Distant Alpine Hills (not an island in the sea!)
      const outerMask =
        smoothstep(19.6, 25.5, r) * smoothstep(155, 78, r) * satClear * riverClear * realmClear;
      const rolling =
        0.35 +
        0.45 * Math.sin(x * 0.085 + 0.4) * Math.cos(z * 0.085 - 0.3) +
        smoothstep(34, 72, r) * (1.35 + 0.55 * Math.sin(x * 0.05 - z * 0.04));
      y = outerMask * rolling;
    } else if (isDesert && r > 19.5) {
      // Endless Saharan Barchan Sand Dune Sea surrounding the central canyon oasis
      const outerMask =
        smoothstep(19.6, 25.5, r) * smoothstep(155, 78, r) * satClear * riverClear * realmClear;
      const dunes =
        0.32 +
        0.44 * Math.sin(x * 0.095 + z * 0.065) +
        smoothstep(34, 72, r) * (1.22 + 0.45 * Math.cos(x * 0.06 + z * 0.05));
      y = outerMask * dunes;
    }
    farPos.setY(i, y);

    const midBlend = smoothstep(19, 48, r);
    tmpCol.copy(cNear).lerp(cDeep, midBlend);
    if (isGrassland || isDesert) {
      const wave = 0.5 + 0.5 * Math.sin(x * 0.11 - z * 0.09);
      if (wave > 0.52) {
        tmpCol.lerp(cAccentPatch, (wave - 0.52) * 1.15 * smoothstep(19, 30, r));
      }
    }
    const skyBlend = smoothstep(38, 128, r);
    tmpCol.lerp(cSky, skyBlend);

    farColors[i * 3] = tmpCol.r;
    farColors[i * 3 + 1] = tmpCol.g;
    farColors[i * 3 + 2] = tmpCol.b;
  }
  farGeo.setAttribute('color', new THREE.BufferAttribute(farColors, 3));
  farGeo.computeVertexNormals();

  const far = new THREE.Mesh(
    farGeo,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: isGrassland || isDesert ? 0.92 : 0.32,
      metalness: isGrassland || isDesert ? 0.01 : 0.04,
      flatShading: false,
    }),
  );
  far.name = 'far-water';
  far.position.y = -0.12;
  far.receiveShadow = true;
  group.add(far);

  // Contour-following mid-water & shallows-water (NEVER a circular CircleGeometry disc!):
  // Deform radial vertices to trace getCoastRadius(angle, biome, worldShape) so deep bays, straits, and rectangular terraces have zero round halo!
  const buildContourWaterGeo = (scaleR: number): THREE.BufferGeometry => {
    const geo = new THREE.CircleGeometry(1.0, 96);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 1; i < pos.count; i += 1) {
      const ux = pos.getX(i);
      const uz = pos.getZ(i);
      const ang = Math.atan2(uz, ux);
      const targetR =
        isGrassland || isDesert
          ? Math.min(13.8, getCoastRadius(ang, biome, worldShape) * 0.76)
          : getCoastRadius(ang, biome, worldShape) * scaleR;
      pos.setX(i, Math.cos(ang) * targetR);
      pos.setZ(i, Math.sin(ang) * targetR);
    }
    geo.computeVertexNormals();
    return geo;
  };

  const mid = new THREE.Mesh(
    buildContourWaterGeo(0.95),
    mat(shallowColor, {
      rough: 0.2,
      metal: 0.06,
      opacity: 0.78,
      emissive: isSnow ? '#9AD6E8' : '#3C93D6',
      emissiveIntensity: 0.1,
    }),
  );
  mid.name = 'mid-water';
  mid.position.y = -0.07;
  group.add(mid);

  const shallows = new THREE.Mesh(
    buildContourWaterGeo(0.91),
    mat(shallowColor, {
      opacity: 0.82,
      rough: 0.18,
      metal: 0.06,
      emissive: isSnow ? '#C2EFF8' : '#58B4F5',
      emissiveIntensity: 0.12,
    }),
  );
  shallows.name = 'shallows-water';
  shallows.position.y = -0.04;
  shallows.receiveShadow = true;
  group.add(shallows);

  // Living Shoreline Foam Rings (`animated-shoreline-foam`, visible in aquatic ocean/snow biomes)
  const foamGroup = new THREE.Group();
  foamGroup.name = 'shoreline-foam';
  foamGroup.visible = !isGrassland && !isDesert;

  const animFoamGroup = new THREE.Group();
  animFoamGroup.name = 'animated-shoreline-foam';
  const foamMat1 = mat(isGrassland ? '#F6D365' : '#FFFFFF', {
    emissive: isGrassland ? '#F5B041' : '#FFFFFF',
    emissiveIntensity: isGrassland ? 0.22 : 0.42,
    opacity: isDesert ? 0.26 : isGrassland ? 0.48 : 0.48,
    rough: isGrassland ? 0.75 : 0.3,
  });
  const foamMat2 = mat(isGrassland ? '#B88AE6' : '#F0FDFA', {
    emissive: isGrassland ? '#9B7EDE' : '#E0F2FE',
    emissiveIntensity: 0.28,
    opacity: isDesert ? 0.18 : isGrassland ? 0.38 : 0.34,
    rough: isGrassland ? 0.78 : 0.35,
  });
  const foamMat3 = mat('#E0F7FA', {
    emissive: '#BAE6FD',
    emissiveIntensity: 0.24,
    opacity: 0.24,
    rough: 0.38,
  });

  const mainFoam1 = createOrganicFoamRing(biome, 0.96, 0.046, foamMat1, worldShape);
  mainFoam1.position.y = isGrassland ? 0.06 : -0.022;

  const mainFoam2 = createOrganicFoamRing(biome, 1.01, 0.034, foamMat2, worldShape);
  mainFoam2.position.y = isGrassland ? 0.04 : -0.029;

  const waveCrest1 = createOrganicFoamRing(biome, 0.94, 0.032, foamMat1, worldShape);
  waveCrest1.position.y = isGrassland ? 0.05 : -0.02;
  const waveCrest2 = createOrganicFoamRing(biome, 0.99, 0.028, foamMat2, worldShape);
  waveCrest2.position.y = isGrassland ? 0.04 : -0.026;
  const waveCrest3 = createOrganicFoamRing(biome, 1.055, 0.024, foamMat3, worldShape);
  waveCrest3.position.y = isGrassland ? 0.03 : -0.034;

  animFoamGroup.add(waveCrest1, waveCrest2, waveCrest3);
  foamGroup.add(mainFoam1, mainFoam2, animFoamGroup);

  const satFoamRings: THREE.Mesh[] = [];
  for (const [sx, sz, rx, rz] of [
    [-21.8, -4.8, 5.1, 4.4],
    [18.8, -13.2, 4.8, 4.2],
    [-22.2, 14.2, 3.4, 2.9],
  ] as const) {
    const sRing = new THREE.Mesh(new THREE.TorusGeometry(rx, 0.055, 8, 36), foamMat1);
    sRing.rotation.x = Math.PI / 2;
    sRing.scale.set(1, rz / rx, 1);
    sRing.position.set(sx, isGrassland ? 0.05 : -0.03, sz);
    foamGroup.add(sRing);
    satFoamRings.push(sRing);
  }
  group.add(foamGroup);

  // Specular Shimmer Wave Ripples & Diamond Water Glints (`water-shimmer-glints`)
  const rippleGroup = new THREE.Group();
  rippleGroup.name = 'water-ripples';
  const ripples: { mesh: THREE.Mesh; baseR: number; angle: number; phase: number }[] = [];
  for (let i = 0; i < 32; i += 1) {
    const angle = (i / 32) * Math.PI * 2 + random() * 0.15;
    const baseR = 22.2 + (i % 4) * 3.1 + random() * 1.4;
    const rip = box(
      1.25 + (i % 3) * 0.4,
      0.018,
      0.11,
      isGrassland ? '#A9D66E' : isDesert ? '#F3D99E' : '#F0FDFA',
      {
        emissive: isGrassland ? '#8BC34A' : '#FFFFFF',
        emissiveIntensity: isGrassland ? 0.18 : 0.45,
        opacity: isDesert ? 0.28 : isGrassland ? 0.36 : 0.52,
        rough: isGrassland ? 0.75 : 0.15,
      },
    );
    rip.position.set(Math.cos(angle) * baseR, isGrassland ? 0.18 : -0.035, Math.sin(angle) * baseR);
    rip.rotation.y = -angle;
    rippleGroup.add(rip);
    ripples.push({ mesh: rip, baseR, angle, phase: i * 0.7 });
  }
  group.add(rippleGroup);

  const shimmerGroup = new THREE.Group();
  shimmerGroup.name = 'water-shimmer-glints';
  shimmerGroup.visible = !isGrassland && !isDesert;
  const glints: { mesh: THREE.Mesh; baseX: number; baseZ: number; phase: number }[] = [];
  for (let i = 0; i < 28; i += 1) {
    const ang = (i / 28) * Math.PI * 2 + (i % 3) * 0.19;
    const coastR = getCoastRadius(ang, biome, worldShape);
    const dist = coastR + 1.8 + (i % 5) * 2.1;
    const gx = Math.cos(ang) * dist;
    const gz = Math.sin(ang) * dist;
    const glint = box(0.24, 0.015, 0.24, '#FFFFFF', {
      emissive: '#FFFBEB',
      emissiveIntensity: 0.85,
      opacity: 0.65,
      rough: 0.08,
    });
    glint.position.set(gx, -0.026, gz);
    glint.rotation.y = Math.PI / 4 + ang * 0.5;
    shimmerGroup.add(glint);
    glints.push({ mesh: glint, baseX: gx, baseZ: gz, phase: i * 0.83 });
  }
  group.add(shimmerGroup);

  return {
    group,
    update: (t) => {
      if (!isGrassland && !isDesert) {
        far.position.y = -0.22 + Math.sin(t * 0.28) * 0.02;
      }
      mid.position.y = (isGrassland ? -0.14 : -0.11) + Math.sin(t * 0.42 + 0.4) * 0.018;
      shallows.position.y = -0.04 + Math.sin(t * 0.56 + 0.8) * 0.022;
      const pulse1 = 1 + Math.sin(t * 1.85) * 0.016;
      const pulse2 = 1 + Math.sin(t * 1.85 - 1.05) * 0.02;
      const pulse3 = 1 + Math.sin(t * 1.85 - 2.1) * 0.024;
      mainFoam1.scale.set(pulse1, 1, pulse1);
      mainFoam2.scale.set(pulse2, 1, pulse2);
      waveCrest1.scale.set(pulse1, 1, pulse1);
      waveCrest2.scale.set(pulse2, 1, pulse2);
      waveCrest3.scale.set(pulse3, 1, pulse3);
      foamMat1.opacity = (isDesert ? 0.22 : isGrassland ? 0.42 : 0.42) + Math.sin(t * 1.85) * 0.12;
      foamMat2.opacity = (isDesert ? 0.16 : isGrassland ? 0.32 : 0.3) + Math.sin(t * 1.85 - 1.05) * 0.1;
      foamMat3.opacity = 0.2 + Math.sin(t * 1.85 - 2.1) * 0.09;
      satFoamRings.forEach((sr, idx) => {
        const sp = 1 + Math.sin(t * 1.8 + idx) * 0.018;
        sr.position.y = (isGrassland ? 0.05 : -0.03) + Math.sin(t * 1.4 + idx) * 0.012;
        sr.scale.x = sp;
      });
      ripples.forEach((r) => {
        const dr = Math.sin(t * 1.2 + r.phase) * 0.32;
        const curR = r.baseR + dr;
        r.mesh.position.set(
          Math.cos(r.angle) * curR,
          (isGrassland ? 0.18 : -0.032) + Math.sin(t * 2.2 + r.phase) * 0.015,
          Math.sin(r.angle) * curR,
        );
        r.mesh.scale.x = 0.75 + 0.35 * Math.sin(t * 2.6 + r.phase);
      });
      glints.forEach((gl) => {
        const twinkle = 0.45 + 0.55 * Math.max(0, Math.sin(t * 3.1 + gl.phase));
        gl.mesh.scale.set(twinkle, 1, twinkle);
        gl.mesh.position.x = gl.baseX + Math.sin(t * 0.9 + gl.phase) * 0.18;
        gl.mesh.position.z = gl.baseZ + Math.cos(t * 0.9 + gl.phase) * 0.18;
      });
    },
  };
}

function createBiomeMacroLandforms(
  biome: BiomeId,
  _theme: ThemeJson,
  worldShape?: WorldShapeType,
  obstacleField?: ObstacleClearanceField,
): { group: THREE.Group; update: (t: number) => void } {
  const shape = resolveWorldShape(biome, worldShape);
  const group = new THREE.Group();
  group.name = 'biome-macro-landforms';
  const updaters: Array<(t: number) => void> = [];

  if (biome === 'grassland') {
    // 1. Stone Retaining Terrace Walls along the 3-tier pastoral highland steps
    const terraceWalls = new THREE.Group();
    terraceWalls.name = 'terrace-walls';
    const wallRuns: [number, number, number, number][] = [
      [-14.2, -5.8, -10.8, 0.8],
      [-12.4, 5.2, -6.8, 10.6],
      [7.4, -9.8, 13.4, -4.6],
      [8.2, 6.2, 13.8, 1.4],
    ];
    for (const [x1, z1, x2, z2] of wallRuns) {
      const blocks = 7;
      for (let i = 0; i < blocks; i += 1) {
        const u = i / (blocks - 1);
        const wx = x1 + (x2 - x1) * u;
        const wz = z1 + (z2 - z1) * u;
        const wy = getTerrainHeight(wx, wz, biome, shape);
        if (wy < 0.25) continue;
        const stone = box(0.78, 0.42, 0.36, i % 2 === 0 ? '#9B9280' : '#8A8170', { rough: 0.92 });
        stone.position.set(wx, wy + 0.14, wz);
        stone.rotation.y = Math.atan2(x2 - x1, z2 - z1) + Math.PI * 0.5;
        terraceWalls.add(stone);
      }
    }
    group.add(terraceWalls);

    // 2. Two Spinning Dutch Windmills on West & East Highland Overlooks
    const windmills = new THREE.Group();
    windmills.name = 'pastoral-windmills';
    for (const [wx, wz, ry] of [
      [-14.4, 1.8, 0.45],
      [14.6, -7.8, -0.52],
    ] as const) {
      const wy = Math.max(0.28, getTerrainHeight(wx, wz, biome, shape));
      const mill = new THREE.Group();
      mill.position.set(wx, wy, wz);
      mill.rotation.y = ry;
      const base = cyl(0.75, 0.95, 0.85, 8, '#9B8E78', { rough: 0.9 });
      base.position.y = 0.42;
      const body = cyl(0.54, 0.74, 1.85, 8, '#B85A3A', { rough: 0.82 });
      body.position.y = 1.65;
      const cap = sphere(0.58, 12, '#3A3F36', { rough: 0.78, flat: false });
      cap.scale.set(1, 0.75, 1.15);
      cap.position.y = 2.62;
      const sails = new THREE.Group();
      sails.name = 'windmill-sails';
      sails.position.set(0, 2.48, 0.62);
      const hub = cyl(0.12, 0.12, 0.28, 8, '#E8643A');
      hub.rotation.x = Math.PI / 2;
      sails.add(hub);
      for (let k = 0; k < 4; k += 1) {
        const armGrp = new THREE.Group();
        armGrp.rotation.z = (k * Math.PI) / 2;
        const spar = box(0.08, 1.55, 0.06, '#76533B');
        spar.position.y = 0.78;
        const canvas = box(0.32, 1.25, 0.03, '#FAF6EE', { rough: 0.7 });
        canvas.position.set(0.16, 0.86, 0.02);
        armGrp.add(spar, canvas);
        sails.add(armGrp);
      }
      mill.add(base, body, cap, sails);
      windmills.add(mill);
      updaters.push((t) => {
        sails.rotation.z = -t * 1.15;
      });
    }
    group.add(windmills);

    // 3. Lavender & Golden Marigold Flower Meadows + Outer Golden Hay Bales
    const flowerMeadows = new THREE.Group();
    flowerMeadows.name = 'flower-meadows';
    const meadowSpots: [number, number, string][] = [
      [-11.2, 3.6, '#8E6CD8'],
      [-8.4, 11.2, '#F5B041'],
      [7.8, 11.6, '#8E6CD8'],
      [13.2, -1.8, '#F5B041'],
      [-5.6, -12.8, '#E8643A'],
      [5.4, -13.2, '#8E6CD8'],
      [-38.0, 6.0, '#8E6CD8'],
      [37.5, 8.5, '#F5B041'],
      [-18.0, 35.0, '#F5B041'],
      [19.0, 34.0, '#8E6CD8'],
    ];
    for (const [fx, fz, col] of meadowSpots) {
      const fy = Math.hypot(fx, fz) < 19.5 ? getTerrainHeight(fx, fz, biome, shape) : 0.24;
      if (fy < 0.2) continue;
      for (let row = 0; row < 3; row += 1) {
        const strip = box(1.35, 0.16, 0.28, col, { rough: 0.85 });
        strip.position.set(fx + (row - 1) * 0.42, fy + 0.08, fz + (row % 2) * 0.22);
        strip.rotation.y = 0.35;
        flowerMeadows.add(strip);
      }
    }
    for (const [bx, bz] of [
      [-37.5, -16.2],
      [-40.2, -13.5],
      [38.4, -6.5],
      [40.8, -3.8],
      [-14.5, 36.4],
      [15.8, 37.2],
    ] as const) {
      const bale = cyl(0.55, 0.55, 0.92, 12, '#DEB853', { rough: 0.88, flat: false });
      bale.rotation.z = Math.PI / 2;
      bale.rotation.y = bx * 0.2;
      bale.position.set(bx, 0.48, bz);
      flowerMeadows.add(bale);
    }
    group.add(flowerMeadows);

    // 4. Grazing Wool Sheep Flocks on the Pastoral Terraces
    const sheepGroup = new THREE.Group();
    sheepGroup.name = 'pastoral-sheep';
    const sheepCoords: [number, number, number][] = [
      [-12.8, -1.8, 0.4],
      [-13.4, -0.9, 1.1],
      [-11.9, -0.4, -0.5],
      [11.8, -0.8, 2.1],
      [12.6, 0.2, 1.6],
      [-6.2, 12.2, 0.8],
      [-5.2, 12.8, -0.3],
      [6.8, 12.6, -1.2],
      [-25.5, 3.2, 0.6],
      [25.2, 4.8, -0.9],
    ];
    sheepCoords.forEach(([sx, sz, rot], idx) => {
      const sy = Math.hypot(sx, sz) < 19.2 ? getTerrainHeight(sx, sz, biome, shape) : 0.22;
      if (sy < 0.2) return;
      const sheep = new THREE.Group();
      const wool = sphere(0.26, 10, '#FAF8F2', { rough: 0.92, flat: false });
      wool.scale.set(1.25, 0.92, 0.95);
      wool.position.y = 0.28;
      const head = sphere(0.14, 8, '#3A3530', { rough: 0.88, flat: false });
      head.position.set(0.28, 0.34, 0);
      sheep.add(wool, head);
      sheep.position.set(sx, sy, sz);
      sheep.rotation.y = rot;
      sheepGroup.add(sheep);
      updaters.push((t) => {
        head.position.y = 0.31 + Math.sin(t * 2.4 + idx) * 0.04;
        sheep.rotation.y = rot + Math.sin(t * 0.6 + idx) * 0.12;
      });
    });
    group.add(sheepGroup);
  } else if (biome === 'ocean') {
    // 1. Southern Crescent Sandy Beach Umbrellas & Sun Loungers (snapped to real dry beach shore, NEVER floating in sea or blocking front doors!)
    const beachProps = new THREE.Group();
    beachProps.name = 'crescent-beach-props';
    for (const [ux, uz, col] of [
      [-12.2, 11.4, '#E8643A'],
      [-3.8, 13.4, '#3B82A6'],
      [0.8, 13.2, '#E8643A'],
      [10.2, 11.4, '#F4B942'],
    ] as const) {
      let placedX: number = ux;
      let placedZ: number = uz;
      let placedY = getTerrainHeight(ux, uz, biome, shape);
      if (placedY < 0.22) {
        for (let step = 1; step <= 12; step += 1) {
          const scale = 1 - step * 0.045;
          const tx = ux * scale;
          const tz = uz * scale;
          const ty = getTerrainHeight(tx, tz, biome, shape);
          if (ty >= 0.22 && ty <= 0.78) {
            placedX = tx;
            placedZ = tz;
            placedY = ty;
            break;
          }
        }
      }
      if (obstacleField) {
        const nudged = obstacleField.nudgePoint(placedX, placedZ, 0.45);
        placedX = nudged.x;
        placedZ = nudged.z;
        placedY = getTerrainHeight(placedX, placedZ, biome, shape);
      }
      if (placedY < 0.2) continue;
      const umb = new THREE.Group();
      umb.position.set(placedX, placedY, placedZ);
      const pole = cyl(0.035, 0.04, 1.15, 8, '#FAF6EE');
      pole.position.y = 0.56;
      const canopy = cyl(0.04, 0.68, 0.32, 10, col, { rough: 0.72, flat: false });
      canopy.position.y = 1.08;
      canopy.rotation.z = 0.14;
      const lounger = box(0.62, 0.1, 0.32, '#FAF6EE', { rough: 0.8 });
      lounger.position.set(0.32, 0.08, 0.18);
      lounger.rotation.y = 0.4;
      umb.add(pole, canopy, lounger);
      beachProps.add(umb);
    }
    group.add(beachProps);

    // 2. Northern Coral Limestone Sea Stacks & Arch
    const seaStacks = new THREE.Group();
    seaStacks.name = 'coral-sea-stacks';
    for (const [kx, kz, r, h] of [
      [-4.4, -19.2, 1.15, 2.4],
      [3.6, -18.8, 1.05, 2.1],
      [-15.8, 13.6, 0.92, 1.75],
      [16.2, 13.2, 0.98, 1.85],
    ] as const) {
      const stack = new THREE.Group();
      stack.position.set(kx, -0.1, kz);
      const rock = cyl(r * 0.68, r, h, 9, '#B8A88A', { rough: 0.92, flat: false });
      rock.position.y = h * 0.5;
      const greenCap = sphere(r * 0.66, 10, '#5E9E4E', { rough: 0.88, flat: false });
      greenCap.scale.y = 0.45;
      greenCap.position.y = h + 0.05;
      stack.add(rock, greenCap);
      seaStacks.add(stack);
    }
    group.add(seaStacks);
  } else if (biome === 'desert') {
    // 1. Stratified Flat-Topped Red Sandstone Mesas / Buttes (placed outside all building & caravan lanes)
    const mesaButtes = new THREE.Group();
    mesaButtes.name = 'mesa-buttes';
    for (const [mx, mz, r, h] of [
      [-15.8, -10.8, 2.0, 2.45],
      [15.8, -10.4, 1.9, 2.25],
      [-38.5, -18.5, 3.4, 3.8],
      [39.5, -14.5, 3.1, 3.4],
      [-24.5, 33.5, 2.6, 2.9],
    ] as const) {
      const baseH = Math.hypot(mx, mz) < 19.5 ? Math.max(0.2, getTerrainHeight(mx, mz, biome, shape)) : 0.2;
      const butte = new THREE.Group();
      butte.position.set(mx, baseH, mz);
      const tier1 = cyl(r * 0.84, r * 1.05, h * 0.45, 10, '#C86D44', { rough: 0.92, flat: false });
      tier1.position.y = h * 0.22;
      const tier2 = cyl(r * 0.68, r * 0.82, h * 0.38, 10, '#DF9653', { rough: 0.9, flat: false });
      tier2.position.y = h * 0.62;
      const cap = cyl(r * 0.64, r * 0.68, h * 0.18, 10, '#E8B87D', { rough: 0.88, flat: false });
      cap.position.y = h * 0.88;
      butte.add(tier1, tier2, cap);
      mesaButtes.add(butte);
    }
    group.add(mesaButtes);

    // 2. Spanning Red-Sandstone Natural Canyon Arch over the Northern Gorge
    const canyonArch = new THREE.Group();
    canyonArch.name = 'canyon-rock-arch';
    const az = -11.4;
    const ax = riverX(az);
    for (let i = 0; i <= 10; i += 1) {
      const u = i / 10;
      const sx = ax + (u - 0.5) * 6.8;
      const sy = 0.5 + Math.sin(u * Math.PI) * 2.85;
      const seg = box(0.95, 0.52, 1.15, i % 2 === 0 ? '#C4623D' : '#DC8E52', { rough: 0.92 });
      seg.position.set(sx, sy, az);
      seg.rotation.z = Math.cos(u * Math.PI) * -0.48;
      canyonArch.add(seg);
    }
    group.add(canyonArch);

    // 3. Shimmering Crescent Emerald Oasis Pool
    const oasisPool = new THREE.Group();
    oasisPool.name = 'crescent-oasis-pool';
    const ox = -6.8;
    const oz = 11.8;
    const oy = Math.max(0.18, getTerrainHeight(ox, oz, biome, shape));
    const waterDisc = cyl(1.85, 1.95, 0.08, 24, '#4CC9B8', {
      rough: 0.15,
      metal: 0.12,
      emissive: '#2EA89C',
      emissiveIntensity: 0.25,
    });
    waterDisc.position.set(ox, oy + 0.03, oz);
    const sandCutout = cyl(1.25, 1.32, 0.12, 20, '#EED294', { rough: 0.9 });
    sandCutout.position.set(ox + 0.72, oy + 0.05, oz - 0.45);
    oasisPool.add(waterDisc, sandCutout);
    group.add(oasisPool);
  } else if (biome === 'snow') {
    // 1. Northern Twin Alpine Peaks with Granite Crags & Snow Cornices
    const alpinePeaks = new THREE.Group();
    alpinePeaks.name = 'alpine-twin-peaks';
    for (const [px, pz, r, h] of [
      [-5.6, -13.2, 2.6, 3.2],
      [5.4, -13.4, 2.4, 2.9],
      [-13.8, -8.8, 1.85, 2.2],
    ] as const) {
      const py = Math.max(0.8, getTerrainHeight(px, pz, biome, shape) - 0.6);
      const peakGrp = new THREE.Group();
      peakGrp.position.set(px, py, pz);
      const crag = pyramid(r * 1.45, h * 0.68, r * 1.35, '#7A8896', { rough: 0.9, flat: false });
      crag.position.y = h * 0.34;
      const snowCap = pyramid(r * 1.08, h * 0.56, r * 1.02, '#F7FBFC', {
        rough: 0.75,
        flat: false,
        emissive: '#DCEFF7',
        emissiveIntensity: 0.12,
      });
      snowCap.position.y = h * 0.64;
      const flagPole = cyl(0.03, 0.03, 0.75, 6, '#3A3F36');
      flagPole.position.y = h * 0.94;
      const flag = box(0.36, 0.2, 0.03, '#E8643A');
      flag.position.set(0.18, h * 1.02, 0);
      peakGrp.add(crag, snowCap, flagPole, flag);
      alpinePeaks.add(peakGrp);
    }
    group.add(alpinePeaks);

    // 2. SE Sloping Ski Bowl Slalom Gate Banners
    const skiGates = new THREE.Group();
    skiGates.name = 'ski-bowl-gates';
    for (const [gx, gz, col] of [
      [6.8, 9.6, '#E8643A'],
      [8.6, 11.2, '#2B7CD3'],
      [7.4, 12.8, '#E8643A'],
      [9.6, 14.2, '#2B7CD3'],
    ] as const) {
      const gy = getTerrainHeight(gx, gz, biome, shape);
      if (gy < 0.22) continue;
      const gate = new THREE.Group();
      gate.position.set(gx, gy, gz);
      const p1 = cyl(0.03, 0.03, 0.68, 6, col);
      p1.position.set(-0.28, 0.34, 0);
      const p2 = cyl(0.03, 0.03, 0.68, 6, col);
      p2.position.set(0.28, 0.34, 0);
      const banner = box(0.56, 0.22, 0.03, col);
      banner.position.set(0, 0.52, 0);
      gate.add(p1, p2, banner);
      skiGates.add(gate);
    }
    group.add(skiGates);

    // 3. Floating Glacial Icebergs in the Fjord & Outer Arctic Sea
    const icebergs = new THREE.Group();
    icebergs.name = 'glacial-icebergs';
    for (const [ix, iz, s] of [
      [-12.5, -19.5, 1.15],
      [11.8, -19.2, 1.05],
      [-18.2, 16.5, 0.95],
      [18.5, 15.8, 1.1],
    ] as const) {
      const berg = new THREE.Group();
      const slab = box(1.6 * s, 0.48 * s, 1.2 * s, '#E8F7FC', {
        rough: 0.35,
        emissive: '#9ADCF0',
        emissiveIntensity: 0.18,
      });
      slab.position.y = 0.16;
      const spire = pyramid(0.85 * s, 0.95 * s, 0.75 * s, '#C8ECF7', { rough: 0.3, flat: false });
      spire.position.set(0.2 * s, 0.55 * s, 0);
      berg.add(slab, spire);
      berg.position.set(ix, -0.04, iz);
      icebergs.add(berg);
      updaters.push((t) => {
        berg.position.y = -0.04 + Math.sin(t * 1.3 + ix) * 0.035;
        berg.rotation.z = Math.sin(t * 0.9 + iz) * 0.03;
      });
    }
    group.add(icebergs);
  }

  return {
    group,
    update: (t) => updaters.forEach((fn) => fn(t)),
  };
}

function createWorldShapeFeatures(
  biome: BiomeId,
  _theme: ThemeJson,
  worldShape?: WorldShapeType,
): { group: THREE.Group; update: (t: number) => void } {
  const shape = resolveWorldShape(biome, worldShape);
  const group = new THREE.Group();
  group.name = 'world-shape-features';
  const updaters: Array<(t: number) => void> = [];

  if (shape === 'archipelago') {
    // Nearshore Coral Sandbar Keys (`archipelago-coral-keys`) & Inter-Island Timber Boardwalks (`archipelago-boardwalks`)
    // Placed strictly on West, East, and NW Coral Keys — completely clear of the South Submarine Harbor & Dock!
    const coralKeys = new THREE.Group();
    coralKeys.name = 'archipelago-coral-keys';
    const boardwalks = new THREE.Group();
    boardwalks.name = 'archipelago-boardwalks';
    for (const [kx, kz] of [
      [-15.8, 12.2],
      [15.6, 12.4],
      [-14.6, -13.4],
    ] as const) {
      const keyGrp = new THREE.Group();
      keyGrp.position.set(kx, -0.02, kz);
      const sandbar = cyl(2.3, 2.8, 0.28, 24, '#F0DFAA', { rough: 0.9, flat: false });
      sandbar.scale.set(1.3, 1, 0.85);
      const grassPatch = cyl(1.45, 1.75, 0.22, 20, '#74B859', { rough: 0.86, flat: false });
      grassPatch.position.y = 0.22;
      const palmTrunk = cyl(0.08, 0.14, 1.45, 8, '#76533B');
      palmTrunk.position.set(0.2, 0.9, 0);
      palmTrunk.rotation.z = kx < 0 ? 0.16 : -0.16;
      const palmCrown = sphere(0.56, 10, '#58A84C', { rough: 0.85, flat: false });
      palmCrown.scale.set(1.3, 0.55, 1.3);
      palmCrown.position.set(kx < 0 ? 0.05 : 0.35, 1.65, 0);
      keyGrp.add(sandbar, grassPatch, palmTrunk, palmCrown);
      coralKeys.add(keyGrp);
    }

    // Arched Inter-Island Timber Bridges spanning the West Strait (z≈2.9) and East Strait (z≈-6.4)
    for (const [bx, bz, spanZ] of [
      [-7.8, 2.9, 3.8],
      [7.8, -6.4, 3.6],
    ] as const) {
      const bridgeGrp = new THREE.Group();
      bridgeGrp.position.set(bx, 0.45, bz);
      for (let s = 0; s < 7; s += 1) {
        const u = s / 6;
        const lz = (u - 0.5) * spanZ;
        const archY = Math.sin(u * Math.PI) * 0.38;
        const deck = box(1.12, 0.1, 0.52, s % 2 === 0 ? '#9C6B46' : '#855838', { rough: 0.86 });
        deck.position.set(0, archY, lz);
        bridgeGrp.add(deck);
      }
      for (const sideX of [-0.52, 0.52]) {
        const rail = box(0.06, 0.28, spanZ, '#6E4730');
        rail.position.set(sideX, 0.32, 0);
        bridgeGrp.add(rail);
      }
      boardwalks.add(bridgeGrp);
    }
    group.add(coralKeys, boardwalks);
  } else if (shape === 'b612-highland') {
    // @Saccc_c-inspired B-612 T1/T2 Two-Tone Moss-Capped Boulders (`b612-terrain-boulders`)
    const boulderGroup = new THREE.Group();
    boulderGroup.name = 'b612-terrain-boulders';
    const boulderSpots: [number, number, number, number][] = [
      [-14.2, -5.2, 1.25, 0.95],
      [-13.8, 5.8, 1.15, 0.88],
      [14.0, -6.0, 1.32, 0.98],
      [13.6, 5.4, 1.18, 0.86],
      [-4.0, -13.8, 1.28, 0.92],
      [4.5, -13.4, 1.22, 0.9],
      [-6.0, 13.0, 1.08, 0.82],
      [5.8, 13.2, 1.12, 0.85],
    ];
    for (const [rx, rz, rad, hScale] of boulderSpots) {
      const ry = Math.max(0.15, getTerrainHeight(rx, rz, biome, shape));
      const tBoulder = new THREE.Group();
      tBoulder.position.set(rx, ry, rz);
      const stoneBody = sphere(rad, 16, '#C8BCA6', { rough: 0.9, flat: false });
      stoneBody.scale.set(1.22, 0.78 * hScale, 0.96);
      stoneBody.position.y = rad * 0.36 * hScale;
      const mossCap = sphere(rad * 0.94, 16, '#74C365', { rough: 0.82, flat: false });
      mossCap.scale.set(1.18, 0.42 * hScale, 0.92);
      mossCap.position.y = rad * 0.68 * hScale;
      const starBud = sphere(0.12, 8, '#FDE047', {
        emissive: '#F59E0B',
        emissiveIntensity: 0.7,
      });
      starBud.position.set(0.18, rad * 0.92 * hScale, 0.1);
      tBoulder.add(stoneBody, mossCap, starBud);
      boulderGroup.add(tBoulder);
    }
    group.add(boulderGroup);

    // Little Prince Miniature Active Volcano (`b612-mini-volcano`) on NW Star Lobe
    const volcanoGrp = new THREE.Group();
    volcanoGrp.name = 'b612-mini-volcano';
    const vx = -13.2;
    const vz = -8.2;
    const vy = Math.max(0.25, getTerrainHeight(vx, vz, biome, shape));
    volcanoGrp.position.set(vx, vy, vz);
    const vCone = cyl(0.52, 1.65, 2.15, 20, '#B06A4B', { rough: 0.88, flat: false });
    vCone.position.y = 1.05;
    const vRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.12, 10, 24),
      mat('#7C4632', { rough: 0.85, flat: false }),
    );
    vRim.rotation.x = Math.PI / 2;
    vRim.position.y = 2.12;
    const vLava = sphere(0.36, 12, '#FF6A13', {
      emissive: '#FF4500',
      emissiveIntensity: 0.9,
    });
    vLava.scale.y = 0.35;
    vLava.position.y = 2.08;
    volcanoGrp.add(vCone, vRim, vLava);
    const puffs: THREE.Mesh[] = [];
    for (let p = 0; p < 4; p += 1) {
      const puff = sphere(0.22 + p * 0.05, 10, '#FAF8F5', {
        rough: 0.9,
        flat: false,
        opacity: 0.82,
      });
      puff.position.set(0, 2.4 + p * 0.45, 0);
      volcanoGrp.add(puff);
      puffs.push(puff);
    }
    group.add(volcanoGrp);

    // Golden Tilted Planetary Asteroid Ring (`b612-planetary-ring`)
    const ringGrp = new THREE.Group();
    ringGrp.name = 'b612-planetary-ring';
    ringGrp.position.set(0, 2.2, 0);
    ringGrp.rotation.x = 0.22;
    ringGrp.rotation.z = -0.14;
    const ringMesh = new THREE.Mesh(
      new THREE.TorusGeometry(20.4, 0.075, 10, 96),
      mat('#FDE047', {
        emissive: '#F59E0B',
        emissiveIntensity: 0.55,
        rough: 0.3,
        metal: 0.4,
      }),
    );
    ringMesh.rotation.x = Math.PI / 2;
    ringGrp.add(ringMesh);
    for (let k = 0; k < 6; k += 1) {
      const ang = (k / 6) * Math.PI * 2;
      const starGem = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.28, 0),
        mat('#FEF08A', { emissive: '#F59E0B', emissiveIntensity: 0.85 }),
      );
      starGem.position.set(Math.cos(ang) * 20.4, 0, Math.sin(ang) * 20.4);
      ringGrp.add(starGem);
    }
    group.add(ringGrp);

    // Little Prince & Fox Sunset Bench Overlook (`b612-fox-bench`) & Baobab Saplings (`b612-baobab-saplings`)
    const foxBench = new THREE.Group();
    foxBench.name = 'b612-fox-bench';
    const fx = -11.0;
    const fz = 10.2;
    const fy = Math.max(0.25, getTerrainHeight(fx, fz, biome, shape));
    foxBench.position.set(fx, fy, fz);
    foxBench.rotation.y = 0.55;
    const seat = box(1.22, 0.1, 0.4, '#8C5A3C', { rough: 0.8 });
    seat.position.y = 0.3;
    const backrest = box(1.22, 0.26, 0.08, '#8C5A3C', { rough: 0.8 });
    backrest.position.set(0, 0.48, -0.16);
    const princeTorso = cyl(0.11, 0.14, 0.36, 10, '#4ADE80', { flat: false });
    princeTorso.position.set(-0.22, 0.54, 0);
    const princeHead = sphere(0.13, 12, '#FDE047', { flat: false });
    princeHead.position.set(-0.22, 0.82, 0);
    const princeScarf = box(0.36, 0.07, 0.09, '#FACC15', {
      emissive: '#EAB308',
      emissiveIntensity: 0.45,
    });
    princeScarf.position.set(-0.02, 0.7, 0.05);
    const foxBody = sphere(0.14, 10, '#F97316', { flat: false });
    foxBody.scale.set(0.9, 1.2, 0.9);
    foxBody.position.set(0.28, 0.46, 0.02);
    foxBench.add(seat, backrest, princeTorso, princeHead, princeScarf, foxBody);
    group.add(foxBench);

    const baobabGrp = new THREE.Group();
    baobabGrp.name = 'b612-baobab-saplings';
    for (const [bx, bz, bs] of [
      [-14.2, 3.6, 0.95],
      [14.0, -9.2, 0.92],
    ] as const) {
      const by = Math.max(0.25, getTerrainHeight(bx, bz, biome, shape));
      const tree = new THREE.Group();
      tree.position.set(bx, by, bz);
      const trunk = cyl(0.22 * bs, 0.38 * bs, 1.28 * bs, 14, '#9E7B56', {
        rough: 0.84,
        flat: false,
      });
      trunk.position.y = 0.64 * bs;
      const crown = sphere(0.64 * bs, 14, '#7BC658', { rough: 0.78, flat: false });
      crown.scale.set(1.22, 0.76, 1.15);
      crown.position.set(0, 1.45 * bs, 0);
      tree.add(trunk, crown);
      baobabGrp.add(tree);
    }
    group.add(baobabGrp);

    // Winding Spiral Stone Footpath (`b612-spiral-path`) ascending the B-612 Planetoid Dome to the Rose Summit
    const spiralPath = new THREE.Group();
    spiralPath.name = 'b612-spiral-path';
    for (let s = 0; s < 36; s += 1) {
      const u = s / 35;
      const theta = u * Math.PI * 2.35 + 0.55;
      const rad = (1 - u) * 11.8 + 1.85;
      const sx = Math.cos(theta) * rad;
      const sz = Math.sin(theta) * rad * 0.9 - 2.2 * u;
      const sy = getTerrainHeight(sx, sz, biome, 'b612-highland');
      const stoneSlab = cyl(0.36 + (s % 2) * 0.08, 0.42, 0.09, 10, s % 3 === 0 ? '#E8D8B8' : '#D8C7A4', {
        rough: 0.88,
        flat: false,
      });
      stoneSlab.scale.set(1.25, 1, 0.88);
      stoneSlab.rotation.y = -theta;
      stoneSlab.position.set(sx, sy + 0.04, sz);
      spiralPath.add(stoneSlab);
    }
    group.add(spiralPath);

    updaters.push((t) => {
      ringGrp.rotation.y = t * 0.18;
      puffs.forEach((pf, idx) => {
        const u = (t * 0.45 + idx * 0.25) % 1;
        pf.position.y = 2.3 + u * 1.65;
        pf.position.x = Math.sin(t * 1.4 + idx) * 0.18 * u;
        pf.scale.setScalar(0.65 + Math.sin(u * Math.PI) * 0.55);
      });
    });
  } else if (shape === 'canyon-mesa') {
    // Monument Valley Red-Sandstone Monolith Spires (`canyon-monoliths`)
    const monoliths = new THREE.Group();
    monoliths.name = 'canyon-monoliths';
    for (const [mx, mz, r, h] of [
      [-15.4, -7.2, 1.35, 3.1],
      [15.2, -7.6, 1.28, 2.95],
      [-14.8, 8.6, 1.15, 2.55],
      [14.6, 8.8, 1.22, 2.75],
    ] as const) {
      const my = Math.max(0.2, getTerrainHeight(mx, mz, biome, shape));
      const spire = new THREE.Group();
      spire.position.set(mx, my, mz);
      const base = cyl(r * 0.72, r, h * 0.55, 8, '#C8643B', { rough: 0.92, flat: false });
      base.position.y = h * 0.27;
      const shaft = cyl(r * 0.48, r * 0.68, h * 0.45, 8, '#E08E52', { rough: 0.9, flat: false });
      shaft.position.y = h * 0.72;
      const cap = box(r * 1.15, 0.24, r * 1.05, '#F0C286', { rough: 0.88 });
      cap.position.y = h * 0.96;
      spire.add(base, shaft, cap);
      monoliths.add(spire);
    }
    group.add(monoliths);

    // High-Plateau Timber & Catenary Rope Suspension Bridge (`canyon-suspension-bridge`) spanning the canyon gorge
    const suspBridge = new THREE.Group();
    suspBridge.name = 'canyon-suspension-bridge';
    const sbZ = -1.6;
    const sbCx = riverX(sbZ);
    const sbY = Math.max(
      1.15,
      (getTerrainHeight(sbCx - 3.6, sbZ, biome, shape) + getTerrainHeight(sbCx + 3.6, sbZ, biome, shape)) * 0.5,
    );
    for (const sideX of [-3.5, 3.5]) {
      for (const sideZ of [-0.72, 0.72]) {
        const pylon = cyl(0.11, 0.14, 1.45, 8, '#6E4730', { rough: 0.88 });
        pylon.position.set(sbCx + sideX, sbY + 0.45, sbZ + sideZ);
        suspBridge.add(pylon);
      }
      const crossBeam = box(0.18, 0.16, 1.65, '#8B5A3C', { rough: 0.86 });
      crossBeam.position.set(sbCx + sideX, sbY + 1.12, sbZ);
      suspBridge.add(crossBeam);
    }
    for (let i = 0; i < 12; i += 1) {
      const u = i / 11;
      const px = sbCx + (u - 0.5) * 6.8;
      const sag = Math.sin(u * Math.PI) * -0.26;
      const plank = box(0.46, 0.1, 1.38, i % 2 === 0 ? '#9C6B46' : '#855838', { rough: 0.88 });
      plank.position.set(px, sbY + sag, sbZ);
      suspBridge.add(plank);
      for (const sideZ of [-0.68, 0.68]) {
        const ropeSeg = box(0.62, 0.05, 0.05, '#D9B382', { rough: 0.78 });
        ropeSeg.position.set(px, sbY + 0.68 + sag * 1.35, sbZ + sideZ);
        suspBridge.add(ropeSeg);
      }
    }
    group.add(suspBridge);
  } else if (shape === 'alpine-valley') {
    // Jagged Northern Glacial Ridge Crest (`alpine-ridge-crest`) & Ski Overlook Chalet (`alpine-overlook-chalet`)
    const ridgeCrest = new THREE.Group();
    ridgeCrest.name = 'alpine-ridge-crest';
    for (const [rx, rz, s] of [
      [-9.8, -14.2, 1.2],
      [-2.8, -14.8, 1.1],
      [2.6, -14.8, 1.15],
      [9.6, -14.0, 1.25],
    ] as const) {
      const ry = Math.max(0.6, getTerrainHeight(rx, rz, biome, shape));
      const crag = pyramid(1.5 * s, 2.1 * s, 1.4 * s, '#DCEAF2', {
        rough: 0.65,
        flat: false,
        emissive: '#9ADCF0',
        emissiveIntensity: 0.14,
      });
      crag.position.set(rx, ry + s * 0.8, rz);
      ridgeCrest.add(crag);
    }
    const chalet = new THREE.Group();
    chalet.name = 'alpine-overlook-chalet';
    const cx = 13.8;
    const cz = 8.4;
    const cy = Math.max(0.25, getTerrainHeight(cx, cz, biome, shape));
    chalet.position.set(cx, cy, cz);
    const cabin = box(1.25, 0.78, 0.95, '#8C5A3C', { rough: 0.85 });
    cabin.position.y = 0.39;
    const roof = pyramid(1.55, 0.68, 1.2, '#F8FAFC', { rough: 0.75, flat: false });
    roof.position.y = 1.08;
    const win = box(0.36, 0.26, 0.98, '#FFE49E', {
      emissive: '#FFAE34',
      emissiveIntensity: 0.85,
    });
    win.position.y = 0.42;
    chalet.add(cabin, roof, win);

    // Central Glacial Mirror Tarn Lake (`alpine-central-lake`) in the U-Shaped Valley Basin
    const centralLake = new THREE.Group();
    centralLake.name = 'alpine-central-lake';
    centralLake.position.set(-0.4, 0.04, 1.0);
    const tarnDisc = cyl(3.4, 3.6, 0.08, 32, '#7AD7F0', {
      rough: 0.12,
      metal: 0.18,
      emissive: '#38BDF8',
      emissiveIntensity: 0.28,
    });
    tarnDisc.scale.set(1.12, 1, 1.32);
    centralLake.add(tarnDisc);
    for (let k = 0; k < 10; k += 1) {
      const ang = (k / 10) * Math.PI * 2;
      const rimStone = sphere(0.32 + (k % 2) * 0.12, 10, '#94A3B8', { rough: 0.88, flat: false });
      rimStone.scale.set(1.2, 0.65, 0.95);
      rimStone.position.set(Math.cos(ang) * 3.65, 0.12, Math.sin(ang) * 4.35);
      centralLake.add(rimStone);
    }

    group.add(ridgeCrest, chalet, centralLake);
  } else if (shape === 'crescent-bay') {
    // 5. CRESCENT-BAY ATOLL: Cape Lighthouse (`crescent-cape-lighthouse`), Curved Bay Boardwalk (`crescent-bay-boardwalk`) & Moored Sailboats (`crescent-bay-sailboats`)
    const capeLighthouse = new THREE.Group();
    capeLighthouse.name = 'crescent-cape-lighthouse';
    const lx = 13.2;
    const lz = 6.2;
    const ly = Math.max(0.35, getTerrainHeight(lx, lz, biome, shape));
    capeLighthouse.position.set(lx, ly, lz);
    const lhRock = sphere(1.25, 12, '#C8BCA6', { rough: 0.9, flat: false });
    lhRock.scale.set(1.2, 0.55, 1.1);
    const towerBase = cyl(0.58, 0.78, 2.45, 16, '#FAF8F5', { rough: 0.6 });
    towerBase.position.y = 1.35;
    const redBand1 = cyl(0.64, 0.7, 0.58, 16, '#EF4444', { rough: 0.55 });
    redBand1.position.y = 1.15;
    const redBand2 = cyl(0.56, 0.61, 0.55, 16, '#EF4444', { rough: 0.55 });
    redBand2.position.y = 2.05;
    const lanternRoom = cyl(0.46, 0.46, 0.52, 14, '#FEF08A', {
      emissive: '#F59E0B',
      emissiveIntensity: 0.95,
    });
    lanternRoom.position.y = 2.78;
    const domeCap = sphere(0.5, 14, '#DC2626', { rough: 0.45, flat: false });
    domeCap.scale.y = 0.65;
    domeCap.position.y = 3.08;
    const beamPivot = new THREE.Group();
    beamPivot.position.y = 2.78;
    const lightBeam = cyl(0.08, 0.65, 2.8, 12, '#FEF08A', {
      emissive: '#FACC15',
      emissiveIntensity: 0.75,
      opacity: 0.35,
    });
    lightBeam.rotation.z = Math.PI / 2;
    lightBeam.position.x = 1.45;
    beamPivot.add(lightBeam);
    capeLighthouse.add(lhRock, towerBase, redBand1, redBand2, lanternRoom, domeCap, beamPivot);

    const bayBoardwalk = new THREE.Group();
    bayBoardwalk.name = 'crescent-bay-boardwalk';
    for (let i = 0; i < 14; i += 1) {
      const u = i / 13;
      const bx = -2.8 + u * 10.4;
      const bz = 8.4 - Math.sin(u * Math.PI) * 1.85;
      const archY = 0.32 + Math.sin(u * Math.PI) * 0.42;
      const plank = box(0.65, 0.1, 0.98, i % 2 === 0 ? '#9C6B46' : '#855838', { rough: 0.86 });
      plank.position.set(bx, archY, bz);
      bayBoardwalk.add(plank);
      if (i % 3 === 0) {
        const post = cyl(0.06, 0.07, archY + 0.65, 6, '#6E4730');
        post.position.set(bx, archY * 0.5, bz + 0.44);
        bayBoardwalk.add(post);
      }
    }

    const bayBoats = new THREE.Group();
    bayBoats.name = 'crescent-bay-sailboats';
    const boatMeshes: THREE.Group[] = [];
    for (const [bx, bz, sailCol, rotY] of [
      [1.8, 2.8, '#F43F5E', 0.45],
      [4.2, 4.6, '#38BDF8', -0.35],
    ] as const) {
      const boat = new THREE.Group();
      boat.position.set(bx, 0.02, bz);
      boat.rotation.y = rotY;
      const hull = box(1.15, 0.24, 0.48, '#FAF8F5', { rough: 0.5 });
      const mast = cyl(0.03, 0.04, 1.55, 6, '#78350F');
      mast.position.y = 0.82;
      const sail = pyramid(0.75, 1.25, 0.08, sailCol, { rough: 0.6, flat: false });
      sail.position.set(0.08, 0.88, 0);
      boat.add(hull, mast, sail);
      bayBoats.add(boat);
      boatMeshes.push(boat);
    }

    updaters.push((t) => {
      beamPivot.rotation.y = t * 1.15;
      boatMeshes.forEach((b, idx) => {
        b.position.y = 0.02 + Math.sin(t * 2.2 + idx * 1.4) * 0.04;
        b.rotation.z = Math.cos(t * 1.8 + idx) * 0.05;
      });
    });
    group.add(capeLighthouse, bayBoardwalk, bayBoats);
  } else if (shape === 'floating-terraces') {
    // 6. FLOATING-TERRACES ARK: Orthogonal Stone Retaining Walls (`terrace-ark-walls`), Grand Staircases (`terrace-grand-stairs`) & Sky Waterfall (`terrace-sky-waterfall`)
    const arkWalls = new THREE.Group();
    arkWalls.name = 'terrace-ark-walls';
    for (const [wx, wz, wLen, rotY] of [
      [-8.5, 10.6, 8.4, 0],
      [8.5, 10.6, 8.4, 0],
      [-13.8, -1.5, 14.5, Math.PI / 2],
      [13.8, -1.5, 14.5, Math.PI / 2],
      [-7.2, -12.4, 9.2, 0],
      [7.2, -12.4, 9.2, 0],
    ] as const) {
      const wy = Math.max(0.25, getTerrainHeight(wx, wz, biome, shape));
      const wallSeg = new THREE.Group();
      wallSeg.position.set(wx, wy, wz);
      wallSeg.rotation.y = rotY;
      const beam = box(wLen, 0.46, 0.42, '#D6CFC2', { rough: 0.85 });
      beam.position.y = 0.18;
      wallSeg.add(beam);
      for (const endSide of [-0.46, 0.46]) {
        const obelisk = box(0.68, 1.35, 0.68, '#E5DFD3', { rough: 0.78 });
        obelisk.position.set(endSide * wLen, 0.65, 0);
        const goldCap = pyramid(0.74, 0.48, 0.74, '#F59E0B', {
          emissive: '#D97706',
          emissiveIntensity: 0.45,
        });
        goldCap.position.set(endSide * wLen, 1.54, 0);
        wallSeg.add(obelisk, goldCap);
      }
      arkWalls.add(wallSeg);
    }

    const grandStairs = new THREE.Group();
    grandStairs.name = 'terrace-grand-stairs';
    for (const [sx, sz] of [
      [-5.6, 2.4],
      [5.8, 2.4],
      [-5.2, -5.8],
      [5.4, -5.8],
    ] as const) {
      const stairFlight = new THREE.Group();
      const baseH = Math.max(0.35, getTerrainHeight(sx, sz + 1.2, biome, shape));
      stairFlight.position.set(sx, baseH, sz);
      for (let st = 0; st < 6; st += 1) {
        const stepBox = box(1.65, 0.16, 0.42, st % 2 === 0 ? '#FAF6EE' : '#E2D9C8', { rough: 0.8 });
        stepBox.position.set(0, st * 0.15, -st * 0.36);
        stairFlight.add(stepBox);
      }
      grandStairs.add(stairFlight);
    }

    const skyWaterfall = new THREE.Group();
    skyWaterfall.name = 'terrace-sky-waterfall';
    const wfx = 9.2;
    const wfz = 11.4;
    const wfy = Math.max(0.55, getTerrainHeight(wfx, wfz - 1.2, biome, shape));
    skyWaterfall.position.set(wfx, 0, wfz);
    const chute = box(2.4, wfy + 0.6, 0.38, '#38BDF8', {
      emissive: '#0EA5E9',
      emissiveIntensity: 0.55,
      opacity: 0.84,
      rough: 0.15,
    });
    chute.position.set(0, (wfy - 0.4) * 0.5, 0);
    const mistPuffs: THREE.Mesh[] = [];
    for (let m = 0; m < 6; m += 1) {
      const puff = sphere(0.35 + (m % 2) * 0.12, 10, '#F0F9FF', {
        emissive: '#BAE6FD',
        emissiveIntensity: 0.45,
        opacity: 0.78,
      });
      puff.position.set((m - 2.5) * 0.45, 0.12, 0.28);
      skyWaterfall.add(puff);
      mistPuffs.push(puff);
    }
    skyWaterfall.add(chute);
    updaters.push((t) => {
      mistPuffs.forEach((mp, idx) => {
        const pulse = 0.8 + 0.35 * Math.sin(t * 4.2 + idx * 1.1);
        mp.scale.setScalar(pulse);
        mp.position.y = 0.1 + Math.abs(Math.sin(t * 3.5 + idx)) * 0.28;
      });
    });
    group.add(arkWalls, grandStairs, skyWaterfall);
  }

  return {
    group,
    update: (t) => updaters.forEach((fn) => fn(t)),
  };
}

function createIslandDecorProps(
  biome: BiomeId,
  _theme: ThemeJson,
  worldShape?: WorldShapeType,
  decorProps?: DecorPropId[],
  obstacleField?: ObstacleClearanceField,
): { group: THREE.Group; update: (t: number) => void } {
  const group = new THREE.Group();
  group.name = 'island-decor-props';
  const updaters: Array<(t: number) => void> = [];
  const activeProps = new Set(decorProps ?? []);

  if (activeProps.has('b612-rose')) {
    const roseGrp = new THREE.Group();
    roseGrp.name = 'decor-prop-b612-rose';
    const nudged = obstacleField ? obstacleField.nudgePoint(-3.4, 4.2, 0.5) : { x: -3.4, z: 4.2 };
    const rx = nudged.x;
    const rz = nudged.z;
    const ry = Math.max(0.25, getTerrainHeight(rx, rz, biome, worldShape));
    roseGrp.position.set(rx, ry, rz);
    const ped = cyl(0.75, 0.92, 0.36, 16, '#E2D8C8', { rough: 0.85, flat: false });
    ped.position.y = 0.18;
    const stem = cyl(0.04, 0.05, 0.72, 8, '#16A34A');
    stem.position.y = 0.68;
    const blossom = sphere(0.24, 12, '#F43F5E', {
      emissive: '#E11D48',
      emissiveIntensity: 0.9,
      flat: false,
    });
    blossom.position.y = 1.08;
    const glassBell = cyl(0.58, 0.62, 1.35, 18, '#E0F2FE', {
      rough: 0.08,
      metal: 0.15,
      opacity: 0.36,
      flat: false,
    });
    glassBell.position.y = 0.98;
    const knob = sphere(0.11, 10, '#FDE047', { emissive: '#F59E0B', emissiveIntensity: 0.85 });
    knob.position.y = 1.72;
    roseGrp.add(ped, stem, blossom, glassBell, knob);
    group.add(roseGrp);
    updaters.push((t) => {
      blossom.scale.setScalar(1 + Math.sin(t * 2.8) * 0.08);
    });
  }

  if (activeProps.has('fox-bench')) {
    const benchGrp = new THREE.Group();
    benchGrp.name = 'decor-prop-fox-bench';
    const nudged = obstacleField ? obstacleField.nudgePoint(-6.4, 11.2, 0.5) : { x: -6.4, z: 11.2 };
    const bx = nudged.x;
    const bz = nudged.z;
    const by = Math.max(0.25, getTerrainHeight(bx, bz, biome, worldShape));
    benchGrp.position.set(bx, by, bz);
    benchGrp.rotation.y = 0.42;
    const seat = box(1.35, 0.12, 0.44, '#8C5A3C', { rough: 0.82 });
    seat.position.y = 0.32;
    const back = box(1.35, 0.28, 0.09, '#8C5A3C', { rough: 0.82 });
    back.position.set(0, 0.52, -0.18);
    const princeTorso = cyl(0.12, 0.15, 0.38, 10, '#4ADE80', { flat: false });
    princeTorso.position.set(-0.24, 0.56, 0);
    const princeHead = sphere(0.14, 12, '#FDE047', { flat: false });
    princeHead.position.set(-0.24, 0.86, 0);
    const scarf = box(0.4, 0.08, 0.1, '#FACC15', { emissive: '#EAB308', emissiveIntensity: 0.5 });
    scarf.position.set(0, 0.74, 0.05);
    const fox = sphere(0.16, 10, '#F97316', { flat: false });
    fox.scale.set(0.9, 1.25, 0.9);
    fox.position.set(0.32, 0.48, 0.02);
    benchGrp.add(seat, back, princeTorso, princeHead, scarf, fox);
    group.add(benchGrp);
  }

  if (activeProps.has('cherry-grove')) {
    const cherryGrp = new THREE.Group();
    cherryGrp.name = 'decor-prop-cherry-grove';
    for (const [rawCx, rawCz, s] of [
      [-12.6, 2.8, 1.05],
      [-13.8, 4.2, 0.88],
      [-11.4, 4.4, 0.92],
    ] as const) {
      const nudged = obstacleField ? obstacleField.nudgePoint(rawCx, rawCz, 0.5) : { x: rawCx, z: rawCz };
      const cx = nudged.x;
      const cz = nudged.z;
      const cy = Math.max(0.25, getTerrainHeight(cx, cz, biome, worldShape));
      const tree = new THREE.Group();
      tree.position.set(cx, cy, cz);
      const trunk = cyl(0.1 * s, 0.16 * s, 1.15 * s, 8, '#6E4B34');
      trunk.position.y = 0.58 * s;
      const crown1 = sphere(0.68 * s, 12, '#F472B6', {
        rough: 0.78,
        flat: false,
        emissive: '#EC4899',
        emissiveIntensity: 0.22,
      });
      crown1.position.set(0, 1.38 * s, 0);
      const crown2 = sphere(0.52 * s, 12, '#FBCFE8', { rough: 0.78, flat: false });
      crown2.position.set(0.32 * s, 1.56 * s, 0.15 * s);
      tree.add(trunk, crown1, crown2);
      tree.userData.windSway = true;
      tree.userData.windPhase = cx * 0.45 + cz * 0.39;
      cherryGrp.add(tree);
    }
    group.add(cherryGrp);
  }

  if (activeProps.has('campfire-tent')) {
    const campGrp = new THREE.Group();
    campGrp.name = 'decor-prop-campfire-tent';
    const nudged = obstacleField ? obstacleField.nudgePoint(8.4, 11.4, 0.65) : { x: 8.4, z: 11.4 };
    const tx = nudged.x;
    const tz = nudged.z;
    const ty = Math.max(0.25, getTerrainHeight(tx, tz, biome, worldShape));
    campGrp.position.set(tx, ty, tz);
    const tent = pyramid(1.65, 1.35, 1.55, '#FEF3C7', { rough: 0.78, flat: false });
    tent.position.set(-0.65, 0.68, -0.25);
    const fireRing = cyl(0.45, 0.52, 0.14, 10, '#78716C');
    fireRing.position.set(0.65, 0.07, 0.35);
    const flame = pyramid(0.48, 0.78, 0.48, '#FB923C', {
      emissive: '#F97316',
      emissiveIntensity: 1.05,
    });
    flame.position.set(0.65, 0.48, 0.35);
    campGrp.add(tent, fireRing, flame);
    group.add(campGrp);
    updaters.push((t) => {
      flame.scale.y = 0.85 + Math.sin(t * 9.0) * 0.22;
    });
  }

  if (activeProps.has('dutch-windmill')) {
    const millGrp = new THREE.Group();
    millGrp.name = 'decor-prop-dutch-windmill';
    const nudged = obstacleField ? obstacleField.nudgePoint(13.4, -1.2, 0.65) : { x: 13.4, z: -1.2 };
    const mx = nudged.x;
    const mz = nudged.z;
    const my = Math.max(0.25, getTerrainHeight(mx, mz, biome, worldShape));
    millGrp.position.set(mx, my, mz);
    millGrp.rotation.y = -0.35;
    const base = cyl(0.68, 0.88, 0.82, 8, '#9B8E78', { rough: 0.9 });
    base.position.y = 0.41;
    const tower = cyl(0.52, 0.68, 1.85, 8, '#B85A3A', { rough: 0.8 });
    tower.position.y = 1.65;
    const sails = new THREE.Group();
    sails.name = 'dutch-windmill-sails';
    sails.userData.windmillSpin = true;
    sails.position.set(0, 2.38, 0.58);
    for (let k = 0; k < 4; k += 1) {
      const arm = new THREE.Group();
      arm.rotation.z = (k * Math.PI) / 2;
      const spar = box(0.08, 1.48, 0.05, '#76533B');
      spar.position.y = 0.74;
      const blade = box(0.3, 1.18, 0.03, '#FAF6EE', { rough: 0.7 });
      blade.position.set(0.15, 0.82, 0.02);
      arm.add(spar, blade);
      sails.add(arm);
    }
    millGrp.add(base, tower, sails);
    group.add(millGrp);
    updaters.push((t) => {
      sails.rotation.z = -t * 1.35;
    });
  }

  if (activeProps.has('pet-corgi')) {
    const corgiGrp = new THREE.Group();
    corgiGrp.name = 'decor-prop-pet-corgi';
    const body = sphere(0.24, 10, '#EA580C', { rough: 0.8, flat: false });
    body.scale.set(1.55, 0.82, 0.85);
    body.position.y = 0.28;
    const chest = sphere(0.18, 10, '#FFFBEB', { rough: 0.82, flat: false });
    chest.position.set(0.24, 0.28, 0);
    const head = sphere(0.19, 10, '#EA580C', { rough: 0.8, flat: false });
    head.position.set(0.34, 0.46, 0);
    const earL = pyramid(0.1, 0.14, 0.08, '#C2410C');
    earL.position.set(0.32, 0.64, 0.1);
    const earR = pyramid(0.1, 0.14, 0.08, '#C2410C');
    earR.position.set(0.32, 0.64, -0.1);
    corgiGrp.add(body, chest, head, earL, earR);
    const startX = -4.2;
    const startZ = 7.4;
    corgiGrp.position.set(startX, Math.max(0.28, getTerrainHeight(startX, startZ, biome, worldShape)), startZ);
    group.add(corgiGrp);
    updaters.push((t) => {
      const ang = t * 0.95;
      const cx = -4.2 + Math.cos(ang) * 1.15;
      const cz = 7.4 + Math.sin(ang) * 0.95;
      const cy = Math.max(0.28, getTerrainHeight(cx, cz, biome, worldShape)) + Math.abs(Math.sin(t * 7.5)) * 0.09;
      corgiGrp.position.set(cx, cy, cz);
      corgiGrp.rotation.y = -ang - Math.PI * 0.5;
    });
  }

  return {
    group,
    update: (t) => updaters.forEach((fn) => fn(t)),
  };
}

export function buildRichTerrain(
  biome: BiomeId,
  theme: ThemeJson,
  foliage: FoliageSpot[],
  buildings: PlacedBuilding[],
  worldShape?: WorldShapeType,
  satellites?: SatelliteTheme[],
  decorProps?: DecorPropId[],
): BuiltTerrain {
  const resolvedShape = resolveWorldShape(biome, worldShape);
  const isB612Dome = resolvedShape === 'b612-highland';
  const hasCentralRiverBridge = resolvedShape === 'archipelago';
  const obstacleField = computeObstacleClearanceField({ buildings }, resolvedShape);
  const group = new THREE.Group();
  const random = rng(7401 + biome.charCodeAt(0));
  const swaying: { g: THREE.Group; phase: number }[] = [];

  const water = createLayeredWater(biome, theme, random, resolvedShape);
  if (isB612Dome || resolvedShape === 'canyon-mesa' || biome === 'desert' || biome === 'grassland') {
    const midW = water.group.getObjectByName('mid-water');
    const shalW = water.group.getObjectByName('shallows-water');
    if (midW) midW.visible = false;
    if (shalW) shalW.visible = false;
  }
  group.add(water.group);
  group.add(createSmoothVertexTerrain(biome, theme, resolvedShape));

  const macroLandforms = createBiomeMacroLandforms(biome, theme, resolvedShape, obstacleField);
  group.add(macroLandforms.group);

  const shapeFeatures = createWorldShapeFeatures(biome, theme, resolvedShape);
  group.add(shapeFeatures.group);

  const customDecor = createIslandDecorProps(biome, theme, resolvedShape, decorProps, obstacleField);
  group.add(customDecor.group);

  const satIslands = createSatelliteIslands(biome, theme, satellites);
  group.add(satIslands.group);
  group.add(createMicroScenery(biome, theme, resolvedShape, obstacleField));

  const flow = createRiverFlow(biome, theme);
  const bridge = createBridge(biome, theme);
  if (!hasCentralRiverBridge) {
    flow.group.visible = false;
    bridge.visible = false;
  }
  group.add(flow.group, bridge, createDock(theme));
  group.add(createContinuousRoads(biome, theme, buildings, resolvedShape));

  for (let i = 0; i < 16; i += 1) {
    const rawZ = -13.2 + random() * 26.5;
    const side = random() < 0.5 ? -1 : 1;
    const rawX = hasCentralRiverBridge
      ? riverX(rawZ) + side * (2.05 + random() * 0.55)
      : side * (7.5 + random() * 5.5);
    const nudged = obstacleField.nudgePoint(rawX, rawZ, 0.35);
    const x = nudged.x;
    const z = nudged.z;
    const rockY = getTerrainHeight(x, z, biome, resolvedShape);
    if (rockY < 0.15) continue;
    const rock = sphere(0.16 + random() * 0.18, 10, theme.terrain.groundSide, {
      rough: 0.92,
      flat: false,
    });
    rock.position.set(x, rockY - 0.03, z);
    rock.scale.y = 0.56;
    group.add(rock);
  }
  [
    [-5.2, -5.2],
    [2.4, -5.2],
    [-6.8, 5.8],
    [5.8, 6.2],
  ].forEach(([rawX, rawZ]) => {
    const nudged = obstacleField.nudgePoint(rawX, rawZ, 0.45);
    const x = nudged.x;
    const z = nudged.z;
    const lamp = streetLamp(theme.shared.accent, theme.shared.roof);
    lamp.name = 'street-lamp';
    lamp.position.set(x, Math.max(0.25, getTerrainHeight(x, z, biome, resolvedShape)), z);
    group.add(lamp);
  });
  foliage.forEach((f, i) => {
    const plant = makeFoliage(biome, theme, f);
    swaying.push({ g: plant, phase: random() * Math.PI * 2 + i * 0.1 });
    group.add(plant);
  });
  return {
    group,
    update: (t) => {
      water.update(t);
      flow.update(t);
      macroLandforms.update(t);
      shapeFeatures.update(t);
      customDecor.update(t);
      satIslands.update(t);
      swaying.forEach(({ g, phase }) => {
        g.rotation.z = Math.sin(t * 0.7 + phase) * 0.025;
        g.rotation.x = Math.cos(t * 0.52 + phase) * 0.012;
      });
    },
  };
}
