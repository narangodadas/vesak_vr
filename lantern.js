export function createLantern(qrText = "vesak-lantern-1") {
  const lantern = new THREE.Group();

  const themes = {
    "vesak-lantern-1": {
      main: 0xffb347,
      glow: 0xffcc66,
      accent: 0xff8800
    },
    "vesak-lantern-2": {
      main: 0xff4d6d,
      glow: 0xff99aa,
      accent: 0xff0033
    },
    "vesak-lantern-3": {
      main: 0x66ff99,
      glow: 0xb7ffce,
      accent: 0x00cc66
    }
  };

  const theme = themes[qrText] || themes["vesak-lantern-1"];

  const centerGeometry = new THREE.CylinderGeometry(0.6, 0.9, 1.2, 8);
  const centerMaterial = createGlowMaterial(theme.main, theme.glow);

  const centerBody = new THREE.Mesh(centerGeometry, centerMaterial);
  lantern.add(centerBody);

  const topRing = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.2, 0.2, 8),
    createGlowMaterial(theme.accent, theme.glow)
  );

  topRing.position.y = 0.9;
  lantern.add(topRing);

  const bottomPart = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.7, 1, 8),
    createGlowMaterial(theme.main, theme.glow)
  );

  bottomPart.position.y = -1.05;
  lantern.add(bottomPart);

  for (let i = 0; i < 8; i++) {
    const miniLantern = buildMiniLantern(theme);
    const angle = (i / 8) * Math.PI * 2;

    miniLantern.position.set(
      Math.cos(angle) * 1.15,
      -0.2,
      Math.sin(angle) * 1.15
    );

    lantern.add(miniLantern);
  }

  for (let i = 0; i < 6; i++) {
    const miniLantern = buildMiniLantern(theme);
    const angle = (i / 6) * Math.PI * 2;

    miniLantern.scale.setScalar(0.8);

    miniLantern.position.set(
      Math.cos(angle) * 0.9,
      0.55,
      Math.sin(angle) * 0.9
    );

    lantern.add(miniLantern);
  }

  const pointLight = new THREE.PointLight(theme.glow, 2.2, 12);
  pointLight.position.y = 0.2;
  lantern.add(pointLight);

  lantern.userData = {
    rotationSpeed: 0.35,
    floatOffset: Math.random() * Math.PI * 2,
    baseY: 0
  };

  return lantern;
}

function buildMiniLantern(theme) {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.2, 0.38, 6),
    createGlowMaterial(theme.main, theme.glow)
  );

  group.add(body);

  const top = new THREE.Mesh(
    new THREE.ConeGeometry(0.15, 0.12, 6),
    createGlowMaterial(theme.accent, theme.glow)
  );

  top.position.y = 0.25;
  group.add(top);

  const bottom = new THREE.Mesh(
    new THREE.ConeGeometry(0.15, 0.15, 6),
    createGlowMaterial(theme.accent, theme.glow)
  );

  bottom.rotation.x = Math.PI;
  bottom.position.y = -0.27;
  group.add(bottom);

  for (let i = 0; i < 3; i++) {
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 12, 12),
      new THREE.MeshBasicMaterial({
        color: theme.glow
      })
    );

    orb.position.set(
      Math.cos(i * 2) * 0.12,
      -0.42,
      Math.sin(i * 2) * 0.12
    );

    group.add(orb);
  }

  return group;
}

function createGlowMaterial(color, emissive) {
  return new THREE.MeshStandardMaterial({
    color: color,
    emissive: emissive,
    emissiveIntensity: 1.8,
    roughness: 0.35,
    metalness: 0.1
  });
}

export function updateLantern(lantern, delta) {
  if (!lantern) return;

  lantern.rotation.y += delta * lantern.userData.rotationSpeed;

  lantern.position.y =
    lantern.userData.baseY +
    Math.sin(performance.now() * 0.0015 + lantern.userData.floatOffset) * 0.08;

  lantern.traverse((child) => {
    if (child.isPointLight) {
      child.intensity =
        2 +
        Math.sin(performance.now() * 0.004) * 0.4;
    }
  });
}

