// ============================================================================
//  Vesak Kūdu — SLIIT reference inspired rotating lantern
//  3 part rotation update:
//  1st part  -> right rotate
//  2nd part  -> left rotate
//  3rd part  -> right rotate
// ============================================================================

const _texCache = new Map();

export function createLantern(type = "vesak-lantern-1") {
  const palettes = {
    "vesak-lantern-1": {
      pink: 0xff4fa3,
      green: 0x54ff65,
      gold: 0xffd36b,
      orange: 0xff8c1a,
      glow: 0xfff1aa
    },
    "vesak-lantern-2": {
      pink: 0xff2e8a,
      green: 0x40ffb0,
      gold: 0xffc94a,
      orange: 0xff7a18,
      glow: 0xffd48a
    },
    "vesak-lantern-3": {
      pink: 0xff5fd7,
      green: 0x74ff4d,
      gold: 0xffef7a,
      orange: 0xff9b2f,
      glow: 0xffffaa
    }
  };

  const c = palettes[type] || palettes["vesak-lantern-1"];

  const lantern = new THREE.Group();

  const topGroup = new THREE.Group();
  const middleGroup = new THREE.Group();
  const bottomGroup = new THREE.Group();

  lantern.add(topGroup);
  lantern.add(middleGroup);
  lantern.add(bottomGroup);

  lantern.userData = {
    time: 0,
    topGroup,
    middleGroup,
    bottomGroup,
    lights: [],
    animated: []
  };

  const U = lantern.userData;

  const mat = (color) =>
    new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide
    });

  const glowMat = (color, opacity = 0.25) =>
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });

  function addRing(parent, y, radius, tube, color) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube, 10, 64),
      mat(color)
    );

    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;

    parent.add(ring);
  }

  // =========================================================================
  // PART 3 - BOTTOM PART - RIGHT ROTATE
  // =========================================================================

  const baseDisk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 1.05, 0.3, 12),
    mat(c.pink)
  );

  baseDisk.position.y = -3.2;
  bottomGroup.add(baseDisk);

  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.6, 0.8, 10),
    mat(c.pink)
  );

  pedestal.position.y = -2.7;
  bottomGroup.add(pedestal);

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.22, 1.3, 10),
    mat(c.green)
  );

  stem.position.y = -1.6;
  bottomGroup.add(stem);

  addRing(bottomGroup, -3.0, 1.0, 0.03, c.gold);
  addRing(bottomGroup, -2.3, 0.58, 0.025, c.gold);

  // =========================================================================
  // PART 2 - MIDDLE PART - LEFT ROTATE
  // =========================================================================

  const middlePlate = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 0.82, 0.28, 12),
    mat(c.gold)
  );

  middlePlate.position.y = -0.8;
  middleGroup.add(middlePlate);

  const topCone = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 0.65, 2.3, 8, 1, true),
    mat(c.gold)
  );

  topCone.position.y = 1.1;
  middleGroup.add(topCone);

  addRing(middleGroup, -0.8, 0.82, 0.03, c.green);
  addRing(middleGroup, 0.0, 0.9, 0.03, c.green);
  addRing(middleGroup, 1.7, 1.2, 0.03, c.pink);

  // =========================================================================
  // PART 1 - TOP PART - RIGHT ROTATE
  // =========================================================================

  const upperCap = new THREE.Mesh(
    new THREE.CylinderGeometry(1.9, 1.65, 0.5, 8),
    mat(c.green)
  );

  upperCap.position.y = 2.45;
  topGroup.add(upperCap);

  addRing(topGroup, 2.5, 1.9, 0.04, c.green);

  // =========================================================================
  // TOP DECORATION PANELS
  // =========================================================================

  function createPanel(angle, y, radius, color) {
    const group = new THREE.Group();

    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.75, 1.0),
      mat(color)
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

    topGroup.add(group);

    U.animated.push({
      mesh: group,
      phase: angle
    });
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

  function createMiniLantern(parent, angle, radius, y) {
    const g = new THREE.Group();

    const line = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.01, 0.6, 6),
      mat(c.gold)
    );

    line.position.y = -0.3;
    g.add(line);

    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 12, 12),
      mat(c.orange)
    );

    body.position.y = -0.68;
    body.scale.y = 1.2;
    g.add(body);

    const bottom = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.18, 8),
      mat(c.pink)
    );

    bottom.position.y = -0.9;
    g.add(bottom);

    g.position.set(
      Math.sin(angle) * radius,
      y,
      Math.cos(angle) * radius
    );

    parent.add(g);

    U.animated.push({
      mesh: g,
      phase: angle * 2
    });
  }

  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2;
    createMiniLantern(middleGroup, angle, 2.2, 1.0);
  }

  for (let i = 0; i < 18; i++) {
    const angle = (i / 18) * Math.PI * 2;
    createMiniLantern(bottomGroup, angle, 1.55, -0.3);
  }

  // =========================================================================
  // GREEN LEAF DECORATIONS
  // =========================================================================

  function createLeaf(angle) {
    const g = new THREE.Group();

    const line = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.01, 0.55, 5),
      mat(c.green)
    );

    line.position.y = -0.28;
    g.add(line);

    const leaf = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.28, 6),
      mat(c.green)
    );

    leaf.position.y = -0.58;
    leaf.rotation.z = Math.PI;
    g.add(leaf);

    g.position.set(
      Math.sin(angle) * 0.75,
      -1.0,
      Math.cos(angle) * 0.75
    );

    bottomGroup.add(g);

    U.animated.push({
      mesh: g,
      phase: angle
    });
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
  middleGroup.add(centerGlow);

  // =========================================================================
  // LIGHTS
  // =========================================================================

  const light1 = new THREE.PointLight(c.gold, 2, 10);
  light1.position.set(0, 1, 0);

  const light2 = new THREE.PointLight(c.pink, 1.2, 8);
  light2.position.set(0, -2, 0);

  const light3 = new THREE.PointLight(c.green, 1.2, 8);
  light3.position.set(0, 3, 0);

  lantern.add(light1);
  lantern.add(light2);
  lantern.add(light3);

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
  // 3 PART ROTATION
  // =========================================================================

  if (U.topGroup) {
    U.topGroup.rotation.y += delta * 0.75;
  }

  if (U.middleGroup) {
    U.middleGroup.rotation.y -= delta * 0.65;
  }

  if (U.bottomGroup) {
    U.bottomGroup.rotation.y += delta * 0.75;
  }

  // =========================================================================
  // FLOATING EFFECT
  // =========================================================================

  lantern.position.y =
    0.5 + Math.sin(t * 1.2) * 0.04;

  lantern.rotation.z =
    Math.sin(t * 0.9) * 0.02;

  lantern.rotation.x =
    Math.cos(t * 0.7) * 0.015;

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
    Math.sin(t * 21) * 0.04;

  U.lights.forEach((light, i) => {
    light.intensity = (i === 0 ? 2 : 1.2) * flicker;
  });
}