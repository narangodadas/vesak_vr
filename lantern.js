// =============================================================================
//  lantern.js  –  Vesak AR Lantern
//
//  Structure (top → bottom, matching design spec):
//    1. Top Hanging Ring & Cap        – Torus + Half-Octagon Dome
//    2. Top Octagon Ring Frame        – Wide octagonal band
//    3. Upper Tier  (small lanterns)  – 8 outer + 4 inner inverted-oct-pyramids
//    4. Second Ring Frame
//    5. Middle Tier (medium lanterns) – 10 outer + 5 inner
//    6. Third Ring Frame
//    7. Lower Tier  (large lanterns)  – 12 outer + 6 inner
//    8. Bottom Octagon Base           – Wide base plate
//    9. Bottom Finial & Drops         – Inverted pyramid + diamond/teardrop beads
//
//  Colour Palette
//    Warm Amber    #E8820C
//    Golden Yellow #FFD000
//    Orange        #FF6600
//    Dark Brown    #2D1200
//
//  Materials
//    panelMat   – translucent glowing amber/orange (emissive)
//    frameMat   – dark-brown wood/metal look
//    goldMat    – golden-yellow metallic (rings & caps)
// =============================================================================

const COLOURS = {
  warmAmber:    0xE8820C,
  goldenYellow: 0xFFD000,
  orange:       0xFF6600,
  darkBrown:    0x2D1200,
  deepAmber:    0xC06000,
};

// ---------------------------------------------------------------------------
//  Shared material factory  (call inside createLantern so each lantern has
//  its own material instances – safe for emissive animation)
// ---------------------------------------------------------------------------
function makeMaterials() {
  // Translucent glowing panels
  const panelMat = new THREE.MeshStandardMaterial({
    color:            COLOURS.warmAmber,
    emissive:         COLOURS.orange,
    emissiveIntensity: 1.1,
    transparent:      true,
    opacity:          0.82,
    roughness:        0.25,
    metalness:        0.05,
    side:             THREE.DoubleSide,
  });

  // Dark-brown frame / edges
  const frameMat = new THREE.MeshStandardMaterial({
    color:     COLOURS.darkBrown,
    roughness: 0.75,
    metalness: 0.35,
  });

  // Metallic golden-yellow rings & caps
  const goldMat = new THREE.MeshStandardMaterial({
    color:            COLOURS.goldenYellow,
    emissive:         COLOURS.warmAmber,
    emissiveIntensity: 0.35,
    roughness:        0.22,
    metalness:        0.82,
  });

  // Slightly deeper gold for base / secondary rings
  const amberGoldMat = new THREE.MeshStandardMaterial({
    color:            COLOURS.deepAmber,
    emissive:         COLOURS.warmAmber,
    emissiveIntensity: 0.45,
    roughness:        0.30,
    metalness:        0.70,
  });

  return { panelMat, frameMat, goldMat, amberGoldMat };
}

// =============================================================================
//  PUBLIC API
// =============================================================================

/**
 * createLantern(qrText)
 *   Returns a THREE.Group containing the full lantern hierarchy.
 *   The group origin is at the lantern's visual centre (~mid-height).
 *   main.js positions and scales it; internal Y values are already relative.
 */
