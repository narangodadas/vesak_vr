// ============================================================================
//  Vesak Kūdu — Cyberpunk Neon Edition  (3 styles + 3-part rotation + music)
// ============================================================================
//
//  Colour philosophy (per description):
//    Neon Blue        → outer borders, top ring, frame highlights
//    Electric Purple  → main body frame, 3-D metallic edges
//    Magenta/Hot Pink → inner glow, reflective panels
//    Golden Orange    → lotus / mandala symbols inside panels
//    Cyan Light Blue  → hanging shapes, glow strips
//    Dark Indigo/Black→ shadow contrast
//    White Glow       → sparkle particles, lighting reflections
//
//  3-D style:
//    metallic glossy reflections · neon LED glow edges · cyberpunk lighting
//    glass-like transparent shine · soft bloom · gradient colour blending
//    volumetric glow particles at bottom
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

// ──────────────────────────────────────────────────────────────────────────────
//  Colour palettes — cyberpunk neon
// ──────────────────────────────────────────────────────────────────────────────
//
//  lantern-1  "neon-tower"   Neon Blue + Electric Purple + Cyan
//  lantern-2  "plasma-star"  Deep Purple + Magenta + Cyan accent
//  lantern-3  "lotus-holo"   Holographic: Pink-Magenta + Neon Blue + Gold
//
//  Each set: { paper, line, glow, trim, light }
//    paper  → main panel face colour
//    line   → outline / rib / edge colour
//    glow   → emissive / additive bloom colour
//    trim   → ring / roof / accent colour
//    light  → PointLight colour + hanging ball colour
// ──────────────────────────────────────────────────────────────────────────────

