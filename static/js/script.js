// Tab Navigation
document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', function() {
        const tabName = this.getAttribute('data-tab');
        
        // Remove active class from all tabs and buttons
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // Add active class to clicked button and corresponding content
        this.classList.add('active');
        document.getElementById(tabName + '-tab').classList.add('active');
    });
});

// Single News Analysis
function analyzeSingleNews() {
    const newsText = document.getElementById('news-text').value.trim();
    
    if (!newsText) {
        alert('Please enter some news text to analyze.');
        return;
    }
    
    // Simulate AI analysis (replace with actual API call)
    const result = simulateAIAnalysis(newsText);
    
    displaySingleResult(result);
}

function simulateAIAnalysis(text) {
    // Simulate analysis with random data
    const isFake = Math.random() > 0.5;
    const confidence = Math.floor(Math.random() * 30) + 70; // 70-100%
    
    const fakeWords = ['shocking', 'unbelievable', 'secret', 'they', 'hide', 'exposed', 'must', 'see'];
    const realWords = ['according', 'research', 'study', 'official', 'reported', 'confirmed', 'data', 'analysis'];
    
    const words = text.toLowerCase().split(/\s+/);
    const detectedFakeWords = fakeWords.filter(word => words.includes(word)).slice(0, 5);
    const detectedRealWords = realWords.filter(word => words.includes(word)).slice(0, 5);
    
    return {
        prediction: isFake ? 'fake' : 'real',
        confidence: confidence,
        fakeWords: detectedFakeWords.length > 0 ? detectedFakeWords : ['sensational', 'clickbait', 'viral'],
        realWords: detectedRealWords.length > 0 ? detectedRealWords : ['source', 'verified', 'factual']
    };
}

function displaySingleResult(result) {
    const resultSection = document.getElementById('single-result');
    const predictionLabel = document.getElementById('prediction-label');
    const probabilityFill = document.getElementById('probability-fill');
    const probabilityText = document.getElementById('probability-text');
    const fakeWordsDiv = document.getElementById('fake-words');
    const realWordsDiv = document.getElementById('real-words');
    
    // Set prediction label
    predictionLabel.textContent = result.prediction;
    predictionLabel.className = 'label ' + result.prediction;
    
    // Set probability
    probabilityFill.style.width = result.confidence + '%';
    probabilityText.textContent = result.confidence + '%';
    
    // Set fake words
    fakeWordsDiv.innerHTML = result.fakeWords.map(word => 
        `<span class="word-tag fake">${word}</span>`
    ).join('');
    
    // Set real words
    realWordsDiv.innerHTML = result.realWords.map(word => 
        `<span class="word-tag real">${word}</span>`
    ).join('');
    
    // Show result
    resultSection.style.display = 'block';
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Bulk News Analysis
let bulkItemCount = 1;

function addBulkItem() {
    bulkItemCount++;
    const bulkInputSection = document.querySelector('#bulk-tab .input-section');
    const analyzeBtn = bulkInputSection.querySelector('.btn-primary');
    
    const newItem = document.createElement('div');
    newItem.className = 'bulk-input-container';
    newItem.id = 'bulk-item-' + bulkItemCount;
    newItem.innerHTML = `
        <textarea id="bulk-news-${bulkItemCount}" class="bulk-textarea" placeholder="News item ${bulkItemCount}..." rows="4"></textarea>
        <button class="btn-remove" onclick="removeBulkItem(${bulkItemCount})">Remove</button>
    `;
    
    bulkInputSection.insertBefore(newItem, analyzeBtn.previousElementSibling);
}

function removeBulkItem(itemId) {
    const item = document.getElementById('bulk-item-' + itemId);
    if (item) {
        item.remove();
    }
}

function analyzeBulkNews() {
    const bulkResults = document.getElementById('bulk-results');
    bulkResults.innerHTML = '';
    
    const textareas = document.querySelectorAll('#bulk-tab .bulk-textarea');
    const newsItems = Array.from(textareas)
        .map(textarea => textarea.value.trim())
        .filter(text => text.length > 0);
    
    if (newsItems.length === 0) {
        alert('Please enter at least one news item to analyze.');
        return;
    }
    
    newsItems.forEach((text, index) => {
        const result = simulateAIAnalysis(text);
        const preview = text.substring(0, 100) + (text.length > 100 ? '...' : '');
        
        const resultCard = document.createElement('div');
        resultCard.className = 'bulk-result-card';
        resultCard.innerHTML = `
            <h4>News Item ${index + 1}</h4>
            <span class="label ${result.prediction}">${result.prediction}</span>
            <div class="bulk-result-preview">${preview}</div>
            <div class="probability-bar">
                <div class="probability-fill" style="width: ${result.confidence}%"></div>
                <span class="probability-text">${result.confidence}%</span>
            </div>
        `;
        
        bulkResults.appendChild(resultCard);
    });
    
    bulkResults.style.display = 'block';
    bulkResults.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// File Upload and Processing
const fileDropZone = document.getElementById('file-drop-zone');
const fileUpload = document.getElementById('file-upload');
const fileInfo = document.getElementById('file-info');
const fileName = document.getElementById('file-name');
const processFileBtn = document.getElementById('process-file-btn');

fileDropZone.addEventListener('click', () => fileUpload.click());

fileDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileDropZone.classList.add('dragover');
});

