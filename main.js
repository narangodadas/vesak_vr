import { QRScanner } from "./qr-scanner.js";
import { createLantern, updateLantern } from "./lantern.js";
import { captureScreenshot } from "./screenshot.js";

const video        = document.getElementById("cameraVideo");
const arContainer  = document.getElementById("arContainer");
const overlay      = document.getElementById("overlay");
const startBtn     = document.getElementById("startBtn");
const statusBar    = document.getElementById("statusBar");
const controlPanel = document.getElementById("controlPanel");
const screenshotBtn   = document.getElementById("screenshotBtn");
const resetAnchorBtn  = document.getElementById("resetAnchorBtn");
const downloadLink    = document.getElementById("downloadLink");

const musicTracks = {
  "vesak-lantern-1": "assets/vesak-music.mp3",
  "vesak-lantern-2": "assets/vesak music3.mp3",
  "vesak-lantern-3": "assets/vesak music2.mp3"
};

let vesakMusic = null;
let scene, camera, renderer, clock;
let qrScanner, currentStream;
let currentLantern = null;
let groundShadow   = null;
let animationFrameId = null;
let isRunning = false;

// ============================================================================
//  HOW FAR FROM QR CODE the lantern stays visible (metres, world-space)
// ============================================================================
const VISIBILITY_RADIUS = 2.0;   // tweak: 1.5 = tight, 2.5 = generous

// ============================================================================
//  ANCHOR — world-space fixed point (set once when QR is scanned)
// ============================================================================
const anchor = {
  placed:   false,
  position: new THREE.Vector3()
};

// ============================================================================
//  DEVICE ORIENTATION  →  spherical camera orbit around anchor
// ============================================================================
const orientation  = { alpha: 0, beta: 90, gamma: 0 };
let orientationReady = false;

const deviceQuat = new THREE.Quaternion();
const _euler     = new THREE.Euler();
const _qAdjust   = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));

function buildDeviceQuat(alpha, beta, gamma) {
  _euler.set(
    THREE.MathUtils.degToRad(beta),
    THREE.MathUtils.degToRad(alpha),
    THREE.MathUtils.degToRad(-gamma),
    "YXZ"
  );
  deviceQuat.setFromEuler(_euler);
  deviceQuat.multiply(_qAdjust);

  const screenAngle = window.screen?.orientation?.angle ?? 0;
  if (screenAngle !== 0) {
    const _qs = new THREE.Quaternion();
    _qs.setFromAxisAngle(
      new THREE.Vector3(0, 0, 1),
      -THREE.MathUtils.degToRad(screenAngle)
    );
    deviceQuat.multiply(_qs);
  }
}

function onDeviceOrientation(evt) {
  if (evt.alpha == null) return;
  orientation.alpha = evt.alpha;
  orientation.beta  = evt.beta;
  orientation.gamma = evt.gamma;
  orientationReady  = true;
}

async function requestOrientationPermission() {
  if (
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function"
  ) {
    try {
      const res = await DeviceOrientationEvent.requestPermission();
      if (res === "granted")
        window.addEventListener("deviceorientation", onDeviceOrientation, true);
    } catch (e) {
      console.warn("Orientation permission denied:", e);
    }
  } else {
    window.addEventListener("deviceorientation", onDeviceOrientation, true);
  }
}

// ============================================================================
//  Camera orbit
// ============================================================================
const CAM_ARM    = 3.2;
const _camFwd    = new THREE.Vector3();

// Estimated real-world camera position (XZ plane, metres)
// We accumulate this from orientation so we can measure distance to anchor.
const camWorldPos = new THREE.Vector3();

