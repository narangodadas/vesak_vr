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
//  VISIBILITY RADIUS — user must stay within this XZ distance of the QR code
//  to see the lantern  (metres, real-world scale)
// ============================================================================
const VISIBILITY_RADIUS = 2.0;

// ============================================================================
//  ANCHOR — world-space fixed point (set once when QR is scanned, never moves)
// ============================================================================
const anchor = {
  placed:   false,
  position: new THREE.Vector3()
};

// ============================================================================
//  DEVICE ORIENTATION
//
//  Key design decision
//  -------------------
//  The camera sits AT a fixed position relative to the anchor (slightly above
//  and in front of it, set at scan time).  ONLY camera.quaternion changes
//  as the phone rotates.  This is identical to how a 360° VR viewer works:
//  the viewer stands in one spot and looks around — objects don't move.
//
//  Why the old approach was wrong
//  --------------------------------
//  Previously we computed:
//      camera.position = anchor − forward * ARM
//  That makes the camera orbit AROUND the anchor, so the lantern appeared
//  to "follow" the camera rotation.  Instead we must:
//      1. Fix camera.position at scan time (never change it per-frame)
//      2. Apply only camera.quaternion = deviceQuat each frame
// ============================================================================

const orientation = { alpha: 0, beta: 90, gamma: 0 };
let orientationReady  = false;

// The camera's fixed world-space position (set once when QR is scanned)
const cameraWorldPos  = new THREE.Vector3();
let   cameraPosFixed  = false;

const deviceQuat  = new THREE.Quaternion();
const _euler      = new THREE.Euler();
// Device → Three.js world-space correction (standard DeviceOrientationControls magic)
const _qAdjust    = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));

