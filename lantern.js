// lantern.js
// Three different Vesak AR lanterns inspired by the uploaded neon thorana/lantern image.
// Works with your existing main.js: createLantern(qrText) and updateLantern(lantern, delta).
 
const PALETTES = {
  "vesak-lantern-1": {
    name: "Royal Pink Golden Mandala",
    base: 0xff2f8f,
    glow: 0xff7bc8,
    gold: 0xffc24a,
    green: 0x39ff14,
    orange: 0xff8a18,
    dark: 0x120617,
    white: 0xfff7d1
  },
  "vesak-lantern-2": {
    name: "Neon Green Temple Lotus",
    base: 0x22ff44,
    glow: 0x6dff00,
    gold: 0xffd36b,
    green: 0x00ff88,
    orange: 0xff9a21,
    dark: 0x03170f,
    white: 0xeaffd6
  },
  "vesak-lantern-3": {
    name: "Magenta Orange Festival Canopy",
    base: 0xff4bd8,
    glow: 0xff9cff,
    gold: 0xffb02e,
    green: 0x66ff00,
    orange: 0xff5b18,
    dark: 0x19020f,
    white: 0xfff0d8
  }
};
 
function mat(color, options = {}) {
  return new THREE.MeshPhongMaterial({
    color,
    emissive: options.emissive ?? color,
    emissiveIntensity: options.emissiveIntensity ?? 0.35,
    shininess: options.shininess ?? 80,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    side: options.side ?? THREE.DoubleSide
  });
}
 
function basic(color, opacity = 1) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: opacity >= 0.75
  });
}
 
function addMesh(parent, geometry, material, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1], name = "") {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.scale.set(...scale);
  mesh.name = name;
  parent.add(mesh);
  return mesh;
}
 
function addGlowPoint(parent, color, intensity, distance, position) {
  const light = new THREE.PointLight(color, intensity, distance);
  light.position.set(...position);
  parent.add(light);
  return light;
}
 
function addRing(parent, radius, tube, color, y, segments = 96) {
  return addMesh(
    parent,
    new THREE.TorusGeometry(radius, tube, 10, segments),
    basic(color, 0.92),
    [0, y, 0],
    [Math.PI / 2, 0, 0],
    [1, 1, 1],
    "glow-ring"
  );
}
 
function addDottedRing(parent, radius, y, color, count, beadSize = 0.025) {
  const group = new THREE.Group();
  group.name = "dotted-ring";
  const beadMat = basic(color, 0.95);
  const geo = new THREE.SphereGeometry(beadSize, 10, 10);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    addMesh(group, geo, beadMat, [Math.cos(a) * radius, y, Math.sin(a) * radius]);
  }
  parent.add(group);
  return group;
}
 
function addPetalFlower(parent, radius, y, color, petalCount = 12, petalLen = 0.12, petalWidth = 0.035) {
  const g = new THREE.Group();
  g.name = "lotus-flower";
  const petalMat = basic(color, 0.96);
  const centerMat = basic(0xffd36b, 0.98);
  for (let i = 0; i < petalCount; i++) {
    const a = (i / petalCount) * Math.PI * 2;
    const x = Math.cos(a) * radius;
    const z = Math.sin(a) * radius;
    const p = addMesh(
      g,
      new THREE.SphereGeometry(1, 12, 8),
      petalMat,
      [x, y, z],
      [0, 0, 0],
      [petalWidth, 0.014, petalLen],
      "flower-petal"
    );
    p.rotation.y = -a;
  }
  addMesh(g, new THREE.SphereGeometry(0.04, 16, 12), centerMat, [0, y, 0], [0, 0, 0], [1, 0.4, 1]);
  parent.add(g);
  return g;
}
 
function addCurlyLeaf(parent, y, color, count = 8, radius = 0.55) {
  const g = new THREE.Group();
  g.name = "curly-leaf-border";
  const leafMat = basic(color, 0.95);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const branch = new THREE.Group();
    branch.position.set(Math.cos(a) * radius, y, Math.sin(a) * radius);
    branch.rotation.y = -a;
    addMesh(branch, new THREE.SphereGeometry(1, 10, 8), leafMat, [0, 0, 0], [0, 0, 0.55], [0.035, 0.012, 0.11]);
    addMesh(branch, new THREE.SphereGeometry(1, 10, 8), leafMat, [0.055, 0.02, 0.08], [0.3, 0, -0.7], [0.026, 0.01, 0.075]);
    addMesh(branch, new THREE.SphereGeometry(1, 10, 8), leafMat, [-0.055, -0.005, 0.08], [-0.3, 0, 0.7], [0.026, 0.01, 0.075]);
    g.add(branch);
  }
  parent.add(g);
  return g;
}
 
