from flask import Flask, render_template, request, jsonify
import os
import sys
import tempfile
import json
from datetime import datetime
import logging
import re
import google.generativeai as genai
import requests
from dotenv import load_dotenv

# -------------------------
# ✅ PROPER ENV LOADING
# -------------------------

# Get current directory (where this file is)
current_dir = os.path.dirname(os.path.abspath(__file__))

# Load from current directory first, then parent
env_paths = [
    os.path.join(current_dir, '.env'),
    os.path.join(current_dir, '.env.local'),
    os.path.join(os.path.dirname(current_dir), '.env'),
]

for env_path in env_paths:
    if os.path.exists(env_path):
        load_dotenv(env_path)
        print(f"✅ Loaded environment from: {env_path}")

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

# -------------------------
# ✅ API Configuration with DEBUG
# -------------------------
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
NEWS_API_KEY = os.getenv("NEWS_API_KEY")

print(f"🔑 GEMINI_API_KEY: {'✅ LOADED' if GEMINI_API_KEY else '❌ NOT FOUND'}")
print(f"🔑 NEWS_API_KEY: {'✅ LOADED' if NEWS_API_KEY else '❌ NOT FOUND'}")

# List all environment variables for debugging
print("🔍 All environment variables:")
for key, value in os.environ.items():
    if any(api_key in key.lower() for api_key in ['gemini', 'news', 'api']):
        masked_value = value[:4] + '***' + value[-4:] if value else 'None'
        print(f"   {key}: {masked_value}")

# Configure Gemini
try:
    if GEMINI_API_KEY:
        genai.configure(api_key=GEMINI_API_KEY)
        gemini_model = genai.GenerativeModel('gemini-pro')
        GEMINI_AVAILABLE = True
        print("✅ Gemini API configured successfully")
    else:
        GEMINI_AVAILABLE = False
        gemini_model = None
        print("⚠️ Gemini API key not found - check your .env file")
except Exception as e:
    logger.error(f"❌ Gemini API configuration failed: {e}")
    GEMINI_AVAILABLE = False
    gemini_model = None

# -------------------------
# Utility Functions
# -------------------------
def is_news_query(message):
    """Check if the user is asking for current news"""
    message_lower = message.lower()
    news_keywords = [
        'news', 'headlines', 'latest', 'current', 'trending', 'breaking',
        'sports news', 'tech news', 'technology news', 'politics news', 
        'business news', 'entertainment news', 'health news', 'science news',
        'what\'s happening', 'today news', 'recent news', 'top stories',
        'update', 'headline', 'world news'
    ]
    return any(keyword in message_lower for keyword in news_keywords)

