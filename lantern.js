// lantern.js  —  Vesak Kandyan Lantern  (Three.js r128-compatible)
// Matches the video: glowing blue filigree lantern with horizontal arms
// and hanging mini-lanterns.  Colour-coded by QR text.
//
//  Public API:
//    createLantern(qrText)  →  THREE.Group  (add to scene)
//    updateLantern(group, delta)  →  void   (call every frame)

/* ============================================================
   COLOUR PALETTE  (per QR text)
   ============================================================ */
const PALETTES = {
  "vesak-lantern-1": {
    primary:   0x1a55ff,   // electric blue
    emissive:  0x0033cc,
    secondary: 0x4488ff,
    glow:      0x002299,
  },
  "vesak-lantern-2": {
    primary:   0xff6600,   // warm amber / gold
    emissive:  0xcc4400,
    secondary: 0xffaa33,
    glow:      0x883300,
  },
  "vesak-lantern-3": {
    primary:   0xdd00ff,   // magenta / violet
    emissive:  0x990099,
    secondary: 0xff44ff,
    glow:      0x660077,
  },
};

function getPalette(qrText) {
  return PALETTES[qrText] || PALETTES["vesak-lantern-1"];
}

/* ============================================================
   FILIGREE CANVAS TEXTURE
   Procedurally draws an Islamic / floral lace pattern on a
   canvas, then bakes it into a Three.js CanvasTexture.
   ============================================================ */
function makeFiligreeTexture(color, size = 256) {
  const canvas = document.createElement("canvas");
  canvas.width  = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  // Background — transparent (we use alphaMap + transparent material)
  ctx.clearRect(0, 0, size, size);

  const hex   = "#" + color.toString(16).padStart(6, "0");
  ctx.strokeStyle = hex;
  ctx.fillStyle   = hex;
  ctx.lineWidth   = 1.2;

  const cell = size / 4;   // 4×4 tile grid

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const cx = col * cell + cell / 2;
      const cy = row * cell + cell / 2;
      const r  = cell * 0.42;

      // Outer circle
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      // 8-petal flower
      for (let p = 0; p < 8; p++) {
        const a  = (p / 8) * Math.PI * 2;
        const a2 = ((p + 0.5) / 8) * Math.PI * 2;
        const pr = r * 0.55;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.quadraticCurveTo(
          cx + Math.cos(a)  * pr * 1.3,
          cy + Math.sin(a)  * pr * 1.3,
          cx + Math.cos(a2) * pr,
          cy + Math.sin(a2) * pr
        );
        ctx.quadraticCurveTo(
          cx + Math.cos(a2) * pr * 1.3,
          cy + Math.sin(a2) * pr * 1.3,
          cx, cy
        );
        ctx.stroke();
      }

      // Inner hexagon
      ctx.beginPath();
      for (let h = 0; h <= 6; h++) {
        const ha = (h / 6) * Math.PI * 2 - Math.PI / 6;
        const hx = cx + Math.cos(ha) * r * 0.28;
        const hy = cy + Math.sin(ha) * r * 0.28;
        h === 0 ? ctx.moveTo(hx, hy) : ctx.lineTo(hx, hy);
      }
      ctx.stroke();

      // Star lines
      for (let s = 0; s < 6; s++) {
        const sa = (s / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(sa) * r * 0.28, cy + Math.sin(sa) * r * 0.28);
        ctx.lineTo(cx + Math.cos(sa) * r * 0.9,  cy + Math.sin(sa) * r * 0.9);
        ctx.stroke();
      }

      // Corner diamond connectors
      const corners = [
        [cx - cell / 2, cy - cell / 2],
        [cx + cell / 2, cy - cell / 2],
        [cx + cell / 2, cy + cell / 2],
        [cx - cell / 2, cy + cell / 2],
      ];
      corners.forEach(([kx, ky]) => {
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(Math.atan2(ky - cy, kx - cx)) * r * 0.9,
                   cy + Math.sin(Math.atan2(ky - cy, kx - cx)) * r * 0.9);
        ctx.lineTo(kx, ky);
        ctx.stroke();
      });
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

/* ============================================================
   SHARED MATERIAL FACTORY
   ============================================================ */