function addHangingLantern(parent, x, z, topY, length, scale, p) {
  const g = new THREE.Group();
  g.name = "hanging-mini-lantern";
  g.position.set(x, topY, z);
 
  addMesh(g, new THREE.CylinderGeometry(0.007 * scale, 0.007 * scale, length, 8), basic(p.gold, 0.72), [0, -length / 2, 0]);
  addMesh(g, new THREE.CylinderGeometry(0.095 * scale, 0.12 * scale, 0.07 * scale, 32), mat(p.gold), [0, -length, 0]);
  addMesh(g, new THREE.SphereGeometry(0.105 * scale, 24, 12), mat(p.orange), [0, -length - 0.085 * scale, 0], [0, 0, 0], [1, 0.55, 1]);
  addRing(g, 0.11 * scale, 0.009 * scale, p.glow, -length - 0.08 * scale, 48);
  addMesh(g, new THREE.ConeGeometry(0.11 * scale, 0.16 * scale, 28), mat(p.gold), [0, -length - 0.20 * scale, 0], [Math.PI, 0, 0]);
  addMesh(g, new THREE.CylinderGeometry(0.014 * scale, 0.006 * scale, 0.16 * scale, 8), basic(p.gold, 0.9), [0, -length - 0.34 * scale, 0]);
 
  parent.add(g);
  return g;
}
 
function addUmbrellaCanopy(parent, y, radius, height, p, color1, color2, name = "umbrella-canopy") {
  const g = new THREE.Group();
  g.name = name;
  addMesh(g, new THREE.CylinderGeometry(radius * 0.58, radius, height, 64), mat(color1), [0, y, 0]);
  addMesh(g, new THREE.CylinderGeometry(radius * 0.38, radius * 0.62, height * 0.52, 64), mat(color2), [0, y + height * 0.38, 0]);
  addRing(g, radius, 0.015, p.gold, y - height * 0.5, 96);
  addRing(g, radius * 0.72, 0.011, p.glow, y + height * 0.04, 96);
  addDottedRing(g, radius * 0.89, y - height * 0.39, p.white, 42, 0.014);
  addDottedRing(g, radius * 0.49, y + height * 0.40, p.gold, 30, 0.012);
  parent.add(g);
  return g;
}
 
function addCentralTemple(parent, p, variant) {
  const g = new THREE.Group();
  g.name = "central-tiered-temple";
 
  addMesh(g, new THREE.CylinderGeometry(0.30, 0.34, 0.30, 6), mat(p.green), [0, 0.10, 0]);
  addRing(g, 0.36, 0.018, p.gold, 0.26);
  addDottedRing(g, 0.30, 0.28, p.glow, 30, 0.014);
 
  const pillarMat = mat(p.green);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    addMesh(g, new THREE.CylinderGeometry(0.018, 0.018, 0.46, 10), pillarMat, [Math.cos(a) * 0.25, 0.48, Math.sin(a) * 0.25]);
  }
 
  addUmbrellaCanopy(g, 0.78, 0.47, 0.22, p, p.gold, p.orange, "middle-gold-canopy");
  addUmbrellaCanopy(g, 1.05, 0.34, 0.18, p, variant === 2 ? p.green : p.base, p.gold, "upper-color-canopy");
  addUmbrellaCanopy(g, 1.28, 0.22, 0.14, p, p.gold, p.orange, "top-gold-canopy");
 
  addMesh(g, new THREE.CylinderGeometry(0.018, 0.018, 0.50, 14), mat(p.gold), [0, 1.55, 0]);
  addMesh(g, new THREE.SphereGeometry(0.055, 18, 14), mat(p.white), [0, 1.82, 0]);
 
  // Large green side leaves like the reference image.
  for (const side of [-1, 1]) {
    const leaf = addMesh(g, new THREE.SphereGeometry(1, 20, 10), basic(p.green, 0.72), [side * 0.48, 0.57, 0], [0.1, 0, side * 0.55], [0.06, 0.018, 0.44]);
    leaf.rotation.z = side * 0.8;
  }
 
  parent.add(g);
  return g;
}
 
