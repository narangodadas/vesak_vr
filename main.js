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

// Pseudo world anchor:
// distance scaling is removed.
// The lantern keeps one fixed pseudo-location after QR scan.
const anchorState = {
  placed: false,

  // orientation baseline captured when QR is scanned
  baseAlpha: null,
  baseBeta: null,
  baseGamma: null,

  // live camera orientation relative to scan moment
  yaw: 0,
  pitch: 0,
  roll: 0,

  // fixed QR/world position
  anchorX: 0,
  anchorY: 0.15,
  anchorZ: -3.0,

  // constant size — no distance feature
  scale: 0.48
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

async function safeStartApp() {
  startBtn.disabled = true;
  startBtn.textContent = "Starting...";
  statusBar.textContent = "Starting camera...";

  try {
    stopCameraOnly();

    await requestOrientationPermissionIfNeeded();
    await startCamera();

    if (!renderer) {
      setupThreeScene();
    }

    setupQRScanner();

    overlay.classList.add("hidden");
    controlPanel.classList.remove("hidden");

    isRunning = true;
    statusBar.textContent = "Camera started. Scan the floor QR.";

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

async function requestOrientationPermissionIfNeeded() {
  // iOS Safari asks orientation permission only after user gesture.
  if (
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function"
  ) {
    try {
      await DeviceOrientationEvent.requestPermission();
    } catch (error) {
      console.warn("Orientation permission failed:", error);
    }
  }

  window.addEventListener("deviceorientation", onDeviceOrientation, true);
}

function onDeviceOrientation(event) {
  const alpha = event.alpha ?? 0;
  const beta = event.beta ?? 0;
  const gamma = event.gamma ?? 0;

  // Before anchor, just keep current values ready.
  if (!anchorState.placed) return;

  if (anchorState.baseAlpha === null) {
    anchorState.baseAlpha = alpha;
    anchorState.baseBeta = beta;
    anchorState.baseGamma = gamma;
  }

  anchorState.yaw = THREE.MathUtils.degToRad(alpha - anchorState.baseAlpha);
  anchorState.pitch = THREE.MathUtils.degToRad(beta - anchorState.baseBeta);
  anchorState.roll = THREE.MathUtils.degToRad(gamma - anchorState.baseGamma);
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
    {
      video: true,
      audio: false
    }
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

  camera = new THREE.PerspectiveCamera(
    62,
    window.innerWidth / window.innerHeight,
    0.01,
    100
  );

  camera.position.set(0, 0, 0);
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

function placeLanternAtQRLocation(qrText, qrLocation) {
  anchorState.placed = true;

  // Reset orientation baseline at QR scan time.
  // After this, rotating the phone changes viewing angle,
  // but the lantern remains in the same pseudo-location.
  anchorState.baseAlpha = null;
  anchorState.baseBeta = null;
  anchorState.baseGamma = null;
  anchorState.yaw = 0;
  anchorState.pitch = 0;
  anchorState.roll = 0;

  // Use QR horizontal screen position to estimate left/right anchor.
  anchorState.anchorX = 0;

  if (qrLocation && video.videoWidth) {
    const centerX =
      (
        qrLocation.topLeftCorner.x +
        qrLocation.topRightCorner.x +
        qrLocation.bottomLeftCorner.x +
        qrLocation.bottomRightCorner.x
      ) / 4;

    anchorState.anchorX = ((centerX / video.videoWidth) - 0.5) * 1.3;
  }

  // Fixed pseudo-world location.
  // No distance scaling. No closer/farther.
  anchorState.anchorY = 0.15;
  anchorState.anchorZ = -3.0;
  anchorState.scale = 0.48;

  if (currentLantern) {
    scene.remove(currentLantern);
    disposeObject(currentLantern);
  }

  currentLantern = createLantern(qrText);
  currentLantern.position.set(
    anchorState.anchorX,
    anchorState.anchorY,
    anchorState.anchorZ
  );
  currentLantern.scale.setScalar(anchorState.scale);

  scene.add(currentLantern);

  if (groundShadow) {
    groundShadow.visible = true;
    groundShadow.position.set(
      anchorState.anchorX,
      -1.05,
      anchorState.anchorZ
    );
    groundShadow.scale.set(1, 1, 1);
  }

  if (qrScanner) {
    qrScanner.stop();
  }

  statusBar.textContent = `Lantern anchored at QR location: ${qrText}`;
}

function updateCameraAndAnchor() {
  // Camera rotates based on phone orientation.
  // This creates location-fixed feel instead of screen-fixed feel.
  camera.rotation.y = -anchorState.yaw;
  camera.rotation.x = -anchorState.pitch * 0.35;
  camera.rotation.z = -anchorState.roll * 0.18;

  if (!currentLantern || !anchorState.placed) return;

  // Keep lantern at fixed pseudo-world coordinates.
  currentLantern.position.set(
    anchorState.anchorX,
    anchorState.anchorY,
    anchorState.anchorZ
  );

  // Constant size: distance feature removed.
  currentLantern.scale.setScalar(anchorState.scale);

  if (groundShadow) {
    groundShadow.position.set(
      anchorState.anchorX,
      -1.05,
      anchorState.anchorZ
    );
  }
}

function animate() {
  if (!isRunning) return;

  animationFrameId = requestAnimationFrame(animate);

  const delta = clock ? clock.getDelta() : 0.016;

  if (qrScanner) {
    qrScanner.scan();
  }

  updateCameraAndAnchor();

  if (currentLantern) {
    updateLantern(currentLantern, delta);
  }

  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

function resetAnchor() {
  anchorState.placed = false;
  anchorState.baseAlpha = null;
  anchorState.baseBeta = null;
  anchorState.baseGamma = null;
  anchorState.yaw = 0;
  anchorState.pitch = 0;
  anchorState.roll = 0;

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

  statusBar.textContent = "Anchor reset. Scan QR again.";
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
    if (child.geometry) {
      child.geometry.dispose();
    }

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
