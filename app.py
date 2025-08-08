from flask import Flask, request, jsonify
from paddleocr import PaddleOCR
import numpy as np
import cv2

app = Flask(__name__)

# Initialize PaddleOCR
ocr = PaddleOCR(use_angle_cls=True, lang='en')

@app.route('/ocr', methods=['POST'])
def ocr_endpoint():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if file:
        # Read image file as a numpy array
        in_memory_file = np.frombuffer(file.read(), np.uint8)
        img = cv2.imdecode(in_memory_file, cv2.IMREAD_COLOR)
        
        # Perform OCR
        result = ocr.ocr(img, cls=True)
        
        # Extract text
        texts = []
        if result:
            for line in result:
                for word_info in line:
                    texts.append(word_info[1][0])
        
        return jsonify({'text': ' '.join(texts)})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
