/**
 * Smart Student Hub - Analytics Module
 * Handles analytics dashboard, charts, and insights
 */

class AnalyticsManager {
    constructor() {
        this.charts = {};
        this.currentTimeframe = '6months';
        this.analyticsData = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        if (this.isAnalyticsPage()) {
            this.loadAnalyticsData();
        }
    }

    isAnalyticsPage() {
        return window.location.pathname.includes('analytics.html');
    }

    setupEventListeners() {
        // Timeframe selector
        const timeframeSelect = document.getElementById('timeframeSelect');
        if (timeframeSelect) {
            timeframeSelect.addEventListener('change', (e) => {
                this.currentTimeframe = e.target.value;
                this.loadAnalyticsData();
            });
        }
    }

    async loadAnalyticsData(timeframe = this.currentTimeframe) {
        if (!Utils.isAuthenticated()) return;

        try {
            Utils.showLoading('Loading analytics data...');

            const response = await Utils.makeRequest(`/analytics/dashboard?timeframe=${timeframe}`);
            this.analyticsData = response;

            this.renderCharts(response);
            this.updateMetrics(response.performanceMetrics || {});
            this.renderSkillsAnalysis(response.topSkills || []);
            this.loadSkillsGapAnalysis();

        } catch (error) {
            console.error('Failed to load analytics:', error);
            NotificationManager.showNotification('Failed to load analytics data', 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    renderCharts(data) {
        // Destroy existing charts
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        this.charts = {};

        // Activity Trends Chart
        this.renderActivityTrendsChart(data.activityTrends || []);
        
        // Category Distribution Chart
        this.renderCategoryDistributionChart(data.categoryDistribution || []);
    }

    renderActivityTrendsChart(trendsData) {
        const canvas = document.getElementById('activityTrendsChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // Process data for chart
        const labels = trendsData.map(item => {
            const date = new Date(item.month + '-01');
            return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        });

        const datasets = [];
        const activityTypes = [...new Set(trendsData.map(item => item.activity_type))];
        const colors = ['#4361ee', '#f72585', '#4cc9f0', '#52b788', '#ffb800'];

        activityTypes.forEach((type, index) => {
            const typeData = trendsData.filter(item => item.activity_type === type);
            const data = labels.map(label => {
                const monthData = typeData.find(item => {
                    const date = new Date(item.month + '-01');
                    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) === label;
                });
                return monthData ? monthData.count : 0;
            });

            datasets.push({
                label: this.formatActivityType(type),
                data: data,
                borderColor: colors[index % colors.length],
                backgroundColor: colors[index % colors.length] + '20',
                tension: 0.4,
                fill: false
            });
        });

        this.charts.activityTrends = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Activity Trends Over Time'
                    },
                    legend: {
                        position: 'bottom'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    renderCategoryDistributionChart(categoryData) {
        const canvas = document.getElementById('categoryDistributionChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        const labels = categoryData.map(item => this.formatActivityType(item.category));
        const data = categoryData.map(item => item.count);
        const colors = ['#4361ee', '#f72585', '#4cc9f0', '#52b788', '#ffb800', '#7209b7'];

        this.charts.categoryDistribution = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors.slice(0, labels.length),
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Activities by Category'
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    renderSkillsAnalysis(skillsData) {
        const container = document.getElementById('skillsContainer');
        if (!container || !skillsData.length) return;

        const maxCount = Math.max(...skillsData.map(skill => skill.count));

        container.innerHTML = skillsData.map(skill => `
            <div class="skill-item">
                <div class="skill-header">
                    <span class="skill-name">${Utils.escapeHtml(skill.skill)}</span>
                    <span class="skill-count">${skill.count}</span>
                </div>
                <div class="skill-bar">
                    <div class="skill-fill" style="width: ${(skill.count / maxCount) * 100}%"></div>
                </div>
            </div>
        `).join('');
    }

    updateMetrics(metrics) {
        const updates = {
            approvalRate: Math.round(metrics.approval_rate || 0) + '%',
            avgDuration: Math.round(metrics.avg_duration || 0) + 'h',
            peerRanking: this.formatPeerRanking(metrics.peer_avg_activities, metrics.user_activities),
            achievementScore: Math.round(metrics.achievement_score || 0)
        };

        Object.entries(updates).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    formatPeerRanking(peerAvg, userActivities) {
        if (!peerAvg || !userActivities) return '-';
        
        const ratio = userActivities / peerAvg;
        if (ratio >= 1.2) return 'Above Average';
        if (ratio >= 0.8) return 'Average';
        return 'Below Average';
    }

    async loadSkillsGapAnalysis() {
        try {
            const response = await Utils.makeRequest('/analytics/skills-gap');
            this.renderSkillsGap(response);
        } catch (error) {
            console.error('Failed to load skills gap analysis:', error);
        }
    }

    renderSkillsGap(data) {
        const container = document.getElementById('skillsGapContainer');
        if (!container) return;

        if (!data.identifiedGaps || data.identifiedGaps.length === 0) {
            container.innerHTML = `
                <div class="skills-gap-empty">
                    <div class="empty-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <h4>Great! No significant skill gaps identified</h4>
                    <p>Your current skill set appears well-rounded for your field</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="skills-gap-content">
                <div class="gap-summary">
                    <h4><i class="fas fa-lightbulb"></i> Skills Gap Analysis</h4>
                    <p>We've identified <strong>${data.identifiedGaps.length}</strong> skill areas for improvement based on trends in your field.</p>
                </div>
                <div class="gaps-grid">
                    ${data.identifiedGaps.map(gap => `
                        <div class="gap-item priority-${gap.priority}">
                            <div class="gap-header">
                                <h5>${Utils.escapeHtml(gap.skill)}</h5>
                                <span class="priority-badge priority-${gap.priority}">${gap.priority}</span>
                            </div>
                            <p class="gap-suggestion">${Utils.escapeHtml(gap.suggestion || 'Consider developing this skill through relevant activities')}</p>
                        </div>
                    `).join('')}
                </div>
                <div class="gap-actions">
                    <button class="btn btn-primary" onclick="showSkillDevelopmentModal()">
                        <i class="fas fa-plus"></i> Find Skill Development Activities
                    </button>
                </div>
            </div>
        `;
    }

    formatActivityType(type) {
        const typeMap = {
            'academic': 'Academic',
            'extracurricular': 'Extracurricular',
            'sports': 'Sports',
            'cultural': 'Cultural',
            'technical': 'Technical',
            'social_service': 'Social Service',
            'internship': 'Internship',
            'certification': 'Certification'
        };
        return typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
    }

    exportAnalytics() {
        if (!this.analyticsData) {
            NotificationManager.showNotification('No data to export', 'warning');
            return;
        }

        try {
            const exportData = {
                user: Utils.getCurrentUser(),
                timeframe: this.currentTimeframe,
                generated_at: new Date().toISOString(),
                data: this.analyticsData
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `analytics-${this.currentTimeframe}-${new Date().toISOString().split('T')[0]}.json`;
            link.click();

            NotificationManager.showNotification('Analytics data exported successfully', 'success');

        } catch (error) {
            console.error('Export failed:', error);
            NotificationManager.showNotification('Failed to export analytics data', 'error');
        }
    }

    generateInsightsReport() {
        if (!this.analyticsData) return;

        const insights = this.generateInsights();
        this.showInsightsModal(insights);
    }

    generateInsights() {
        const data = this.analyticsData;
        const insights = [];

        // Activity frequency insight
        if (data.activityTrends && data.activityTrends.length > 0) {
            const totalActivities = data.activityTrends.reduce((sum, item) => sum + item.count, 0);
            const avgPerMonth = totalActivities / data.activityTrends.length;
            
            if (avgPerMonth >= 2) {
                insights.push({
                    type: 'positive',
                    title: 'High Activity Level',
                    message: `You're maintaining an excellent pace with an average of ${avgPerMonth.toFixed(1)} activities per month.`
                });
            } else if (avgPerMonth < 1) {
                insights.push({
                    type: 'improvement',
                    title: 'Activity Opportunity',
                    message: 'Consider participating in more activities to enhance your profile.'
                });
            }
        }

        // Category diversity insight
        if (data.categoryDistribution && data.categoryDistribution.length > 0) {
            const categoryCount = data.categoryDistribution.length;
            if (categoryCount >= 4) {
                insights.push({
                    type: 'positive',
                    title: 'Well-Rounded Profile',
                    message: `Great job! You have activities across ${categoryCount} different categories.`
                });
            } else {
                insights.push({
                    type: 'improvement',
                    title: 'Diversify Activities',
                    message: 'Try participating in different types of activities for a more comprehensive profile.'
                });
            }
        }

        return insights;
    }

    showInsightsModal(insights) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-brain"></i> AI Insights</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="insights-content">
                        ${insights.map(insight => `
                            <div class="insight-item insight-${insight.type}">
                                <div class="insight-header">
                                    <i class="fas fa-${insight.type === 'positive' ? 'check-circle' : 'lightbulb'}"></i>
                                    <h4>${insight.title}</h4>
                                </div>
                                <p>${insight.message}</p>
                            </div>
                        `).join('')}
                        
                        ${insights.length === 0 ? `
                            <div class="no-insights">
                                <i class="fas fa-chart-line"></i>
                                <p>Keep adding activities to unlock personalized insights!</p>
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="this.closest('.modal').remove()">
                        Got it!
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);
    }
}

// Global functions for analytics
function updateTimeframe(timeframe) {
    if (window.analyticsManager) {
        window.analyticsManager.currentTimeframe = timeframe;
        window.analyticsManager.loadAnalyticsData(timeframe);
    }
}

function refreshSkillsGap() {
    if (window.analyticsManager) {
        window.analyticsManager.loadSkillsGapAnalysis();
    }
}

function exportAnalytics() {
    if (window.analyticsManager) {
        window.analyticsManager.exportAnalytics();
    }
}

function showInsights() {
    if (window.analyticsManager) {
        window.analyticsManager.generateInsightsReport();
    }
}

// Initialize analytics manager
const analyticsManager = new AnalyticsManager();

// Export for use in other modules
window.AnalyticsManager = analyticsManager;
