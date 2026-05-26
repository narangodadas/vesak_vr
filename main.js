import { QRScanner } from "./qr-scanner.js";
import { createLantern, updateLantern } from "./lantern.js";
import { captureScreenshot } from "./screenshot.js";

const video = document.getElementById("cameraVideo");
const arContainer = document.getElementById("arContainer");
const overlay = document.getElementById("overlay");
const startBtn = document.getElementById("startBtn");
const statusBar = document.getElementById("statusBar");
const screenshotBtn = document.getElementById("screenshotBtn");
const downloadLink = document.getElementById("downloadLink");

let scene, camera, renderer, clock, qrScanner;
let currentLantern = null;
let lastQRText = "";
let isRunning = false;

startBtn.addEventListener("click", async () => {
  startBtn.disabled = true;
  startBtn.textContent = "Starting...";
  try {
    await startCamera();
    setupThreeScene();
    setupQRScanner();
    overlay.classList.add("hidden");
    screenshotBtn.classList.remove("hidden");
    statusBar.textContent = "Camera started. Scan a QR code.";
    isRunning = true;
    animate();
  } catch (error) {
    console.error(error);
    startBtn.disabled = false;
    startBtn.textContent = "Start Camera";
    statusBar.textContent = "Camera failed.";
    alert("Camera access failed. Please allow camera permission and use HTTPS. If blocked, open browser Site Settings and allow Camera.");
  }
});

async function startCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error("Camera API is not supported on this browser.");
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false
  });
  video.srcObject = stream;
  await video.play();
}

function setupThreeScene() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 100);
  camera.position.set(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  arContainer.appendChild(renderer.domElement);

  clock = new THREE.Clock();
  scene.add(new THREE.AmbientLight(0xffffff, 0.85));
  const frontLight = new THREE.DirectionalLight(0xffffff, 0.8);
  frontLight.position.set(1, 2, 3);
  scene.add(frontLight);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.85, 64),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 })
  );
  shadow.position.set(0, -1.05, -3);
  shadow.rotation.x = -Math.PI / 2;
  scene.add(shadow);

  window.addEventListener("resize", onResize);
  setupTouchControls();
}

function setupQRScanner() {
  qrScanner = new QRScanner(video, (qrText) => {
    if (!qrText || qrText === lastQRText) return;
    lastQRText = qrText;
    statusBar.textContent = `QR detected: ${qrText}`;

    if (currentLantern) scene.remove(currentLantern);
    currentLantern = createLantern(qrText);
    scene.add(currentLantern);
  });
  qrScanner.start();
}

function animate() {
  if (!isRunning) return;
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  if (qrScanner) qrScanner.scan();
  if (currentLantern) updateLantern(currentLantern, delta);
  renderer.render(scene, camera);
}

function onResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function setupTouchControls() {
  let isDragging = false, lastX = 0, lastPinchDistance = 0;
  window.addEventListener("touchstart", (e) => {
    if (!currentLantern) return;
    if (e.touches.length === 1) { isDragging = true; lastX = e.touches[0].clientX; }
    if (e.touches.length === 2) lastPinchDistance = getPinchDistance(e);
  });
  window.addEventListener("touchmove", (e) => {
    if (!currentLantern) return;
    if (e.touches.length === 1 && isDragging) {
      const x = e.touches[0].clientX;
      currentLantern.rotation.y += (x - lastX) * 0.01;
      lastX = x;
    }
    if (e.touches.length === 2) {
      const newDistance = getPinchDistance(e);
      const scaleChange = newDistance / lastPinchDistance;
      const newScale = THREE.MathUtils.clamp(currentLantern.scale.x * scaleChange, 0.45, 1.8);
      currentLantern.scale.set(newScale, newScale, newScale);
      lastPinchDistance = newDistance;
    }
  });
  window.addEventListener("touchend", () => { isDragging = false; });
}
function getPinchDistance(e) {
  const dx = e.touches[0].clientX - e.touches[1].clientX;
  const dy = e.touches[0].clientY - e.touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

screenshotBtn.addEventListener("click", () => captureScreenshot(video, renderer.domElement, downloadLink));