export function createLantern(type = "vesak-lantern-1") {
  const colorSets = {

    // ── Lantern 1: Neon Tower ─────────────────────────────────────────────
    //   Electric blue body, deep-indigo outlines, cyan glow, gold-orange trim
    "vesak-lantern-1": {
      paper: 0x1a0e6e,   // deep indigo-blue — panel face
      line:  0x0d1a8c,   // slightly brighter blue — outlines
      glow:  0x00d4ff,   // electric cyan — emissive bloom
      trim:  0xffa500,   // golden orange — rings & roof
      light: 0x00aaff    // neon blue — point lights & hanging balls
    },

    // ── Lantern 2: Plasma Star ────────────────────────────────────────────
    //   Electric purple body, neon magenta glow, cyan accent, hot-pink light
    "vesak-lantern-2": {
      paper: 0x2d0066,   // deep electric purple
      line:  0x5500cc,   // bright purple — edges
      glow:  0xcc00ff,   // neon violet-purple — bloom
      trim:  0x00e5ff,   // cyan — rings & tip
      light: 0xff00cc    // hot-pink/magenta — PointLights & balls
    },

    // ── Lantern 3: Lotus Holographic ─────────────────────────────────────
    //   Magenta-pink body, dark indigo shadow, hot-pink glow, gold lotus trim
    "vesak-lantern-3": {
      paper: 0x3d0055,   // dark indigo-magenta — panel face
      line:  0x200033,   // very deep indigo — outlines
      glow:  0xff00aa,   // neon hot-pink — bloom
      trim:  0xffc700,   // gold — rings, lotus petals, roof
      light: 0x00ffee    // cyan-aqua — PointLights & hanging balls
    },

    // ── Lanterns 4-5: kept from original but re-tinted toward cyberpunk ──
    "vesak-lantern-4": {
      paper: 0x001a55,
      line:  0x003399,
      glow:  0x0099ff,
      trim:  0xffaa00,
      light: 0x33ccff
    },
    "vesak-lantern-5": {
      paper: 0x220044,
      line:  0x440088,
      glow:  0xaa00ff,
      trim:  0xff66aa,
      light: 0xff33cc
    }
  };

  // ── Shape / geometry sets ──────────────────────────────────────────────────
  const styleSets = {

    // Tall faceted tower — 8 sides, classic pagoda-tower look
    "vesak-lantern-1": {
      name: "neon-tower",
      sideCount: 8,
      topShape: "hex",
      bulbShape: "sphere",
      lowerTopRadius: 0.32,
      lowerBottomRadius: 0.9,
      upperTopRadius: 0.82,
      upperBottomRadius: 0.32,
      pavilionTopCount: 6,
      pavilionBottomCount: 8,
      miniRadiusTop: 1.2,
      miniRadiusBottom: 1.1,
      scaleY: 1
    },

    // Diamond faceted star — 6 sides, sharp crystalline silhouette
    "vesak-lantern-2": {
      name: "plasma-star",
      sideCount: 6,
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

    // Holographic lotus umbrella — 12 sides, wide flowing skirt, lotus bulb
    "vesak-lantern-3": {
      name: "lotus-holo",
      sideCount: 12,
      topShape: "umbrella",
      bulbShape: "lotus",
      lowerTopRadius: 0.52,
      lowerBottomRadius: 0.95,
      upperTopRadius: 0.95,
      upperBottomRadius: 0.52,
      pavilionTopCount: 12,
      pavilionBottomCount: 14,
      miniRadiusTop: 1.55,
      miniRadiusBottom: 1.42,
      scaleY: 1.12
    }
  };

  const keys = Object.keys(colorSets);
  const c = colorSets[type] || colorSets[keys[Math.abs(hashText(type)) % keys.length]];
  const style = styleSets[type] || styleSets["vesak-lantern-1"];
  const seed = Math.abs(hashText(type));

  // ── Procedural pattern textures ───────────────────────────────────────────
  const T = {
    mandala: patternTexture("mandala", c, 512),
    paisley: patternTexture("paisley", c, 512),
    wheel:   patternTexture("wheel",   c, 384),
    hatch:   patternTexture("hatch",   c, 256),
    ribs:    patternTexture("ribs",    c, 256),
    base:    patternTexture("base",    c, 512),
    hut:     patternTexture("hut",     c, 256),
    circuit: patternTexture("circuit", c, 512)   // NEW: cyberpunk circuit-board pattern
  };

  const lantern    = new THREE.Group();
  const core       = new THREE.Group();
  lantern.add(core);

  const part1Top    = new THREE.Group();
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
    topSpinSpeed:    0.26 + (seed % 5) / 100,
    middleSpinSpeed: 0.21 + (seed % 4) / 100,
    bottomSpinSpeed: 0.26 + (seed % 5) / 100,
    swayPhase: (seed % 628) / 100,
    lights: [],
    patternMats: [],
    glowShells: [],
    pavilions: [],
    balls: [],
    ribbons: [],
    neonEdges: [],       // NEW: extra neon ring/edge meshes
    sparkles: []         // NEW: volumetric sparkle particles
  };

  const U = lantern.userData;

  // ── Material helpers ───────────────────────────────────────────────────────

  // Textured panel — neon-boosted emissive for the LED-glow look
  const texMat = (tex, repX, repY, emI = 1.25) => {
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
      roughness: 0.25,    // lower = more glossy metallic feel
      metalness: 0.55     // metallic reflections
    });

    U.patternMats.push({ mat: m, base: emI, phase: U.patternMats.length * 0.7 });
    return m;
  };

  // Trim ring material — gold-chrome neon
  const trimMat = (emI = 0.65) =>
    new THREE.MeshStandardMaterial({
      color: c.trim,
      emissive: c.trim,
      emissiveIntensity: emI,
      roughness: 0.18,
      metalness: 0.9     // chrome-gold look
    });

  // Solid glow — used for orbs, balls, tip
  const solidGlow = (hex, emI = 1.0) =>
    new THREE.MeshStandardMaterial({
      color: hex,
      emissive: hex,
      emissiveIntensity: emI,
      roughness: 0.12,
      metalness: 0.7
    });

  // Additive bloom shell
  const bloomShell = (hex, opacity) =>
    new THREE.MeshBasicMaterial({
      color: hex,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

  // Neon LED edge — thin, bright, additive
  const neonEdge = (hex) =>
    new THREE.MeshBasicMaterial({
      color: hex,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

  // ── Ring helper (neon variant) ─────────────────────────────────────────────
  const addRing = (parent, y, r, isNeon = false) => {
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(r, isNeon ? 0.028 : 0.016, 16, 64),
      isNeon ? neonEdge(c.glow) : trimMat(0.55)
    );
    m.position.y = y;
    m.rotation.x = Math.PI / 2;
    parent.add(m);

    if (isNeon) {
      U.neonEdges.push({ mesh: m });
    }
  };

  // ── Volumetric glow particle helper ──────────────────────────────────────
  const addSparkle = (parent, x, y, z, r = 0.04) => {
    const sp = new THREE.Mesh(
      new THREE.SphereGeometry(r, 8, 8),
      bloomShell(c.glow, 0.7)
    );
    sp.position.set(x, y, z);
    sp.userData.phase = (x + z) * 3.14;
    parent.add(sp);
    U.sparkles.push({ mesh: sp, phase: sp.userData.phase });
  };

  // ============================================================================
  //  PART 3 — BOTTOM SECTION
  // ============================================================================

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.46, style.lowerBottomRadius + 0.06, 0.8, style.sideCount, 1, true),
    texMat(T.circuit, style.sideCount, 1)   // cyberpunk circuit pattern on base
  );
  base.position.y = -2.55;
  base.scale.y = style.scaleY;
  part3Bottom.add(base);

  addRing(part3Bottom, -2.95, style.lowerBottomRadius + 0.06, true);   // neon outer ring
  addRing(part3Bottom, -2.15, 0.5);

  const lower = new THREE.Mesh(
    new THREE.CylinderGeometry(
      style.lowerTopRadius,
      style.lowerBottomRadius,
      1.5, style.sideCount, 1, true
    ),
    texMat(T.mandala, style.sideCount, 1)
  );
  lower.position.y = -1.35;
  lower.scale.y = style.scaleY;
  part3Bottom.add(lower);

  addRing(part3Bottom, -0.6,  style.lowerTopRadius  + 0.02, true);
  addRing(part3Bottom, -2.1,  style.lowerBottomRadius, false);

  // Volumetric glow particles along bottom skirt
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const R = style.lowerBottomRadius + 0.12;
    addSparkle(part3Bottom, Math.sin(a) * R, -2.9, Math.cos(a) * R, 0.045);
  }

  // ============================================================================
  //  PART 2 — MIDDLE SECTION
  // ============================================================================

  let bulb;

  if (style.bulbShape === "diamond") {
    bulb = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.58, 0),
      texMat(T.ribs, 8, 1, 1.4)
    );
    bulb.scale.set(1, 1.1, 1);
  } else if (style.bulbShape === "lotus") {
    // Flattened sphere for lotus-dome look
    bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 28, 18),
      texMat(T.ribs, 12, 1, 1.35)
    );
    bulb.scale.set(1.3, 0.72, 1.3);
  } else {
    bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.46, 24, 18),
      texMat(T.ribs, 16, 1, 1.3)
    );
    bulb.scale.set(1, 0.92, 1);
  }

  bulb.position.y = -0.35;
  part2Middle.add(bulb);

  addRing(part2Middle, -0.35, 0.47, true);
  addRing(part2Middle, -0.08, 0.34);
  addRing(part2Middle, -0.62, 0.34);

  const upper = new THREE.Mesh(
    new THREE.CylinderGeometry(
      style.upperTopRadius,
      style.upperBottomRadius,
      1.5, style.sideCount, 1, true
    ),
    texMat(T.paisley, style.sideCount, 1)
  );
  upper.position.y = 0.5;
  upper.scale.y = style.scaleY;
  part2Middle.add(upper);

  addRing(part2Middle, 1.25, style.upperTopRadius  + 0.02, true);
  addRing(part2Middle, -0.1, style.upperBottomRadius + 0.02);

  // Core glow bloom — magenta-tinted for cyberpunk
  const glowMat = bloomShell(c.glow, 0.65);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.60, 22, 22), glowMat);
  glow.position.y = -0.35;
  part2Middle.add(glow);
  U.glowShells.push({ mesh: glow, base: 0.60 });

  // Wide halo
  const haloMat = bloomShell(c.glow, 0.12);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(2.8, 18, 18), haloMat);
  part2Middle.add(halo);
  U.glowShells.push({ mesh: halo, base: 0.12 });

  // Extra tight inner glow (glass-like) — white
  const innerGlow = bloomShell(0xffffff, 0.18);
  const inner = new THREE.Mesh(new THREE.SphereGeometry(0.38, 18, 18), innerGlow);
  inner.position.y = -0.35;
  part2Middle.add(inner);
  U.glowShells.push({ mesh: inner, base: 0.18 });

  // ============================================================================
  //  PART 1 — TOP SECTION
  // ============================================================================

  if (style.topShape === "diamond") {
    const diamond = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.55, 0),
      texMat(T.wheel, 6, 1, 1.2)
    );
    diamond.position.y = 1.62;
    diamond.scale.set(1.1, 0.9, 1.1);
    part1Top.add(diamond);
  } else {
    const hex = new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.5, 0.5, 0.66,
        style.topShape === "umbrella" ? 12 : 6,
        1, true
      ),
      texMat(T.wheel, style.topShape === "umbrella" ? 12 : 6, 1)
    );
    hex.position.y = 1.6;
    part1Top.add(hex);
  }

  addRing(part1Top, 1.93, style.topShape === "umbrella" ? 0.72 : 0.52, true);
  addRing(part1Top, 1.27, 0.52, false);

  let roof;
  if (style.topShape === "umbrella") {
    roof = new THREE.Mesh(new THREE.ConeGeometry(0.92, 0.38, 12), trimMat(0.85));
    roof.position.y = 2.16;
  } else if (style.topShape === "diamond") {
    roof = new THREE.Mesh(new THREE.ConeGeometry(0.52, 0.72, 6), trimMat(0.85));
    roof.position.y = 2.24;
  } else {
    roof = new THREE.Mesh(new THREE.ConeGeometry(0.64, 0.52, 6), trimMat(0.82));
    roof.position.y = 2.20;
  }
  part1Top.add(roof);

  // Tip: dual-layered neon orb (white core + colour bloom)
  const tipCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 16, 16),
    solidGlow(0xffffff, 1.0)
  );
  tipCore.position.y = 2.52;
  part1Top.add(tipCore);

  const tipBloom = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 16, 16),
    bloomShell(c.glow, 0.55)
  );
  tipBloom.position.y = 2.52;
  part1Top.add(tipBloom);
  U.glowShells.push({ mesh: tipBloom, base: 0.55 });

  // ── Point lights (cyberpunk colours) ──────────────────────────────────────
  // [y-offset, colour, intensity, distance]
  [
    [ 0.5,  c.light,  3.2, 7.0],
    [-1.3,  c.glow,   2.8, 6.0],
    [-0.35, 0xffffff, 2.2, 5.0]    // white sparkle centre
  ].forEach((cfg) => {
    const L = new THREE.PointLight(cfg[1], cfg[2], cfg[3], 1.6);
    L.position.y = cfg[0];
    core.add(L);
    U.lights.push({ light: L, base: cfg[2] });
  });

  // ============================================================================
  //  PAVILION MINI-LANTERNS
  // ============================================================================

  const buildPavilion = () => {
    const g = new THREE.Group();

    const thread = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, 0.16, 6),
      solidGlow(c.glow, 0.3)
    );
    thread.position.y = -0.08;
    g.add(thread);

    const body = new THREE.Mesh(
      style.name === "plasma-star"
        ? new THREE.OctahedronGeometry(0.18, 0)
        : new THREE.BoxGeometry(0.30, 0.30, 0.30),
      texMat(T.hut, 1, 1, 1.2)
    );
    body.position.y = -0.31;
    g.add(body);

    const rf = new THREE.Mesh(
      new THREE.ConeGeometry(0.27, 0.22, style.name === "lotus-holo" ? 8 : 4),
      trimMat(0.75)
    );
    rf.position.y = -0.07;
    rf.rotation.y = Math.PI / 4;
    g.add(rf);

    // neon eave ring
    const eave = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.014, 10, 5),
      neonEdge(c.glow)
    );
    eave.position.y = -0.17;
    eave.rotation.x = Math.PI / 2;
    eave.rotation.z = Math.PI / 4;
    g.add(eave);
    U.neonEdges.push({ mesh: eave });

    const tThread = new THREE.Mesh(
      new THREE.CylinderGeometry(0.004, 0.004, 0.12, 6),
      solidGlow(c.light, 0.25)
    );
    tThread.position.y = -0.52;
    g.add(tThread);

    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 12, 12),
      solidGlow(c.light, 0.95)
    );
    ball.position.y = -0.63;
    g.add(ball);

    // bloom around mini-ball
    const bBloom = new THREE.Mesh(
      new THREE.SphereGeometry(0.10, 8, 8),
      bloomShell(c.light, 0.30)
    );
    bBloom.position.y = -0.63;
    g.add(bBloom);

    return g;
  };

  const arm = (parent, angle, R, y) => {
    const a = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.014, R - 0.45, 6),
      neonEdge(c.trim)
    );
    a.rotation.z = Math.PI / 2;
    a.rotation.y = -angle;
    const mid = (R + 0.45) / 2;
    a.position.set(Math.sin(angle) * mid, y, Math.cos(angle) * mid);
    parent.add(a);
    U.neonEdges.push({ mesh: a });
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

  placeTier(part2Middle, style.pavilionTopCount,    style.miniRadiusTop,    0.55, 0.4);
  placeTier(part3Bottom, style.pavilionBottomCount, style.miniRadiusBottom, -1.25, 0.0);

  // ============================================================================
  //  RIBBONS (cyber-flat holographic ribbons)
  // ============================================================================

  const makeRibbon = (angle, y, flip) => {
    const s = flip ? -1 : 1;

    const pts = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.55 * s,  0.18,   0.05),
      new THREE.Vector3(1.05 * s,  0.05,   0.0),
      new THREE.Vector3(1.35 * s, -0.28,  -0.05),
      new THREE.Vector3(1.12 * s, -0.50,  -0.02),
      new THREE.Vector3(0.90 * s, -0.32,   0.05)
    ];

    const curve = new THREE.CatmullRomCurve3(pts);
    const geo   = new THREE.TubeGeometry(curve, 48,
      style.name === "lotus-holo" ? 0.032 : 0.048, 6, false);

    const m = new THREE.Mesh(geo, solidGlow(c.glow, 0.9));
    m.scale.set(1, 1, 0.28);

    const wrap = new THREE.Group();
    wrap.add(m);
    wrap.position.set(Math.sin(angle) * 0.55, y, Math.cos(angle) * 0.55);
    wrap.rotation.y = angle + (flip ? Math.PI : 0);
    wrap.userData.phase = angle + y;

    part2Middle.add(wrap);
    U.ribbons.push({ group: wrap, phase: wrap.userData.phase });
  };

  makeRibbon(0.9,            0.55, false);
  makeRibbon(0.9,            0.55, true);
  makeRibbon(Math.PI - 0.9, -1.0,  false);
  makeRibbon(Math.PI - 0.9, -1.0,  true);

  // ============================================================================
  //  HANGING BALLS  (crystal gems for cyberpunk style)
  // ============================================================================

  const buildBall = () => {
    const g = new THREE.Group();

    const thread = new THREE.Mesh(
      new THREE.CylinderGeometry(0.004, 0.004, 0.30, 6),
      solidGlow(c.light, 0.20)
    );
    thread.position.y = -0.15;
    g.add(thread);

    // Crystal shape — octahedron for all neon styles
    const ballGeo =
      style.name === "plasma-star"
        ? new THREE.OctahedronGeometry(0.09, 0)
        : new THREE.SphereGeometry(0.09, 14, 14);

    const ball = new THREE.Mesh(ballGeo, solidGlow(c.light, 1.0));
    ball.position.y = -0.37;
    g.add(ball);

    // bloom halo
    const bloom = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 8, 8),
      bloomShell(c.light, 0.28)
    );
    bloom.position.y = -0.37;
    g.add(bloom);

    // Two small bead accents in trim colour
    for (let j = 0; j < 2; j++) {
      const bead = new THREE.Mesh(
        new THREE.SphereGeometry(0.022, 8, 8),
        solidGlow(c.trim, 0.65)
      );
      bead.position.y = -0.48 - j * 0.065;
      g.add(bead);
    }

    return g;
  };

  const ballSpots = [
    [0.0, 0.85, -1.7],
    [0.7, 1.0,  -1.9],
    [1.5, 0.8,  -1.6],
    [2.3, 1.05, -2.0],
    [3.0, 0.78, -1.7],
    [3.8, 1.0,  -1.95],
    [4.6, 0.82, -1.65],
    [5.4, 1.0,  -1.9],
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

  // ── Final position ────────────────────────────────────────────────────────
  lantern.position.set(0, 0.5, -3);
  lantern.scale.setScalar(0.5);

  return lantern;
}

