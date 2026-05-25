export function captureScreenshot(renderer, downloadLink) {
  const canvas = renderer.domElement;
  const dataUrl = canvas.toDataURL('image/png');
  downloadLink.href = dataUrl;
  downloadLink.classList.remove('hidden');
  downloadLink.textContent = 'Download screenshot';

  // Auto-trigger download on most browsers. iOS may show the link instead.
  try { downloadLink.click(); } catch (_) {}
  return dataUrl;
}
