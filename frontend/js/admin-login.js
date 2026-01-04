// API Configuration
const API_URL = 'http://localhost:3000/api';

// DOM Elements
const loginForm = document.getElementById('adminLoginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const togglePasswordBtn = document.getElementById('togglePassword');
const rememberMeCheckbox = document.getElementById('rememberMe');
const loginMessage = document.getElementById('loginMessage');
const loadingOverlay = document.getElementById('loadingOverlay');

// Error Elements
const usernameError = document.getElementById('usernameError');
const passwordError = document.getElementById('passwordError');

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeLoginPage();
    setupEventListeners();
    checkRememberedUser();
});

// Initialize Login Page
function initializeLoginPage() {
    // Clear any previous session messages
    hideMessage();
    
    // Clear any stale tokens
    localStorage.removeItem('token');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    sessionStorage.clear();
    
    // Focus on username field
    usernameInput.focus();
    
    // Check URL parameters for error/session messages
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('session') === 'expired') {
        showMessage('⏰ Your session has expired. Please login again.', 'error');
    } else if (urlParams.get('error') === 'unauthorized') {
        showMessage('🚫 Unauthorized access. Admin privileges required.', 'error');
    } else if (urlParams.get('logout') === 'success') {
        showMessage('✅ You have been successfully logged out.', 'success');
    }
    
    // Clear URL parameters after showing message
    if (urlParams.toString()) {
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    console.log('🔐 Admin login page initialized');
}

// Setup Event Listeners
function setupEventListeners() {
    // Form submission
    loginForm.addEventListener('submit', handleLogin);
    
    // Password toggle
    togglePasswordBtn.addEventListener('click', togglePasswordVisibility);
    
    // Real-time validation
    usernameInput.addEventListener('input', () => clearError('username'));
    passwordInput.addEventListener('input', () => clearError('password'));
    
    // Enter key on inputs
    usernameInput.addEventListener('keypress', handleEnterKey);
    passwordInput.addEventListener('keypress', handleEnterKey);
}

// Handle Enter Key
function handleEnterKey(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        loginForm.dispatchEvent(new Event('submit'));
    }
}

// Toggle Password Visibility
function togglePasswordVisibility() {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    
    const eyeIcon = togglePasswordBtn.querySelector('.eye-icon');
    eyeIcon.textContent = type === 'password' ? '👁️' : '🙈';
}

// Validate Form
function validateForm() {
    let isValid = true;
    
    // Validate username
    if (!usernameInput.value.trim()) {
        showError('username', 'Username is required');
        isValid = false;
    } else if (usernameInput.value.trim().length < 3) {
        showError('username', 'Username must be at least 3 characters');
        isValid = false;
    }
    
    // Validate password
    if (!passwordInput.value) {
        showError('password', 'Password is required');
        isValid = false;
    } else if (passwordInput.value.length < 6) {
        showError('password', 'Password must be at least 6 characters');
        isValid = false;
    }
    
    return isValid;
}

// Show Error
function showError(field, message) {
    const input = field === 'username' ? usernameInput : passwordInput;
    const errorElement = field === 'username' ? usernameError : passwordError;
    
    input.classList.add('error');
    errorElement.textContent = message;
    errorElement.classList.add('show');
}

// Clear Error
function clearError(field) {
    const input = field === 'username' ? usernameInput : passwordInput;
    const errorElement = field === 'username' ? usernameError : passwordError;
    
    input.classList.remove('error');
    errorElement.textContent = '';
    errorElement.classList.remove('show');
}

// Handle Login
async function handleLogin(e) {
    e.preventDefault();
    
    // Hide any previous messages
    hideMessage();
    
    // Validate form
    if (!validateForm()) {
        return;
    }
    
    // Get form data - send as 'email' to match backend API
    const email = usernameInput.value.trim();
    const password = passwordInput.value;
    const rememberMe = rememberMeCheckbox.checked;
    
    try {
        // Show loading state
        setLoadingState(true);
        
        // Make API call with 'email' field
        const response = await fetch(`${API_URL}/admin/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            // Login successful
            showMessage('Login successful! Redirecting to dashboard...', 'success');
            
            // Store authentication data
            storeAuthData(result.token, result.admin, rememberMe);
            
            // Remember email if checkbox is checked
            if (rememberMe) {
                localStorage.setItem('rememberedUsername', email);
            } else {
                localStorage.removeItem('rememberedUsername');
            }
            
            // Redirect to admin dashboard after 1.5 seconds
            setTimeout(() => {
                window.location.href = 'admin-dashboard.html';
            }, 1500);
            
        } else {
            // Login failed
            showMessage(result.message || 'Invalid username or password', 'error');
            passwordInput.value = '';
            passwordInput.focus();
        }
        
    } catch (error) {
        console.error('Login error:', error);
        
        // Handle network errors
        if (error.message.includes('fetch')) {
            // Fallback for testing when backend is not running
            if (username === 'admin' && password === 'admin123') {
                showMessage('Login successful! (Demo mode - Backend not running)', 'success');
                
                // Store demo data
                const demoData = {
                    token: 'demo_token_' + Date.now(),
                    admin: {
                        id: 'demo_admin',
                        username: username,
                        role: 'admin'
                    }
                };
                
                localStorage.setItem('adminToken', demoData.token);
                localStorage.setItem('adminData', JSON.stringify(demoData.admin));
                
                setTimeout(() => {
                    showMessage('Redirecting would happen here with backend...', 'success');
                }, 1500);
            } else {
                showMessage('Cannot connect to server. Please check if the backend is running.', 'error');
            }
        } else {
            showMessage('An error occurred. Please try again.', 'error');
        }
    } finally {
        setLoadingState(false);
    }
}

// Store Authentication Data
function storeAuthData(token, adminData, rememberMe) {
    // Always use localStorage for consistency with farmer login
    localStorage.setItem('token', token);
    localStorage.setItem('adminData', JSON.stringify(adminData));
}

// Check Remembered User
function checkRememberedUser() {
    const rememberedUsername = localStorage.getItem('rememberedUsername');
    if (rememberedUsername) {
        usernameInput.value = rememberedUsername;
        rememberMeCheckbox.checked = true;
        passwordInput.focus();
    }
}

// Set Loading State
function setLoadingState(isLoading) {
    if (isLoading) {
        loginBtn.classList.add('loading');
        loginBtn.disabled = true;
        loadingOverlay.classList.add('show');
        usernameInput.disabled = true;
        passwordInput.disabled = true;
    } else {
        loginBtn.classList.remove('loading');
        loginBtn.disabled = false;
        loadingOverlay.classList.remove('show');
        usernameInput.disabled = false;
        passwordInput.disabled = false;
    }
}

// Show Message
function showMessage(message, type) {
    loginMessage.textContent = message;
    loginMessage.className = 'login-message show ' + type;
}

// Hide Message
function hideMessage() {
    loginMessage.className = 'login-message';
    loginMessage.textContent = '';
}

// Check if already logged in
function checkExistingSession() {
    const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
    if (token) {
        // User already logged in, redirect to dashboard
        window.location.href = 'admin-dashboard.html';
    }
}

// Call on page load
checkExistingSession();

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        validateForm,
        handleLogin
    };
}
