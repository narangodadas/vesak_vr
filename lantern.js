// lantern.js
// Redesigned Vesak AR lantern set: 3 different neon temple/thorana lanterns.
// Replace your existing lantern.js with this file.
// Compatible with current main.js imports: createLantern(qrText), updateLantern(lantern, delta)
 
const LANTERN_STYLES = {
  "vesak-lantern-1": {
    name: "Image Style - Pink Gold Green Thorana Lantern",
    dark: 0x030303,
    canopy: 0x141414,
    primary: 0xff2f9a,
    secondary: 0x39ff14,
    gold: 0xffb33a,
    orange: 0xff7a18,
    white: 0xfff6d5,
    accent: 0xff5fc8,
    scale: 1.0,
    canopyRadius: 1.52,
    baseRadius: 1.16,
    pendantCount: 24,
    motifCount: 6,
    panelPetals: 9
  },
  "vesak-lantern-2": {
    name: "Neon Green Lotus Pagoda Lantern",
    dark: 0x000804,
    canopy: 0x06120b,
    primary: 0x41ff19,
    secondary: 0xff40c8,
    gold: 0xffd15c,
    orange: 0xff9b28,
    white: 0xedffd9,
    accent: 0x00ffaa,
    scale: 0.96,
    canopyRadius: 1.42,
    baseRadius: 1.05,
    pendantCount: 30,
    motifCount: 8,
    panelPetals: 12
  },
  "vesak-lantern-3": {
    name: "Royal Orange Magenta Mandala Lantern",
    dark: 0x0b0202,
    canopy: 0x180707,
    primary: 0xff8b18,
    secondary: 0x32ff00,
    gold: 0xffcc55,
    orange: 0xff4218,
    white: 0xfff0d0,
    accent: 0xff3bd8,
    scale: 1.03,
    canopyRadius: 1.48,
    baseRadius: 1.22,
    pendantCount: 20,
    motifCount: 6,
    panelPetals: 10
  }
};
 
function material(color, opts = {}) {
  return new THREE.MeshPhongMaterial({
    color,
    emissive: opts.emissive ?? color,
    emissiveIntensity: opts.emissiveIntensity ?? 0.28,
    shininess: opts.shininess ?? 90,
    transparent: opts.opacity !== undefined && opts.opacity < 1,
    opacity: opts.opacity ?? 1,
    side: THREE.DoubleSide
  });
}
 
function glowMaterial(color, opacity = 1) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: opacity > 0.7
  });
}
 
function mesh(parent, geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], scl = [1, 1, 1], name = "") {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(pos[0], pos[1], pos[2]);
  m.rotation.set(rot[0], rot[1], rot[2]);
  m.scale.set(scl[0], scl[1], scl[2]);
  m.name = name;
  parent.add(m);
  return m;
}
 
function makeTorus(parent, r, tube, color, y, opacity = 0.95, name = "ring") {
  return mesh(
    parent,
    new THREE.TorusGeometry(r, tube, 10, 120),
    glowMaterial(color, opacity),
    [0, y, 0],
    [Math.PI / 2, 0, 0],
    [1, 1, 1],
    name
  );
}
 
function makeCylinder(parent, r1, r2, h, color, y, segments = 96, name = "cylinder") {
  return mesh(
    parent,
    new THREE.CylinderGeometry(r1, r2, h, segments),
    material(color, { emissiveIntensity: 0.22 }),
    [0, y, 0],
    [0, 0, 0],
    [1, 1, 1],
    name
  );
}
 
function makeDottedRing(parent, radius, y, color, count, size = 0.024, phase = 0) {
  const g = new THREE.Group();
  g.name = "dotted-ring animated-slow";
  const geo = new THREE.SphereGeometry(size, 10, 8);
  const mat = glowMaterial(color, 0.96);
  for (let i = 0; i < count; i++) {
    const a = phase + (i / count) * Math.PI * 2;
    mesh(g, geo, mat, [Math.cos(a) * radius, y, Math.sin(a) * radius]);
  }
  parent.add(g);
  return g;
}
 
