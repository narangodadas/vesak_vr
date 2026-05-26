export class QRScanner {
  constructor(videoElement, onDetected) {
    this.video = videoElement;
    this.onDetected = onDetected;
    this.canvas = document.createElement("canvas");
    this.context = this.canvas.getContext("2d", { willReadFrequently: true });
    this.isScanning = false;
    this.lastScanTime = 0;
    this.scanInterval = 220;
  }
  start() { this.isScanning = true; }
  stop() { this.isScanning = false; }
  scan() {
    if (!this.isScanning) return;
    if (!this.video.videoWidth || !this.video.videoHeight) return;
    const now = performance.now();
    if (now - this.lastScanTime < this.scanInterval) return;
    this.lastScanTime = now;
    this.canvas.width = this.video.videoWidth;
    this.canvas.height = this.video.videoHeight;
    this.context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
    const imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const qrCode = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
    if (qrCode && qrCode.data) this.onDetected(qrCode.data.trim());
  }
}
