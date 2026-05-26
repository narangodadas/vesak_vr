import { QRScanner } from "./qr-scanner.js";
import { createLantern, updateLantern } from "./lantern.js";
import { captureScreenshot } from "./screenshot.js";

const video = document.getElementById("cameraVideo");
const arContainer = document.getElementById("arContainer");
const overlay = document.getElementById("overlay");
const startBtn = document.getElementById("startBtn");
const statusBar = document.getElementById("statusBar");
const controlPanel = document.getElementById("controlPanel");
const distanceHud = document.getElementById("distanceHud");
const distanceValue = document.getElementById("distanceValue");
const screenshotBtn = document.getElementById("screenshotBtn");
const resetAnchorBtn = document.getElementById("resetAnchorBtn");
const closerBtn = document.getElementById("closerBtn");
const fartherBtn = document.getElementById("fartherBtn");
const downloadLink = document.getElementById("downloadLink");

let scene, camera, renderer, clock, qrScanner;
let currentStream = null;
let currentLantern = null;
let groundShadow = null;

let isRunning = false;
let animationFrameId = null;

// This app uses pseudo-world anchoring because normal browser camera APIs
// do not provide true ARCore/ARKit positional tracking.
// The important fix is distance is now controlled by a stable virtual distance,
// so closer/farther changes always make the lantern large/small correctly.
const worldState = {
  anchorPlaced: false,

  yaw: 0,
  pitch: 0,
  roll: 0,
  startAlpha: null,
  startBeta: null,
  startGamma: null,

  anchorX: 0,
  anchorY: -0.25,

  // Main fixed distance from camera to lantern in meters.
  // Smaller distance = larger lantern.
  distance: 2.6,
  targetDistance: 2.6,

  minDistance: 0.9,
  maxDistance: 6.0,

  dragActive: false,
  lastTouchY: 0
};

startBtn.addEventListener("click", async () => {
  await safeStartApp();
});

resetAnchorBtn.addEventListener("click", resetAnchor);
closerBtn.addEventListener("click", () => changeDistance(-0.35));
fartherBtn.addEventListener("click", () => changeDistance(0.35));

screenshotBtn.addEventListener("click", () => {
  if (renderer) captureScreenshot(video, renderer.domElement, downloadLink);
});

async function safeStartApp() {
  startBtn.disabled = true;
  startBtn.textContent = "Starting...";
  statusBar.textContent = "Starting camera...";

  try {
    stopCameraOnly();

    await requestOrientationPermissionIfNeeded();
    await startCamera();

    if (!renderer) setupThreeScene();

    setupQRScanner();

    overlay.classList.add("hidden");
    controlPanel.classList.remove("hidden");
    distanceHud.classList.remove("hidden");

    isRunning = true;
    statusBar.textContent = "Scan QR to place lantern.";

    animate();
  } catch (error) {
    console.error("Start error:", error);

    startBtn.disabled = false;
    startBtn.textContent = "Start Camera";
    statusBar.textContent = "Camera failed.";

    alert("Camera failed. Use HTTPS, allow Camera permission, close other camera apps, then refresh.");
  }
}

async function requestOrientationPermissionIfNeeded() {
  if (
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function"
  ) {
    try {
      const response = await DeviceOrientationEvent.requestPermission();
      console.log("Orientation permission:", response);
    } catch (err) {
      console.warn("Orientation permission issue:", err);
    }
  }

  window.addEventListener("deviceorientation", onDeviceOrientation, true);
}

function onDeviceOrientation(event) {
  const alpha = event.alpha ?? 0;
  const beta = event.beta ?? 0;
  const gamma = event.gamma ?? 0;

  if (worldState.startAlpha === null) {
    worldState.startAlpha = alpha;
    worldState.startBeta = beta;
    worldState.startGamma = gamma;
  }

  worldState.yaw = THREE.MathUtils.degToRad(alpha - worldState.startAlpha);
  worldState.pitch = THREE.MathUtils.degToRad(beta - worldState.startBeta);
  worldState.roll = THREE.MathUtils.degToRad(gamma - worldState.startGamma);
}

