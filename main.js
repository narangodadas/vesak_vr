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

const musicTracks = {
  "vesak-lantern-1": "assets/vesak-music.mp3",
  "vesak-lantern-2": "assets/vesak music3.mp3",
  "vesak-lantern-3": "assets/vesak music2.mp3"
};

let vesakMusic = null;

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

// ============================================================================
//  DEVICE ORIENTATION — real AR anchor system
// ============================================================================

// Phone orientation stored as a quaternion
const deviceQuaternion = new THREE.Quaternion();

// The orientation at the moment the QR was scanned — used as "world anchor"
const anchorQuaternion = new THREE.Quaternion();

// Temp objects reused every frame (avoid GC pressure)
const _euler = new THREE.Euler();
const _q1 = new THREE.Quaternion();
const _qScreen = new THREE.Quaternion(); // screen-orientation correction
const _qWorld = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // device → world

let orientationSupported = false;
let orientationPermissionGranted = false;
let lastAlpha = null;
let lastBeta = null;
let lastGamma = null;

// Called on every deviceorientation event
function onDeviceOrientation(evt) {
  if (evt.alpha === null && evt.beta === null && evt.gamma === null) return;

  lastAlpha = evt.alpha;
  lastBeta  = evt.beta;
  lastGamma = evt.gamma;

  // Build quaternion from phone Euler angles
  // Three.js DeviceOrientationControls algorithm (royalty-free, well-tested)
  const alpha = THREE.MathUtils.degToRad(evt.alpha || 0); // Z
  const beta  = THREE.MathUtils.degToRad(evt.beta  || 0); // X
  const gamma = THREE.MathUtils.degToRad(evt.gamma || 0); // Y

  _euler.set(beta, alpha, -gamma, "YXZ");
  deviceQuaternion.setFromEuler(_euler);
  deviceQuaternion.multiply(_qWorld);

  // Correct for screen orientation (portrait = 0, landscape = ±90)
  const screenAngle = THREE.MathUtils.degToRad(window.screen.orientation?.angle ?? 0);
  _qScreen.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -screenAngle);
  deviceQuaternion.multiply(_qScreen);
}

async function requestOrientationPermission() {
  // iOS 13+ requires explicit permission
  if (
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function"
  ) {
    try {
      const result = await DeviceOrientationEvent.requestPermission();
      if (result === "granted") {
        orientationPermissionGranted = true;
      }
    } catch (e) {
      console.warn("DeviceOrientation permission denied:", e);
    }
  } else {
    // Android / non-iOS — permission not required
    orientationPermissionGranted = true;
  }

  if (orientationPermissionGranted) {
    window.addEventListener("deviceorientation", onDeviceOrientation, true);
    orientationSupported = true;
  }
}

// ============================================================================
//  Anchor state
// ============================================================================

const anchorState = {
  placed: false,
  // World-space position of the lantern (set once when QR is scanned)
  worldPos: new THREE.Vector3(0, -0.35, -3.0),
  scale: 0.62
};

// ============================================================================
//  App lifecycle
// ============================================================================

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

    // Ask for orientation permission BEFORE camera (iOS needs a user gesture)
    await requestOrientationPermission();

    await startCamera();

    if (!renderer) {
      setupThreeScene();
    }

    setupQRScanner();

    overlay.classList.add("hidden");
    controlPanel.classList.remove("hidden");

    isRunning = true;
    statusBar.textContent = orientationSupported
      ? "Point camera at QR code"
      : "Point camera at QR code (no gyro — static mode)";

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

// ============================================================================
//  Three.js scene
// ============================================================================

function setupThreeScene() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    62,
    window.innerWidth / window.innerHeight,
    0.01,
    100
  );

  // Do NOT set camera.position / rotation here — driven by orientation
  camera.rotation.order = "YXZ";

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

// ============================================================================
//  QR Scanner
// ============================================================================

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

// ============================================================================
//  Music
// ============================================================================

function playVesakMusic(qrText) {
  stopVesakMusic();

  const musicPath = musicTracks[qrText] || musicTracks["vesak-lantern-1"];

  vesakMusic = new Audio(musicPath);
  vesakMusic.loop = true;
  vesakMusic.volume = 0.6;

  vesakMusic.play().catch((error) => {
    console.warn("Music play blocked:", error);
  });
}

function stopVesakMusic() {
  if (!vesakMusic) return;

  vesakMusic.pause();
  vesakMusic.currentTime = 0;
  vesakMusic = null;
}

// ============================================================================
//  Place lantern — anchor to world position using current orientation
// ============================================================================

function placeLanternAtQRLocation(qrText, qrLocation) {
  anchorState.placed = true;

  // --- Compute horizontal offset from QR center in the video frame ---
  let offsetX = 0;

  if (qrLocation && video.videoWidth) {
    const centerX =
      (
        qrLocation.topLeftCorner.x +
        qrLocation.topRightCorner.x +
        qrLocation.bottomLeftCorner.x +
        qrLocation.bottomRightCorner.x
      ) / 4;

    offsetX = ((centerX / video.videoWidth) - 0.5) * 1.3;
  }

  // --- Record the phone orientation at scan time as the "forward" direction ---
  anchorQuaternion.copy(deviceQuaternion);

  // --- Compute world-space position for the lantern ---
  // Start with a point directly in front of the camera (in camera space)
  const localPos = new THREE.Vector3(offsetX, -0.35, -3.0);

  // Rotate that local offset by the anchor orientation to get world position
  localPos.applyQuaternion(anchorQuaternion);

  anchorState.worldPos.copy(localPos);
  anchorState.scale = 0.62;

  // --- Build / replace the lantern ---
  if (currentLantern) {
    scene.remove(currentLantern);
    disposeObject(currentLantern);
  }

  currentLantern = createLantern(qrText);
  currentLantern.position.copy(anchorState.worldPos);
  currentLantern.scale.setScalar(anchorState.scale);
  scene.add(currentLantern);

  playVesakMusic(qrText);

  if (groundShadow) {
    groundShadow.visible = true;
    groundShadow.position.set(
      anchorState.worldPos.x,
      anchorState.worldPos.y - 0.7,
      anchorState.worldPos.z
    );
  }

  if (qrScanner) {
    qrScanner.stop();
  }

  statusBar.classList.add("hidden");
}

// ============================================================================
//  Per-frame camera update — phone orientation drives the camera
// ============================================================================

function updateCamera() {
  if (!camera) return;

  if (orientationSupported && (lastAlpha !== null)) {
    // Apply the live device quaternion to the camera
    camera.quaternion.copy(deviceQuaternion);
  } else {
    // Fallback: static forward-facing camera (original behaviour)
    camera.position.set(0, 0, 0);
    camera.rotation.set(0, 0, 0);
  }
}

// ============================================================================
//  Animate loop
// ============================================================================

function animate() {
  if (!isRunning) return;

  animationFrameId = requestAnimationFrame(animate);

  const delta = clock ? clock.getDelta() : 0.016;

  if (qrScanner) {
    qrScanner.scan();
  }

  // Drive camera from gyroscope — this is the key change
  updateCamera();

  if (currentLantern) {
    // Lantern stays at its fixed world-space position — never moved here
    updateLantern(currentLantern, delta);
  }

  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

// ============================================================================
//  Reset
// ============================================================================

function resetAnchor() {
  anchorState.placed = false;
  anchorState.worldPos.set(0, -0.35, -3.0);
  anchorState.scale = 0.62;

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

// ============================================================================
//  Teardown helpers
// ============================================================================

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

  window.removeEventListener("deviceorientation", onDeviceOrientation, true);

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