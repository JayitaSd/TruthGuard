import cv2
import easyocr
import pandas as pd
import numpy as np
import re
import string
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, accuracy_score

# =========================
# ✅ Text Cleaning Function
# =========================
def clean_text(text):
    text = str(text).lower()
    text = re.sub(r"http\S+", " ", text)   # remove links
    text = re.sub(r"@\w+", " ", text)      # remove mentions
    text = text.translate(str.maketrans("", "", string.punctuation))
    text = re.sub(r"\d+", " ", text)       # remove numbers
    text = re.sub(r"\s+", " ", text)       # remove extra spaces
    return text.strip()

# =========================
# ✅ Load in Chunks (Memory Friendly)
# =========================
def load_in_chunks(file, label, chunksize=50000, max_chunks=2):
    chunks = pd.read_csv(file, on_bad_lines="skip", chunksize=chunksize, encoding="utf-8")
    data_list = []
    for i, chunk in enumerate(chunks):
        if "title" in chunk.columns and "text" in chunk.columns:
            chunk["text"] = chunk["title"].fillna("") + " " + chunk["text"].fillna("")
        else:
            chunk["text"] = chunk.iloc[:,0].fillna("")
        chunk["text"] = chunk["text"].apply(clean_text)
        chunk["label"] = label
        data_list.append(chunk[["text", "label"]])
        if i+1 >= max_chunks:
            break
    return pd.concat(data_list, ignore_index=True)

# =========================
# ✅ Load Fake/Real Datasets
# =========================
print("⏳ Loading True news...")
true = load_in_chunks("/home/jayita_s/projects/new_fake/static/data/True.csv", label=1, chunksize=50000, max_chunks=2)

print("⏳ Loading Fake news...")
fake = load_in_chunks("/home/jayita_s/projects/new_fake/static/data/Fake.csv", label=0, chunksize=50000, max_chunks=2)

# ✅ Combine datasets
data = pd.concat([true, fake], axis=0).reset_index(drop=True)
print(f"✅ Data loaded: {data.shape[0]} rows")

# =========================
# ✅ Train/Test Split
# =========================
X = data["text"]
y = data["label"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# =========================
# ✅ TF-IDF Vectorizer + Model
# =========================
vectorizer = TfidfVectorizer(max_features=5000, ngram_range=(1,2))
X_train_tfidf = vectorizer.fit_transform(X_train)
X_test_tfidf = vectorizer.transform(X_test)

model = LogisticRegression(max_iter=200, solver="lbfgs")
model.fit(X_train_tfidf, y_train)

print("\n📊 Model Performance:")
print("Training Accuracy:", model.score(X_train_tfidf, y_train))
print("Test Accuracy:", accuracy_score(y_test, model.predict(X_test_tfidf)))
print("\nClassification Report:\n", classification_report(y_test, model.predict(X_test_tfidf)))

# =========================
# 🚀 Feature: Predict from Text
# =========================
def check_news(news_text):
    cleaned = clean_text(news_text)
    tfidf_text = vectorizer.transform([cleaned])
    prediction = model.predict(tfidf_text)[0]
    probability = model.predict_proba(tfidf_text)[0][prediction]
    label = "✅ Real News" if prediction == 1 else "❌ Fake News"
    return f"{label} (Confidence: {probability*100:.2f}%)"

# =========================
# 🚀 OCR + Fake News Integration
# =========================
def ocr_and_check(img_path):
    reader = easyocr.Reader(['en'], gpu=False)
    results = reader.readtext(img_path)

    print("\n📷 OCR Extracted Text:")
    extracted_lines = []
    for _, text, _ in results:
        print(text)
        extracted_lines.append(text)

    full_text = " ".join(extracted_lines) 
    print("\n Fake News Prediction:")
    print(check_news(full_text))