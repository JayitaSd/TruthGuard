// File upload page JavaScript
let currentFile = null;
let currentResults = [];
let currentPage = 1;
const itemsPerPage = 10;
let filteredResults = [];

document.addEventListener('DOMContentLoaded', function() {
    console.log('📁 File Upload Page Loaded');
    
    // Initialize file upload
    initFileUpload();
    
    // Initialize table functionality
    initTable();
});

// Initialize file upload functionality
function initFileUpload() {
    const uploadArea = document.getElementById('upload-area');
    const fileUpload = document.getElementById('file-upload');
    const uploadContent = document.getElementById('upload-content');

    // Click to upload
    uploadArea.addEventListener('click', () => fileUpload.click());

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
        if (file) {
            handleFileUpload(file);
        }
    });

    // File input change
    fileUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFileUpload(file);
        }
    });
}

// Handle file upload
function handleFileUpload(file) {
    // Validate file type
    const allowedExtensions = ['.txt', '.csv'];
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!allowedExtensions.includes(fileExt)) {
        showNotification('Please upload a valid file (TXT or CSV only).', 'error');
        return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        showNotification('File size should be less than 10MB.', 'error');
        return;
    }

    currentFile = file;

    // Update file info display
    const fileName = document.getElementById('file-name');
    const fileSize = document.getElementById('file-size');
    const fileType = document.getElementById('file-type');
    const fileTypeIcon = document.getElementById('file-type-icon');
    
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    fileType.textContent = fileExt.toUpperCase().replace('.', '');
    
    // Set appropriate icon
    if (fileExt === '.csv') {
        fileTypeIcon.className = 'fas fa-file-csv';
    } else {
        fileTypeIcon.className = 'fas fa-file-alt';
    }
    
    // Show file info and process button
    document.getElementById('file-info').style.display = 'block';
    document.getElementById('process-actions').style.display = 'block';
    
    // Hide upload area
    document.getElementById('upload-area').style.display = 'none';
    
    showNotification('File uploaded successfully! Click "Process File" to analyze.', 'success');
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Clear file
function clearFile() {
    currentFile = null;
    
    // Reset form
    document.getElementById('file-upload').value = '';
    document.getElementById('file-info').style.display = 'none';
    document.getElementById('process-actions').style.display = 'none';
    document.getElementById('upload-area').style.display = 'block';
    
    // Hide results if visible
    document.getElementById('results-section').style.display = 'none';
    
    showNotification('File cleared.', 'info');
}

