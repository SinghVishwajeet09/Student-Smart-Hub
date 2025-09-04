/**
 * Smart Student Hub - Portfolio Module
 * Handles portfolio generation, preview, and management
 */

class PortfolioManager {
    constructor() {
        this.portfolioHistory = [];
        this.isGenerating = false;
        this.previewData = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadPortfolioHistory();
    }

    setupEventListeners() {
        // Generate portfolio button
        const generateBtn = document.getElementById('generatePortfolioBtn');
        if (generateBtn) {
            generateBtn.addEventListener('click', this.generatePortfolio.bind(this));
        }

        // Preview portfolio button
        const previewBtn = document.getElementById('previewPortfolioBtn');
        if (previewBtn) {
            previewBtn.addEventListener('click', this.previewPortfolio.bind(this));
        }

        // Template selection
        const templateSelectors = document.querySelectorAll('input[name="template"]');
        templateSelectors.forEach(selector => {
            selector.addEventListener('change', this.handleTemplateChange.bind(this));
        });

        // Activity filtering for portfolio
        const activityFilters = document.querySelectorAll('.activity-filter');
        activityFilters.forEach(filter => {
            filter.addEventListener('change', this.updatePortfolioPreview.bind(this));
        });
    }

    async generatePortfolio(template = 'standard', includeActivities = null) {
        if (this.isGenerating) {
            NotificationManager.showNotification('Portfolio generation already in progress', 'warning');
            return;
        }

        try {
            this.isGenerating = true;
            const loadingId = Utils.generateId();
            
            NotificationManager.showLoadingNotification(
                'Preparing your portfolio data...',
                loadingId
            );

            // Prepare request data
            const requestData = {
                template: template,
                include_activities: includeActivities,
                format: 'pdf',
                include_qr: true,
                include_verification: true
            };

            const response = await Utils.makeRequest('/portfolio/generate', {
                method: 'POST',
                body: JSON.stringify(requestData)
            });

            NotificationManager.updateLoadingNotification(
                loadingId,
                'Portfolio generated successfully!',
                'success'
            );

            // Handle successful generation
            this.handleGenerationSuccess(response);

        } catch (error) {
            console.error('Portfolio generation failed:', error);
            NotificationManager.showNotification(
                error.message || 'Failed to generate portfolio',
                'error',
                'Generation Failed'
            );
        } finally {
            this.isGenerating = false;
        }
    }

    handleGenerationSuccess(response) {
        const { downloadUrl, verificationUrl, verificationHash } = response;

        // Add to history
        this.portfolioHistory.unshift({
            id: Utils.generateId(),
            generated_at: new Date().toISOString(),
            download_url: downloadUrl,
            verification_url: verificationUrl,
            verification_hash: verificationHash,
            template: 'standard',
            status: 'ready'
        });

        this.updatePortfolioHistory();

        // Show success modal with options
        this.showGenerationSuccessModal(response);
    }

    showGenerationSuccessModal(response) {
        const modal = this.createSuccessModal(response);
        document.body.appendChild(modal);
        
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }

    createSuccessModal(response) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-check-circle text-success"></i> Portfolio Generated!</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="success-content">
                        <p>Your verified digital portfolio has been generated successfully!</p>
                        
                        <div class="portfolio-actions-grid">
                            <button class="btn btn-primary" onclick="portfolioManager.downloadPortfolio('${response.downloadUrl}')">
                                <i class="fas fa-download"></i> Download PDF
                            </button>
                            <button class="btn btn-outline" onclick="portfolioManager.sharePortfolio('${response.verificationUrl}')">
                                <i class="fas fa-share-alt"></i> Share Portfolio
                            </button>
                            <button class="btn btn-outline" onclick="portfolioManager.previewInNewTab('${response.downloadUrl}')">
                                <i class="fas fa-external-link-alt"></i> Preview
                            </button>
                            <button class="btn btn-text" onclick="portfolioManager.copyVerificationLink('${response.verificationUrl}')">
                                <i class="fas fa-link"></i> Copy Verification Link
                            </button>
                        </div>
                        
                        <div class="portfolio-info">
                            <h4>Portfolio Details:</h4>
                            <ul>
                                <li><strong>Generated:</strong> ${Utils.formatDate(new Date())}</li>
                                <li><strong>Verification Hash:</strong> <code class="verification-hash">${response.verificationHash}</code></li>
                                <li><strong>Total Activities:</strong> ${response.totalActivities || 'N/A'}</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;

