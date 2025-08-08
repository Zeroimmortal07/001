import { state, history } from './state.js';
import { showNotification, updateZoomDisplay, updateComparisonTexts } from './ui.js';

let canvas1, canvas2;
let activeCanvas = null;

export function getActiveCanvas() {
  return activeCanvas;
}

export function initCanvases() {
  canvas1 = new fabric.Canvas('canvas-1', {
    backgroundColor: '#f8fafc',
    selection: true,
    preserveObjectStacking: true,
    stopContextMenu: true,
  });

  canvas2 = new fabric.Canvas('canvas-2', {
    backgroundColor: '#f8fafc',
    selection: true,
    preserveObjectStacking: true,
    stopContextMenu: true,
  });

  activeCanvas = canvas1;
  setActiveCanvas(canvas1);

  // Save initial state
  saveState(canvas1);
  saveState(canvas2);

  // Set up event listeners for history
  setupCanvasHistory(canvas1);
  setupCanvasHistory(canvas2);

  // Set up canvas hover to activate
  canvas1.on('mouse:over', () => setActiveCanvas(canvas1));
  canvas2.on('mouse:over', () => setActiveCanvas(canvas2));

  // Add right-click context menu prevention
  document.querySelectorAll('.canvas-container').forEach((container) => {
    container.addEventListener('contextmenu', (e) => e.preventDefault());
  });

  return { canvas1, canvas2 };
}

function setupCanvasHistory(canvas) {
  ['path:created', 'object:added', 'object:modified', 'object:removed'].forEach((event) => {
    canvas.on(event, () => {
      const canvasId = canvas === canvas1 ? 'canvas1' : 'canvas2';
      // Save state only if it's different from the last state
      if (
        history[canvasId].undo.length === 0 ||
        JSON.stringify(canvas.toJSON()) !== history[canvasId].undo[history[canvasId].undo.length - 1]
      ) {
        saveState(canvas);
      }
    });
  });
}

function setActiveCanvas(canvas) {
  activeCanvas = canvas;
  // Update UI to show which canvas is active
  document.querySelectorAll('.canvas-container').forEach((container) => {
    container.classList.remove('canvas-active');
  });
  if (canvas === canvas1) {
    document.getElementById('canvas-container-1').classList.add('canvas-active');
  } else {
    document.getElementById('canvas-container-2').classList.add('canvas-active');
  }
}

function saveState(canvas) {
  const canvasData = canvas.toJSON();
  const canvasId = canvas === canvas1 ? 'canvas1' : 'canvas2';
  const canvasHistory = history[canvasId];

  // Save current state to undo stack
  canvasHistory.undo.push(JSON.stringify(canvasData));

  // Limit undo stack size
  if (canvasHistory.undo.length > state.historyLimit) {
    canvasHistory.undo.shift();
  }

  // Clear redo stack when new action is performed
  canvasHistory.redo = [];
}

export function undo(canvas) {
  const canvasId = canvas === canvas1 ? 'canvas1' : 'canvas2';
  const canvasHistory = history[canvasId];
  if (canvasHistory.undo.length > 1) {
    // Save current state to redo stack
    const currentState = canvas.toJSON();
    canvasHistory.redo.push(JSON.stringify(currentState));

    // Remove current state from undo stack
    canvasHistory.undo.pop();

    // Get previous state
    const previousState = JSON.parse(canvasHistory.undo[canvasHistory.undo.length - 1]);

    // Load previous state
    canvas.loadFromJSON(previousState, () => {
      canvas.renderAll();
      showNotification('Action undone');
    });
  } else {
    showNotification('Nothing to undo', 'warning');
  }
}