// Process file
async function processFile() {
    if (!currentFile) {
        showNotification('Please upload a file first.', 'error');
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
        formData.append('file', currentFile);

        const response = await fetch('/api/process-file', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        
        if (result.success) {
            // Hide loading overlay
            hideLoadingOverlay();
            
            // Store results
            currentResults = result.results;
            filteredResults = [...currentResults];
            
            // Display results
            displayFileResults(result);
            
            // Show results section
            const resultsSection = document.getElementById('results-section');
            resultsSection.style.display = 'block';
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            showNotification(`Successfully processed ${result.results.length} articles!`, 'success');
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
        processBtn.innerHTML = '<i class="fas fa-play"></i> Process File';
    }
}

// Display file results
function displayFileResults(result) {
    // Update summary statistics
    updateSummaryStats(result.summary);
    
    // Update analysis metadata
    document.getElementById('analysis-time').textContent = 'Analyzed just now';
    document.getElementById('file-processed').textContent = `${result.results.length} articles from ${currentFile.name}`;
    
    // Render table
    renderTable();
}

// Update summary statistics
function updateSummaryStats(summary) {
    document.getElementById('stat-total').textContent = summary.total;
    document.getElementById('stat-real').textContent = summary.real;
    document.getElementById('stat-fake').textContent = summary.fake;
    
    // Calculate average confidence
    const avgConfidence = currentResults.reduce((sum, item) => sum + item.confidence, 0) / currentResults.length;
    document.getElementById('stat-accuracy').textContent = Math.round(avgConfidence * 100) + '%';
}

// Initialize table functionality
function initTable() {
    // Search functionality
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', filterResults);
    
    // Filter functionality
    const filterSelect = document.getElementById('filter-select');
    filterSelect.addEventListener('change', filterResults);
}

// Filter results based on search and filter
function filterResults() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const filterValue = document.getElementById('filter-select').value;
    
    filteredResults = currentResults.filter(item => {
        // Search filter
        const matchesSearch = item.text.toLowerCase().includes(searchTerm);
        
        // Type filter
        const matchesFilter = filterValue === 'all' || item.prediction === filterValue;
        
        return matchesSearch && matchesFilter;
    });
    
    // Reset to first page
    currentPage = 1;
    renderTable();
}

// Render table with current results
function renderTable() {
    const tbody = document.getElementById('results-tbody');
    tbody.innerHTML = '';
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageResults = filteredResults.slice(startIndex, endIndex);
    
    // Populate table
    pageResults.forEach((result, index) => {
        const row = document.createElement('tr');
        const globalIndex = startIndex + index + 1;
        
        row.innerHTML = `
            <td>${globalIndex}</td>
            <td>
                <div class="content-preview">${result.text}</div>
            </td>
            <td>
                <span class="prediction-badge ${result.prediction}">
                    ${result.emoji} ${result.prediction.toUpperCase()}
                </span>
            </td>
            <td>
                <div class="confidence-bar">
                    <div class="confidence-track">
                        <div class="confidence-fill ${result.prediction}" style="width: ${Math.round(result.confidence * 100)}%"></div>
                    </div>
                    <span class="confidence-value">${Math.round(result.confidence * 100)}%</span>
                </div>
            </td>
            <td>
                <div class="table-actions">
                    <button class="action-btn" onclick="viewDetails(${result.id})" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn" onclick="copyText('${result.text.replace(/'/g, "\\'")}')" title="Copy Text">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Update pagination info
    updatePaginationInfo();
}

// Update pagination information
function updatePaginationInfo() {
    const totalPages = Math.ceil(filteredResults.length / itemsPerPage);
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, filteredResults.length);
    
    document.getElementById('showing-count').textContent = `${startItem}-${endItem}`;
    document.getElementById('total-count').textContent = filteredResults.length;
    document.getElementById('current-page').textContent = currentPage;
    
    // Update button states
    document.getElementById('prev-btn').disabled = currentPage === 1;
    document.getElementById('next-btn').disabled = currentPage === totalPages || totalPages === 0;
}

// Previous page
function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        renderTable();
    }
}

// Next page
function nextPage() {
    const totalPages = Math.ceil(filteredResults.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderTable();
    }
}

// View details for specific result
function viewDetails(resultId) {
    const result = currentResults.find(r => r.id === resultId);
    if (result) {
        // Create a simple modal or use alert for now
        const details = `
Prediction: ${result.prediction.toUpperCase()} ${result.emoji}
Confidence: ${Math.round(result.confidence * 100)}%
Content: ${result.text}
        `;
        
        alert(details);
    }
}

// Copy text to clipboard
function copyText(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Text copied to clipboard!', 'success');
    }).catch(() => {
        showNotification('Failed to copy text.', 'error');
    });
}

// Export results
function exportResults(format) {
    if (currentResults.length === 0) {
        showNotification('No results to export.', 'warning');
        return;
    }
    
    let exportData, blob, filename;
    
    switch (format) {
        case 'json':
            exportData = currentResults.map(item => ({
                id: item.id,
                prediction: item.prediction,
                confidence: Math.round(item.confidence * 100) + '%',
                content: item.text
            }));
            blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            filename = `truthguard-analysis-${Date.now()}.json`;
            break;
            
        case 'csv':
            const headers = ['ID', 'Prediction', 'Confidence', 'Content'];
            const csvRows = currentResults.map(item => [
                item.id,
                item.prediction,
                Math.round(item.confidence * 100) + '%',
                `"${item.text.replace(/"/g, '""')}"`
            ]);
            const csv = [headers, ...csvRows].map(row => row.join(',')).join('\n');
            blob = new Blob([csv], { type: 'text/csv' });
            filename = `truthguard-analysis-${Date.now()}.csv`;
            break;
            
        case 'excel':
            showNotification('Excel export feature coming soon!', 'info');
            return;
            
        case 'report':
            showNotification('PDF report generation coming soon!', 'info');
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

// Download sample files
function downloadSample(type) {
    let content, filename;
    
    if (type === 'csv') {
        content = `text
"New study from Harvard University shows promising results in cancer research with a 45% improvement in survival rates."
"BREAKING: Shocking secret about COVID vaccines they don't want you to know! Must see before it gets deleted!"
"According to official reports, the economic growth has exceeded expectations this quarter with a 3.2% increase in GDP."
"Amazing trick that makes doctors rich! They're hiding this simple secret from the public for years."
"The United Nations has announced new climate targets following the latest IPCC report on global warming trends."`;
        filename = 'sample-news-data.csv';
    } else {
        content = `New study from Harvard University shows promising results in cancer research with a 45% improvement in survival rates. The research was conducted over three years and involved rigorous peer review.

BREAKING: Shocking secret about COVID vaccines they don't want you to know! Must see before it gets deleted! This information is being suppressed by mainstream media.

According to official reports, the economic growth has exceeded expectations this quarter with a 3.2% increase in GDP. Experts attribute this growth to increased consumer spending and business investments.

Amazing trick that makes doctors rich! They're hiding this simple secret from the public for years. You won't believe what happens next!

The United Nations has announced new climate targets following the latest IPCC report on global warming trends. The new targets aim to reduce carbon emissions by 50% by 2030.`;
        filename = 'sample-news-data.txt';
    }
    
    const blob = new Blob([content], { type: type === 'csv' ? 'text/csv' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification(`Sample ${type.toUpperCase()} file downloaded!`, 'success');
}

// Loading overlay functions
function showLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    const progressFill = document.getElementById('progress-fill');
    
    progressFill.style.width = '0%';
    overlay.style.display = 'flex';
    
    // Simulate progress
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 85) {
            clearInterval(interval);
            progressFill.style.width = '85%';
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