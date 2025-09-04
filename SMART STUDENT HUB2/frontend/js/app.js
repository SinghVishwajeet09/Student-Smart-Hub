/**
 * Smart Student Hub - Main Application
 * Central initialization and page management
 */

class SmartStudentHubApp {
    constructor() {
        this.currentUser = null;
        this.currentPage = null;
        this.isLoading = false;
        this.init();
    }

    init() {
        this.currentPage = this.getCurrentPageName();
        this.setupGlobalEventListeners();
        this.loadComponents();
        this.initializeManagers();
        this.setupPageSpecificFeatures();
    }

    getCurrentPageName() {
        const path = window.location.pathname;
        const page = path.split('/').pop().split('.')[0];
        return page === '' || page === 'index' ? 'home' : page;
    }

    async loadComponents() {
        try {
            // Only load components if containers exist
            const headerContainer = document.getElementById('headerComponent');
            const footerContainer = document.getElementById('footerComponent');
            const modalsContainer = document.getElementById('modalComponents');

            if (headerContainer) {
                const headerResponse = await fetch('components/header.html');
                const headerHTML = await headerResponse.text();
                headerContainer.innerHTML = headerHTML;
            }

            if (footerContainer) {
                const footerResponse = await fetch('components/footer.html');
                const footerHTML = await footerResponse.text();
                footerContainer.innerHTML = footerHTML;
            }

            if (modalsContainer) {
                const modalsResponse = await fetch('components/modals.html');
                const modalsHTML = await modalsResponse.text();
                modalsContainer.innerHTML = modalsHTML;
            }

            // Initialize components after loading
            this.initializeComponents();

        } catch (error) {
            console.error('Failed to load components:', error);
        }
    }

    initializeComponents() {
        // Set active navigation
        this.setActiveNavigation();
        
        // Load user data in header
        this.updateUserInterface();
        
        // Initialize tooltips
        this.initializeTooltips();
        
        // Setup scroll effects
        this.setupScrollEffects();
    }

    initializeManagers() {
        // Initialize auth manager if not already done
        if (typeof AuthManager !== 'undefined' && !window.authManager) {
            window.authManager = new AuthManager();
        }

        // Initialize notification manager if not already done
        if (typeof NotificationManager !== 'undefined' && !window.notificationManager) {
            window.notificationManager = new NotificationManager();
        }
    }

    setupPageSpecificFeatures() {
        switch (this.currentPage) {
            case 'dashboard':
                this.initializeDashboard();
                break;
            case 'activities':
                this.initializeActivities();
                break;
            case 'portfolio':
                this.initializePortfolio();
                break;
            case 'analytics':
                this.initializeAnalytics();
                break;
            case 'home':
                this.initializeLandingPage();
                break;
            case 'login':
                this.initializeLoginPage();
                break;
        }
    }

    setupGlobalEventListeners() {
        // Handle authentication state changes
        window.addEventListener('authStateChanged', this.handleAuthStateChange.bind(this));
        
        // Handle page visibility changes
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        
        // Handle network status changes
        window.addEventListener('online', this.handleOnlineStatus.bind(this));
        window.addEventListener('offline', this.handleOfflineStatus.bind(this));
        
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
    }

    setActiveNavigation() {
        const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');
        navLinks.forEach(link => {
            link.classList.remove('active');
            const linkPage = link.getAttribute('data-page') || 
                            link.getAttribute('href')?.split('.')[0];
            
            if (linkPage === this.currentPage) {
                link.classList.add('active');
            }
        });
    }

    updateUserInterface() {
        const user = Utils.getCurrentUser();
        if (!user) return;

        // Update user name displays
        const userNameElements = document.querySelectorAll('#userName, #userFullName, #mobileUserName');
        userNameElements.forEach(element => {
            if (element) {
                element.textContent = user.first_name ? 
                    `${user.first_name} ${user.last_name}` : user.email;
            }
        });

        // Update email displays
        const emailElements = document.querySelectorAll('#userEmail, #mobileUserEmail');
        emailElements.forEach(element => {
            if (element) {
                element.textContent = user.email;
            }
        });

        // Update role displays
        const roleElements = document.querySelectorAll('#userRole');
        roleElements.forEach(element => {
            if (element) {
                element.textContent = user.role || 'Student';
            }
        });

        // Update avatar displays
        if (user.profile_image) {
            const avatarElements = document.querySelectorAll('#userAvatar, #userAvatarLarge, #mobileUserAvatar');
            avatarElements.forEach(element => {
                if (element) {
                    element.src = user.profile_image;
                }
            });
        }
    }

