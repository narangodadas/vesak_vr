// ============================================================================
//  Vesak Kūdu — Ultra Enhanced Lanterns v3
//  Lantern 1: DARK GREEN THEME  (emerald forest / jade temple)
//  Lantern 2: DARK RED THEME    (crimson fire / ruby crystal)
//  Lantern 3: DARK GOLD THEME   (ancient gold / amber temple)
//
//  New features:
//   • Fully distinct colour palettes per lantern
//   • Buddha face / dharma wheel / lotus canvas textures
//   • Extra geometry: torus knots, lathe vases, icosahedra, star shapes
//   • Jewelled crown tops, layered eaves, filigree rings
//   • Floating dharma particle halo
//   • Ripple-wave ring animation, petal bloom, spike pulse
//   • Per-lantern swaying tassel chains
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

// ============================================================================
//  COLOUR PALETTES
// ============================================================================
const colorSets = {

  // ── LANTERN 1 ── DARK GREEN (jade / emerald / forest)
  "vesak-lantern-1": {
    paper:   0x0a2e12,   // very dark forest green body
    line:    0x030f06,   // near-black green ink
    glow:    0x007D43,   // electric emerald glow
    trim:    0x3B825D,   // bright mint trim rings
    light:   0x008036,   // deep green light colour
    accent:  0x6B8F77,   // pale jade accent
    bg:      0x001a08    // darkest background tint
  },

  // ── LANTERN 2 ── DARK RED (crimson / ruby / bloodfire)
  "vesak-lantern-2": {
    paper:   0x2d0005,   // very dark crimson body
    line:    0x0e0002,   // near-black red ink
    glow:    0xff1744,   // hot red glow
    trim:    0xff6d6d,   // coral / scarlet trim
    light:   0xd50000,   // deep red light
    accent:  0xff8a80,   // salmon accent
    bg:      0x1a0000    // darkest background tint
  },

  // ── LANTERN 3 ── DARK GOLD (amber / antique gold / sun temple)
  "vesak-lantern-3": {
    paper:   0x2b1a00,   // very dark amber body
    line:    0x0e0800,   // near-black amber ink
    glow:    0xffab00,   // vivid amber glow
    trim:    0xffe57f,   // soft gold trim
    light:   0xff8f00,   // deep amber/orange light
    accent:  0xfff8e1,   // pale gold accent
    bg:      0x180f00    // darkest background tint
  },

  // aliases kept so nothing breaks
  "vesak-lantern-4": {
    paper:   0x2b1a00, line: 0x0e0800, glow: 0xffab00,
    trim:    0xffe57f, light: 0xff8f00, accent: 0xfff8e1, bg: 0x180f00
  },
  "vesak-lantern-5": {
    paper:   0x0a2e12, line: 0x030f06, glow: 0x00e676,
    trim:    0x69f0ae, light: 0x00c853, accent: 0xb9f6ca, bg: 0x001a08
  }
};

// ============================================================================
//  STYLE / SHAPE SETS
// ============================================================================
const styleSets = {

  // ── LANTERN 1 ── tall jade pagoda with lotus umbrella crown
  "vesak-lantern-1": {
    name: "jade-lotus-pagoda",
    sideCount: 12,
    topShape: "lotus-crown",
    bulbShape: "vase",
    lowerTopRadius: 0.45,
    lowerBottomRadius: 1.05,
    upperTopRadius: 1.05,
    upperBottomRadius: 0.45,
    pavilionTopCount: 10,
    pavilionBottomCount: 12,
    miniRadiusTop: 1.52,
    miniRadiusBottom: 1.42,
    sparkleCount: 28,
    petalCount: 18,
    spikeCount: 12,
    scaleY: 1.10,
    tassels: 14,
    dharmaParticles: 36,
    knotCount: 6
  },

  // ── LANTERN 2 ── octagonal ruby crystal tower
  "vesak-lantern-2": {
    name: "ruby-crystal-tower",
    sideCount: 8,
    topShape: "crystal-spire",
    bulbShape: "octahedron-stack",
    lowerTopRadius: 0.25,
    lowerBottomRadius: 1.18,
    upperTopRadius: 1.18,
    upperBottomRadius: 0.25,
    pavilionTopCount: 8,
    pavilionBottomCount: 10,
    miniRadiusTop: 1.62,
    miniRadiusBottom: 1.50,
    sparkleCount: 32,
    petalCount: 16,
    spikeCount: 16,
    scaleY: 1.16,
    tassels: 10,
    dharmaParticles: 28,
    knotCount: 4
  },

  // ── LANTERN 3 ── 16-sided golden sun temple
  "vesak-lantern-3": {
    name: "golden-sun-temple",
    sideCount: 16,
    topShape: "sun-crown",
    bulbShape: "lathe-pot",
    lowerTopRadius: 0.55,
    lowerBottomRadius: 1.12,
    upperTopRadius: 1.12,
    upperBottomRadius: 0.55,
    pavilionTopCount: 12,
    pavilionBottomCount: 16,
    miniRadiusTop: 1.75,
    miniRadiusBottom: 1.58,
    sparkleCount: 40,
    petalCount: 24,
    spikeCount: 18,
    scaleY: 1.18,
    tassels: 18,
    dharmaParticles: 48,
    knotCount: 8
  }
};

