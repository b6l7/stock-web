// Authentication and User Management
class AuthManager {
    constructor(app) {
        this.app = app;
        this.users = JSON.parse(localStorage.getItem('users')) || [];
        this.currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
        this.sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
        
        this.init();
    }

    init() {
        this.checkSession();
        this.setupAuthEventListeners();
        this.updateAuthUI();
    }

    setupAuthEventListeners() {
        // Show login modal
        document.addEventListener('click', (e) => {
            if (e.target.closest('.login-btn')) {
                e.preventDefault();
                this.showLoginModal();
            }
        });

        // Show register modal
        document.addEventListener('click', (e) => {
            if (e.target.closest('.register-btn')) {
                e.preventDefault();
                this.showRegisterModal();
            }
        });

        // Logout
        document.addEventListener('click', (e) => {
            if (e.target.closest('.logout-btn')) {
                e.preventDefault();
                this.logout();
            }
        });

        // Profile settings
        document.addEventListener('click', (e) => {
            if (e.target.closest('.profile-settings-btn')) {
                e.preventDefault();
                this.showProfileSettings();
            }
        });

        // Switch between login and register
        document.addEventListener('click', (e) => {
            if (e.target.closest('.switch-to-register')) {
                e.preventDefault();
                this.hideLoginModal();
                this.showRegisterModal();
            }
            
            if (e.target.closest('.switch-to-login')) {
                e.preventDefault();
                this.hideRegisterModal();
                this.showLoginModal();
            }
        });
    }

    // Session Management
    checkSession() {
        if (this.currentUser) {
            const loginTime = new Date(this.currentUser.loginTime);
            const now = new Date();
            
            if (now - loginTime > this.sessionTimeout) {
                this.logout();
                this.app.showNotification('Session expired. Please login again.', 'warning');
            }
        }
    }

    createSession(user) {
        const sessionUser = {
            ...user,
            loginTime: new Date().toISOString(),
            sessionId: this.generateSessionId()
        };
        
        this.currentUser = sessionUser;
        localStorage.setItem('currentUser', JSON.stringify(sessionUser));
        this.app.currentUser = sessionUser;
        
        return sessionUser;
    }

    generateSessionId() {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }

    // Authentication Methods
    async login(email, password) {
        try {
            // Simulate API call delay
            await this.delay(1000);
            
            // Find user
            const user = this.users.find(u => u.email === email);
            
            if (!user) {
                throw new Error('User not found');
            }
            
            // In a real app, you would hash and compare passwords
            if (user.password !== password) {
                throw new Error('Invalid password');
            }
            
            // Create session
            const sessionUser = this.createSession(user);
            
            // Update UI
            this.updateAuthUI();
            this.hideLoginModal();
            
            this.app.showNotification(`Welcome back, ${user.firstName}!`, 'success');
            
            return sessionUser;
            
        } catch (error) {
            this.app.showNotification(error.message, 'error');
            throw error;
        }
    }

    async register(userData) {
        try {
            // Simulate API call delay
            await this.delay(1000);
            
            // Validate data
            this.validateRegistrationData(userData);
            
            // Check if user already exists
            if (this.users.find(u => u.email === userData.email)) {
                throw new Error('User with this email already exists');
            }
            
            // Create new user
            const newUser = {
                id: Date.now(),
                firstName: userData.firstName,
                lastName: userData.lastName,
                email: userData.email,
                password: userData.password, // In real app, this would be hashed
                phone: userData.phone || '',
                country: userData.country || '',
                createdAt: new Date().toISOString(),
                isVerified: false,
                preferences: {
                    notifications: true,
                    newsletter: false,
                    darkMode: true
                }
            };
            
            // Save user
            this.users.push(newUser);
            localStorage.setItem('users', JSON.stringify(this.users));
            
            // Auto login
            const sessionUser = this.createSession(newUser);
            
            // Update UI
            this.updateAuthUI();
            this.hideRegisterModal();
            
            this.app.showNotification(`Account created successfully! Welcome, ${newUser.firstName}!`, 'success');
            
            return sessionUser;
            
        } catch (error) {
            this.app.showNotification(error.message, 'error');
            throw error;
        }
    }

