/**
 * Smart Student Hub - Notifications Module
 * Handles in-app notifications, toasts, and real-time updates
 */

class NotificationManager {
    constructor() {
        this.notifications = [];
        this.container = null;
        this.panel = null;
        this.unreadCount = 0;
        this.init();
    }

    init() {
        this.createContainer();
        this.setupEventListeners();
        this.loadNotifications();
    }

    createContainer() {
        // Create toast notification container
        this.container = document.getElementById('notificationContainer');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'notificationContainer';
            this.container.className = 'notification-container';
            document.body.appendChild(this.container);
        }

        // Get notification panel
        this.panel = document.getElementById('notificationPanel');
    }

    setupEventListeners() {
        // Click outside to close panel
        document.addEventListener('click', (event) => {
            if (this.panel && this.panel.classList.contains('show')) {
                if (!this.panel.contains(event.target) && !event.target.closest('.notification-icon')) {
                    this.hideNotificationPanel();
                }
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.panel && this.panel.classList.contains('show')) {
                this.hideNotificationPanel();
            }
        });
    }

    /**
     * Show toast notification
     */
    showNotification(message, type = 'info', title = '', duration = 5000) {
        const notification = this.createNotificationElement(message, type, title);
        this.container.appendChild(notification);

        // Trigger show animation
        setTimeout(() => notification.classList.add('show'), 10);

        // Auto remove after duration
        if (duration > 0) {
            setTimeout(() => {
                this.removeNotification(notification);
            }, duration);
        }

        return notification;
    }

    createNotificationElement(message, type, title) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-icon">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            </div>
            <div class="notification-content">
                ${title ? `<div class="notification-title">${Utils.escapeHtml(title)}</div>` : ''}
                <div class="notification-message">${Utils.escapeHtml(message)}</div>
            </div>
            <button class="notification-close" onclick="notificationManager.removeNotification(this.parentElement)">
                <i class="fas fa-times"></i>
            </button>
        `;

        return notification;
    }

    removeNotification(notification) {
        if (notification && notification.parentElement) {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.parentElement.removeChild(notification);
                }
            }, 300);
        }
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    /**
     * Show notification panel
     */
    showNotificationPanel() {
        if (this.panel) {
            this.panel.classList.add('show');
            this.loadNotificationList();
            document.body.style.overflow = 'hidden';
        }
    }

    hideNotificationPanel() {
        if (this.panel) {
            this.panel.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    toggleNotificationPanel() {
        if (this.panel) {
            if (this.panel.classList.contains('show')) {
                this.hideNotificationPanel();
            } else {
                this.showNotificationPanel();
            }
        }
    }

    /**
     * Load notifications from API
     */
    async loadNotifications() {
        if (!Utils.isAuthenticated()) return;

        try {
            const response = await Utils.makeRequest('/notifications');
            this.notifications = response.notifications || [];
            this.updateUnreadCount();
            this.updateNotificationBadge();
        } catch (error) {
            console.error('Failed to load notifications:', error);
        }
    }

    async loadNotificationList() {
        const listContainer = document.getElementById('notificationList');
        if (!listContainer) return;

        try {
            // Show loading state
            listContainer.innerHTML = '<div class="loading-state">Loading notifications...</div>';

            const response = await Utils.makeRequest('/notifications');
            this.notifications = response.notifications || [];

            if (this.notifications.length === 0) {
                listContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-bell-slash"></i>
                        <p>No notifications yet</p>
                    </div>
                `;
                return;
            }

            // Render notifications
            listContainer.innerHTML = this.notifications.map(notification => `
                <div class="notification-item ${notification.is_read ? '' : 'unread'}" 
                     data-id="${notification.id}"
                     onclick="notificationManager.handleNotificationClick(${notification.id})">
                    <div class="notification-item-header">
                        <div class="notification-item-title">${Utils.escapeHtml(notification.title)}</div>
                        <div class="notification-item-time">${Utils.formatRelativeTime(notification.created_at)}</div>
                    </div>
                    <div class="notification-item-message">${Utils.escapeHtml(notification.message)}</div>
                </div>
            `).join('');

            this.updateUnreadCount();
            this.updateNotificationBadge();

        } catch (error) {
            console.error('Failed to load notification list:', error);
            listContainer.innerHTML = '<div class="error-state">Failed to load notifications</div>';
        }
    }

    async handleNotificationClick(notificationId) {
        try {
            // Mark as read
            await Utils.makeRequest(`/notifications/${notificationId}/read`, {
                method: 'POST'
            });

            // Update local state
            const notification = this.notifications.find(n => n.id === notificationId);
            if (notification) {
                notification.is_read = true;
                this.updateUnreadCount();
                this.updateNotificationBadge();
            }

            // Update UI
            const element = document.querySelector(`[data-id="${notificationId}"]`);
            if (element) {
                element.classList.remove('unread');
            }

            // Handle notification action (if any)
            if (notification && notification.action_url) {
                window.location.href = notification.action_url;
            }

        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    }

    async markAllAsRead() {
        try {
            await Utils.makeRequest('/notifications/mark-all-read', {
                method: 'POST'
            });

            // Update local state
            this.notifications.forEach(notification => {
                notification.is_read = true;
            });

            this.updateUnreadCount();
            this.updateNotificationBadge();

            // Update UI
            const unreadItems = document.querySelectorAll('.notification-item.unread');
            unreadItems.forEach(item => {
                item.classList.remove('unread');
            });

            this.showNotification('All notifications marked as read', 'success');

        } catch (error) {
            console.error('Failed to mark all notifications as read:', error);
            this.showNotification('Failed to mark notifications as read', 'error');
        }
    }

    updateUnreadCount() {
        this.unreadCount = this.notifications.filter(n => !n.is_read).length;
    }

    updateNotificationBadge() {
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            badge.textContent = this.unreadCount;
            badge.style.display = this.unreadCount > 0 ? 'block' : 'none';
        }
    }

    /**
     * Add real-time notification
     */
    addRealTimeNotification(notificationData) {
        // Add to local array
        this.notifications.unshift(notificationData);

        // Show toast
        this.showNotification(
            notificationData.message,
            this.getNotificationType(notificationData.type),
            notificationData.title
        );

        // Update badge
        this.updateUnreadCount();
        this.updateNotificationBadge();

        // Update panel if open
        if (this.panel && this.panel.classList.contains('show')) {
            this.loadNotificationList();
        }
    }

    getNotificationType(type) {
        const typeMap = {
            'activity_approved': 'success',
            'activity_rejected': 'error',
            'activity_pending': 'info',
            'portfolio_generated': 'success',
            'system_update': 'info'
        };
        return typeMap[type] || 'info';
    }

    /**
     * Request notification permission
     */
    async requestNotificationPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }
        return false;
    }

    /**
     * Show browser notification
     */
    showBrowserNotification(title, message, icon = null) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body: message,
                icon: icon || '/assets/icons/notification-icon.png',
                badge: '/assets/icons/badge-icon.png'
            });
        }
    }

    /**
     * Clear all notifications
     */
    clearAllNotifications() {
        // Clear toast notifications
        const toasts = this.container.querySelectorAll('.notification');
        toasts.forEach(toast => {
            this.removeNotification(toast);
        });
    }

    /**
     * Show loading notification
     */
    showLoadingNotification(message, id = null) {
        const notification = this.createNotificationElement(message, 'info', 'Loading');
        notification.classList.add('loading-notification');
        
        if (id) {
            notification.setAttribute('data-loading-id', id);
        }

        // Add spinner
        const icon = notification.querySelector('.notification-icon i');
        icon.className = 'fas fa-spinner fa-spin';

        this.container.appendChild(notification);
        setTimeout(() => notification.classList.add('show'), 10);

        return notification;
    }

    /**
     * Update loading notification
     */
    updateLoadingNotification(id, message, type = 'success') {
        const notification = this.container.querySelector(`[data-loading-id="${id}"]`);
        if (notification) {
            const messageEl = notification.querySelector('.notification-message');
            const iconEl = notification.querySelector('.notification-icon i');
            
            messageEl.textContent = message;
            iconEl.className = `fas fa-${this.getNotificationIcon(type)}`;
            notification.className = `notification ${type} show`;

            // Auto remove after 3 seconds
            setTimeout(() => {
                this.removeNotification(notification);
            }, 3000);
        }
    }
}

// Global functions for easy access
function toggleNotifications() {
    notificationManager.toggleNotificationPanel();
}

function markAllNotificationsRead() {
    notificationManager.markAllAsRead();
}

// Initialize notification manager
const notificationManager = new NotificationManager();

// Export for use in other modules
window.NotificationManager = notificationManager;
window.toggleNotifications = toggleNotifications;
window.markAllNotificationsRead = markAllNotificationsRead;
