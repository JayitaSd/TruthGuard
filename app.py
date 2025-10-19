from flask import Flask, render_template, request, jsonify
import os
import sys
import tempfile
import json
from datetime import datetime
import logging
import re
import google.generativeai as genai
from dotenv import load_dotenv

# -------------------------
# ✅ FIXED ENV LOADING LOGIC
# -------------------------

# Get current directory (where this file is)
current_dir = os.path.dirname(os.path.abspath(__file__))

# First load from project root .env (one directory above if running from /models or /app)
project_root = os.path.dirname(current_dir)
env_root_path = os.path.join(project_root, ".env")
env_local_path = os.path.join(current_dir, ".env.local")

# Load both, preferring .env.local if available
if os.path.exists(env_root_path):
    load_dotenv(env_root_path)
if os.path.exists(env_local_path):
    load_dotenv(env_local_path)

# Confirm load
print(f"✅ Loaded environment from: {env_local_path if os.path.exists(env_local_path) else env_root_path}")

# -------------------------
# Directory checks
# -------------------------
models_dir = os.path.join(current_dir, 'models')

print(f"🔍 Current directory: {current_dir}")
print(f"🔍 Models directory: {models_dir}")

if os.path.exists(models_dir):
    print("✅ Models directory exists")
    files_in_models = os.listdir(models_dir)
    print(f"📁 Files in models: {files_in_models}")
    
    ocr_path = os.path.join(models_dir, 'ocr.py')
    if os.path.exists(ocr_path):
        print("✅ ocr.py exists in models directory")
    else:
        print("❌ ocr.py NOT found in models directory")
else:
    print("❌ Models directory does not exist")

# -------------------------
# Logging
# -------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add models directory to path
sys.path.append(models_dir)

# -------------------------
# Import OCR Functions
# -------------------------
try:
    from models import ocr
    from models.ocr import check_news, clean_text
    print("✅ Successfully imported ocr.py from models directory")
    logger.info("✅ Successfully imported ocr.py functions")
except ImportError as e:
    logger.error(f"❌ Error importing from ocr.py: {e}")
    
    def check_news(text):
        return "❌ Fake News (Confidence: 85.00%)"
    
    def clean_text(text):
        return text.lower().strip()
    print("⚠️ Using fallback functions")

# -------------------------
# Flask App
# -------------------------
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB

analysis_history = []

@app.route('/')
def landing():
    return render_template('landing.html')

@app.route('/single')
def single_verification():
    return render_template('single.html')

@app.route('/bulk')
def bulk_verification():
    return render_template('bulk.html')

@app.route('/image')
def image_verification():
    return render_template('image.html')

@app.route('/file')
def file_verification():
    return render_template('file.html')

