// ============================================================================
//  Vesak Kūdu — programmable-LED neon pandol lantern
//  ===========================================================================
//  Matches the reference video/image: a giant octagonal CANOPY DOME covered in
//  glowing mandala medallions + scroll flourishes, a ring of hanging peacock-FAN
//  lanterns with tassels, a central peacock fan flanked by two curling SCROLL
//  arms, a glowing ribbed VASE, and a tiered PEDESTAL (saucer brim → medallion
//  dome → tapering tiers → zig-zag bunting drum).
//
//  Surface style = BRIGHT NEON LINE-ART ON BLACK (RGB-LED / EL-wire look), built
//  from procedural CANVAS textures — no external image files.
//
//  Motion  = the structure stays still while every region's neon SMOOTHLY CYCLES
//  through the colour spectrum (green → cyan → blue → magenta → red → gold → …),
//  each region phase-offset so many colours glow at once — exactly like the
//  programmable LED kūdu in the reference clip.  (No physical spin.)
//
//  Public API unchanged — drop-in replacement:
//      createLantern(type)            -> THREE.Group
//      updateLantern(lantern, delta)  -> void   (call every frame)
//
//  Uses the global `THREE`. Only core geometries are used (works across versions).
// ============================================================================

const _texCache = new Map();

// full hue revolution (seconds) — paced to match the reference clip
const HUE_CYCLE = 18.0;