function makeLotusFlower(parent, radius, y, color, centerColor, count = 12, size = 1, name = "lotus") {
  const g = new THREE.Group();
  g.name = name + " animated-flower";
  const petalMat = glowMaterial(color, 0.96);
  const petalGeo = new THREE.SphereGeometry(1, 16, 8);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const p = mesh(
      g,
      petalGeo,
      petalMat,
      [Math.cos(a) * radius, y, Math.sin(a) * radius],
      [0, -a, 0],
      [0.035 * size, 0.012 * size, 0.115 * size],
      "lotus-petal"
    );
    p.rotation.y = -a;
  }
  mesh(g, new THREE.SphereGeometry(0.042 * size, 18, 10), glowMaterial(centerColor), [0, y, 0], [0, 0, 0], [1, 0.35, 1], "lotus-center");
  parent.add(g);
  return g;
}
 
function makePanelMotif(parent, angle, cfg, y, r, scale = 1) {
  const g = new THREE.Group();
  g.name = "green-panel-vine animated-panel";
  g.position.set(Math.cos(angle) * r, y, Math.sin(angle) * r);
  g.lookAt(0, y, 0);
 
  const green = glowMaterial(cfg.secondary, 0.97);
  const gold = glowMaterial(cfg.gold, 0.92);
  const torusGeo = new THREE.TorusGeometry(0.075 * scale, 0.008 * scale, 8, 40);
  const leafGeo = new THREE.SphereGeometry(1, 16, 8);
 
  // central mandala circle
  mesh(g, torusGeo, green, [0, 0.03 * scale, 0], [0, 0, 0], [1, 1, 1], "panel-circle");
  mesh(g, new THREE.TorusGeometry(0.13 * scale, 0.007 * scale, 8, 48), green, [0, -0.07 * scale, 0], [0, 0, 0], [1, 1, 1], "panel-circle-large");
 
  // vine curl petals
  for (let i = -2; i <= 2; i++) {
    const x = i * 0.055 * scale;
    const yy = -Math.abs(i) * 0.026 * scale;
    mesh(g, leafGeo, green, [x, yy, 0], [0, 0, i * 0.5], [0.022 * scale, 0.07 * scale, 0.012 * scale], "vine-leaf");
  }
  for (let i = 0; i < cfg.panelPetals; i++) {
    const a = (i / cfg.panelPetals) * Math.PI * 2;
    mesh(g, leafGeo, green, [Math.cos(a) * 0.17 * scale, -0.17 * scale + Math.sin(a) * 0.055 * scale, 0], [0, 0, a], [0.018 * scale, 0.052 * scale, 0.01 * scale], "tiny-petal");
  }
  mesh(g, new THREE.SphereGeometry(0.022 * scale, 10, 8), gold, [0, -0.17 * scale, 0.005], [0, 0, 0], [1, 1, 1], "gold-dot");
  parent.add(g);
  return g;
}
 
function makeMandalaBand(parent, cfg, y, radius, flowers, colorA, colorB) {
  const band = new THREE.Group();
  band.name = "mandala-band animated-slow";
  for (let i = 0; i < flowers; i++) {
    const a = (i / flowers) * Math.PI * 2;
    const f = makeLotusFlower(band, 0.07, 0, i % 2 ? colorA : colorB, cfg.gold, 10, 0.72, "small-mandala");
    f.position.set(Math.cos(a) * radius, y, Math.sin(a) * radius);
    f.rotation.y = -a;
  }
  parent.add(band);
  return band;
}
 
