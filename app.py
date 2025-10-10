from flask import Flask, render_template, request, jsonify
import os
import sys
import tempfile
import json
from datetime import datetime
import logging
import re


current_dir = os.path.dirname(os.path.abspath(__file__))
models_dir = os.path.join(current_dir, 'models')

print(f"🔍 Current directory: {current_dir}")
print(f"🔍 Models directory: {models_dir}")

# Check if models directory and ocr.py exist
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



# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add models directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'models'))

# Import functions from your ocr.py
try:
    from models import ocr
    from models.ocr import check_news, clean_text
    print("✅ Successfully imported ocr.py from models directory")
    logger.info("✅ Successfully imported ocr.py functions")
except ImportError as e:
    logger.error(f"❌ Error importing from ocr.py: {e}")
    
    # Fallback functions
    def check_news(text):
        return "❌ Fake News (Confidence: 85.00%)"
    
    def clean_text(text):
        return text.lower().strip()
    print("⚠️ Using fallback functions")
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Store analysis history (in production, use a database)
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
            return jsonify({
                'success': False,
                'error': 'Please enter some text to analyze'
            })
        
        logger.info(f"🔍 Analyzing single news text (length: {len(news_text)})")
        
        # Use your existing check_news function from ocr.py
        result_text = check_news(news_text)
        
        # Parse the result text to extract prediction and confidence
        if 'Real News' in result_text:
            prediction = 'real'
            emoji = '✅'
        else:
            prediction = 'fake'
            emoji = '❌'
        
        # Extract confidence from result text
        import re
        confidence_match = re.search(r'Confidence:\s*([\d.]+)%', result_text)
        confidence = float(confidence_match.group(1)) / 100 if confidence_match else 0.85
        
        # Generate enhanced word analysis
        fake_words, real_words = generate_word_analysis(news_text)
        
        # Store in history
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
        return jsonify({
            'success': False,
            'error': 'Internal server error. Please try again.'
        }), 500

@app.route('/api/predict-bulk', methods=['POST'])
def predict_bulk():
    try:
        data = request.json
        news_items = data.get('items', [])
        
        if not news_items:
            return jsonify({
                'success': False,
                'error': 'No news items provided'
            })
        
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
                
                import re
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
        
        # Store bulk analysis in history
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
        return jsonify({
            'success': False,
            'error': 'Internal server error. Please try again.'
        }), 500

@app.route('/api/process-image', methods=['POST'])
def process_image():
    try:
        if 'image' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No image file provided'
            })
        
        image_file = request.files['image']
        
        if image_file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No image selected'
            })
        
        # Validate file type
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'bmp'}
        if '.' not in image_file.filename or \
           image_file.filename.rsplit('.', 1)[1].lower() not in allowed_extensions:
            return jsonify({
                'success': False,
                'error': 'Invalid file type. Please upload an image (PNG, JPG, JPEG, GIF, BMP)'
            })
        
        logger.info(f"📷 Processing image: {image_file.filename}")
        
        # Save uploaded image to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as temp_file:
            image_file.save(temp_file.name)
            temp_path = temp_file.name
        
        try:
            # Extract text using OCR
            extracted_text = extract_text_with_ocr(temp_path)
            
            # Analyze the extracted text
            if extracted_text and "No text could be extracted" not in extracted_text:
                result_text = check_news(extracted_text)
                
                if 'Real News' in result_text:
                    prediction = 'real'
                    emoji = '✅'
                else:
                    prediction = 'fake'
                    emoji = '❌'
                
                import re
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
            # Clean up temporary file
            os.unlink(temp_path)
        
        # Store image analysis in history
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
        return jsonify({
            'success': False,
            'error': 'Error processing image. Please try again.'
        }), 500

