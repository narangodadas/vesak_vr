// ============================================================================
//  Vesak Kūdu — ornate tiered structural lantern (matches reference image)
//  ---------------------------------------------------------------------------
//  Central tower:  flared base → patterned funnels → ribbed glowing bulb →
//                  upper funnel → dharmachakra hex drum → peaked roof finial
//  Around it:      pavilion (hut) lanterns on arms, ribbon scrolls,
//                  hanging bead-ball lanterns
//  Surfaces:       procedural CANVAS textures (mandala / paisley / dharma wheel
//                  / hatch / vertical ribs) that glow like lit tissue paper —
//                  no external image files needed.
//
//  Public API unchanged — drop-in replacement:
//      createLantern(type)            -> THREE.Group
//      updateLantern(lantern, delta)  -> void   (call every frame)
//
//  Uses the global `THREE`. Only core geometries are used (works across versions).
// ============================================================================

const _texCache = new Map();

export function createLantern(type = "vesak-lantern-1") {
  // ---- Palettes (warm orange/red default to match the reference) ----------
  const colorSets = {
    "vesak-lantern-1": { paper: 0xff5519, line: 0x5c0f00, glow: 0xff7d30, trim: 0xffb648, light: 0xff8a3a }, // orange
    "vesak-lantern-2": { paper: 0xff2733, line: 0x5a0008, glow: 0xff5a52, trim: 0xffc27a, light: 0xff5742 }, // crimson
    "vesak-lantern-3": { paper: 0xffab12, line: 0x6e3500, glow: 0xffcf57, trim: 0xfff0a8, light: 0xffb84d }, // amber/gold
    "vesak-lantern-4": { paper: 0xff2e8a, line: 0x52003a, glow: 0xff79bd, trim: 0xffd0e8, light: 0xff5fae }, // magenta
    "vesak-lantern-5": { paper: 0x12c46a, line: 0x004023, glow: 0x5cf7a0, trim: 0xd6ffe6, light: 0x37e08a }  // emerald
  };
  const keys = Object.keys(colorSets);
  const c = colorSets[type] || colorSets[keys[Math.abs(hashText(type)) % keys.length]];
  const seed = Math.abs(hashText(type));

  // ---- Pre-build the patterned textures (cached & shared) ------------------
  const T = {
    mandala: patternTexture("mandala", c, 512),
    paisley: patternTexture("paisley", c, 512),
    wheel:   patternTexture("wheel",   c, 384),
    hatch:   patternTexture("hatch",   c, 256),
    ribs:    patternTexture("ribs",    c, 256),
    base:    patternTexture("base",    c, 512),
    hut:     patternTexture("hut",     c, 256)
  };

  const lantern = new THREE.Group();          // outer pivot (sway lives here)
  const core = new THREE.Group();             // everything that spins / floats
  lantern.add(core);

  lantern.userData = {
    time: (seed % 1000) * 0.01,
    core,
    spinSpeed: 0.10 + (seed % 8) / 100,
    swayPhase: (seed % 628) / 100,
    lights: [],
    patternMats: [],
    glowShells: [],
    pavilions: [],
    balls: [],
    ribbons: []
  };
  const U = lantern.userData;

  // ---- Material helpers ----------------------------------------------------
  const texMat = (tex, repX, repY, emI) => {
    if (emI === undefined) emI = 1.05;
    const t = tex.clone(); t.needsUpdate = true;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repX, repY);
    const m = new THREE.MeshStandardMaterial({
      map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: emI,
      side: THREE.DoubleSide, roughness: 0.62, metalness: 0.0
    });
    U.patternMats.push({ mat: m, base: emI, phase: U.patternMats.length * 0.7 });
    return m;
  };
  const trimMat = (emI) => new THREE.MeshStandardMaterial({
    color: c.trim, emissive: c.trim, emissiveIntensity: emI === undefined ? 0.5 : emI, roughness: 0.35, metalness: 0.2
  });
  const solidGlow = (hex, emI) => new THREE.MeshStandardMaterial({
    color: hex, emissive: hex, emissiveIntensity: emI === undefined ? 0.8 : emI, roughness: 0.5, metalness: 0.05
  });

  const addRing = (y, r, s) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.018, 12, 60), trimMat(0.45));
    m.position.y = y; m.rotation.x = Math.PI / 2; m.scale.setScalar(s === undefined ? 1 : s); core.add(m);
  };

  // ==========================================================================
  //  CENTRAL TOWER  (built bottom → top)
  // ==========================================================================

  // flared base skirt
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.46, 0.96, 0.8, 8, 1, true),
    texMat(T.base, 8, 1)
  );
  base.position.y = -2.55; core.add(base);
  addRing(-2.95, 0.96); addRing(-2.15, 0.5);

  // lower funnel (wide at bottom → narrow at bulb), big mandala
  const lower = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.9, 1.5, 8, 1, true),
    texMat(T.mandala, 8, 1)
  );
  lower.position.y = -1.35; core.add(lower);
  addRing(-0.6, 0.34); addRing(-2.1, 0.9);

  // ribbed glowing bulb (the "pot")
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.46, 24, 18), texMat(T.ribs, 16, 1, 1.25));
  bulb.position.y = -0.35; bulb.scale.set(1, 0.92, 1); core.add(bulb);
  addRing(-0.35, 0.47); addRing(-0.08, 0.34); addRing(-0.62, 0.34);

  // upper funnel (narrow at bulb → wide under hex), big paisley
  const upper = new THREE.Mesh(
    new THREE.CylinderGeometry(0.82, 0.32, 1.5, 8, 1, true),
    texMat(T.paisley, 8, 1)
  );
  upper.position.y = 0.5; core.add(upper);
  addRing(1.25, 0.84); addRing(-0.1, 0.34);

  // dharmachakra hex drum
  const hex = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 0.66, 6, 1, true),
    texMat(T.wheel, 6, 1)
  );
  hex.position.y = 1.6; core.add(hex);
  addRing(1.93, 0.52); addRing(1.27, 0.52);

  // peaked roof finial
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.5, 6), trimMat(0.7));
  roof.position.y = 2.18; core.add(roof);
  const tipBall = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), solidGlow(c.glow, 0.9));
  tipBall.position.y = 2.5; core.add(tipBall);

  // soft inner glow + outer halo
  const glowMat = new THREE.MeshBasicMaterial({ color: c.glow, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.55, 20, 20), glowMat);
  glow.position.y = -0.35; core.add(glow);
  U.glowShells.push({ mesh: glow, base: 0.55 });

  const haloMat = new THREE.MeshBasicMaterial({ color: c.glow, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false });
  const halo = new THREE.Mesh(new THREE.SphereGeometry(2.6, 18, 18), haloMat);
  core.add(halo);
  U.glowShells.push({ mesh: halo, base: 0.1 });

  // a few warm lights so the structure casts glow into the scene
  [[0.5, c.light, 3.0, 7], [-1.3, c.light, 2.6, 6], [-0.35, c.glow, 2.0, 5]].forEach(function (cfg) {
    var L = new THREE.PointLight(cfg[1], cfg[2], cfg[3], 1.6); L.position.y = cfg[0]; core.add(L);
    U.lights.push({ light: L, base: cfg[2] });
  });

  // ==========================================================================
  //  PAVILION (hut) LANTERNS on arms — two tiers
  // ==========================================================================
  const buildPavilion = () => {
    const g = new THREE.Group();
    const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.16, 6), solidGlow(0xffffff, 0));
    thread.position.y = -0.08; g.add(thread);

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), texMat(T.hut, 1, 1, 1.1));
    body.position.y = -0.31; g.add(body);

    const rf = new THREE.Mesh(new THREE.ConeGeometry(0.27, 0.22, 4), trimMat(0.6));
    rf.position.y = -0.07; rf.rotation.y = Math.PI / 4; g.add(rf);

    const eave = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.012, 8, 4), trimMat(0.5));
    eave.position.y = -0.17; eave.rotation.x = Math.PI / 2; eave.rotation.z = Math.PI / 4; g.add(eave);

    // little hanging tassel ball under the hut
    const tThread = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.12, 6), solidGlow(0xffffff, 0));
    tThread.position.y = -0.52; g.add(tThread);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), solidGlow(c.glow, 0.85));
    ball.position.y = -0.61; g.add(ball);
    return g;
  };

  const arm = (angle, R, y) => {
    const a = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, R - 0.45, 6), trimMat(0.35));
    a.rotation.z = Math.PI / 2; a.rotation.y = -angle;
    const mid = (R + 0.45) / 2;
    a.position.set(Math.sin(angle) * mid, y, Math.cos(angle) * mid);
    core.add(a);
  };

  const placeTier = (count, R, y, startA) => {
    for (let i = 0; i < count; i++) {
      const angle = startA + (i / count) * Math.PI * 2;
      arm(angle, R, y);
      const p = buildPavilion();
      p.position.set(Math.sin(angle) * R, y, Math.cos(angle) * R);
      p.rotation.y = angle;                 // face outward
      p.userData.phase = i * 0.8 + y;
      core.add(p);
      U.pavilions.push({ group: p, phase: p.userData.phase });
    }
  };
  placeTier(4, 1.15, 0.55, 0.4);
  placeTier(5, 1.1, -1.25, 0.0);

  // ==========================================================================
  //  RIBBON SCROLLS — curling flat ribbons at two levels
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
    const geo = new THREE.TubeGeometry(curve, 48, 0.05, 6, false);
    const m = new THREE.Mesh(geo, solidGlow(c.paper, 0.95));
    m.scale.set(1, 1, 0.32);                 // flatten into a ribbon
    const wrap = new THREE.Group();
    wrap.add(m);
    wrap.position.set(Math.sin(angle) * 0.55, y, Math.cos(angle) * 0.55);
    wrap.rotation.y = angle + (flip ? Math.PI : 0);
    wrap.userData.phase = angle + y;
    core.add(wrap);
    U.ribbons.push({ group: wrap, phase: wrap.userData.phase });
  };
  makeRibbon(0.9, 0.55, false); makeRibbon(0.9, 0.55, true);
  makeRibbon(Math.PI - 0.9, -1.0, false); makeRibbon(Math.PI - 0.9, -1.0, true);

  // ==========================================================================
  //  HANGING BEAD-BALL LANTERNS scattered around the lower half
  // ==========================================================================
  const buildBall = () => {
    const g = new THREE.Group();
    const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.3, 6), solidGlow(0xffffff, 0));
    thread.position.y = -0.15; g.add(thread);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 14), solidGlow(c.glow, 0.9));
    ball.position.y = -0.36; g.add(ball);
    for (let j = 0; j < 2; j++) {
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), solidGlow(c.trim, 0.6));
      bead.position.y = -0.46 - j * 0.06; g.add(bead);
    }
    return g;
  };
  const ballSpots = [[0.0, 0.85, -1.7], [0.7, 1.0, -1.9], [1.5, 0.8, -1.6],
                     [2.3, 1.05, -2.0], [3.0, 0.78, -1.7], [3.8, 1.0, -1.95],
                     [4.6, 0.82, -1.65], [5.4, 1.0, -1.9], [6.0, 0.85, -1.75]];
  ballSpots.forEach(function (sp, i) {
    const b = buildBall();
    b.position.set(Math.sin(sp[0]) * sp[1], sp[2], Math.cos(sp[0]) * sp[1]);
    b.userData.phase = i * 0.9;
    core.add(b);
    U.balls.push({ group: b, phase: b.userData.phase });
  });

  // ---- final placement -----------------------------------------------------
  lantern.position.set(0, 0.5, -3);
  lantern.scale.setScalar(0.5);
  return lantern;
}

