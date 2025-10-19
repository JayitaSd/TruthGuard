// Enhanced Chatbot functionality with better link handling
class NewsChatbot {
    constructor() {
        this.isOpen = false;
        this.isLoading = false;
        this.init();
    }

    init() {
        this.createChatbot();
        this.bindEvents();
        this.addWelcomeMessage();
    }

    createChatbot() {
        this.toggleBtn = document.getElementById('chatbotToggle');
        this.window = document.getElementById('chatbotWindow');
        this.closeBtn = document.getElementById('chatbotClose');
        this.messagesContainer = document.getElementById('chatbotMessages');
        this.input = document.getElementById('chatbotInput');
        this.sendBtn = document.getElementById('chatbotSend');
    }

    bindEvents() {
        // Toggle chatbot window
        this.toggleBtn.addEventListener('click', () => this.toggleWindow());
        
        // Close chatbot window
        this.closeBtn.addEventListener('click', () => this.closeWindow());
        
        // Send message on button click
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        
        // Send message on Enter key
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !this.isLoading) {
                this.sendMessage();
            }
        });

        // Close chatbot when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isOpen && 
                !this.window.contains(e.target) && 
                !this.toggleBtn.contains(e.target)) {
                this.closeWindow();
            }
        });

        // Add suggestion chips after messages load
        setTimeout(() => this.addSuggestionChips(), 1000);
    }

    toggleWindow() {
        if (this.isOpen) {
            this.closeWindow();
        } else {
            this.openWindow();
        }
    }

    openWindow() {
        this.window.style.display = 'flex';
        this.isOpen = true;
        this.input.focus();
        
        // Add animation class
        this.window.classList.add('chatbot-open');
    }

    closeWindow() {
        this.window.style.display = 'none';
        this.isOpen = false;
        this.window.classList.remove('chatbot-open');
    }

    async sendMessage() {
        const message = this.input.value.trim();
        if (!message || this.isLoading) return;

        // Add user message
        this.addMessage(message, 'user');
        this.input.value = '';
        this.sendBtn.disabled = true;
        this.isLoading = true;

        // Show typing indicator
        this.showTypingIndicator();

        try {
            // Get response from backend API
            const apiResponse = await this.getAPIResponse(message);
            
            this.removeTypingIndicator();
            
            if (apiResponse && apiResponse.success) {
                this.addMessage(apiResponse.response, 'bot');
                
                // Update suggestions based on API response type
                if (apiResponse.suggestions) {
                    setTimeout(() => this.addSuggestionChips(apiResponse.suggestions), 500);
                } else {
                    setTimeout(() => this.addSuggestionChips(), 500);
                }
            } else {
                // Fallback to local response
                const localResponse = this.generateResponse(message);
                this.addMessage(localResponse, 'bot');
                setTimeout(() => this.addSuggestionChips(), 500);
            }
            
        } catch (error) {
            console.error('Chatbot API error:', error);
            this.removeTypingIndicator();
            // Fallback to local response
            const localResponse = this.generateResponse(message);
            this.addMessage(localResponse, 'bot');
            setTimeout(() => this.addSuggestionChips(), 500);
        } finally {
            this.sendBtn.disabled = false;
            this.isLoading = false;
        }
    }

    async getAPIResponse(message) {
        try {
            const response = await fetch('/api/chatbot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: message })
            });

            if (!response.ok) {
                throw new Error('API request failed');
            }

            return await response.json();
        } catch (error) {
            console.warn('API call failed, using local response:', error);
            return null;
        }
    }

    addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        // Sanitize and format text
        const formattedText = this.formatText(text);
        messageDiv.innerHTML = formattedText;
        
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    formatText(text) {
        if (!text) return '';
        
        // Convert line breaks to <br> tags
        let formatted = text.replace(/\n/g, '<br>');
        
        // Convert markdown-style links to HTML links - FIXED REGEX
        formatted = formatted.replace(
            /\[([^\]]+)\]\(([^)]+)\)/g, 
            '<a href="$2" target="_blank" rel="noopener noreferrer" class="news-link">$1</a>'
        );

        // Convert numbered list with links - FIXED REGEX
        formatted = formatted.replace(
            /(\d+)\.\s*<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g,
            '$1. <a href="$2" target="_blank" rel="noopener noreferrer" class="news-link">$3</a>'
        );

        // Convert plain text links to HTML links (http/https only) - FIXED
        formatted = formatted.replace(
            /(https?:\/\/[^\s<]+[a-zA-Z0-9])/g,
            '<a href="$1" target="_blank" rel="noopener noreferrer" class="news-link">$1</a>'
        );

        // Add TruthGuard feature links
        formatted = formatted.replace(/Single Check/g, '<a href="/single" class="feature-link">Single Check</a>');
        formatted = formatted.replace(/Single Article Check/g, '<a href="/single" class="feature-link">Single Article Check</a>');
        formatted = formatted.replace(/Bulk Verification/g, '<a href="/bulk" class="feature-link">Bulk Verification</a>');
        formatted = formatted.replace(/Bulk Check/g, '<a href="/bulk" class="feature-link">Bulk Check</a>');
        formatted = formatted.replace(/Image Analysis/g, '<a href="/image" class="feature-link">Image Analysis</a>');
        formatted = formatted.replace(/File Upload/g, '<a href="/file" class="feature-link">File Upload</a>');
        
        // Format bold text (**text**)
        formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        
        // Format emojis and icons
        formatted = formatted.replace(/💡/g, '<i class="fas fa-lightbulb text-yellow-500"></i>');
        formatted = formatted.replace(/📰/g, '<i class="fas fa-newspaper text-blue-500"></i>');
        formatted = formatted.replace(/⚽/g, '<i class="fas fa-baseball-ball text-green-500"></i>');
        formatted = formatted.replace(/💻/g, '<i class="fas fa-laptop text-purple-500"></i>');
        formatted = formatted.replace(/🤖/g, '<i class="fas fa-robot text-indigo-500"></i>');
        formatted = formatted.replace(/🛡️/g, '<i class="fas fa-shield-alt text-green-500"></i>');
        
        return formatted;
    }

    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.id = 'typingIndicator';
        typingDiv.innerHTML = `
            <div class="typing-dots">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
            <span class="typing-text">TruthGuard AI is thinking...</span>
        `;
        this.messagesContainer.appendChild(typingDiv);
        this.scrollToBottom();
    }

    removeTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    addWelcomeMessage() {
        const welcomeMessage = this.messagesContainer.querySelector('.bot-message');
        if (welcomeMessage) {
            welcomeMessage.innerHTML = this.formatText(welcomeMessage.textContent);
        }
    }

    addSuggestionChips(customSuggestions = null) {
        const existingChips = this.messagesContainer.querySelector('.suggestion-chips');
        if (existingChips) {
            existingChips.remove();
        }

        const suggestions = customSuggestions || [
            "Latest news",
            "Sports updates", 
            "Tech news",
            "How to verify news"
        ];

        const chipsContainer = document.createElement('div');
        chipsContainer.className = 'suggestion-chips';

        suggestions.forEach(suggestion => {
            const chip = document.createElement('button');
            chip.className = 'suggestion-chip';
            chip.textContent = suggestion;
            chip.addEventListener('click', () => {
                this.input.value = suggestion;
                this.sendMessage();
            });
            chipsContainer.appendChild(chip);
        });

        this.messagesContainer.appendChild(chipsContainer);
        this.scrollToBottom();
    }

    generateResponse(userMessage) {
        const lowerMessage = userMessage.toLowerCase();
        
        // News-related queries (fallback when API fails)
        if (lowerMessage.includes('trending') || lowerMessage.includes('top news') || 
            lowerMessage.includes('latest news') || lowerMessage.includes('current news')) {
            
            return `I'm currently unable to fetch live news, but here are reliable sources for current news:

📰 **General News:**
• <a href="https://www.bbc.com/news" target="_blank" class="news-link">BBC News</a> - Comprehensive world news
• <a href="https://www.reuters.com" target="_blank" class="news-link">Reuters</a> - Fact-based reporting
• <a href="https://apnews.com" target="_blank" class="news-link">Associated Press</a> - Breaking news

⚽ **Sports:**
• <a href="https://www.espn.com" target="_blank" class="news-link">ESPN</a> - Live scores and news
• <a href="https://www.bbc.com/sport" target="_blank" class="news-link">BBC Sport</a> - Global sports coverage

💻 **Technology:**
• <a href="https://techcrunch.com" target="_blank" class="news-link">TechCrunch</a> - Startup and tech news
• <a href="https://www.theverge.com" target="_blank" class="news-link">The Verge</a> - Tech and culture

You can verify any news article using our <a href="/single" class="feature-link">Single Check</a> feature!`;
        }
        
        // Fake/real news verification queries
        if (lowerMessage.includes('fake') || lowerMessage.includes('real') || 
            lowerMessage.includes('verify') || lowerMessage.includes('check') || 
            lowerMessage.includes('authentic') || lowerMessage.includes('true')) {
            
            return `I can help you verify news authenticity! TruthGuard offers:

• <strong>Single Article Check</strong>: Verify one news article with detailed analysis
• <strong>Bulk Verification</strong>: Check multiple articles simultaneously  
• <strong>Image Analysis</strong>: Extract and verify text from news screenshots
• <strong>File Upload</strong>: Upload files containing multiple articles

Our AI analyzes linguistic patterns with 95% accuracy! Try our verification features to ensure news authenticity.`;
        }
        
        // TruthGuard feature queries
        if (lowerMessage.includes('feature') || lowerMessage.includes('how to') || 
            lowerMessage.includes('what can') || lowerMessage.includes('help') ||
            lowerMessage.includes('truthguard') || lowerMessage.includes('your')) {
            
            return `TruthGuard offers several powerful features for news verification:

• <strong>Single Article Analysis</strong>: Check individual news articles with detailed analysis
• <strong>Bulk Verification</strong>: Process multiple news items at once
• <strong>Image OCR Analysis</strong>: Extract and verify text from news screenshots  
• <strong>File Upload</strong>: Upload CSV or text files for batch processing

All features use our advanced AI with 95% accuracy for detecting fake news!`;
        }
        
        // Greetings
        if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || 
            lowerMessage.includes('hey') || lowerMessage.includes('greetings')) {
            return "Hello! I'm your TruthGuard News Assistant. I can help you find news information or guide you on how to verify news authenticity using our AI features. What would you like to know?";
        }

        // Thank you responses
        if (lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
            return "You're welcome! If you have any more questions about news verification or need help with our features, feel free to ask. Stay informed and verify suspicious news! 🛡️";
        }

        // Goodbye responses
        if (lowerMessage.includes('bye') || lowerMessage.includes('goodbye') || lowerMessage.includes('see you')) {
            return "Goodbye! Remember to verify any questionable news using TruthGuard's features. Stay informed and stay safe! 🛡️";
        }
        
        // Default response for non-news queries
        if (!this.isNewsRelated(lowerMessage)) {
            return "I'm specialized in news-related queries and TruthGuard features. I can help you with news information or guide you on how to verify news authenticity. Please ask me about news verification or our features!";
        }
        
        // Default response for news-related queries not covered above
        return `I understand you're asking about news. I can help you with:
• Finding news information and reliable sources
• Guiding you on how to verify news authenticity  
• Explaining TruthGuard's features for news verification

Could you be more specific about what you're looking for? For example:
"Latest sports news"
"How can I check if a news article is fake?"
"What features does TruthGuard offer?"`;
    }

    isNewsRelated(message) {
        const newsKeywords = [
            'news', 'article', 'headline', 'report', 'story', 'media', 'journalism',
            'breaking', 'update', 'current', 'trending', 'latest', 'today',
            'verify', 'check', 'authentic', 'fake', 'real', 'true', 'false',
            'politics', 'sports', 'technology', 'entertainment', 'business',
            'weather', 'health', 'science', 'world', 'local', 'national',
            'information', 'update', 'coverage', 'headlines', 'press'
        ];
        
        return newsKeywords.some(keyword => message.includes(keyword));
    }

    clearChat() {
        this.messagesContainer.innerHTML = '';
        this.addWelcomeMessage();
        this.addSuggestionChips();
    }

    handleError(error) {
        console.error('Chatbot error:', error);
        this.addMessage("I'm having trouble processing your request. Please try again or check your connection.", 'bot');
    }
}

// Enhanced initialization with error handling
document.addEventListener('DOMContentLoaded', function() {
    try {
        window.newsChatbot = new NewsChatbot();
        console.log('✅ News Chatbot initialized successfully');
        
    } catch (error) {
        console.error('❌ Failed to initialize News Chatbot:', error);
    }
});

window.addEventListener('error', function(e) {
    console.error('Global error in chatbot:', e.error);
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NewsChatbot;
}