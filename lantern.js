// ============================================================================
//  Vesak Kūdu — SLIIT reference inspired rotating lantern
//  Drop-in replacement lantern.js
// ============================================================================

const _texCache = new Map();

export function createLantern(type = "vesak-lantern-1") {

  const palettes = {
    "vesak-lantern-1": {
      pink: 0xff4fa3,
      green: 0x54ff65,
      gold: 0xffd36b,
      dark: 0x111111,
      line: 0x000000,
      glow: 0xfff1aa
    }
  };

  const c = palettes[type] || palettes["vesak-lantern-1"];

  const lantern = new THREE.Group();
  const core = new THREE.Group();

  lantern.add(core);

  lantern.userData = {
    time: 0,
    core,
    spinSpeed: 0.45,
    lights: [],
    animated: []
  };

  const U = lantern.userData;

  // =========================================================================
  // MATERIALS
  // =========================================================================

  const emissiveMat = (color, intensity = 1.2) =>
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: intensity,
      roughness: 0.45,
      metalness: 0.05,
      side: THREE.DoubleSide
    });

  const glowMat = (color, opacity = 0.3) =>
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });

  // =========================================================================
  // MAIN BASE
  // =========================================================================

  const baseDisk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 1.05, 0.3, 12),
    emissiveMat(c.pink, 1.5)
  );

  baseDisk.position.y = -3.2;
  core.add(baseDisk);

  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.6, 0.8, 10),
    emissiveMat(c.pink, 1.3)
  );

  pedestal.position.y = -2.7;
  core.add(pedestal);

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.22, 1.3, 10),
    emissiveMat(c.green, 1.4)
  );

  stem.position.y = -1.6;
  core.add(stem);

  const middlePlate = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 0.82, 0.28, 12),
    emissiveMat(c.gold, 1.5)
  );

  middlePlate.position.y = -0.8;
  core.add(middlePlate);

  // =========================================================================
  // TOP MAIN BODY
  // =========================================================================

  const topCone = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 0.65, 2.3, 8, 1, true),
    emissiveMat(c.gold, 1.4)
  );

  topCone.position.y = 1.1;
  core.add(topCone);

  const upperCap = new THREE.Mesh(
    new THREE.CylinderGeometry(1.9, 1.65, 0.5, 8),
    emissiveMat(c.green, 1.5)
  );

  upperCap.position.y = 2.45;
  core.add(upperCap);

  // =========================================================================
  // DECORATIVE RINGS
  // =========================================================================

  function addRing(y, radius, tube, color) {

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube, 10, 64),
      emissiveMat(color, 1.1)
    );

    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;

    core.add(ring);
  }

  addRing(-3.0, 1.0, 0.03, c.gold);
  addRing(-2.3, 0.58, 0.025, c.gold);
  addRing(-0.8, 0.82, 0.03, c.green);
  addRing(0.0, 0.9, 0.03, c.green);
  addRing(1.7, 1.2, 0.03, c.pink);
  addRing(2.5, 1.9, 0.04, c.green);

  // =========================================================================
  // TOP DECORATION PANELS
  // =========================================================================

  function createPanel(angle, y, radius, color) {

    const group = new THREE.Group();

    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.75, 1.0),
      emissiveMat(color, 1.6)
    );

    group.add(panel);

    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 1.15),
      glowMat(color, 0.18)
    );

    group.add(glow);

    group.position.set(
      Math.sin(angle) * radius,
      y,
      Math.cos(angle) * radius
    );

    group.lookAt(0, y, 0);

    core.add(group);

    U.animated.push(group);
  }

  for (let i = 0; i < 8; i++) {

    const a = (i / 8) * Math.PI * 2;

    createPanel(
      a,
      2.8,
      1.7,
      i % 2 === 0 ? c.green : c.gold
    );
  }

  // =========================================================================
  // SMALL HANGING LANTERNS
  // =========================================================================

  function createMiniLantern(angle, radius, y) {

    const g = new THREE.Group();

    const line = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.01, 0.6, 6),
      emissiveMat(c.gold, 0.8)
    );

    line.position.y = -0.3;
    g.add(line);

    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 12, 12),
      emissiveMat(c.gold, 1.7)
    );

    body.position.y = -0.68;
    body.scale.y = 1.2;

    g.add(body);

    const bottom = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.18, 8),
      emissiveMat(c.pink, 1.3)
    );

    bottom.position.y = -0.9;

    g.add(bottom);

    g.position.set(
      Math.sin(angle) * radius,
      y,
      Math.cos(angle) * radius
    );

    core.add(g);

    U.animated.push({
      mesh: g,
      phase: angle * 2
    });
  }

  for (let i = 0; i < 24; i++) {

    const angle = (i / 24) * Math.PI * 2;

    createMiniLantern(angle, 2.2, 1.0);
  }

  for (let i = 0; i < 18; i++) {

    const angle = (i / 18) * Math.PI * 2;

    createMiniLantern(angle, 1.55, -0.3);
  }

  // =========================================================================
  // GREEN LEAF DECORATIONS
  // =========================================================================

  function createLeaf(angle) {

    const g = new THREE.Group();

    const line = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.01, 0.55, 5),
      emissiveMat(c.green, 0.8)
    );

    line.position.y = -0.28;

    g.add(line);

    const leaf = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.28, 6),
      emissiveMat(c.green, 1.8)
    );

    leaf.position.y = -0.58;
    leaf.rotation.z = Math.PI;

    g.add(leaf);

    g.position.set(
      Math.sin(angle) * 0.75,
      -1.0,
      Math.cos(angle) * 0.75
    );

    core.add(g);

    U.animated.push(g);
  }

  for (let i = 0; i < 10; i++) {

    createLeaf((i / 10) * Math.PI * 2);
  }

  // =========================================================================
  // CENTER GLOW
  // =========================================================================

  const centerGlow = new THREE.Mesh(
    new THREE.SphereGeometry(1.7, 24, 24),
    glowMat(c.gold, 0.12)
  );

  centerGlow.position.y = 0.5;

  core.add(centerGlow);

  // =========================================================================
  // LIGHTS
  // =========================================================================

  const light1 = new THREE.PointLight(c.gold, 4, 14);
  light1.position.set(0, 1, 0);

  const light2 = new THREE.PointLight(c.pink, 2, 10);
  light2.position.set(0, -2, 0);

  const light3 = new THREE.PointLight(c.green, 2, 10);
  light3.position.set(0, 3, 0);

  core.add(light1);
  core.add(light2);
  core.add(light3);

  U.lights.push(light1, light2, light3);

  // =========================================================================
  // FINAL SCALE & POSITION
  // =========================================================================

  lantern.scale.setScalar(0.52);

  lantern.position.set(
    0,
    0.5,
    -3
  );

  return lantern;
}

