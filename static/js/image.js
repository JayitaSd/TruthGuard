// Image OCR page JavaScript
let currentImageFile = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('📷 Image OCR Page Loaded');
    
    // Initialize file upload
    initFileUpload();
    
    // Add animation to results section when it becomes visible
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });
});

// Initialize file upload functionality
function initFileUpload() {
    const uploadArea = document.getElementById('upload-area');
    const imageUpload = document.getElementById('image-upload');
    const uploadContent = document.getElementById('upload-content');

    // Click to upload
    uploadArea.addEventListener('click', () => imageUpload.click());

    // Drag and drop functionality
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImageFile(file);
        } else {
            showNotification('Please upload a valid image file.', 'error');
        }
    });

    // File input change
    imageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleImageFile(file);
        }
    });
}

// Handle image file
function handleImageFile(file) {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp'];
    if (!allowedTypes.includes(file.type)) {
        showNotification('Please upload a valid image file (JPG, PNG, GIF, BMP).', 'error');
        return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        showNotification('Image size should be less than 10MB.', 'error');
        return;
    }

    currentImageFile = file;

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
        const previewImg = document.getElementById('preview-img');
        const fileName = document.getElementById('file-name');
        const fileSize = document.getElementById('file-size');
        
        previewImg.src = e.target.result;
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        
        // Show preview and process button
        document.getElementById('image-preview').style.display = 'block';
        document.getElementById('process-actions').style.display = 'block';
        
        // Hide upload area
        document.getElementById('upload-area').style.display = 'none';
        
        showNotification('Image uploaded successfully! Click "Extract & Analyze" to process.', 'success');
    };
    reader.readAsDataURL(file);
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Clear image
function clearImage() {
    currentImageFile = null;
    
    // Reset form
    document.getElementById('image-upload').value = '';
    document.getElementById('image-preview').style.display = 'none';
    document.getElementById('process-actions').style.display = 'none';
    document.getElementById('upload-area').style.display = 'block';
    
    // Hide results if visible
    document.getElementById('results-section').style.display = 'none';
    
    showNotification('Image cleared.', 'info');
}

