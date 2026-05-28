// ============================================================================
//  Vesak Kūdu — 3 different lantern styles + 3 part rotation + music mapping
// ============================================================================

const _texCache = new Map();

export const LANTERN_MUSIC_TRACKS = {
  "vesak-lantern-1": "assets/vesak-music.mp3",
  "vesak-lantern-2": "assets/vesak music3.mp3",
  "vesak-lantern-3": "assets/vesak music2.mp3",
  "vesak-lantern-4": "assets/vesak music2.mp3",
  "vesak-lantern-5": "assets/vesak music2.mp3"
};

export function getLanternMusicPath(type = "vesak-lantern-1") {
  return LANTERN_MUSIC_TRACKS[type] || LANTERN_MUSIC_TRACKS["vesak-lantern-1"];
}

export function createLantern(type = "vesak-lantern-1") {
  const colorSets = {
    "vesak-lantern-1": { 
      paper: 0xB8860B,   // dark goldenrod — body panels
      line: 0x4A2800,    // deep brown — outlines
      glow: 0xDAA520,    // goldenrod — glow/emissive
      trim: 0x6B3A0F,    // warm brown — crown petals, trim rings
      light: 0xFFD700    // gold — point lights & hanging balls
    },
    "vesak-lantern-2": { 
      paper: 0x0A1A4A,   // dark navy blue — body panels
      line: 0x050D2A,    // deep midnight blue — outlines
      glow: 0x1B3A7A,    // rich dark blue — glow/emissive
      trim: 0xE8EEF7,    // soft white — crown petals, trim rings
      light: 0xDDE8FF    // cool white-blue — point lights & hanging balls
    },
    "vesak-lantern-3": { 
      paper: 0x8B0000,   // dark red — body panels
      line: 0x4A0000,    // deep crimson — outlines
      glow: 0xB22222,    // firebrick red — glow/emissive
      trim: 0xF5F0F0,    // near white — crown petals, trim rings
      light: 0xFFEEEE    // warm white — point lights & hanging balls
    },
    "vesak-lantern-4": { paper: 0xffab12, line: 0x6e3500, glow: 0xffcf57, trim: 0xfff0a8, light: 0xffb84d },
    "vesak-lantern-5": { paper: 0xff2733, line: 0x5a0008, glow: 0xff5a52, trim: 0xffc27a, light: 0xff5742 }
  };

  const styleSets = {
    "vesak-lantern-1": {
      name: "temple-tower",
      sideCount: 12,
      topShape: "hex",
      bulbShape: "sphere",
      lowerTopRadius: 0.32,
      lowerBottomRadius: 0.9,
      upperTopRadius: 0.82,
      upperBottomRadius: 0.32,
      pavilionTopCount: 4,
      pavilionBottomCount: 5,
      miniRadiusTop: 1.15,
      miniRadiusBottom: 1.1,
      scaleY: 1
    },
    "vesak-lantern-2": {
      name: "diamond-star",
      sideCount: 10,
      topShape: "diamond",
      bulbShape: "diamond",
      lowerTopRadius: 0.2,
      lowerBottomRadius: 1.05,
      upperTopRadius: 1.05,
      upperBottomRadius: 0.2,
      pavilionTopCount: 6,
      pavilionBottomCount: 6,
      miniRadiusTop: 1.35,
      miniRadiusBottom: 1.25,
      scaleY: 1.08
    },
    "vesak-lantern-3": {
  name: "lotus-umbrella",
  sideCount: 16,            // smooth round column (more facets = rounder)
  topShape: "umbrella",
  bulbShape: "lotus",
  lowerTopRadius: 0.52,     // wide flat disc silhouette at base
  lowerBottomRadius: 0.95,
  upperTopRadius: 0.95,
  upperBottomRadius: 0.52,
  pavilionTopCount: 14,     // dense ring of hanging ornaments, top
  pavilionBottomCount: 16,  // dense ring of hanging ornaments, bottom
  miniRadiusTop: 1.6,       // wide spread — matches image's wide skirt
  miniRadiusBottom: 1.45,
  scaleY: 1.15              // slightly elongated — tall column
},
  };

  const keys = Object.keys(colorSets);
  const c = colorSets[type] || colorSets[keys[Math.abs(hashText(type)) % keys.length]];
  const style = styleSets[type] || styleSets["vesak-lantern-1"];
  const seed = Math.abs(hashText(type));

  const T = {
    mandala: patternTexture("mandala", c, 512),
    paisley: patternTexture("paisley", c, 512),
    wheel: patternTexture("wheel", c, 384),
    hatch: patternTexture("hatch", c, 256),
    ribs: patternTexture("ribs", c, 256),
    base: patternTexture("base", c, 512),
    hut: patternTexture("hut", c, 256)
  };

  const lantern = new THREE.Group();
  const core = new THREE.Group();
  lantern.add(core);

  const part1Top = new THREE.Group();
  const part2Middle = new THREE.Group();
  const part3Bottom = new THREE.Group();

  core.add(part3Bottom);
  core.add(part2Middle);
  core.add(part1Top);

  lantern.userData = {
    time: (seed % 1000) * 0.01,
    core,
    part1Top,
    part2Middle,
    part3Bottom,
    musicPath: getLanternMusicPath(type),
    styleName: style.name,
    topSpinSpeed: 0.24 + (seed % 5) / 100,
    middleSpinSpeed: 0.2 + (seed % 4) / 100,
    bottomSpinSpeed: 0.24 + (seed % 5) / 100,
    swayPhase: (seed % 628) / 100,
    lights: [],
    patternMats: [],
    glowShells: [],
    pavilions: [],
    balls: [],
    ribbons: []
  };

  const U = lantern.userData;

  const texMat = (tex, repX, repY, emI = 1.05) => {
    const t = tex.clone();
    t.needsUpdate = true;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repX, repY);

    const m = new THREE.MeshStandardMaterial({
      map: t,
      emissiveMap: t,
      emissive: 0xffffff,
      emissiveIntensity: emI,
      side: THREE.DoubleSide,
      roughness: 0.62,
      metalness: 0
    });

    U.patternMats.push({
      mat: m,
      base: emI,
      phase: U.patternMats.length * 0.7
    });

    return m;
  };

  const trimMat = (emI = 0.5) =>
    new THREE.MeshStandardMaterial({
      color: c.trim,
      emissive: c.trim,
      emissiveIntensity: emI,
      roughness: 0.35,
      metalness: 0.2
    });

  const solidGlow = (hex, emI = 0.8) =>
    new THREE.MeshStandardMaterial({
      color: hex,
      emissive: hex,
      emissiveIntensity: emI,
      roughness: 0.5,
      metalness: 0.05
    });

  const addRing = (parent, y, r, s = 1) => {
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.018, 12, 60),
      trimMat(0.45)
    );
    m.position.y = y;
    m.rotation.x = Math.PI / 2;
    m.scale.setScalar(s);
    parent.add(m);
  };

  // ==========================================================================
  //  PART 3 — BOTTOM SECTION
  // ==========================================================================

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.46, style.lowerBottomRadius + 0.06, 0.8, style.sideCount, 1, true),
    texMat(T.base, style.sideCount, 1)
  );
  base.position.y = -2.55;
  base.scale.y = style.scaleY;
  part3Bottom.add(base);

  addRing(part3Bottom, -2.95, style.lowerBottomRadius + 0.06);
  addRing(part3Bottom, -2.15, 0.5);

  const lower = new THREE.Mesh(
    new THREE.CylinderGeometry(
      style.lowerTopRadius,
      style.lowerBottomRadius,
      1.5,
      style.sideCount,
      1,
      true
    ),
    texMat(T.mandala, style.sideCount, 1)
  );
  lower.position.y = -1.35;
  lower.scale.y = style.scaleY;
  part3Bottom.add(lower);

  addRing(part3Bottom, -0.6, style.lowerTopRadius + 0.02);
  addRing(part3Bottom, -2.1, style.lowerBottomRadius);

  // ==========================================================================
  //  PART 2 — MIDDLE SECTION
  // ==========================================================================

  let bulb;

  if (style.bulbShape === "diamond") {
    bulb = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.58, 0),
      texMat(T.ribs, 8, 1, 1.3)
    );
    bulb.scale.set(1, 1.1, 1);
  } else if (style.bulbShape === "lotus") {
    bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 28, 18),
      texMat(T.ribs, 14, 1, 1.28)
    );
    bulb.scale.set(1.25, 0.75, 1.25);
  } else {
    bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.46, 24, 18),
      texMat(T.ribs, 16, 1, 1.25)
    );
    bulb.scale.set(1, 0.92, 1);
  }

  bulb.position.y = -0.35;
  part2Middle.add(bulb);

  addRing(part2Middle, -0.35, 0.47);
  addRing(part2Middle, -0.08, 0.34);
  addRing(part2Middle, -0.62, 0.34);

  const upper = new THREE.Mesh(
    new THREE.CylinderGeometry(
      style.upperTopRadius,
      style.upperBottomRadius,
      1.5,
      style.sideCount,
      1,
      true
    ),
    texMat(T.paisley, style.sideCount, 1)
  );
  upper.position.y = 0.5;
  upper.scale.y = style.scaleY;
  part2Middle.add(upper);

  addRing(part2Middle, 1.25, style.upperTopRadius + 0.02);
  addRing(part2Middle, -0.1, style.upperBottomRadius + 0.02);

  const glowMat = new THREE.MeshBasicMaterial({
    color: c.glow,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 20, 20),
    glowMat
  );
  glow.position.y = -0.35;
  part2Middle.add(glow);
  U.glowShells.push({ mesh: glow, base: 0.55 });

  const haloMat = new THREE.MeshBasicMaterial({
    color: c.glow,
    transparent: true,
    opacity: 0.1,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(2.6, 18, 18),
    haloMat
  );
  part2Middle.add(halo);
  U.glowShells.push({ mesh: halo, base: 0.1 });

  // ==========================================================================
  //  PART 1 — TOP SECTION
  // ==========================================================================

  if (style.topShape === "diamond") {
    const diamond = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.55, 0),
      texMat(T.wheel, 6, 1, 1.15)
    );
    diamond.position.y = 1.62;
    diamond.scale.set(1.1, 0.9, 1.1);
    part1Top.add(diamond);
  } else {
    const hex = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, 0.66, style.topShape === "umbrella" ? 10 : 6, 1, true),
      texMat(T.wheel, style.topShape === "umbrella" ? 10 : 6, 1)
    );
    hex.position.y = 1.6;
    part1Top.add(hex);
  }

  addRing(part1Top, 1.93, style.topShape === "umbrella" ? 0.7 : 0.52);
  addRing(part1Top, 1.27, 0.52);

  let roof;

  if (style.topShape === "umbrella") {
    roof = new THREE.Mesh(
      new THREE.ConeGeometry(0.9, 0.36, 10),
      trimMat(0.75)
    );
    roof.position.y = 2.15;
  } else if (style.topShape === "diamond") {
    roof = new THREE.Mesh(
      new THREE.ConeGeometry(0.5, 0.7, 6),
      trimMat(0.75)
    );
    roof.position.y = 2.22;
  } else {
    roof = new THREE.Mesh(
      new THREE.ConeGeometry(0.62, 0.5, 6),
      trimMat(0.7)
    );
    roof.position.y = 2.18;
  }

  part1Top.add(roof);

  const tipBall = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 16, 16),
    solidGlow(c.glow, 0.9)
  );
  tipBall.position.y = 2.5;
  part1Top.add(tipBall);

  [[0.5, c.light, 3.0, 7], [-1.3, c.light, 2.6, 6], [-0.35, c.glow, 2.0, 5]].forEach((cfg) => {
    const L = new THREE.PointLight(cfg[1], cfg[2], cfg[3], 1.6);
    L.position.y = cfg[0];
    core.add(L);
    U.lights.push({ light: L, base: cfg[2] });
  });

  // ==========================================================================
  //  PAVILION LANTERNS
  // ==========================================================================

  const buildPavilion = () => {
    const g = new THREE.Group();

    const thread = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, 0.16, 6),
      solidGlow(0xffffff, 0)
    );
    thread.position.y = -0.08;
    g.add(thread);

    const body = new THREE.Mesh(
      style.name === "diamond-star"
        ? new THREE.OctahedronGeometry(0.18, 0)
        : new THREE.BoxGeometry(0.3, 0.3, 0.3),
      texMat(T.hut, 1, 1, 1.1)
    );
    body.position.y = -0.31;
    g.add(body);

    const rf = new THREE.Mesh(
      new THREE.ConeGeometry(0.27, 0.22, style.name === "lotus-umbrella" ? 6 : 4),
      trimMat(0.6)
    );
    rf.position.y = -0.07;
    rf.rotation.y = Math.PI / 4;
    g.add(rf);

    const eave = new THREE.Mesh(
      new THREE.TorusGeometry(0.21, 0.012, 8, 4),
      trimMat(0.5)
    );
    eave.position.y = -0.17;
    eave.rotation.x = Math.PI / 2;
    eave.rotation.z = Math.PI / 4;
    g.add(eave);

    const tThread = new THREE.Mesh(
      new THREE.CylinderGeometry(0.004, 0.004, 0.12, 6),
      solidGlow(0xffffff, 0)
    );
    tThread.position.y = -0.52;
    g.add(tThread);

    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 12, 12),
      solidGlow(c.glow, 0.85)
    );
    ball.position.y = -0.61;
    g.add(ball);

    return g;
  };

  const arm = (parent, angle, R, y) => {
    const a = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, R - 0.45, 6),
      trimMat(0.35)
    );
    a.rotation.z = Math.PI / 2;
    a.rotation.y = -angle;

    const mid = (R + 0.45) / 2;
    a.position.set(Math.sin(angle) * mid, y, Math.cos(angle) * mid);

    parent.add(a);
  };

  const placeTier = (parent, count, R, y, startA) => {
    for (let i = 0; i < count; i++) {
      const angle = startA + (i / count) * Math.PI * 2;

      arm(parent, angle, R, y);

      const p = buildPavilion();
      p.position.set(Math.sin(angle) * R, y, Math.cos(angle) * R);
      p.rotation.y = angle;
      p.userData.phase = i * 0.8 + y;

      parent.add(p);
      U.pavilions.push({ group: p, phase: p.userData.phase });
    }
  };

  placeTier(part2Middle, style.pavilionTopCount, style.miniRadiusTop, 0.55, 0.4);
  placeTier(part3Bottom, style.pavilionBottomCount, style.miniRadiusBottom, -1.25, 0.0);

  // ==========================================================================
  //  RIBBONS
  // ==========================================================================

  const makeRibbon = (angle, y, flip) => {
    const s = flip ? -1 : 1;

    const pts = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.55 * s, 0.18, 0.05),
      new THREE.Vector3(1.05 * s, 0.05, 0.0),
      new THREE.Vector3(1.35 * s, -0.28, -0.05),
      new THREE.Vector3(1.12 * s, -0.5, -0.02),
      new THREE.Vector3(0.9 * s, -0.32, 0.05)
    ];

    const curve = new THREE.CatmullRomCurve3(pts);

    const geo = new THREE.TubeGeometry(
      curve,
      48,
      style.name === "lotus-umbrella" ? 0.035 : 0.05,
      6,
      false
    );

    const m = new THREE.Mesh(
      geo,
      solidGlow(c.paper, 0.95)
    );

    m.scale.set(1, 1, 0.32);

    const wrap = new THREE.Group();
    wrap.add(m);

    wrap.position.set(
      Math.sin(angle) * 0.55,
      y,
      Math.cos(angle) * 0.55
    );

    wrap.rotation.y = angle + (flip ? Math.PI : 0);
    wrap.userData.phase = angle + y;

    part2Middle.add(wrap);
    U.ribbons.push({ group: wrap, phase: wrap.userData.phase });
  };

  makeRibbon(0.9, 0.55, false);
  makeRibbon(0.9, 0.55, true);
  makeRibbon(Math.PI - 0.9, -1.0, false);
  makeRibbon(Math.PI - 0.9, -1.0, true);

  // ==========================================================================
  //  HANGING BALLS
  // ==========================================================================

  const buildBall = () => {
    const g = new THREE.Group();

    const thread = new THREE.Mesh(
      new THREE.CylinderGeometry(0.004, 0.004, 0.3, 6),
      solidGlow(0xffffff, 0)
    );
    thread.position.y = -0.15;
    g.add(thread);

    const ballGeo =
      style.name === "diamond-star"
        ? new THREE.OctahedronGeometry(0.08, 0)
        : new THREE.SphereGeometry(0.08, 14, 14);

    const ball = new THREE.Mesh(
      ballGeo,
      solidGlow(c.glow, 0.9)
    );
    ball.position.y = -0.36;
    g.add(ball);

    for (let j = 0; j < 2; j++) {
      const bead = new THREE.Mesh(
        new THREE.SphereGeometry(0.022, 8, 8),
        solidGlow(c.trim, 0.6)
      );
      bead.position.y = -0.46 - j * 0.06;
      g.add(bead);
    }

    return g;
  };

  const ballSpots = [
    [0.0, 0.85, -1.7],
    [0.7, 1.0, -1.9],
    [1.5, 0.8, -1.6],
    [2.3, 1.05, -2.0],
    [3.0, 0.78, -1.7],
    [3.8, 1.0, -1.95],
    [4.6, 0.82, -1.65],
    [5.4, 1.0, -1.9],
    [6.0, 0.85, -1.75]
  ];

  ballSpots.forEach((sp, i) => {
    const b = buildBall();

    b.position.set(
      Math.sin(sp[0]) * sp[1],
      sp[2],
      Math.cos(sp[0]) * sp[1]
    );

    b.userData.phase = i * 0.9;

    part3Bottom.add(b);
    U.balls.push({ group: b, phase: b.userData.phase });
  });

  lantern.position.set(0, 0.5, -3);
  lantern.scale.setScalar(0.5);

  return lantern;
}