function buildLanternOne(p) {
  const root = new THREE.Group();
  root.name = "lantern-1-royal-pink-gold";
 
  addGlowPoint(root, p.base, 1.8, 3.2, [0, 0.9, 0]);
  addGlowPoint(root, p.green, 1.3, 3.0, [0, 1.55, 0]);
 
  // Bottom stage like the uploaded image: pink circular base, dark ornamental bands, white dotted rim.
  addMesh(root, new THREE.CylinderGeometry(0.72, 0.88, 0.10, 72), mat(p.white), [0, -0.25, 0]);
  addDottedRing(root, 0.78, -0.18, p.dark, 52, 0.018);
  addUmbrellaCanopy(root, -0.02, 0.78, 0.18, p, p.base, p.glow, "large-pink-lotus-base");
  addRing(root, 0.70, 0.014, p.gold, 0.09);
  addDottedRing(root, 0.56, 0.10, p.dark, 38, 0.016);
  addDottedRing(root, 0.39, 0.13, p.gold, 28, 0.014);
 
  addCentralTemple(root, p, 1);
 
  // Top hanging thorana arch and mandala canopy.
  addRing(root, 0.88, 0.014, p.green, 1.62, 128);
  addRing(root, 0.68, 0.010, p.gold, 1.60, 96);
  addPetalFlower(root, 0.20, 1.72, p.gold, 18, 0.11, 0.032);
  addCurlyLeaf(root, 1.88, p.green, 12, 0.62);
  addDottedRing(root, 0.70, 1.96, p.green, 44, 0.014);
 
  // A ring of mini lanterns surrounding the center.
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const r = i % 2 === 0 ? 0.92 : 0.72;
    addHangingLantern(root, Math.cos(a) * r, Math.sin(a) * r, 1.38 + (i % 2) * 0.15, 0.28 + (i % 3) * 0.04, 0.72, p);
  }
 
  root.userData.spinSpeed = 0.23;
  root.userData.floatSpeed = 1.2;
  return root;
}
 
function buildLanternTwo(p) {
  const root = new THREE.Group();
  root.name = "lantern-2-neon-green-temple";
 
  addGlowPoint(root, p.green, 2.2, 3.5, [0, 0.9, 0]);
  addGlowPoint(root, p.gold, 1.2, 2.5, [0, 1.7, 0]);
 
  // Hexagonal digital platform.
  addMesh(root, new THREE.CylinderGeometry(0.70, 0.86, 0.12, 6), mat(p.green), [0, -0.22, 0]);
  addRing(root, 0.82, 0.012, p.gold, -0.14, 6);
  addDottedRing(root, 0.62, -0.11, p.white, 36, 0.014);
  addMesh(root, new THREE.CylinderGeometry(0.46, 0.62, 0.18, 8), mat(p.dark, { emissiveIntensity: 0.1 }), [0, -0.02, 0]);
  addDottedRing(root, 0.48, 0.08, p.green, 32, 0.018);
 
  addCentralTemple(root, p, 2);
 
  // Lotus mandala saucers on top, very close to the reference ceiling pattern.
  addUmbrellaCanopy(root, 1.58, 0.74, 0.12, p, p.green, p.gold, "green-wide-top-canopy");
  addPetalFlower(root, 0.27, 1.70, p.gold, 24, 0.13, 0.028);
  addPetalFlower(root, 0.44, 1.78, p.green, 30, 0.09, 0.020);
  addCurlyLeaf(root, 1.92, p.green, 16, 0.70);
  addDottedRing(root, 0.88, 2.02, p.green, 50, 0.013);
 
  // Four strong side floral wheels.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const flower = addPetalFlower(root, 0.10, 1.30, p.green, 14, 0.08, 0.025);
    flower.position.x = Math.cos(a) * 0.72;
    flower.position.z = Math.sin(a) * 0.72;
    flower.rotation.y = -a;
  }
 
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    const r = 0.90 + (i % 2) * 0.18;
    addHangingLantern(root, Math.cos(a) * r, Math.sin(a) * r, 1.48, 0.22 + (i % 4) * 0.04, 0.58, p);
  }
 
  root.userData.spinSpeed = -0.18;
  root.userData.floatSpeed = 1.35;
  return root;
}
 