// Process image
async function processImage() {
    if (!currentImageFile) {
        showNotification('Please upload an image first.', 'error');
        return;
    }

    const processBtn = document.getElementById('process-btn');
    
    // Show loading overlay
    showLoadingOverlay();
    
    // Disable process button
    processBtn.disabled = true;
    processBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

    try {
        const formData = new FormData();
        formData.append('image', currentImageFile);

        const response = await fetch('/api/process-image', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        
        if (result.success) {
            // Hide loading overlay
            hideLoadingOverlay();
            
            // Display results
            displayResults(result);
            
            // Show results section
            const resultsSection = document.getElementById('results-section');
            resultsSection.style.display = 'block';
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            showNotification('Image processed successfully!', 'success');
        } else {
            hideLoadingOverlay();
            showNotification('Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        hideLoadingOverlay();
        showNotification('Network error. Please check your connection and try again.', 'error');
    } finally {
        // Re-enable process button
        processBtn.disabled = false;
        processBtn.innerHTML = '<i class="fas fa-search"></i> Extract & Analyze Text';
    }
}

// Display results
function displayResults(result) {
    // Update extracted text
    const extractedText = document.getElementById('extracted-text');
    extractedText.textContent = result.extractedText || 'No text could be extracted from the image.';
    
    // Update text length
    const textLength = document.getElementById('text-length');
    const charCount = result.extractedText ? result.extractedText.length : 0;
    textLength.textContent = `${charCount} characters extracted`;
    
    // Update prediction badge
    const predictionBadge = document.getElementById('prediction-badge');
    const predictionEmoji = document.getElementById('prediction-emoji');
    const predictionText = document.getElementById('prediction-text');
    
    if (result.prediction !== 'error') {
        predictionBadge.className = `prediction-badge ${result.prediction}`;
        predictionEmoji.textContent = result.emoji;
        predictionText.textContent = result.prediction.toUpperCase();
    } else {
        predictionBadge.className = 'prediction-badge';
        predictionEmoji.textContent = '⚠️';
        predictionText.textContent = 'ERROR';
    }
    
    // Update confidence
    const confidenceValue = document.getElementById('confidence-value');
    const confidenceFill = document.getElementById('confidence-fill');
    const confidencePercent = Math.round(result.confidence * 100);
    
    confidenceValue.textContent = confidencePercent + '%';
    
    // Animate confidence meter
    setTimeout(() => {
        confidenceFill.style.width = confidencePercent + '%';
    }, 100);
    
    // Update word lists
    updateWordList('fake-words-list', result.fakeWords, 'fake');
    updateWordList('real-words-list', result.realWords, 'real');
    
    // Update analysis metadata
    document.getElementById('analysis-time').textContent = 'Analyzed just now';
}

// Update word list
function updateWordList(elementId, words, type) {
    const element = document.getElementById(elementId);
    element.innerHTML = '';
    
    if (words && words.length > 0) {
        words.forEach(word => {
            const wordTag = document.createElement('span');
            wordTag.className = `word-tag ${type}`;
            wordTag.textContent = word;
            element.appendChild(wordTag);
        });
    } else {
        const noWords = document.createElement('span');
        noWords.className = 'no-words';
        noWords.textContent = 'No significant indicators found';
        noWords.style.color = 'var(--gray)';
        noWords.style.fontStyle = 'italic';
        element.appendChild(noWords);
    }
}

// Copy extracted text to clipboard
function copyText() {
    const extractedText = document.getElementById('extracted-text').textContent;
    
    navigator.clipboard.writeText(extractedText).then(() => {
        showNotification('Text copied to clipboard!', 'success');
    }).catch(() => {
        showNotification('Failed to copy text.', 'error');
    });
}

// Analyze another image
function analyzeAnother() {
    const resultsSection = document.getElementById('results-section');
    resultsSection.style.display = 'none';
    
    // Reset confidence meter
    document.getElementById('confidence-fill').style.width = '0%';
    
    // Clear current image and reset form
    clearImage();
    
    // Scroll to upload section
    document.getElementById('upload-area').scrollIntoView({ behavior: 'smooth' });
}

// Save report
function saveReport() {
    const extractedText = document.getElementById('extracted-text').textContent;
    const prediction = document.getElementById('prediction-text').textContent;
    const confidence = document.getElementById('confidence-value').textContent;
    
    const report = {
        title: 'TruthGuard OCR Analysis Report',
        timestamp: new Date().toLocaleString(),
        prediction: prediction,
        confidence: confidence,
        extractedText: extractedText
    };
    
    // Create and download file
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `truthguard-ocr-analysis-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Report downloaded successfully!', 'success');
}

// Loading overlay functions
function showLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    overlay.style.display = 'flex';
    
    // Animate loading steps
    animateLoadingSteps();
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    overlay.style.display = 'none';
}

function animateLoadingSteps() {
    const steps = document.querySelectorAll('.loading-steps .step');
    steps.forEach((step, index) => {
        setTimeout(() => {
            step.classList.add('active');
        }, index * 1000);
    });
}

// Notification system
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notif => notif.remove());
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add styles if not already added
    if (!document.querySelector('#notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 100px;
                right: 20px;
                background: white;
                padding: 1rem 1.5rem;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                border-left: 4px solid #667eea;
                z-index: 10000;
                animation: slideInRight 0.3s ease;
                max-width: 400px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 1rem;
            }
            .notification-success { border-left-color: #10b981; }
            .notification-error { border-left-color: #ef4444; }
            .notification-warning { border-left-color: #f59e0b; }
            .notification-info { border-left-color: #667eea; }
            .notification-content {
                display: flex;
                align-items: center;
                gap: 0.75rem;
            }
            .notification-close {
                background: none;
                border: none;
                color: #6b7280;
                cursor: pointer;
                padding: 0.25rem;
            }
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

function getNotificationIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}