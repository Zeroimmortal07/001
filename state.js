export const state = {
  activeTool: 'brush',
  brushColor: '#3b82f6',
  brushSize: 5,
  fontFamily: 'Arial',
  fontSize: 16,
  zoom: {
    canvas1: 1.0,
    canvas2: 1.0,
  },
  extractionMode: {
    canvas1: 'none', // 'none', 'selecting'
    canvas2: 'none',
  },
  extractedTexts: {
    canvas1: '',
    canvas2: '',
  },
  imageFiles: {
    canvas1: null,
    canvas2: null,
  },
  selectionRect: null,
  historyLimit: 50,
};

export const history = {
  canvas1: {
    undo: [],
    redo: [],
  },
  canvas2: {
    undo: [],
    redo: [],
  },
};