function makeArch(parent, cfg, y, radius, color, count = 8, drop = 0.42) {
  const g = new THREE.Group();
  g.name = "hanging-arches animated-breathe";
  const mat = glowMaterial(color, 0.92);
  for (let i = 0; i < count; i++) {
    const a1 = (i / count) * Math.PI * 2;
    const a2 = ((i + 1) / count) * Math.PI * 2;
    const mid = (a1 + a2) / 2;
    const points = [];
    for (let j = 0; j <= 18; j++) {
      const t = j / 18;
      const a = a1 + (a2 - a1) * t;
      const sag = Math.sin(t * Math.PI) * drop;
      points.push(new THREE.Vector3(Math.cos(a) * radius, y - sag, Math.sin(a) * radius));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    mesh(g, new THREE.TubeGeometry(curve, 40, 0.012, 8, false), mat, [0, 0, 0], [0, 0, 0], [1, 1, 1], "neon-arch");
 
    // golden mini lamp at middle of every arch
    makeMiniPendant(g, cfg, mid, radius * 0.98, y - drop - 0.18, 0.18 + (i % 3) * 0.05);
  }
  parent.add(g);
  return g;
}
 
function makeChain(parent, x, yTop, z, length, color, beads = 6) {
  const g = new THREE.Group();
  g.name = "chain";
  const geo = new THREE.SphereGeometry(0.018, 8, 6);
  const mat = glowMaterial(color, 0.96);
  for (let i = 0; i < beads; i++) {
    const yy = yTop - (i / Math.max(1, beads - 1)) * length;
    mesh(g, geo, mat, [x, yy, z]);
  }
  parent.add(g);
  return g;
}
 
function makeMiniPendant(parent, cfg, angle, radius, y, length = 0.22) {
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  const p = new THREE.Group();
  p.name = "mini-hanging-lantern animated-pendant";
  p.position.set(x, y, z);
  p.rotation.y = -angle;
 
  makeChain(parent, x, y + length, z, length, cfg.gold, 5);
  mesh(p, new THREE.ConeGeometry(0.075, 0.065, 32), glowMaterial(cfg.gold), [0, 0.06, 0], [Math.PI, 0, 0], [1, 1, 1], "mini-top");
  makeTorus(p, 0.075, 0.008, cfg.gold, 0.02, 0.95, "mini-ring");
  makeCylinder(p, 0.055, 0.085, 0.08, cfg.primary, -0.02, 32, "mini-body");
  makeTorus(p, 0.06, 0.007, cfg.secondary, -0.065, 0.95, "mini-green-ring");
  mesh(p, new THREE.SphereGeometry(0.022, 12, 8), glowMaterial(cfg.white), [0, -0.11, 0], [0, 0, 0], [1, 1.4, 1], "mini-light");
  parent.add(p);
  return p;
}
 
function makeCentralPagoda(parent, cfg) {
  const core = new THREE.Group();
  core.name = "central-pagoda animated-core";
 
  // glowing green column like the uploaded image center
  makeCylinder(core, 0.16, 0.20, 0.62, cfg.secondary, 0.32, 64, "green-column");
  makeTorus(core, 0.23, 0.014, cfg.gold, 0.02, 0.96, "gold-waist");
  makeTorus(core, 0.28, 0.014, cfg.secondary, 0.26, 0.96, "green-waist");
 
  // stacked umbrella / pagoda rings
  makeCylinder(core, 0.38, 0.46, 0.12, cfg.gold, 0.72, 96, "pagoda-layer-1");
  makeTorus(core, 0.47, 0.018, cfg.primary, 0.79, 0.96, "pink-ring-1");
  makeCylinder(core, 0.30, 0.38, 0.10, cfg.gold, 0.91, 96, "pagoda-layer-2");
  makeTorus(core, 0.39, 0.016, cfg.secondary, 0.97, 0.96, "green-ring-2");
  makeCylinder(core, 0.22, 0.30, 0.095, cfg.gold, 1.08, 80, "pagoda-layer-3");
  makeTorus(core, 0.30, 0.014, cfg.primary, 1.14, 0.96, "pink-ring-3");
  mesh(core, new THREE.ConeGeometry(0.20, 0.32, 80), material(cfg.gold), [0, 1.33, 0], [0, 0, 0], [1, 1, 1], "pagoda-spire");
 
  // large side neon green leaves/flames
  const leafGeo = new THREE.SphereGeometry(1, 20, 10);
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 4; i++) {
      const leaf = mesh(
        core,
        leafGeo,
        glowMaterial(cfg.secondary, 0.92),
        [side * (0.34 + i * 0.055), 0.43 + i * 0.06, 0.02 * i],
        [0.25, 0.05 * side, side * (0.75 - i * 0.12)],
        [0.035, 0.20 - i * 0.016, 0.018],
        "side-leaf-flame"
      );
      leaf.name += " animated-leaf";
    }
  }
 
  // center flower disk
  const flower = makeLotusFlower(core, 0.15, 1.03, cfg.primary, cfg.gold, 16, 0.95, "front-lotus-disk");
  flower.position.z = 0.33;
  flower.rotation.x = Math.PI / 2;
 
  parent.add(core);
  return core;
}
 