export function createLantern(type = "vesak-lantern-1") {
  // The reference is a multicolour LED piece, so `type` only nudges the starting
  // phase / saturation flavour — every variant still cycles the whole spectrum.
  const flavours = {
    "vesak-lantern-1": { phase: 0.00, sat: 1.00, lum: 0.55 },
    "vesak-lantern-2": { phase: 0.18, sat: 1.00, lum: 0.56 },
    "vesak-lantern-3": { phase: 0.36, sat: 0.95, lum: 0.58 },
    "vesak-lantern-4": { phase: 0.55, sat: 1.00, lum: 0.55 },
    "vesak-lantern-5": { phase: 0.72, sat: 0.92, lum: 0.57 }
  };
  const keys = Object.keys(flavours);
  const f = flavours[type] || flavours[keys[Math.abs(hashText(type)) % keys.length]];
  const seed = Math.abs(hashText(type));

  // ---- procedural neon textures (white line-art on black; cached & shared) ---
  const T = {
    canopy:    patternTexture("canopy",    1024),
    fan:       patternTexture("fan",        512),
    vase:      patternTexture("vase",       512),
    saucer:    patternTexture("saucer",     512),
    medallions:patternTexture("medallions", 768),
    bunting:   patternTexture("bunting",    512),
    ribband:   patternTexture("ribband",    256)
  };

  const lantern = new THREE.Group();          // outer pivot (gentle sway)
  const core = new THREE.Group();             // the whole hanging structure
  lantern.add(core);

  lantern.userData = {
    time: (seed % 1000) * 0.01,
    core,
    phase0: f.phase,
    sat: f.sat,
    lum: f.lum,
    swayPhase: (seed % 628) / 100,
    lights: [],
    neon: [],          // { mat, off, sat, lum, emBase }
    glowShells: [],
    fans: [],          // swinging hanging fans
    tassels: [],       // swinging tassels
    scrolls: []        // fluttering scroll arms
  };
  const U = lantern.userData;

  // ---- material helpers ----------------------------------------------------
  // A neon material: black body, glowing line-art whose colour we cycle each frame.
  function neonMat(tex, hueOff, opts) {
    opts = opts || {};
    const emI = opts.emI === undefined ? 2.1 : opts.emI;
    const t = tex.clone(); t.needsUpdate = true;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(opts.repX || 1, opts.repY || 1);
    if (opts.offX) t.offset.x = opts.offX;
    const m = new THREE.MeshStandardMaterial({
      color: 0x000000,
      emissive: 0xffffff,
      emissiveMap: t,
      emissiveIntensity: emI,
      side: THREE.DoubleSide,
      roughness: 1.0, metalness: 0.0,
      transparent: !!opts.cutout,
      alphaMap: opts.cutout ? t : null,
      depthWrite: opts.cutout ? false : true
    });
    U.neon.push({
      mat: m, off: hueOff,
      sat: opts.sat === undefined ? U.sat : opts.sat,
      lum: opts.lum === undefined ? U.lum : opts.lum,
      emBase: emI
    });
    return m;
  }
  // a simple self-lit glowing solid whose colour also cycles (for tubes / beads)
  function glowMat(hueOff, emI, opts) {
    opts = opts || {};
    const m = new THREE.MeshStandardMaterial({
      color: 0x000000, emissive: 0xffffff,
      emissiveIntensity: emI === undefined ? 1.8 : emI,
      roughness: 0.6, metalness: 0.0
    });
    U.neon.push({
      mat: m, off: hueOff,
      sat: opts.sat === undefined ? U.sat : opts.sat,
      lum: opts.lum === undefined ? U.lum : opts.lum,
      emBase: emI === undefined ? 1.8 : emI
    });
    return m;
  }

  // region hue offsets (start palette ≈ reference frame-0: green canopy, gold
  // fans/vase, pink centre, blue base) — all then cycle together.
  const H = {
    canopy: 0.33, ringFan: 0.08, centerFan: 0.92, scroll: 0.88,
    vase: 0.07, saucer: 0.62, medal: 0.50, tier: 0.70, bunting: 0.86, tassel: 0.02
  };

  // a flat neon "fan" panel (peacock-fan lantern) of given size
  function fanPanel(size, hueOff) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      neonMat(T.fan, hueOff, { cutout: true, emI: 2.3, repX: 1, repY: 1 })
    );
    return m;
  }
  // a hanging tassel: thread + a couple of glowing beads
  function tassel(len, hueOff, beadR) {
    const g = new THREE.Group();
    const thread = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, len, 5),
      glowMat(hueOff, 0.9, { lum: 0.7 })
    );
    thread.position.y = -len / 2; g.add(thread);
    const b = beadR || 0.05;
    for (let i = 0; i < 3; i++) {
      const bead = new THREE.Mesh(new THREE.SphereGeometry(b * (1 - i * 0.18), 10, 10), glowMat(hueOff, 1.6));
      bead.position.y = -len - b - i * b * 1.7; g.add(bead);
    }
    return g;
  }

  // ==========================================================================
  //  A. CANOPY DOME  (the big tall octagonal parasol/tent on top)
  //  Built as a near-vertical faceted wall that flares out a little toward the
  //  bottom mouth — seen from below it fills the upper half of the view.
  // ==========================================================================
  const canopyProfile = [
    [0.05, 2.15],   // peaked top
    [0.45, 2.10],
    [0.95, 1.92],
    [1.55, 1.55],
    [2.15, 1.00],
    [2.70, 0.30],
    [3.05, -0.45],
    [3.15, -1.15],
    [3.15, -1.4]    // straight lip at the mouth
  ].map((p) => new THREE.Vector2(p[0], p[1]));
  const canopy = new THREE.Mesh(
    new THREE.LatheGeometry(canopyProfile, 8),           // 8 sides → octagon
    neonMat(T.canopy, H.canopy, { repX: 3, repY: 2, emI: 1.95 })
  );
  canopy.position.y = 1.9;
  canopy.rotation.y = Math.PI / 8;                       // flat-of-octagon to front
  core.add(canopy);

  // peak finial
  const peak = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), glowMat(H.canopy, 1.6, { lum: 0.75 }));
  peak.position.y = 1.9 + 2.08; core.add(peak);

  // beaded rim ring around the canopy mouth
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(3.1, 0.035, 10, 72),
    glowMat(H.canopy, 1.5, { lum: 0.72 })
  );
  rim.position.y = 1.9 - 1.35; rim.rotation.x = Math.PI / 2; core.add(rim);

  // ==========================================================================
  //  B. RING OF PEACOCK-FAN LANTERNS hanging just inside the canopy mouth
  // ==========================================================================
  const RING_N = 10, RING_R = 2.35, RING_Y = 0.7;
  for (let i = 0; i < RING_N; i++) {
    const a = (i / RING_N) * Math.PI * 2 + 0.31;
    const grp = new THREE.Group();
    grp.position.set(Math.sin(a) * RING_R, RING_Y, Math.cos(a) * RING_R);
    grp.rotation.y = a;                                  // face outward
    const fp = fanPanel(0.95, H.ringFan + (i % 3) * 0.05);
    fp.rotation.x = -0.12;
    grp.add(fp);
    // tassels dangling from the fan
    [-0.26, 0, 0.26].forEach((dx, k) => {
      const ts = tassel(0.4 + (k === 1 ? 0.14 : 0), H.tassel, 0.04);
      ts.position.set(dx, -0.4, 0.02);
      grp.add(ts);
      U.tassels.push({ group: ts, phase: a * 2 + k });
    });
    grp.userData.phase = i * 0.7;
    core.add(grp);
    U.fans.push({ group: grp, phase: grp.userData.phase, base: -0.12 });
  }

  // ==========================================================================
  //  C. CENTRAL PEACOCK FAN + D. SCROLL ARMS
  // ==========================================================================
  const centerFan = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 2.2),
    neonMat(T.fan, H.centerFan, { cutout: true, emI: 2.8, repX: 1, repY: 1 })
  );
  centerFan.position.set(0, 0.85, -0.02);
  centerFan.rotation.x = -0.05;
  core.add(centerFan);
  // a faint second copy slightly behind for depth/density
  const centerFanBack = fanPanel(2.2, H.centerFan);
  centerFanBack.position.set(0, 0.85, -0.12);
  centerFanBack.rotation.x = -0.05;
  centerFanBack.scale.setScalar(0.95);
  core.add(centerFanBack);
  // bead-arc tassels under the central fan
  [-0.5, -0.17, 0.17, 0.5].forEach((dx, k) => {
    const ts = tassel(0.45, H.tassel, 0.05);
    ts.position.set(dx, 0.3, 0.16);
    core.add(ts);
    U.tassels.push({ group: ts, phase: k * 1.3 });
  });

  // two curling scroll arms (peacock-neck / ram's-horn), mirrored, at vase shoulder
  function scrollArm(side) {
    const s = side;
    const pts = [
      new THREE.Vector3(0.18 * s, 0.18, 0.05),
      new THREE.Vector3(0.55 * s, 0.28, 0.16),
      new THREE.Vector3(0.98 * s, 0.20, 0.18),
      new THREE.Vector3(1.22 * s, -0.05, 0.10),
      new THREE.Vector3(1.24 * s, -0.34, 0.0),
      new THREE.Vector3(1.02 * s, -0.5, -0.05),
      new THREE.Vector3(0.84 * s, -0.4, 0.0),
      new THREE.Vector3(0.9 * s, -0.18, 0.02)
    ];
    const curve = new THREE.CatmullRomCurve3(pts);
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 80, 0.05, 8, false),
      glowMat(H.scroll, 2.0)
    );
    const wrap = new THREE.Group();
    wrap.add(tube);
    // a small fan + tassel at the scroll tip
    const tipFan = fanPanel(0.6, H.ringFan + 0.1);
    tipFan.position.set(1.12 * s, -0.18, 0.12);
    tipFan.rotation.y = s > 0 ? -0.5 : 0.5;
    wrap.add(tipFan);
    const ts = tassel(0.42, H.tassel, 0.035);
    ts.position.set(1.12 * s, -0.5, 0.12);
    wrap.add(ts);
    U.tassels.push({ group: ts, phase: s + 2 });
    wrap.userData.phase = s;
    core.add(wrap);
    U.scrolls.push({ group: wrap, phase: s });
  }
  scrollArm(1); scrollArm(-1);

  // ==========================================================================
  //  E. GLOWING RIBBED VASE  (the warm "pot" under the central fan)
  // ==========================================================================
  const vaseProfile = [
    [0.0, 0.55], [0.30, 0.55], [0.46, 0.40], [0.55, 0.18], [0.52, -0.05],
    [0.40, -0.28], [0.26, -0.42], [0.30, -0.5], [0.18, -0.55]
  ].map((p) => new THREE.Vector2(p[0], p[1]));
  const vase = new THREE.Mesh(
    new THREE.LatheGeometry(vaseProfile, 24),
    neonMat(T.vase, H.vase, { repX: 4, repY: 1, emI: 2.4, lum: 0.6 })
  );
  vase.position.y = -0.15; core.add(vase);

  // mouth ring
  const vmouth = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.03, 8, 36), glowMat(H.vase, 1.6, { lum: 0.7 }));
  vmouth.position.y = 0.4; vmouth.rotation.x = Math.PI / 2; core.add(vmouth);

  // inner warm glow + outer halo
  const innerGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 18, 18),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  innerGlow.position.y = -0.05; core.add(innerGlow);
  U.glowShells.push({ mesh: innerGlow, base: 0.32, off: H.vase });

  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(3.0, 18, 18),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  halo.position.y = 1.2; core.add(halo);
  U.glowShells.push({ mesh: halo, base: 0.06, off: H.canopy });

  // warm point-lights so the piece casts colour into the scene
  [[0.0, H.vase, 3.0, 7], [1.6, H.canopy, 2.2, 8], [-1.4, H.saucer, 2.0, 6]].forEach((cfg) => {
    const L = new THREE.PointLight(0xffffff, cfg[2], cfg[3], 1.6);
    L.position.y = cfg[0]; core.add(L);
    U.lights.push({ light: L, base: cfg[2], off: cfg[1] });
  });

  // ==========================================================================
  //  F. TIERED PEDESTAL  (saucer brim → medallion dome → tiers → bunting drum)
  // ==========================================================================
  // wide saucer brim (the "sun-hat" disc)
  const saucerProfile = [
    [0.0, 0.16], [0.55, 0.14], [1.15, 0.06], [1.6, -0.06], [1.72, -0.16],
    [1.55, -0.2], [1.0, -0.22], [0.5, -0.22]
  ].map((p) => new THREE.Vector2(p[0], p[1]));
  const saucer = new THREE.Mesh(
    new THREE.LatheGeometry(saucerProfile, 48),
    neonMat(T.saucer, H.saucer, { repX: 1, repY: 1, emI: 2.0 })
  );
  saucer.position.y = -0.95; core.add(saucer);
  const saucerEdge = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.035, 8, 64), glowMat(H.saucer, 1.5, { lum: 0.7 }));
  saucerEdge.position.y = -1.06; saucerEdge.rotation.x = Math.PI / 2; core.add(saucerEdge);

  // domed medallion tier
  const medalDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.95, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.55),
    neonMat(T.medallions, H.medal, { repX: 3, repY: 1, emI: 2.1 })
  );
  medalDome.position.y = -1.5; medalDome.scale.y = 0.7; core.add(medalDome);

  // tapering tiers
  const tierA = new THREE.Mesh(
    new THREE.CylinderGeometry(0.78, 0.95, 0.26, 40, 1, true),
    neonMat(T.ribband, H.tier, { repX: 10, repY: 1, emI: 2.0 })
  );
  tierA.position.y = -1.92; core.add(tierA);
  const tierB = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.8, 0.24, 36, 1, true),
    neonMat(T.saucer, H.saucer + 0.06, { repX: 1, repY: 1, emI: 2.0 })
  );
  tierB.position.y = -2.18; core.add(tierB);

  // bottom drum with white zig-zag bunting band
  const drum = new THREE.Mesh(
    new THREE.CylinderGeometry(1.05, 1.05, 0.5, 48, 1, true),
    neonMat(T.bunting, H.bunting, { repX: 3, repY: 1, emI: 2.2, lum: 0.7 })
  );
  drum.position.y = -2.6; core.add(drum);
  const drumTop = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.035, 8, 64), glowMat(H.bunting, 1.5, { lum: 0.72 }));
  drumTop.position.y = -2.35; drumTop.rotation.x = Math.PI / 2; core.add(drumTop);
  const drumBot = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.04, 8, 64), glowMat(H.bunting, 1.5, { lum: 0.72 }));
  drumBot.position.y = -2.85; drumBot.rotation.x = Math.PI / 2; core.add(drumBot);

  // ---- final placement -----------------------------------------------------
  lantern.position.set(0, 0.6, -3);
  lantern.scale.setScalar(0.42);
  return lantern;
}

