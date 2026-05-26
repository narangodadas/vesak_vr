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

// Music file path
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

// Device orientation state
const deviceOrientation = { alpha: 0, beta: 90, gamma: 0 };
let orientationListener = null;
let orientationPermissionGranted = false;

// World-space anchor (set once when QR is detected, never changes)
const anchorState = {
  placed: false,
  worldX: 0,
  worldY: 0,
  worldZ: -2.5,
  scale: 0.65
};

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

// ─── Device Orientation ───────────────────────────────────────────────────────

function degToRad(d) { return d * Math.PI / 180; }

function startOrientationTracking() {
  if (orientationListener) return;

  function onOrientation(e) {
    deviceOrientation.alpha = e.alpha || 0;  // compass heading
    deviceOrientation.beta  = e.beta  ?? 90; // front-back tilt (90 = vertical)
    deviceOrientation.gamma = e.gamma || 0;  // left-right tilt
  }

  if (
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function"
  ) {
    // iOS 13+ needs explicit permission
    DeviceOrientationEvent.requestPermission()
      .then((state) => {
        if (state === "granted") {
          orientationPermissionGranted = true;
          window.addEventListener("deviceorientation", onOrientation, true);
          orientationListener = onOrientation;
        }
      })
      .catch(console.warn);
  } else {
    // Android & older iOS — no permission needed
    window.addEventListener("deviceorientation", onOrientation, true);
    orientationListener = onOrientation;
    orientationPermissionGranted = true;
  }
}

function stopOrientationTracking() {
  if (orientationListener) {
    window.removeEventListener("deviceorientation", orientationListener, true);
    orientationListener = null;
  }
}

/**
 * Apply device orientation to the Three.js camera using Euler angles.
 * Three.js camera looks down -Z by default.
 * DeviceOrientation: alpha=yaw, beta=pitch, gamma=roll (all in degrees).
 * We use order "YXZ" which matches yaw→pitch→roll for a held phone.
 */
function applyCameraOrientation() {
  if (!camera) return;

  // When phone is held vertically, beta≈90. We subtract 90 so that
  // "phone held straight up" = camera looking straight ahead (0 pitch).
  const alpha = degToRad(deviceOrientation.alpha); // yaw   (around Y)
  const beta  = degToRad(deviceOrientation.beta - 90); // pitch (around X)
  const gamma = degToRad(deviceOrientation.gamma); // roll  (around Z)

  // rotation.order must be "YXZ" (set in setupThreeScene)
  camera.rotation.set(beta, -alpha, -gamma, "YXZ");
}

// ─── App lifecycle ────────────────────────────────────────────────────────────

async function safeStartApp() {
  startBtn.disabled = true;
  startBtn.textContent = "Scanning...";
  statusBar.textContent = "Starting camera...";

  try {
    stopCameraOnly();
    await startCamera();

    if (!renderer) {
      setupThreeScene();
    }

    startOrientationTracking();
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
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

function setupThreeScene() {
  scene = new THREE.Scene();

  // Vertical FOV derived from a 62° horizontal FOV so portrait phones
  // see the full lantern without top/bottom clipping.
  const aspect = window.innerWidth / window.innerHeight;
  const hFovRad = (62 * Math.PI) / 180;
  const vFovDeg = (2 * Math.atan(Math.tan(hFovRad / 2) / aspect) * 180) / Math.PI;

  camera = new THREE.PerspectiveCamera(vFovDeg, aspect, 0.01, 100);
  camera.position.set(0, 0, 0);
  camera.rotation.order = "YXZ"; // must match applyCameraOrientation

  renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  if (renderer.outputEncoding !== undefined) {
    renderer.outputEncoding = THREE.sRGBEncoding;
  }

  arContainer.innerHTML = "";
  arContainer.appendChild(renderer.domElement);

  clock = new THREE.Clock();

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
  scene.add(ambientLight);

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
  const shadowGeo = new THREE.CircleGeometry(1.15, 64);

  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.25,
    depthWrite: false
  });

  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.visible = false;

  return shadow;
}

function setupQRScanner() {
  if (qrScanner) {
    qrScanner.stop();
  }

  qrScanner = new QRScanner(video, (qrText, qrLocation) => {
    if (!qrText || anchorState.placed) return;
    placeLanternAtQRLocation(qrText, qrLocation);
  });

  qrScanner.start();
}

function playVesakMusic() {
  vesakMusic.currentTime = 0;
  vesakMusic.play().catch((error) => {
    console.warn("Music play blocked:", error);
  });
}

function stopVesakMusic() {
  vesakMusic.pause();
  vesakMusic.currentTime = 0;
}

// ─── QR → World Position ──────────────────────────────────────────────────────