function buildDeviceQuat(alpha, beta, gamma) {
  _euler.set(
    THREE.MathUtils.degToRad(beta),
    THREE.MathUtils.degToRad(alpha),
    THREE.MathUtils.degToRad(-gamma),
    "YXZ"
  );
  deviceQuat.setFromEuler(_euler);
  deviceQuat.multiply(_qAdjust);

  // Correct for physical screen rotation (portrait=0°, landscape=90°, etc.)
  const angle = window.screen?.orientation?.angle ?? 0;
  if (angle !== 0) {
    const _qs = new THREE.Quaternion();
    _qs.setFromAxisAngle(
      new THREE.Vector3(0, 0, 1),
      -THREE.MathUtils.degToRad(angle)
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
//  updateCamera  — rotation only, position is FIXED
// ============================================================================
function updateCamera() {
  if (!camera) return;

  // Always keep the camera at its locked world position
  if (cameraPosFixed) {
    camera.position.copy(cameraWorldPos);
  }

  if (!orientationReady) {
    // Fallback: static look-at until gyro data arrives
    camera.lookAt(anchor.position);
    return;
  }

  // -----------------------------------------------------------------------
  //  Apply device orientation as PURE ROTATION — nothing else changes.
  //  The scene (including the lantern) stays completely still in world space.
  // -----------------------------------------------------------------------
  buildDeviceQuat(orientation.alpha, orientation.beta, orientation.gamma);
  camera.quaternion.copy(deviceQuat);
}

// ============================================================================
//  Visibility — hide lantern when user walks too far from QR code
//
//  We estimate the user's XZ floor position from the camera's forward vector
//  projected onto Y=0.  This is the same ray-cast trick used in placeAnchor.
// ============================================================================
const _fwd        = new THREE.Vector3();
const _userFloor  = new THREE.Vector3();

function updateLanternVisibility() {
  if (!currentLantern || !anchor.placed) return;

  // Extract camera forward direction from its current quaternion
  _fwd.set(0, 0, -1).applyQuaternion(camera.quaternion);

  // Project camera position downward onto floor (Y=0) to get "feet" position
  const eyeY = cameraWorldPos.y;            // eye height recorded at scan time
  if (_fwd.y < -0.01 && eyeY > 0) {
    const t = -eyeY / _fwd.y;
    _userFloor.set(
      cameraWorldPos.x + _fwd.x * t,
      0,
      cameraWorldPos.z + _fwd.z * t
    );
  } else {
    // Phone held horizontal / pointing up — use camera XZ as approximation
    _userFloor.set(cameraWorldPos.x, 0, cameraWorldPos.z);
  }

  // XZ distance from user feet to QR anchor
  const dx   = _userFloor.x - anchor.position.x;
  const dz   = _userFloor.z - anchor.position.z;
  const dist = Math.sqrt(dx * dx + dz * dz);

  const inRange = dist <= VISIBILITY_RADIUS;

  currentLantern.visible           = inRange;
  if (groundShadow) groundShadow.visible = inRange;

  if (anchor.placed) {
    if (!inRange) {
      statusBar.textContent = "Move closer to the QR code ↓";
      statusBar.classList.remove("hidden");
    } else {
      statusBar.classList.add("hidden");
    }
  }
}

// ============================================================================
//  App lifecycle
// ============================================================================
startBtn.addEventListener("click", async () => await safeStartApp());
resetAnchorBtn.addEventListener("click", resetAnchor);
screenshotBtn.addEventListener("click", () => {
  if (renderer) captureScreenshot(video, renderer.domElement, downloadLink);
});

async function safeStartApp() {
  startBtn.disabled    = true;
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
    startBtn.disabled    = false;
    startBtn.textContent = "Start Camera";
    statusBar.textContent = "Camera failed.";
    alert("Camera failed. Use HTTPS, allow Camera permission, then refresh.");
  }
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera not supported");

  const tries = [
    { video: { facingMode: { exact: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
    { video: { facingMode: "environment",            width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
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
//  Three.js scene setup
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
//  QR detection → anchor + camera placement (both set ONCE, never again)
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

  // --- Horizontal offset from QR centre in video frame ---
  let offsetX = 0;
  if (qrLocation && video.videoWidth) {
    const cx = (
      qrLocation.topLeftCorner.x    + qrLocation.topRightCorner.x +
      qrLocation.bottomLeftCorner.x + qrLocation.bottomRightCorner.x
    ) / 4;
    offsetX = ((cx / video.videoWidth) - 0.5) * 1.3;
  }

  // --- Place anchor on the floor via ray-cast ---
  //     Ray origin = phone held at eye level (~1.5 m)
  //     Ray direction = where the phone camera points right now
  const EYE_HEIGHT = 1.5;

  if (orientationReady) {
    buildDeviceQuat(orientation.alpha, orientation.beta, orientation.gamma);
    const rayDir = new THREE.Vector3(0, 0, -1).applyQuaternion(deviceQuat);

    if (rayDir.y < -0.05) {
      // Ray intersects Y=0 floor plane
      const t = -EYE_HEIGHT / rayDir.y;
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

  // -----------------------------------------------------------------------
  //  Fix the camera position in world space directly above where the user
  //  is standing at scan time, at eye height.
  //  From here the camera ONLY rotates — it never translates again.
  // -----------------------------------------------------------------------
  cameraWorldPos.set(0, EYE_HEIGHT, 0);   // user is at world origin at scan time
  cameraPosFixed = true;
  camera.position.copy(cameraWorldPos);

  // --- Build lantern at anchor, floating above the QR ---
  if (currentLantern) { scene.remove(currentLantern); disposeObject(currentLantern); }

  currentLantern = createLantern(qrText);
  currentLantern.position.set(
    anchor.position.x,
    anchor.position.y + 0.5,   // float above QR
    anchor.position.z
  );
  currentLantern.scale.setScalar(0.62);
  scene.add(currentLantern);

  if (groundShadow) {
    groundShadow.visible = true;
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
//  Animate loop
// ============================================================================
function animate() {
  if (!isRunning) return;
  animationFrameId = requestAnimationFrame(animate);

  const delta = clock?.getDelta() ?? 0.016;

  if (qrScanner) qrScanner.scan();

  updateCamera();              // rotation-only, position stays fixed
  updateLanternVisibility();   // hide when user walks away from QR

  if (currentLantern) updateLantern(currentLantern, delta);
  if (renderer && scene && camera) renderer.render(scene, camera);
}

// ============================================================================
//  Reset
// ============================================================================
function resetAnchor() {
  anchor.placed  = false;
  anchor.position.set(0, 0, 0);
  cameraPosFixed = false;

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
  if (qrScanner)        { qrScanner.stop(); qrScanner = null; }
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