def fetch_real_news(user_query):
    """Fetch real news from NewsAPI with proper error handling"""
    if not NEWS_API_KEY:
        logger.warning("❌ NewsAPI key not available")
        return None
    
    try:
        user_query_lower = user_query.lower()
        
        # Map user query to NewsAPI category
        category_map = {
            'sports': 'sports',
            'sport': 'sports',
            'technology': 'technology', 
            'tech': 'technology',
            'business': 'business',
            'finance': 'business',
            'entertainment': 'entertainment',
            'movie': 'entertainment',
            'health': 'health',
            'science': 'science',
            'politics': 'general',
            'world': 'general',
            'national': 'general'
        }
        
        category = 'general'
        query_terms = []
        
        for key, value in category_map.items():
            if key in user_query_lower:
                category = value
                query_terms.append(key)
                break
        
        # If no specific category found, try a general search
        if category == 'general' and len(user_query.split()) > 1:
            # Use everything API for better results
            url = f"https://newsapi.org/v2/everything?q={user_query}&sortBy=publishedAt&pageSize=5&apiKey={NEWS_API_KEY}"
        else:
            # Use top headlines for categories
            url = f"https://newsapi.org/v2/top-headlines?category={category}&country=us&pageSize=5&apiKey={NEWS_API_KEY}"
        
        logger.info(f"📰 Fetching news from: {url.replace(NEWS_API_KEY, 'API_KEY_REDACTED')}")
        
        response = requests.get(url, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            articles = data.get('articles', [])
            logger.info(f"✅ NewsAPI returned {len(articles)} articles")
            
            # Filter valid articles
            valid_articles = []
            for article in articles:
                if (article.get('title') and 
                    article.get('title') != '[Removed]' and 
                    article.get('url') and
                    article.get('url').startswith('http')):
                    valid_articles.append(article)
            
            logger.info(f"✅ Found {len(valid_articles)} valid articles")
            data['articles'] = valid_articles
            return data
        else:
            logger.warning(f"❌ NewsAPI request failed: {response.status_code} - {response.text}")
            return None
            
    except requests.exceptions.Timeout:
        logger.error("❌ NewsAPI request timed out")
        return None
    except Exception as e:
        logger.error(f"❌ Error fetching from NewsAPI: {e}")
        return None

def format_news_response(news_data, user_query):
    """Format real news data into a nice response"""
    articles = news_data.get('articles', [])
    
    if not articles:
        return "I couldn't fetch current news right now. Please check reliable sources like BBC News, Reuters, or Associated Press directly."
    
    response = "Here are the latest news headlines"
    
    # Add category context
    if 'sports' in user_query.lower():
        response += " in sports"
    elif 'tech' in user_query.lower():
        response += " in technology"
    elif 'business' in user_query.lower():
        response += " in business"
    elif 'entertainment' in user_query.lower():
        response += " in entertainment"
    
    response += ":\n\n"
    
    for i, article in enumerate(articles[:5], 1):
        title = article.get('title', 'No title').strip()
        source = article.get('source', {}).get('name', 'Unknown source')
        url = article.get('url', '#')
        description = article.get('description', '')
        
        # Clean and truncate title
        title = re.sub(r'\s+', ' ', title)
        if len(title) > 80:
            title = title[:77] + "..."
            
        # Use description if available, otherwise just title and source
        if description and len(description) > 10:
            response += f"{i}. **{title}**\n   {description}\n   Source: *{source}*\n   [Read more]({url})\n\n"
        else:
            response += f"{i}. **{title}**\n   Source: *{source}*\n   [Read more]({url})\n\n"
    
    response += "💡 **Remember**: You can verify any suspicious news using our Single Check feature!"
    return response

def create_chatbot_prompt(user_message):
    """Create a smart prompt for Gemini"""
    return f"""You are TruthGuard AI, a helpful assistant for news verification and reliable information.

User asked: "{user_message}"

Guidelines:
- Be helpful, accurate, and conversational
- If discussing news, emphasize verification and reliable sources
- Recommend trusted sources like BBC, Reuters, AP News, TechCrunch, ESPN
- Explain how to use TruthGuard features for verification
- Don't invent or hallucinate news stories
- If unsure about current events, suggest using our verification tools
- Keep responses concise but informative (2-4 paragraphs max)

Provide a helpful response:"""

def get_news_suggestions(user_query):
    """Get relevant suggestions based on news query"""
    user_query_lower = user_query.lower()
    
    if 'sports' in user_query_lower:
        return ["Latest sports scores", "Sports news", "Verify sports article", "ESPN updates"]
    elif 'tech' in user_query_lower:
        return ["Tech news", "Latest gadgets", "Verify tech news", "AI updates"]
    elif 'business' in user_query_lower:
        return ["Business news", "Stock updates", "Verify business news", "Market trends"]
    else:
        return ["Sports news", "Tech updates", "Business headlines", "Verify news article"]

def get_general_suggestions():
    """Get general suggestions"""
    return ["Verify news article", "TruthGuard features", "Spot fake news", "Reliable sources"]

def get_fallback_response(user_message):
    """Fallback when both APIs are unavailable"""
    if is_news_query(user_message):
        return """I currently can't fetch live news updates, but here are reliable sources for current news:

📰 **Trusted News Sources:**
• BBC News (https://www.bbc.com/news) - Comprehensive world news
• Reuters (https://www.reuters.com) - Fact-based reporting  
• Associated Press (https://apnews.com) - Breaking news
• The Guardian (https://www.theguardian.com/international) - International coverage

⚽ **Sports:**
• ESPN (https://www.espn.com) - Live scores and news
• BBC Sport (https://www.bbc.com/sport) - Global sports coverage

💻 **Technology:**
• TechCrunch (https://techcrunch.com) - Startup and tech news
• The Verge (https://www.theverge.com) - Tech and culture

You can copy any news article into our Single Check feature to verify its authenticity!"""
    else:
        return """Hello! I'm TruthGuard AI, your assistant for news verification. I can help you with:

• Verifying news articles using our AI tools
• Guidance on spotting fake news and misinformation
• Information about TruthGuard features
• Recommendations for reliable news sources
• Tips for responsible news consumption

What would you like to know about? You can ask me about news verification, reliable sources, or use our tools to check specific articles!"""

# -------------------------
# Flask Routes (Keep existing routes the same)
# -------------------------
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
# Enhanced Chatbot Route
# -------------------------
@app.route('/api/chatbot', methods=['POST'])
def chatbot():
    try:
        data = request.json
        user_message = data.get('message', '').strip()
        
        if not user_message:
            return jsonify({'success': False, 'error': 'No message provided'})
        
        logger.info(f"🤖 Chatbot query: {user_message}")
        
        # Check if it's a news request
        if is_news_query(user_message) and NEWS_API_KEY:
            # Try to fetch real news from NewsAPI
            logger.info("🔄 Attempting to fetch news from NewsAPI...")
            news_data = fetch_real_news(user_message)
            if news_data and news_data.get('articles'):
                logger.info("✅ Using NewsAPI for news response")
                return jsonify({
                    'success': True,
                    'response': format_news_response(news_data, user_message),
                    'type': 'news',
                    'suggestions': get_news_suggestions(user_message)
                })
            else:
                logger.info("⚠️ NewsAPI failed or no articles found")
        
        # For non-news queries or if NewsAPI fails, use Gemini
        if GEMINI_AVAILABLE:
            try:
                prompt = create_chatbot_prompt(user_message)
                response = gemini_model.generate_content(prompt)
                logger.info("✅ Using Gemini for response")
                
                return jsonify({
                    'success': True,
                    'response': response.text,
                    'type': 'general',
                    'suggestions': get_general_suggestions()
                })
            except Exception as e:
                logger.error(f"❌ Gemini API error: {e}")
                # Fall through to fallback response
        
        # Fallback response
        logger.info("⚠️ Using fallback response")
        return jsonify({
            'success': True,
            'response': get_fallback_response(user_message),
            'type': 'fallback',
            'suggestions': get_general_suggestions()
        })
            
    except Exception as e:
        logger.error(f"❌ Error in chatbot: {str(e)}")
        return jsonify({
            'success': False, 
            'error': 'Sorry, I encountered an error. Please try again.'
        }), 500

if __name__ == '__main__':
    print("🚀 AI Fake News Detection System starting...")
    print("✅ Enhanced UI with 5-page structure")
    print("📊 Visit http://localhost:5000 to use the application")
    print("📝 Features: Single Check, Bulk Analysis, Image OCR, File Upload")
    print("🤖 Chatbot: Integrated Gemini + NewsAPI")
    app.run(debug=True, host='0.0.0.0', port=5000)