        return modal;
    }

    async downloadPortfolio(downloadUrl) {
        try {
            // Create download link
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `${Utils.getCurrentUser()?.firstName}_Portfolio.pdf`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            NotificationManager.showNotification(
                'Portfolio download started',
                'success'
            );

        } catch (error) {
            NotificationManager.showNotification(
                'Failed to download portfolio',
                'error'
            );
        }
    }

    async sharePortfolio(verificationUrl) {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'My Digital Student Portfolio',
                    text: 'Check out my verified student activity portfolio',
                    url: verificationUrl
                });
            } catch (error) {
                console.log('Share cancelled or failed:', error);
            }
        } else {
            // Fallback: copy to clipboard
            this.copyVerificationLink(verificationUrl);
        }
    }

    async copyVerificationLink(url) {
        try {
            await navigator.clipboard.writeText(url);
            NotificationManager.showNotification(
                'Verification link copied to clipboard',
                'success'
            );
        } catch (error) {
            NotificationManager.showNotification(
                'Failed to copy link',
                'error'
            );
        }
    }

    previewInNewTab(downloadUrl) {
        window.open(downloadUrl, '_blank');
    }

    async previewPortfolio() {
        try {
            Utils.showLoading('Loading portfolio preview...');

            // Get user's activities for preview
            const response = await Utils.makeRequest('/activities?status=approved');
            const activities = response.activities || [];

            // Get user data
            const user = Utils.getCurrentUser();

            // Create preview data
            this.previewData = {
                user: user,
                activities: activities,
                generated_at: new Date(),
                stats: this.calculateStats(activities)
            };

            this.showPreviewModal();

        } catch (error) {
            NotificationManager.showNotification(
                'Failed to load portfolio preview',
                'error'
            );
        } finally {
            Utils.hideLoading();
        }
    }

    calculateStats(activities) {
        const stats = {
            total_activities: activities.length,
            total_hours: activities.reduce((sum, activity) => sum + (activity.duration_hours || 0), 0),
            total_points: activities.reduce((sum, activity) => sum + (activity.points_earned || 0), 0),
            by_type: {},
            skills: []
        };

        // Group by type
        activities.forEach(activity => {
            stats.by_type[activity.activity_type] = (stats.by_type[activity.activity_type] || 0) + 1;
        });

        // Extract skills
        const allSkills = [];
        activities.forEach(activity => {
            if (activity.skills_gained) {
                const skills = activity.skills_gained.split(',').map(s => s.trim());
                allSkills.push(...skills);
            }
        });

        // Count skill frequency
        const skillCounts = {};
        allSkills.forEach(skill => {
            skillCounts[skill] = (skillCounts[skill] || 0) + 1;
        });

        stats.skills = Object.entries(skillCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([skill, count]) => ({ skill, count }));

        return stats;
    }

    showPreviewModal() {
        if (!this.previewData) return;

        const modal = this.createPreviewModal();
        document.body.appendChild(modal);
        
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }

    createPreviewModal() {
        const { user, activities, stats } = this.previewData;

        const modal = document.createElement('div');
        modal.className = 'modal large-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-eye"></i> Portfolio Preview</h2>
                    <div class="preview-actions">
                        <button class="btn btn-primary" onclick="portfolioManager.generatePortfolio()">
                            <i class="fas fa-file-pdf"></i> Generate PDF
                        </button>
                        <button class="modal-close" onclick="this.closest('.modal').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <div class="modal-body">
                    <div class="portfolio-preview">
                        ${this.createPreviewContent(user, activities, stats)}
                    </div>
                </div>
            </div>
        `;

        return modal;
    }

    createPreviewContent(user, activities, stats) {
        return `
            <div class="preview-header">
                <div class="preview-logo">
                    <i class="fas fa-graduation-cap"></i>
                    <h1>Student Activity Portfolio</h1>
                    <p>Verified Digital Credential</p>
                </div>
            </div>

            <div class="preview-profile">
                <div class="profile-info">
                    <h2>${user.first_name} ${user.last_name}</h2>
                    <div class="profile-details">
                        <p><strong>Student ID:</strong> ${user.student_id}</p>
                        <p><strong>Email:</strong> ${user.email}</p>
                        ${user.institution ? `<p><strong>Institution:</strong> ${user.institution}</p>` : ''}
                        ${user.department ? `<p><strong>Department:</strong> ${user.department}</p>` : ''}
                    </div>
                </div>
            </div>

            <div class="preview-stats">
                <div class="stats-row">
                    <div class="stat-item">
                        <div class="stat-number">${stats.total_activities}</div>
                        <div class="stat-label">Total Activities</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${stats.total_hours}</div>
                        <div class="stat-label">Total Hours</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${stats.total_points}</div>
                        <div class="stat-label">Points Earned</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${stats.skills.length}</div>
                        <div class="stat-label">Skills</div>
                    </div>
                </div>
            </div>

            <div class="preview-activities">
                <h3>Recent Activities (${Math.min(activities.length, 5)} of ${activities.length})</h3>
                <div class="activity-list">
                    ${activities.slice(0, 5).map(activity => `
                        <div class="activity-preview-item">
                            <div class="activity-preview-header">
                                <h4>${Utils.escapeHtml(activity.title)}</h4>
                                <span class="activity-type">${activity.activity_type}</span>
                            </div>
                            <p class="activity-preview-description">${Utils.escapeHtml(activity.description.substring(0, 100))}...</p>
                            <div class="activity-preview-meta">
                                <span><i class="fas fa-calendar"></i> ${Utils.formatDate(activity.start_date)}</span>
                                ${activity.achievement ? `<span><i class="fas fa-award"></i> ${Utils.escapeHtml(activity.achievement)}</span>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
                ${activities.length > 5 ? `<p class="preview-note">And ${activities.length - 5} more activities...</p>` : ''}
            </div>

            <div class="preview-footer">
                <p>This preview shows how your portfolio will appear in the generated PDF.</p>
                <p>The full PDF will include all activities, verification details, and QR codes.</p>
            </div>
        `;
    }

    async loadPortfolioHistory() {
        try {
            const response = await Utils.makeRequest('/portfolio/history');
            this.portfolioHistory = response.portfolios || [];
            this.updatePortfolioHistory();
        } catch (error) {
            console.error('Failed to load portfolio history:', error);
        }
    }

    updatePortfolioHistory() {
        const container = document.getElementById('portfolioHistory');
        if (!container) return;

        if (this.portfolioHistory.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-pdf"></i>
                    <h3>No portfolios generated yet</h3>
                    <p>Generate your first portfolio to get started</p>
                    <button class="btn btn-primary" onclick="portfolioManager.generatePortfolio()">
                        <i class="fas fa-plus"></i> Generate Portfolio
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="portfolio-history-list">
                ${this.portfolioHistory.map(portfolio => this.createHistoryItem(portfolio)).join('')}
            </div>
        `;
    }

    createHistoryItem(portfolio) {
        return `
            <div class="portfolio-history-item">
                <div class="portfolio-info">
                    <div class="portfolio-icon">
                        <i class="fas fa-file-pdf"></i>
                    </div>
                    <div class="portfolio-details">
                        <h4>Student Portfolio</h4>
                        <p>Generated on ${Utils.formatDate(portfolio.generated_at)}</p>
                        <div class="portfolio-meta">
                            <span class="portfolio-status status-${portfolio.status}">${portfolio.status}</span>
                            <span class="download-count">${portfolio.download_count || 0} downloads</span>
                        </div>
                    </div>
                </div>
                <div class="portfolio-actions">
                    <button class="btn btn-sm btn-primary" onclick="portfolioManager.downloadPortfolio('${portfolio.download_url}')">
                        <i class="fas fa-download"></i> Download
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="portfolioManager.sharePortfolio('${portfolio.verification_url}')">
                        <i class="fas fa-share-alt"></i> Share
                    </button>
                    <button class="btn btn-sm btn-text" onclick="portfolioManager.showPortfolioDetails('${portfolio.id}')">
                        <i class="fas fa-info-circle"></i> Details
                    </button>
                </div>
            </div>
        `;
    }

    showPortfolioDetails(portfolioId) {
        const portfolio = this.portfolioHistory.find(p => p.id === portfolioId);
        if (!portfolio) return;

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-info-circle"></i> Portfolio Details</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="portfolio-details-content">
                        <div class="detail-group">
                            <h4>Generation Information</h4>
                            <p><strong>Generated:</strong> ${Utils.formatDate(portfolio.generated_at)}</p>
                            <p><strong>Template:</strong> ${portfolio.template}</p>
                            <p><strong>Status:</strong> <span class="status-badge status-${portfolio.status}">${portfolio.status}</span></p>
                            <p><strong>Downloads:</strong> ${portfolio.download_count || 0}</p>
                        </div>
                        
                        <div class="detail-group">
                            <h4>Verification</h4>
                            <p><strong>Verification Hash:</strong></p>
                            <code class="verification-hash">${portfolio.verification_hash}</code>
                            <p><strong>Verification URL:</strong></p>
                            <a href="${portfolio.verification_url}" target="_blank" class="verification-link">
                                ${portfolio.verification_url}
                            </a>
                        </div>
                        
                        <div class="detail-actions">
                            <button class="btn btn-primary" onclick="portfolioManager.downloadPortfolio('${portfolio.download_url}')">
                                <i class="fas fa-download"></i> Download Portfolio
                            </button>
                            <button class="btn btn-outline" onclick="portfolioManager.copyVerificationLink('${portfolio.verification_url}')">
                                <i class="fas fa-copy"></i> Copy Verification Link
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);
    }

    handleTemplateChange(event) {
        const template = event.target.value;
        // Update template preview or other UI elements
        this.selectedTemplate = template;
    }

    updatePortfolioPreview() {
        // Update preview based on selected filters/options
        // This could be used for real-time preview updates
    }
}

// Global functions
function generatePortfolio() {
    portfolioManager.generatePortfolio();
}

function previewPortfolio() {
    portfolioManager.previewPortfolio();
}

// Initialize portfolio manager
const portfolioManager = new PortfolioManager();

// Export for use in other modules
window.PortfolioManager = portfolioManager;
window.generatePortfolio = generatePortfolio;
window.previewPortfolio = previewPortfolio;