// ============================================================================
//  Per-frame animation
// ============================================================================
export function updateLantern(lantern, delta = 0.016) {
  if (!lantern) return;
  const U = lantern.userData;
  U.time += delta;
  const t = U.time;

  if (U.core) {
    U.core.rotation.y += delta * U.spinSpeed;          // stately slow turn
    U.core.position.y = Math.sin(t * 0.9 + U.swayPhase) * 0.05;
  }
  // breeze sway of the whole centerpiece
  lantern.rotation.z = Math.sin(t * 0.7 + U.swayPhase) * 0.04;
  lantern.rotation.x = Math.sin(t * 0.5 + U.swayPhase + 1.2) * 0.03;

  // candle flicker drives the warm lights
  const flicker = 0.84 + Math.sin(t * 8) * 0.09 + Math.sin(t * 21) * 0.05 + Math.random() * 0.05;
  U.lights.forEach((o) => (o.light.intensity = o.base * flicker));

  // patterned paper shimmer (light breathing through tissue)
  U.patternMats.forEach((p) => {
    p.mat.emissiveIntensity = p.base + Math.sin(t * 2.4 + p.phase) * 0.16 + (flicker - 0.84) * 0.4;
  });

  // glow / halo breathing
  U.glowShells.forEach((s) => {
    const k = 1 + Math.sin(t * 3) * 0.07;
    s.mesh.scale.setScalar(k);
    if (s.mesh.material) s.mesh.material.opacity = s.base * (0.8 + Math.abs(Math.sin(t * 3)) * 0.5);
  });

  // pavilions swing on their arms
  U.pavilions.forEach((p) => {
    p.group.rotation.z = Math.sin(t * 1.6 + p.phase) * 0.13;
    p.group.rotation.x = Math.cos(t * 1.3 + p.phase) * 0.09;
  });

  // hanging balls swing a touch more
  U.balls.forEach((b) => {
    b.group.rotation.z = Math.sin(t * 1.9 + b.phase) * 0.2;
    b.group.rotation.x = Math.cos(t * 1.5 + b.phase) * 0.14;
  });

  // ribbon flutter
  U.ribbons.forEach((r) => {
    r.group.rotation.z = Math.sin(t * 1.4 + r.phase) * 0.12;
  });
}