    validateRegistrationData(data) {
        if (!data.firstName || data.firstName.trim().length < 2) {
            throw new Error('First name must be at least 2 characters');
        }
        
        if (!data.lastName || data.lastName.trim().length < 2) {
            throw new Error('Last name must be at least 2 characters');
        }
        
        if (!data.email || !this.isValidEmail(data.email)) {
            throw new Error('Please enter a valid email address');
        }
        
        if (!data.password || data.password.length < 6) {
            throw new Error('Password must be at least 6 characters');
        }
        
        if (data.password !== data.confirmPassword) {
            throw new Error('Passwords do not match');
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    logout() {
        this.currentUser = null;
        this.app.currentUser = null;
        localStorage.removeItem('currentUser');
        
        this.updateAuthUI();
        this.app.showNotification('Logged out successfully', 'info');
        
        // Redirect to dashboard
        this.app.navigateToPage('dashboard');
    }

    // UI Management
    updateAuthUI() {
        const authButtons = document.querySelector('.auth-buttons');
        const userMenu = document.querySelector('.user-menu');
        const profileBtn = document.querySelector('.profile-btn');
        
        if (this.currentUser) {
            // User is logged in
            if (authButtons) authButtons.style.display = 'none';
            if (userMenu) userMenu.style.display = 'flex';
            if (profileBtn) {
                profileBtn.style.display = 'flex';
                profileBtn.title = `${this.currentUser.firstName} ${this.currentUser.lastName}`;
            }
            
            // Update user name in UI
            const userNameElements = document.querySelectorAll('.user-name');
            userNameElements.forEach(el => {
                el.textContent = this.currentUser.firstName;
            });
            
        } else {
            // User is not logged in
            if (authButtons) authButtons.style.display = 'flex';
            if (userMenu) userMenu.style.display = 'none';
            if (profileBtn) profileBtn.style.display = 'none';
        }
    }

    showLoginModal() {
        this.app.showModal('loginModal');
        
        // Focus on email field
        setTimeout(() => {
            const emailField = document.querySelector('#loginEmail');
            if (emailField) emailField.focus();
        }, 100);
    }

    hideLoginModal() {
        this.app.hideModal('loginModal');
        this.clearLoginForm();
    }

    showRegisterModal() {
        this.app.showModal('registerModal');
        
        // Focus on first name field
        setTimeout(() => {
            const firstNameField = document.querySelector('#registerFirstName');
            if (firstNameField) firstNameField.focus();
        }, 100);
    }

    hideRegisterModal() {
        this.app.hideModal('registerModal');
        this.clearRegisterForm();
    }

    showProfileSettings() {
        if (!this.currentUser) {
            this.showLoginModal();
            return;
        }
        
        this.createProfileSettingsModal();
        this.app.showModal('profileSettingsModal');
    }

    createProfileSettingsModal() {
        // Remove existing modal if it exists
        const existingModal = document.getElementById('profileSettingsModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const modal = document.createElement('div');
        modal.id = 'profileSettingsModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Profile Settings</h2>
                    <button class="close-btn" onclick="stockApp.authManager.hideProfileSettings()">&times;</button>
                </div>
                <form id="profileSettingsForm" class="auth-form">
                    <div class="form-group">
                        <label for="profileFirstName">First Name</label>
                        <input type="text" id="profileFirstName" name="firstName" value="${this.currentUser.firstName}" required>
                    </div>
                    <div class="form-group">
                        <label for="profileLastName">Last Name</label>
                        <input type="text" id="profileLastName" name="lastName" value="${this.currentUser.lastName}" required>
                    </div>
                    <div class="form-group">
                        <label for="profileEmail">Email</label>
                        <input type="email" id="profileEmail" name="email" value="${this.currentUser.email}" required>
                    </div>
                    <div class="form-group">
                        <label for="profilePhone">Phone</label>
                        <input type="tel" id="profilePhone" name="phone" value="${this.currentUser.phone || ''}" placeholder="Optional">
                    </div>
                    <div class="form-group">
                        <label for="profileCountry">Country</label>
                        <input type="text" id="profileCountry" name="country" value="${this.currentUser.country || ''}" placeholder="Optional">
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" name="notifications" ${this.currentUser.preferences?.notifications ? 'checked' : ''}>
                            Enable notifications
                        </label>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" name="newsletter" ${this.currentUser.preferences?.newsletter ? 'checked' : ''}>
                            Subscribe to newsletter
                        </label>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Update Profile</button>
                        <button type="button" class="btn btn-secondary" onclick="stockApp.authManager.showChangePasswordModal()">Change Password</button>
                        <button type="button" class="btn btn-danger" onclick="stockApp.authManager.confirmDeleteAccount()">Delete Account</button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Setup form handler
        const form = document.getElementById('profileSettingsForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateProfile(new FormData(form));
        });
    }

    hideProfileSettings() {
        this.app.hideModal('profileSettingsModal');
    }

    async updateProfile(formData) {
        try {
            const updatedData = {
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                country: formData.get('country'),
                preferences: {
                    notifications: formData.get('notifications') === 'on',
                    newsletter: formData.get('newsletter') === 'on',
                    darkMode: this.currentUser.preferences?.darkMode || true
                }
            };
            
            // Validate
            if (!updatedData.firstName || !updatedData.lastName || !updatedData.email) {
                throw new Error('Please fill in all required fields');
            }
            
            if (!this.isValidEmail(updatedData.email)) {
                throw new Error('Please enter a valid email address');
            }
            
            // Update user in storage
            const userIndex = this.users.findIndex(u => u.id === this.currentUser.id);
            if (userIndex !== -1) {
                this.users[userIndex] = { ...this.users[userIndex], ...updatedData };
                localStorage.setItem('users', JSON.stringify(this.users));
            }
            
            // Update current session
            this.currentUser = { ...this.currentUser, ...updatedData };
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            this.app.currentUser = this.currentUser;
            
            this.updateAuthUI();
            this.hideProfileSettings();
            this.app.showNotification('Profile updated successfully!', 'success');
            
        } catch (error) {
            this.app.showNotification(error.message, 'error');
        }
    }

    clearLoginForm() {
        const form = document.getElementById('loginForm');
        if (form) form.reset();
    }

    clearRegisterForm() {
        const form = document.getElementById('registerForm');
        if (form) form.reset();
    }

    // Utility Methods
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Demo Methods (for testing)
    createDemoUser() {
        const demoUser = {
            id: 1,
            firstName: 'Demo',
            lastName: 'User',
            email: 'demo@example.com',
            password: 'demo123',
            phone: '+60 11-21026731',
            country: 'Malaysia',
            createdAt: new Date().toISOString(),
            isVerified: true,
            preferences: {
                notifications: true,
                newsletter: false,
                darkMode: true
            }
        };
        
        if (!this.users.find(u => u.email === demoUser.email)) {
            this.users.push(demoUser);
            localStorage.setItem('users', JSON.stringify(this.users));
        }
    }

    // Password Management
    showChangePasswordModal() {
        const modal = document.createElement('div');
        modal.id = 'changePasswordModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Change Password</h2>
                    <button class="close-btn" onclick="stockApp.authManager.hideChangePasswordModal()">&times;</button>
                </div>
                <form id="changePasswordForm" class="auth-form">
                    <div class="form-group">
                        <label for="currentPassword">Current Password</label>
                        <input type="password" id="currentPassword" name="currentPassword" required>
                    </div>
                    <div class="form-group">
                        <label for="newPassword">New Password</label>
                        <input type="password" id="newPassword" name="newPassword" required minlength="6">
                    </div>
                    <div class="form-group">
                        <label for="confirmNewPassword">Confirm New Password</label>
                        <input type="password" id="confirmNewPassword" name="confirmNewPassword" required>
                    </div>
                    <button type="submit" class="btn btn-primary">Change Password</button>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.app.showModal('changePasswordModal');
        
        const form = document.getElementById('changePasswordForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.changePassword(new FormData(form));
        });
    }

    hideChangePasswordModal() {
        this.app.hideModal('changePasswordModal');
        const modal = document.getElementById('changePasswordModal');
        if (modal) modal.remove();
    }

    async changePassword(formData) {
        try {
            const currentPassword = formData.get('currentPassword');
            const newPassword = formData.get('newPassword');
            const confirmNewPassword = formData.get('confirmNewPassword');
            
            if (this.currentUser.password !== currentPassword) {
                throw new Error('Current password is incorrect');
            }
            
            if (newPassword.length < 6) {
                throw new Error('New password must be at least 6 characters');
            }
            
            if (newPassword !== confirmNewPassword) {
                throw new Error('New passwords do not match');
            }
            
            // Update password
            const userIndex = this.users.findIndex(u => u.id === this.currentUser.id);
            if (userIndex !== -1) {
                this.users[userIndex].password = newPassword;
                localStorage.setItem('users', JSON.stringify(this.users));
            }
            
            this.currentUser.password = newPassword;
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            
            this.hideChangePasswordModal();
            this.app.showNotification('Password changed successfully!', 'success');
            
        } catch (error) {
            this.app.showNotification(error.message, 'error');
        }
    }

    confirmDeleteAccount() {
        if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            this.deleteAccount();
        }
    }

    deleteAccount() {
        // Remove user from storage
        this.users = this.users.filter(u => u.id !== this.currentUser.id);
        localStorage.setItem('users', JSON.stringify(this.users));
        
        // Logout
        this.logout();
        
        this.app.showNotification('Account deleted successfully', 'info');
    }
}

// Initialize auth manager when main app is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for main app to initialize
    setTimeout(() => {
        if (window.stockApp) {
            window.stockApp.authManager = new AuthManager(window.stockApp);
            
            // Create demo user for testing
            window.stockApp.authManager.createDemoUser();
        }
    }, 100);
});