// ============================================================================
//  Animation loop
// ============================================================================

export function updateLantern(lantern, delta = 0.016) {
  if (!lantern) return;

  const U = lantern.userData;
  U.time += delta;

  const t = U.time;

  if (U.core)       U.core.position.y     = Math.sin(t * 0.9 + U.swayPhase) * 0.05;
  if (U.part1Top)   U.part1Top.rotation.y   += delta * U.topSpinSpeed;
  if (U.part2Middle) U.part2Middle.rotation.y -= delta * U.middleSpinSpeed;
  if (U.part3Bottom) U.part3Bottom.rotation.y += delta * U.bottomSpinSpeed;

  lantern.rotation.z = Math.sin(t * 0.7  + U.swayPhase)       * 0.04;
  lantern.rotation.x = Math.sin(t * 0.5  + U.swayPhase + 1.2) * 0.03;

  // Cyberpunk flicker — faster, more jagged than a candle
  const flicker =
    0.82 +
    Math.sin(t * 12)  * 0.10 +
    Math.sin(t * 27)  * 0.06 +
    Math.random()     * 0.06;

  U.lights.forEach((o) => {
    o.light.intensity = o.base * flicker;
  });

  U.patternMats.forEach((p) => {
    p.mat.emissiveIntensity =
      p.base +
      Math.sin(t * 2.8 + p.phase) * 0.18 +
      (flicker - 0.82) * 0.5;
  });

  U.glowShells.forEach((s) => {
    const k = 1 + Math.sin(t * 3.2) * 0.09;
    s.mesh.scale.setScalar(k);
    if (s.mesh.material) {
      s.mesh.material.opacity =
        s.base * (0.78 + Math.abs(Math.sin(t * 3.2)) * 0.55);
    }
  });

  // Neon edges pulse independently
  if (U.neonEdges) {
    U.neonEdges.forEach((e, idx) => {
      if (e.mesh && e.mesh.material) {
        e.mesh.material.opacity =
          0.75 + Math.sin(t * 4 + idx * 0.5) * 0.22;
      }
    });
  }

  U.pavilions.forEach((p) => {
    p.group.rotation.z = Math.sin(t * 1.6 + p.phase) * 0.13;
    p.group.rotation.x = Math.cos(t * 1.3 + p.phase) * 0.09;
  });

  U.balls.forEach((b) => {
    b.group.rotation.z = Math.sin(t * 1.9 + b.phase) * 0.20;
    b.group.rotation.x = Math.cos(t * 1.5 + b.phase) * 0.14;
  });

  U.ribbons.forEach((r) => {
    r.group.rotation.z = Math.sin(t * 1.4 + r.phase) * 0.12;
  });

  // Volumetric sparkles orbit gently
  if (U.sparkles) {
    U.sparkles.forEach((sp) => {
      sp.mesh.position.y += Math.sin(t * 2 + sp.phase) * 0.002;
      if (sp.mesh.material) {
        sp.mesh.material.opacity =
          0.55 + Math.sin(t * 3 + sp.phase) * 0.35;
      }
    });
  }
}

