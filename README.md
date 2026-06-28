# TruthGuard 🛡️: AI Fake News Detector

---

<div align="center">

[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0+-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-API-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![EasyOCR](https://img.shields.io/badge/EasyOCR-OCR-2ECC71?style=for-the-badge)](https://github.com/JaidedAI/EasyOCR)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-ML-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white)](https://scikit-learn.org/)
[![NewsAPI](https://img.shields.io/badge/NewsAPI-Real%20News-FF6B35?style=for-the-badge)](https://newsapi.org/)

</div>

---

> 🎯 **Fight misinformation with AI.** Upload text, images, or files — TruthGuard analyzes content using machine learning, OCR, and Gemini AI to detect fake news with high accuracy.

**TruthGuard** is a powerful **AI-powered fake news detection system** built with Flask. It combines traditional ML models (TF-IDF + Logistic Regression), OCR for images, Google Gemini for intelligent assistance, and real-time news fetching to help users verify news authenticity across multiple input formats.

---
## 📚 Table of Contents
- [Key Features](#-key-features)
- [What It Does](#-what-it-does)
- [How It Works](#-how-it-works)
- [Tech Stack](#-tech-stack)
- [Requirements](#-requirements)
- [Project Layout](#-project-layout)
- [Getting Started](#-getting-started)
- [API Endpoints](#-api-endpoints)
- [Tips & Best Practices](#-tips--best-practices)
---
## ✨ Key Features
- **Multi-Format Input Support:** Text input, image OCR (PNG/JPG), CSV/file uploads, and bulk verification
- **ML-Based Detection:** TF-IDF + Logistic Regression model trained on real/fake news datasets (~95% accuracy)
- **OCR Integration:** Extract text from news screenshots using EasyOCR
- **Gemini AI Assistant:** Intelligent chatbot for news queries, verification guidance, and real-time news fetching via NewsAPI
- **Real News Integration:** Fetch live headlines and articles for context
- **Modern Web UI:** Clean, responsive interface with landing page, dedicated verification pages, and floating chatbot
- **Session & History Tracking:** Analysis history and confidence scoring
- **Robust Preprocessing:** Advanced text cleaning, punctuation/numbers/links removal

---
## 🚀 What It Does
```
┌─ User uploads text / image / file
│
├─ Text Extraction (direct or EasyOCR)
│
├─ Preprocessing & Cleaning
│
├─ ML Model Prediction (TF-IDF + Logistic Regression)
│   ↓
│   ✅ Real News or ❌ Fake News + Confidence Score
│
├─ Gemini AI Chatbot provides explanations & real news context
│
└─ Results displayed with detailed analysis
```

The web interface at `http://localhost:5000` lets you:
1. **Single Check** — Paste article text for instant verification
2. **Bulk Check** — Analyze multiple articles
3. **Image OCR** — Upload screenshots for text extraction + verification
4. **File Upload** — Process CSV/text files containing news
5. **Chat with AI** — Ask about news, verification tips, or get live updates

---
## 🧠 How It Works
### Pipeline Overview
1. **Input Handling**
   - Text: Direct input
   - Images: EasyOCR extracts text
   - Files: CSV parsing + batch processing

2. **Preprocessing**
   - Lowercasing, remove URLs, mentions, punctuation, numbers
   - Whitespace normalization

3. **ML Analysis**
   - TF-IDF vectorization (trained on large real/fake news corpus)
   - Logistic Regression classification with probability/confidence

4. **AI Enhancement**
   - Gemini provides contextual explanations
   - Real-time NewsAPI integration for relevant headlines

5. **Output**
   - Real/Fake label + confidence percentage
   - Word pattern analysis
   - Suggestions and verification tips

---
## 🛠️ Tech Stack
- **Python 3.9+**
- **Flask** — Web framework
- **Google Generative AI (Gemini)** — Intelligent chatbot & assistance
- **scikit-learn** — TF-IDF + Logistic Regression ML model
- **EasyOCR** — Optical Character Recognition for images
- **Pillow + OpenCV** — Image processing
- **NewsAPI** — Real-time news headlines
- **HTML/CSS/JS** — Responsive frontend

---
## ✅ Requirements
- **Python 3.9+**
- **Google Gemini API Key**
- **NewsAPI Key** (optional but recommended for live news)
- Internet access for Gemini and NewsAPI calls

---
## 🔧 Configuration
Create a `.env` file in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key_here
NEWS_API_KEY=your_newsapi_key_here
```
---
## 📁 Project Layout
```
TruthGuard/
│
├── models/
│   └── ocr.py              # ML model + OCR functions
│
├── static/                 # CSS, JS, images
│   └── css/
│
├── templates/
│   ├── landing.html
│   ├── single.html
│   ├── bulk.html
│   ├── image.html
│   └── file.html
│
├── app.py                  # Main Flask application
├── requirements.txt
├── .env.example
├── .gitignore
└── README.md
```
**Key Files**
| Files | Responsibility |
|-------|----------------|
| `app.py` | Flask routes, Gemini integration, NewsAPI, main logic |
| `models/ocr.py` | ML training, text cleaning, prediction, OCR |
| `templates/*.html` | Responsive web interfaces |

---
## ▶️ Getting Started
**1. Clone the repository**
```
git clone https://github.com/JayitaSd/TruthGuard.git
cd TruthGuard
```
**2. Install dependencies**
```
pip install -r requirements.txt
```
**3. Set up environment variables**
```
cp .env.example .env
# Edit .env with your Gemini and NewsAPI keys
```
**4. Run the application**
```
python app.py
```
**5. Open the UI**
Navigate to ``http://localhost:5000``
You should see the TruthGuard landing page with navigation to all verification tools.

---
## 🔌 API Endpoints

All endpoints are available at `http://localhost:5000`.
**Main Routes**

- GET / — Landing page
- GET /single — Single article verification
- GET /bulk — Bulk verification
- GET /image — Image OCR analysis
- GET /file — File upload verification

**API Endpoints**

- POST /api/predict — Analyze single news text
- Other internal routes for image/file processing
---
## 💡 Tips & Best Practices

- For best OCR results: Use clear, high-contrast images of text (screenshots work well).
- Model Training: The ML model is trained on a subset of the ISOT Fake News Dataset. Results are reliable but should be combined with human judgment.
- Gemini Chatbot: Ask it for news summaries, verification tips, or specific topic updates.
- Confidence Scores: Higher confidence (>80%) indicates stronger signals. Always cross-verify important claims.
- News Fetching: The chatbot can pull live headlines when you ask about current events.

---
## 🎯 In Short
TruthGuard is a comprehensive AI fake news detection platform that combines classical machine learning, modern OCR, and generative AI to help users navigate the information landscape responsibly. Whether you're checking a single article, analyzing images, or chatting with an AI assistant — TruthGuard has you covered.
Built to promote truth in the age of misinformation.