// ============================================================================
//  Animation
// ============================================================================

export function updateLantern(lantern, delta = 0.016) {
  if (!lantern) return;

  const U = lantern.userData;
  U.time += delta;

  const t = U.time;

  if (U.core) {
    U.core.position.y = Math.sin(t * 0.9 + U.swayPhase) * 0.05;
  }

  if (U.part1Top) {
    U.part1Top.rotation.y += delta * U.topSpinSpeed;
  }

  if (U.part2Middle) {
    U.part2Middle.rotation.y -= delta * U.middleSpinSpeed;
  }

  if (U.part3Bottom) {
    U.part3Bottom.rotation.y += delta * U.bottomSpinSpeed;
  }

  lantern.rotation.z = Math.sin(t * 0.7 + U.swayPhase) * 0.04;
  lantern.rotation.x = Math.sin(t * 0.5 + U.swayPhase + 1.2) * 0.03;

  const flicker =
    0.84 +
    Math.sin(t * 8) * 0.09 +
    Math.sin(t * 21) * 0.05 +
    Math.random() * 0.05;

  U.lights.forEach((o) => {
    o.light.intensity = o.base * flicker;
  });

  U.patternMats.forEach((p) => {
    p.mat.emissiveIntensity =
      p.base +
      Math.sin(t * 2.4 + p.phase) * 0.16 +
      (flicker - 0.84) * 0.4;
  });

  U.glowShells.forEach((s) => {
    const k = 1 + Math.sin(t * 3) * 0.07;
    s.mesh.scale.setScalar(k);

    if (s.mesh.material) {
      s.mesh.material.opacity =
        s.base *
        (0.8 + Math.abs(Math.sin(t * 3)) * 0.5);
    }
  });

  U.pavilions.forEach((p) => {
    p.group.rotation.z =
      Math.sin(t * 1.6 + p.phase) * 0.13;

    p.group.rotation.x =
      Math.cos(t * 1.3 + p.phase) * 0.09;
  });

  U.balls.forEach((b) => {
    b.group.rotation.z =
      Math.sin(t * 1.9 + b.phase) * 0.2;

    b.group.rotation.x =
      Math.cos(t * 1.5 + b.phase) * 0.14;
  });

  U.ribbons.forEach((r) => {
    r.group.rotation.z =
      Math.sin(t * 1.4 + r.phase) * 0.12;
  });
}