function updateCamera() {
  if (!camera) return;

  if (!orientationReady) {
    camera.position.set(
      anchor.position.x,
      anchor.position.y + 2.0,
      anchor.position.z + 2.5
    );
    camera.lookAt(anchor.position);
    camWorldPos.copy(camera.position);
    return;
  }

  buildDeviceQuat(orientation.alpha, orientation.beta, orientation.gamma);

  // Direction the phone camera is pointing
  _camFwd.set(0, 0, -1).applyQuaternion(deviceQuat);

  // Render camera position: orbit point behind anchor
  camera.position
    .copy(anchor.position)
    .addScaledVector(_camFwd, -CAM_ARM);

  camera.lookAt(anchor.position);

  // --------------------------------------------------------------------------
  //  Estimate the USER'S real-world horizontal position.
  //
  //  We can't get GPS-level accuracy from orientation alone, but we CAN use
  //  the horizontal (XZ) component of the camera-forward vector projected
  //  onto the floor to estimate where the phone is relative to the anchor.
  //
  //  Approach: assume the user holds the phone at eye-level (~1.5 m).
  //  Cast a ray from that assumed height in the look-direction and find where
  //  it hits Y = 0.  That is the estimated "feet position" of the user.
  // --------------------------------------------------------------------------
  const eyeHeight  = 1.5;
  const rayOriginY = eyeHeight;

  if (_camFwd.y < -0.01) {
    // Ray hits the floor at parametric t = -eyeHeight / fwd.y
    const t = -rayOriginY / _camFwd.y;
    camWorldPos.set(
      anchor.position.x + _camFwd.x * t,  // offset from anchor in X
      0,
      anchor.position.z + _camFwd.z * t   // offset from anchor in Z
    );
  } else {
    // Phone pointed horizontally or upward — project flat on XZ
    camWorldPos.set(
      anchor.position.x - _camFwd.x * CAM_ARM,
      0,
      anchor.position.z - _camFwd.z * CAM_ARM
    );
  }
}

// ============================================================================
//  Visibility check — hide lantern when user walks away from QR location
// ============================================================================
function updateLanternVisibility() {
  if (!currentLantern || !anchor.placed) return;

  // Horizontal (XZ) distance between estimated user position and anchor
  const dx = camWorldPos.x - anchor.position.x;
  const dz = camWorldPos.z - anchor.position.z;
  const distXZ = Math.sqrt(dx * dx + dz * dz);

  const visible = distXZ <= VISIBILITY_RADIUS;

  currentLantern.visible = visible;
  if (groundShadow) groundShadow.visible = visible;

  // Optional: show a hint in the status bar when out of range
  if (anchor.placed) {
    if (!visible) {
      statusBar.textContent = "Move closer to the QR code";
      statusBar.classList.remove("hidden");
    } else {
      statusBar.classList.add("hidden");
    }
  }
}