    initializeDashboard() {
        console.log('Initializing dashboard features...');
        this.loadDashboardData();
        this.setupDashboardAnimations();
    }

    initializeActivities() {
        console.log('Initializing activities features...');
        this.loadActivitiesData();
    }

    initializePortfolio() {
        console.log('Initializing portfolio features...');
        this.loadPortfolioData();
    }

    initializeAnalytics() {
        console.log('Initializing analytics features...');
        this.loadAnalyticsData();
    }

    initializeLandingPage() {
        console.log('Initializing landing page features...');
        this.setupLandingPageAnimations();
        this.setupIntersectionObserver();
    }

    initializeLoginPage() {
        console.log('Initializing login page features...');
        // Focus on email field
        setTimeout(() => {
            const emailField = document.getElementById('email');
            if (emailField) emailField.focus();
        }, 100);
    }

    async loadDashboardData() {
        if (!Utils.isAuthenticated()) return;
        
        try {
            const [stats, activities] = await Promise.all([
                Utils.makeRequest('/activities/stats'),
                Utils.makeRequest('/activities?limit=6')
            ]);

            this.updateDashboardStats(stats);
            this.updateRecentActivities(activities.activities);
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        }
    }

    updateDashboardStats(stats) {
        const elements = {
            totalActivities: document.getElementById('totalActivities'),
            approvedActivities: document.getElementById('approvedActivities'),
            pendingActivities: document.getElementById('pendingActivities'),
            profileCompleteness: document.getElementById('profileCompleteness'),
            profileProgress: document.getElementById('profileProgress')
        };

        if (elements.totalActivities) elements.totalActivities.textContent = stats.total_activities || '0';
        if (elements.approvedActivities) elements.approvedActivities.textContent = stats.approved_activities || '0';
        if (elements.pendingActivities) elements.pendingActivities.textContent = stats.pending_activities || '0';
        if (elements.profileCompleteness) elements.profileCompleteness.textContent = `${stats.profile_completeness || 0}%`;
        if (elements.profileProgress) elements.profileProgress.style.width = `${stats.profile_completeness || 0}%`;
    }

