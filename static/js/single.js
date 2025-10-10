// Single verification page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    console.log('📝 Single Verification Page Loaded');
    
    // Initialize character counter
    const textarea = document.getElementById('news-text');
    const charCount = document.getElementById('char-count');
    
    textarea.addEventListener('input', function() {
        const count = this.value.length;
        charCount.textContent = count.toLocaleString();
        
        // Update text metrics
        updateTextMetrics(this.value);
    });

    // Add animation to results section when it becomes visible
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });

    // Initialize loading steps animation
    initLoadingAnimation();
});

// Text metrics calculation
function updateTextMetrics(text) {
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    const sentenceCount = text.trim() ? text.split(/[.!?]+/).length - 1 : 0;
    
    // Simple readability score (placeholder)
    const readability = text.trim() ? Math.min(100, Math.max(0, 80 - (wordCount / 10))) : 0;
    
    document.getElementById('word-count').textContent = wordCount;
    document.getElementById('sentence-count').textContent = sentenceCount;
    document.getElementById('readability-score').textContent = Math.round(readability);
}

// Load example texts
function loadExample(type) {
    const examples = {
        fake: `BREAKING: Shocking Secret About COVID Vaccines They Don't Want You To Know!

A secret government document has been leaked revealing that COVID vaccines contain microchips designed to track your every move. Doctors are being paid to keep this information hidden from the public.

One brave whistleblower risked everything to expose this truth. "They're injecting us with tracking devices," he revealed in an exclusive interview. "You won't believe what happens next!"

This information is being suppressed by mainstream media. Share this with everyone you know before it gets deleted!`,

        real: `New Study Shows Promising Results in Cancer Research

According to a recent study published in the Journal of Medical Research, scientists at Harvard University have made significant progress in cancer treatment.

The research, which involved over 1,000 participants, demonstrated a 45% improvement in survival rates for patients receiving the new therapy. Dr. Sarah Chen, lead researcher, stated: "These findings represent a major step forward in our understanding of cancer biology."

The study was conducted over three years and underwent rigorous peer review. Further clinical trials are planned to validate these results across larger populations.`
    };

    const textarea = document.getElementById('news-text');
    textarea.value = examples[type];
    textarea.dispatchEvent(new Event('input'));
    
    // Scroll to textarea
    textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Clear text function
function clearText() {
    const textarea = document.getElementById('news-text');
    textarea.value = '';
    textarea.dispatchEvent(new Event('input'));
    textarea.focus();
}

// Analyze news function
async function analyzeSingleNews() {
    const newsText = document.getElementById('news-text').value.trim();
    const analyzeBtn = document.getElementById('analyze-btn');
    
    if (!newsText) {
        showNotification('Please enter some news text to analyze.', 'error');
        return;
    }

    if (newsText.length < 50) {
        showNotification('Please enter at least 50 characters for accurate analysis.', 'warning');
        return;
    }

    // Show loading overlay
    showLoadingOverlay();
    
    // Disable analyze button
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';

    try {
        const response = await fetch('/api/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: newsText })
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
            
            showNotification('Analysis completed successfully!', 'success');
        } else {
            hideLoadingOverlay();
            showNotification('Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        hideLoadingOverlay();
        showNotification('Network error. Please check your connection and try again.', 'error');
    } finally {
        // Re-enable analyze button
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = '<i class="fas fa-search"></i> Analyze News';
    }
}

// Display results function
function displayResults(result) {
    // Update prediction badge
    const predictionBadge = document.getElementById('prediction-badge');
    const predictionEmoji = document.getElementById('prediction-emoji');
    const predictionText = document.getElementById('prediction-text');
    
    predictionBadge.className = `prediction-badge ${result.prediction}`;
    predictionEmoji.textContent = result.emoji;
    predictionText.textContent = result.prediction.toUpperCase();
    
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
    document.getElementById('analysis-id').textContent = `ID: #${result.analysisId}`;
}

// Update word list function
function updateWordList(elementId, words, type) {
    const element = document.getElementById(elementId);
    element.innerHTML = '';
    
    words.forEach(word => {
        const wordTag = document.createElement('span');
        wordTag.className = `word-tag ${type}`;
        wordTag.textContent = word;
        element.appendChild(wordTag);
    });
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

function initLoadingAnimation() {
    const steps = document.querySelectorAll('.loading-steps .step');
    steps.forEach(step => step.classList.remove('active'));
}

function animateLoadingSteps() {
    const steps = document.querySelectorAll('.loading-steps .step');
    steps.forEach((step, index) => {
        setTimeout(() => {
            step.classList.add('active');
        }, index * 1000);
    });
}

// Action functions
function analyzeAgain() {
    const resultsSection = document.getElementById('results-section');
    resultsSection.style.display = 'none';
    
    // Reset confidence meter
    document.getElementById('confidence-fill').style.width = '0%';
    
    // Scroll to input
    document.getElementById('news-text').scrollIntoView({ behavior: 'smooth' });
}

function shareResults() {
    // Simple share functionality
    if (navigator.share) {
        navigator.share({
            title: 'TruthGuard Analysis Result',
            text: 'I just analyzed a news article with TruthGuard AI!',
            url: window.location.href
        });
    } else {
        showNotification('Share functionality not available in your browser.', 'info');
    }
}

function saveAnalysis() {
    // Create a simple report
    const report = {
        title: 'TruthGuard Analysis Report',
        prediction: document.getElementById('prediction-text').textContent,
        confidence: document.getElementById('confidence-value').textContent,
        timestamp: new Date().toLocaleString(),
        analysisId: document.getElementById('analysis-id').textContent
    };
    
    // Create and download file
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `truthguard-analysis-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Report downloaded successfully!', 'success');
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

// Add keyboard shortcut
document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        analyzeSingleNews();
    }
});