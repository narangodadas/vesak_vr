// ============================================================================
//  Vesak Lantern (Vesak Kuudu) — enhanced 3D module
//  - Richer, multi-colour palettes (panels cycle through a full palette)
//  - Layered "double-pyramid" silhouette + stacked crown for real depth
//  - Translucent glowing "paper" panels lit from inside (candle + point light)
//  - Paper frill ruffles, beaded hanging tassels, rib light-strings
//  - Animations: spin, vertical float, breeze sway (pendulum), candle flicker,
//    glow breathing, per-panel paper shimmer, frill flutter, tassel swing
//
//  Public API is unchanged:
//      createLantern(type)            -> THREE.Group
//      updateLantern(lantern, delta)  -> void  (call every frame)
//
//  Uses the global `THREE`. Only core geometries/materials are used so it
//  works across Three.js versions.
// ============================================================================

export function createLantern(type = "vesak-lantern-1") {
  const colorSets = {
    "vesak-lantern-1": {
      main: 0xff1e6f, second: 0xffd000, third: 0x00e5ff, accent: 0xffffff, glow: 0xffb14d,
      palette: [0xff1e6f, 0xffd000, 0x00e5ff, 0xff5fa2, 0x7c4dff, 0xfff3b0]
    },
    "vesak-lantern-2": {
      main: 0x00e676, second: 0xd500f9, third: 0xffea00, accent: 0xffffff, glow: 0xbfff6b,
      palette: [0x00e676, 0xd500f9, 0xffea00, 0x18ffff, 0xff4081, 0xc6ff7a]
    },
    "vesak-lantern-3": {
      main: 0x2979ff, second: 0xff9100, third: 0xff1744, accent: 0xffffff, glow: 0xffd180,
      palette: [0x2979ff, 0xff9100, 0xff1744, 0x00b8d4, 0xffeb3b, 0xb388ff]
    },
    "vesak-lantern-4": {
      main: 0xff3d81, second: 0x00bfa5, third: 0xffc400, accent: 0xffffff, glow: 0xff9ecb,
      palette: [0xff3d81, 0x00bfa5, 0xffc400, 0x536dfe, 0x69f0ae, 0xffd6e7]
    },
    "vesak-lantern-5": {
      main: 0x651fff, second: 0xffab00, third: 0xff5252, accent: 0xfff8e1, glow: 0xffcf6b,
      palette: [0x651fff, 0xffab00, 0xff5252, 0x40c4ff, 0xeeff41, 0xffd95a]
    }
  };
  const keys = Object.keys(colorSets);
  const colors = colorSets[type] || colorSets[keys[Math.abs(hashText(type)) % keys.length]];
  const palette = colors.palette;
  const seed = Math.abs(hashText(type));

  // Outer pivot group: this is what gets returned, swayed and floated.
  const lantern = new THREE.Group();

  // Inner spinner: everything that should rotate about the vertical axis.
  const spinner = new THREE.Group();
  lantern.add(spinner);

  lantern.userData = {
    time: seed % 1000 * 0.01,      // desync identical lanterns
    spinner,
    spinSpeed: 0.45 + (seed % 25) / 100,
    swayPhase: (seed % 628) / 100,
    floatPhase: (seed % 314) / 100,
    innerLights: [],
    glowMaterials: [],
    glowShells: [],
    panels: [],
    frills: [],
    tassels: [],
    flame: null
  };

  // ---- Materials -----------------------------------------------------------
  const paper = (color, opacity = 0.6, emissive = 0.55) =>
    new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: emissive,
      transparent: true, opacity, side: THREE.DoubleSide,
      roughness: 0.45, metalness: 0.0, depthWrite: false
    });
  const solid = (color, emissive = 0.35) =>
    new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: emissive, roughness: 0.3, metalness: 0.15
    });

  // ---- Translucent body drum ----------------------------------------------
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.68, 0.68, 1.16, 8, 1, true),
    paper(colors.main, 0.52, 0.32)
  );
  spinner.add(body);

  // ---- Eight glowing paper panels (cycle the whole palette) ----------------
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const col = palette[i % palette.length];
    const mat = paper(col, 0.78, 0.5);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.16, 0.02), mat);
    panel.position.set(Math.sin(angle) * 0.66, 0, Math.cos(angle) * 0.66);
    panel.rotation.y = angle;
    spinner.add(panel);
    lantern.userData.panels.push({ mat, base: 0.5, phase: i * 0.8 });

    // simple cut-paper motif (diamond of dots) centred on each panel
    const motif = palette[(i + 3) % palette.length];
    for (const [dx, dy] of [[0, 0.22], [0, -0.22], [0.13, 0], [-0.13, 0], [0, 0]]) {
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.028, 10, 10),
        new THREE.MeshBasicMaterial({ color: motif })
      );
      dot.position.set(
        Math.sin(angle) * 0.69 + Math.cos(angle) * dx,
        dy,
        Math.cos(angle) * 0.69 - Math.sin(angle) * dx
      );
      spinner.add(dot);
    }
  }

  // ---- Vertical frame ribs + rib light-strings -----------------------------
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8 + 0.0625) * Math.PI * 2; // sit on the seams
    const rib = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, 1.2, 8),
      solid(colors.accent, 0.4)
    );
    rib.position.set(Math.sin(angle) * 0.71, 0, Math.cos(angle) * 0.71);
    spinner.add(rib);

    for (let j = 0; j < 4; j++) {
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.034, 10, 10),
        new THREE.MeshBasicMaterial({ color: palette[(i + j) % palette.length] })
      );
      bulb.position.set(Math.sin(angle) * 0.73, -0.45 + j * 0.3, Math.cos(angle) * 0.73);
      spinner.add(bulb);
    }
  }

  // ---- Decorative rings ----------------------------------------------------
  const ringMat = solid(colors.accent, 0.3);
  const ring = (y, s = 1) => {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.69, 0.028, 14, 80), ringMat);
    r.position.y = y; r.rotation.x = Math.PI / 2; r.scale.setScalar(s);
    spinner.add(r); return r;
  };
  ring(0.58); ring(-0.58); ring(0.19, 0.9); ring(-0.19, 0.9);

  // ---- Tall double-pyramid top & bottom (classic Vesak shape) --------------
  const topCone = cone(colors.second, 0.7, 0.66);
  topCone.position.y = 0.91;
  spinner.add(topCone);

  const botCone = cone(colors.third, 0.7, 0.66);
  botCone.position.y = -0.91; botCone.rotation.x = Math.PI;
  spinner.add(botCone);

  // ---- Stacked crown finial (depth on top) ---------------------------------
  const crown1 = cone(palette[0], 0.34, 0.34); crown1.position.y = 1.32; spinner.add(crown1);
  const crown2 = cone(palette[1], 0.2, 0.26); crown2.position.y = 1.58; spinner.add(crown2);
  const crownBall = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), solid(colors.accent, 0.6));
  crownBall.position.y = 1.74; spinner.add(crownBall);

  const baseFinial = cone(palette[2], 0.22, 0.3); baseFinial.position.y = -1.34; baseFinial.rotation.x = Math.PI; spinner.add(baseFinial);

  // ---- Paper frill ruffles (top & bottom edges) ----------------------------
  addFrillRing(spinner, lantern.userData.frills, { y: 0.58, radius: 0.72, count: 16, palette, paper, tilt: -0.5, size: 0.075 });
  addFrillRing(spinner, lantern.userData.frills, { y: -0.58, radius: 0.72, count: 16, palette, paper, tilt: Math.PI + 0.5, size: 0.075 });

  // ---- Inner candle + glow -------------------------------------------------
  const glowMat = new THREE.MeshBasicMaterial({
    color: colors.glow, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false
  });
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 24), glowMat);
  spinner.add(glow);
  lantern.userData.glowMaterials.push(glowMat);

  // soft outer halo (lantern lit in the dark)
  const haloMat = new THREE.MeshBasicMaterial({
    color: colors.glow, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false
  });
  const halo = new THREE.Mesh(new THREE.SphereGeometry(1.25, 20, 20), haloMat);
  spinner.add(halo);
  lantern.userData.glowShells.push(halo);

  // flame: warm inner cone + brighter core
  const flame = new THREE.Group();
  const flameOuter = new THREE.Mesh(
    new THREE.ConeGeometry(0.06, 0.24, 12),
    new THREE.MeshBasicMaterial({ color: 0xff8a3d, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  const flameCore = new THREE.Mesh(
    new THREE.ConeGeometry(0.03, 0.14, 12),
    new THREE.MeshBasicMaterial({ color: 0xfff1a8, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  flameCore.position.y = -0.02;
  flame.add(flameOuter); flame.add(flameCore);
  flame.position.y = -0.05;
  spinner.add(flame);
  lantern.userData.flame = flame;

  // warm candle light (tinted slightly by colour glow)
  const candle = new THREE.PointLight(0xffb060, 2.6, 5.5, 1.6);
  spinner.add(candle);
  lantern.userData.innerLights.push(candle);
  const colourFill = new THREE.PointLight(colors.glow, 1.2, 4.5, 2.0);
  spinner.add(colourFill);
  lantern.userData.innerLights.push(colourFill);

  // ---- Beaded hanging tassels ----------------------------------------------
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2;
    const col = palette[i % palette.length];
    const t = createTassel(col, palette, paper, solid);
    t.position.set(Math.sin(angle) * 0.5, -0.78, Math.cos(angle) * 0.5);
    t.userData.phase = i * 0.62;
    spinner.add(t);
    lantern.userData.tassels.push(t);
  }

  // central long tail tassel
  const tail = createTassel(colors.second, palette, paper, solid, 1.5);
  tail.position.set(0, -1.5, 0);
  tail.userData.phase = 1.7;
  spinner.add(tail);
  lantern.userData.tassels.push(tail);

  // ---- Hanging string + hook (on the outer pivot, above the body) ----------
  const string = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.01, 0.7, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  string.position.y = 2.1;
  lantern.add(string);
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 10, 24), solid(colors.accent, 0.3));
  hook.position.y = 2.45; hook.rotation.x = Math.PI / 2;
  lantern.add(hook);

  lantern.position.set(0, 0, -3);
  lantern.scale.set(0.82, 0.82, 0.82);
  return lantern;
}

// ============================================================================
//  Per-frame animation
// ============================================================================
export function updateLantern(lantern, delta = 0.016) {
  if (!lantern) return;
  const u = lantern.userData;
  u.time += delta;
  const t = u.time;

  // spin the body
  if (u.spinner) {
    u.spinner.rotation.y += delta * u.spinSpeed;
    // gentle vertical float
    u.spinner.position.y = Math.sin(t * 1.2 + u.floatPhase) * 0.07;
  }

  // breeze sway (pendulum tilt of the whole lantern)
  lantern.rotation.z = Math.sin(t * 0.85 + u.swayPhase) * 0.07;
  lantern.rotation.x = Math.sin(t * 0.62 + u.swayPhase + 1.3) * 0.05;

  // candle flicker -> drives both lights
  const flicker = 0.82 + Math.sin(t * 9.0) * 0.1 + Math.sin(t * 23.0) * 0.05 + Math.random() * 0.06;
  u.innerLights.forEach((l, i) => l.intensity = (i === 0 ? 2.6 : 1.2) * flicker);

  // flame dance
  if (u.flame) {
    u.flame.scale.y = 0.9 + Math.sin(t * 14) * 0.12 + Math.random() * 0.05;
    u.flame.scale.x = u.flame.scale.z = 0.95 + Math.sin(t * 11 + 1) * 0.06;
    u.flame.position.x = Math.sin(t * 13) * 0.012;
    u.flame.position.z = Math.cos(t * 10) * 0.012;
  }

  // glow breathing
  u.glowMaterials.forEach((m) => m.opacity = 0.58 + Math.sin(t * 5.5) * 0.16);
  u.glowShells.forEach((s) => {
    const b = 1 + Math.sin(t * 3.2) * 0.06;
    s.scale.setScalar(b);
    if (s.material) s.material.opacity = 0.1 + Math.abs(Math.sin(t * 3.2)) * 0.06;
  });

  // per-panel paper shimmer (light moving through tissue paper)
  u.panels.forEach((p) => {
    p.mat.emissiveIntensity = p.base + Math.sin(t * 3.0 + p.phase) * 0.18 + flicker * 0.08;
  });

  // frill flutter
  u.frills.forEach((f) => {
    f.rotation.x = f.userData.baseTilt + Math.sin(t * 3.5 + f.userData.phase) * 0.09;
  });

  // tassel swing (lags the body sway for a loose, weighted feel)
  u.tassels.forEach((ts) => {
    ts.rotation.z = Math.sin(t * 2.1 + ts.userData.phase) * 0.18;
    ts.rotation.x = Math.cos(t * 1.7 + ts.userData.phase) * 0.12;
  });
}

// ============================================================================
//  Helpers
// ============================================================================
function cone(color, radius, height) {
  return new THREE.Mesh(
    new THREE.ConeGeometry(radius, height, 8),
    new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 0.38,
      transparent: true, opacity: 0.85, side: THREE.DoubleSide, roughness: 0.4, metalness: 0.05
    })
  );
}

