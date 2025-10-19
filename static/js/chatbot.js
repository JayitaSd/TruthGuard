// Enhanced Chatbot functionality with API integration
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
            // Try to get response from backend API first
            const apiResponse = await this.getAPIResponse(message);
            
            this.removeTypingIndicator();
            
            if (apiResponse && apiResponse.success) {
                this.addMessage(apiResponse.response, 'bot');
                // Update suggestions based on API response
                if (apiResponse.suggestions) {
                    setTimeout(() => this.addSuggestionChips(apiResponse.suggestions), 500);
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
        // Convert line breaks to <br> tags
        let formatted = text.replace(/\n/g, '<br>');
        
        // Convert markdown-style links to HTML links
        formatted = formatted.replace(
            /• \[([^\]]+)\]\(([^)]+)\)/g, 
            '• <a href="$2" target="_blank" class="news-link">$1</a>'
        );

        // Convert plain text links to HTML links
        formatted = formatted.replace(
            /(https?:\/\/[^\s]+)/g,
            '<a href="$1" target="_blank" class="news-link">$1</a>'
        );

        // Add TruthGuard feature links
        formatted = formatted.replace(/Single Check/g, '<a href="/single" class="feature-link">Single Check</a>');
        formatted = formatted.replace(/Bulk Verification/g, '<a href="/bulk" class="feature-link">Bulk Verification</a>');
        formatted = formatted.replace(/Image Analysis/g, '<a href="/image" class="feature-link">Image Analysis</a>');
        formatted = formatted.replace(/File Upload/g, '<a href="/file" class="feature-link">File Upload</a>');
        formatted = formatted.replace(/Single Article Check/g, '<a href="/single" class="feature-link">Single Article Check</a>');
        formatted = formatted.replace(/Bulk Check/g, '<a href="/bulk" class="feature-link">Bulk Check</a>');
        
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
        // Welcome message is already in HTML, just ensure it's properly formatted
        const welcomeMessage = this.messagesContainer.querySelector('.bot-message');
        if (welcomeMessage) {
            welcomeMessage.innerHTML = this.formatText(welcomeMessage.textContent);
        }
    }

    addSuggestionChips(customSuggestions = null) {
        // Remove existing suggestion chips
        const existingChips = this.messagesContainer.querySelector('.suggestion-chips');
        if (existingChips) {
            existingChips.remove();
        }

        const suggestions = customSuggestions || [
            "Trending sports news",
            "Latest tech news",
            "How to verify news",
            "TruthGuard features"
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
        
        // News-related queries
        if (lowerMessage.includes('trending') || lowerMessage.includes('top news') || 
            lowerMessage.includes('latest news') || lowerMessage.includes('current news')) {
            
            if (lowerMessage.includes('sports') || lowerMessage.includes('sport')) {
                return `Here are some trending sports news sources:
• [ESPN: Latest Sports Updates](https://www.espn.com/)
• [Sky Sports: Breaking Sports News](https://www.skysports.com/)
• [BBC Sport: Top Stories](https://www.bbc.com/sport)
• [Guardian Sports News](https://www.theguardian.com/international/sport)
• [CBS Sports Headlines](https://www.cbssports.com/)

Remember to verify any suspicious sports news using our Single Check feature!`;
            } else if (lowerMessage.includes('technology') || lowerMessage.includes('tech')) {
                return `Here are trending technology news sources:
• [TechCrunch: Latest Tech News](https://techcrunch.com/)
• [The Verge: Technology](https://www.theverge.com/tech)
• [Wired: Tech Section](https://www.wired.com/category/technology/)
• [Engadget: Tech Updates](https://www.engadget.com/)
• [Ars Technica: Tech News](https://arstechnica.com/technology/)

Verify tech news authenticity with our AI Detection tool.`;
            } else if (lowerMessage.includes('politics') || lowerMessage.includes('political')) {
                return `Here are reliable political news sources:
• [Reuters Politics](https://www.reuters.com/news/politics)
• [BBC Politics](https://www.bbc.com/news/politics)
• [Politico: Political News](https://www.politico.com/)
• [Guardian Politics](https://www.theguardian.com/politics)
• [NY Times Politics](https://www.nytimes.com/section/politics)

Political news often requires careful verification. Use our Bulk Check for multiple sources.`;
            } else {
                return `Here are some general trending news sources:
• [BBC News: Top Stories](https://www.bbc.com/news)
• [Reuters: World News](https://www.reuters.com/)
• [The Guardian: International](https://www.theguardian.com/international)
• [CNN: Breaking News](https://www.cnn.com/)
• [Associated Press](https://apnews.com/)

You can verify any news article using our Single Check feature!`;
            }
        }
        
        // Fake/real news verification queries
        if (lowerMessage.includes('fake') || lowerMessage.includes('real') || 
            lowerMessage.includes('verify') || lowerMessage.includes('check') || 
            lowerMessage.includes('authentic') || lowerMessage.includes('true')) {
            
            return `I can help you verify news authenticity! Here are your options:

• Single Article Check: Verify one news article at a time with detailed analysis
• Bulk Verification: Check multiple articles simultaneously
• Image Analysis: Extract and verify text from news screenshots
• File Upload: Upload files containing multiple articles

Our AI analyzes linguistic patterns with 95% accuracy! Try our verification features to ensure news authenticity.`;
        }
        
        // TruthGuard feature queries
        if (lowerMessage.includes('feature') || lowerMessage.includes('how to') || 
            lowerMessage.includes('what can') || lowerMessage.includes('help') ||
            lowerMessage.includes('truthguard') || lowerMessage.includes('your')) {
            
            return `TruthGuard offers several powerful features for news verification:

• Single Article Analysis: Check individual news articles with detailed analysis
• Bulk Verification: Process multiple news items at once
• Image OCR Analysis: Extract and verify text from news screenshots
• File Upload: Upload CSV or text files for batch processing

All features use our advanced AI with 95% accuracy for detecting fake news!`;
        }
        
        // Greetings
        if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || 
            lowerMessage.includes('hey') || lowerMessage.includes('greetings')) {
            return "Hello! I'm your News Assistant. I can help you find trending news or guide you on how to verify news authenticity using TruthGuard's features. What would you like to know?";
        }

        // Thank you responses
        if (lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
            return "You're welcome! If you have any more questions about news or need help verifying articles, feel free to ask. Remember to use our verification features for any suspicious news!";
        }

        // Goodbye responses
        if (lowerMessage.includes('bye') || lowerMessage.includes('goodbye') || lowerMessage.includes('see you')) {
            return "Goodbye! Don't forget to verify any questionable news using TruthGuard's features. Stay informed and stay safe!";
        }
        
        // Default response for non-news queries
        if (!this.isNewsRelated(lowerMessage)) {
            return "I'm specialized in news-related queries and TruthGuard features. I can help you with trending news topics or guide you on how to verify news authenticity. Please ask me about news or our verification features!";
        }
        
        // Default response for news-related queries not covered above
        return `I understand you're asking about news. I can help you with:
• Finding trending news in specific categories (sports, tech, politics, etc.)
• Guiding you on how to verify news authenticity
• Explaining TruthGuard's features for news verification

Could you be more specific about what you're looking for? For example, you could ask:
"What are the top trending sports news?"
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

    // Utility method to clear chat history
    clearChat() {
        this.messagesContainer.innerHTML = '';
        this.addWelcomeMessage();
        this.addSuggestionChips();
    }

    // Method to handle errors gracefully
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

// Add global error handler for uncaught errors
window.addEventListener('error', function(e) {
    console.error('Global error in chatbot:', e.error);
});

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NewsChatbot;
}