export function createLantern(qrText) {
  const root = new THREE.Group();
  const { panelMat, frameMat, goldMat, amberGoldMat } = makeMaterials();

  // ------------------------------------------------------------------
  //  Part 1 – Top Hanging Ring & Cap  (y ≈ +2.90)
  // ------------------------------------------------------------------
  const topCap = buildTopCap(goldMat, frameMat);
  topCap.position.y = 2.90;
  root.add(topCap);

  // ------------------------------------------------------------------
  //  Part 2 – Top Octagon Ring Frame  (y ≈ +2.40, r = 0.72)
  // ------------------------------------------------------------------
  const frame1 = buildOctagonRingFrame(0.72, 0.14, goldMat, frameMat);
  frame1.position.y = 2.40;
  root.add(frame1);

  // ------------------------------------------------------------------
  //  Part 3 – Upper Tier  small lanterns  (y ≈ +1.82)
  //           8 outer (r = 0.62)  +  4 inner (r = 0.28)
  // ------------------------------------------------------------------
  const upperTier = buildTier(
    { outerCount: 8,  outerRadius: 0.62, w: 0.170, h: 0.260 },
    { innerCount: 4,  innerRadius: 0.26, w: 0.115, h: 0.185 },
    panelMat, frameMat, goldMat
  );
  upperTier.position.y = 1.82;
  root.add(upperTier);

  // ------------------------------------------------------------------
  //  Part 4 – Second Ring Frame  (y ≈ +1.28, r = 0.90)
  // ------------------------------------------------------------------
  const frame2 = buildOctagonRingFrame(0.90, 0.14, goldMat, frameMat);
  frame2.position.y = 1.28;
  root.add(frame2);

  // ------------------------------------------------------------------
  //  Part 5 – Middle Tier  medium lanterns  (y ≈ +0.64)
  //           10 outer (r = 0.80)  +  5 inner (r = 0.36)
  // ------------------------------------------------------------------
  const midTier = buildTier(
    { outerCount: 10, outerRadius: 0.80, w: 0.200, h: 0.310 },
    { innerCount: 5,  innerRadius: 0.36, w: 0.145, h: 0.220 },
    panelMat, frameMat, goldMat
  );
  midTier.position.y = 0.64;
  root.add(midTier);

  // ------------------------------------------------------------------
  //  Part 6 – Third Ring Frame  (y ≈ +0.02, r = 1.08)
  // ------------------------------------------------------------------
  const frame3 = buildOctagonRingFrame(1.08, 0.15, goldMat, frameMat);
  frame3.position.y = 0.02;
  root.add(frame3);

  // ------------------------------------------------------------------
  //  Part 7 – Lower Tier  large lanterns  (y ≈ −0.72)
  //           12 outer (r = 0.98)  +  6 inner (r = 0.44)
  // ------------------------------------------------------------------
  const lowerTier = buildTier(
    { outerCount: 12, outerRadius: 0.98, w: 0.235, h: 0.370 },
    { innerCount: 6,  innerRadius: 0.44, w: 0.170, h: 0.265 },
    panelMat, frameMat, goldMat
  );
  lowerTier.position.y = -0.72;
  root.add(lowerTier);

  // ------------------------------------------------------------------
  //  Part 8 – Bottom Octagon Base  (y ≈ −1.26)
  // ------------------------------------------------------------------
  const base = buildBottomBase(1.05, amberGoldMat, frameMat);
  base.position.y = -1.26;
  root.add(base);

  // ------------------------------------------------------------------
  //  Part 9 – Bottom Finial & Drops  (y ≈ −1.46)
  // ------------------------------------------------------------------
  const finial = buildFinialDrops(panelMat, goldMat, amberGoldMat);
  finial.position.y = -1.46;
  root.add(finial);

  // ------------------------------------------------------------------
  //  Internal point lights  (warm glow emanating from lantern body)
  // ------------------------------------------------------------------
  const light1 = new THREE.PointLight(0xFF9922, 2.8, 5.5, 1.6);
  light1.position.set(0, 0.9, 0);
  root.add(light1);

  const light2 = new THREE.PointLight(0xFF6600, 1.8, 4.0, 1.8);
  light2.position.set(0, -0.3, 0);
  root.add(light2);

  const light3 = new THREE.PointLight(0xFFCC44, 1.2, 3.0, 2.0);
  light3.position.set(0, 1.8, 0);
  root.add(light3);

  // ------------------------------------------------------------------
  //  userData for animation
  // ------------------------------------------------------------------
  root.userData = {
    time:       0,
    lights:     [light1, light2, light3],
    panelMat,           // stored so updateLantern can flicker emissiveIntensity
    baseY:      root.position.y,
    flickerSeeds: [0.0, 1.3, 2.7],
  };

  return root;
}

