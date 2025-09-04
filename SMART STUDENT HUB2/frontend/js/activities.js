/**
 * Smart Student Hub - Activities Module
 * Handles activity creation, editing, and management
 */

class ActivityManager {
    constructor() {
        this.activities = [];
        this.currentFilter = 'all';
        this.currentPage = 1;
        this.itemsPerPage = 12;
        this.isLoading = false;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupFormValidation();
        this.setupFileUpload();
        this.initializeMultiStepForm();
    }

    setupEventListeners() {
        // Form submission
        const addActivityForm = document.getElementById('addActivityForm');
        if (addActivityForm) {
            addActivityForm.addEventListener('submit', this.handleActivitySubmit.bind(this));
        }

        // Filter activities
        const filterButtons = document.querySelectorAll('[data-filter]');
        filterButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const filter = e.target.getAttribute('data-filter');
                this.filterActivities(filter);
            });
        });

        // Search activities
        const searchInput = document.getElementById('activitySearch');
        if (searchInput) {
            searchInput.addEventListener('input', 
                Utils.debounce(this.handleSearch.bind(this), 300)
            );
        }

        // Activity type change
        const activityType = document.getElementById('activityType');
        if (activityType) {
            activityType.addEventListener('change', this.handleTypeChange.bind(this));
        }

        // Date validation
        const startDate = document.getElementById('startDate');
        const endDate = document.getElementById('endDate');
        if (startDate) {
            startDate.addEventListener('change', this.validateDates.bind(this));
        }
        if (endDate) {
            endDate.addEventListener('change', this.validateDates.bind(this));
        }
    }

    setupFormValidation() {
        const form = document.getElementById('addActivityForm');
        if (!form) return;

        // Real-time validation
        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        });
    }

    setupFileUpload() {
        const fileInput = document.getElementById('documents');
        const uploadArea = document.querySelector('.file-upload-area');
        
        if (!fileInput || !uploadArea) return;

        // Click to upload
        uploadArea.addEventListener('click', () => fileInput.click());

        // File input change
        fileInput.addEventListener('change', this.handleFileSelect.bind(this));

        // Drag and drop
        uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        uploadArea.addEventListener('drop', this.handleFileDrop.bind(this));
    }

    initializeMultiStepForm() {
        this.currentStep = 1;
        this.totalSteps = 3;
        this.updateStepDisplay();
    }

    async handleActivitySubmit(event) {
        event.preventDefault();
        
        if (!this.validateCurrentStep()) {
            return;
        }

        const formData = this.collectFormData();
        
        try {
            Utils.showLoading('Saving your activity...');
            
            const response = await this.submitActivity(formData);
            
            NotificationManager.showNotification(
                'Activity submitted successfully! It will be reviewed by your institution.',
                'success',
                'Activity Submitted'
            );
            
            this.resetForm();
            this.hideAddActivityModal();
            this.refreshActivities();
            
        } catch (error) {
            NotificationManager.showNotification(
                error.message || 'Failed to submit activity',
                'error',
                'Submission Failed'
            );
        } finally {
            Utils.hideLoading();
        }
    }

    collectFormData() {
        const form = document.getElementById('addActivityForm');
        const formData = new FormData();
        
        // Basic information
        formData.append('title', document.getElementById('activityTitle').value);
        formData.append('activityType', document.getElementById('activityType').value);
        formData.append('description', document.getElementById('activityDescription').value);
        
        // Activity details
        formData.append('startDate', document.getElementById('startDate').value);
        formData.append('endDate', document.getElementById('endDate').value);
        formData.append('durationHours', document.getElementById('durationHours').value);
        formData.append('venue', document.getElementById('venue').value);
        formData.append('organizer', document.getElementById('organizer').value);
        formData.append('roleInActivity', document.getElementById('roleInActivity').value);
        
        // Achievements & skills
        formData.append('achievement', document.getElementById('achievement').value);
        formData.append('skillsGained', document.getElementById('skillsGained').value);
        
        // Files
        const fileInput = document.getElementById('documents');
        if (fileInput.files.length > 0) {
            Array.from(fileInput.files).forEach(file => {
                formData.append('documents', file);
            });
        }
        
        return formData;
    }

    async submitActivity(formData) {
        return await Utils.makeRequest('/activities', {
            method: 'POST',
            body: formData,
            headers: {} // Remove Content-Type to let browser set it for FormData
        });
    }

    validateField(field) {
        const value = field.value.trim();
        const fieldName = field.name;
        let isValid = true;
        let errorMessage = '';

        // Clear previous errors
        this.clearFieldError(field);

        // Required field validation
        if (field.hasAttribute('required') && !value) {
            errorMessage = 'This field is required';
            isValid = false;
        }

        // Specific field validations
        switch (fieldName) {
            case 'title':
                if (value && value.length < 3) {
                    errorMessage = 'Title must be at least 3 characters';
                    isValid = false;
                }
                break;
                
            case 'description':
                if (value && value.length < 10) {
                    errorMessage = 'Description must be at least 10 characters';
                    isValid = false;
                }
                break;
                
            case 'durationHours':
                if (value && (isNaN(value) || parseInt(value) < 1)) {
                    errorMessage = 'Duration must be a positive number';
                    isValid = false;
                }
                break;
        }

        if (!isValid) {
            this.showFieldError(field, errorMessage);
        }

        return isValid;
    }

    validateDates() {
        const startDate = document.getElementById('startDate');
        const endDate = document.getElementById('endDate');
        
        if (!startDate || !endDate) return;
        
        const startValue = startDate.value;
        const endValue = endDate.value;
        
        if (startValue && endValue) {
            const start = new Date(startValue);
            const end = new Date(endValue);
            
            if (end < start) {
                this.showFieldError(endDate, 'End date must be after start date');
                return false;
            } else {
                this.clearFieldError(endDate);
            }
        }
        
        return true;
    }

    validateCurrentStep() {
        const currentStepEl = document.querySelector(`.form-step[data-step="${this.currentStep}"]`);
        if (!currentStepEl) return true;

        const fields = currentStepEl.querySelectorAll('input, textarea, select');
        let allValid = true;

        fields.forEach(field => {
            if (!this.validateField(field)) {
                allValid = false;
            }
        });

        // Special validation for dates
        if (this.currentStep === 2) {
            if (!this.validateDates()) {
                allValid = false;
            }
        }

        return allValid;
    }

    showFieldError(field, message) {
        field.classList.add('error');
        
        // Remove existing error message
        const existingError = field.parentElement.querySelector('.form-error');
        if (existingError) {
            existingError.remove();
        }
        
        // Add new error message
        const errorEl = document.createElement('div');
        errorEl.className = 'form-error';
        errorEl.textContent = message;
        field.parentElement.appendChild(errorEl);
    }

    clearFieldError(field) {
        field.classList.remove('error');
        const errorEl = field.parentElement.querySelector('.form-error');
        if (errorEl) {
            errorEl.remove();
        }
    }

    // Multi-step form navigation
    nextStep() {
        if (!this.validateCurrentStep()) {
            NotificationManager.showNotification('Please fix the errors before proceeding', 'warning');
            return;
        }

        if (this.currentStep < this.totalSteps) {
            this.currentStep++;
            this.updateStepDisplay();
        }
    }

    previousStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateStepDisplay();
        }
    }

    updateStepDisplay() {
        // Hide all steps
        const steps = document.querySelectorAll('.form-step');
        steps.forEach(step => step.classList.remove('active'));
        
        // Show current step
        const currentStepEl = document.querySelector(`.form-step[data-step="${this.currentStep}"]`);
        if (currentStepEl) {
            currentStepEl.classList.add('active');
        }
        
        // Update navigation buttons
        const prevBtn = document.getElementById('prevStepBtn');
        const nextBtn = document.getElementById('nextStepBtn');
        const submitBtn = document.getElementById('submitActivityBtn');
        
        if (prevBtn) {
            prevBtn.style.display = this.currentStep > 1 ? 'inline-flex' : 'none';
        }
        
        if (nextBtn) {
            nextBtn.style.display = this.currentStep < this.totalSteps ? 'inline-flex' : 'none';
        }
        
        if (submitBtn) {
            submitBtn.style.display = this.currentStep === this.totalSteps ? 'inline-flex' : 'none';
        }
    }

    // File handling
    handleFileSelect(event) {
        const files = Array.from(event.target.files);
        this.displaySelectedFiles(files);
    }

    handleDragOver(event) {
        event.preventDefault();
        event.currentTarget.classList.add('dragover');
    }

    handleDragLeave(event) {
        event.currentTarget.classList.remove('dragover');
    }

    handleFileDrop(event) {
        event.preventDefault();
        event.currentTarget.classList.remove('dragover');
        
        const files = Array.from(event.dataTransfer.files);
        const fileInput = document.getElementById('documents');
        
        // Update file input
        const dt = new DataTransfer();
        files.forEach(file => dt.items.add(file));
        fileInput.files = dt.files;
        
        this.displaySelectedFiles(files);
    }

    displaySelectedFiles(files) {
        const container = document.getElementById('selectedFiles');
        if (!container) return;
        
        container.innerHTML = '';
        
        files.forEach((file, index) => {
            const fileEl = document.createElement('div');
            fileEl.className = 'file-item';
            fileEl.innerHTML = `
                <div class="file-info">
                    <i class="fas fa-${this.getFileIcon(file.type)}"></i>
                    <div>
                        <div class="file-name">${Utils.escapeHtml(file.name)}</div>
                        <div class="file-size">${Utils.formatFileSize(file.size)}</div>
                    </div>
                </div>
                <button type="button" class="file-remove" onclick="activityManager.removeFile(${index})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            container.appendChild(fileEl);
        });
    }

    removeFile(index) {
        const fileInput = document.getElementById('documents');
        const dt = new DataTransfer();
        
        Array.from(fileInput.files).forEach((file, i) => {
            if (i !== index) {
                dt.items.add(file);
            }
        });
        
        fileInput.files = dt.files;
        this.displaySelectedFiles(Array.from(fileInput.files));
    }

    getFileIcon(mimeType) {
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.includes('pdf')) return 'file-pdf';
        if (mimeType.includes('word')) return 'file-word';
        if (mimeType.includes('text')) return 'file-alt';
        return 'file';
    }

    handleTypeChange() {
        const activityType = document.getElementById('activityType').value;
        
        // You can add type-specific logic here
        // For example, show/hide certain fields based on type
        switch (activityType) {
            case 'internship':
                // Show company field, etc.
                break;
            case 'certification':
                // Show certification details
                break;
        }
    }

    // Activity filtering and searching
    async filterActivities(filter) {
        this.currentFilter = filter;
        this.currentPage = 1;
        await this.loadActivities();
    }

    async handleSearch(event) {
        this.searchQuery = event.target.value;
        this.currentPage = 1;
        await this.loadActivities();
    }

    async loadActivities() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        
        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                per_page: this.itemsPerPage,
                ...(this.currentFilter !== 'all' && { status: this.currentFilter }),
                ...(this.searchQuery && { search: this.searchQuery })
            });
            
            const response = await Utils.makeRequest(`/activities?${params}`);
            
            this.activities = response.activities;
            this.renderActivities();
            this.updatePagination(response.pagination);
            
        } catch (error) {
            console.error('Failed to load activities:', error);
            NotificationManager.showNotification('Failed to load activities', 'error');
        } finally {
            this.isLoading = false;
        }
    }

    renderActivities() {
        const container = document.getElementById('activitiesGrid');
        if (!container) return;
        
        if (this.activities.length === 0) {
            this.showEmptyState(container);
            return;
        }
        
        container.innerHTML = this.activities.map(activity => this.createActivityCard(activity)).join('');
    }

    createActivityCard(activity) {
        const categoryIcon = this.getCategoryIcon(activity.activity_type);
        const statusClass = activity.approval_status.replace('_', '-');
        
        return `
            <div class="activity-card" data-id="${activity.id}">
                <div class="activity-header">
                    <i class="fas fa-${categoryIcon}"></i>
                </div>
                <div class="activity-content">
                    <h3 class="activity-title">${Utils.escapeHtml(activity.title)}</h3>
                    <p class="activity-description">${Utils.escapeHtml(activity.description)}</p>
                    <div class="activity-meta">
                        <span><i class="far fa-calendar"></i> ${Utils.formatDate(activity.start_date)}</span>
                        <span class="status-badge status-${statusClass}">${activity.approval_status}</span>
                    </div>
                    <div class="activity-actions">
                        <button class="btn btn-sm" onclick="activityManager.viewActivity(${activity.id})">
                            <i class="fas fa-eye"></i> View
                        </button>
                        ${activity.approval_status === 'pending' ? `
                            <button class="btn btn-sm btn-outline" onclick="activityManager.editActivity(${activity.id})">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                        ` : ''}
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

    showEmptyState(container) {
        container.innerHTML = `
            <div class="empty-state col-span-full">
                <i class="fas fa-clipboard-list"></i>
                <h3>No activities found</h3>
                <p>${this.currentFilter === 'all' ? 'Start by adding your first activity' : `No ${this.currentFilter} activities found`}</p>
                ${this.currentFilter === 'all' ? `
                    <button class="btn btn-primary" onclick="showAddActivityModal()">
                        <i class="fas fa-plus"></i> Add Your First Activity
                    </button>
                ` : ''}
            </div>
        `;
    }

    // Activity actions
    async viewActivity(id) {
        try {
            const response = await Utils.makeRequest(`/activities/${id}`);
            this.showActivityDetailsModal(response.activity);
        } catch (error) {
            NotificationManager.showNotification('Failed to load activity details', 'error');
        }
    }

    async editActivity(id) {
        try {
            const response = await Utils.makeRequest(`/activities/${id}`);
            this.populateEditForm(response.activity);
            this.showAddActivityModal();
        } catch (error) {
            NotificationManager.showNotification('Failed to load activity for editing', 'error');
        }
    }

    async deleteActivity(id) {
        if (!confirm('Are you sure you want to delete this activity?')) {
            return;
        }

        try {
            await Utils.makeRequest(`/activities/${id}`, {
                method: 'DELETE'
            });
            
            NotificationManager.showNotification('Activity deleted successfully', 'success');
            this.refreshActivities();
            
        } catch (error) {
            NotificationManager.showNotification('Failed to delete activity', 'error');
        }
    }

    // Modal management
    resetForm() {
        const form = document.getElementById('addActivityForm');
        if (form) {
            form.reset();
            this.currentStep = 1;
            this.updateStepDisplay();
            
            // Clear file display
            const fileContainer = document.getElementById('selectedFiles');
            if (fileContainer) {
                fileContainer.innerHTML = '';
            }
            
            // Clear errors
            const errors = form.querySelectorAll('.form-error');
            errors.forEach(error => error.remove());
            
            const errorFields = form.querySelectorAll('.error');
            errorFields.forEach(field => field.classList.remove('error'));
        }
    }

    async refreshActivities() {
        await this.loadActivities();
    }
}

// Global functions
function showAddActivityModal() {
    const modal = document.getElementById('addActivityModal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function hideAddActivityModal() {
    const modal = document.getElementById('addActivityModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

function nextStep() {
    activityManager.nextStep();
}

function previousStep() {
    activityManager.previousStep();
}

function filterActivities(filter) {
    activityManager.filterActivities(filter);
}

// Initialize activity manager
const activityManager = new ActivityManager();

// Export for use in other modules
window.ActivityManager = activityManager;
window.showAddActivityModal = showAddActivityModal;
window.hideAddActivityModal = hideAddActivityModal;
window.nextStep = nextStep;
window.previousStep = previousStep;
window.filterActivities = filterActivities;
