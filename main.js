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
//  ANCHOR — world-space fixed point (set once when QR is scanned)
// ============================================================================
const anchor = {
  placed:   false,
  position: new THREE.Vector3()   // lantern base in world space (above QR)
};

// ============================================================================
//  DEVICE ORIENTATION
//  Phone yaw/pitch/roll  →  spherical camera orbit around anchor
// ============================================================================

// Raw orientation angles (degrees) updated by sensor event
const orientation = { alpha: 0, beta: 90, gamma: 0 };
let orientationReady = false;

// Full device→world quaternion (same algorithm as Three.js DeviceOrientationControls)
const deviceQuat   = new THREE.Quaternion();
const _euler       = new THREE.Euler();
const _qAdjust     = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));

function buildDeviceQuat(alpha, beta, gamma) {
  _euler.set(
    THREE.MathUtils.degToRad(beta),
    THREE.MathUtils.degToRad(alpha),
    THREE.MathUtils.degToRad(-gamma),
    "YXZ"
  );
  deviceQuat.setFromEuler(_euler);
  deviceQuat.multiply(_qAdjust);

  // Screen-orientation correction (portrait / landscape)
  const screenAngle = window.screen?.orientation?.angle ?? 0;
  if (screenAngle !== 0) {
    const _qScreen = new THREE.Quaternion();
    _qScreen.setFromAxisAngle(
      new THREE.Vector3(0, 0, 1),
      -THREE.MathUtils.degToRad(screenAngle)
    );
    deviceQuat.multiply(_qScreen);
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
      if (res === "granted") {
        window.addEventListener("deviceorientation", onDeviceOrientation, true);
      }
    } catch (e) {
      console.warn("Orientation permission denied:", e);
    }
  } else {
    window.addEventListener("deviceorientation", onDeviceOrientation, true);
  }
}

// ============================================================================
//  Camera orbit
//
//  Strategy:
//    - The lantern sits at anchor.position (world space, fixed forever)
//    - We derive a camera position by:
//        1. Taking the device quaternion as the camera's orientation
//        2. Walking "backwards" from the anchor by a fixed arm length
//           so the camera always looks AT the anchor
//
//  This means:
//    - Phone flat, looking down  → top-down view
//    - Phone at 90°, looking forward → side view
//    - Walk 360° around QR code → orbit around lantern
// ============================================================================

const CAM_ARM = 3.2;  // metres from anchor to camera (tweak for scale feel)

// "forward" in camera space = (0,0,-1), so camera position = anchor + cam_forward * ARM
const _camForward = new THREE.Vector3();
const _up         = new THREE.Vector3(0, 1, 0);

function updateCamera() {
  if (!camera) return;

  if (!orientationReady) {
    // Fallback: fixed angled view so lantern is visible immediately
    camera.position.set(
      anchor.position.x,
      anchor.position.y + 2.0,
      anchor.position.z + 2.5
    );
    camera.lookAt(anchor.position);
    return;
  }

  // Build fresh device quaternion from latest sensor data
  buildDeviceQuat(orientation.alpha, orientation.beta, orientation.gamma);

  // Extract the direction the phone camera is pointing (−Z in camera space)
  _camForward.set(0, 0, -1).applyQuaternion(deviceQuat);

  // Camera sits behind the anchor along that direction
  // i.e.  camera = anchor  −  forward * ARM
  camera.position
    .copy(anchor.position)
    .addScaledVector(_camForward, -CAM_ARM);

  // Always look at the anchor (lantern base / QR position)
  camera.lookAt(anchor.position);
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
      currentStream  = await navigator.mediaDevices.getUserMedia(c);
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
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false })
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

  // -----------------------------------------------------------------------
  //  Derive a horizontal offset from the QR centre in the video frame.
  //  This nudges the anchor left/right to match where the QR actually is.
  // -----------------------------------------------------------------------
  let offsetX = 0;
  if (qrLocation && video.videoWidth) {
    const cx = (
      qrLocation.topLeftCorner.x  + qrLocation.topRightCorner.x +
      qrLocation.bottomLeftCorner.x + qrLocation.bottomRightCorner.x
    ) / 4;
    offsetX = ((cx / video.videoWidth) - 0.5) * 1.3;
  }

  // -----------------------------------------------------------------------
  //  World position of the anchor (= QR code location on the floor)
  //  We use the device orientation at scan time to project "in front of camera"
  //  onto a ground plane.
  //
  //  Simple approach:
  //    Build the device quat right now, fire a ray forward, intersect Y=0
  //    (the floor plane).  If orientation isn't ready, fall back to a
  //    fixed 3 m in front.
  // -----------------------------------------------------------------------
  if (orientationReady) {
    buildDeviceQuat(orientation.alpha, orientation.beta, orientation.gamma);

    // Ray origin = camera (assume user holds phone at ~eye level, ~1.5 m up)
    const rayOrigin = new THREE.Vector3(offsetX, 1.5, 0);

    // Ray direction = where the phone camera points
    const rayDir = new THREE.Vector3(0, 0, -1).applyQuaternion(deviceQuat);

    // Intersect with the ground plane  (Y = 0)
    if (rayDir.y < -0.05) {                        // pointing at least slightly down
      const t = -rayOrigin.y / rayDir.y;           // parametric: y=0 solve
      anchor.position.set(
        rayOrigin.x + rayDir.x * t,
        0,                                         // floor level
        rayOrigin.z + rayDir.z * t
      );
    } else {
      // Phone held level / pointing up — default position
      anchor.position.set(offsetX, 0, -3.0);
    }
  } else {
    anchor.position.set(offsetX, 0, -3.0);
  }

  // -----------------------------------------------------------------------
  //  Build the lantern.  It floats above the anchor point.
  // -----------------------------------------------------------------------
  if (currentLantern) { scene.remove(currentLantern); disposeObject(currentLantern); }

  currentLantern = createLantern(qrText);

  // Place lantern so its base sits AT the anchor, floating 0.5 m above floor
  currentLantern.position.set(
    anchor.position.x,
    anchor.position.y + 0.5,      // float above the QR code
    anchor.position.z
  );
  currentLantern.scale.setScalar(0.52);
  scene.add(currentLantern);

  // Ground shadow sits on the floor directly under the lantern
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

  // KEY: camera orbits around the fixed anchor using phone orientation
  updateCamera();

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

  if (currentLantern) {
    scene.remove(currentLantern);
    disposeObject(currentLantern);
    currentLantern = null;
  }

  if (groundShadow) groundShadow.visible = false;
  if (qrScanner)    qrScanner.start();

  statusBar.classList.remove("hidden");
  statusBar.textContent = "Ready to scan";
}

// ============================================================================
//  Helpers
// ============================================================================

function stopCameraOnly() {
  if (qrScanner) { qrScanner.stop(); qrScanner = null; }
  if (video.srcObject)   { video.srcObject.getTracks().forEach(t => t.stop()); video.srcObject = null; }
  if (currentStream)     { currentStream.getTracks().forEach(t => t.stop()); currentStream = null; }
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
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener("pagehide",      stopApp);
window.addEventListener("beforeunload",  stopApp);