async function startCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error("Camera API not supported.");
  }

  const constraintsList = [
    {
      video: {
        facingMode: { exact: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    },
    {
      video: {
        facingMode: "environment",
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    },
    { video: true, audio: false }
  ];

  let lastError = null;

  for (const constraints of constraintsList) {
    try {
      currentStream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = currentStream;
      video.setAttribute("playsinline", true);
      video.muted = true;
      await video.play();
      return;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError;
}

function setupThreeScene() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    62,
    window.innerWidth / window.innerHeight,
    0.01,
    100
  );

  camera.position.set(0, 1.45, 0);
  camera.rotation.order = "YXZ";

  renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;

  arContainer.innerHTML = "";
  arContainer.appendChild(renderer.domElement);

  clock = new THREE.Clock();

  scene.add(new THREE.AmbientLight(0xffffff, 0.95));

  const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
  keyLight.position.set(2, 3, 4);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xffcc88, 0.45);
  fillLight.position.set(-3, 1, 2);
  scene.add(fillLight);

  groundShadow = createGroundShadow();
  scene.add(groundShadow);

  window.addEventListener("resize", onResize);
  setupDistanceTouchControl();
}

function createGroundShadow() {
  const shadowGeo = new THREE.CircleGeometry(1.2, 64);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.26,
    depthWrite: false
  });

  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.visible = false;
  return shadow;
}

function setupQRScanner() {
  if (qrScanner) qrScanner.stop();

  qrScanner = new QRScanner(video, (qrText, qrLocation) => {
    if (!qrText || worldState.anchorPlaced) return;
    placeWorldAnchorFromQR(qrText, qrLocation);
  });

  qrScanner.start();
}

function placeWorldAnchorFromQR(qrText, qrLocation) {
  worldState.anchorPlaced = true;

  // Reset orientation baseline at scan moment, so the lantern feels locked
  // relative to the QR position.
  worldState.startAlpha = null;
  worldState.startBeta = null;
  worldState.startGamma = null;
  worldState.yaw = 0;
  worldState.pitch = 0;
  worldState.roll = 0;

  // Put lantern slightly left/right based on QR center.
  worldState.anchorX = 0;
  if (qrLocation && video.videoWidth) {
    const centerX =
      (qrLocation.topLeftCorner.x +
        qrLocation.topRightCorner.x +
        qrLocation.bottomLeftCorner.x +
        qrLocation.bottomRightCorner.x) / 4;

    worldState.anchorX = ((centerX / video.videoWidth) - 0.5) * 1.2;
  }

  worldState.anchorY = -0.25;
  worldState.distance = 2.6;
  worldState.targetDistance = 2.6;

  if (currentLantern) {
    scene.remove(currentLantern);
    disposeObject(currentLantern);
  }

  currentLantern = createLantern(qrText);
  scene.add(currentLantern);

  if (groundShadow) groundShadow.visible = true;

  if (qrScanner) qrScanner.stop();

  statusBar.textContent = `Lantern fixed: ${qrText}`;
}