    updateRecentActivities(activities) {
        const container = document.getElementById('activitiesGrid');
        if (!container || !activities) return;

        if (activities.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <h3>No activities yet</h3>
                    <p>Start by adding your first activity</p>
                    <button class="btn btn-primary" onclick="showAddActivityModal()">
                        <i class="fas fa-plus"></i> Add Activity
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = activities.map(activity => this.createActivityCard(activity)).join('');
    }

    createActivityCard(activity) {
        const statusClass = activity.approval_status?.replace('_', '-') || 'pending';
        const categoryIcon = this.getCategoryIcon(activity.activity_type);
        
        return `
            <div class="activity-card fade-in-up">
                <div class="activity-header">
                    <i class="fas fa-${categoryIcon}"></i>
                </div>
                <div class="activity-content">
                    <h3 class="activity-title">${Utils.escapeHtml(activity.title)}</h3>
                    <p class="activity-description">${Utils.escapeHtml(activity.description?.substring(0, 100) + '...')}</p>
                    <div class="activity-meta">
                        <span><i class="far fa-calendar"></i> ${Utils.formatDate(activity.start_date)}</span>
                        <span class="status-badge status-${statusClass}">${activity.approval_status}</span>
                    </div>
                    <div class="activity-actions">
                        <button class="btn btn-sm" onclick="viewActivity(${activity.id})">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    getCategoryIcon(type) {
        const icons = {
            academic: 'graduation-cap',
            extracurricular: 'star',
            sports: 'trophy',
            cultural: 'palette',
            technical: 'laptop-code',
            social_service: 'hands-helping',
            internship: 'briefcase',
            certification: 'certificate'
        };
        return icons[type] || 'star';
    }

    setupDashboardAnimations() {
        // Stagger animation for stats cards
        const statCards = document.querySelectorAll('.stat-card');
        statCards.forEach((card, index) => {
            card.style.animationDelay = `${index * 0.1}s`;
            card.classList.add('fade-in-up');
        });
    }

    setupLandingPageAnimations() {
        // Setup intersection observer for scroll animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                }
            });
        }, observerOptions);

        // Observe elements with scroll-reveal class
        const revealElements = document.querySelectorAll('.scroll-reveal');
        revealElements.forEach(element => {
            observer.observe(element);
        });
    }

    setupIntersectionObserver() {
        // Lazy loading for images
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        imageObserver.unobserve(img);
                    }
                }
            });
        });

        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }

    setupScrollEffects() {
        // Show/hide back to top button
        const backToTopBtn = document.getElementById('backToTopBtn');
        if (backToTopBtn) {
            window.addEventListener('scroll', Utils.throttle(() => {
                if (window.pageYOffset > 300) {
                    backToTopBtn.classList.add('show');
                } else {
                    backToTopBtn.classList.remove('show');
                }
            }, 100));
        }

        // Navbar scroll effect
        const navbar = document.querySelector('.navbar, .dashboard-header');
        if (navbar) {
            let lastScrollY = window.pageYOffset;
            
            window.addEventListener('scroll', Utils.throttle(() => {
                const scrollY = window.pageYOffset;
                
                if (scrollY > 100) {
                    navbar.classList.add('scrolled');
                } else {
                    navbar.classList.remove('scrolled');
                }
                
                // Hide navbar on scroll down, show on scroll up
                if (scrollY > lastScrollY && scrollY > 200) {
                    navbar.classList.add('nav-hidden');
                } else {
                    navbar.classList.remove('nav-hidden');
                }
                
                lastScrollY = scrollY;
            }, 100));
        }
    }

    initializeTooltips() {
        const tooltipElements = document.querySelectorAll('[data-tooltip]');
        tooltipElements.forEach(element => {
            element.addEventListener('mouseenter', this.showTooltip.bind(this));
            element.addEventListener('mouseleave', this.hideTooltip.bind(this));
        });
    }

    showTooltip(event) {
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

    hideTooltip(event) {
        const element = event.target;
        if (element._tooltip) {
            document.body.removeChild(element._tooltip);
            element._tooltip = null;
        }
    }

    handleAuthStateChange(event) {
        console.log('Auth state changed:', event.detail);
        this.updateUserInterface();
    }

    handleVisibilityChange() {
        if (document.hidden) {
            console.log('App hidden');
        } else {
            console.log('App visible');
            // Refresh data when user returns to tab
            this.refreshCurrentPageData();
        }
    }

    handleOnlineStatus() {
        console.log('App online');
        if (window.notificationManager) {
            window.notificationManager.showNotification('Connection restored', 'success');
        }
        this.refreshCurrentPageData();
    }

    handleOfflineStatus() {
        console.log('App offline');
        if (window.notificationManager) {
            window.notificationManager.showNotification('No internet connection', 'warning');
        }
    }

    handleUnhandledRejection(event) {
        console.error('Unhandled promise rejection:', event.reason);
        
        // Show user-friendly error message
        if (window.notificationManager) {
            window.notificationManager.showNotification(
                'Something went wrong. Please try again.',
                'error'
            );
        }
    }

    handleKeyboardShortcuts(event) {
        // Ctrl/Cmd + K for search
        if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
            event.preventDefault();
            // Focus on search input if available
            const searchInput = document.querySelector('#activitySearch, .search-input');
            if (searchInput) {
                searchInput.focus();
            }
        }

        // Escape key to close modals
        if (event.key === 'Escape') {
            const openModals = document.querySelectorAll('.modal.show');
            openModals.forEach(modal => {
                modal.classList.remove('show');
            });
            document.body.style.overflow = '';
        }
    }

    refreshCurrentPageData() {
        switch (this.currentPage) {
            case 'dashboard':
                this.loadDashboardData();
                break;
            case 'activities':
                if (window.activityManager && typeof window.activityManager.loadActivities === 'function') {
                    window.activityManager.loadActivities();
                }
                break;
            case 'portfolio':
                if (window.portfolioManager && typeof window.portfolioManager.loadPortfolioHistory === 'function') {
                    window.portfolioManager.loadPortfolioHistory();
                }
                break;
            case 'analytics':
                if (window.analyticsManager && typeof window.analyticsManager.loadAnalyticsData === 'function') {
                    window.analyticsManager.loadAnalyticsData();
                }
                break;
        }
    }
}

// Global utility functions
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function logout() {
    if (window.authManager && typeof window.authManager.logout === 'function') {
        window.authManager.logout();
    }
}

function checkAuthStatus() {
    if (window.authManager && typeof window.authManager.checkAuthStatus === 'function') {
        return window.authManager.checkAuthStatus();
    }
    return false;
}

function initializeLandingPage() {
    // Landing page specific initialization
    const heroSection = document.querySelector('.hero');
    if (heroSection) {
        // Add animation classes
        setTimeout(() => {
            heroSection.classList.add('hero-loaded');
        }, 100);
    }

    // Setup smooth scrolling for navigation links
    const navLinks = document.querySelectorAll('a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.smartStudentHub = new SmartStudentHubApp();
    console.log('Smart Student Hub initialized successfully');
});

// Export for use in other modules
window.SmartStudentHubApp = SmartStudentHubApp;