fileDropZone.addEventListener('dragleave', () => {
    fileDropZone.classList.remove('dragover');
});

fileDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    fileDropZone.classList.remove('dragover');
    
    const file = e.dataTransfer.files[0];
    if (file) {
        handleFileUpload(file);
    }
});

fileUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        handleFileUpload(file);
    }
});

function handleFileUpload(file) {
    const validExtensions = ['.txt', '.csv', '.pdf'];
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!validExtensions.includes(fileExt)) {
        alert('Please upload a valid file (TXT, CSV, or PDF)');
        return;
    }
    
    fileName.textContent = file.name;
    fileInfo.style.display = 'block';
    processFileBtn.style.display = 'inline-block';
    fileDropZone.style.display = 'none';
    
    // Store file for processing
    window.uploadedFile = file;
}

function clearFile() {
    fileInfo.style.display = 'none';
    processFileBtn.style.display = 'none';
    fileDropZone.style.display = 'block';
    fileUpload.value = '';
    document.getElementById('file-results').innerHTML = '';
    window.uploadedFile = null;
}

function processFile() {
    if (!window.uploadedFile) {
        alert('No file selected');
        return;
    }
    
    const file = window.uploadedFile;
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const content = e.target.result;
        let newsItems = [];
        
        // Parse based on file type
        if (file.name.endsWith('.txt')) {
            newsItems = parseTxtFile(content);
        } else if (file.name.endsWith('.csv')) {
            newsItems = parseCsvFile(content);
        } else if (file.name.endsWith('.pdf')) {
            newsItems = parsePdfFile(content);
        }
        
        displayFileResults(newsItems);
    };
    
    if (file.name.endsWith('.pdf')) {
        reader.readAsArrayBuffer(file);
    } else {
        reader.readAsText(file);
    }
}

function parseTxtFile(content) {
    // Split by double newlines or numbers followed by period
    const items = content.split(/\n\n+|\d+\.\s+/).filter(item => item.trim().length > 20);
    return items.slice(0, 10); // Limit to 10 items
}

function parseCsvFile(content) {
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    const newsItems = [];
    
    // Skip header if exists
    const startIndex = lines[0].toLowerCase().includes('news') || lines[0].toLowerCase().includes('text') ? 1 : 0;
    
    for (let i = startIndex; i < lines.length && newsItems.length < 10; i++) {
        const line = lines[i].trim();
        // Remove quotes and extract content
        const content = line.replace(/^"|"$/g, '').replace(/""/g, '"');
        if (content.length > 20) {
            newsItems.push(content);
        }
    }
    
    return newsItems;
}

function parsePdfFile(content) {
    // Simulate PDF text extraction (in real implementation, use PDF.js library)
    return [
        'Breaking: Major technology company announces breakthrough in artificial intelligence.',
        'Local government introduces new environmental protection measures.',
        'Scientific study reveals interesting findings about climate change.',
        'Economic report shows growth in renewable energy sector.'
    ];
}

