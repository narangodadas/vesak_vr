// lantern.js

let lanternGroup;
let innerLight;
let glowMaterial;
let animationTime = 0;

export function createLantern(type = "vesak-lantern-1") {
  lanternGroup = new THREE.Group();

  const colorSets = {
    "vesak-lantern-1": {
      main: 0xff3366,
      second: 0xffcc00,
      third: 0x00ccff,
      glow: 0xffaa33
    },
    "vesak-lantern-2": {
      main: 0x00ff99,
      second: 0xff66ff,
      third: 0xffff33,
      glow: 0x66ffcc
    },
    "vesak-lantern-3": {
      main: 0x3366ff,
      second: 0xff9933,
      third: 0xff0066,
      glow: 0xffcc66
    }
  };

  const colors = colorSets[type] || colorSets["vesak-lantern-1"];

  // Main octagon body
  const bodyGeometry = new THREE.CylinderGeometry(0.65, 0.65, 1.2, 8);
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: colors.main,
    transparent: true,
    opacity: 0.72,
    emissive: colors.main,
    emissiveIntensity: 0.25,
    roughness: 0.4,
    metalness: 0.05
  });

  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 0;
  lanternGroup.add(body);

  // Colorful vertical panels
  const panelColors = [colors.main, colors.second, colors.third, 0xffffff];

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;

    const panelGeo = new THREE.BoxGeometry(0.08, 1.22, 0.02);
    const panelMat = new THREE.MeshStandardMaterial({
      color: panelColors[i % panelColors.length],
      emissive: panelColors[i % panelColors.length],
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.9
    });

    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.set(
      Math.sin(angle) * 0.66,
      0,
      Math.cos(angle) * 0.66
    );
    panel.rotation.y = angle;
    lanternGroup.add(panel);
  }

  // Top cone
  const topGeo = new THREE.ConeGeometry(0.7, 0.45, 8);
  const topMat = new THREE.MeshStandardMaterial({
    color: colors.second,
    emissive: colors.second,
    emissiveIntensity: 0.25
  });

  const top = new THREE.Mesh(topGeo, topMat);
  top.position.y = 0.82;
  lanternGroup.add(top);

  // Bottom cone
  const bottom = top.clone();
  bottom.position.y = -0.82;
  bottom.rotation.x = Math.PI;
  lanternGroup.add(bottom);

  // Inner glowing sphere
  const glowGeo = new THREE.SphereGeometry(0.33, 32, 32);
  glowMaterial = new THREE.MeshBasicMaterial({
    color: colors.glow,
    transparent: true,
    opacity: 0.85
  });

  const glow = new THREE.Mesh(glowGeo, glowMaterial);
  glow.position.y = 0;
  lanternGroup.add(glow);

  // Inner light
  innerLight = new THREE.PointLight(colors.glow, 2.5, 4);
  innerLight.position.set(0, 0, 0);
  lanternGroup.add(innerLight);

  // Decorative rings
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.2
  });

  const topRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.66, 0.025, 16, 100),
    ringMat
  );
  topRing.position.y = 0.62;
  topRing.rotation.x = Math.PI / 2;
  lanternGroup.add(topRing);

  const bottomRing = topRing.clone();
  bottomRing.position.y = -0.62;
  lanternGroup.add(bottomRing);

  // Hanging tassels / strips
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;

    const stripGeo = new THREE.BoxGeometry(0.035, 0.55, 0.015);
    const stripMat = new THREE.MeshStandardMaterial({
      color: panelColors[i % panelColors.length],
      emissive: panelColors[i % panelColors.length],
      emissiveIntensity: 0.3
    });

    const strip = new THREE.Mesh(stripGeo, stripMat);
    strip.position.set(
      Math.sin(angle) * 0.42,
      -1.25,
      Math.cos(angle) * 0.42
    );
    strip.rotation.y = angle;
    strip.userData.swingOffset = i * 0.4;
    lanternGroup.add(strip);
  }

  // Small top hanging string
  const stringGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.6, 12);
  const stringMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const string = new THREE.Mesh(stringGeo, stringMat);
  string.position.y = 1.35;
  lanternGroup.add(string);

  // Scale and position
  lanternGroup.scale.set(0.9, 0.9, 0.9);
  lanternGroup.position.set(0, 0, -2);

  return lanternGroup;
}

export function updateLantern(delta = 0.016) {
  if (!lanternGroup) return;

  animationTime += delta;

  // Smooth rotation
  lanternGroup.rotation.y += 0.008;

  // Gentle floating movement
  lanternGroup.position.y = Math.sin(animationTime * 1.5) * 0.08;

  // Light flicker
  if (innerLight) {
    innerLight.intensity = 2.2 + Math.sin(animationTime * 8) * 0.45 + Math.random() * 0.15;
  }

  if (glowMaterial) {
    glowMaterial.opacity = 0.65 + Math.sin(animationTime * 6) * 0.18;
  }

  // Tassel swinging
  lanternGroup.children.forEach((child) => {
    if (child.userData.swingOffset !== undefined) {
      child.rotation.z = Math.sin(animationTime * 2 + child.userData.swingOffset) * 0.12;
    }
  });
}