// ============================================================================
//  Procedural canvas pattern textures
// ============================================================================

function patternTexture(kind, c, size) {
  const key = kind + "_" + c.paper + "_" + size;

  if (_texCache.has(key)) return _texCache.get(key);

  const cv = document.createElement("canvas");
  cv.width = cv.height = size;

  const x = cv.getContext("2d");

  const paper = css(c.paper);
  const line = css(c.line);
  const glow = css(c.glow);
  const trim = css(c.trim);

  const S = size;
  const C = size / 2;

  const g = x.createRadialGradient(
    C,
    C,
    S * 0.05,
    C,
    C,
    S * 0.62
  );

  g.addColorStop(0, glow);
  g.addColorStop(0.55, paper);
  g.addColorStop(1, line);

  x.fillStyle = g;
  x.fillRect(0, 0, S, S);

  x.strokeStyle = line;
  x.fillStyle = line;
  x.lineCap = "round";
  x.lineJoin = "round";

  const lw = (v) => {
    x.lineWidth = S * v;
  };

  const frame = () => {
    lw(0.018);
    x.strokeRect(S * 0.04, S * 0.04, S * 0.92, S * 0.92);

    lw(0.006);
    x.strokeRect(S * 0.08, S * 0.08, S * 0.84, S * 0.84);
  };

  const circle = (cx, cy, r, fill) => {
    x.beginPath();
    x.arc(cx, cy, r, 0, Math.PI * 2);
    fill ? x.fill() : x.stroke();
  };

  if (kind === "mandala" || kind === "base") {
    lw(0.01);

    const rings = kind === "base" ? 4 : 6;

    for (let i = 1; i <= rings; i++) {
      circle(C, C, S * 0.46 * (i / rings), false);
    }

    const spokes = 24;

    lw(0.005);

    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * Math.PI * 2;

      x.beginPath();
      x.moveTo(C, C);
      x.lineTo(
        C + Math.cos(a) * S * 0.46,
        C + Math.sin(a) * S * 0.46
      );
      x.stroke();
    }

    lw(0.006);

    const petals = 16;
    const pr = S * 0.3;

    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * Math.PI * 2;

      circle(
        C + Math.cos(a) * pr,
        C + Math.sin(a) * pr,
        S * 0.05,
        false
      );
    }

    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;

      circle(
        C + Math.cos(a) * S * 0.4,
        C + Math.sin(a) * S * 0.4,
        S * 0.012,
        true
      );
    }

    circle(C, C, S * 0.06, true);
    frame();
  } else if (kind === "paisley") {
    lw(0.007);

    for (let gy = 0; gy < 3; gy++) {
      for (let gx = 0; gx < 3; gx++) {
        const cx = (gx + 0.5) * S / 3;
        const cy = (gy + 0.5) * S / 3;
        const r = S / 7;

        x.beginPath();
        x.moveTo(cx + r, cy);
        x.quadraticCurveTo(cx + r, cy - r * 1.4, cx - r * 0.3, cy - r * 0.9);
        x.quadraticCurveTo(cx - r * 1.3, cy - r * 0.4, cx - r * 0.2, cy + r * 0.6);
        x.quadraticCurveTo(cx + r * 0.6, cy + r * 1.1, cx + r, cy);
        x.stroke();

        lw(0.004);
        circle(cx, cy, r * 0.4, false);
        circle(cx, cy, r * 0.16, true);
        lw(0.007);
      }
    }

    frame();
  } else if (kind === "wheel") {
    lw(0.012);
    circle(C, C, S * 0.4, false);

    lw(0.008);
    circle(C, C, S * 0.36, false);
    circle(C, C, S * 0.14, false);
    circle(C, C, S * 0.05, true);

    lw(0.01);

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;

      x.beginPath();
      x.moveTo(
        C + Math.cos(a) * S * 0.05,
        C + Math.sin(a) * S * 0.05
      );
      x.lineTo(
        C + Math.cos(a) * S * 0.36,
        C + Math.sin(a) * S * 0.36
      );
      x.stroke();
    }

    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;

      circle(
        C + Math.cos(a) * S * 0.4,
        C + Math.sin(a) * S * 0.4,
        S * 0.012,
        true
      );
    }

    frame();
  } else if (kind === "hut" || kind === "hatch") {
    lw(0.004);

    for (let i = 1; i < 12; i++) {
      x.beginPath();
      x.moveTo(S * i / 12, S * 0.12);
      x.lineTo(S * i / 12, S * 0.95);
      x.stroke();

      x.beginPath();
      x.moveTo(S * 0.05, S * i / 12);
      x.lineTo(S * 0.95, S * i / 12);
      x.stroke();
    }

    lw(0.012);

    x.beginPath();
    x.moveTo(S * 0.5, S * 0.05);
    x.lineTo(S * 0.88, S * 0.3);
    x.lineTo(S * 0.12, S * 0.3);
    x.closePath();
    x.stroke();

    lw(0.01);
    circle(C, S * 0.62, S * 0.2, false);
    circle(C, S * 0.62, S * 0.07, false);

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;

      x.beginPath();
      x.moveTo(
        C + Math.cos(a) * S * 0.07,
        S * 0.62 + Math.sin(a) * S * 0.07
      );
      x.lineTo(
        C + Math.cos(a) * S * 0.2,
        S * 0.62 + Math.sin(a) * S * 0.2
      );
      x.stroke();
    }

    frame();
  } else if (kind === "ribs") {
    lw(0.04);

    for (let i = 0; i < 4; i++) {
      x.beginPath();
      x.moveTo(S * (i + 0.5) / 4, 0);
      x.lineTo(S * (i + 0.5) / 4, S);
      x.stroke();
    }

    lw(0.012);
    x.strokeStyle = trim;

    for (let i = 0; i < 4; i++) {
      x.beginPath();
      x.moveTo(S * i / 4, 0);
      x.lineTo(S * i / 4, S);
      x.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;

  if (tex.anisotropy !== undefined) {
    tex.anisotropy = 4;
  }

  _texCache.set(key, tex);

  return tex;
}

function css(h) {
  return "#" + (h >>> 0).toString(16).padStart(6, "0").slice(-6);
}

function hashText(text) {
  let hash = 0;

  for (let i = 0; i < text.length; i++) {
    hash =
      (hash << 5) -
      hash +
      text.charCodeAt(i);

    hash |= 0;
  }

  return hash;
}