// ============================================================================
//  MAIN createLantern
// ============================================================================
export function createLantern(type = "vesak-lantern-1") {
  const keys = Object.keys(colorSets);
  const c = colorSets[type] || colorSets[keys[Math.abs(hashText(type)) % keys.length]];
  const style = styleSets[type] || styleSets["vesak-lantern-1"];
  const seed = Math.abs(hashText(type));

  // ── textures ──────────────────────────────────────────────────────────────
  const T = {
    mandala:  patternTexture("mandala",  c, 512),
    paisley:  patternTexture("paisley",  c, 512),
    wheel:    patternTexture("wheel",    c, 384),
    hatch:    patternTexture("hatch",    c, 256),
    ribs:     patternTexture("ribs",     c, 256),
    base:     patternTexture("base",     c, 512),
    hut:      patternTexture("hut",      c, 256),
    lotus:    patternTexture("lotus",    c, 512),
    crystal:  patternTexture("crystal",  c, 384),
    buddha:   patternTexture("buddha",   c, 512),
    dharma:   patternTexture("dharma",   c, 512),
    filigree: patternTexture("filigree", c, 512)
  };

  // ── structure ─────────────────────────────────────────────────────────────
  const lantern     = new THREE.Group();
  const core        = new THREE.Group();
  const part1Top    = new THREE.Group();
  const part2Middle = new THREE.Group();
  const part3Bottom = new THREE.Group();

  lantern.add(core);
  core.add(part3Bottom);
  core.add(part2Middle);
  core.add(part1Top);

  lantern.userData = {
    time: (seed % 1000) * 0.01,
    core, part1Top, part2Middle, part3Bottom,
    musicPath:       getLanternMusicPath(type),
    styleName:       style.name,
    topSpinSpeed:    0.28 + (seed % 5) / 100,
    middleSpinSpeed: 0.20 + (seed % 4) / 100,
    bottomSpinSpeed: 0.26 + (seed % 5) / 100,
    swayPhase:       (seed % 628) / 100,
    lights:     [],
    patternMats:[],
    glowShells: [],
    pavilions:  [],
    balls:      [],
    ribbons:    [],
    sparkles:   [],
    petals:     [],
    spikes:     [],
    tassels:    [],
    dharmaOrbs: [],
    rings:      [],
    knotMeshes: []
  };
  const U = lantern.userData;

  // ── material helpers ──────────────────────────────────────────────────────
  const texMat = (tex, repX, repY, emI = 1.15) => {
    const t = tex.clone(); t.needsUpdate = true;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repX, repY);
    const m = new THREE.MeshStandardMaterial({
      map: t, emissiveMap: t, emissive: 0xffffff,
      emissiveIntensity: emI, side: THREE.DoubleSide,
      roughness: 0.38, metalness: 0.12
    });
    U.patternMats.push({ mat: m, base: emI, phase: U.patternMats.length * 0.72 });
    return m;
  };

  const trimMat = (emI = 0.8) => new THREE.MeshStandardMaterial({
    color: c.trim, emissive: c.trim, emissiveIntensity: emI,
    roughness: 0.22, metalness: 0.45
  });

  const accentMat = (emI = 0.9) => new THREE.MeshStandardMaterial({
    color: c.accent, emissive: c.accent, emissiveIntensity: emI,
    roughness: 0.20, metalness: 0.30
  });

  const solidGlow = (hex, emI = 1.0) => new THREE.MeshStandardMaterial({
    color: hex, emissive: hex, emissiveIntensity: emI,
    roughness: 0.28, metalness: 0.10
  });

  const glassMat = (hex, opacity = 0.45) => new THREE.MeshBasicMaterial({
    color: hex, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false
  });

  // ── ring helpers ──────────────────────────────────────────────────────────
  const addRing = (parent, y, r, tube = 0.018, emI = 0.8) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 14, 90), trimMat(emI));
    m.position.y = y; m.rotation.x = Math.PI / 2;
    parent.add(m);
    U.rings.push({ mesh: m, phase: y * 1.3 });
    return m;
  };

  const addDoubleRing = (parent, y, r) => {
    addRing(parent, y, r, 0.020, 0.85);
    addRing(parent, y + 0.04, r * 0.94, 0.011, 0.65);
  };

  const addFiligreeRing = (parent, y, r) => {
    // decorative segmented filigree torus
    const seg = 24;
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      const bead = new THREE.Mesh(
        new THREE.SphereGeometry(0.014, 8, 8),
        i % 3 === 0 ? solidGlow(c.glow, 1.1) : trimMat(0.7)
      );
      bead.position.set(Math.sin(a) * r, y, Math.cos(a) * r);
      parent.add(bead);
      U.sparkles.push({ mesh: bead, phase: i * 0.38 + y, base: 0.014 });
    }
    addRing(parent, y, r, 0.008, 0.55);
  };

  // ── sparkle / petal / spike helpers ──────────────────────────────────────
  const addSparkleRing = (parent, y, radius, count) => {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const size = 0.024 + (i % 5) * 0.006;
      const s = new THREE.Mesh(
        new THREE.SphereGeometry(size, 10, 10),
        solidGlow(i % 2 === 0 ? c.glow : c.accent, 1.3)
      );
      s.position.set(Math.sin(a) * radius, y + Math.sin(i * 1.7) * 0.03, Math.cos(a) * radius);
      s.userData.phase = i * 0.45 + y;
      parent.add(s);
      U.sparkles.push({ mesh: s, phase: s.userData.phase, base: size });
    }
  };

  const addPetalRing = (parent, y, radius, count, scale = 1) => {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const p = new THREE.Mesh(
        new THREE.SphereGeometry(0.09 * scale, 18, 12),
        i % 2 === 0 ? solidGlow(c.glow, 1.0) : accentMat(0.8)
      );
      p.scale.set(2.0, 0.32, 0.85);
      p.position.set(Math.sin(a) * radius, y, Math.cos(a) * radius);
      p.rotation.y = a; p.rotation.z = Math.PI / 7;
      p.userData.phase = i * 0.4 + y;
      parent.add(p);
      U.petals.push({ mesh: p, phase: p.userData.phase });
    }
  };

  const addCrystalSpikes = (parent, y, radius, count, pointUp = true) => {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const s = new THREE.Mesh(
        new THREE.ConeGeometry(0.065, 0.32, 6),
        i % 2 === 0 ? trimMat(1.0) : solidGlow(c.glow, 1.0)
      );
      s.position.set(Math.sin(a) * radius, y, Math.cos(a) * radius);
      s.rotation.y = a; s.rotation.x = pointUp ? 0 : Math.PI;
      s.userData.phase = i * 0.55 + y;
      parent.add(s);
      U.spikes.push({ mesh: s, phase: s.userData.phase });
    }
  };

  // ── jewelled crown helper ─────────────────────────────────────────────────
  const addJewelCrown = (parent, y, radius, count) => {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      // alternating diamond and ball
      const geo = i % 2 === 0
        ? new THREE.OctahedronGeometry(0.075, 0)
        : new THREE.SphereGeometry(0.055, 12, 12);
      const j = new THREE.Mesh(geo, solidGlow(i % 3 === 0 ? c.glow : i % 3 === 1 ? c.trim : c.accent, 1.2));
      j.position.set(Math.sin(a) * radius, y + (i % 2) * 0.06, Math.cos(a) * radius);
      j.userData.phase = i * 0.5 + y;
      parent.add(j);
      U.sparkles.push({ mesh: j, phase: j.userData.phase, base: 0.065 });
    }
  };

  // ── dharma particle orb ring ──────────────────────────────────────────────
  const addDharmaHalo = (parent, y, radius, count) => {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const elev = Math.sin(i * 0.9) * 0.35;
      const size = 0.018 + (i % 4) * 0.008;
      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(size, 8, 8),
        solidGlow(
          i % 3 === 0 ? c.glow :
          i % 3 === 1 ? c.trim : c.accent,
          1.4
        )
      );
      orb.position.set(Math.sin(a) * radius, y + elev, Math.cos(a) * radius);
      orb.userData = { phase: i * 0.42, r: radius, baseY: y + elev };
      parent.add(orb);
      U.dharmaOrbs.push({ mesh: orb, phase: i * 0.42, r: radius, baseY: y + elev, a });
    }
  };

  // ── torus-knot accent ─────────────────────────────────────────────────────
  const addTorusKnot = (parent, y, p = 2, q = 3) => {
    const tk = new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.38, 0.04, 120, 12, p, q),
      trimMat(0.95)
    );
    tk.position.y = y;
    parent.add(tk);
    U.knotMeshes.push({ mesh: tk, phase: y });
    return tk;
  };

  // ── tassel chain ─────────────────────────────────────────────────────────
  const buildTassel = (len = 5) => {
    const g = new THREE.Group();
    for (let i = 0; i < len; i++) {
      const bead = new THREE.Mesh(
        i % 2 === 0
          ? new THREE.SphereGeometry(0.028, 10, 10)
          : new THREE.CylinderGeometry(0.012, 0.012, 0.06, 6),
        solidGlow(i % 3 === 0 ? c.glow : i % 3 === 1 ? c.trim : c.accent, 0.9)
      );
      bead.position.y = -i * 0.11;
      g.add(bead);
    }
    return g;
  };

  const placeTassels = (parent, count, radius, y) => {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const t = buildTassel(5 + (i % 3));
      t.position.set(Math.sin(a) * radius, y, Math.cos(a) * radius);
      t.userData.phase = i * 0.6;
      parent.add(t);
      U.tassels.push({ group: t, phase: t.userData.phase });
    }
  };

  // ── lathe vase helper for golden lantern ──────────────────────────────────
  const makeLatheVase = () => {
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const t2 = i / 12;
      const r = 0.32 + Math.sin(t2 * Math.PI) * 0.28 + Math.sin(t2 * Math.PI * 3) * 0.06;
      pts.push(new THREE.Vector2(r, (t2 - 0.5) * 1.1));
    }
    return new THREE.LatheGeometry(pts, 24);
  };

  // ==========================================================================
  //  PART 3 — BOTTOM SECTION
  // ==========================================================================

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.52, style.lowerBottomRadius + 0.10, 0.88, style.sideCount, 1, true),
    texMat(T.buddha, style.sideCount, 1.1, 1.25)
  );
  base.position.y = -2.55; base.scale.y = style.scaleY;
  part3Bottom.add(base);

  addDoubleRing(part3Bottom, -3.02, style.lowerBottomRadius + 0.10);
  addDoubleRing(part3Bottom, -2.15, 0.55);
  addFiligreeRing(part3Bottom, -2.09, style.lowerBottomRadius * 0.96);
  addPetalRing(part3Bottom, -2.08, style.lowerBottomRadius * 0.96, style.petalCount, 1.05);
  addCrystalSpikes(part3Bottom, -3.10, style.lowerBottomRadius * 0.95, style.spikeCount, false);
  addJewelCrown(part3Bottom, -3.14, style.lowerBottomRadius * 0.80, style.spikeCount);

  const lower = new THREE.Mesh(
    new THREE.CylinderGeometry(style.lowerTopRadius, style.lowerBottomRadius, 1.55, style.sideCount, 1, true),
    texMat(T.mandala, style.sideCount, 1.18, 1.32)
  );
  lower.position.y = -1.35; lower.scale.y = style.scaleY;
  part3Bottom.add(lower);

  addDoubleRing(part3Bottom, -0.62, style.lowerTopRadius + 0.05);
  addDoubleRing(part3Bottom, -2.12, style.lowerBottomRadius);
  addSparkleRing(part3Bottom, -1.85, style.lowerBottomRadius * 0.86, style.sparkleCount);
  addDharmaHalo(part3Bottom, -1.4, style.lowerBottomRadius * 1.15, style.dharmaParticles);

  // bottom torus knot accent
  if (style.knotCount >= 4) {
    addTorusKnot(part3Bottom, -2.8, 2, 3);
  }

  placeTassels(part3Bottom, style.tassels, style.lowerBottomRadius * 0.88, -3.15);

  // ==========================================================================
  //  PART 2 — MIDDLE SECTION (bulb)
  // ==========================================================================

  let bulb;

  if (style.bulbShape === "vase") {
    // jade-lotus lantern: lathe vase bulb
    bulb = new THREE.Mesh(makeLatheVase(), texMat(T.filigree, 12, 1.2, 1.5));
    bulb.scale.set(0.95, 0.92, 0.95);
    addPetalRing(part2Middle, -0.36, 0.64, style.petalCount, 1.08);
    addFiligreeRing(part2Middle, 0.22, 0.62);
  } else if (style.bulbShape === "octahedron-stack") {
    // ruby: stacked octahedra
    bulb = new THREE.Group();
    [-0.25, 0.0, 0.25].forEach((dy, i) => {
      const o = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.42 - i * 0.06, 1),
        texMat(T.crystal, 8, 1, 1.5)
      );
      o.position.y = dy; o.rotation.y = i * Math.PI / 6;
      bulb.add(o);
    });
    addCrystalSpikes(part2Middle, -0.38, 0.68, style.spikeCount, true);
    addCrystalSpikes(part2Middle, 0.28, 0.68, style.spikeCount, false);
  } else if (style.bulbShape === "lathe-pot") {
    // gold: round lathe pot
    bulb = new THREE.Mesh(makeLatheVase(), texMat(T.dharma, 16, 1.1, 1.55));
    bulb.scale.set(1.35, 0.82, 1.35);
    addPetalRing(part2Middle, -0.36, 0.68, style.petalCount, 1.1);
    addTorusKnot(part2Middle, 0.0, 3, 2);
  } else {
    bulb = new THREE.Mesh(new THREE.SphereGeometry(0.52, 32, 24), texMat(T.ribs, 16, 1, 1.4));
    bulb.scale.set(1.05, 0.95, 1.05);
  }

  if (bulb instanceof THREE.Group) {
    bulb.position.y = -0.35;
    part2Middle.add(bulb);
  } else {
    bulb.position.y = -0.35;
    part2Middle.add(bulb);
  }

  addDoubleRing(part2Middle, -0.35, 0.54);
  addDoubleRing(part2Middle, -0.10, 0.38);
  addDoubleRing(part2Middle, -0.64, 0.38);

  const upper = new THREE.Mesh(
    new THREE.CylinderGeometry(style.upperTopRadius, style.upperBottomRadius, 1.55, style.sideCount, 1, true),
    texMat(T.paisley, style.sideCount, 1.14, 1.28)
  );
  upper.position.y = 0.52; upper.scale.y = style.scaleY;
  part2Middle.add(upper);

  addDoubleRing(part2Middle, 1.28, style.upperTopRadius + 0.04);
  addDoubleRing(part2Middle, -0.12, style.upperBottomRadius + 0.04);
  addFiligreeRing(part2Middle, 0.78, style.upperTopRadius * 0.92);
  addPetalRing(part2Middle, 1.24, style.upperTopRadius * 0.96, style.petalCount, 0.95);
  addSparkleRing(part2Middle, 0.74, style.upperTopRadius * 0.82, style.sparkleCount);
  addJewelCrown(part2Middle, 1.32, style.upperTopRadius * 0.85, style.petalCount);

  // glow shells
  [
    [0.65, c.glow,   0.58],
    [1.50, c.accent, 0.16],
    [2.95, c.light,  0.10]
  ].forEach(([r, col, op], i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 24), glassMat(col, op));
    m.position.y = -0.35;
    part2Middle.add(m);
    U.glowShells.push({ mesh: m, base: op });
  });

  // ==========================================================================
  //  PART 1 — TOP SECTION
  // ==========================================================================

  if (style.topShape === "lotus-crown") {
    // multi-layer lotus petal crown + sphere centre
    const centre = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 28, 20),
      texMat(T.lotus, 10, 1, 1.45)
    );
    centre.position.y = 1.62; centre.scale.set(1.1, 0.85, 1.1);
    part1Top.add(centre);

    addPetalRing(part1Top, 1.55, 0.58, style.petalCount, 1.15);
    addPetalRing(part1Top, 1.70, 0.44, 10, 0.85);
    addFiligreeRing(part1Top, 1.92, 0.65);
    addJewelCrown(part1Top, 2.02, 0.6, 12);

  } else if (style.topShape === "crystal-spire") {
    // stacked crystal diamonds + spire
    [0, 0.38, 0.72].forEach((dy, i) => {
      const d = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.5 - i * 0.14, 1),
        texMat(T.wheel, 8, 1, 1.3)
      );
      d.position.y = 1.55 + dy;
      d.scale.set(1.1, 0.92, 1.1);
      part1Top.add(d);
    });
    addCrystalSpikes(part1Top, 1.62, 0.68, style.spikeCount, true);
    addCrystalSpikes(part1Top, 2.1, 0.44, 8, true);

  } else if (style.topShape === "sun-crown") {
    // icosphere with radiating spikes
    const ico = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.46, 1),
      texMat(T.dharma, 8, 1, 1.45)
    );
    ico.position.y = 1.68;
    part1Top.add(ico);

    addCrystalSpikes(part1Top, 1.68, 0.56, style.spikeCount, true);
    addPetalRing(part1Top, 1.68, 0.7, style.petalCount, 0.9);
    addFiligreeRing(part1Top, 2.06, 0.7);
  }

  // shared top ring & roof cap
  addDoubleRing(part1Top, 1.96, 0.7);
  addDoubleRing(part1Top, 1.28, 0.58);

  // roof cone
  const roofGeo =
    style.topShape === "sun-crown"
      ? new THREE.ConeGeometry(1.05, 0.48, 16)
      : style.topShape === "crystal-spire"
        ? new THREE.ConeGeometry(0.68, 0.72, 8)
        : new THREE.ConeGeometry(0.88, 0.52, 12);

  const roof = new THREE.Mesh(roofGeo, trimMat(1.05));
  roof.position.y = 2.24;
  part1Top.add(roof);

  // layered eave rings on roof
  [0.0, -0.12, -0.24].forEach((dy, i) => {
    addRing(part1Top, 2.24 + dy, 0.85 - i * 0.12, 0.016, 0.85 - i * 0.12);
  });

  // tip ball + star
  const tipBall = new THREE.Mesh(new THREE.SphereGeometry(0.095, 20, 20), solidGlow(c.glow, 1.4));
  tipBall.position.y = 2.62;
  part1Top.add(tipBall);
  U.sparkles.push({ mesh: tipBall, phase: 3.5, base: 0.095 });

  const topStar = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), solidGlow(c.accent, 1.2));
  topStar.position.y = 2.82;
  part1Top.add(topStar);
  U.sparkles.push({ mesh: topStar, phase: 2.1, base: 0.12 });

  // top dharma halo
  addDharmaHalo(part1Top, 2.0, 0.92, Math.floor(style.dharmaParticles * 0.5));

  // ==========================================================================
  //  LIGHTS
  // ==========================================================================
  [
    [ 0.55, c.light,  3.8, 7.5],
    [-1.35, c.light,  3.2, 6.5],
    [-0.35, c.glow,   2.6, 5.5],
    [ 1.55, c.accent, 1.9, 4.5],
    [ 2.62, c.trim,   1.4, 3.2]
  ].forEach(([y, col, intensity, dist]) => {
    const L = new THREE.PointLight(col, intensity, dist, 1.5);
    L.position.y = y;
    core.add(L);
    U.lights.push({ light: L, base: intensity });
  });

  // ==========================================================================
  //  MINI PAVILION LANTERNS
  // ==========================================================================
  const buildPavilion = () => {
    const g = new THREE.Group();

    const thread = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, 0.20, 6),
      solidGlow(0xffffff, 0)
    );
    thread.position.y = -0.10; g.add(thread);

    const bodyGeo =
      style.name === "ruby-crystal-tower"
        ? new THREE.OctahedronGeometry(0.2, 0)
        : style.name === "golden-sun-temple"
          ? new THREE.IcosahedronGeometry(0.18, 0)
          : new THREE.BoxGeometry(0.32, 0.32, 0.32);

    const body = new THREE.Mesh(bodyGeo, texMat(T.hut, 1, 1, 1.2));
    body.position.y = -0.33; g.add(body);

    const roofSides = style.name === "jade-lotus-pagoda" ? 8 : style.name === "golden-sun-temple" ? 10 : 6;
    const rf = new THREE.Mesh(new THREE.ConeGeometry(0.30, 0.26, roofSides), trimMat(0.85));
    rf.position.y = -0.09; rf.rotation.y = Math.PI / roofSides;
    g.add(rf);

    // layered eave
    [0, 1].forEach(i => {
      const eave = new THREE.Mesh(new THREE.TorusGeometry(0.24 - i * 0.05, 0.012, 8, 6), trimMat(0.7 - i * 0.1));
      eave.position.y = -0.18 - i * 0.1; eave.rotation.x = Math.PI / 2;
      g.add(eave);
    });

    const lowerBead = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), solidGlow(c.glow, 1.15));
    lowerBead.position.y = -0.65; g.add(lowerBead);

    const miniGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.20, 12, 12),
      glassMat(c.glow, 0.20)
    );
    miniGlow.position.y = -0.33; g.add(miniGlow);

    return g;
  };

  const arm = (parent, angle, R, y) => {
    const a2 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.014, R - 0.44, 6),
      trimMat(0.48)
    );
    a2.rotation.z = Math.PI / 2; a2.rotation.y = -angle;
    const mid = (R + 0.44) / 2;
    a2.position.set(Math.sin(angle) * mid, y, Math.cos(angle) * mid);
    parent.add(a2);
  };

  const placeTier = (parent, count, R, y, startA) => {
    for (let i = 0; i < count; i++) {
      const angle = startA + (i / count) * Math.PI * 2;
      arm(parent, angle, R, y);
      const p = buildPavilion();
      p.position.set(Math.sin(angle) * R, y, Math.cos(angle) * R);
      p.rotation.y = angle;
      p.userData.phase = i * 0.75 + y;
      parent.add(p);
      U.pavilions.push({ group: p, phase: p.userData.phase });
    }
  };

  placeTier(part2Middle, style.pavilionTopCount, style.miniRadiusTop, 0.58, 0.35);
  placeTier(part3Bottom, style.pavilionBottomCount, style.miniRadiusBottom, -1.28, 0.0);

  // ==========================================================================
  //  CURVED RIBBONS
  // ==========================================================================
  const makeRibbon = (angle, y, flip) => {
    const s = flip ? -1 : 1;
    const pts = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.58 * s, 0.22, 0.06),
      new THREE.Vector3(1.12 * s, 0.07, 0.0),
      new THREE.Vector3(1.48 * s, -0.32, -0.04),
      new THREE.Vector3(1.16 * s, -0.58, 0.02),
      new THREE.Vector3(0.88 * s, -0.34, 0.06)
    ];
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.034, 8, false);
    const m = new THREE.Mesh(geo, solidGlow(c.paper, 1.08));
    m.scale.set(1, 1, 0.36);
    const wrap = new THREE.Group();
    wrap.add(m);
    wrap.position.set(Math.sin(angle) * 0.56, y, Math.cos(angle) * 0.56);
    wrap.rotation.y = angle + (flip ? Math.PI : 0);
    wrap.userData.phase = angle + y;
    part2Middle.add(wrap);
    U.ribbons.push({ group: wrap, phase: wrap.userData.phase });
  };

  makeRibbon(0.9, 0.56, false); makeRibbon(0.9, 0.56, true);
  makeRibbon(Math.PI - 0.9, -1.0, false); makeRibbon(Math.PI - 0.9, -1.0, true);
  makeRibbon(2.25, 0.22, false); makeRibbon(2.25, 0.22, true);

  // ==========================================================================
  //  HANGING BALLS / BEADS
  // ==========================================================================
  const buildBall = () => {
    const g = new THREE.Group();
    const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.38, 6), solidGlow(0xffffff, 0));
    thread.position.y = -0.19; g.add(thread);

    const ballGeo =
      style.name === "ruby-crystal-tower" ? new THREE.OctahedronGeometry(0.10, 0)
      : style.name === "golden-sun-temple" ? new THREE.IcosahedronGeometry(0.10, 0)
      : new THREE.SphereGeometry(0.10, 16, 16);

    const ball = new THREE.Mesh(ballGeo, solidGlow(c.glow, 1.15));
    ball.position.y = -0.42; g.add(ball);

    for (let j = 0; j < 4; j++) {
      const bead = new THREE.Mesh(
        new THREE.SphereGeometry(0.026, 8, 8),
        solidGlow(j % 2 ? c.glow : c.accent, 0.95)
      );
      bead.position.y = -0.55 - j * 0.07; g.add(bead);
    }
    return g;
  };

  const hangingCount = style.name === "golden-sun-temple" ? 18 : style.name === "ruby-crystal-tower" ? 12 : 14;
  for (let i = 0; i < hangingCount; i++) {
    const a = (i / hangingCount) * Math.PI * 2;
    const R = i % 2 === 0 ? 1.06 : 0.86;
    const b = buildBall();
    b.position.set(Math.sin(a) * R, -1.82 - (i % 3) * 0.09, Math.cos(a) * R);
    b.userData.phase = i * 0.65;
    part3Bottom.add(b);
    U.balls.push({ group: b, phase: b.userData.phase });
  }

  // ==========================================================================
  //  FINAL POSITION / SCALE
  // ==========================================================================
  lantern.position.set(0, 0.5, -3);
  lantern.scale.setScalar(0.5);

  return lantern;
}