function makeMat(palette, opts = {}) {
  const tex = makeFiligreeTexture(palette.primary, opts.texSize || 256);
  return new THREE.MeshStandardMaterial({
    color:            opts.color    || palette.primary,
    emissive:         opts.emissive || palette.emissive,
    emissiveIntensity: opts.emissiveIntensity ?? 0.75,
    map:              tex,
    alphaMap:         tex,
    transparent:      true,
    opacity:          opts.opacity  ?? 0.92,
    side:             THREE.DoubleSide,
    metalness:        0.2,
    roughness:        0.55,
  });
}

function makeWireMat(palette) {
  return new THREE.MeshBasicMaterial({
    color:       palette.secondary,
    wireframe:   true,
    transparent: true,
    opacity:     0.18,
  });
}

/* ============================================================
   GEOMETRY HELPERS
   ============================================================ */

// Lathe-based lantern body (rotational profile)
function makeLatheMesh(points, segs, mat) {
  const geo = new THREE.LatheGeometry(points, segs);
  return new THREE.Mesh(geo, mat);
}

// Faceted cylinder (octagonal prism)
function makePrism(rt, rb, h, segs, mat) {
  const geo = new THREE.CylinderGeometry(rt, rb, h, segs, 4, true);
  return new THREE.Mesh(geo, mat);
}

// Flat disc
function makeDisc(r, segs, mat) {
  const geo = new THREE.CylinderGeometry(r, r * 0.85, 0.06, segs);
  return new THREE.Mesh(geo, mat);
}

// Cone cap
function makeCap(rb, rt, h, segs, mat) {
  const geo = new THREE.CylinderGeometry(rt, rb, h, segs, 2, false);
  return new THREE.Mesh(geo, mat);
}

/* ============================================================
   SMALL HANGING LANTERN  (the globe-like ones on the arms)
   ============================================================ */
function makeMiniLantern(palette) {
  const g = new THREE.Group();
  const mat = makeMat(palette, { opacity: 0.85, texSize: 128 });

  // Body: squashed sphere via scaled octahedron-ish lathe
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const t = (i / 10) * Math.PI;
    pts.push(new THREE.Vector2(
      Math.sin(t) * 0.14,
      (Math.cos(t) * 0.18)
    ));
  }
  const body = makeLatheMesh(pts, 8, mat);
  g.add(body);

  // Wire overlay
  const wireMat = makeWireMat(palette);
  const wireBody = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.15, 1),
    wireMat
  );
  wireBody.scale.y = 1.1;
  g.add(wireBody);

  // Top knob
  const knobGeo = new THREE.CylinderGeometry(0.022, 0.032, 0.06, 6);
  const knob    = new THREE.Mesh(knobGeo, mat);
  knob.position.y = 0.19;
  g.add(knob);

  // Bottom tassel stub
  const tassGeo = new THREE.CylinderGeometry(0.01, 0.0, 0.09, 4);
  const tass    = new THREE.Mesh(tassGeo, mat);
  tass.position.y = -0.21;
  g.add(tass);

  return g;
}

/* ============================================================
   HORIZONTAL ARM with hanging mini-lanterns
   ============================================================ */
function makeArm(palette, length = 2.8, miniCount = 7) {
  const g = new THREE.Group();
  const mat = makeMat(palette, { opacity: 0.80 });

  // Main horizontal beam (thin octagonal rod)
  const beamGeo = new THREE.CylinderGeometry(0.028, 0.022, length, 8);
  const beam    = new THREE.Mesh(beamGeo, mat);
  beam.rotation.z = Math.PI / 2;
  beam.position.x = length / 2;
  g.add(beam);

  // Secondary beam (decorative, slightly below)
  const beam2 = beam.clone();
  beam2.position.y = -0.06;
  beam2.scale.x = 0.85;
  g.add(beam2);

  // Hanging mini-lanterns spaced along the arm
  for (let i = 0; i < miniCount; i++) {
    const t      = (i + 0.5) / miniCount;
    const xPos   = t * length;
    const dropY  = -0.18 - Math.sin(t * Math.PI) * 0.12;  // slight catenary

    // Short hanging cord
    const cordGeo = new THREE.CylinderGeometry(0.005, 0.005, Math.abs(dropY) - 0.05, 3);
    const cord    = new THREE.Mesh(cordGeo, mat);
    cord.position.set(xPos, dropY * 0.5 - 0.05, 0);
    g.add(cord);

    // Mini lantern
    const ml = makeMiniLantern(palette);
    ml.position.set(xPos, dropY - 0.18, 0);
    ml.scale.setScalar(0.75 + Math.random() * 0.15);
    g.add(ml);
  }

  return g;
}

