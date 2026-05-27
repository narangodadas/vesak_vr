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

const anchorState = {
  placed: false,
  anchorX: 0,
  anchorY: -0.75,
  anchorZ: -3.0,
  scale: 0.82
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
  startBtn.textContent = "Scanning...";
  statusBar.textContent = "Starting camera...";

  try {
    stopCameraOnly();
    await startCamera();

    if (!renderer) {
      setupThreeScene();
    }

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
  camera.rotation.set(0, 0, 0);
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

function placeLanternAtQRLocation(qrText, qrLocation) {
  anchorState.placed = true;
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

  anchorState.anchorY = -0.75;
  anchorState.anchorZ = -3.0;
  anchorState.scale = 0.82;

  camera.position.set(0, 0, 0);
  camera.rotation.set(0, 0, 0);

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

  playVesakMusic();

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

statusBar.classList.add("hidden");
}

function updateCameraAndAnchor() {
  camera.position.set(0, 0, 0);
  camera.rotation.set(0, 0, 0);

  if (!currentLantern || !anchorState.placed) return;

  currentLantern.position.set(
    anchorState.anchorX,
    anchorState.anchorY,
    anchorState.anchorZ
  );

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
  anchorState.anchorX = 0;
  anchorState.anchorY = -0.75;
  anchorState.anchorZ = -3.0;
  anchorState.scale = 0.82;

  stopVesakMusic();

  camera.position.set(0, 0, 0);
  camera.rotation.set(0, 0, 0);

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