function makeBase(parent, cfg) {
  const base = new THREE.Group();
  base.name = "bottom-base animated-breathe";
 
  makeCylinder(base, cfg.baseRadius * 0.88, cfg.baseRadius, 0.12, cfg.primary, -0.30, 120, "wide-pink-platform");
  makeTorus(base, cfg.baseRadius, 0.026, cfg.primary, -0.23, 0.96, "outer-pink-glow");
  makeTorus(base, cfg.baseRadius * 0.74, 0.018, cfg.gold, -0.15, 0.95, "gold-base-ring");
  makeCylinder(base, cfg.baseRadius * 0.42, cfg.baseRadius * 0.56, 0.18, cfg.primary, -0.02, 96, "pedestal-neck");
  makeTorus(base, cfg.baseRadius * 0.48, 0.018, cfg.secondary, 0.08, 0.96, "green-neck-ring");
  makeDottedRing(base, cfg.baseRadius * 0.9, -0.22, cfg.gold, 44, 0.018, 0.1);
  makeDottedRing(base, cfg.baseRadius * 0.64, -0.13, cfg.white, 36, 0.014, 0.3);
 
  // white/black final ornamental strip similar to photo bottom ring
  makeCylinder(base, cfg.baseRadius * 0.92, cfg.baseRadius * 0.98, 0.055, cfg.white, -0.43, 96, "white-bottom-strip");
  makeDottedRing(base, cfg.baseRadius * 0.90, -0.40, cfg.dark, 52, 0.014, 0.0);
 
  parent.add(base);
  return base;
}
 
function makeTopCanopy(parent, cfg) {
  const top = new THREE.Group();
  top.name = "large-hexagonal-canopy animated-canopy";
 
  // Main black hexagonal / polygon dome
  mesh(
    top,
    new THREE.CylinderGeometry(cfg.canopyRadius * 0.70, cfg.canopyRadius, 0.42, 6),
    material(cfg.canopy, { emissive: cfg.dark, emissiveIntensity: 0.08, shininess: 35 }),
    [0, 1.88, 0],
    [0, Math.PI / 6, 0],
    [1, 1, 1],
    "black-hexagonal-dome"
  );
 
  makeTorus(top, cfg.canopyRadius * 0.98, 0.018, cfg.secondary, 1.66, 0.95, "lower-green-canopy-edge");
  makeTorus(top, cfg.canopyRadius * 0.73, 0.018, cfg.gold, 2.09, 0.95, "upper-gold-canopy-edge");
  makeDottedRing(top, cfg.canopyRadius * 0.98, 1.68, cfg.secondary, 60, 0.018, 0.0);
  makeDottedRing(top, cfg.canopyRadius * 0.76, 2.12, cfg.secondary, 42, 0.017, 0.12);
 
  // large green panel motifs on every hexagon face
  for (let i = 0; i < cfg.motifCount; i++) {
    const a = (i / cfg.motifCount) * Math.PI * 2 + Math.PI / cfg.motifCount;
    makePanelMotif(top, a, cfg, 1.94, cfg.canopyRadius * 0.76, i % 2 ? 0.9 : 1.05);
  }
 
  // mandala flowers wrapped around underside
  makeMandalaBand(top, cfg, 1.51, cfg.canopyRadius * 0.78, 18, cfg.secondary, cfg.gold);
  makeMandalaBand(top, cfg, 1.36, cfg.canopyRadius * 0.58, 14, cfg.secondary, cfg.primary);
 
  // front big gold mandalas similar to uploaded chandelier circles
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const f = makeLotusFlower(top, 0.13, 0, cfg.gold, cfg.orange, 18, 0.9, "large-gold-mandala");
    f.position.set(Math.cos(a) * (cfg.canopyRadius * 0.66), 1.47, Math.sin(a) * (cfg.canopyRadius * 0.66));
    f.rotation.x = Math.PI / 2;
    f.rotation.z = a;
  }
 
  parent.add(top);
  return top;
}
 
