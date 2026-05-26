export function captureScreenshot(video, webglCanvas, downloadLink) {
  const width = window.innerWidth;
  const height = window.innerHeight;

  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = width;
  outputCanvas.height = height;

  const ctx = outputCanvas.getContext("2d");

  drawCover(ctx, video, width, height);
  ctx.drawImage(webglCanvas, 0, 0, width, height);

  ctx.fillStyle = "rgba(0,0,0,0.52)";
  ctx.fillRect(12, 12, 226, 40);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 16px Arial";
  ctx.fillText("Vesak AR Lantern", 24, 38);

  const dataUrl = outputCanvas.toDataURL("image/png");

  downloadLink.href = dataUrl;
  downloadLink.classList.remove("hidden");

  const tempLink = document.createElement("a");
  tempLink.href = dataUrl;
  tempLink.download = `vesak-ar-lantern-${Date.now()}.png`;

  document.body.appendChild(tempLink);
  tempLink.click();
  document.body.removeChild(tempLink);
}

function drawCover(ctx, video, canvasWidth, canvasHeight) {
  const videoWidth = video.videoWidth || canvasWidth;
  const videoHeight = video.videoHeight || canvasHeight;

  const videoRatio = videoWidth / videoHeight;
  const canvasRatio = canvasWidth / canvasHeight;

  let drawWidth;
  let drawHeight;
  let offsetX;
  let offsetY;

  if (videoRatio > canvasRatio) {
    drawHeight = canvasHeight;
    drawWidth = videoWidth * (canvasHeight / videoHeight);
    offsetX = (canvasWidth - drawWidth) / 2;
    offsetY = 0;
  } else {
    drawWidth = canvasWidth;
    drawHeight = videoHeight * (canvasWidth / videoWidth);
    offsetX = 0;
    offsetY = (canvasHeight - drawHeight) / 2;
  }

  ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);
}
