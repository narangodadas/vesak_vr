// ============================================================================
//  Vesak Kūdu — Enhanced Dark Theme Lanterns
//  Lantern 2: Dark Red Theme
//  Lantern 3: Dark Green Theme
//  Added: more shapes, petals, crystal spikes, sparkle rings, richer animation
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
    // Dark orange / gold temple theme
    "vesak-lantern-1": {
      paper: 0x4a0015,
      line: 0x120005,
      glow: 0xff2bd6,
      trim: 0x00e5ff,
      light: 0xff1744,
      accent: 0xff9bd8
    },

    // Lantern 2 — FULL DARK RED THEME
    "vesak-lantern-2": {
      paper: 0x5a0008,
      line: 0x120003,
      glow: 0xff1744,
      trim: 0x9b111e,
      light: 0xff3b30,
      accent: 0xff8a65
    },

    // Lantern 3 — FULL DARK GREEN THEME
    "vesak-lantern-3": {
       paper: 0x7a3b00,
      line: 0x180900,
      glow: 0xffb300,
      trim: 0xffd36a,
      light: 0xff7300,
      accent: 0xfff1a8
    },

    // Dark golden theme
    "vesak-lantern-4": {
      paper: 0x7a3b00,
      line: 0x180900,
      glow: 0xffb300,
      trim: 0xffd36a,
      light: 0xff7300,
      accent: 0xfff1a8
    },

    // Dark pink / cyan theme
    "vesak-lantern-5": {
      paper: 0x4a0015,
      line: 0x120005,
      glow: 0xff2bd6,
      trim: 0x00e5ff,
      light: 0xff1744,
      accent: 0xff9bd8
    }
  };

  const styleSets = {
    "vesak-lantern-1": {
      name: "dark-temple-tower",
      sideCount: 10,
      topShape: "pagoda",
      bulbShape: "sphere",
      lowerTopRadius: 0.35,
      lowerBottomRadius: 0.95,
      upperTopRadius: 0.92,
      upperBottomRadius: 0.35,
      pavilionTopCount: 8,
      pavilionBottomCount: 10,
      miniRadiusTop: 1.45,
      miniRadiusBottom: 1.35,
      sparkleCount: 24,
      petalCount: 14,
      spikeCount: 10,
      scaleY: 1.06
    },

    // Lantern 2 — red diamond/crystal style
    "vesak-lantern-2": {
      name: "dark-red-crystal",
      sideCount: 8,
      topShape: "diamond",
      bulbShape: "diamond",
      lowerTopRadius: 0.22,
      lowerBottomRadius: 1.12,
      upperTopRadius: 1.12,
      upperBottomRadius: 0.22,
      pavilionTopCount: 10,
      pavilionBottomCount: 12,
      miniRadiusTop: 1.6,
      miniRadiusBottom: 1.48,
      sparkleCount: 32,
      petalCount: 16,
      spikeCount: 12,
      scaleY: 1.14
    },

    // Lantern 3 — green lotus umbrella style
    "vesak-lantern-3": {
      name: "dark-green-lotus",
      sideCount: 16,
      topShape: "umbrella",
      bulbShape: "lotus",
      lowerTopRadius: 0.55,
      lowerBottomRadius: 1.05,
      upperTopRadius: 1.05,
      upperBottomRadius: 0.55,
      pavilionTopCount: 16,
      pavilionBottomCount: 18,
      miniRadiusTop: 1.72,
      miniRadiusBottom: 1.55,
      sparkleCount: 40,
      petalCount: 24,
      spikeCount: 16,
      scaleY: 1.18
    }
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
    hut: patternTexture("hut", c, 256),
    lotus: patternTexture("lotus", c, 512),
    crystal: patternTexture("crystal", c, 384)
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
    topSpinSpeed: 0.32 + (seed % 5) / 100,
    middleSpinSpeed: 0.24 + (seed % 4) / 100,
    bottomSpinSpeed: 0.3 + (seed % 5) / 100,
    swayPhase: (seed % 628) / 100,
    lights: [],
    patternMats: [],
    glowShells: [],
    pavilions: [],
    balls: [],
    ribbons: [],
    sparkles: [],
    petals: [],
    spikes: []
  };

  const U = lantern.userData;

  const texMat = (tex, repX, repY, emI = 1.15) => {
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
      roughness: 0.45,
      metalness: 0.05
    });

    U.patternMats.push({
      mat: m,
      base: emI,
      phase: U.patternMats.length * 0.72
    });

    return m;
  };

  const trimMat = (emI = 0.75) =>
    new THREE.MeshStandardMaterial({
      color: c.trim,
      emissive: c.trim,
      emissiveIntensity: emI,
      roughness: 0.28,
      metalness: 0.35
    });

  const accentMat = (emI = 0.9) =>
    new THREE.MeshStandardMaterial({
      color: c.accent,
      emissive: c.accent,
      emissiveIntensity: emI,
      roughness: 0.25,
      metalness: 0.25
    });

  const solidGlow = (hex, emI = 1.0) =>
    new THREE.MeshStandardMaterial({
      color: hex,
      emissive: hex,
      emissiveIntensity: emI,
      roughness: 0.32,
      metalness: 0.08
    });

  const addRing = (parent, y, r, tube = 0.018, emI = 0.75) => {
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(r, tube, 12, 80),
      trimMat(emI)
    );
    m.position.y = y;
    m.rotation.x = Math.PI / 2;
    parent.add(m);
    return m;
  };

  const addDoubleRing = (parent, y, r) => {
    addRing(parent, y, r, 0.018, 0.75);
    addRing(parent, y + 0.035, r * 0.96, 0.01, 0.6);
  };

  const addSparkleRing = (parent, y, radius, count) => {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const size = 0.022 + (i % 4) * 0.005;

      const sparkle = new THREE.Mesh(
        new THREE.SphereGeometry(size, 8, 8),
        solidGlow(i % 2 === 0 ? c.glow : c.accent, 1.2)
      );

      sparkle.position.set(
        Math.sin(a) * radius,
        y + Math.sin(i * 1.7) * 0.025,
        Math.cos(a) * radius
      );

      sparkle.userData.phase = i * 0.45 + y;
      parent.add(sparkle);

      U.sparkles.push({
        mesh: sparkle,
        phase: sparkle.userData.phase,
        base: size
      });
    }
  };

  const addPetalRing = (parent, y, radius, count, scale = 1) => {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;

      const petal = new THREE.Mesh(
        new THREE.SphereGeometry(0.085 * scale, 16, 10),
        i % 2 === 0 ? solidGlow(c.glow, 0.95) : accentMat(0.75)
      );

      petal.scale.set(1.9, 0.35, 0.78);
      petal.position.set(
        Math.sin(a) * radius,
        y,
        Math.cos(a) * radius
      );

      petal.rotation.y = a;
      petal.rotation.z = Math.PI / 8;
      petal.userData.phase = i * 0.4 + y;

      parent.add(petal);

      U.petals.push({
        mesh: petal,
        phase: petal.userData.phase
      });
    }
  };

  const addCrystalSpikes = (parent, y, radius, count, pointUp = true) => {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;

      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(0.07, 0.28, 5),
        i % 2 === 0 ? trimMat(0.9) : solidGlow(c.glow, 0.9)
      );

      spike.position.set(
        Math.sin(a) * radius,
        y,
        Math.cos(a) * radius
      );

      spike.rotation.y = a;
      spike.rotation.x = pointUp ? 0 : Math.PI;
      spike.userData.phase = i * 0.55 + y;

      parent.add(spike);

      U.spikes.push({
        mesh: spike,
        phase: spike.userData.phase
      });
    }
  };

  // ==========================================================================
  //  PART 3 — BOTTOM SECTION
  // ==========================================================================

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(
      0.5,
      style.lowerBottomRadius + 0.08,
      0.82,
      style.sideCount,
      1,
      true
    ),
    texMat(T.base, style.sideCount, 1.1, 1.15)
  );

  base.position.y = -2.55;
  base.scale.y = style.scaleY;
  part3Bottom.add(base);

  addDoubleRing(part3Bottom, -2.97, style.lowerBottomRadius + 0.08);
  addDoubleRing(part3Bottom, -2.15, 0.53);

  addPetalRing(part3Bottom, -2.08, style.lowerBottomRadius * 0.95, style.petalCount, 1.0);
  addCrystalSpikes(part3Bottom, -3.06, style.lowerBottomRadius * 0.95, style.spikeCount, false);

  const lower = new THREE.Mesh(
    new THREE.CylinderGeometry(
      style.lowerTopRadius,
      style.lowerBottomRadius,
      1.5,
      style.sideCount,
      1,
      true
    ),
    texMat(T.mandala, style.sideCount, 1.15, 1.28)
  );

  lower.position.y = -1.35;
  lower.scale.y = style.scaleY;
  part3Bottom.add(lower);

  addDoubleRing(part3Bottom, -0.6, style.lowerTopRadius + 0.04);
  addDoubleRing(part3Bottom, -2.1, style.lowerBottomRadius);
  addSparkleRing(part3Bottom, -1.82, style.lowerBottomRadius * 0.85, style.sparkleCount);

  // ==========================================================================
  //  PART 2 — MIDDLE SECTION
  // ==========================================================================

  let bulb;

  if (style.bulbShape === "diamond") {
    bulb = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.64, 1),
      texMat(T.crystal, 8, 1.1, 1.45)
    );
    bulb.scale.set(1.08, 1.18, 1.08);

    addCrystalSpikes(part2Middle, -0.36, 0.67, style.spikeCount, true);
    addCrystalSpikes(part2Middle, -0.36, 0.67, style.spikeCount, false);
  } else if (style.bulbShape === "lotus") {
    bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.56, 34, 22),
      texMat(T.lotus, 16, 1, 1.45)
    );
    bulb.scale.set(1.38, 0.8, 1.38);

    addPetalRing(part2Middle, -0.35, 0.64, style.petalCount, 1.05);
  } else {
    bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 30, 22),
      texMat(T.ribs, 16, 1, 1.35)
    );
    bulb.scale.set(1.05, 0.95, 1.05);
  }

  bulb.position.y = -0.35;
  part2Middle.add(bulb);

  addDoubleRing(part2Middle, -0.35, 0.52);
  addDoubleRing(part2Middle, -0.08, 0.36);
  addDoubleRing(part2Middle, -0.62, 0.36);

  const upper = new THREE.Mesh(
    new THREE.CylinderGeometry(
      style.upperTopRadius,
      style.upperBottomRadius,
      1.5,
      style.sideCount,
      1,
      true
    ),
    texMat(T.paisley, style.sideCount, 1.12, 1.25)
  );

  upper.position.y = 0.5;
  upper.scale.y = style.scaleY;
  part2Middle.add(upper);

  addDoubleRing(part2Middle, 1.25, style.upperTopRadius + 0.03);
  addDoubleRing(part2Middle, -0.1, style.upperBottomRadius + 0.03);

  addPetalRing(part2Middle, 1.2, style.upperTopRadius * 0.95, style.petalCount, 0.92);
  addSparkleRing(part2Middle, 0.72, style.upperTopRadius * 0.8, style.sparkleCount);

  // Glow shell 1
  const glowMat = new THREE.MeshBasicMaterial({
    color: c.glow,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.64, 24, 24),
    glowMat
  );

  glow.position.y = -0.35;
  part2Middle.add(glow);
  U.glowShells.push({ mesh: glow, base: 0.55 });

  // Glow shell 2
  const innerHaloMat = new THREE.MeshBasicMaterial({
    color: c.accent,
    transparent: true,
    opacity: 0.16,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const innerHalo = new THREE.Mesh(
    new THREE.SphereGeometry(1.45, 22, 22),
    innerHaloMat
  );

  innerHalo.position.y = -0.1;
  part2Middle.add(innerHalo);
  U.glowShells.push({ mesh: innerHalo, base: 0.16 });

  // Outer halo
  const haloMat = new THREE.MeshBasicMaterial({
    color: c.light,
    transparent: true,
    opacity: 0.1,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(2.9, 22, 22),
    haloMat
  );

  part2Middle.add(halo);
  U.glowShells.push({ mesh: halo, base: 0.1 });

  // ==========================================================================
  //  PART 1 — TOP SECTION
  // ==========================================================================

  if (style.topShape === "diamond") {
    const diamond = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.6, 1),
      texMat(T.wheel, 8, 1, 1.25)
    );

    diamond.position.y = 1.62;
    diamond.scale.set(1.18, 0.96, 1.18);
    part1Top.add(diamond);

    addCrystalSpikes(part1Top, 1.62, 0.68, style.spikeCount, true);
  } else {
    const topSides = style.topShape === "umbrella" ? 14 : 8;

    const hex = new THREE.Mesh(
      new THREE.CylinderGeometry(0.56, 0.56, 0.68, topSides, 1, true),
      texMat(T.wheel, topSides, 1, 1.2)
    );

    hex.position.y = 1.6;
    part1Top.add(hex);
  }

  addDoubleRing(part1Top, 1.94, style.topShape === "umbrella" ? 0.76 : 0.6);
  addDoubleRing(part1Top, 1.27, 0.56);

  addPetalRing(part1Top, 1.95, style.topShape === "umbrella" ? 0.76 : 0.6, style.petalCount, 0.9);

  let roof;

  if (style.topShape === "umbrella") {
    roof = new THREE.Mesh(
      new THREE.ConeGeometry(1.0, 0.4, 14),
      trimMat(1.0)
    );
    roof.position.y = 2.18;

    addCrystalSpikes(part1Top, 2.02, 0.88, style.spikeCount, true);
  } else if (style.topShape === "diamond") {
    roof = new THREE.Mesh(
      new THREE.ConeGeometry(0.64, 0.64, 8),
      trimMat(1.0)
    );
    roof.position.y = 2.22;
  } else {
    roof = new THREE.Mesh(
      new THREE.ConeGeometry(0.68, 0.55, 8),
      trimMat(0.95)
    );
    roof.position.y = 2.18;
  }

  part1Top.add(roof);

  const tipBall = new THREE.Mesh(
    new THREE.SphereGeometry(0.085, 18, 18),
    solidGlow(c.glow, 1.3)
  );

  tipBall.position.y = 2.55;
  part1Top.add(tipBall);

  // Extra top small star
  const topStar = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.1, 0),
    solidGlow(c.accent, 1.1)
  );

  topStar.position.y = 2.72;
  part1Top.add(topStar);
  U.sparkles.push({ mesh: topStar, phase: 3.5, base: 0.1 });

  // Lights
  [
    [0.55, c.light, 3.7, 7],
    [-1.35, c.light, 3.1, 6],
    [-0.35, c.glow, 2.5, 5],
    [1.55, c.accent, 1.8, 4]
  ].forEach((cfg) => {
    const L = new THREE.PointLight(cfg[1], cfg[2], cfg[3], 1.6);
    L.position.y = cfg[0];
    core.add(L);
    U.lights.push({ light: L, base: cfg[2] });
  });

  // ==========================================================================
  //  MINI PAVILION LANTERNS
  // ==========================================================================

  const buildPavilion = () => {
    const g = new THREE.Group();

    const thread = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, 0.18, 6),
      solidGlow(0xffffff, 0)
    );

    thread.position.y = -0.09;
    g.add(thread);

    const bodyGeo =
      style.name === "dark-red-crystal"
        ? new THREE.OctahedronGeometry(0.2, 0)
        : new THREE.BoxGeometry(0.32, 0.32, 0.32);

    const body = new THREE.Mesh(
      bodyGeo,
      texMat(T.hut, 1, 1, 1.15)
    );

    body.position.y = -0.32;
    g.add(body);

    const rf = new THREE.Mesh(
      new THREE.ConeGeometry(0.29, 0.23, style.name === "dark-green-lotus" ? 7 : 6),
      trimMat(0.8)
    );

    rf.position.y = -0.08;
    rf.rotation.y = Math.PI / 4;
    g.add(rf);

    const eave = new THREE.Mesh(
      new THREE.TorusGeometry(0.23, 0.012, 8, 6),
      trimMat(0.7)
    );

    eave.position.y = -0.18;
    eave.rotation.x = Math.PI / 2;
    g.add(eave);

    const lowerBead = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 12, 12),
      solidGlow(c.glow, 1.1)
    );

    lowerBead.position.y = -0.62;
    g.add(lowerBead);

    const miniGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 12, 12),
      new THREE.MeshBasicMaterial({
        color: c.glow,
        transparent: true,
        opacity: 0.18,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );

    miniGlow.position.y = -0.32;
    g.add(miniGlow);

    return g;
  };

  const arm = (parent, angle, R, y) => {
    const a = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.014, R - 0.42, 6),
      trimMat(0.45)
    );

    a.rotation.z = Math.PI / 2;
    a.rotation.y = -angle;

    const mid = (R + 0.42) / 2;

    a.position.set(
      Math.sin(angle) * mid,
      y,
      Math.cos(angle) * mid
    );

    parent.add(a);
  };

  const placeTier = (parent, count, R, y, startA) => {
    for (let i = 0; i < count; i++) {
      const angle = startA + (i / count) * Math.PI * 2;

      arm(parent, angle, R, y);

      const p = buildPavilion();

      p.position.set(
        Math.sin(angle) * R,
        y,
        Math.cos(angle) * R
      );

      p.rotation.y = angle;
      p.userData.phase = i * 0.75 + y;

      parent.add(p);

      U.pavilions.push({
        group: p,
        phase: p.userData.phase
      });
    }
  };

  placeTier(part2Middle, style.pavilionTopCount, style.miniRadiusTop, 0.55, 0.35);
  placeTier(part3Bottom, style.pavilionBottomCount, style.miniRadiusBottom, -1.25, 0.0);

  // ==========================================================================
  //  CURVED RIBBONS
  // ==========================================================================

  const makeRibbon = (angle, y, flip) => {
    const s = flip ? -1 : 1;

    const pts = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.55 * s, 0.2, 0.05),
      new THREE.Vector3(1.08 * s, 0.06, 0.0),
      new THREE.Vector3(1.42 * s, -0.3, -0.04),
      new THREE.Vector3(1.12 * s, -0.55, 0.02),
      new THREE.Vector3(0.86 * s, -0.32, 0.05)
    ];

    const curve = new THREE.CatmullRomCurve3(pts);

    const geo = new THREE.TubeGeometry(
      curve,
      56,
      style.name === "dark-green-lotus" ? 0.032 : 0.036,
      7,
      false
    );

    const m = new THREE.Mesh(
      geo,
      solidGlow(c.paper, 1.05)
    );

    m.scale.set(1, 1, 0.34);

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

    U.ribbons.push({
      group: wrap,
      phase: wrap.userData.phase
    });
  };

  makeRibbon(0.9, 0.55, false);
  makeRibbon(0.9, 0.55, true);
  makeRibbon(Math.PI - 0.9, -1.0, false);
  makeRibbon(Math.PI - 0.9, -1.0, true);
  makeRibbon(2.25, 0.2, false);
  makeRibbon(2.25, 0.2, true);

  // ==========================================================================
  //  HANGING BALLS / BEADS
  // ==========================================================================

  const buildBall = () => {
    const g = new THREE.Group();

    const thread = new THREE.Mesh(
      new THREE.CylinderGeometry(0.004, 0.004, 0.36, 6),
      solidGlow(0xffffff, 0)
    );

    thread.position.y = -0.18;
    g.add(thread);

    const ballGeo =
      style.name === "dark-red-crystal"
        ? new THREE.OctahedronGeometry(0.09, 0)
        : new THREE.SphereGeometry(0.09, 14, 14);

    const ball = new THREE.Mesh(
      ballGeo,
      solidGlow(c.glow, 1.1)
    );

    ball.position.y = -0.39;
    g.add(ball);

    for (let j = 0; j < 3; j++) {
      const bead = new THREE.Mesh(
        new THREE.SphereGeometry(0.024, 8, 8),
        solidGlow(j % 2 ? c.glow : c.accent, 0.9)
      );

      bead.position.y = -0.51 - j * 0.065;
      g.add(bead);
    }

    return g;
  };

  const hangingCount = style.name === "dark-green-lotus" ? 16 : 14;

  for (let i = 0; i < hangingCount; i++) {
    const a = (i / hangingCount) * Math.PI * 2;
    const R = i % 2 === 0 ? 1.03 : 0.84;

    const b = buildBall();

    b.position.set(
      Math.sin(a) * R,
      -1.78 - (i % 3) * 0.08,
      Math.cos(a) * R
    );

    b.userData.phase = i * 0.65;

    part3Bottom.add(b);

    U.balls.push({
      group: b,
      phase: b.userData.phase
    });
  }

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
    U.core.position.y = Math.sin(t * 0.9 + U.swayPhase) * 0.07;
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

  lantern.rotation.z = Math.sin(t * 0.7 + U.swayPhase) * 0.048;
  lantern.rotation.x = Math.sin(t * 0.5 + U.swayPhase + 1.2) * 0.035;

  const flicker =
    0.86 +
    Math.sin(t * 8) * 0.08 +
    Math.sin(t * 19) * 0.05 +
    Math.random() * 0.04;

  U.lights.forEach((o) => {
    o.light.intensity = o.base * flicker;
  });

  U.patternMats.forEach((p) => {
    p.mat.emissiveIntensity =
      p.base +
      Math.sin(t * 2.4 + p.phase) * 0.18 +
      (flicker - 0.86) * 0.45;
  });

  U.glowShells.forEach((s, index) => {
    const k = 1 + Math.sin(t * (2.7 + index * 0.35)) * 0.075;
    s.mesh.scale.setScalar(k);

    if (s.mesh.material) {
      s.mesh.material.opacity =
        s.base *
        (0.82 + Math.abs(Math.sin(t * 3 + index)) * 0.55);
    }
  });

  U.pavilions.forEach((p) => {
    p.group.rotation.z = Math.sin(t * 1.6 + p.phase) * 0.16;
    p.group.rotation.x = Math.cos(t * 1.3 + p.phase) * 0.1;
  });

  U.balls.forEach((b) => {
    b.group.rotation.z = Math.sin(t * 1.9 + b.phase) * 0.24;
    b.group.rotation.x = Math.cos(t * 1.5 + b.phase) * 0.16;
  });

  U.ribbons.forEach((r) => {
    r.group.rotation.z = Math.sin(t * 1.4 + r.phase) * 0.15;
  });

  U.sparkles.forEach((s) => {
    const k = 0.75 + Math.abs(Math.sin(t * 3.2 + s.phase)) * 0.7;
    s.mesh.scale.setScalar(k);
  });

  U.petals.forEach((p) => {
    const k = 1 + Math.sin(t * 2.2 + p.phase) * 0.08;
    p.mesh.scale.y = 0.35 * k;
  });

  U.spikes.forEach((s) => {
    s.mesh.rotation.z = Math.sin(t * 1.8 + s.phase) * 0.08;
  });
}