function updateCameraAndLantern() {
  camera.position.set(0, 1.45, 0);

  // Orientation changes viewing side.
  camera.rotation.y = -worldState.yaw;
  camera.rotation.x = -worldState.pitch * 0.35;
  camera.rotation.z = -worldState.roll * 0.18;

  if (!currentLantern || !worldState.anchorPlaced) return;

  // Smooth virtual distance.
  worldState.distance = THREE.MathUtils.lerp(worldState.distance, worldState.targetDistance, 0.12);

  // Lantern fixed in front of scan point at selected distance.
  const anchor = new THREE.Vector3(
    worldState.anchorX,
    worldState.anchorY,
    -worldState.distance
  );

  currentLantern.position.lerp(anchor, 0.18);

  // IMPORTANT FIX:
  // Stronger, visible size change with distance.
  // Near 0.9m => large; Far 6m => small.
  const d = worldState.distance;
  const sizeByDistance = THREE.MathUtils.mapLinear(d, worldState.minDistance, worldState.maxDistance, 0.95, 0.18);
  const targetScale = THREE.MathUtils.clamp(sizeByDistance, 0.18, 0.95);

  currentLantern.scale.lerp(
    new THREE.Vector3(targetScale, targetScale, targetScale),
    0.16
  );

  // Let the user see different sides while the object stays in its fixed position.
  // Do not attach lantern to phone screen.
  currentLantern.lookAt(camera.position.x, currentLantern.position.y, camera.position.z);
  currentLantern.rotateY(Math.PI);

  if (groundShadow) {
    groundShadow.position.set(currentLantern.position.x, -1.05, currentLantern.position.z);
    const shadowScale = THREE.MathUtils.mapLinear(d, worldState.minDistance, worldState.maxDistance, 1.55, 0.45);
    groundShadow.scale.set(shadowScale, shadowScale, shadowScale);
    groundShadow.material.opacity = THREE.MathUtils.mapLinear(d, worldState.minDistance, worldState.maxDistance, 0.36, 0.10);
  }

  distanceValue.textContent = `${d.toFixed(1)}m`;
  statusBar.textContent = `Fixed lantern | ${d.toFixed(1)}m | drag/buttons change distance`;
}

function changeDistance(amount) {
  if (!worldState.anchorPlaced) return;
  worldState.targetDistance = THREE.MathUtils.clamp(
    worldState.targetDistance + amount,
    worldState.minDistance,
    worldState.maxDistance
  );
}

function animate() {
  if (!isRunning) return;

  animationFrameId = requestAnimationFrame(animate);

  const delta = clock ? clock.getDelta() : 0.016;

  if (qrScanner) qrScanner.scan();

  updateCameraAndLantern();

  if (currentLantern) updateLantern(currentLantern, delta);

  if (renderer && scene && camera) renderer.render(scene, camera);
}

function resetAnchor() {
  worldState.anchorPlaced = false;
  worldState.targetDistance = 2.6;
  worldState.distance = 2.6;

  if (currentLantern) {
    scene.remove(currentLantern);
    disposeObject(currentLantern);
    currentLantern = null;
  }

  if (groundShadow) groundShadow.visible = false;

  if (qrScanner) qrScanner.start();

  statusBar.textContent = "Anchor reset. Scan QR again.";
}

function setupDistanceTouchControl() {
  window.addEventListener("touchstart", (e) => {
    if (!worldState.anchorPlaced || e.touches.length !== 1) return;
    worldState.dragActive = true;
    worldState.lastTouchY = e.touches[0].clientY;
  }, { passive: true });

  window.addEventListener("touchmove", (e) => {
    if (!worldState.dragActive || !worldState.anchorPlaced || e.touches.length !== 1) return;

    const y = e.touches[0].clientY;
    const dy = y - worldState.lastTouchY;
    worldState.lastTouchY = y;

    // Drag down = closer/bigger. Drag up = farther/smaller.
    changeDistance(-dy * 0.012);
  }, { passive: true });

  window.addEventListener("touchend", () => {
    worldState.dragActive = false;
  }, { passive: true });
}

function stopCameraOnly() {
  if (qrScanner) {
    qrScanner.stop();
    qrScanner = null;
  }

  if (video.srcObject) {
    video.srcObject.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
  }

  if (currentStream) {
    currentStream.getTracks().forEach((track) => track.stop());
    currentStream = null;
  }
}

function stopApp() {
  isRunning = false;

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  stopCameraOnly();
}

function disposeObject(obj) {
  obj.traverse((child) => {
    if (child.geometry) child.geometry.dispose();

    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach(disposeMaterial);
      } else {
        disposeMaterial(child.material);
      }
    }
  });
}

function disposeMaterial(mat) {
  if (mat.map) mat.map.dispose();
  if (mat.emissiveMap) mat.emissiveMap.dispose();
  mat.dispose();
}

function onResize() {
  if (!camera || !renderer) return;

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener("pagehide", stopApp);
window.addEventListener("beforeunload", stopApp);
