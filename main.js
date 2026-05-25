import { QRScanner } from './qr-scanner.js';
import { createVesakLantern, animateLantern } from './lantern.js';
import { captureScreenshot } from './screenshot.js';

const video = document.getElementById('cameraVideo');
const container = document.getElementById('arContainer');
const overlay = document.getElementById('overlay');
const statusText = document.getElementById('statusText');
const controls = document.getElementById('controls');
const captureBtn = document.getElementById('captureBtn');
const resetBtn = document.getElementById('resetBtn');
const downloadLink = document.getElementById('downloadLink');
const unsupported = document.getElementById('unsupported');

let scene, camera, renderer, videoTexture, lantern, scanner;
let qrDetected = false;
let targetPosition = new THREE.Vector3(0, 0, -2.2);
let targetScale = 0.75;
let userRotation = 0;
let pinchStartDistance = 0;
let startScale = 0.75;
let lastTouchX = 0;

init();

async function init() {
  if (!window.THREE || !window.jsQR) return showUnsupported('Required libraries did not load. Check internet connection or use local vendor files.');
  try {
    setupThreeScene();
    scanner = new QRScanner(video, { onDetect: handleQRDetected });
    await scanner.start();
    setupVideoBackground();
    setupInteractions();
    animate();
  } catch (error) {
    showUnsupported(`Camera/AR could not start: ${error.message}`);
  }
}

function setupThreeScene() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.01, 100);
  camera.position.set(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  container.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x402060, 1.3));
  const frontLight = new THREE.DirectionalLight(0xffffff, 0.9);
  frontLight.position.set(0, 2, 2);
  scene.add(frontLight);

  lantern = createVesakLantern();
  lantern.visible = false;
  lantern.position.copy(targetPosition);
  scene.add(lantern);

  window.addEventListener('resize', onResize);
}

function setupVideoBackground() {
  videoTexture = new THREE.VideoTexture(video);
  videoTexture.minFilter = THREE.LinearFilter;
  videoTexture.magFilter = THREE.LinearFilter;
  videoTexture.format = THREE.RGBFormat;
  scene.background = videoTexture;
}

function handleQRDetected(result) {
  if (!qrDetected) {
    qrDetected = true;
    lantern.visible = true;
    overlay.classList.add('fade');
    controls.classList.remove('hidden');
    statusText.textContent = `QR detected: ${result.data}`;
    setTimeout(() => overlay.classList.add('hidden'), 450);
  }

  // Best-effort QR anchoring: convert QR centre in camera pixels to a 3D point in front of camera.
  // This is not true SLAM/world tracking, but it keeps the lantern visually attached while QR remains visible.
  const loc = result.location;
  const cx = (loc.topLeftCorner.x + loc.topRightCorner.x + loc.bottomLeftCorner.x + loc.bottomRightCorner.x) / 4;
  const cy = (loc.topLeftCorner.y + loc.topRightCorner.y + loc.bottomLeftCorner.y + loc.bottomRightCorner.y) / 4;
  const nx = (cx / result.videoWidth) * 2 - 1;
  const ny = -((cy / result.videoHeight) * 2 - 1);

  const qrWidth = distance(loc.topLeftCorner, loc.topRightCorner);
  const approxDistance = THREE.MathUtils.clamp(280 / Math.max(qrWidth, 40), 1.2, 3.1);
  targetPosition.set(nx * approxDistance * 0.75, ny * approxDistance * 0.55, -approxDistance);
  targetScale = THREE.MathUtils.clamp(qrWidth / 260, 0.45, 1.15);
}

function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

function setupInteractions() {
  captureBtn.addEventListener('click', () => captureScreenshot(renderer, downloadLink));
  resetBtn.addEventListener('click', () => {
    targetPosition.set(0, 0, -2.2);
    targetScale = 0.75;
    userRotation = 0;
  });

  renderer.domElement.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) lastTouchX = e.touches[0].clientX;
    if (e.touches.length === 2) {
      pinchStartDistance = touchDistance(e.touches[0], e.touches[1]);
      startScale = targetScale;
    }
  }, { passive: true });

  renderer.domElement.addEventListener('touchmove', (e) => {
    if (!lantern.visible) return;
    if (e.touches.length === 1) {
      const dx = e.touches[0].clientX - lastTouchX;
      userRotation += dx * 0.01;
      lastTouchX = e.touches[0].clientX;
    }
    if (e.touches.length === 2) {
      const d = touchDistance(e.touches[0], e.touches[1]);
      targetScale = THREE.MathUtils.clamp(startScale * (d / Math.max(pinchStartDistance, 1)), 0.35, 1.8);
    }
  }, { passive: true });
}

function touchDistance(a, b) { return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); }

function animate(time = 0) {
  requestAnimationFrame(animate);
  const t = time * 0.001;
  if (lantern.visible) {
    lantern.position.lerp(targetPosition, 0.12);
    const current = lantern.scale.x;
    const next = THREE.MathUtils.lerp(current, targetScale, 0.12);
    lantern.scale.setScalar(next);
    animateLantern(lantern, t);
    lantern.rotation.y += userRotation * 0.015;
  }
  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function showUnsupported(message) {
  unsupported.innerHTML = `<div><h2>AR not available</h2><p>${message}</p><p>Please use HTTPS and allow camera permission.</p></div>`;
  unsupported.classList.remove('hidden');
}