// ============================================================================
//  Per-frame animation  — the structure holds still; the NEON CYCLES colour.
// ============================================================================
export function updateLantern(lantern, delta = 0.016) {
  if (!lantern) return;
  const U = lantern.userData;
  U.time += delta;
  const t = U.time;

  // master hue sweep (green→cyan→blue→magenta→red→gold→…). Increasing hue.
  const baseHue = U.phase0 + t / HUE_CYCLE;

  // gentle hanging-piece sway (NO spin — matches the reference)
  if (U.core) U.core.position.y = Math.sin(t * 0.8 + U.swayPhase) * 0.03;
  lantern.rotation.z = Math.sin(t * 0.55 + U.swayPhase) * 0.015;
  lantern.rotation.x = Math.sin(t * 0.4 + U.swayPhase + 1.0) * 0.012;

  // a soft LED shimmer overlaid on the cycle
  const shimmer = 0.92 + Math.sin(t * 5.0) * 0.05 + Math.sin(t * 13.0) * 0.03;

  // drive every neon region through the colour wheel at its own phase offset
  const _c = updateLantern._c || (updateLantern._c = new THREE.Color());
  U.neon.forEach((o) => {
    let h = baseHue + o.off; h = h - Math.floor(h);
    _c.setHSL(h, o.sat, o.lum);
    o.mat.emissive.copy(_c);
    o.mat.emissiveIntensity = o.emBase * shimmer;
  });

  // point-lights follow their region's colour so the cast light matches
  U.lights.forEach((o) => {
    let h = baseHue + o.off; h = h - Math.floor(h);
    o.light.color.setHSL(h, 0.85, 0.6);
    o.light.intensity = o.base * shimmer;
  });

  // glow shells breathe + track colour
  U.glowShells.forEach((s) => {
    const k = 1 + Math.sin(t * 2.6) * 0.05;
    s.mesh.scale.setScalar(k);
    let h = baseHue + s.off; h = h - Math.floor(h);
    if (s.mesh.material.color) s.mesh.material.color.setHSL(h, 0.8, 0.6);
    s.mesh.material.opacity = s.base * (0.85 + Math.abs(Math.sin(t * 2.6)) * 0.4);
  });

  // hanging fans + tassels sway softly on their threads
  U.fans.forEach((p) => {
    if (p.group.children[0]) p.group.children[0].rotation.x = (p.base || 0) + Math.sin(t * 1.3 + p.phase) * 0.06;
    p.group.rotation.z = Math.sin(t * 1.1 + p.phase) * 0.04;
  });
  U.tassels.forEach((b) => {
    b.group.rotation.z = Math.sin(t * 1.8 + b.phase) * 0.18;
    b.group.rotation.x = Math.cos(t * 1.4 + b.phase) * 0.12;
  });
  U.scrolls.forEach((r) => {
    r.group.rotation.z = Math.sin(t * 1.0 + r.phase) * 0.03;
  });
}

