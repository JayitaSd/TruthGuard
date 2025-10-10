// Bulk verification page JavaScript
let itemCount = 1;

document.addEventListener('DOMContentLoaded', function() {
    console.log('📊 Bulk Verification Page Loaded');
    
    // Initialize first item
    updateItemsCount();
    
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

// Add new news item
function addNewsItem() {
    if (itemCount >= 10) {
        showNotification('Maximum 10 items allowed for bulk analysis.', 'warning');
        return;
    }
    
    itemCount++;
    const bulkItems = document.getElementById('bulk-items');
    
    const newItem = document.createElement('div');
    newItem.className = 'bulk-item';
    newItem.setAttribute('data-id', itemCount);
    newItem.innerHTML = `
        <div class="item-header">
            <span class="item-number">#${itemCount}</span>
            <button class="btn-remove" onclick="removeItem(${itemCount})" title="Remove item">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <textarea class="news-textarea" placeholder="Enter news article ${itemCount}..." rows="4"></textarea>
    `;
    
    bulkItems.appendChild(newItem);
    updateItemsCount();
    
    // Scroll to new item
    newItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Remove specific item
function removeItem(itemId) {
    if (itemCount <= 1) {
        showNotification('You need at least one news item for analysis.', 'warning');
        return;
    }
    
    const item = document.querySelector(`.bulk-item[data-id="${itemId}"]`);
    if (item) {
        item.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => {
            item.remove();
            itemCount--;
            updateItemsCount();
            renumberItems();
        }, 300);
    }
}

// Clear all items
function clearAllItems() {
    const bulkItems = document.getElementById('bulk-items');
    const items = bulkItems.querySelectorAll('.bulk-item');
    
    if (items.length <= 1) {
        showNotification('No items to clear.', 'info');
        return;
    }
    
    if (confirm('Are you sure you want to clear all news items?')) {
        // Keep only the first item
        items.forEach((item, index) => {
            if (index > 0) {
                item.remove();
            }
        });
        
        // Clear text of first item
        const firstTextarea = bulkItems.querySelector('.news-textarea');
        firstTextarea.value = '';
        
        itemCount = 1;
        updateItemsCount();
        renumberItems();
        
        showNotification('All items cleared successfully.', 'success');
    }
}

// Update items count display
function updateItemsCount() {
    document.getElementById('items-count').textContent = itemCount;
}

// Renumber items after removal
function renumberItems() {
    const items = document.querySelectorAll('.bulk-item');
    items.forEach((item, index) => {
        const itemNumber = item.querySelector('.item-number');
        const textarea = item.querySelector('.news-textarea');
        
        item.setAttribute('data-id', index + 1);
        itemNumber.textContent = `#${index + 1}`;
        textarea.placeholder = `Enter news article ${index + 1}...`;
    });
}

// Load sample data
function loadSampleData(type) {
    const samples = {
        mixed: [
            "BREAKING: Government reveals secret alien technology that could solve energy crisis forever! This revolutionary discovery is being kept from the public.",
            "According to a new study published in Nature, researchers have identified key factors in aging that could lead to extended human lifespan.",
            "SHOCKING: They don't want you to know this simple trick that makes doctors rich! The medical industry is hiding the truth.",
            "The World Health Organization released new guidelines for pandemic preparedness based on comprehensive global research and expert consensus.",
            "You won't believe what this celebrity said about the government! The media is trying to suppress this explosive interview."
        ],
        fake: [
            "URGENT: Secret documents reveal COVID was created in a lab as a population control weapon! Share this before it gets deleted!",
            "This one weird trick can make you lose 30 pounds in a week! Doctors hate it but can't stop it.",
            "The moon landing was faked! New evidence proves it was all filmed in a Hollywood studio.",
            "They're putting chemicals in the water that are turning people into zombies! Wake up sheeple!",
            "The elite are using 5G to control our minds! Destroy your router now before it's too late!"
        ],
        real: [
            "NASA's Perseverance rover has discovered new evidence of ancient water on Mars, suggesting the planet could have supported microbial life.",
            "A comprehensive study from Oxford University shows that regular exercise can reduce the risk of chronic diseases by up to 40%.",
            "The International Monetary Fund has revised its global economic growth forecast based on recent market trends and economic indicators.",
            "Researchers at MIT have developed a new battery technology that could significantly extend the range of electric vehicles.",
            "The United Nations has announced new climate targets following the latest IPCC report on global warming trends."
        ]
    };
    
    // Clear existing items first
    clearAllItems();
    
    // Add sample items
    const selectedSamples = samples[type].slice(0, 5); // Max 5 samples
    const bulkItems = document.getElementById('bulk-items');
    
    // Clear first item
    const firstTextarea = bulkItems.querySelector('.news-textarea');
    firstTextarea.value = selectedSamples[0] || '';
    
    // Add remaining items
    for (let i = 1; i < selectedSamples.length; i++) {
        addNewsItem();
        const newTextarea = bulkItems.querySelector(`.bulk-item[data-id="${i + 1}"] .news-textarea`);
        newTextarea.value = selectedSamples[i];
    }
    
    showNotification(`Loaded ${selectedSamples.length} ${type} news examples.`, 'success');
}

// Analyze bulk news
async function analyzeBulkNews() {
    const bulkItems = document.getElementById('bulk-items');
    const textareas = bulkItems.querySelectorAll('.news-textarea');
    
    // Collect news items
    const newsItems = Array.from(textareas)
        .map(textarea => textarea.value.trim())
        .filter(text => text.length > 0);
    
    if (newsItems.length === 0) {
        showNotification('Please enter at least one news item to analyze.', 'error');
        return;
    }
    
    if (newsItems.some(text => text.length < 20)) {
        showNotification('Each news item should be at least 20 characters long.', 'warning');
        return;
    }
    
    const analyzeBtn = document.getElementById('analyze-btn');
    
    // Show loading overlay
    showLoadingOverlay(newsItems.length);
    
    // Disable analyze button
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';

    try {
        const response = await fetch('/api/predict-bulk', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ items: newsItems })
        });

        const result = await response.json();
        
        if (result.success) {
            // Hide loading overlay
            hideLoadingOverlay();
            
            // Display results
            displayBulkResults(result);
            
            // Show results section
            const resultsSection = document.getElementById('results-section');
            resultsSection.style.display = 'block';
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            showNotification(`Successfully analyzed ${result.results.length} news items!`, 'success');
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
        analyzeBtn.innerHTML = '<i class="fas fa-play"></i> Analyze All Items';
    }
}

