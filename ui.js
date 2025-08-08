export function showNotification(message, type = 'success', duration = 3000) {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.className = 'notification';

  if (type === 'error') {
    notification.classList.add('error');
  } else if (type === 'warning') {
    notification.classList.add('warning');
  }

  notification.classList.add('show');

  setTimeout(() => {
    notification.classList.remove('show');
  }, duration);
}

export function updateZoomDisplay(canvas) {
  const canvasId = canvas.lowerCanvasEl.id.split('-')[1];
  const zoomLevel = Math.round(canvas.getZoom() * 100);
  document.getElementById(`zoom-level-${canvasId}`).textContent = `${zoomLevel}%`;
}

export function updateComparisonTexts(extractedTexts) {
  document.getElementById('comparison-text-1').textContent =
    extractedTexts.canvas1 || 'No text extracted from Canvas 1';
  document.getElementById('comparison-text-2').textContent =
    extractedTexts.canvas2 || 'No text extracted from Canvas 2';
}