/* ============================================================
   LANTERN TOP CAP  (wide flat diamond-faceted lid)
   ============================================================ */
function makeTopCap(palette, r) {
  const g   = new THREE.Group();
  const mat = makeMat(palette, { opacity: 0.90 });

  const segs = 8;  // octagonal

  // Wide flat flared disc — the big "hat"
  const hatGeo = new THREE.CylinderGeometry(r * 0.55, r, r * 0.30, segs, 2, true);
  const hat    = new THREE.Mesh(hatGeo, mat);
  g.add(hat);

  // Flat top plate
  const topGeo = new THREE.CylinderGeometry(r * 0.55, r * 0.55, 0.04, segs);
  const top    = new THREE.Mesh(topGeo, mat);
  top.position.y = r * 0.15;
  g.add(top);

  // Upward-pointing pyramid finial
  const tipGeo = new THREE.CylinderGeometry(0.0, r * 0.22, r * 0.40, segs);
  const tip    = new THREE.Mesh(tipGeo, mat);
  tip.position.y = r * 0.15 + r * 0.20;
  g.add(tip);

  // Inner ring accent (horizontal ring visible through the cap)
  const ringGeo = new THREE.TorusGeometry(r * 0.45, 0.025, 8, segs);
  const ring    = new THREE.Mesh(ringGeo, mat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.02;
  g.add(ring);

  // Decorative diagonal supports (8 struts under the cap)
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const strutGeo = new THREE.CylinderGeometry(0.012, 0.018, r * 0.38, 4);
    const strut    = new THREE.Mesh(strutGeo, mat);
    strut.position.set(
      Math.cos(a) * r * 0.72,
      -r * 0.12,
      Math.sin(a) * r * 0.72
    );
    strut.rotation.z = Math.atan2(r * 0.72, r * 0.28);
    strut.rotation.y = -a;
    g.add(strut);
  }

  return g;
}

/* ============================================================
   LANTERN MIDDLE DISC  (wide decorative tray/divider)
   ============================================================ */
function makeMiddleDisc(palette, r) {
  const g   = new THREE.Group();
  const mat = makeMat(palette, { opacity: 0.88 });
  const segs = 8;

  // Main wide disc
  const discGeo = new THREE.CylinderGeometry(r, r * 0.85, 0.10, segs);
  const disc    = new THREE.Mesh(discGeo, mat);
  g.add(disc);

  // Rim torus
  const rimGeo = new THREE.TorusGeometry(r * 0.92, 0.035, 8, segs);
  const rim    = new THREE.Mesh(rimGeo, mat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.05;
  g.add(rim);

  // Small accent knobs around rim
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const knobGeo = new THREE.SphereGeometry(0.055, 6, 4);
    const knob    = new THREE.Mesh(knobGeo, mat);
    knob.position.set(Math.cos(a) * r, 0.06, Math.sin(a) * r);
    g.add(knob);
  }

  return g;
}

/* ============================================================
   LANTERN BODY SECTION  (tall faceted prism with filigree)
   ============================================================ */
function makeBodySection(palette, rt, rb, h, segs = 8) {
  const g   = new THREE.Group();
  const mat = makeMat(palette, { opacity: 0.88, texSize: 512 });

  // Main faceted body
  const bodyMesh = makePrism(rt, rb, h, segs, mat);
  g.add(bodyMesh);

  // Wireframe overlay for lace depth effect
  const wireMat = makeWireMat(palette);
  const wireGeo = new THREE.CylinderGeometry(rt * 1.002, rb * 1.002, h, segs, 6, true);
  g.add(new THREE.Mesh(wireGeo, wireMat));

  // Horizontal band rings (decorative)
  const bandCount = 3;
  for (let b = 1; b < bandCount; b++) {
    const by = -h / 2 + (b / bandCount) * h;
    const br = rt + ((rb - rt) * (b / bandCount));
    const bandGeo = new THREE.TorusGeometry(br * 1.01, 0.018, 6, segs);
    const band    = new THREE.Mesh(bandGeo, mat);
    band.rotation.x = Math.PI / 2;
    band.position.y = by;
    g.add(band);
  }

  return g;
}

