import { QRScanner } from "./qr-scanner.js";
import { createLantern, updateLantern } from "./lantern.js";
import { captureScreenshot } from "./screenshot.js";

const video = document.getElementById("cameraVideo");
const arContainer = document.getElementById("arContainer");
const overlay = document.getElementById("overlay");
const startBtn = document.getElementById("startBtn");
const statusBar = document.getElementById("statusBar");
const controlPanel = document.getElementById("controlPanel");
const screenshotBtn = document.getElementById("screenshotBtn");
const resetAnchorBtn = document.getElementById("resetAnchorBtn");
const downloadLink = document.getElementById("downloadLink");

let scene, camera, renderer, clock, qrScanner;
let currentStream = null;
let currentLantern = null;
let groundShadow = null;
let isRunning = false;
let animationFrameId = null;

const worldState = {
  yaw: 0,
  pitch: 0,
  roll: 0,
  zeroYaw: null,
  zeroPitch: null,
  zeroRoll: null,
  userX: 0,
  userY: 1.45,
  userZ: 0,
  anchorPlaced: false,
  anchorX: 0,
  anchorY: 0.32,
  anchorZ: -2.6,
  distanceOffset: 0,
  velocityZ: 0,
  lastMotionTime: 0
};

startBtn.addEventListener("click", safeStartApp);
resetAnchorBtn.addEventListener("click", resetAnchor);
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
    isRunning = true;
    statusBar.textContent = "Scan the floor QR to place lantern.";
    animate();
  } catch (error) {
    console.error("Start error:", error);
    startBtn.disabled = false;
    startBtn.textContent = "Start Camera";
    statusBar.textContent = "Camera failed.";
    alert("Camera failed. Use HTTPS, allow camera permission, close other camera apps, then refresh.");
  }
}

async function requestOrientationPermissionIfNeeded() {
  if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
    try { await DeviceOrientationEvent.requestPermission(); } catch (err) { console.warn(err); }
  }
  window.addEventListener("deviceorientation", onDeviceOrientation, true);
  window.addEventListener("devicemotion", onDeviceMotion, true);
}

function onDeviceOrientation(event) {
  const alpha = THREE.MathUtils.degToRad(event.alpha || 0);
  const beta = THREE.MathUtils.degToRad(event.beta || 0);
  const gamma = THREE.MathUtils.degToRad(event.gamma || 0);

  if (worldState.zeroYaw === null) {
    worldState.zeroYaw = alpha;
    worldState.zeroPitch = beta;
    worldState.zeroRoll = gamma;
  }

  worldState.yaw = alpha - worldState.zeroYaw;
  worldState.pitch = beta - worldState.zeroPitch;
  worldState.roll = gamma - worldState.zeroRoll;
}

function onDeviceMotion(event) {
  if (!worldState.anchorPlaced) return;
  const acc = event.accelerationIncludingGravity;
  if (!acc) return;

  const now = performance.now();
  if (!worldState.lastMotionTime) {
    worldState.lastMotionTime = now;
    return;
  }

  const dt = Math.min((now - worldState.lastMotionTime) / 1000, 0.08);
  worldState.lastMotionTime = now;

  worldState.velocityZ += (acc.z || 0) * dt * 0.01;
  worldState.velocityZ *= 0.94;
  worldState.distanceOffset += worldState.velocityZ;
  worldState.distanceOffset = THREE.MathUtils.clamp(worldState.distanceOffset, -1.1, 1.4);
}

async function startCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error("Camera API not supported.");

  const constraintsList = [
    { video: { facingMode: { exact: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
    { video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
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
    } catch (err) { lastError = err; }
  }
  throw lastError;
}

function setupThreeScene() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.01, 100);

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
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
  setupTouchDistanceControl();
}

function createGroundShadow() {
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1.2, 64),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false })
  );
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
  worldState.zeroYaw = null;
  worldState.distanceOffset = 0;
  worldState.velocityZ = 0;
  worldState.lastMotionTime = 0;

  let qrOffsetX = 0;
  if (qrLocation && video.videoWidth) {
    const centerX = (qrLocation.topLeftCorner.x + qrLocation.topRightCorner.x + qrLocation.bottomLeftCorner.x + qrLocation.bottomRightCorner.x) / 4;
    qrOffsetX = ((centerX / video.videoWidth) - 0.5) * 1.2;
  }

  worldState.anchorX = qrOffsetX;
  worldState.anchorY = 0.32;
  worldState.anchorZ = -2.6;

  if (currentLantern) {
    scene.remove(currentLantern);
    disposeObject(currentLantern);
  }

  currentLantern = createLantern(qrText);
  scene.add(currentLantern);
  if (groundShadow) groundShadow.visible = true;
  if (qrScanner) qrScanner.stop();

  statusBar.textContent = `Lantern fixed at QR location: ${qrText}`;
}

