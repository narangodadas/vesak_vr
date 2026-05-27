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

const vesakMusic = new Audio("assets/vesak-music.mp3");
vesakMusic.loop = true;
vesakMusic.volume = 0.6;

let scene;
let camera;
let renderer;
let clock;
let qrScanner;
let currentStream = null;
let currentLantern = null;
let groundShadow = null;
let animationFrameId = null;
let isRunning = false;

// ── Anchor state ──────────────────────────────────────────────────────────────
// After first QR detection the lantern is created.
// Every subsequent QR detection updates its screen position so it
// always sits exactly over the physical QR marker.

const anchorState = {
  placed: false,       // true after first detection
  qrText: null,        // stored so we don't recreate on every frame

  // Target 3-D position (updated each time QR is seen, smoothed toward)
  targetX: 0,
  targetY: 0,
  targetZ: -2.5,

  // Current rendered position (lerped toward target)
  currentX: 0,
  currentY: 0,
  currentZ: -2.5,

  scale: 0.65,

  // How long since we last saw the QR (seconds).
  // If > LOST_THRESHOLD we freeze in place rather than teleporting.
  lastSeenTimer: 0,
};

const LOST_THRESHOLD = 0.25; // seconds before we consider QR "lost"
const LERP_SPEED     = 18;   // higher = snappier tracking

// ── QR pixel-centre → Three.js 3-D position ──────────────────────────────────
// The camera is always at origin with zero rotation (no gyro needed).
// We map the QR pixel centre to NDC, then unproject to get a ray direction,
// then place the lantern a fixed depth along that ray.

const PLACE_DEPTH = 2.5; // units in front of camera

function qrToPosition(qrLocation) {
  let px = video.videoWidth  / 2;
  let py = video.videoHeight / 2;

  if (qrLocation && video.videoWidth && video.videoHeight) {
    px = (
      qrLocation.topLeftCorner.x    + qrLocation.topRightCorner.x  +
      qrLocation.bottomLeftCorner.x + qrLocation.bottomRightCorner.x
    ) / 4;
    py = (
      qrLocation.topLeftCorner.y    + qrLocation.topRightCorner.y  +
      qrLocation.bottomLeftCorner.y + qrLocation.bottomRightCorner.y
    ) / 4;
  }

  // Video pixels → NDC (note Y flip)
  const ndcX =  (px / video.videoWidth)  * 2 - 1;
  const ndcY = -(py / video.videoHeight) * 2 + 1;

  // Unproject NDC → world-space ray
  const vec = new THREE.Vector3(ndcX, ndcY, 0.5);
  vec.unproject(camera);
  vec.sub(camera.position).normalize();

  return {
    x: camera.position.x + vec.x * PLACE_DEPTH,
    y: camera.position.y + vec.y * PLACE_DEPTH,
    z: camera.position.z + vec.z * PLACE_DEPTH,
  };
}

// Estimate apparent scale from QR physical size in pixels.
// Larger QR on screen = phone is closer = lantern should appear bigger.
function qrToScale(qrLocation) {
  if (!qrLocation || !video.videoWidth) return 0.65;

  const dx = qrLocation.topRightCorner.x - qrLocation.topLeftCorner.x;
  const dy = qrLocation.topRightCorner.y - qrLocation.topLeftCorner.y;
  const sizePixels = Math.sqrt(dx * dx + dy * dy);

  // Normalise against video width. A QR that fills ~15% of frame width
  // at 2.5 units away → scale 0.65.  Clamp to reasonable range.
  const normalised = sizePixels / video.videoWidth;
  const scale = Math.max(0.25, Math.min(1.4, normalised * 4.5));
  return scale;
}

// ─────────────────────────────────────────────────────────────────────────────

startBtn.addEventListener("click", async () => {
  await safeStartApp();
});

resetAnchorBtn.addEventListener("click", () => {
  resetAnchor();
});

screenshotBtn.addEventListener("click", () => {
  if (renderer) {
    captureScreenshot(video, renderer.domElement, downloadLink);
  }
});

async function safeStartApp() {
  startBtn.disabled = true;
  startBtn.textContent = "Scanning...";
  statusBar.textContent = "Starting camera...";

  try {
    stopCameraOnly();
    await startCamera();

    if (!renderer) setupThreeScene();

    setupQRScanner();

    overlay.classList.add("hidden");
    controlPanel.classList.remove("hidden");

    isRunning = true;
    statusBar.textContent = "Point camera at QR code";
    animate();
  } catch (error) {
    console.error("Start error:", error);
    startBtn.disabled = false;
    startBtn.textContent = "Start Camera";
    statusBar.textContent = "Camera failed.";
    alert(
      "Camera failed. Use HTTPS, allow Camera permission, close other camera apps, then refresh."
    );
  }
}