/* ============================================================
   PEDESTAL  (stem + base disc)
   ============================================================ */
function makePedestal(palette) {
  const g   = new THREE.Group();
  const mat = makeMat(palette, { opacity: 0.85 });
  const segs = 8;

  // Slim stem
  const stemGeo = new THREE.CylinderGeometry(0.065, 0.11, 0.55, segs);
  const stem    = new THREE.Mesh(stemGeo, mat);
  stem.position.y = -0.28;
  g.add(stem);

  // Base disc (oblate ellipsoid-ish via scale)
  const baseGeo = new THREE.CylinderGeometry(0.42, 0.38, 0.10, segs);
  const base    = new THREE.Mesh(baseGeo, mat);
  base.position.y = -0.575;
  g.add(base);

  // Outer rim
  const rimGeo = new THREE.TorusGeometry(0.39, 0.030, 6, segs);
  const rim    = new THREE.Mesh(rimGeo, mat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -0.565;
  g.add(rim);

  return g;
}

/* ============================================================
   POINT LIGHT GLOW  (inner illumination)
   ============================================================ */
function makeLanternLight(palette) {
  const light = new THREE.PointLight(palette.primary, 1.8, 5.0);
  light.position.set(0, 0, 0);
  return light;
}

/* ============================================================
   CENTRAL DECORATIVE MEDALLION  (visible through body)
   ============================================================ */
function makeMedallion(palette) {
  const g   = new THREE.Group();
  const mat = makeMat(palette, { emissiveIntensity: 1.2, opacity: 0.95 });

  // Sphere core
  const coreGeo = new THREE.SphereGeometry(0.14, 8, 8);
  const core    = new THREE.Mesh(coreGeo, mat);
  g.add(core);

  // Orbit rings (3 rings at different angles)
  const ringMat = makeMat(palette, { opacity: 0.80 });
  [0, 60, 120].forEach((angle, i) => {
    const rGeo = new THREE.TorusGeometry(0.22, 0.018, 6, 16);
    const ring = new THREE.Mesh(rGeo, ringMat);
    ring.rotation.x = THREE.MathUtils.degToRad(angle);
    ring.rotation.z = THREE.MathUtils.degToRad(angle * 0.5);
    g.add(ring);
  });

  return g;
}

/* ============================================================
   ARM JUNCTION  (where arms meet the body — decorative collar)
   ============================================================ */
function makeJunction(palette, r) {
  const mat = makeMat(palette, { opacity: 0.90 });
  const geo = new THREE.CylinderGeometry(r * 0.22, r * 0.30, 0.20, 8);
  return new THREE.Mesh(geo, mat);
}

/* ============================================================
   CREATE LANTERN  —  main entry point
   ============================================================ */
export function createLantern(qrText) {
  const palette = getPalette(qrText);
  const root    = new THREE.Group();
  root.userData.palette = palette;

  /* ---- DIMENSIONS ---- */
  const R_TOP  = 0.72;   // top cap radius
  const R_BODY = 0.52;   // upper body radius
  const R_MID  = 0.58;   // mid-disc radius
  const R_LOW  = 0.48;   // lower body radius

  /* ---- UPPER BODY ---- */
  const upperBody = makeBodySection(palette, R_BODY * 0.90, R_BODY, 0.80, 8);
  upperBody.position.y = 0.60;
  root.add(upperBody);

  /* ---- TOP CAP ---- */
  const topCap = makeTopCap(palette, R_TOP);
  topCap.position.y = 1.08;
  root.add(topCap);

  /* ---- MIDDLE DISC ---- */
  const midDisc = makeMiddleDisc(palette, R_MID);
  midDisc.position.y = 0.20;
  root.add(midDisc);

  /* ---- LOWER BODY ---- */
  const lowerBody = makeBodySection(palette, R_LOW, R_LOW * 0.90, 0.58, 8);
  lowerBody.position.y = -0.12;
  root.add(lowerBody);

  /* ---- LOWER DISC (smaller echo disc) ---- */
  const lowerDisc = makeMiddleDisc(palette, R_LOW * 0.80);
  lowerDisc.position.y = -0.44;
  lowerDisc.scale.setScalar(0.78);
  root.add(lowerDisc);

  /* ---- MEDALLION (inner sphere + rings) ---- */
  const medallion = makeMedallion(palette);
  medallion.position.y = 0.60;
  root.add(medallion);

  /* ---- PEDESTAL ---- */
  const pedestal = makePedestal(palette);
  pedestal.position.y = -0.44;
  root.add(pedestal);

  /* ---- ARMS (4 arms at 90° intervals, 2 long + 2 medium) ---- */
  const armLengths = [2.8, 2.4, 2.8, 2.4];
  const armMinis   = [7,   6,   7,   6  ];

  armLengths.forEach((len, i) => {
    const armGroup = makeArm(palette, len, armMinis[i]);
    const junc     = makeJunction(palette, R_BODY);

    const pivot = new THREE.Group();
    pivot.add(armGroup);
    pivot.add(junc);
    pivot.rotation.y = (i / 4) * Math.PI * 2;
    pivot.position.y = 0.20;   // at mid-disc level
    root.add(pivot);
  });

  /* ---- POINT LIGHT ---- */
  const light = makeLanternLight(palette);
  light.position.y = 0.5;
  root.add(light);

  /* ---- SECONDARY RIM LIGHT ---- */
  const rimLight = new THREE.PointLight(palette.secondary, 0.9, 3.5);
  rimLight.position.set(0, 1.0, 0);
  root.add(rimLight);

  /* ---- ANIMATION STATE ---- */
  root.userData.t = 0;
  root.userData.floatPhase = Math.random() * Math.PI * 2;

  return root;
}

/* ============================================================
   UPDATE LANTERN  —  call every frame with delta (seconds)
   ============================================================ */
export function updateLantern(lantern, delta) {
  if (!lantern) return;

  const ud = lantern.userData;
  ud.t += delta;

  const t = ud.t;

  /* ---- Gentle float up/down ---- */
  const floatAmp   = 0.06;
  const floatSpeed = 0.55;
  lantern.position.y += Math.sin(t * floatSpeed + ud.floatPhase) * floatAmp * delta;
  // Clamp drift so it stays near its spawn position
  const base = lantern.userData.baseY ?? lantern.position.y;
  if (!lantern.userData.baseY) lantern.userData.baseY = lantern.position.y;
  lantern.position.y = lantern.userData.baseY
    + Math.sin(t * floatSpeed + ud.floatPhase) * floatAmp * 8;

  /* ---- Slow self-rotation ---- */
  lantern.rotation.y += delta * 0.18;

  /* ---- Pulsing light intensity ---- */
  lantern.children.forEach(child => {
    if (child.isPointLight) {
      child.intensity = 1.6 + Math.sin(t * 2.1) * 0.4;
    }
  });

  /* ---- Mini-lantern sway on arms ---- */
  lantern.children.forEach(pivot => {
    if (!pivot.isGroup) return;
    pivot.children.forEach(obj => {
      if (!obj.isGroup) return;
      // Arms are groups inside pivots
      obj.children.forEach((item, idx) => {
        if (item.isGroup && item.children.length > 1) {
          // Sway individual mini-lanterns
          item.rotation.z = Math.sin(t * 1.3 + idx * 0.7) * 0.07;
          item.rotation.x = Math.cos(t * 0.9 + idx * 0.5) * 0.05;
        }
      });
    });
  });

  /* ---- Medallion ring spin ---- */
  lantern.children.forEach(child => {
    if (child.isGroup && child.position.y > 0.4 && child.position.y < 0.8) {
      // Medallion group
      child.children.forEach((ring, idx) => {
        if (ring.geometry && ring.geometry.type === "TorusGeometry") {
          ring.rotation.y += delta * (0.6 + idx * 0.25);
          ring.rotation.x += delta * (0.3 - idx * 0.15);
        }
      });
    }
  });
}