// ============================================================================
//  Procedural canvas pattern textures  (lit paper + dark drawn line-work)
// ============================================================================
function patternTexture(kind, c, size) {
  const key = kind + "_" + c.paper + "_" + size;
  if (_texCache.has(key)) return _texCache.get(key);

  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  const x = cv.getContext("2d");
  const paper = css(c.paper), line = css(c.line), glow = css(c.glow), trim = css(c.trim);
  const S = size, C = size / 2;

  // lit-paper base: brighter glow in the centre fading to paper at edges
  const g = x.createRadialGradient(C, C, S * 0.05, C, C, S * 0.62);
  g.addColorStop(0, glow); g.addColorStop(0.55, paper); g.addColorStop(1, line);
  x.fillStyle = g; x.fillRect(0, 0, S, S);

  x.strokeStyle = line; x.fillStyle = line;
  x.lineCap = "round"; x.lineJoin = "round";
  const lw = (v) => (x.lineWidth = S * v);

  const frame = () => {                       // panel seam border
    lw(0.018); x.strokeRect(S * 0.04, S * 0.04, S * 0.92, S * 0.92);
    lw(0.006); x.strokeRect(S * 0.08, S * 0.08, S * 0.84, S * 0.84);
  };
  const circle = (cx, cy, r, fill) => {
    x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); fill ? x.fill() : x.stroke();
  };

  if (kind === "mandala" || kind === "base") {
    lw(0.01);
    const rings = kind === "base" ? 4 : 6;
    for (let i = 1; i <= rings; i++) circle(C, C, (S * 0.46) * (i / rings), false);
    const spokes = 24;
    lw(0.005);
    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * Math.PI * 2;
      x.beginPath(); x.moveTo(C, C);
      x.lineTo(C + Math.cos(a) * S * 0.46, C + Math.sin(a) * S * 0.46); x.stroke();
    }
    lw(0.006);
    const petals = 16, pr = S * 0.3;
    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * Math.PI * 2;
      circle(C + Math.cos(a) * pr, C + Math.sin(a) * pr, S * 0.05, false);
    }
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      circle(C + Math.cos(a) * S * 0.4, C + Math.sin(a) * S * 0.4, S * 0.012, true);
    }
    circle(C, C, S * 0.06, true);
    frame();
  }

  else if (kind === "paisley") {
    lw(0.007);
    for (let gy = 0; gy < 3; gy++) {
      for (let gx = 0; gx < 3; gx++) {
        const cx = (gx + 0.5) * S / 3, cy = (gy + 0.5) * S / 3, r = S / 7;
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
  }

  else if (kind === "wheel") {                // dharmachakra
    lw(0.012); circle(C, C, S * 0.4, false);
    lw(0.008); circle(C, C, S * 0.36, false); circle(C, C, S * 0.14, false);
    circle(C, C, S * 0.05, true);
    lw(0.01);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      x.beginPath();
      x.moveTo(C + Math.cos(a) * S * 0.05, C + Math.sin(a) * S * 0.05);
      x.lineTo(C + Math.cos(a) * S * 0.36, C + Math.sin(a) * S * 0.36); x.stroke();
    }
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      circle(C + Math.cos(a) * S * 0.4, C + Math.sin(a) * S * 0.4, S * 0.012, true);
    }
    frame();
  }

  else if (kind === "hut" || kind === "hatch") {  // pavilion wall: hatch + wheel + gable
    lw(0.004);
    for (let i = 1; i < 12; i++) {
      x.beginPath(); x.moveTo(S * i / 12, S * 0.12); x.lineTo(S * i / 12, S * 0.95); x.stroke();
      x.beginPath(); x.moveTo(S * 0.05, S * i / 12); x.lineTo(S * 0.95, S * i / 12); x.stroke();
    }
    lw(0.012);
    x.beginPath(); x.moveTo(S * 0.5, S * 0.05); x.lineTo(S * 0.88, S * 0.3); x.lineTo(S * 0.12, S * 0.3); x.closePath(); x.stroke();
    lw(0.01); circle(C, S * 0.62, S * 0.2, false); circle(C, S * 0.62, S * 0.07, false);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      x.beginPath();
      x.moveTo(C + Math.cos(a) * S * 0.07, S * 0.62 + Math.sin(a) * S * 0.07);
      x.lineTo(C + Math.cos(a) * S * 0.2, S * 0.62 + Math.sin(a) * S * 0.2); x.stroke();
    }
    frame();
  }

  else if (kind === "ribs") {                 // vertical ribs for the bulb
    lw(0.04);
    for (let i = 0; i < 4; i++) {
      x.beginPath(); x.moveTo(S * (i + 0.5) / 4, 0); x.lineTo(S * (i + 0.5) / 4, S); x.stroke();
    }
    lw(0.012);
    x.strokeStyle = trim;
    for (let i = 0; i < 4; i++) {
      x.beginPath(); x.moveTo(S * i / 4, 0); x.lineTo(S * i / 4, S); x.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  if (tex.anisotropy !== undefined) tex.anisotropy = 4;
  _texCache.set(key, tex);
  return tex;
}

function css(h) { return "#" + (h >>> 0).toString(16).padStart(6, "0").slice(-6); }

function hashText(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}