function updateWorldCameraAndAnchor() {
  if (!camera) return;

  camera.position.set(worldState.userX, worldState.userY, worldState.userZ);
  camera.rotation.order = "YXZ";
  camera.rotation.y = -worldState.yaw;
  camera.rotation.x = -worldState.pitch * 0.45;
  camera.rotation.z = -worldState.roll * 0.25;

  if (!currentLantern || !worldState.anchorPlaced) return;

  const anchor = new THREE.Vector3(worldState.anchorX, worldState.anchorY, worldState.anchorZ + worldState.distanceOffset);
  currentLantern.position.lerp(anchor, 0.15);

  const distance = camera.position.distanceTo(currentLantern.position);
  const scale = THREE.MathUtils.clamp(1.35 / distance, 0.34, 0.72);
  currentLantern.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.12);

  currentLantern.lookAt(camera.position.x, currentLantern.position.y, camera.position.z);
  currentLantern.rotateY(Math.PI);

  if (groundShadow) {
    groundShadow.position.set(currentLantern.position.x, 0.02, currentLantern.position.z);
    const shadowScale = THREE.MathUtils.clamp(scale * 2.0, 0.65, 1.35);
    groundShadow.scale.set(shadowScale, shadowScale, shadowScale);
    groundShadow.material.opacity = THREE.MathUtils.clamp(0.52 / distance, 0.14, 0.34);
  }

  statusBar.textContent = `Fixed lantern | distance ${distance.toFixed(1)}m | scan locked`;
}

function animate() {
  if (!isRunning) return;
  animationFrameId = requestAnimationFrame(animate);
  const delta = clock ? clock.getDelta() : 0.016;

  if (qrScanner) qrScanner.scan();
  updateWorldCameraAndAnchor();
  if (currentLantern) updateLantern(currentLantern, delta);
  if (renderer && scene && camera) renderer.render(scene, camera);
}

function resetAnchor() {
  worldState.anchorPlaced = false;
  worldState.distanceOffset = 0;
  worldState.velocityZ = 0;
  worldState.lastMotionTime = 0;

  if (currentLantern) {
    scene.remove(currentLantern);
    disposeObject(currentLantern);
    currentLantern = null;
  }

  if (groundShadow) groundShadow.visible = false;
  if (qrScanner) qrScanner.start();
  statusBar.textContent = "Anchor reset. Scan QR again.";
}

function setupTouchDistanceControl() {
  let lastY = 0;
  let isTouching = false;

  // Manual fallback: drag down = closer/larger, drag up = farther/smaller.
  window.addEventListener("touchstart", (e) => {
    if (!worldState.anchorPlaced || e.touches.length !== 1) return;
    isTouching = true;
    lastY = e.touches[0].clientY;
  }, { passive: true });

  window.addEventListener("touchmove", (e) => {
    if (!isTouching || !worldState.anchorPlaced || e.touches.length !== 1) return;
    const y = e.touches[0].clientY;
    const dy = y - lastY;
    lastY = y;
    worldState.distanceOffset += dy * 0.006;
    worldState.distanceOffset = THREE.MathUtils.clamp(worldState.distanceOffset, -1.1, 1.4);
  }, { passive: true });

  window.addEventListener("touchend", () => { isTouching = false; }, { passive: true });
}

function stopCameraOnly() {
  if (qrScanner) { qrScanner.stop(); qrScanner = null; }
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
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  animationFrameId = null;
  stopCameraOnly();
}

function disposeObject(obj) {
  obj.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) child.material.forEach(disposeMaterial);
      else disposeMaterial(child.material);
    }
  });
}

function disposeMaterial(m) {
  if (m.map) m.map.dispose();
  if (m.emissiveMap) m.emissiveMap.dispose();
  m.dispose();
}

function onResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener("pagehide", stopApp);
window.addEventListener("beforeunload", stopApp);
