// /**
//  * Smart Student Hub - Utility Functions
//  * Collection of common utility functions used throughout the application
//  */

// class Utils {
//     // API Configuration
//     static API_BASE_URL = 'http://localhost:8000/api';
    
//     // Local Storage Keys
//     static STORAGE_KEYS = {
//         TOKEN: 'ssh_token',
//         USER: 'ssh_user',
//         PREFERENCES: 'ssh_preferences'
//     };

//     /**
//      * Make HTTP requests with automatic token handling
//      */
//     static async makeRequest(endpoint, options = {}) {
//         const url = `${this.API_BASE_URL}${endpoint}`;
//         const token = localStorage.getItem(this.STORAGE_KEYS.TOKEN);
        
//         const defaultOptions = {
//             headers: {
//                 'Content-Type': 'application/json',
//                 'Accept': 'application/json',
//                 ...(token && { 'Authorization': `Bearer ${token}` }),
//                 ...options.headers
//             }
//         };

//         const mergedOptions = { ...defaultOptions, ...options };
        
//         try {
//             const response = await fetch(url, mergedOptions);
            
//             // Handle authentication errors
//             if (response.status === 401) {
//                 this.handleAuthError();
//                 throw new Error('Authentication required');
//             }
            
//             // Handle other errors
//             if (!response.ok) {
//                 const errorData = await response.json().catch(() => ({}));
//                 throw new Error(errorData.message || `HTTP ${response.status}`);
//             }
            
//             return await response.json();
//         } catch (error) {
//             console.error('API Request failed:', error);
//             throw error;
//         }
//     }

//     /**
//      * Handle authentication errors **/
// }


/**
 * Smart Student Hub - Utility Functions
 * Collection of common utility functions used throughout the application
 */

class Utils {
    // API Configuration
    static API_BASE_URL = 'http://localhost:8000/api';
    
    // Local Storage Keys
    static STORAGE_KEYS = {
        TOKEN: 'ssh_token',
        USER: 'ssh_user',
        PREFERENCES: 'ssh_preferences'
    };

    /**
     * Make HTTP requests with automatic token handling
     */
    static async makeRequest(endpoint, options = {}) {
        const url = `${this.API_BASE_URL}${endpoint}`;
        const token = localStorage.getItem(this.STORAGE_KEYS.TOKEN);
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
                ...options.headers
            }
        };

        const mergedOptions = { ...defaultOptions, ...options };
        
        try {
            const response = await fetch(url, mergedOptions);
            
            // Handle authentication errors
            if (response.status === 401) {
                this.handleAuthError();
                throw new Error('Authentication required');
            }
            
            // Handle other errors
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    /**
     * Handle authentication errors
     */
    static handleAuthError() {
        localStorage.removeItem(this.STORAGE_KEYS.TOKEN);
        localStorage.removeItem(this.STORAGE_KEYS.USER);
        window.location.href = 'index.html';
    }

    /**
     * Format date to readable string
     */
    static formatDate(dateString, options = {}) {
        const date = new Date(dateString);
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            ...options
        };
        return date.toLocaleDateString('en-IN', defaultOptions);
    }

    /**
     * Format relative time (e.g., "2 hours ago")
     */
    static formatRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMs = now - date;
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
        const diffInHours = Math.floor(diffInMinutes / 60);
        const diffInDays = Math.floor(diffInHours / 24);

        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
        if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
        if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
        
        return this.formatDate(dateString);
    }

    /**
     * Debounce function execution
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Throttle function execution
     */
    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Validate email format
     */
    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validate password strength
     */
    static validatePassword(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        return {
            isValid: password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers,
            criteria: {
                minLength: password.length >= minLength,
                hasUpperCase,
                hasLowerCase,
                hasNumbers,
                hasSpecial
            },
            strength: this.getPasswordStrength(password)
        };
    }

    /**
     * Get password strength level
     */
    static getPasswordStrength(password) {
        let score = 0;
        if (password.length >= 8) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[a-z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
        if (password.length >= 12) score++;

        if (score < 3) return 'weak';
        if (score < 5) return 'medium';
        return 'strong';
    }

    /**
     * Format file size
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Generate unique ID
     */
    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Copy text to clipboard
     */
    static async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.error('Failed to copy text: ', err);
            return false;
        }
    }

    /**
     * Download file
     */
    static downloadFile(url, filename) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Escape HTML to prevent XSS
     */
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Parse URL parameters
     */
    static getUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const result = {};
        for (let [key, value] of params) {
            result[key] = value;
        }
        return result;
    }

    /**
     * Store data in localStorage with expiration
     */
    static setWithExpiry(key, value, ttl) {
        const now = new Date();
        const item = {
            value: value,
            expiry: now.getTime() + ttl,
        };
        localStorage.setItem(key, JSON.stringify(item));
    }

    /**
     * Get data from localStorage with expiration check
     */
    static getWithExpiry(key) {
        const itemStr = localStorage.getItem(key);
        if (!itemStr) return null;

        try {
            const item = JSON.parse(itemStr);
            const now = new Date();
            
            if (now.getTime() > item.expiry) {
                localStorage.removeItem(key);
                return null;
            }
            
            return item.value;
        } catch (error) {
            localStorage.removeItem(key);
            return null;
        }
    }

    /**
     * Check if user is authenticated
     */
    static isAuthenticated() {
        const token = localStorage.getItem(this.STORAGE_KEYS.TOKEN);
        const user = localStorage.getItem(this.STORAGE_KEYS.USER);
        return !!(token && user);
    }

    /**
     * Get current user data
     */
    static getCurrentUser() {
        const userStr = localStorage.getItem(this.STORAGE_KEYS.USER);
        return userStr ? JSON.parse(userStr) : null;
    }

    /**
     * Show/hide loading overlay
     */
    static showLoading(message = 'Loading...') {
        const overlay = document.getElementById('loadingOverlay');
        const text = document.getElementById('loadingText');
        if (overlay) {
            if (text) text.textContent = message;
            overlay.classList.add('show');
        }
    }

    static hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.classList.remove('show');
    }

    /**
     * Smooth scroll to element
     */
    static scrollToElement(selector, offset = 0) {
        const element = document.querySelector(selector);
        if (element) {
            const top = element.offsetTop - offset;
            window.scrollTo({
                top: top,
                behavior: 'smooth'
            });
        }
    }

    /**
     * Check if element is in viewport
     */
    static isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    /**
     * Initialize tooltips
     */
    static initTooltips() {
        const tooltips = document.querySelectorAll('[data-tooltip]');
        tooltips.forEach(element => {
            element.addEventListener('mouseenter', this.showTooltip.bind(this));
            element.addEventListener('mouseleave', this.hideTooltip.bind(this));
        });
    }

    static showTooltip(event) {
        const element = event.target;
        const text = element.getAttribute('data-tooltip');
        
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = text;
        document.body.appendChild(tooltip);
        
        const rect = element.getBoundingClientRect();
        tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
        tooltip.style.top = rect.top - tooltip.offsetHeight - 8 + 'px';
        
        element._tooltip = tooltip;
    }

    static hideTooltip(event) {
        const element = event.target;
        if (element._tooltip) {
            document.body.removeChild(element._tooltip);
            element._tooltip = null;
        }
    }
}

// Export for use in other modules
window.Utils = Utils;