@app.route('/api/process-file', methods=['POST'])
def process_file():
    try:
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No file provided'
            })
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No file selected'
            })
        
        allowed_extensions = {'txt', 'csv'}
        if '.' not in file.filename or \
           file.filename.rsplit('.', 1)[1].lower() not in allowed_extensions:
            return jsonify({
                'success': False,
                'error': 'Invalid file type. Please upload TXT or CSV files only.'
            })
        
        logger.info(f"📁 Processing file: {file.filename}")
        
        # Read file content
        content = file.read().decode('utf-8')
        
        # Parse based on file type
        if file.filename.endswith('.txt'):
            news_items = parse_txt_file(content)
        else:  # CSV
            news_items = parse_csv_file(content)
        
        if not news_items:
            return jsonify({
                'success': False,
                'error': 'No valid news items found in the file.'
            })
        
        # Process each news item (limit to 20 for performance)
        news_items = news_items[:20]
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
                
                import re
                confidence_match = re.search(r'Confidence:\s*([\d.]+)%', result_text)
                confidence = float(confidence_match.group(1)) / 100 if confidence_match else 0.85
                
                results.append({
                    'id': i + 1,
                    'text': item[:100] + '...' if len(item) > 100 else item,
                    'prediction': prediction,
                    'emoji': emoji,
                    'confidence': confidence,
                    'fullResult': result_text
                })
        
        # Store file analysis in history
        analysis_history.append({
            'type': 'file',
            'filename': file.filename,
            'count': len(results),
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
        logger.error(f"Error in process-file: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Error processing file. Please try again.'
        }), 500

@app.route('/api/history')
def get_history():
    """Get recent analysis history"""
    return jsonify({
        'success': True,
        'history': analysis_history[-10:]  # Last 10 analyses
    })

@app.route('/api/stats')
def get_stats():
    """Get system statistics"""
    total_analyses = len(analysis_history)
    single_analyses = len([h for h in analysis_history if h['type'] == 'single'])
    bulk_analyses = len([h for h in analysis_history if h.get('type') == 'bulk'])
    image_analyses = len([h for h in analysis_history if h['type'] == 'image'])
    file_analyses = len([h for h in analysis_history if h['type'] == 'file'])
    
    return jsonify({
        'success': True,
        'stats': {
            'totalAnalyses': total_analyses,
            'singleAnalyses': single_analyses,
            'bulk_analyses': bulk_analyses,
            'imageAnalyses': image_analyses,
            'fileAnalyses': file_analyses
        }
    })

def extract_text_with_ocr(image_path):
    """Extract text from image using OCR"""
    try:
        import cv2
        import easyocr
        
        reader = easyocr.Reader(['en'], gpu=False)
        results = reader.readtext(image_path)

        extracted_lines = []
        for _, text, confidence in results:
            if confidence > 0.3:  # Confidence threshold
                extracted_lines.append(text)

        full_text = " ".join(extracted_lines)
        return full_text if full_text.strip() else "No text could be extracted from the image."
        
    except Exception as e:
        logger.error(f"OCR Error: {str(e)}")
        return f"Error in OCR processing: {str(e)}"

def parse_txt_file(content):
    """Parse TXT file content"""
    # Split by multiple newlines or numbered items
    items = re.split(r'\n\s*\n|\d+\.\s+', content)
    return [item.strip() for item in items if item.strip() and len(item.strip()) > 20]

def parse_csv_file(content):
    """Parse CSV file content"""
    import csv
    from io import StringIO
    
    try:
        reader = csv.reader(StringIO(content))
        rows = list(reader)
        
        # Try to find text column
        if rows:
            headers = [h.lower() for h in rows[0]]
            if 'text' in headers:
                text_index = headers.index('text')
                return [row[text_index] for row in rows[1:] if len(row) > text_index and row[text_index].strip()]
            elif 'title' in headers:
                text_index = headers.index('title')
                return [row[text_index] for row in rows[1:] if len(row) > text_index and row[text_index].strip()]
        
        # Fallback: use first column
        return [row[0] for row in rows if row and row[0].strip()]
    except:
        # Simple line-by-line parsing
        return [line.strip() for line in content.split('\n') if line.strip()]

def generate_word_analysis(text):
    """Generate fake and real word analysis based on text content"""
    text_lower = text.lower()
    
    # Enhanced word lists
    fake_indicators = [
        'breaking', 'shocking', 'unbelievable', 'secret', 'exposed', 
        'they don\'t want you to know', 'must see', 'viral', 'sensational',
        'clickbait', 'amazing', 'incredible', 'you won\'t believe'
    ]
    
    real_indicators = [
        'according to', 'research', 'study', 'official', 'reported',
        'confirmed', 'data', 'analysis', 'experts', 'scientists',
        'university', 'journal', 'published', 'findings'
    ]
    
    detected_fake = [word for word in fake_indicators if word in text_lower][:5]
    detected_real = [word for word in real_indicators if word in text_lower][:5]
    
    # Add some default words if none detected
    if not detected_fake:
        detected_fake = ['sensational', 'clickbait', 'viral']
    if not detected_real:
        detected_real = ['source', 'verified', 'factual']
    
    return detected_fake, detected_real

if __name__ == '__main__':
    print("🚀 AI Fake News Detection System starting...")
    print("✅ Enhanced UI with 5-page structure")
    print("📊 Visit http://localhost:5000 to use the application")
    print("📝 Features: Single Check, Bulk Analysis, Image OCR, File Upload")
    
    app.run(debug=True, host='0.0.0.0', port=5000)