export function redo(canvas) {
  const canvasId = canvas === canvas1 ? 'canvas1' : 'canvas2';
  const canvasHistory = history[canvasId];
  if (canvasHistory.redo.length > 0) {
    // Save current state to undo stack
    const currentState = canvas.toJSON();
    canvasHistory.undo.push(JSON.stringify(currentState));

    // Get next state from redo stack
    const nextState = JSON.parse(canvasHistory.redo.pop());

    // Load next state
    canvas.loadFromJSON(nextState, () => {
      canvas.renderAll();
      showNotification('Action redone');
    });
  } else {
    showNotification('Nothing to redo', 'warning');
  }
}

export function configureTool(tool) {
  // Exit extraction mode if we're switching tools
  if (state.extractionMode.canvas1 === 'selecting' || state.extractionMode.canvas2 === 'selecting') {
    exitSelectionMode();
  }

  state.activeTool = tool;
  document.querySelectorAll('.tool-btn').forEach((btn) => {
    btn.classList.remove('active');
    btn.setAttribute('aria-pressed', 'false');
  });
  document.getElementById(`${tool}-tool`).classList.add('active');
  document.getElementById(`${tool}-tool`).setAttribute('aria-pressed', 'true');

  [canvas1, canvas2].forEach((canvas) => {
    canvas.isDrawingMode = false;
    canvas.selection = true;
    canvas.forEachObject((obj) => {
      obj.set({
        evented: true,
        selectable: true,
      });
    });

    // Clear any existing event listeners
    canvas.off('mouse:down');
    canvas.off('mouse:move');
    canvas.off('mouse:up');

    switch (tool) {
      case 'brush':
        canvas.isDrawingMode = true;
        canvas.selection = false;
        const brush = new fabric.PencilBrush(canvas);
        brush.color = state.brushColor;
        brush.width = state.brushSize;
        canvas.freeDrawingBrush = brush;
        break;
      case 'rectangle':
        setupRectangleTool(canvas);
        break;
      case 'text':
        setupTextTool(canvas);
        break;
      case 'highlighter':
        canvas.isDrawingMode = true;
        canvas.selection = false;
        const highlighter = new fabric.PencilBrush(canvas);
        // Convert hex color to rgba with transparency for highlighter effect
        const r = parseInt(state.brushColor.slice(1, 3), 16);
        const g = parseInt(state.brushColor.slice(3, 5), 16);
        const b = parseInt(state.brushColor.slice(5, 7), 16);
        highlighter.color = `rgba(${r}, ${g}, ${b}, 0.3)`;
        highlighter.width = state.brushSize * 2; // Make highlighter thicker
        canvas.freeDrawingBrush = highlighter;
        break;
    }
  });
}

function setupRectangleTool(canvas) {
  let isDrawing = false;
  let startX, startY;
  let rect;

  canvas.on('mouse:down', (o) => {
    if (o.e.altKey) return; // Prevent rectangle drawing if alt key is pressed
    isDrawing = true;
    const pointer = canvas.getPointer(o.e);
    startX = pointer.x;
    startY = pointer.y;

    rect = new fabric.Rect({
      left: startX,
      top: startY,
      width: 0,
      height: 0,
      fill: 'rgba(59, 130, 246, 0.1)',
      stroke: state.brushColor,
      strokeWidth: 2,
      selectable: true,
      transparentCorners: false,
    });

    canvas.add(rect);
  });

  canvas.on('mouse:move', (o) => {
    if (!isDrawing) return;
    const pointer = canvas.getPointer(o.e);
    const width = pointer.x - startX;
    const height = pointer.y - startY;

    if (rect) {
      rect.set({
        width: width,
        height: height,
      });
      canvas.renderAll();
    }
  });

  canvas.on('mouse:up', () => {
    isDrawing = false;
    if (rect) {
      // Ensure minimum size
      if (Math.abs(rect.width) < 5 || Math.abs(rect.height) < 5) {
        canvas.remove(rect);
      } else {
        // Normalize negative dimensions
        if (rect.width < 0) {
          rect.set({
            left: rect.left + rect.width,
            width: -rect.width,
          });
        }
        if (rect.height < 0) {
          rect.set({
            top: rect.top + rect.height,
            height: -rect.height,
          });
        }
        canvas.renderAll();
        saveState(canvas);
      }
    }
  });
}

