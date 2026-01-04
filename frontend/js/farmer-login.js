// API Configuration
const API_URL = 'http://localhost:3000/api';

// DOM Elements
const loginForm = document.getElementById('loginForm');
const submitBtn = document.getElementById('submitBtn');
const messageDiv = document.getElementById('message');

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
    // Check if already logged in
    const token = localStorage.getItem('token');
    if (token) {
        window.location.href = '/frontend/html/farmer-dashboard.html';
        return;
    }

    setupLoginForm();
});

// Setup Login Form
function setupLoginForm() {
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleLogin();
    });
}

// Handle Login
async function handleLogin() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    // Validation
    if (!email || !password) {
        showMessage('Please enter both email and password', 'error');
        return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showMessage('Please enter a valid email address', 'error');
        return;
    }

    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';

    try {
        const response = await fetch(`${API_URL}/farmers/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Save token and user data
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.farmer));
            localStorage.setItem('userType', 'farmer');

            showMessage('Login successful! Redirecting...', 'success');

            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = '/frontend/html/farmer-dashboard.html';
            }, 1000);
        } else {
            showMessage(data.message || 'Login failed', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Login';
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('Network error. Please try again.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Login';
    }
}

// Show message
function showMessage(message, type) {
    if (!messageDiv) return;

    messageDiv.textContent = message;
    messageDiv.className = `alert ${type === 'success' ? 'alert-success' : 'alert-error'} show`;
    messageDiv.style.display = 'block';

    // Auto-hide after 5 seconds (except for success messages)
    if (type !== 'success') {
        setTimeout(() => {
            messageDiv.style.display = 'none';
            messageDiv.classList.remove('show');
        }, 5000);
    }
}