/**
 * updateLantern(lantern, delta)
 *   Called every animation frame.  Handles:
 *     – Gentle pendulum sway
 *     – Soft vertical float (breathing)
 *     – Flickering warm glow on lights + panel emissive
 */
export function updateLantern(lantern, delta) {
  if (!lantern) return;

  const ud = lantern.userData;
  ud.time += delta;
  const t = ud.time;

  // Pendulum sway (slow, organic)
  lantern.rotation.z = Math.sin(t * 0.38) * 0.022 + Math.sin(t * 0.71) * 0.009;
  lantern.rotation.x = Math.cos(t * 0.29) * 0.014 + Math.cos(t * 0.53) * 0.006;

  // Subtle float bob  (do NOT fight main.js anchor positioning – only local Y)
  lantern.position.y = Math.sin(t * 0.52) * 0.028;

  // Flicker lights
  if (ud.lights) {
    ud.lights.forEach((light, i) => {
      const seed = ud.flickerSeeds[i] ?? i;
      const flicker =
        Math.sin(t * 4.1 + seed * 2.3) * 0.18 +
        Math.sin(t * 7.3 + seed * 1.1) * 0.08 +
        (Math.random() < 0.06 ? (Math.random() - 0.5) * 0.15 : 0);

      const baseIntensity = [2.8, 1.8, 1.2][i] ?? 1.5;
      light.intensity = Math.max(0.4, baseIntensity + flicker);
    });
  }

  // Panel emissive flicker (soft)
  if (ud.panelMat) {
    ud.panelMat.emissiveIntensity =
      1.05 + Math.sin(t * 2.9) * 0.12 + Math.sin(t * 5.1) * 0.06;
  }
}

// =============================================================================
//  COMPONENT BUILDERS
// =============================================================================

// ---------------------------------------------------------------------------
//  Part 1 – Top Hanging Ring & Cap
// ---------------------------------------------------------------------------
function buildTopCap(goldMat, frameMat) {
  const g = new THREE.Group();

  // Hanging ring  (Torus)
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.095, 0.022, 8, 20),
    goldMat
  );
  ring.position.y = 0.28;
  g.add(ring);

  // Suspension bar through torus
  const bar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.010, 0.010, 0.22, 6),
    goldMat
  );
  bar.position.y = 0.16;
  g.add(bar);

  // Dome cap (half-octagon – CylinderGeometry top-radius = 0, 8 sides)
  const dome = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.30, 0.22, 8),
    goldMat
  );
  dome.position.y = 0.04;
  g.add(dome);

  // Dome collar / rim
  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.30, 0.040, 8),
    goldMat
  );
  collar.position.y = -0.065;
  g.add(collar);

  // Decorative notch rings on dome
  for (let i = 0; i < 3; i++) {
    const notch = new THREE.Mesh(
      new THREE.TorusGeometry(0.30 - i * 0.06, 0.008, 4, 8),
      frameMat
    );
    notch.rotation.x = Math.PI / 2;
    notch.position.y = 0.02 + i * 0.06;
    g.add(notch);
  }

  return g;
}

// ---------------------------------------------------------------------------
//  Part 2 / 4 / 6 – Octagon Ring Frame
// ---------------------------------------------------------------------------
function buildOctagonRingFrame(outerRadius, height, goldMat, frameMat) {
  const g = new THREE.Group();
  const SIDES = 8;

  // Main octagonal band (open cylinder)
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(outerRadius, outerRadius, height, SIDES, 1, true),
    goldMat
  );
  g.add(band);

  // Top bevel  (slightly wider)
  const topBevel = new THREE.Mesh(
    new THREE.CylinderGeometry(outerRadius + 0.04, outerRadius, 0.035, SIDES),
    goldMat
  );
  topBevel.position.y = height / 2 + 0.018;
  g.add(topBevel);

  // Bottom bevel
  const botBevel = new THREE.Mesh(
    new THREE.CylinderGeometry(outerRadius, outerRadius + 0.04, 0.035, SIDES),
    goldMat
  );
  botBevel.position.y = -(height / 2 + 0.018);
  g.add(botBevel);

  // Dark-brown vertical frame struts at each octagon corner
  for (let i = 0; i < SIDES; i++) {
    const angle = (i / SIDES) * Math.PI * 2 + Math.PI / SIDES;
    const r     = outerRadius - 0.015;
    const strut = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, height * 1.05, 4),
      frameMat
    );
    strut.position.set(Math.cos(angle) * r, 0, Math.sin(angle) * r);
    g.add(strut);
  }

  // Horizontal mid-ring accent
  const midRing = new THREE.Mesh(
    new THREE.TorusGeometry(outerRadius - 0.01, 0.009, 4, SIDES),
    frameMat
  );
  midRing.rotation.x = Math.PI / 2;
  g.add(midRing);

  return g;
}