function addFrillRing(parent, store, opts) {
  const { y, radius, count, palette, paper, tilt, size } = opts;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const col = palette[i % palette.length];
    const petal = new THREE.Mesh(new THREE.ConeGeometry(size, size * 2.4, 4), paper(col, 0.95, 0.5));
    petal.position.set(Math.sin(angle) * radius, y, Math.cos(angle) * radius);
    petal.rotation.y = angle;
    petal.rotation.x = tilt;
    petal.userData.baseTilt = tilt;
    petal.userData.phase = i * 0.4;
    parent.add(petal);
    store.push(petal);
  }
}

function createTassel(color, palette, paper, solid, lengthScale = 1) {
  const g = new THREE.Group();
  const thread = new THREE.Mesh(
    new THREE.CylinderGeometry(0.006, 0.006, 0.45 * lengthScale, 6),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  thread.position.y = -0.22 * lengthScale;
  g.add(thread);

  for (let j = 0; j < 3; j++) {
    const bead = new THREE.Mesh(
      new THREE.SphereGeometry(0.032, 10, 10),
      solid(palette[j % palette.length], 0.55)
    );
    bead.position.y = -0.1 - j * 0.13 * lengthScale;
    g.add(bead);
  }

  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.42 * lengthScale, 0.012),
    paper(color, 0.95, 0.4)
  );
  strip.position.y = -0.62 * lengthScale;
  g.add(strip);

  const end = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), solid(color, 0.6));
  end.position.y = -0.86 * lengthScale;
  g.add(end);
  return g;
}

function hashText(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}