/**
 * Convert a QR code's screen-center pixel into a world-space position.
 *
 * Strategy:
 *  1. Normalise the QR centre to NDC [-1, +1].
 *  2. Unproject through the current camera to get a ray direction.
 *  3. Place the lantern along that ray at a fixed depth (PLACE_DEPTH metres).
 *
 * Because the world position is stored once and never updated, the lantern
 * stays fixed in world space even when the phone moves.
 */
function qrScreenToWorldPosition(qrLocation) {
  const PLACE_DEPTH = 2.5; // metres in front of camera at scan moment

  // ── 1. Find QR centre in video pixels ──────────────────────────────────────
  let px = video.videoWidth  / 2;
  let py = video.videoHeight / 2;

  if (qrLocation && video.videoWidth && video.videoHeight) {
    px = (
      qrLocation.topLeftCorner.x  + qrLocation.topRightCorner.x  +
      qrLocation.bottomLeftCorner.x + qrLocation.bottomRightCorner.x
    ) / 4;
    py = (
      qrLocation.topLeftCorner.y  + qrLocation.topRightCorner.y  +
      qrLocation.bottomLeftCorner.y + qrLocation.bottomRightCorner.y
    ) / 4;
  }

  // ── 2. Map video pixels → renderer NDC ─────────────────────────────────────
  // The video feed may have a different aspect ratio than the canvas.
  // We map proportionally so the NDC matches what the user actually sees.
  const ndcX =  (px / video.videoWidth)  * 2 - 1;
  const ndcY = -(py / video.videoHeight) * 2 + 1; // Y is flipped in NDC

  // ── 3. Unproject to get world-space ray direction ──────────────────────────
  const vec = new THREE.Vector3(ndcX, ndcY, 0.5);
  vec.unproject(camera); // now in world space on the near plane
  vec.sub(camera.position).normalize(); // ray direction

  // ── 4. Walk along the ray for PLACE_DEPTH units ────────────────────────────
  const worldPos = new THREE.Vector3().addVectors(
    camera.position,
    vec.multiplyScalar(PLACE_DEPTH)
  );

  return worldPos;
}

function placeLanternAtQRLocation(qrText, qrLocation) {
  anchorState.placed = true;

  // Compute world position from QR screen coords + current camera orientation
  const worldPos = qrScreenToWorldPosition(qrLocation);

  anchorState.worldX = worldPos.x;
  anchorState.worldY = worldPos.y;
  anchorState.worldZ = worldPos.z;
  anchorState.scale  = 0.65;

  if (currentLantern) {
    scene.remove(currentLantern);
    disposeObject(currentLantern);
  }

  currentLantern = createLantern(qrText);
  currentLantern.position.set(anchorState.worldX, anchorState.worldY, anchorState.worldZ);
  currentLantern.scale.setScalar(anchorState.scale);
  scene.add(currentLantern);

  playVesakMusic();

  if (groundShadow) {
    groundShadow.visible = true;
    groundShadow.position.set(
      anchorState.worldX,
      anchorState.worldY - 0.85,
      anchorState.worldZ
    );
    groundShadow.scale.set(1, 1, 1);
  }

  if (qrScanner) {
    qrScanner.stop();
  }

  statusBar.classList.add("hidden");
}

// ─── Animation loop ───────────────────────────────────────────────────────────

function animate() {
  if (!isRunning) return;

  animationFrameId = requestAnimationFrame(animate);

  const delta = clock ? clock.getDelta() : 0.016;

  // Rotate camera based on device orientation every frame
  applyCameraOrientation();

  if (qrScanner) {
    qrScanner.scan();
  }

  if (currentLantern) {
    updateLantern(currentLantern, delta);
  }

  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

// ─── Reset ────────────────────────────────────────────────────────────────────

function resetAnchor() {
  anchorState.placed = false;
  anchorState.worldX = 0;
  anchorState.worldY = 0;
  anchorState.worldZ = -2.5;
  anchorState.scale  = 0.65;

  stopVesakMusic();

  if (currentLantern) {
    scene.remove(currentLantern);
    disposeObject(currentLantern);
    currentLantern = null;
  }

  if (groundShadow) {
    groundShadow.visible = false;
  }

  if (qrScanner) {
    qrScanner.start();
  }

  statusBar.classList.remove("hidden");
  statusBar.textContent = "Ready to scan";
}

// ─── Camera stop / dispose ────────────────────────────────────────────────────

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

  stopVesakMusic();
  stopOrientationTracking();

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

  const aspect = window.innerWidth / window.innerHeight;
  const hFovRad = (62 * Math.PI) / 180;
  const vFovDeg = (2 * Math.atan(Math.tan(hFovRad / 2) / aspect) * 180) / Math.PI;

  camera.fov = vFovDeg;
  camera.aspect = aspect;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener("pagehide", stopApp);
window.addEventListener("beforeunload", stopApp);