// ---------------------------------------------------------------------------
//  Tier builder – calls buildMiniLantern for outer + inner rings
// ---------------------------------------------------------------------------
function buildTier(outer, inner, panelMat, frameMat, goldMat) {
  const g = new THREE.Group();

  // Outer ring
  for (let i = 0; i < outer.outerCount; i++) {
    const angle   = (i / outer.outerCount) * Math.PI * 2;
    const lantern = buildMiniLantern(outer.w, outer.h, panelMat, frameMat, goldMat);
    lantern.position.set(
      Math.cos(angle) * outer.outerRadius,
      0,
      Math.sin(angle) * outer.outerRadius
    );
    // Slight random sway offset for organic feel
    lantern.rotation.y = angle + Math.PI; // face outward
    g.add(lantern);
  }

  // Inner ring  (offset angle so they sit between outer lanterns)
  for (let i = 0; i < inner.innerCount; i++) {
    const angle   = (i / inner.innerCount) * Math.PI * 2 + Math.PI / inner.innerCount;
    const lantern = buildMiniLantern(inner.w, inner.h, panelMat, frameMat, goldMat);
    lantern.position.set(
      Math.cos(angle) * inner.innerRadius,
      0,
      Math.sin(angle) * inner.innerRadius
    );
    lantern.rotation.y = angle + Math.PI;
    g.add(lantern);
  }

  return g;
}

// ---------------------------------------------------------------------------
//  Single mini-lantern (Inverted Octagonal Pyramid with panelled sides)
// ---------------------------------------------------------------------------
function buildMiniLantern(w, h, panelMat, frameMat, goldMat) {
  const g    = new THREE.Group();
  const SIDE = 8;

  // Body: inverted octagonal pyramid
  //   top-radius = w  (wide end, at top)
  //   bot-radius = w * 0.14  (narrow tip, at bottom)
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(w * 0.14, w, h, SIDE, 1, true),
    panelMat
  );
  g.add(body);

  // Top ring cap (golden collar)
  const topCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(w * 1.08, w * 1.02, h * 0.10, SIDE),
    goldMat
  );
  topCollar.position.y = h / 2;
  g.add(topCollar);

  // Dark-brown vertical edge struts at each of the 8 corners
  for (let i = 0; i < SIDE; i++) {
    const angle = (i / SIDE) * Math.PI * 2;
    // The strut runs from (w, top) to (w*0.14, bottom) – simplify as thin bar
    const strut = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, h * 1.02, 4),
      frameMat
    );
    // Average radius for placement
    const rTop = w;
    const rBot = w * 0.14;
    const rMid = (rTop + rBot) / 2;
    strut.position.set(Math.cos(angle) * rMid * 0.92, 0, Math.sin(angle) * rMid * 0.92);
    g.add(strut);
  }

  // Horizontal mid-band accent
  const midBand = new THREE.Mesh(
    new THREE.CylinderGeometry(w * 0.60, w * 0.60, h * 0.045, SIDE, 1, true),
    frameMat
  );
  midBand.position.y = -h * 0.08;
  g.add(midBand);

  // Bottom tip point (small inverted cone, dark brown)
  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(w * 0.135, h * 0.18, SIDE),
    frameMat
  );
  tip.rotation.x = Math.PI;    // invert to point downward
  tip.position.y  = -(h / 2) - h * 0.09;
  g.add(tip);

  // Hanging bead below tip
  const bead = new THREE.Mesh(
    new THREE.SphereGeometry(w * 0.065, 6, 6),
    panelMat
  );
  bead.position.y = -(h / 2) - h * 0.30;
  g.add(bead);

  return g;
}

