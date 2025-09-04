/**
 * Smart Student Hub - Authentication Module
 * Handles user authentication, registration, and session management
 */

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.token = null;
        this.init();
    }

    init() {
        this.loadStoredAuth();
        this.setupEventListeners();
    }

    loadStoredAuth() {
        this.token = localStorage.getItem(Utils.STORAGE_KEYS.TOKEN);
        const userStr = localStorage.getItem(Utils.STORAGE_KEYS.USER);
        this.currentUser = userStr ? JSON.parse(userStr) : null;
    }

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
        }

        // Register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', this.handleRegister.bind(this));
        }

        // Password confirmation
        const confirmPassword = document.getElementById('confirmPassword');
        if (confirmPassword) {
            confirmPassword.addEventListener('input', this.validatePasswordMatch.bind(this));
        }

        // Real-time validation
        const passwordField = document.getElementById('registerPassword');
        if (passwordField) {
            passwordField.addEventListener('input', this.validatePasswordStrength.bind(this));
        }

        // Email validation
        const emailFields = document.querySelectorAll('input[type="email"]');
        emailFields.forEach(field => {
            field.addEventListener('blur', this.validateEmailField.bind(this));
        });
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const email = formData.get('email');
        const password = formData.get('password');
        const remember = formData.get('remember');

        if (!this.validateLoginForm(email, password)) {
            return;
        }

        try {
            Utils.showLoading('Signing you in...');
            
            const response = await Utils.makeRequest('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });

            this.handleLoginSuccess(response, remember);
            
        } catch (error) {
            this.handleAuthError(error.message);
        } finally {
            Utils.hideLoading();
        }
    }

    async handleRegister(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const userData = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            studentId: formData.get('studentId'),
            email: formData.get('email'),
            password: formData.get('password'),
            confirmPassword: formData.get('confirmPassword'),
            institutionId: formData.get('institutionId'),
            department: formData.get('department'),
            yearOfStudy: formData.get('yearOfStudy')
        };

        if (!this.validateRegisterForm(userData)) {
            return;
        }

        try {
            Utils.showLoading('Creating your account...');
            
            const response = await Utils.makeRequest('/auth/register', {
                method: 'POST',
                body: JSON.stringify(userData)
            });

            this.handleLoginSuccess(response);
            NotificationManager.showNotification(
                'Account created successfully! Welcome to Smart Student Hub.',
                'success'
            );
            
        } catch (error) {
            this.handleAuthError(error.message);
        } finally {
            Utils.hideLoading();
        }
    }

    validateLoginForm(email, password) {
        if (!email || !password) {
            NotificationManager.showNotification('Please fill in all fields', 'error');
            return false;
        }

        if (!Utils.validateEmail(email)) {
            NotificationManager.showNotification('Please enter a valid email address', 'error');
            return false;
        }

        return true;
    }

    validateRegisterForm(userData) {
        const { firstName, lastName, studentId, email, password, confirmPassword } = userData;

        // Required fields
        if (!firstName || !lastName || !studentId || !email || !password) {
            NotificationManager.showNotification('Please fill in all required fields', 'error');
            return false;
        }

        // Email validation
        if (!Utils.validateEmail(email)) {
            NotificationManager.showNotification('Please enter a valid email address', 'error');
            return false;
        }

        // Password validation
        const passwordValidation = Utils.validatePassword(password);
        if (!passwordValidation.isValid) {
            NotificationManager.showNotification(
                'Password must be at least 8 characters with uppercase, lowercase, and numbers',
                'error'
            );
            return false;
        }

        // Password confirmation
        if (password !== confirmPassword) {
            NotificationManager.showNotification('Passwords do not match', 'error');
            return false;
        }

        return true;
    }

    validatePasswordMatch() {
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const confirmField = document.getElementById('confirmPassword');

        if (confirmPassword && password !== confirmPassword) {
            confirmField.setCustomValidity('Passwords do not match');
            confirmField.classList.add('invalid');
        } else {
            confirmField.setCustomValidity('');
            confirmField.classList.remove('invalid');
        }
    }

    validatePasswordStrength() {
        const password = document.getElementById('registerPassword').value;
        const validation = Utils.validatePassword(password);
        
        // Update password strength indicator if it exists
        const strengthIndicator = document.getElementById('passwordStrength');
        if (strengthIndicator) {
            strengthIndicator.className = `password-strength ${validation.strength}`;
            strengthIndicator.textContent = `Password strength: ${validation.strength}`;
        }
    }

    validateEmailField(event) {
        const email = event.target.value;
        const field = event.target;

        if (email && !Utils.validateEmail(email)) {
            field.setCustomValidity('Please enter a valid email address');
            field.classList.add('invalid');
        } else {
            field.setCustomValidity('');
            field.classList.remove('invalid');
        }
    }

    handleLoginSuccess(response, remember = false) {
        const { token, user } = response;
        
        this.token = token;
        this.currentUser = user;
        
        // Store authentication data
        localStorage.setItem(Utils.STORAGE_KEYS.TOKEN, token);
        localStorage.setItem(Utils.STORAGE_KEYS.USER, JSON.stringify(user));
        
        // Set token expiration if remember is not checked
        if (!remember) {
            Utils.setWithExpiry(Utils.STORAGE_KEYS.TOKEN, token, 24 * 60 * 60 * 1000); // 24 hours
        }

        // Redirect to dashboard
        this.redirectToDashboard();
    }

    handleAuthError(message) {
        NotificationManager.showNotification(message || 'Authentication failed', 'error');
    }

    async logout() {
        try {
            // Call logout endpoint if token exists
            if (this.token) {
                await Utils.makeRequest('/auth/logout', {
                    method: 'POST'
                });
            }
        } catch (error) {
            console.error('Logout API call failed:', error);
        } finally {
            // Clear stored data regardless of API call result
            this.clearAuthData();
            this.redirectToLogin();
        }
    }

    clearAuthData() {
        this.token = null;
        this.currentUser = null;
        localStorage.removeItem(Utils.STORAGE_KEYS.TOKEN);
        localStorage.removeItem(Utils.STORAGE_KEYS.USER);
        localStorage.removeItem(Utils.STORAGE_KEYS.PREFERENCES);
    }

    redirectToDashboard() {
        // Hide any open modals
        this.hideAllModals();
        
        // Redirect based on current page
        if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
            window.location.href = 'dashboard.html';
        } else {
            // If already on a dashboard page, reload to update user data
            window.location.reload();
        }
    }

    redirectToLogin() {
        // If on a protected page, redirect to index
        const protectedPages = ['dashboard.html', 'activities.html', 'portfolio.html', 'analytics.html'];
        const currentPage = window.location.pathname.split('/').pop();
        
        if (protectedPages.includes(currentPage)) {
            window.location.href = 'index.html';
        }
    }

    checkAuthStatus() {
        const isAuthenticated = Utils.isAuthenticated();
        const currentPage = window.location.pathname.split('/').pop();
        const protectedPages = ['dashboard.html', 'activities.html', 'portfolio.html', 'analytics.html'];
        
        if (protectedPages.includes(currentPage) && !isAuthenticated) {
            this.redirectToLogin();
            return false;
        }
        
        if (currentPage === 'index.html' && isAuthenticated) {
            this.redirectToDashboard();
            return false;
        }
        
        return true;
    }

    hideAllModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => modal.classList.remove('show'));
    }

    // Public methods for UI components
    isLoggedIn() {
        return !!(this.token && this.currentUser);
    }

    getCurrentUser() {
        return this.currentUser;
    }

    getToken() {
        return this.token;
    }

    async updateProfile(profileData) {
        try {
            Utils.showLoading('Updating profile...');
            
            const response = await Utils.makeRequest('/auth/profile', {
                method: 'PUT',
                body: JSON.stringify(profileData)
            });

            // Update stored user data
            this.currentUser = { ...this.currentUser, ...response.user };
            localStorage.setItem(Utils.STORAGE_KEYS.USER, JSON.stringify(this.currentUser));
            
            NotificationManager.showNotification('Profile updated successfully', 'success');
            return response;
            
        } catch (error) {
            NotificationManager.showNotification(error.message, 'error');
            throw error;
        } finally {
            Utils.hideLoading();
        }
    }

    async changePassword(currentPassword, newPassword) {
        try {
            Utils.showLoading('Changing password...');
            
            await Utils.makeRequest('/auth/change-password', {
                method: 'POST',
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });

            NotificationManager.showNotification('Password changed successfully', 'success');
            
        } catch (error) {
            NotificationManager.showNotification(error.message, 'error');
            throw error;
        } finally {
            Utils.hideLoading();
        }
    }
}

// Modal management functions
function showLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function hideLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

function showRegisterModal() {
    const modal = document.getElementById('registerModal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function hideRegisterModal() {
    const modal = document.getElementById('registerModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

function switchToRegister() {
    hideLoginModal();
    showRegisterModal();
}

function switchToLogin() {
    hideRegisterModal();
    showLoginModal();
}

// Initialize authentication manager
const authManager = new AuthManager();

// Export for use in other modules
window.AuthManager = authManager;
window.showLoginModal = showLoginModal;
window.hideLoginModal = hideLoginModal;
window.showRegisterModal = showRegisterModal;
window.hideRegisterModal = hideRegisterModal;
window.switchToRegister = switchToRegister;
window.switchToLogin = switchToLogin;