// ============================================================================
//  Procedural canvas pattern textures  (bright neon line-art on black)
// ============================================================================
function patternTexture(kind, size) {
  const key = kind + "_" + size;
  if (_texCache.has(key)) return _texCache.get(key);

  const cv = (typeof document !== "undefined")
    ? Object.assign(document.createElement("canvas"), { width: size, height: size })
    : globalThis.__makeCanvas(size, size);   // node test shim
  const x = cv.getContext("2d");
  drawPattern(kind, x, size);

  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  if (tex.anisotropy !== undefined) tex.anisotropy = 8;
  if (THREE.SRGBColorSpace && "colorSpace" in tex) tex.colorSpace = THREE.SRGBColorSpace;
  _texCache.set(key, tex);
  return tex;
}

function drawPattern(kind, x, S) {
  const C = S / 2;
  const W = "#ffffff", WARM = "#ffe9c0";
  x.fillStyle = "#000"; x.fillRect(0, 0, S, S);
  x.strokeStyle = W; x.fillStyle = W;
  x.lineCap = "round"; x.lineJoin = "round";
  const lw = (v) => (x.lineWidth = Math.max(1, S * v));
  const circle = (cx, cy, r, fill) => { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); fill ? x.fill() : x.stroke(); };
  const dot = (cx, cy, r) => { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); };
  const glow = (cx, cy, r, a) => {
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, "rgba(255,255,255," + a + ")"); g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); x.fillStyle = W;
  };

  // ---- a sunflower / mandala medallion ----
  const medallion = (cx, cy, R) => {
    glow(cx, cy, R * 1.15, 0.10);
    lw(0.006); circle(cx, cy, R, false);
    lw(0.004); circle(cx, cy, R * 0.62, false);
    let od = 40;
    for (let i = 0; i < od; i++) { const a = i / od * Math.PI * 2; dot(cx + Math.cos(a) * R * 0.82, cy + Math.sin(a) * R * 0.82, R * 0.022); }
    lw(0.006); let pn = 24;
    for (let i = 0; i < pn; i++) {
      const a = i / pn * Math.PI * 2;
      x.beginPath();
      x.moveTo(cx + Math.cos(a) * R * 0.62, cy + Math.sin(a) * R * 0.62);
      x.lineTo(cx + Math.cos(a) * R * 0.99, cy + Math.sin(a) * R * 0.99);
      x.stroke();
    }
    lw(0.005); let inn = 12;
    for (let i = 0; i < inn; i++) {
      const a = i / inn * Math.PI * 2 + 0.13;
      x.beginPath(); x.moveTo(cx, cy);
      x.lineTo(cx + Math.cos(a) * R * 0.55, cy + Math.sin(a) * R * 0.55); x.stroke();
    }
    dot(cx, cy, R * 0.1);
  };
  const flourish = (cx, cy, s) => {
    lw(0.006);
    for (const sgn of [-1, 1]) {
      x.beginPath();
      x.moveTo(cx, cy + s * 0.1);
      x.bezierCurveTo(cx + sgn * s * 0.1, cy - s * 0.5, cx + sgn * s * 0.7, cy - s * 0.55, cx + sgn * s * 0.6, cy - s * 0.1);
      x.bezierCurveTo(cx + sgn * s * 0.55, cy + s * 0.2, cx + sgn * s * 0.2, cy + s * 0.18, cx + sgn * s * 0.28, cy - s * 0.05);
      x.stroke();
      dot(cx + sgn * s * 0.3, cy - s * 0.02, s * 0.05);
    }
  };
  const triMotif = (cx, cy, s) => {
    lw(0.005);
    x.beginPath(); x.moveTo(cx, cy - s); x.lineTo(cx + s * 0.7, cy + s * 0.5); x.lineTo(cx - s * 0.7, cy + s * 0.5); x.closePath(); x.stroke();
    for (let i = 1; i < 4; i++) {
      const w = (s * 0.7) * (i / 4);
      x.beginPath(); x.moveTo(cx - w, cy - s + s * 1.5 * (i / 4)); x.lineTo(cx + w, cy - s + s * 1.5 * (i / 4)); x.stroke();
    }
  };

  if (kind === "canopy") {
    lw(0.004);
    for (let i = 0; i < 18; i++) circle((i + 0.5) * S / 18, S * 0.045, S * 0.011, false);
    const cols = 3, rows = 3, R = S / cols * 0.34;
    for (let r = 0; r < rows; r++) for (let cc = 0; cc < cols; cc++) {
      const cx = (cc + 0.5) * S / cols, cy = S * 0.16 + (r + 0.5) * (S * 0.78) / rows;
      if ((r + cc) % 2 === 0) medallion(cx, cy, R);
      else { flourish(cx, cy - R * 0.15, R * 1.15); triMotif(cx, cy + R * 0.6, R * 0.45); }
    }
    return;
  }

  if (kind === "fan") {
    const baseY = S * 0.9, apexY = S * 0.16, fanR = S * 0.46;
    glow(C, baseY, fanR * 1.2, 0.12);
    lw(0.012); x.beginPath(); x.arc(C, baseY, fanR, Math.PI * 1.12, Math.PI * 1.88); x.stroke();
    lw(0.006); x.beginPath(); x.arc(C, baseY, fanR * 0.84, Math.PI * 1.1, Math.PI * 1.9); x.stroke();
    const beads = 15;
    for (let i = 0; i <= beads; i++) { const a = Math.PI * 1.12 + (Math.PI * 0.76) * i / beads; dot(C + Math.cos(a) * fanR, baseY + Math.sin(a) * fanR, S * 0.016); }
    lw(0.006); const ribs = 13;
    for (let i = 0; i <= ribs; i++) {
      const a = Math.PI * 1.14 + (Math.PI * 0.72) * i / ribs;
      x.beginPath();
      x.moveTo(C + Math.cos(a) * fanR * 0.2, baseY + Math.sin(a) * fanR * 0.2);
      x.lineTo(C + Math.cos(a) * fanR * 0.82, baseY + Math.sin(a) * fanR * 0.82); x.stroke();
    }
    medallion(C, baseY - fanR * 0.05, fanR * 0.2);
    lw(0.008); x.beginPath(); x.arc(C, apexY + S * 0.06, S * 0.07, Math.PI, 0); x.stroke();
    dot(C, apexY, S * 0.02);
    return;
  }

  if (kind === "vase") {
    glow(C, C, S * 0.6, 0.18);
    lw(0.02); const rib = 9;
    for (let i = 0; i <= rib; i++) { const px = (i / rib) * S; x.beginPath(); x.moveTo(px, 0); x.lineTo(px, S); x.stroke(); }
    x.fillStyle = WARM;
    for (const by of [0.18, 0.5, 0.82]) for (let i = 0; i < 24; i++) dot((i + 0.5) * S / 24, by * S, S * 0.014);
    x.fillStyle = W;
    return;
  }

  if (kind === "saucer") {
    lw(0.014);
    for (const ry of [0.2, 0.5, 0.8]) { x.beginPath(); x.moveTo(0, ry * S); x.lineTo(S, ry * S); x.stroke(); }
    lw(0.006); const sp = 40;
    for (let i = 0; i < sp; i++) { const px = i / sp * S; x.beginPath(); x.moveTo(px, S * 0.12); x.lineTo(px, S * 0.88); x.stroke(); }
    for (let i = 0; i < sp; i++) dot((i + 0.5) / sp * S, S * 0.5, S * 0.02);
    return;
  }

  if (kind === "medallions") {
    lw(0.01); const n = 6;
    for (let i = 0; i < n; i++) medallion((i + 0.5) * S / n, C, S / n * 0.4);
    lw(0.006);
    x.beginPath(); x.moveTo(0, S * 0.06); x.lineTo(S, S * 0.06); x.stroke();
    x.beginPath(); x.moveTo(0, S * 0.94); x.lineTo(S, S * 0.94); x.stroke();
    return;
  }

  if (kind === "bunting") {
    lw(0.012);
    x.beginPath(); x.moveTo(0, S * 0.2);
    const n = 12;
    for (let i = 0; i <= n; i++) { x.lineTo((i + 0.5) / n * S, S * 0.78); x.lineTo((i + 1) / n * S, S * 0.2); }
    x.stroke();
    for (const by of [0.1, 0.9]) for (let i = 0; i < 30; i++) dot((i + 0.5) / 30 * S, by * S, S * 0.014);
    return;
  }

  if (kind === "ribband") {
    lw(0.05);
    for (let i = 0; i < 5; i++) { const px = (i + 0.5) / 5 * S; x.beginPath(); x.moveTo(px, 0); x.lineTo(px, S); x.stroke(); }
    x.fillStyle = WARM;
    for (let i = 0; i < 5; i++) dot((i + 0.5) / 5 * S, C, S * 0.07);
    x.fillStyle = W;
    return;
  }
}

function hashText(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
