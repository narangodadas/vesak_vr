const _texCache = new Map();

export function createLantern(type = "vesak-lantern-1") {
  const colorSets = {
    "vesak-lantern-1": { paper: 0xff5519, line: 0x5c0f00, glow: 0xff7d30, trim: 0xffb648, light: 0xff8a3a },
    "vesak-lantern-2": { paper: 0xff2733, line: 0x5a0008, glow: 0xff5a52, trim: 0xffc27a, light: 0xff5742 },
    "vesak-lantern-3": { paper: 0xffab12, line: 0x6e3500, glow: 0xffcf57, trim: 0xfff0a8, light: 0xffb84d },
    "vesak-lantern-4": { paper: 0xff2e8a, line: 0x52003a, glow: 0xff79bd, trim: 0xffd0e8, light: 0xff5fae },
    "vesak-lantern-5": { paper: 0x12c46a, line: 0x004023, glow: 0x5cf7a0, trim: 0xd6ffe6, light: 0x37e08a }
  };

  const keys = Object.keys(colorSets);
  const c = colorSets[type] || colorSets[keys[Math.abs(hashText(type)) % keys.length]];
  const seed = Math.abs(hashText(type));

  const lantern = new THREE.Group();
  const core = new THREE.Group();
  lantern.add(core);

  lantern.userData = {
    time: (seed % 1000) * 0.01,
    core,
    spinSpeed: 0.16,
    lights: [],
    glowShells: [],
    tassels: [],
    patternMats: []
  };

  const U = lantern.userData;

  const makePaper = (color, emissiveIntensity = 0.9, opacity = 0.76) => {
    const tex = patternTexture(color, c.line, c.glow);
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      emissiveMap: tex,
      emissive: 0xffffff,
      emissiveIntensity,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      roughness: 0.55
    });
    U.patternMats.push({ mat, base: emissiveIntensity, phase: U.patternMats.length * 0.6 });
    return mat;
  };

  const trimMat = new THREE.MeshStandardMaterial({
    color: c.trim,
    emissive: c.trim,
    emissiveIntensity: 0.55,
    roughness: 0.35
  });

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.82, 0.82, 1.25, 8, 1, true),
    makePaper(c.paper, 1.05, 0.72)
  );
  body.position.y = 0;
  core.add(body);

  const top = new THREE.Mesh(new THREE.ConeGeometry(0.88, 0.48, 8), trimMat);
  top.position.y = 0.86;
  core.add(top);

  const bottom = new THREE.Mesh(new THREE.ConeGeometry(0.88, 0.48, 8), trimMat);
  bottom.position.y = -0.86;
  bottom.rotation.x = Math.PI;
  core.add(bottom);

  const panelColors = [c.paper, c.trim, c.glow, 0xffffff, c.light, 0xff2e8a, 0x00d9ff, 0xffea00];

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const p = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 1.35, 0.035),
      new THREE.MeshStandardMaterial({
        color: panelColors[i],
        emissive: panelColors[i],
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.92
      })
    );
    p.position.set(Math.sin(angle) * 0.84, 0, Math.cos(angle) * 0.84);
    p.rotation.y = angle;
    core.add(p);
  }

  for (const y of [0.64, -0.64, 0.02]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.84, 0.025, 16, 100), trimMat);
    ring.position.y = y;
    ring.rotation.x = Math.PI / 2;
    core.add(ring);
  }

  const glowMat = new THREE.MeshBasicMaterial({
    color: c.glow,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 32), glowMat);
  core.add(glow);
  U.glowShells.push({ mesh: glow, base: 0.55 });

  const haloMat = new THREE.MeshBasicMaterial({
    color: c.glow,
    transparent: true,
    opacity: 0.12,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const halo = new THREE.Mesh(new THREE.SphereGeometry(1.9, 24, 24), haloMat);
  core.add(halo);
  U.glowShells.push({ mesh: halo, base: 0.12 });

  const light = new THREE.PointLight(c.light, 3.4, 7, 1.5);
  light.position.y = 0;
  core.add(light);
  U.lights.push({ light, base: 3.4 });

  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const color = panelColors[i % panelColors.length];

    const tassel = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, 0.72, 0.018),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.45
      })
    );

    tassel.position.set(Math.sin(angle) * 0.52, -1.35, Math.cos(angle) * 0.52);
    tassel.rotation.y = angle;
    tassel.userData.phase = i * 0.4;
    core.add(tassel);
    U.tassels.push(tassel);
  }

  const string = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.7, 12),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  string.position.y = 1.36;
  core.add(string);

  lantern.position.set(0, 0, -3);
  lantern.scale.setScalar(0.35);
  return lantern;
}

export function updateLantern(lantern, delta = 0.016) {
  if (!lantern) return;

  const U = lantern.userData;
  U.time += delta;
  const t = U.time;

  if (U.core) {
    U.core.rotation.y += delta * U.spinSpeed;
    U.core.position.y = Math.sin(t * 1.1) * 0.045;
  }

  lantern.rotation.z = Math.sin(t * 0.72) * 0.025;
  lantern.rotation.x = Math.sin(t * 0.58 + 1.2) * 0.018;

  const flicker = 0.88 + Math.sin(t * 8.0) * 0.12 + Math.sin(t * 18.0) * 0.05 + Math.random() * 0.04;

  U.lights.forEach((o) => {
    o.light.intensity = o.base * flicker;
  });

  U.patternMats.forEach((p) => {
    p.mat.emissiveIntensity = p.base + Math.sin(t * 2.5 + p.phase) * 0.16;
  });

  U.glowShells.forEach((s) => {
    const k = 1 + Math.sin(t * 3) * 0.08;
    s.mesh.scale.setScalar(k);
    s.mesh.material.opacity = s.base * (0.85 + Math.abs(Math.sin(t * 3)) * 0.45);
  });

  U.tassels.forEach((tassel) => {
    tassel.rotation.z = Math.sin(t * 2 + tassel.userData.phase) * 0.16;
  });
}

function patternTexture(paper, line, glow) {
  const key = `${paper}_${line}_${glow}`;
  if (_texCache.has(key)) return _texCache.get(key);

  const size = 256;
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  const ctx = cv.getContext("2d");

  const g = ctx.createRadialGradient(size/2, size/2, 10, size/2, size/2, size*0.7);
  g.addColorStop(0, css(glow));
  g.addColorStop(0.55, css(paper));
  g.addColorStop(1, css(line));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = css(line);
  ctx.lineWidth = 3;
  ctx.strokeRect(12, 12, size - 24, size - 24);
  ctx.lineWidth = 1.3;
  ctx.strokeRect(26, 26, size - 52, size - 52);

  ctx.lineWidth = 1.8;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(size/2, size/2);
    ctx.lineTo(size/2 + Math.cos(a) * 96, size/2 + Math.sin(a) * 96);
    ctx.stroke();
  }

  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(size/2 + Math.cos(a) * 78, size/2 + Math.sin(a) * 78, 5, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(size/2, size/2, 26, 0, Math.PI * 2);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
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