// ============================================================================
//  ANIMATION — updateLantern
// ============================================================================
export function updateLantern(lantern, delta = 0.016) {
  if (!lantern) return;
  const U = lantern.userData;
  U.time += delta;
  const t = U.time;

  // sway
  if (U.core) U.core.position.y = Math.sin(t * 0.9 + U.swayPhase) * 0.075;

  // rotation
  if (U.part1Top)    U.part1Top.rotation.y    += delta * U.topSpinSpeed;
  if (U.part2Middle) U.part2Middle.rotation.y -= delta * U.middleSpinSpeed;
  if (U.part3Bottom) U.part3Bottom.rotation.y += delta * U.bottomSpinSpeed;

  lantern.rotation.z = Math.sin(t * 0.7 + U.swayPhase) * 0.05;
  lantern.rotation.x = Math.sin(t * 0.5 + U.swayPhase + 1.2) * 0.038;

  const flicker = 0.85 + Math.sin(t * 8) * 0.09 + Math.sin(t * 19) * 0.05 + Math.random() * 0.04;

  // lights
  U.lights.forEach(o => { o.light.intensity = o.base * flicker; });

  // pattern materials
  U.patternMats.forEach(p => {
    p.mat.emissiveIntensity = p.base + Math.sin(t * 2.4 + p.phase) * 0.22 + (flicker - 0.85) * 0.5;
  });

  // glow shells — breathing
  U.glowShells.forEach((s, i) => {
    const k = 1 + Math.sin(t * (2.7 + i * 0.35)) * 0.08;
    s.mesh.scale.setScalar(k);
    if (s.mesh.material) s.mesh.material.opacity = s.base * (0.78 + Math.abs(Math.sin(t * 3 + i)) * 0.6);
  });

  // pavilions
  U.pavilions.forEach(p => {
    p.group.rotation.z = Math.sin(t * 1.6 + p.phase) * 0.18;
    p.group.rotation.x = Math.cos(t * 1.3 + p.phase) * 0.12;
  });

  // hanging balls
  U.balls.forEach(b => {
    b.group.rotation.z = Math.sin(t * 1.9 + b.phase) * 0.28;
    b.group.rotation.x = Math.cos(t * 1.5 + b.phase) * 0.18;
  });

  // ribbons
  U.ribbons.forEach(r => { r.group.rotation.z = Math.sin(t * 1.4 + r.phase) * 0.17; });

  // sparkles / jewels — pulse scale
  U.sparkles.forEach(s => {
    const k = 0.7 + Math.abs(Math.sin(t * 3.4 + s.phase)) * 0.8;
    s.mesh.scale.setScalar(k);
  });

  // petals — bloom animation
  U.petals.forEach(p => {
    const k = 1 + Math.sin(t * 2.2 + p.phase) * 0.10;
    p.mesh.scale.y = 0.32 * k;
    p.mesh.scale.x = 2.0 + Math.sin(t * 1.8 + p.phase) * 0.2;
  });

  // spikes — gentle pulse rotation
  U.spikes.forEach(s => {
    s.mesh.rotation.z = Math.sin(t * 1.8 + s.phase) * 0.09;
    s.mesh.scale.y = 1 + Math.sin(t * 2.6 + s.phase) * 0.12;
  });

  // tassels — swing
  U.tassels.forEach(ts => {
    ts.group.rotation.z = Math.sin(t * 2.1 + ts.phase) * 0.22;
    ts.group.rotation.x = Math.cos(t * 1.7 + ts.phase) * 0.14;
  });

  // dharma orbs — orbit & bob
  U.dharmaOrbs.forEach(o => {
    const angle = o.a + t * 0.55 + o.phase * 0.1;
    o.mesh.position.x = Math.sin(angle) * o.r;
    o.mesh.position.z = Math.cos(angle) * o.r;
    o.mesh.position.y = o.baseY + Math.sin(t * 2.2 + o.phase) * 0.08;
    const k = 0.6 + Math.abs(Math.sin(t * 3.0 + o.phase)) * 0.9;
    o.mesh.scale.setScalar(k);
  });

  // rings — ripple wave
  U.rings.forEach((r, i) => {
    const scale = 1 + Math.sin(t * 1.5 + r.phase + i * 0.4) * 0.035;
    r.mesh.scale.x = scale; r.mesh.scale.z = scale;
  });

  // torus knots — slow spin
  U.knotMeshes.forEach(k => {
    k.mesh.rotation.y += delta * 0.45;
    k.mesh.rotation.x = Math.sin(t * 0.8 + k.phase) * 0.25;
  });
}

