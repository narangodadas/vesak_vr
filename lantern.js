export function createLantern(type = "vesak-lantern-1") {
  const lantern = new THREE.Group();
  const colorSets = {
    "vesak-lantern-1": { main: 0xff2e78, second: 0xffc300, third: 0x00d9ff, accent: 0xffffff, glow: 0xffa533 },
    "vesak-lantern-2": { main: 0x00e676, second: 0xd500f9, third: 0xffea00, accent: 0xffffff, glow: 0x76ff03 },
    "vesak-lantern-3": { main: 0x2979ff, second: 0xff9100, third: 0xff1744, accent: 0xffffff, glow: 0xffd180 }
  };
  const keys = Object.keys(colorSets);
  const colors = colorSets[type] || colorSets[keys[Math.abs(hashText(type)) % keys.length]];

  lantern.userData.time = 0;
  lantern.userData.innerLights = [];
  lantern.userData.glowMaterials = [];
  lantern.userData.tassels = [];

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.68, 0.68, 1.16, 8, 1, true),
    new THREE.MeshStandardMaterial({ color: colors.main, emissive: colors.main, emissiveIntensity: 0.28, transparent: true, opacity: 0.62, side: THREE.DoubleSide, roughness: 0.38, metalness: 0.03 })
  );
  lantern.add(body);

  const panelColors = [colors.main, colors.second, colors.third, colors.accent, colors.second, colors.main, colors.third, colors.accent];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 1.18, 0.035),
      new THREE.MeshStandardMaterial({ color: panelColors[i], emissive: panelColors[i], emissiveIntensity: 0.38, transparent: true, opacity: 0.92, roughness: 0.25 })
    );
    panel.position.set(Math.sin(angle) * 0.69, 0, Math.cos(angle) * 0.69);
    panel.rotation.y = angle;
    lantern.add(panel);
  }

  const top = createCone(colors.second, 0.7, 0.43);
  top.position.y = 0.8;
  lantern.add(top);

  const bottom = createCone(colors.third, 0.7, 0.43);
  bottom.position.y = -0.8;
  bottom.rotation.x = Math.PI;
  lantern.add(bottom);

  const ringMat = new THREE.MeshStandardMaterial({ color: colors.accent, emissive: colors.accent, emissiveIntensity: 0.25 });
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.69, 0.026, 16, 96), ringMat);
  ring1.position.y = 0.59;
  ring1.rotation.x = Math.PI / 2;
  lantern.add(ring1);
  const ring2 = ring1.clone(); ring2.position.y = -0.59; lantern.add(ring2);
  const ring3 = ring1.clone(); ring3.scale.set(0.88,0.88,0.88); ring3.position.y = 0.18; lantern.add(ring3);
  const ring4 = ring1.clone(); ring4.scale.set(0.88,0.88,0.88); ring4.position.y = -0.18; lantern.add(ring4);

  const glowMat = new THREE.MeshBasicMaterial({ color: colors.glow, transparent: true, opacity: 0.72 });
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.34, 32, 32), glowMat);
  lantern.add(glow);
  lantern.userData.glowMaterials.push(glowMat);
  const innerLight = new THREE.PointLight(colors.glow, 2.6, 4.5);
  lantern.add(innerLight);
  lantern.userData.innerLights.push(innerLight);

  for (let i = 0; i < 18; i++) {
    const angle = (i / 18) * Math.PI * 2;
    const y = -0.42 + (i % 6) * 0.17;
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 12), new THREE.MeshBasicMaterial({ color: panelColors[i % panelColors.length] }));
    dot.position.set(Math.sin(angle) * 0.74, y, Math.cos(angle) * 0.74);
    lantern.add(dot);
  }

  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const color = panelColors[i % panelColors.length];
    const tassel = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.58, 0.018),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.32, roughness: 0.42 })
    );
    tassel.position.set(Math.sin(angle) * 0.45, -1.22, Math.cos(angle) * 0.45);
    tassel.rotation.y = angle;
    tassel.userData.swingOffset = i * 0.35;
    lantern.userData.tassels.push(tassel);
    lantern.add(tassel);
  }

  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.75, 12), new THREE.MeshBasicMaterial({ color: colors.second }));
  tail.position.y = -1.45;
  lantern.add(tail);

  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.58, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  string.position.y = 1.32;
  lantern.add(string);

  lantern.position.set(0, 0, -3);
  lantern.scale.set(0.82, 0.82, 0.82);
  return lantern;
}

export function updateLantern(lantern, delta = 0.016) {
  if (!lantern) return;
  lantern.userData.time += delta;
  const t = lantern.userData.time;
  lantern.rotation.y += delta * 0.65;
  lantern.position.y = Math.sin(t * 1.25) * 0.08;
  const flicker = 0.85 + Math.sin(t * 8.0) * 0.15 + Math.random() * 0.08;
  lantern.userData.innerLights.forEach((light) => light.intensity = 2.3 * flicker);
  lantern.userData.glowMaterials.forEach((mat) => mat.opacity = 0.58 + Math.sin(t * 5.5) * 0.18);
  lantern.userData.tassels.forEach((tassel) => tassel.rotation.z = Math.sin(t * 2.1 + tassel.userData.swingOffset) * 0.14);
}

function createCone(color, radius, height) {
  return new THREE.Mesh(new THREE.ConeGeometry(radius, height, 8), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3, roughness: 0.35 }));
}

function hashText(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