function buildLanternThree(p) {
  const root = new THREE.Group();
  root.name = "lantern-3-magenta-orange-festival";
 
  addGlowPoint(root, p.base, 1.8, 3.2, [0, 0.8, 0]);
  addGlowPoint(root, p.orange, 1.4, 3.0, [0, 1.45, 0]);
 
  // Tall pagoda base with magenta and orange neon layers.
  addMesh(root, new THREE.CylinderGeometry(0.50, 0.74, 0.12, 10), mat(p.gold), [0, -0.25, 0]);
  addDottedRing(root, 0.63, -0.18, p.white, 40, 0.015);
  addUmbrellaCanopy(root, -0.04, 0.70, 0.16, p, p.base, p.orange, "magenta-orange-base");
  addMesh(root, new THREE.CylinderGeometry(0.22, 0.26, 0.46, 18), mat(p.base), [0, 0.24, 0]);
  addDottedRing(root, 0.24, 0.44, p.gold, 22, 0.013);
 
  addCentralTemple(root, p, 3);
 
  // Large umbrella canopy with many hanging lights.
  addUmbrellaCanopy(root, 1.52, 0.86, 0.15, p, p.base, p.gold, "wide-magenta-top-canopy");
  addRing(root, 0.98, 0.012, p.orange, 1.45, 128);
  addPetalFlower(root, 0.22, 1.70, p.gold, 20, 0.13, 0.032);
  addPetalFlower(root, 0.50, 1.82, p.base, 28, 0.09, 0.022);
 
  // Curved ornamental side fans.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const fan = new THREE.Group();
    fan.position.set(Math.cos(a) * 0.74, 1.28, Math.sin(a) * 0.74);
    fan.rotation.y = -a;
    for (let j = 0; j < 5; j++) {
      const arc = addMesh(fan, new THREE.TorusGeometry(0.11 + j * 0.035, 0.006, 8, 36, Math.PI), basic(j % 2 ? p.gold : p.base, 0.95), [0, j * 0.012, 0], [Math.PI / 2, 0, 0]);
      arc.rotation.z = Math.PI;
    }
    root.add(fan);
  }
 
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const r = i % 3 === 0 ? 1.05 : 0.82;
    addHangingLantern(root, Math.cos(a) * r, Math.sin(a) * r, 1.42 + (i % 2) * 0.12, 0.25 + (i % 5) * 0.028, 0.54, p);
  }
 
  addCurlyLeaf(root, 1.98, p.green, 14, 0.76);
  addDottedRing(root, 0.92, 2.08, p.gold, 56, 0.012);
 
  root.userData.spinSpeed = 0.28;
  root.userData.floatSpeed = 1.1;
  return root;
}
 
export function createLantern(qrText = "vesak-lantern-1") {
  const key = PALETTES[qrText] ? qrText : "vesak-lantern-1";
  const p = PALETTES[key];
 
  const root = new THREE.Group();
  root.name = `vesak-ar-${key}`;
  root.userData.time = 0;
 
  // Invisible black backing disc helps bright neon shapes look closer to the uploaded image.
  const backing = addMesh(
    root,
    new THREE.CylinderGeometry(1.18, 1.18, 0.015, 80),
    basic(0x000000, 0.18),
    [0, 0.75, -0.03],
    [Math.PI / 2, 0, 0],
    [1, 1, 1],
    "soft-dark-backdrop"
  );
  backing.renderOrder = -1;
 
  let lantern;
  if (key === "vesak-lantern-2") lantern = buildLanternTwo(p);
  else if (key === "vesak-lantern-3") lantern = buildLanternThree(p);
  else lantern = buildLanternOne(p);
 
  root.add(lantern);
  root.userData.core = lantern;
  root.userData.spinSpeed = lantern.userData.spinSpeed;
  root.userData.floatSpeed = lantern.userData.floatSpeed;
 
  // Resize to fit your current main.js scale. Do not change main.js.
  root.scale.set(0.95, 0.95, 0.95);
  return root;
}
 
export function updateLantern(lantern, delta = 0.016) {
  if (!lantern) return;
  lantern.userData.time = (lantern.userData.time || 0) + delta;
  const t = lantern.userData.time;
 
  const core = lantern.userData.core || lantern;
  const spin = lantern.userData.spinSpeed ?? 0.22;
  core.rotation.y += delta * spin;
  core.position.y = Math.sin(t * (lantern.userData.floatSpeed || 1.2)) * 0.035;
 
  lantern.traverse((obj) => {
    if (obj.name === "glow-ring" || obj.name === "dotted-ring" || obj.name === "lotus-flower") {
      obj.rotation.y += delta * 0.35;
    }
    if (obj.name === "hanging-mini-lantern") {
      obj.rotation.z = Math.sin(t * 1.7 + obj.position.x * 3.0) * 0.045;
    }
    if (obj.material && obj.material.emissiveIntensity !== undefined) {
      obj.material.emissiveIntensity = 0.32 + Math.sin(t * 2.2) * 0.08;
    }
  });
}