// ============================================================================
//  Procedural canvas pattern textures
// ============================================================================

function patternTexture(kind, c, size) {
  const key = kind + "_" + c.paper + "_" + c.glow + "_" + c.trim + "_" + size;

  if (_texCache.has(key)) return _texCache.get(key);

  const cv = document.createElement("canvas");
  cv.width = cv.height = size;

  const x = cv.getContext("2d");

  const paper = css(c.paper);
  const line = css(c.line);
  const glow = css(c.glow);
  const trim = css(c.trim);
  const accent = css(c.accent);

  const S = size;
  const C = size / 2;

  const g = x.createRadialGradient(
    C,
    C,
    S * 0.04,
    C,
    C,
    S * 0.72
  );

  g.addColorStop(0, glow);
  g.addColorStop(0.38, paper);
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
    x.strokeStyle = line;
    x.strokeRect(S * 0.04, S * 0.04, S * 0.92, S * 0.92);

    lw(0.006);
    x.strokeStyle = trim;
    x.strokeRect(S * 0.08, S * 0.08, S * 0.84, S * 0.84);

    lw(0.004);
    x.strokeStyle = accent;
    x.strokeRect(S * 0.12, S * 0.12, S * 0.76, S * 0.76);

    x.strokeStyle = line;
  };

  const circle = (cx, cy, r, fill) => {
    x.beginPath();
    x.arc(cx, cy, r, 0, Math.PI * 2);
    fill ? x.fill() : x.stroke();
  };

  if (kind === "mandala" || kind === "base" || kind === "lotus") {
    lw(0.009);

    const rings = kind === "base" ? 4 : 7;

    for (let i = 1; i <= rings; i++) {
      circle(C, C, S * 0.46 * (i / rings), false);
    }

    lw(0.005);

    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;

      x.beginPath();
      x.moveTo(C, C);
      x.lineTo(
        C + Math.cos(a) * S * 0.46,
        C + Math.sin(a) * S * 0.46
      );
      x.stroke();
    }

    lw(0.006);

    const petals = kind === "lotus" ? 28 : 20;

    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * Math.PI * 2;

      circle(
        C + Math.cos(a) * S * 0.3,
        C + Math.sin(a) * S * 0.3,
        S * 0.05,
        false
      );
    }

    x.fillStyle = trim;

    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;

      circle(
        C + Math.cos(a) * S * 0.4,
        C + Math.sin(a) * S * 0.4,
        S * 0.012,
        true
      );
    }

    x.fillStyle = accent;
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
        x.quadraticCurveTo(cx + r, cy - r * 1.45, cx - r * 0.3, cy - r * 0.9);
        x.quadraticCurveTo(cx - r * 1.35, cy - r * 0.4, cx - r * 0.2, cy + r * 0.65);
        x.quadraticCurveTo(cx + r * 0.65, cy + r * 1.1, cx + r, cy);
        x.stroke();

        lw(0.004);
        circle(cx, cy, r * 0.42, false);
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

    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;

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

    x.fillStyle = trim;

    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;

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

    frame();
  } else if (kind === "ribs") {
    lw(0.04);

    for (let i = 0; i < 5; i++) {
      x.beginPath();
      x.moveTo(S * (i + 0.5) / 5, 0);
      x.lineTo(S * (i + 0.5) / 5, S);
      x.stroke();
    }

    lw(0.012);
    x.strokeStyle = trim;

    for (let i = 0; i < 5; i++) {
      x.beginPath();
      x.moveTo(S * i / 5, 0);
      x.lineTo(S * i / 5, S);
      x.stroke();
    }
  } else if (kind === "crystal") {
    lw(0.012);

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;

      x.beginPath();
      x.moveTo(C, C);
      x.lineTo(
        C + Math.cos(a) * S * 0.48,
        C + Math.sin(a) * S * 0.48
      );
      x.stroke();
    }

    lw(0.007);
    x.strokeStyle = trim;

    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i / 4) * Math.PI * 2;

      x.beginPath();
      x.moveTo(C, C);
      x.lineTo(
        C + Math.cos(a) * S * 0.38,
        C + Math.sin(a) * S * 0.38
      );
      x.stroke();
    }

    x.fillStyle = accent;
    circle(C, C, S * 0.06, true);

    frame();
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