function setupTextTool(canvas) {
  canvas.on('mouse:down', (o) => {
    if (o.e.altKey) return; // Prevent text tool if alt key is pressed
    const pointer = canvas.getPointer(o.e);
    const textbox = new fabric.Textbox('Annotation text', {
      left: pointer.x,
      top: pointer.y,
      width: 200,
      fontSize: state.fontSize,
      fill: state.brushColor,
      editable: true,
      hasControls: true,
      transparentCorners: false,
      cornerColor: '#3b82f6',
      cornerSize: 8,
      padding: 5,
    });

    canvas.add(textbox);
    textbox.enterEditing();
    textbox.selectAll();
    canvas.setActiveObject(textbox);
    canvas.renderAll();
    saveState(canvas);
  });
}

export function loadImageToCanvas(file, canvas) {
  if (!file) return;

  const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!validImageTypes.includes(file.type)) {
    showNotification('Please upload a valid image file (JPEG, PNG, GIF, WebP)', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = function (event) {
    // Create a new Image object
    const img = new Image();
    img.onload = function () {
      // Calculate scaling to fit canvas while maintaining aspect ratio
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const imgWidth = img.width;
      const imgHeight = img.height;

      const scale = Math.min(canvasWidth / imgWidth, canvasHeight / imgHeight);

      // Create a fabric.Image from the loaded image
      const fabricImage = new fabric.Image(img, {
        left: (canvasWidth - imgWidth * scale) / 2,
        top: (canvasHeight - imgHeight * scale) / 2,
        scaleX: scale,
        scaleY: scale,
        selectable: false,
        hasControls: false,
        hasBorders: false,
      });

      // Set as background image
      canvas.setBackgroundImage(fabricImage, () => {
        canvas.renderAll();
        saveState(canvas);
        showNotification('Image loaded successfully');
      });

      // Reset zoom when new image is loaded
      const canvasId = canvas === canvas1 ? 'canvas1' : 'canvas2';
      state.zoom[canvasId] = 1.0;
      updateZoomDisplay(canvas);

      // Store the image file for text extraction
      state.imageFiles[canvasId] = file;
    };

    img.onerror = function () {
      showNotification('Error loading image. The file may be corrupted.', 'error');
    };

    img.src = event.target.result;
  };

  reader.onerror = function () {
    showNotification('Error reading file', 'error');
  };

  reader.readAsDataURL(file);
}

export function clearCanvasImage(canvas) {
  canvas.setBackgroundImage(null, () => {
    canvas.renderAll();
    saveState(canvas);
  });

  // Reset zoom when image is cleared
  const canvasId = canvas === canvas1 ? 'canvas1' : 'canvas2';
  state.zoom[canvasId] = 1.0;
  updateZoomDisplay(canvas);

  // Clear image file and extracted text
  state.imageFiles[canvasId] = null;
  state.extractedTexts[canvasId] = '';

  // Update UI
  const canvasNumber = canvasId === 'canvas1' ? '1' : '2';
  const extractedTextElement = document.getElementById(`extracted-text-${canvasNumber}`);
  const errorElement = document.getElementById(`error-${canvasNumber}`);

  extractedTextElement.textContent = 'No text extracted yet. Upload an image and click "Extract Text".';
  errorElement.style.display = 'none';
  errorElement.textContent = '';

  // Update comparison if needed
  updateComparisonTexts(state.extractedTexts);

  showNotification('Canvas cleared');
}

export function exportCanvas(canvas, canvasNumber) {
  try {
    // Use Fabric's built-in method for better reliability
    const dataURL = canvas.toDataURL({
      format: 'png',
      quality: 1.0,
    });

    // Create download link
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = `canvas-${canvasNumber}-annotated.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showNotification(`Canvas ${canvasNumber} exported successfully`);
  } catch (error) {
    console.error('Error exporting canvas:', error);
    showNotification('Error exporting canvas. Please try again.', 'error');
  }
}

export function resetCanvas(canvas) {
  const canvasId = canvas === canvas1 ? 'canvas1' : 'canvas2';

  // Clear the canvas
  canvas.clear();
  canvas.backgroundColor = '#f8fafc';
  canvas.renderAll();

  // Reset history
  history[canvasId].undo = [];
  history[canvasId].redo = [];
  saveState(canvas);

  // Reset zoom
  state.zoom[canvasId] = 1.0;
  updateZoomDisplay(canvas);

  // Clear image file and extracted text
  state.imageFiles[canvasId] = null;
  state.extractedTexts[canvasId] = '';

  // Update UI
  const extractedTextElement = document.getElementById(`extracted-text-${canvasId === 'canvas1' ? '1' : '2'}`);
  const errorElement = document.getElementById(`error-${canvasId === 'canvas1' ? '1' : '2'}`);

  extractedTextElement.textContent = 'No text extracted yet. Upload an image and click "Extract Text".';
  errorElement.style.display = 'none';
  errorElement.textContent = '';

  // Update comparison if needed
  updateComparisonTexts(state.extractedTexts);

  showNotification('Canvas reset successfully');
}

// Zoom functions
export function zoomIn(canvas) {
  const canvasId = canvas === canvas1 ? 'canvas1' : 'canvas2';
  if (state.zoom[canvasId] < 3.0) {
    // Limit max zoom to 300%
    state.zoom[canvasId] *= 1.2;
    canvas.setZoom(state.zoom[canvasId]);
    canvas.renderAll();
    updateZoomDisplay(canvas);
  } else {
    showNotification('Maximum zoom level reached', 'warning');
  }
}

export function zoomOut(canvas) {
  const canvasId = canvas === canvas1 ? 'canvas1' : 'canvas2';
  if (state.zoom[canvasId] > 0.2) {
    // Limit min zoom to 20%
    state.zoom[canvasId] /= 1.2;
    canvas.setZoom(state.zoom[canvasId]);
    canvas.renderAll();
    updateZoomDisplay(canvas);
  } else {
    showNotification('Minimum zoom level reached', 'warning');
  }
}

export function resetZoom(canvas) {
  const canvasId = canvas === canvas1 ? 'canvas1' : 'canvas2';
  state.zoom[canvasId] = 1.0;
  canvas.setZoom(1.0);
  canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  canvas.renderAll();
  updateZoomDisplay(canvas);
}

// Text extraction function using Tesseract.js
export async function extractTextFromImage(file, canvasId, selectionRect = null) {
  const ocrEngine = document.querySelector(`input[name="ocr-engine-${canvasId === 'canvas1' ? '1' : '2'}"]:checked`).value;

  if (ocrEngine === 'paddle') {
    return extractTextWithPaddle(file, canvasId, selectionRect);
  }

  const loadingElement = document.getElementById(`loading-${canvasId === 'canvas1' ? '1' : '2'}`);
  const extractedTextElement = document.getElementById(`extracted-text-${canvasId === 'canvas1' ? '1' : '2'}`);
  const errorElement = document.getElementById(`error-${canvasId === 'canvas1' ? '1' : '2'}`);

  // Clear previous error messages
  errorElement.style.display = 'none';
  errorElement.textContent = '';

  if (!file) {
    extractedTextElement.textContent = 'No image uploaded. Please upload an image first.';
    return;
  }

  // Show loading indicator
  loadingElement.style.display = 'block';
  extractedTextElement.textContent = 'Processing...';

  try {
    // Convert file to image for processing
    const img = new Image();
    const reader = new FileReader();

    // Use a promise to handle the asynchronous loading
    await new Promise((resolve, reject) => {
      reader.onload = function (e) {
        img.src = e.target.result;
        img.onload = resolve;
        img.onerror = reject;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    // Create a canvas to draw the image on
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');

    // Set canvas dimensions to match the image
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;

    // Draw the image on the canvas
    ctx.drawImage(img, 0, 0);

    // If we have a selection rectangle, crop to that area
    if (selectionRect) {
      // Convert from canvas coordinates to image coordinates
      const canvas = canvasId === 'canvas1' ? canvas1 : canvas2;
      const backgroundImage = canvas.backgroundImage;

      if (backgroundImage) {
        // Calculate scaling factors
        const scaleX = img.width / canvas.width;
        const scaleY = img.height / canvas.height;

        // Convert selection rectangle to image coordinates
        const imgX = (selectionRect.left - backgroundImage.left) * scaleX;
        const imgY = (selectionRect.top - backgroundImage.top) * scaleY;
        const imgWidth = selectionRect.width * scaleX;
        const imgHeight = selectionRect.height * scaleY;

        // Ensure coordinates are within bounds
        const safeX = Math.max(0, Math.round(imgX));
        const safeY = Math.max(0, Math.round(imgY));
        const safeWidth = Math.min(img.width - safeX, Math.round(imgWidth));
        const safeHeight = Math.min(img.height - safeY, Math.round(imgHeight));

        // Create a new canvas for the cropped area
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = safeWidth;
        cropCanvas.height = safeHeight;
        const cropCtx = cropCanvas.getContext('2d');

        // Draw only the selected area
        cropCtx.drawImage(
          tempCanvas,
          safeX,
          safeY,
          safeWidth,
          safeHeight,
          0,
          0,
          safeWidth,
          safeHeight
        );

        // Use the cropped canvas for OCR
        const {
          data: { text },
        } = await Tesseract.recognize(cropCanvas, 'eng', { logger: (m) => console.log(m) });

        // Store the extracted text
        state.extractedTexts[canvasId] = text.trim();

        // Update the UI
        if (text.trim()) {
          extractedTextElement.textContent = text.trim();
          showNotification('Text extracted successfully from selected area');
        } else {
          extractedTextElement.textContent = 'No text found in the selected area.';
          showNotification('No text found in the selected area', 'warning');
        }
      } else {
        extractedTextElement.textContent = 'No background image to extract from.';
        showNotification('No background image to extract from', 'error');
      }
    } else {
      // Full image extraction
      const {
        data: { text },
      } = await Tesseract.recognize(tempCanvas, 'eng', { logger: (m) => console.log(m) });

      // Store the extracted text
      state.extractedTexts[canvasId] = text.trim();

      // Update the UI
      if (text.trim()) {
        extractedTextElement.textContent = text.trim();
        showNotification('Full text extracted successfully');
      } else {
        extractedTextElement.textContent = 'No text found in the image.';
        showNotification('No text found in the image', 'warning');
      }
    }

    // Update the comparison panel
    updateComparisonTexts(state.extractedTexts);
  } catch (error) {
    console.error('Error extracting text:', error);
    extractedTextElement.textContent = 'Error extracting text. Please try again.';
    errorElement.textContent = `Error: ${error.message || 'Unknown error occurred'}`;
    errorElement.style.display = 'block';
    showNotification('Text extraction failed. Please try again.', 'error');
  } finally {
    // Hide loading indicator
    loadingElement.style.display = 'none';

    // Exit selection mode if we were in it
    if (selectionRect) {
      exitSelectionMode();
    }
  }
}

// Enter selection mode for text extraction
export function enterSelectionMode(canvasId) {
  state.extractionMode[canvasId] = 'selecting';

  // Update UI to show selection mode
  const container = document.getElementById(`canvas-container-${canvasId === 'canvas1' ? '1' : '2'}`);
  container.classList.add('canvas-selection-mode');

  showNotification('Click and drag to select an area for text extraction', 'warning');

  const canvas = canvasId === 'canvas1' ? canvas1 : canvas2;

  // Disable other tools
  canvas.isDrawingMode = false;
  canvas.selection = false;

  let isSelecting = false;
  let selectionStart = { x: 0, y: 0 };
  let selectionRect = null;

  canvas.on('mouse:down', (e) => {
    if (e.e.altKey) return; // Prevent selection if alt key is pressed

    isSelecting = true;
    const pointer = canvas.getPointer(e.e);
    selectionStart = { x: pointer.x, y: pointer.y };

    // Create a temporary rectangle for selection
    selectionRect = new fabric.Rect({
      left: pointer.x,
      top: pointer.y,
      width: 0,
      height: 0,
      fill: 'rgba(16, 185, 129, 0.1)',
      stroke: '#10b981',
      strokeWidth: 2,
      strokeDashArray: [5, 5],
      selectable: false,
      evented: false,
    });

    canvas.add(selectionRect);
  });

  canvas.on('mouse:move', (e) => {
    if (!isSelecting || !selectionRect) return;

    const pointer = canvas.getPointer(e.e);
    const width = pointer.x - selectionStart.x;
    const height = pointer.y - selectionStart.y;

    selectionRect.set({
      width: width,
      height: height,
    });

    canvas.renderAll();
  });

  canvas.on('mouse:up', (e) => {
    if (!isSelecting) return;

    isSelecting = false;

    if (selectionRect) {
      // Ensure minimum size
      if (Math.abs(selectionRect.width) < 10 || Math.abs(selectionRect.height) < 10) {
        canvas.remove(selectionRect);
        exitSelectionMode();
        return;
      }

      // Normalize negative dimensions
      if (selectionRect.width < 0) {
        selectionRect.set({
          left: selectionRect.left + selectionRect.width,
          width: -selectionRect.width,
        });
      }
      if (selectionRect.height < 0) {
        selectionRect.set({
          top: selectionRect.top + selectionRect.height,
          height: -selectionRect.height,
        });
      }

      canvas.renderAll();

      // Extract text from the selected area
      extractTextFromImage(state.imageFiles[canvasId], canvasId, selectionRect);
    }
  });
}

async function extractTextWithPaddle(file, canvasId, selectionRect = null) {
  const loadingElement = document.getElementById(`loading-${canvasId === 'canvas1' ? '1' : '2'}`);
  const extractedTextElement = document.getElementById(`extracted-text-${canvasId === 'canvas1' ? '1' : '2'}`);
  const errorElement = document.getElementById(`error-${canvasId === 'canvas1' ? '1' : '2'}`);

  // Clear previous error messages
  errorElement.style.display = 'none';
  errorElement.textContent = '';

  if (!file) {
    extractedTextElement.textContent = 'No image uploaded. Please upload an image first.';
    return;
  }

  // Show loading indicator
  loadingElement.style.display = 'block';
  extractedTextElement.textContent = 'Processing with PaddleOCR...';

  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('http://localhost:5000/ocr', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const text = data.text || '';

    state.extractedTexts[canvasId] = text.trim();

    if (text.trim()) {
      extractedTextElement.textContent = text.trim();
      showNotification('Text extracted successfully with PaddleOCR');
    } else {
      extractedTextElement.textContent = 'No text found with PaddleOCR.';
      showNotification('No text found with PaddleOCR', 'warning');
    }

    updateComparisonTexts(state.extractedTexts);
  } catch (error) {
    console.error('Error extracting text with PaddleOCR:', error);
    extractedTextElement.textContent = 'Error extracting text. Please try again.';
    errorElement.textContent = `Error: ${error.message || 'Unknown error occurred'}`;
    errorElement.style.display = 'block';
    showNotification('Text extraction with PaddleOCR failed. Please try again.', 'error');
  } finally {
    loadingElement.style.display = 'none';
  }
}

// Exit selection mode
function exitSelectionMode() {
  // Reset extraction mode
  state.extractionMode.canvas1 = 'none';
  state.extractionMode.canvas2 = 'none';

  // Update UI
  document.getElementById('canvas-container-1').classList.remove('canvas-selection-mode');
  document.getElementById('canvas-container-2').classList.remove('canvas-selection-mode');

  // Re-enable active tool
  configureTool(state.activeTool);
}

// Calculate text similarity using more robust algorithm
export function calculateTextSimilarity() {
  const text1 = state.extractedTexts.canvas1;
  const text2 = state.extractedTexts.canvas2;

  if (!text1 || !text2) {
    document.getElementById('similarity-percentage').textContent = '0%';
    document.getElementById('similarity-fill').style.width = '0%';
    document.getElementById('similarity-label').textContent = 'Extract text from both canvases first';
    return;
  }

  // Clean texts for comparison
  const cleanText = (text) => {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  };

  const cleanText1 = cleanText(text1);
  const cleanText2 = cleanText(text2);

  if (!cleanText1 || !cleanText2) {
    document.getElementById('similarity-percentage').textContent = '0%';
    document.getElementById('similarity-fill').style.width = '0%';
    document.getElementById('similarity-label').textContent = 'No meaningful text to compare';
    return;
  }

  // Use Levenshtein distance for more accurate comparison
  const levenshteinDistance = (a, b) => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];

    // Initialize matrix
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          );
        }
      }
    }

    return matrix[b.length][a.length];
  };

  // Calculate similarity percentage
  const distance = levenshteinDistance(cleanText1, cleanText2);
  const maxLength = Math.max(cleanText1.length, cleanText2.length);
  const similarity = 1 - distance / maxLength;
  const percentage = Math.round(similarity * 100);

  // Update UI
  document.getElementById('similarity-percentage').textContent = `${percentage}%`;
  document.getElementById('similarity-fill').style.width = `${percentage}%`;

  // Update similarity label with color coding
  let label = '';
  let labelClass = '';

  if (percentage >= 80) {
    label = 'Very High Similarity';
    labelClass = 'text-green-700';
  } else if (percentage >= 60) {
    label = 'High Similarity';
    labelClass = 'text-green-600';
  } else if (percentage >= 40) {
    label = 'Medium Similarity';
    labelClass = 'text-yellow-600';
  } else if (percentage >= 20) {
    label = 'Low Similarity';
    labelClass = 'text-orange-600';
  } else {
    label = 'Very Low Similarity';
    labelClass = 'text-red-600';
  }

  document.getElementById('similarity-label').textContent = label;
  document.getElementById('similarity-label').className = `mt-2 text-sm ${labelClass}`;

  showNotification(`Text similarity calculated: ${percentage}%`);
}

export function saveWork() {
  try {
    const canvas1Data = canvas1.toJSON();
    const canvas2Data = canvas2.toJSON();

    const dataToSave = {
      canvas1: canvas1Data,
      canvas2: canvas2Data,
      extractedTexts: state.extractedTexts,
    };

    localStorage.setItem('annotationAppState', JSON.stringify(dataToSave));
    showNotification('Work saved successfully!', 'success');
  } catch (error) {
    console.error('Error saving work:', error);
    showNotification('Failed to save work.', 'error');
  }
}

export function loadWork() {
  try {
    const savedData = localStorage.getItem('annotationAppState');
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      canvas1.loadFromJSON(parsedData.canvas1, () => {
        canvas1.renderAll();
      });
      canvas2.loadFromJSON(parsedData.canvas2, () => {
        canvas2.renderAll();
      });
      state.extractedTexts = parsedData.extractedTexts;
      updateComparisonTexts(state.extractedTexts);
      showNotification('Work loaded successfully!', 'success');
    } else {
      showNotification('No saved work found.', 'warning');
    }
  } catch (error) {
    console.error('Error loading work:', error);
    showNotification('Failed to load work.', 'error');
  }
}