// ============================================================================
//  App start
// ============================================================================
startBtn.addEventListener("click", async () => await safeStartApp());
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
    await requestOrientationPermission();
    await startCamera();
    if (!renderer) setupThreeScene();
    setupQRScanner();

    overlay.classList.add("hidden");
    controlPanel.classList.remove("hidden");
    isRunning = true;
    statusBar.textContent = "Point camera at QR code";
    animate();
  } catch (err) {
    console.error("Start error:", err);
    startBtn.disabled = false;
    startBtn.textContent = "Start Camera";
    statusBar.textContent = "Camera failed.";
    alert("Camera failed. Use HTTPS, allow Camera permission, then refresh.");
  }
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera not supported");

  const tries = [
    { video: { facingMode: { exact: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
    { video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
    { video: true, audio: false }
  ];

  let lastErr;
  for (const c of tries) {
    try {
      currentStream   = await navigator.mediaDevices.getUserMedia(c);
      video.srcObject = currentStream;
      video.setAttribute("playsinline", true);
      video.muted = true;
      await video.play();
      return;
    } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

// ============================================================================
//  Three.js scene
// ============================================================================
function setupThreeScene() {
  scene  = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.01, 100);

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (renderer.outputEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;

  arContainer.innerHTML = "";
  arContainer.appendChild(renderer.domElement);

  clock = new THREE.Clock();

  scene.add(new THREE.AmbientLight(0xffffff, 0.95));
  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(2, 3, 4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffcc88, 0.45);
  fill.position.set(-3, 1, 2);
  scene.add(fill);

  groundShadow = buildGroundShadow();
  scene.add(groundShadow);

  window.addEventListener("resize", onResize);
}

function buildGroundShadow() {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(1.15, 64),
    new THREE.MeshBasicMaterial({
      color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false
    })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.visible = false;
  return mesh;
}

// ============================================================================
//  QR detection → anchor placement
// ============================================================================
function setupQRScanner() {
  if (qrScanner) qrScanner.stop();
  qrScanner = new QRScanner(video, (qrText, qrLocation) => {
    if (!qrText || anchor.placed) return;
    placeAnchor(qrText, qrLocation);
  });
  qrScanner.start();
}

function placeAnchor(qrText, qrLocation) {
  anchor.placed = true;

  let offsetX = 0;
  if (qrLocation && video.videoWidth) {
    const cx = (
      qrLocation.topLeftCorner.x  + qrLocation.topRightCorner.x +
      qrLocation.bottomLeftCorner.x + qrLocation.bottomRightCorner.x
    ) / 4;
    offsetX = ((cx / video.videoWidth) - 0.5) * 1.3;
  }

  // Project anchor onto floor via ray cast
  if (orientationReady) {
    buildDeviceQuat(orientation.alpha, orientation.beta, orientation.gamma);
    const rayDir = new THREE.Vector3(0, 0, -1).applyQuaternion(deviceQuat);
    if (rayDir.y < -0.05) {
      const t = -1.5 / rayDir.y;   // eye height = 1.5 m
      anchor.position.set(
        offsetX + rayDir.x * t,
        0,
        rayDir.z * t
      );
    } else {
      anchor.position.set(offsetX, 0, -3.0);
    }
  } else {
    anchor.position.set(offsetX, 0, -3.0);
  }

  // Build lantern
  if (currentLantern) { scene.remove(currentLantern); disposeObject(currentLantern); }
  currentLantern = createLantern(qrText);
  currentLantern.position.set(anchor.position.x, anchor.position.y + 0.5, anchor.position.z);
  currentLantern.scale.setScalar(0.62);
  scene.add(currentLantern);

  if (groundShadow) {
    groundShadow.position.set(anchor.position.x, anchor.position.y + 0.01, anchor.position.z);
  }

  playVesakMusic(qrText);
  if (qrScanner) qrScanner.stop();
  statusBar.classList.add("hidden");
}

// ============================================================================
//  Music
// ============================================================================
function playVesakMusic(qrText) {
  stopVesakMusic();
  const path = musicTracks[qrText] || musicTracks["vesak-lantern-1"];
  vesakMusic = new Audio(path);
  vesakMusic.loop   = true;
  vesakMusic.volume = 0.6;
  vesakMusic.play().catch(e => console.warn("Music blocked:", e));
}

function stopVesakMusic() {
  if (!vesakMusic) return;
  vesakMusic.pause();
  vesakMusic.currentTime = 0;
  vesakMusic = null;
}

// ============================================================================
//  Animate
// ============================================================================
function animate() {
  if (!isRunning) return;
  animationFrameId = requestAnimationFrame(animate);

  const delta = clock?.getDelta() ?? 0.016;

  if (qrScanner) qrScanner.scan();

  updateCamera();
  updateLanternVisibility();   // ← hide/show based on XZ distance

  if (currentLantern) updateLantern(currentLantern, delta);

  if (renderer && scene && camera) renderer.render(scene, camera);
}

// ============================================================================
//  Reset
// ============================================================================
function resetAnchor() {
  anchor.placed = false;
  anchor.position.set(0, 0, 0);

  stopVesakMusic();

  if (currentLantern) { scene.remove(currentLantern); disposeObject(currentLantern); currentLantern = null; }
  if (groundShadow)  groundShadow.visible = false;
  if (qrScanner)     qrScanner.start();

  statusBar.classList.remove("hidden");
  statusBar.textContent = "Ready to scan";
}

// ============================================================================
//  Helpers
// ============================================================================
function stopCameraOnly() {
  if (qrScanner) { qrScanner.stop(); qrScanner = null; }
  if (video.srcObject)  { video.srcObject.getTracks().forEach(t => t.stop()); video.srcObject = null; }
  if (currentStream)    { currentStream.getTracks().forEach(t => t.stop()); currentStream = null; }
}

function stopApp() {
  isRunning = false;
  stopVesakMusic();
  window.removeEventListener("deviceorientation", onDeviceOrientation, true);
  if (animationFrameId) { cancelAnimationFrame(animationFrameId); animationFrameId = null; }
  stopCameraOnly();
}

function disposeObject(obj) {
  obj.traverse(child => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      (Array.isArray(child.material) ? child.material : [child.material]).forEach(disposeMaterial);
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
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener("pagehide",     stopApp);
window.addEventListener("beforeunload", stopApp);