async function startCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error("Camera API not supported.");
  }

  const constraintsList = [
    {
      video: { facingMode: { exact: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    },
    {
      video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
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
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

function setupThreeScene() {
  scene = new THREE.Scene();

  const aspect   = window.innerWidth / window.innerHeight;
  const hFovRad  = (62 * Math.PI) / 180;
  const vFovDeg  = (2 * Math.atan(Math.tan(hFovRad / 2) / aspect) * 180) / Math.PI;

  camera = new THREE.PerspectiveCamera(vFovDeg, aspect, 0.01, 100);
  camera.position.set(0, 0, 0);
  camera.rotation.set(0, 0, 0);
  camera.rotation.order = "YXZ";

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (renderer.outputEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;

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
}

function createGroundShadow() {
  const geo = new THREE.CircleGeometry(1.15, 64);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false
  });
  const shadow = new THREE.Mesh(geo, mat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.visible = false;
  return shadow;
}

// ── QR Scanner — keep running after placement ─────────────────────────────────

function setupQRScanner() {
  if (qrScanner) qrScanner.stop();

  qrScanner = new QRScanner(video, (qrText, qrLocation) => {
    if (!qrText) return;

    // Reset lost-timer every time QR is seen
    anchorState.lastSeenTimer = 0;

    if (!anchorState.placed) {
      // First detection: create lantern
      anchorState.placed  = true;
      anchorState.qrText  = qrText;

      currentLantern = createLantern(qrText);
      currentLantern.scale.setScalar(anchorState.scale);
      scene.add(currentLantern);

      if (groundShadow) groundShadow.visible = true;

      playVesakMusic();
      statusBar.classList.add("hidden");
    }

    // Update target position every frame we see the QR
    const pos   = qrToPosition(qrLocation);
    const scale = qrToScale(qrLocation);

    anchorState.targetX = pos.x;
    anchorState.targetY = pos.y;
    anchorState.targetZ = pos.z;
    anchorState.scale   = scale;
  });

  qrScanner.start();
}

function playVesakMusic() {
  vesakMusic.currentTime = 0;
  vesakMusic.play().catch((e) => console.warn("Music blocked:", e));
}

function stopVesakMusic() {
  vesakMusic.pause();
  vesakMusic.currentTime = 0;
}

// ── Animation loop ────────────────────────────────────────────────────────────

function animate() {
  if (!isRunning) return;
  animationFrameId = requestAnimationFrame(animate);

  const delta = clock ? clock.getDelta() : 0.016;

  // Scan QR every frame
  if (qrScanner) qrScanner.scan();

  // Tick lost-timer
  if (anchorState.placed) {
    anchorState.lastSeenTimer += delta;
  }

  // Smooth lantern toward the latest target position
  if (currentLantern && anchorState.placed) {
    const t = Math.min(1, LERP_SPEED * delta);

    // Only lerp if QR was seen recently; otherwise freeze
    if (anchorState.lastSeenTimer < LOST_THRESHOLD) {
      anchorState.currentX += (anchorState.targetX - anchorState.currentX) * t;
      anchorState.currentY += (anchorState.targetY - anchorState.currentY) * t;
      anchorState.currentZ += (anchorState.targetZ - anchorState.currentZ) * t;
    }

    currentLantern.position.set(
      anchorState.currentX,
      anchorState.currentY,
      anchorState.currentZ
    );
    currentLantern.scale.setScalar(anchorState.scale);

    if (groundShadow) {
      groundShadow.position.set(
        anchorState.currentX,
        anchorState.currentY - 0.85,
        anchorState.currentZ
      );
    }

    updateLantern(currentLantern, delta);
  }

  if (renderer && scene && camera) renderer.render(scene, camera);
}

// ── Reset ─────────────────────────────────────────────────────────────────────

function resetAnchor() {
  anchorState.placed        = false;
  anchorState.qrText        = null;
  anchorState.targetX       = 0;
  anchorState.targetY       = 0;
  anchorState.targetZ       = -2.5;
  anchorState.currentX      = 0;
  anchorState.currentY      = 0;
  anchorState.currentZ      = -2.5;
  anchorState.scale         = 0.65;
  anchorState.lastSeenTimer = 0;

  stopVesakMusic();

  if (currentLantern) {
    scene.remove(currentLantern);
    disposeObject(currentLantern);
    currentLantern = null;
  }

  if (groundShadow) groundShadow.visible = false;

  // Restart scanner so user can scan again
  if (qrScanner) qrScanner.start();

  statusBar.classList.remove("hidden");
  statusBar.textContent = "Ready to scan";
}

// ── Camera / dispose helpers ──────────────────────────────────────────────────

function stopCameraOnly() {
  if (qrScanner) { qrScanner.stop(); qrScanner = null; }
  if (video.srcObject) {
    video.srcObject.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
  }
  if (currentStream) {
    currentStream.getTracks().forEach((t) => t.stop());
    currentStream = null;
  }
}

function stopApp() {
  isRunning = false;
  stopVesakMusic();
  if (animationFrameId) { cancelAnimationFrame(animationFrameId); animationFrameId = null; }
  stopCameraOnly();
}

function disposeObject(obj) {
  obj.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      (Array.isArray(child.material) ? child.material : [child.material])
        .forEach(disposeMaterial);
    }
  });
}

function disposeMaterial(mat) {
  if (mat.map)         mat.map.dispose();
  if (mat.emissiveMap) mat.emissiveMap.dispose();
  mat.dispose();
}

function onResize() {
  if (!camera || !renderer) return;
  const aspect  = window.innerWidth / window.innerHeight;
  const hFovRad = (62 * Math.PI) / 180;
  camera.fov    = (2 * Math.atan(Math.tan(hFovRad / 2) / aspect) * 180) / Math.PI;
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener("pagehide",     stopApp);
window.addEventListener("beforeunload", stopApp);