export function createVesakLantern() {
  const group = new THREE.Group();
  group.name = 'Procedural Vesak Lantern';

  const colors = [0xff356e, 0xffd23f, 0x25d0ff, 0x73ff68, 0xc56cff, 0xff8c2b];
  const panelMat = colors.map(c => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.16, roughness: 0.62, metalness: 0.02, transparent: true, opacity: 0.88, side: THREE.DoubleSide }));
  const gold = new THREE.MeshStandardMaterial({ color: 0xffd86b, emissive: 0xffb000, emissiveIntensity: 0.2, roughness: 0.35 });
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffe5b0, emissiveIntensity: 0.32, transparent: true, opacity: 0.8 });

  // Hexagonal paper body made from separate coloured panels.
  const panelGeo = new THREE.PlaneGeometry(0.42, 0.78);
  for (let i = 0; i < 6; i++) {
    const panel = new THREE.Mesh(panelGeo, panelMat[i]);
    const angle = (Math.PI * 2 * i) / 6;
    panel.position.set(Math.sin(angle) * 0.36, 0, Math.cos(angle) * 0.36);
    panel.rotation.y = angle;
    group.add(panel);
  }

  // Top and bottom caps.
  const top = new THREE.Mesh(new THREE.ConeGeometry(0.48, 0.32, 6), gold);
  top.position.y = 0.55;
  group.add(top);
  const bottom = new THREE.Mesh(new THREE.ConeGeometry(0.48, 0.32, 6), gold);
  bottom.position.y = -0.55;
  bottom.rotation.x = Math.PI;
  group.add(bottom);

  // Rings and decorative strips.
  const ringGeo = new THREE.TorusGeometry(0.38, 0.018, 12, 80);
  const topRing = new THREE.Mesh(ringGeo, gold);
  topRing.position.y = 0.4;
  topRing.rotation.x = Math.PI / 2;
  group.add(topRing);
  const bottomRing = topRing.clone();
  bottomRing.position.y = -0.4;
  group.add(bottomRing);

  for (let i = 0; i < 6; i++) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.85, 0.025), gold);
    const angle = (Math.PI * 2 * i) / 6;
    strip.position.set(Math.sin(angle) * 0.37, 0, Math.cos(angle) * 0.37);
    group.add(strip);
  }

  // Inner glowing lamp.
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 32, 32), white);
  group.add(bulb);
  const innerLight = new THREE.PointLight(0xffd27a, 1.8, 3.2, 2);
  innerLight.position.set(0, 0, 0);
  group.add(innerLight);

  // Hanging tassels.
  for (let i = 0; i < 12; i++) {
    const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.014, 0.45, 8), panelMat[i % panelMat.length]);
    const angle = (Math.PI * 2 * i) / 12;
    tassel.position.set(Math.sin(angle) * 0.3, -0.86, Math.cos(angle) * 0.3);
    tassel.rotation.z = Math.sin(angle) * 0.18;
    group.add(tassel);
  }

  // Soft ground shadow below lantern.
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 64),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.1;
  group.add(shadow);

  group.scale.setScalar(0.75);
  group.userData.innerLight = innerLight;
  return group;
}

export function animateLantern(lantern, elapsedSeconds) {
  lantern.rotation.y += 0.007;
  lantern.position.y += Math.sin(elapsedSeconds * 1.7) * 0.0008;
  const light = lantern.userData.innerLight;
  if (light) light.intensity = 1.55 + Math.sin(elapsedSeconds * 9.0) * 0.22 + Math.random() * 0.08;
}