// ============================================================================
// UPDATE ANIMATION
// ============================================================================

export function updateLantern(lantern, delta = 0.016) {

  if (!lantern) return;

  const U = lantern.userData;

  U.time += delta;

  const t = U.time;

  // =========================================================================
  // MAIN ROTATION
  // =========================================================================

  U.core.rotation.y += delta * U.spinSpeed;

  // =========================================================================
  // FLOATING EFFECT
  // =========================================================================

  lantern.position.y =
    0.5 + Math.sin(t * 1.2) * 0.06;

  lantern.rotation.z =
    Math.sin(t * 0.9) * 0.03;

  lantern.rotation.x =
    Math.cos(t * 0.7) * 0.02;

  // =========================================================================
  // HANGING SWING
  // =========================================================================

  U.animated.forEach((obj, i) => {

    const target = obj.mesh || obj;
    const phase = obj.phase || i;

    target.rotation.z =
      Math.sin(t * 1.7 + phase) * 0.08;

    target.rotation.x =
      Math.cos(t * 1.3 + phase) * 0.05;
  });

  // =========================================================================
  // LIGHT FLICKER
  // =========================================================================

  const flicker =
    0.9 +
    Math.sin(t * 12) * 0.08 +
    Math.sin(t * 21) * 0.04 +
    Math.random() * 0.03;

  U.lights.forEach((light, i) => {

    light.intensity =
      (i === 0 ? 4 : 2) * flicker;
  });
}