// Display bulk results
function displayBulkResults(result) {
    // Update summary statistics
    updateSummaryStats(result.summary, result.results);
    
    // Display individual results
    displayIndividualResults(result.results);
    
    // Update analysis metadata
    document.getElementById('analysis-time').textContent = 'Analyzed just now';
    document.getElementById('items-analyzed').textContent = `${result.results.length} items analyzed`;
}

// Update summary statistics
function updateSummaryStats(summary, results) {
    document.getElementById('stat-total').textContent = summary.total;
    document.getElementById('stat-real').textContent = summary.real;
    document.getElementById('stat-fake').textContent = summary.fake;
    
    // Calculate average confidence
    const avgConfidence = results.reduce((sum, item) => sum + item.confidence, 0) / results.length;
    document.getElementById('stat-accuracy').textContent = Math.round(avgConfidence * 100) + '%';
}

// Display individual results
function displayIndividualResults(results) {
    const resultsGrid = document.getElementById('results-grid');
    resultsGrid.innerHTML = '';
    
    results.forEach((result, index) => {
        const resultCard = document.createElement('div');
        resultCard.className = `result-card ${result.prediction}`;
        resultCard.innerHTML = `
            <div class="result-header">
                <div class="result-title">
                    <span class="result-number">#${result.id}</span>
                </div>
                <span class="result-badge ${result.prediction}">
                    ${result.emoji} ${result.prediction.toUpperCase()}
                </span>
            </div>
            <div class="result-preview">${result.text}</div>
            <div class="confidence-meter">
                <div class="meter-track">
                    <div class="meter-fill" style="width: ${Math.round(result.confidence * 100)}%"></div>
                </div>
                <div class="confidence-value">${Math.round(result.confidence * 100)}% confidence</div>
            </div>
            <div class="result-words">
                ${result.fakeWords ? result.fakeWords.map(word => 
                    `<span class="word-tag fake">${word}</span>`
                ).join('') : ''}
                ${result.realWords ? result.realWords.map(word => 
                    `<span class="word-tag real">${word}</span>`
                ).join('') : ''}
            </div>
        `;
        
        resultsGrid.appendChild(resultCard);
        
        // Animate the confidence meter
        setTimeout(() => {
            const meterFill = resultCard.querySelector('.meter-fill');
            meterFill.style.width = Math.round(result.confidence * 100) + '%';
        }, 100 * index);
    });
}

// Export results
function exportResults(format) {
    const resultsGrid = document.getElementById('results-grid');
    const resultCards = resultsGrid.querySelectorAll('.result-card');
    
    if (resultCards.length === 0) {
        showNotification('No results to export.', 'warning');
        return;
    }
    
    let exportData = [];
    
    resultCards.forEach(card => {
        const resultNumber = card.querySelector('.result-number').textContent;
        const prediction = card.querySelector('.result-badge').textContent.trim();
        const preview = card.querySelector('.result-preview').textContent;
        const confidence = card.querySelector('.confidence-value').textContent;
        
        exportData.push({
            id: resultNumber,
            prediction: prediction,
            content: preview,
            confidence: confidence
        });
    });
    
    let blob, filename;
    
    switch (format) {
        case 'json':
            blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            filename = `truthguard-bulk-analysis-${Date.now()}.json`;
            break;
        case 'csv':
            const csv = convertToCSV(exportData);
            blob = new Blob([csv], { type: 'text/csv' });
            filename = `truthguard-bulk-analysis-${Date.now()}.csv`;
            break;
        case 'pdf':
            showNotification('PDF export feature coming soon!', 'info');
            return;
    }
    
    // Download file
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification(`Results exported as ${format.toUpperCase()} successfully!`, 'success');
}

// Convert to CSV
function convertToCSV(data) {
    const headers = ['ID', 'Prediction', 'Content', 'Confidence'];
    const rows = data.map(item => [
        item.id,
        item.prediction,
        `"${item.content.replace(/"/g, '""')}"`,
        item.confidence
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
}

// Loading overlay functions
function showLoadingOverlay(itemCount) {
    const overlay = document.getElementById('loading-overlay');
    const loadingCount = document.getElementById('loading-count');
    const progressFill = document.getElementById('progress-fill');
    
    loadingCount.textContent = itemCount;
    progressFill.style.width = '0%';
    overlay.style.display = 'flex';
    
    // Simulate progress
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 10;
        if (progress >= 90) {
            clearInterval(interval);
            progressFill.style.width = '90%';
        } else {
            progressFill.style.width = progress + '%';
        }
    }, 200);
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    const progressFill = document.getElementById('progress-fill');
    
    progressFill.style.width = '100%';
    
    setTimeout(() => {
        overlay.style.display = 'none';
    }, 500);
}

// Notification system (same as single.js)
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