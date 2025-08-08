import { state } from './state.js';
import {
  initCanvases,
  configureTool,
  undo,
  redo,
  resetCanvas,
  loadImageToCanvas,
  clearCanvasImage,
  exportCanvas,
  extractTextFromImage,
  enterSelectionMode,
  calculateTextSimilarity,
  zoomIn,
  zoomOut,
  resetZoom,
  getActiveCanvas,
  saveWork,
  loadWork,
} from './canvas.js';

document.addEventListener('DOMContentLoaded', () => {
  const { canvas1, canvas2 } = initCanvases();

  // Tool selection
  document.getElementById('brush-tool').addEventListener('click', () => configureTool('brush'));
  document.getElementById('rectangle-tool').addEventListener('click', () => configureTool('rectangle'));
  document.getElementById('text-tool').addEventListener('click', () => configureTool('text'));
  document.getElementById('highlighter-tool').addEventListener('click', () => configureTool('highlighter'));

  // Color picker
  document.getElementById('color-picker').addEventListener('input', (e) => {
    state.brushColor = e.target.value;
    if (['brush', 'highlighter'].includes(state.activeTool)) {
      configureTool(state.activeTool);
    }
  });

  // Brush size
  const brushSize = document.getElementById('brush-size');
  const sizeValue = document.getElementById('size-value');
  brushSize.addEventListener('input', (e) => {
    state.brushSize = parseInt(e.target.value);
    sizeValue.textContent = state.brushSize;
    if (['brush', 'highlighter'].includes(state.activeTool)) {
      configureTool(state.activeTool);
    }
  });

  // History controls
  document.getElementById('undo-btn').addEventListener('click', () => {
    undo(getActiveCanvas());
  });

  document.getElementById('redo-btn').addEventListener('click', () => {
    redo(getActiveCanvas());
  });

  document.getElementById('reset-btn').addEventListener('click', () => {
    resetCanvas(getActiveCanvas());
  });

  document.getElementById('save-btn').addEventListener('click', () => {
    saveWork();
  });

  document.getElementById('load-btn').addEventListener('click', () => {
    loadWork();
  });

  // Image upload handlers for Canvas 1
  document.getElementById('upload-btn-1').addEventListener('click', () => {
    document.getElementById('file-input-1').click();
  });

  document.getElementById('file-input-1').addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      loadImageToCanvas(e.target.files[0], canvas1);
      setTimeout(() => {
        document.getElementById('file-input-2').click();
      }, 500);
    }
  });

  // Image upload handlers for Canvas 2
  document.getElementById('upload-btn-2').addEventListener('click', () => {
    document.getElementById('file-input-2').click();
  });

  document.getElementById('file-input-2').addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      loadImageToCanvas(e.target.files[0], canvas2);
    }
  });

  // Clear image handlers
  document.getElementById('clear-image-1').addEventListener('click', () => {
    clearCanvasImage(canvas1);
  });

  document.getElementById('clear-image-2').addEventListener('click', () => {
    clearCanvasImage(canvas2);
  });

  // Export handlers for each canvas
  document.getElementById('export-btn-1').addEventListener('click', () => {
    exportCanvas(canvas1, 1);
  });

  document.getElementById('export-btn-2').addEventListener('click', () => {
    exportCanvas(canvas2, 2);
  });

  // Text extraction handlers - Full text
  document.getElementById('extract-full-text-1').addEventListener('click', () => {
    extractTextFromImage(state.imageFiles.canvas1, 'canvas1');
  });

  document.getElementById('extract-full-text-2').addEventListener('click', () => {
    extractTextFromImage(state.imageFiles.canvas2, 'canvas2');
  });

  // Text extraction handlers - Selected area
  document.getElementById('extract-selected-text-1').addEventListener('click', () => {
    enterSelectionMode('canvas1');
  });

  document.getElementById('extract-selected-text-2').addEventListener('click', () => {
    enterSelectionMode('canvas2');
  });

  // Text comparison handler
  document.getElementById('compare-texts').addEventListener('click', () => {
    calculateTextSimilarity();
  });

  // Zoom controls for canvas 1
  document.getElementById('zoom-in-1').addEventListener('click', () => zoomIn(canvas1));
  document.getElementById('zoom-out-1').addEventListener('click', () => zoomOut(canvas1));
  document.getElementById('reset-zoom-1').addEventListener('click', () => resetZoom(canvas1));

  // Zoom controls for canvas 2
  document.getElementById('zoom-in-2').addEventListener('click', () => zoomIn(canvas2));
  document.getElementById('zoom-out-2').addEventListener('click', () => zoomOut(canvas2));
  document.getElementById('reset-zoom-2').addEventListener('click', () => resetZoom(canvas2));

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Only process shortcuts if not typing in an input field
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
      return;
    }

    if (e.ctrlKey && e.key === 'z') {
      e.preventDefault();
      undo(getActiveCanvas());
    } else if (e.ctrlKey && e.key === 'y') {
      e.preventDefault();
      redo(getActiveCanvas());
    } else if (e.ctrlKey && e.key === 'e') {
      e.preventDefault();
      document.getElementById('file-input-1').click();
    } else if (e.key === 'b' || e.key === 'B') {
      configureTool('brush');
    } else if (e.key === 'r' || e.key === 'R') {
      configureTool('rectangle');
    } else if (e.key === 't' || e.key === 'T') {
      configureTool('text');
    } else if (e.key === 'h' || e.key === 'H') {
      configureTool('highlighter');
    }
  });

  // Initialize with brush tool
  configureTool('brush');
});