function displayFileResults(newsItems) {
    const fileResults = document.getElementById('file-results');
    fileResults.innerHTML = '';
    
    if (newsItems.length === 0) {
        fileResults.innerHTML = '<p style="color: #718096;">No valid news items found in the file.</p>';
        return;
    }
    
    newsItems.forEach((text, index) => {
        const result = simulateAIAnalysis(text);
        const preview = text.substring(0, 120) + (text.length > 120 ? '...' : '');
        
        const resultCard = document.createElement('div');
        resultCard.className = 'bulk-result-card';
        resultCard.innerHTML = `
            <h4>Item ${index + 1}</h4>
            <span class="label ${result.prediction}">${result.prediction}</span>
            <div class="bulk-result-preview">${preview}</div>
            <div class="probability-section">
                <div class="probability-bar">
                    <div class="probability-fill" style="width: ${result.confidence}%"></div>
                    <span class="probability-text">${result.confidence}%</span>
                </div>
            </div>
            <div class="word-list" style="margin-top: 10px;">
                ${result.fakeWords.slice(0, 3).map(word => `<span class="word-tag fake">${word}</span>`).join('')}
                ${result.realWords.slice(0, 3).map(word => `<span class="word-tag real">${word}</span>`).join('')}
            </div>
        `;
        
        fileResults.appendChild(resultCard);
    });
    
    fileResults.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('AI Fake News Detection System initialized');
});

// Image Upload and Processing
const imageDropZone = document.getElementById('image-drop-zone');
const imageUpload = document.getElementById('image-upload');
const imagePreview = document.getElementById('image-preview');
const previewImg = document.getElementById('preview-img');
const processImageBtn = document.getElementById('process-image-btn');

imageDropZone.addEventListener('click', () => imageUpload.click());

imageDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    imageDropZone.classList.add('dragover');
});

imageDropZone.addEventListener('dragleave', () => {
    imageDropZone.classList.remove('dragover');
});

imageDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    imageDropZone.classList.remove('dragover');
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        handleImageFile(file);
    }
});

imageUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        handleImageFile(file);
    }
});

function handleImageFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        previewImg.src = e.target.result;
        imagePreview.style.display = 'block';
        processImageBtn.style.display = 'inline-block';
        imageDropZone.style.display = 'none';
    };
    reader.readAsDataURL(file);
}

function clearImage() {
    imagePreview.style.display = 'none';
    processImageBtn.style.display = 'none';
    imageDropZone.style.display = 'block';
    imageUpload.value = '';
    document.getElementById('ocr-result').style.display = 'none';
}

function processImage() {
    // Simulate OCR processing
    const extractedText = `Breaking News: Scientists discover new method for renewable energy production. 
    
According to a recent study published in the Journal of Environmental Science, researchers have developed an innovative approach to harness solar energy more efficiently. The method, which uses advanced photovoltaic cells, has shown promising results in laboratory tests.

Dr. Jane Smith, lead researcher on the project, stated that this breakthrough could revolutionize the renewable energy sector. The team plans to conduct further testing over the next year before commercialization.`;
    
    const result = simulateAIAnalysis(extractedText);
    
    const ocrResult = document.getElementById('ocr-result');
    const extractedTextDiv = document.getElementById('extracted-text');
    const imageAnalysisResult = document.getElementById('image-analysis-result');
    
    extractedTextDiv.textContent = extractedText;
    
    imageAnalysisResult.innerHTML = `
        <div class="result-card">
            <div class="prediction-header">
                <h3>Analysis Result</h3>
                <span class="label ${result.prediction}">${result.prediction}</span>
            </div>
            <div class="probability-section">
                <h4>Confidence Score</h4>
                <div class="probability-bar">
                    <div class="probability-fill" style="width: ${result.confidence}%"></div>
                    <span class="probability-text">${result.confidence}%</span>
                </div>
            </div>
            <div class="words-section">
                <div class="fake-words">
                    <h4>🚫 Top Words (Fake)</h4>
                    <div class="word-list">
                        ${result.fakeWords.map(word => `<span class="word-tag fake">${word}</span>`).join('')}
                    </div>
                </div>
                <div class="real-words">
                    <h4>✅ Top Words (Real)</h4>
                    <div class="word-list">
                        ${result.realWords.map(word => `<span class="word-tag real">${word}</span>`).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    ocrResult.style.display = 'block';
    ocrResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}