// ============================================================================
//  Procedural canvas pattern textures — extended with "circuit" pattern
// ============================================================================

function patternTexture(kind, c, size) {
  const key = kind + "_" + c.paper + "_" + size;
  if (_texCache.has(key)) return _texCache.get(key);

  const cv  = document.createElement("canvas");
  cv.width  = cv.height = size;
  const x   = cv.getContext("2d");

  const paper  = css(c.paper);
  const line   = css(c.line);
  const glow   = css(c.glow);
  const trim   = css(c.trim);

  const S = size;
  const C = size / 2;

  // Background radial gradient — dark-indigo centre → black edge for depth
  const g = x.createRadialGradient(C, C, S * 0.04, C, C, S * 0.60);
  g.addColorStop(0,    glow);
  g.addColorStop(0.45, paper);
  g.addColorStop(1,    "#050010");   // near-black edge for neon pop

  x.fillStyle = g;
  x.fillRect(0, 0, S, S);

  x.strokeStyle = line;
  x.fillStyle   = line;
  x.lineCap     = "round";
  x.lineJoin    = "round";

  const lw    = (v) => { x.lineWidth = S * v; };
  const frame = () => {
    lw(0.022);  x.strokeStyle = glow;
    x.strokeRect(S * 0.03, S * 0.03, S * 0.94, S * 0.94);
    lw(0.008);  x.strokeStyle = trim;
    x.strokeRect(S * 0.07, S * 0.07, S * 0.86, S * 0.86);
    x.strokeStyle = line;
  };
  const circle = (cx, cy, r, fill) => {
    x.beginPath();
    x.arc(cx, cy, r, 0, Math.PI * 2);
    fill ? x.fill() : x.stroke();
  };

  if (kind === "mandala" || kind === "base") {
    lw(0.012);

    const rings = kind === "base" ? 5 : 7;
    x.strokeStyle = glow;
    for (let i = 1; i <= rings; i++) {
      circle(C, C, S * 0.46 * (i / rings), false);
    }

    // Spokes in trim colour
    x.strokeStyle = trim;  lw(0.006);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      x.beginPath();
      x.moveTo(C, C);
      x.lineTo(C + Math.cos(a) * S * 0.46, C + Math.sin(a) * S * 0.46);
      x.stroke();
    }

    // Neon petals
    x.fillStyle = glow;  lw(0.007);  x.strokeStyle = glow;
    const petals = 16;  const pr = S * 0.30;
    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * Math.PI * 2;
      circle(C + Math.cos(a) * pr, C + Math.sin(a) * pr, S * 0.055, false);
    }
    x.fillStyle = trim;
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      circle(C + Math.cos(a) * S * 0.41, C + Math.sin(a) * S * 0.41, S * 0.013, true);
    }
    x.fillStyle = "#ffffff";  circle(C, C, S * 0.065, true);
    frame();

  } else if (kind === "paisley") {
    lw(0.008);  x.strokeStyle = glow;

    for (let gy = 0; gy < 3; gy++) {
      for (let gx = 0; gx < 3; gx++) {
        const cx = (gx + 0.5) * S / 3;
        const cy = (gy + 0.5) * S / 3;
        const r  = S / 7;

        x.beginPath();
        x.moveTo(cx + r, cy);
        x.quadraticCurveTo(cx + r,       cy - r * 1.4, cx - r * 0.3, cy - r * 0.9);
        x.quadraticCurveTo(cx - r * 1.3, cy - r * 0.4, cx - r * 0.2, cy + r * 0.6);
        x.quadraticCurveTo(cx + r * 0.6, cy + r * 1.1, cx + r,       cy);
        x.stroke();

        lw(0.005);  x.strokeStyle = trim;
        circle(cx, cy, r * 0.42, false);
        x.fillStyle = glow;
        circle(cx, cy, r * 0.18, true);
        lw(0.008);  x.strokeStyle = glow;
      }
    }
    frame();

  } else if (kind === "wheel") {
    lw(0.014);  x.strokeStyle = glow;
    circle(C, C, S * 0.42, false);
    lw(0.009);  x.strokeStyle = trim;
    circle(C, C, S * 0.37, false);
    circle(C, C, S * 0.14, false);
    x.fillStyle = "#ffffff";  circle(C, C, S * 0.055, true);

    lw(0.012);  x.strokeStyle = glow;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      x.beginPath();
      x.moveTo(C + Math.cos(a) * S * 0.055, C + Math.sin(a) * S * 0.055);
      x.lineTo(C + Math.cos(a) * S * 0.37,  C + Math.sin(a) * S * 0.37);
      x.stroke();
    }
    x.fillStyle = trim;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      circle(C + Math.cos(a) * S * 0.42, C + Math.sin(a) * S * 0.42, S * 0.013, true);
    }
    frame();

  } else if (kind === "hut" || kind === "hatch") {
    lw(0.005);  x.strokeStyle = trim;
    for (let i = 1; i < 12; i++) {
      x.beginPath(); x.moveTo(S * i / 12, S * 0.12); x.lineTo(S * i / 12, S * 0.95); x.stroke();
      x.beginPath(); x.moveTo(S * 0.05, S * i / 12); x.lineTo(S * 0.95, S * i / 12); x.stroke();
    }
    lw(0.014);  x.strokeStyle = glow;
    x.beginPath();
    x.moveTo(S * 0.5, S * 0.05);
    x.lineTo(S * 0.88, S * 0.3);
    x.lineTo(S * 0.12, S * 0.3);
    x.closePath();  x.stroke();

    lw(0.01);  x.strokeStyle = trim;
    circle(C, S * 0.62, S * 0.20, false);
    circle(C, S * 0.62, S * 0.07, false);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      x.beginPath();
      x.moveTo(C + Math.cos(a) * S * 0.07, S * 0.62 + Math.sin(a) * S * 0.07);
      x.lineTo(C + Math.cos(a) * S * 0.20, S * 0.62 + Math.sin(a) * S * 0.20);
      x.stroke();
    }
    frame();

  } else if (kind === "ribs") {
    // Neon rib stripes — wide glow bars + thin trim separators
    lw(0.045);  x.strokeStyle = glow;
    for (let i = 0; i < 4; i++) {
      x.beginPath();
      x.moveTo(S * (i + 0.5) / 4, 0);
      x.lineTo(S * (i + 0.5) / 4, S);
      x.stroke();
    }
    lw(0.014);  x.strokeStyle = trim;
    for (let i = 0; i < 4; i++) {
      x.beginPath();
      x.moveTo(S * i / 4, 0);
      x.lineTo(S * i / 4, S);
      x.stroke();
    }

  } else if (kind === "circuit") {
    // ── NEW: cyberpunk circuit-board pattern ──────────────────────────────
    lw(0.006);  x.strokeStyle = glow;

    // Horizontal traces
    const traceY = [0.15, 0.35, 0.55, 0.75, 0.92];
    traceY.forEach((ty) => {
      x.beginPath();
      x.moveTo(S * 0.05, S * ty);
      x.lineTo(S * 0.95, S * ty);
      x.stroke();
    });

    // Vertical traces
    const traceX = [0.12, 0.28, 0.48, 0.68, 0.85];
    lw(0.005);  x.strokeStyle = trim;
    traceX.forEach((tx) => {
      x.beginPath();
      x.moveTo(S * tx, S * 0.05);
      x.lineTo(S * tx, S * 0.95);
      x.stroke();
    });

    // Via pads (small filled circles at intersections)
    x.fillStyle = glow;
    traceY.forEach((ty) => {
      traceX.forEach((tx) => {
        circle(S * tx, S * ty, S * 0.018, true);
      });
    });

    // Corner "IC chip" rectangle
    x.strokeStyle = trim;  lw(0.018);
    x.strokeRect(S * 0.30, S * 0.30, S * 0.40, S * 0.40);
    x.fillStyle = paper;
    x.fillRect(S * 0.30, S * 0.30, S * 0.40, S * 0.40);
    x.strokeStyle = glow;  lw(0.008);
    x.strokeRect(S * 0.34, S * 0.34, S * 0.32, S * 0.32);

    // Pin marks on chip sides
    lw(0.006);  x.strokeStyle = trim;
    for (let i = 0; i < 3; i++) {
      const off = (i + 0.5) / 3;
      // left
      x.beginPath(); x.moveTo(S * 0.22, S * (0.34 + off * 0.32)); x.lineTo(S * 0.30, S * (0.34 + off * 0.32)); x.stroke();
      // right
      x.beginPath(); x.moveTo(S * 0.70, S * (0.34 + off * 0.32)); x.lineTo(S * 0.78, S * (0.34 + off * 0.32)); x.stroke();
    }

    frame();
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  if (tex.anisotropy !== undefined) tex.anisotropy = 4;

  _texCache.set(key, tex);
  return tex;
}

function css(h) {
  return "#" + (h >>> 0).toString(16).padStart(6, "0").slice(-6);
}

function hashText(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}