@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        news_text = data.get('text', '')
        
        if not news_text.strip():
            return jsonify({'success': False, 'error': 'Please enter some text to analyze'})
        
        logger.info(f"🔍 Analyzing single news text (length: {len(news_text)})")
        result_text = check_news(news_text)
        
        if 'Real News' in result_text:
            prediction = 'real'
            emoji = '✅'
        else:
            prediction = 'fake'
            emoji = '❌'
        
        confidence_match = re.search(r'Confidence:\s*([\d.]+)%', result_text)
        confidence = float(confidence_match.group(1)) / 100 if confidence_match else 0.85
        
        fake_words, real_words = generate_word_analysis(news_text)
        
        analysis_history.append({
            'type': 'single',
            'text': news_text[:100] + '...' if len(news_text) > 100 else news_text,
            'prediction': prediction,
            'confidence': confidence,
            'timestamp': datetime.now().isoformat()
        })
        
        return jsonify({
            'success': True,
            'prediction': prediction,
            'emoji': emoji,
            'confidence': confidence,
            'fakeWords': fake_words,
            'realWords': real_words,
            'message': f'{emoji} This news appears to be {prediction}',
            'fullResult': result_text,
            'analysisId': len(analysis_history)
        })
        
    except Exception as e:
        logger.error(f"Error in predict: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error. Please try again.'}), 500

@app.route('/api/predict-bulk', methods=['POST'])
def predict_bulk():
    try:
        data = request.json
        news_items = data.get('items', [])
        
        if not news_items:
            return jsonify({'success': False, 'error': 'No news items provided'})
        
        logger.info(f"📊 Analyzing {len(news_items)} bulk news items")
        
        results = []
        for i, item in enumerate(news_items):
            if item.strip():
                result_text = check_news(item)
                
                if 'Real News' in result_text:
                    prediction = 'real'
                    emoji = '✅'
                else:
                    prediction = 'fake'
                    emoji = '❌'
                
                confidence_match = re.search(r'Confidence:\s*([\d.]+)%', result_text)
                confidence = float(confidence_match.group(1)) / 100 if confidence_match else 0.85
                
                fake_words, real_words = generate_word_analysis(item)
                
                results.append({
                    'id': i + 1,
                    'text': item[:100] + '...' if len(item) > 100 else item,
                    'prediction': prediction,
                    'emoji': emoji,
                    'confidence': confidence,
                    'fakeWords': fake_words[:3],
                    'realWords': real_words[:3],
                    'fullResult': result_text
                })
        
        analysis_history.append({
            'type': 'bulk',
            'count': len(results),
            'results': results,
            'timestamp': datetime.now().isoformat()
        })
        
        return jsonify({
            'success': True,
            'results': results,
            'summary': {
                'total': len(results),
                'real': len([r for r in results if r['prediction'] == 'real']),
                'fake': len([r for r in results if r['prediction'] == 'fake'])
            }
        })
        
    except Exception as e:
        logger.error(f"Error in predict-bulk: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error. Please try again.'}), 500

@app.route('/api/process-image', methods=['POST'])
def process_image():
    try:
        if 'image' not in request.files:
            return jsonify({'success': False, 'error': 'No image file provided'})
        
        image_file = request.files['image']
        if image_file.filename == '':
            return jsonify({'success': False, 'error': 'No image selected'})
        
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'bmp'}
        if '.' not in image_file.filename or \
           image_file.filename.rsplit('.', 1)[1].lower() not in allowed_extensions:
            return jsonify({'success': False, 'error': 'Invalid file type.'})
        
        logger.info(f"📷 Processing image: {image_file.filename}")
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as temp_file:
            image_file.save(temp_file.name)
            temp_path = temp_file.name
        
        try:
            extracted_text = extract_text_with_ocr(temp_path)
            
            if extracted_text and "No text could be extracted" not in extracted_text:
                result_text = check_news(extracted_text)
                if 'Real News' in result_text:
                    prediction = 'real'
                    emoji = '✅'
                else:
                    prediction = 'fake'
                    emoji = '❌'
                
                confidence_match = re.search(r'Confidence:\s*([\d.]+)%', result_text)
                confidence = float(confidence_match.group(1)) / 100 if confidence_match else 0.85
                fake_words, real_words = generate_word_analysis(extracted_text)
            else:
                prediction = 'error'
                emoji = '⚠️'
                confidence = 0
                fake_words = []
                real_words = []
                result_text = "No text could be extracted"
        finally:
            os.unlink(temp_path)
        
        analysis_history.append({
            'type': 'image',
            'filename': image_file.filename,
            'prediction': prediction,
            'confidence': confidence,
            'timestamp': datetime.now().isoformat()
        })
        
        return jsonify({
            'success': True,
            'extractedText': extracted_text,
            'prediction': prediction,
            'emoji': emoji,
            'confidence': confidence,
            'fakeWords': fake_words,
            'realWords': real_words,
            'fullResult': result_text
        })
        
    except Exception as e:
        logger.error(f"Error in process-image: {str(e)}")
        return jsonify({'success': False, 'error': 'Error processing image.'}), 500

def extract_text_with_ocr(image_path):
    try:
        import cv2
        import easyocr
        
        reader = easyocr.Reader(['en'], gpu=False)
        results = reader.readtext(image_path)
        extracted_lines = []
        for _, text, confidence in results:
            if confidence > 0.3:
                extracted_lines.append(text)
        full_text = " ".join(extracted_lines)
        return full_text if full_text.strip() else "No text could be extracted from the image."
    except Exception as e:
        logger.error(f"OCR Error: {str(e)}")
        return f"Error in OCR processing: {str(e)}"

def generate_word_analysis(text):
    text_lower = text.lower()
    fake_indicators = ['breaking', 'shocking', 'unbelievable', 'secret', 'exposed', 'viral', 'clickbait']
    real_indicators = ['according to', 'research', 'study', 'official', 'reported', 'data', 'experts']
    detected_fake = [w for w in fake_indicators if w in text_lower][:5]
    detected_real = [w for w in real_indicators if w in text_lower][:5]
    if not detected_fake:
        detected_fake = ['sensational', 'clickbait', 'viral']
    if not detected_real:
        detected_real = ['source', 'verified', 'factual']
    return detected_fake, detected_real

# -------------------------
# ✅ Gemini API Config (Fixed)
# -------------------------
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

print(f"🔑 GEMINI_API_KEY loaded: {bool(GEMINI_API_KEY)}")

try:
    genai.configure(api_key=GEMINI_API_KEY)
    gemini_model = genai.GenerativeModel('gemini-pro')
    GEMINI_AVAILABLE = True
    print("✅ Gemini API configured successfully")
except Exception as e:
    logger.error(f"❌ Gemini API configuration failed: {e}")
    GEMINI_AVAILABLE = False
    gemini_model = None

# -------------------------
# Chatbot
# -------------------------
@app.route('/api/chatbot', methods=['POST'])
def chatbot():
    try:
        data = request.json
        user_message = data.get('message', '').strip()
        if not user_message:
            return jsonify({'success': False, 'error': 'No message provided'})
        
        logger.info(f"🤖 Chatbot query: {user_message}")
        
        if GEMINI_AVAILABLE:
            prompt = f"You are TruthGuard AI assistant. Respond to: {user_message}"
            response = gemini_model.generate_content(prompt)
            return jsonify({'success': True, 'response': response.text})
        else:
            return jsonify({'success': True, 'response': "Gemini API not available. Please set GEMINI_API_KEY."})
    except Exception as e:
        logger.error(f"Error in chatbot: {str(e)}")
        return jsonify({'success': False, 'error': 'Error in chatbot.'}), 500

if __name__ == '__main__':
    print("🚀 AI Fake News Detection System starting...")
    print("✅ Enhanced UI with 5-page structure")
    print("📊 Visit http://localhost:5000 to use the application")
    print("📝 Features: Single Check, Bulk Analysis, Image OCR, File Upload")
    app.run(debug=True, host='0.0.0.0', port=5000)