// ============================================================================
//  PROCEDURAL CANVAS PATTERN TEXTURES
//  Includes: buddha, dharma wheel, filigree, plus original patterns
// ============================================================================
function patternTexture(kind, c, size) {
  const key = `${kind}_${c.paper}_${c.glow}_${c.trim}_${size}`;
  if (_texCache.has(key)) return _texCache.get(key);

  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  const x = cv.getContext("2d");

  const paper  = css(c.paper);
  const line   = css(c.line);
  const glow   = css(c.glow);
  const trim   = css(c.trim);
  const accent = css(c.accent);
  const S = size, C = size / 2;

  // radial background
  const g = x.createRadialGradient(C, C, S * 0.03, C, C, S * 0.75);
  g.addColorStop(0, glow); g.addColorStop(0.35, paper); g.addColorStop(1, line);
  x.fillStyle = g; x.fillRect(0, 0, S, S);

  x.strokeStyle = line; x.fillStyle = line;
  x.lineCap = "round"; x.lineJoin = "round";

  const lw = v => { x.lineWidth = S * v; };

  const circle = (cx, cy, r, fill) => {
    x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2);
    fill ? x.fill() : x.stroke();
  };

  const frame = () => {
    lw(0.018); x.strokeStyle = line;
    x.strokeRect(S * 0.04, S * 0.04, S * 0.92, S * 0.92);
    lw(0.007); x.strokeStyle = trim;
    x.strokeRect(S * 0.08, S * 0.08, S * 0.84, S * 0.84);
    lw(0.004); x.strokeStyle = accent;
    x.strokeRect(S * 0.13, S * 0.13, S * 0.74, S * 0.74);
    x.strokeStyle = line;
  };

  // ── BUDDHA SILHOUETTE TEXTURE ─────────────────────────────────────────────
  if (kind === "buddha") {
    // lotus seat
    x.fillStyle = trim; x.strokeStyle = trim; lw(0.006);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      x.beginPath();
      x.ellipse(C + Math.cos(a) * S * 0.32, C + Math.sin(a) * S * 0.15 + S * 0.28,
        S * 0.06, S * 0.09, a, 0, Math.PI * 2);
      x.fill();
    }
    // body
    x.fillStyle = accent;
    x.beginPath();
    x.ellipse(C, C + S * 0.06, S * 0.18, S * 0.22, 0, 0, Math.PI * 2);
    x.fill();
    // head
    x.fillStyle = accent;
    circle(C, C - S * 0.18, S * 0.12, true);
    // halo
    x.strokeStyle = trim; lw(0.008);
    circle(C, C - S * 0.18, S * 0.19, false);
    lw(0.004); circle(C, C - S * 0.18, S * 0.22, false);
    // ushnisha (topknot)
    x.fillStyle = trim;
    circle(C, C - S * 0.31, S * 0.04, true);
    // rays from halo
    x.strokeStyle = glow; lw(0.005);
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      x.beginPath();
      x.moveTo(C + Math.cos(a) * S * 0.22, C - S * 0.18 + Math.sin(a) * S * 0.22);
      x.lineTo(C + Math.cos(a) * S * 0.36, C - S * 0.18 + Math.sin(a) * S * 0.36);
      x.stroke();
    }
    // border rings
    x.strokeStyle = trim; lw(0.008);
    circle(C, C, S * 0.46, false);
    // dots on border
    x.fillStyle = glow;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      circle(C + Math.cos(a) * S * 0.46, C + Math.sin(a) * S * 0.46, S * 0.012, true);
    }
    frame();
  }

  // ── DHARMA WHEEL TEXTURE ──────────────────────────────────────────────────
  else if (kind === "dharma") {
    // outer rim
    x.strokeStyle = trim; lw(0.014);
    circle(C, C, S * 0.42, false);
    // inner rim
    lw(0.008); circle(C, C, S * 0.37, false);
    // hub
    lw(0.012); circle(C, C, S * 0.10, false);
    x.fillStyle = accent; circle(C, C, S * 0.07, true);
    // 8 spokes
    lw(0.01); x.strokeStyle = accent;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      x.beginPath();
      x.moveTo(C + Math.cos(a) * S * 0.10, C + Math.sin(a) * S * 0.10);
      x.lineTo(C + Math.cos(a) * S * 0.37, C + Math.sin(a) * S * 0.37);
      x.stroke();
    }
    // decorative spoke dots
    x.fillStyle = glow;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      circle(C + Math.cos(a) * S * 0.26, C + Math.sin(a) * S * 0.26, S * 0.016, true);
    }
    // outer decorative dots
    x.fillStyle = trim;
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      circle(C + Math.cos(a) * S * 0.44, C + Math.sin(a) * S * 0.44, S * 0.010, true);
    }
    frame();
  }

  // ── FILIGREE TEXTURE ─────────────────────────────────────────────────────
  else if (kind === "filigree") {
    lw(0.006); x.strokeStyle = trim;
    // concentric scrollwork
    for (let i = 0; i < 5; i++) {
      const r = S * (0.1 + i * 0.08);
      x.beginPath();
      for (let j = 0; j <= 360; j++) {
        const a = (j / 360) * Math.PI * 2;
        const rr = r + Math.sin(a * 6) * S * 0.02;
        const px = C + Math.cos(a) * rr;
        const py = C + Math.sin(a) * rr;
        j === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
      }
      x.closePath(); x.stroke();
    }
    // corner flourishes
    x.strokeStyle = accent; lw(0.005);
    [[0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8]].forEach(([fx, fy]) => {
      const cx2 = fx * S, cy2 = fy * S, r = S * 0.08;
      x.beginPath(); x.arc(cx2, cy2, r, 0, Math.PI * 2); x.stroke();
      x.beginPath(); x.arc(cx2, cy2, r * 0.5, 0, Math.PI * 2); x.stroke();
      x.fillStyle = glow; circle(cx2, cy2, r * 0.15, true);
    });
    x.fillStyle = accent; circle(C, C, S * 0.04, true);
    frame();
  }

  // ── MANDALA / BASE / LOTUS ────────────────────────────────────────────────
  else if (kind === "mandala" || kind === "base" || kind === "lotus") {
    lw(0.009);
    const rings = kind === "base" ? 4 : 7;
    for (let i = 1; i <= rings; i++) circle(C, C, S * 0.46 * (i / rings), false);
    lw(0.005);
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      x.beginPath(); x.moveTo(C, C);
      x.lineTo(C + Math.cos(a) * S * 0.46, C + Math.sin(a) * S * 0.46); x.stroke();
    }
    lw(0.006);
    const petals = kind === "lotus" ? 28 : 20;
    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * Math.PI * 2;
      circle(C + Math.cos(a) * S * 0.30, C + Math.sin(a) * S * 0.30, S * 0.052, false);
    }
    x.fillStyle = trim;
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      circle(C + Math.cos(a) * S * 0.40, C + Math.sin(a) * S * 0.40, S * 0.013, true);
    }
    x.fillStyle = accent; circle(C, C, S * 0.065, true);
    frame();
  }

  // ── PAISLEY ───────────────────────────────────────────────────────────────
  else if (kind === "paisley") {
    lw(0.007);
    for (let gy = 0; gy < 3; gy++) for (let gx = 0; gx < 3; gx++) {
      const cx2 = (gx + 0.5) * S / 3, cy2 = (gy + 0.5) * S / 3, r = S / 7;
      x.beginPath();
      x.moveTo(cx2 + r, cy2);
      x.quadraticCurveTo(cx2 + r, cy2 - r * 1.45, cx2 - r * 0.3, cy2 - r * 0.9);
      x.quadraticCurveTo(cx2 - r * 1.35, cy2 - r * 0.4, cx2 - r * 0.2, cy2 + r * 0.65);
      x.quadraticCurveTo(cx2 + r * 0.65, cy2 + r * 1.1, cx2 + r, cy2); x.stroke();
      lw(0.004); circle(cx2, cy2, r * 0.42, false); circle(cx2, cy2, r * 0.16, true); lw(0.007);
    }
    frame();
  }

  // ── WHEEL ─────────────────────────────────────────────────────────────────
  else if (kind === "wheel") {
    lw(0.012); circle(C, C, S * 0.40, false);
    lw(0.008); circle(C, C, S * 0.36, false); circle(C, C, S * 0.14, false);
    x.fillStyle = accent; circle(C, C, S * 0.055, true);
    lw(0.010);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      x.beginPath();
      x.moveTo(C + Math.cos(a) * S * 0.055, C + Math.sin(a) * S * 0.055);
      x.lineTo(C + Math.cos(a) * S * 0.36, C + Math.sin(a) * S * 0.36); x.stroke();
    }
    x.fillStyle = trim;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      circle(C + Math.cos(a) * S * 0.40, C + Math.sin(a) * S * 0.40, S * 0.013, true);
    }
    frame();
  }

  // ── HUT / HATCH ───────────────────────────────────────────────────────────
  else if (kind === "hut" || kind === "hatch") {
    lw(0.004);
    for (let i = 1; i < 12; i++) {
      x.beginPath(); x.moveTo(S * i / 12, S * 0.12); x.lineTo(S * i / 12, S * 0.95); x.stroke();
      x.beginPath(); x.moveTo(S * 0.05, S * i / 12); x.lineTo(S * 0.95, S * i / 12); x.stroke();
    }
    lw(0.012);
    x.beginPath(); x.moveTo(S * 0.5, S * 0.05);
    x.lineTo(S * 0.88, S * 0.30); x.lineTo(S * 0.12, S * 0.30); x.closePath(); x.stroke();
    lw(0.010); circle(C, S * 0.62, S * 0.20, false); circle(C, S * 0.62, S * 0.07, false);
    frame();
  }

  // ── RIBS ─────────────────────────────────────────────────────────────────
  else if (kind === "ribs") {
    lw(0.042);
    for (let i = 0; i < 5; i++) {
      x.beginPath(); x.moveTo(S * (i + 0.5) / 5, 0); x.lineTo(S * (i + 0.5) / 5, S); x.stroke();
    }
    lw(0.012); x.strokeStyle = trim;
    for (let i = 0; i < 5; i++) {
      x.beginPath(); x.moveTo(S * i / 5, 0); x.lineTo(S * i / 5, S); x.stroke();
    }
  }

  // ── CRYSTAL ───────────────────────────────────────────────────────────────
  else if (kind === "crystal") {
    lw(0.012);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      x.beginPath(); x.moveTo(C, C);
      x.lineTo(C + Math.cos(a) * S * 0.48, C + Math.sin(a) * S * 0.48); x.stroke();
    }
    lw(0.007); x.strokeStyle = trim;
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i / 4) * Math.PI * 2;
      x.beginPath(); x.moveTo(C, C);
      x.lineTo(C + Math.cos(a) * S * 0.38, C + Math.sin(a) * S * 0.38); x.stroke();
    }
    x.fillStyle = accent; circle(C, C, S * 0.065, true);
    frame();
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  if (tex.anisotropy !== undefined) tex.anisotropy = 4;
  _texCache.set(key, tex);
  return tex;
}

// ── utility ──────────────────────────────────────────────────────────────────
function css(h) { return "#" + (h >>> 0).toString(16).padStart(6, "0").slice(-6); }

function hashText(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i); hash |= 0;
  }
  return hash;
}