// ---------------------------------------------------------------------------
//  Part 8 – Bottom Octagon Base
// ---------------------------------------------------------------------------
function buildBottomBase(radius, goldMat, frameMat) {
  const g    = new THREE.Group();
  const SIDE = 8;

  // Wide base plate
  const plate = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 1.08, 0.095, SIDE),
    goldMat
  );
  g.add(plate);

  // Raised inner disc
  const inner = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.55, radius * 0.55, 0.060, SIDE),
    goldMat
  );
  inner.position.y = 0.07;
  g.add(inner);

  // Outer rim edge strip (dark brown)
  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 1.09, radius * 1.09, 0.065, SIDE, 1, true),
    frameMat
  );
  g.add(rim);

  // Corner posts on base
  for (let i = 0; i < SIDE; i++) {
    const angle = (i / SIDE) * Math.PI * 2 + Math.PI / SIDE;
    const post  = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.014, 0.12, 5),
      frameMat
    );
    post.position.set(Math.cos(angle) * radius * 0.90, 0.06, Math.sin(angle) * radius * 0.90);
    g.add(post);
  }

  return g;
}

// ---------------------------------------------------------------------------
//  Part 9 – Bottom Finial & Drops
// ---------------------------------------------------------------------------
function buildFinialDrops(panelMat, goldMat, amberGoldMat) {
  const g = new THREE.Group();

  // Central inverted pyramid finial
  const finial = new THREE.Mesh(
    new THREE.ConeGeometry(0.115, 0.28, 8),
    amberGoldMat
  );
  finial.rotation.x = Math.PI;       // point downward
  finial.position.y = -0.05;
  g.add(finial);

  // Finial collar where it meets the base
  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.115, 0.045, 8),
    goldMat
  );
  collar.position.y = 0.10;
  g.add(collar);

  // Diamond / tear-drop bead drops arranged in two rings
  const outerDropConfig = [
    { r: 0.42, count: 8,  yOff: -0.10, scale: 1.00 },
    { r: 0.28, count: 6,  yOff: -0.18, scale: 0.82 },
    { r: 0.14, count: 4,  yOff: -0.26, scale: 0.68 },
  ];

  outerDropConfig.forEach(cfg => {
    for (let i = 0; i < cfg.count; i++) {
      const angle = (i / cfg.count) * Math.PI * 2;
      const drop  = buildTeardropBead(panelMat, goldMat, cfg.scale);
      drop.position.set(
        Math.cos(angle) * cfg.r,
        cfg.yOff,
        Math.sin(angle) * cfg.r
      );
      g.add(drop);
    }
  });

  return g;
}

// Single diamond / tear-drop bead  (two cones joined at their wide ends)
function buildTeardropBead(panelMat, goldMat, scale = 1) {
  const g    = new THREE.Group();
  const r    = 0.038 * scale;
  const hTop = 0.070 * scale;
  const hBot = 0.095 * scale;

  // Upper cone (point up)
  const top = new THREE.Mesh(
    new THREE.ConeGeometry(r, hTop, 6),
    panelMat
  );
  top.position.y = hTop / 2;
  g.add(top);

  // Lower elongated cone (point down = teardrop shape)
  const bot = new THREE.Mesh(
    new THREE.ConeGeometry(r, hBot, 6),
    panelMat
  );
  bot.rotation.x = Math.PI;
  bot.position.y = -hBot / 2;
  g.add(bot);

  // Tiny gold collar at the join
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 1.15, r * 1.15, 0.012 * scale, 6),
    goldMat
  );
  g.add(band);

  return g;
}