function makeMiddleDecoration(parent, cfg) {
  const mid = new THREE.Group();
  mid.name = "middle-hanging-zone";
 
  makeArch(mid, cfg, 1.44, cfg.canopyRadius * 0.88, cfg.gold, 8, 0.36);
  makeArch(mid, cfg, 1.24, cfg.canopyRadius * 0.66, cfg.primary, 10, 0.30);
  makeArch(mid, cfg, 1.08, cfg.canopyRadius * 0.48, cfg.gold, 8, 0.24);
 
  makeTorus(mid, 0.92, 0.018, cfg.primary, 1.12, 0.96, "pink-middle-belt");
  makeTorus(mid, 0.72, 0.014, cfg.gold, 0.96, 0.96, "gold-middle-belt");
  makeTorus(mid, 0.58, 0.014, cfg.secondary, 0.84, 0.96, "green-middle-belt");
 
  makeMandalaBand(mid, cfg, 0.92, 0.76, 16, cfg.primary, cfg.gold);
  makeMandalaBand(mid, cfg, 0.76, 0.56, 12, cfg.secondary, cfg.gold);
 
  // dense outer hanging lantern chains like the image
  for (let i = 0; i < cfg.pendantCount; i++) {
    const a = (i / cfg.pendantCount) * Math.PI * 2;
    const radius = cfg.canopyRadius * (i % 2 ? 0.92 : 0.78);
    const y = 1.02 - (i % 4) * 0.08;
    makeMiniPendant(mid, cfg, a, radius, y - 0.34, 0.30 + (i % 3) * 0.06);
  }
 
  parent.add(mid);
  return mid;
}
 
function buildLantern(cfg) {
  const root = new THREE.Group();
  root.name = cfg.name;
  root.userData.time = 0;
  root.userData.baseScale = cfg.scale;
 
  // invisible/soft light core for AR glow
  const light1 = new THREE.PointLight(cfg.primary, 0.9, 4.2);
  light1.position.set(0, 0.8, 0.3);
  root.add(light1);
  const light2 = new THREE.PointLight(cfg.secondary, 0.65, 3.4);
  light2.position.set(0, 1.6, -0.2);
  root.add(light2);
  const light3 = new THREE.PointLight(cfg.gold, 0.45, 3.2);
  light3.position.set(0, 0.25, 0);
  root.add(light3);
 
  makeBase(root, cfg);
  makeCentralPagoda(root, cfg);
  makeMiddleDecoration(root, cfg);
  makeTopCanopy(root, cfg);
 
  // hologram outer glow rings
  makeTorus(root, cfg.canopyRadius * 1.05, 0.009, cfg.secondary, 1.78, 0.42, "transparent-hologram-ring animated-slow");
  makeTorus(root, cfg.baseRadius * 1.05, 0.009, cfg.primary, -0.18, 0.42, "transparent-hologram-ring animated-slow");
 
  root.scale.setScalar(cfg.scale);
  return root;
}
 
export function createLantern(qrText = "vesak-lantern-1") {
  const cfg = LANTERN_STYLES[qrText] || LANTERN_STYLES["vesak-lantern-1"];
  return buildLantern(cfg);
}
 
export function updateLantern(lantern, delta = 0.016) {
  if (!lantern) return;
  lantern.userData.time = (lantern.userData.time || 0) + delta;
  const t = lantern.userData.time;
  const baseScale = lantern.userData.baseScale || 1;
 
  // slow premium AR float and rotation
  lantern.rotation.y += delta * 0.28;
  lantern.position.y += Math.sin(t * 1.25) * 0.0009;
  const pulse = 1 + Math.sin(t * 2.1) * 0.012;
  lantern.scale.setScalar(baseScale * pulse);
 
  lantern.traverse((obj) => {
    if (!obj.name) return;
 
    if (obj.name.includes("animated-slow")) {
      obj.rotation.y += delta * 0.42;
    }
    if (obj.name.includes("animated-canopy")) {
      obj.rotation.y += delta * 0.10;
    }
    if (obj.name.includes("animated-core")) {
      obj.rotation.y -= delta * 0.18;
    }
    if (obj.name.includes("animated-flower")) {
      obj.rotation.z += delta * 0.22;
    }
    if (obj.name.includes("animated-pendant")) {
      obj.rotation.z = Math.sin(t * 2.6 + obj.position.x * 3.0) * 0.045;
      obj.position.y += Math.sin(t * 3.0 + obj.position.z * 2.0) * 0.0007;
    }
    if (obj.name.includes("animated-leaf")) {
      obj.scale.y *= 1 + Math.sin(t * 3.2 + obj.position.x * 4.0) * 0.0008;
    }
    if (obj.name.includes("animated-breathe")) {
      const s = 1 + Math.sin(t * 1.8) * 0.002;
      obj.scale.set(s, 1, s);
    }
    if (obj.name.includes("animated-panel")) {
      obj.scale.setScalar(1 + Math.sin(t * 2.4 + obj.position.x) * 0.012);
    }
  });
}
