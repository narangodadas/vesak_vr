export class QRScanner {
  constructor(video, { onDetect, onError } = {}) {
    this.video = video;
    this.onDetect = onDetect;
    this.onError = onError;
    this.stream = null;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.running = false;
    this.lastData = null;
  }

  async start() {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera API is not supported on this browser.');
    this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    this.video.srcObject = this.stream;
    await this.video.play();
    this.running = true;
    this.scanLoop();
    return this.stream;
  }

  stop() {
    this.running = false;
    this.stream?.getTracks().forEach(track => track.stop());
  }

  scanLoop = () => {
    if (!this.running) return;
    const w = this.video.videoWidth;
    const h = this.video.videoHeight;
    if (w && h && window.jsQR) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.ctx.drawImage(this.video, 0, 0, w, h);
      const imageData = this.ctx.getImageData(0, 0, w, h);
      const code = window.jsQR(imageData.data, w, h, { inversionAttempts: 'dontInvert' });
      if (code?.data) {
        this.lastData = code.data;
        this.onDetect?.({ data: code.data, location: code.location, videoWidth: w, videoHeight: h });
      }
    }
    requestAnimationFrame(this.scanLoop);
  };
}
