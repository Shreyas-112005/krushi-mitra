// API Configuration
const API_URL = 'http://localhost:3000/api';

// Registration state
let registrationData = {};
let otpSent = false;

// DOM Elements
const form = document.getElementById('registrationForm');
const submitBtn = document.getElementById('submitBtn');
const formMessage = document.getElementById('formMessage');

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
    setupFormSubmission();
    setupPasswordValidation();
});

// Setup Form Submission
function setupFormSubmission() {
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!otpSent) {
            // Step 1: Request OTP
            await requestOTP();
        } else {
            // Step 2: Verify OTP and Register
            await verifyOTPAndRegister();
        }
    });
}

// Setup Password Validation
function setupPasswordValidation() {
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirmPassword');

    if (confirmPassword) {
        confirmPassword.addEventListener('input', () => {
            if (password.value !== confirmPassword.value) {
                confirmPassword.setCustomValidity('Passwords do not match');
            } else {
                confirmPassword.setCustomValidity('');
            }
        });
    }
}

// Step 1: Request OTP
async function requestOTP() {
    // Collect form data
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const mobile = document.getElementById('mobile').value.trim();
    const location = document.getElementById('location').value.trim();
    const cropType = document.getElementById('cropType').value;
    const language = document.getElementById('language').value;
    const terms = document.getElementById('terms').checked;

    // Validation
    if (!fullName || !email || !password || !mobile || !location || !cropType || !language) {
        showMessage('Please fill all required fields', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showMessage('Passwords do not match', 'error');
        return;
    }

    if (password.length < 8) {
        showMessage('Password must be at least 8 characters', 'error');
        return;
    }

    if (!terms) {
        showMessage('Please accept the terms and conditions', 'error');
        return;
    }

    // Store registration data
    registrationData = {
        fullName,
        email,
        password,
        mobile,
        location,
        cropType,
        language
    };

    // Disable button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending OTP...';

    try {
        const response = await fetch(`${API_URL}/farmers/register/request-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, fullName })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            otpSent = true;
            showOTPInput();
            showMessage(`OTP sent to ${email}. Please check your email.`, 'success');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Verify OTP & Register';
        } else {
            showMessage(data.message || 'Failed to send OTP', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Register Now';
        }
    } catch (error) {
        console.error('OTP request error:', error);
        showMessage('Network error. Please try again.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Register Now';
    }
}

// Step 2: Verify OTP and Register
async function verifyOTPAndRegister() {
    const otp = document.getElementById('otp')?.value.trim();

    if (!otp || otp.length !== 6) {
        showMessage('Please enter the 6-digit OTP', 'error');
        return;
    }

    // Disable button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Registering...';

    try {
        const response = await fetch(`${API_URL}/farmers/register/verify-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...registrationData,
                otp
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Save token and redirect
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.farmer));
            localStorage.setItem('userType', 'farmer');

            showMessage('Registration successful! Redirecting to dashboard...', 'success');

            setTimeout(() => {
                window.location.href = '/frontend/html/farmer-dashboard.html';
            }, 2000);
        } else {
            showMessage(data.message || 'Registration failed', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Verify OTP & Register';
        }
    } catch (error) {
        console.error('Registration error:', error);
        showMessage('Network error. Please try again.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Verify OTP & Register';
    }
}

// Show OTP Input Field
function showOTPInput() {
    // Check if OTP field already exists
    let otpGroup = document.getElementById('otpGroup');
    
    if (!otpGroup) {
        // Create OTP input group
        otpGroup = document.createElement('div');
        otpGroup.id = 'otpGroup';
        otpGroup.className = 'form-group';
        otpGroup.style.animation = 'slideDown 0.3s ease-out';
        
        otpGroup.innerHTML = `
            <label for="otp">
                <span class="label-text">Enter OTP</span>
                <span class="required">*</span>
            </label>
            <input 
                type="text" 
                id="otp" 
                name="otp" 
                placeholder="Enter 6-digit OTP"
                maxlength="6"
                pattern="[0-9]{6}"
                required
                style="font-size: 1.2rem; letter-spacing: 0.5rem; text-align: center;"
            >
            <span class="error-message" id="otpError"></span>
            <p style="font-size: 0.85rem; color: #7f8c8d; margin-top: 0.5rem;">
                OTP has been sent to your email. It will expire in 5 minutes.
            </p>
        `;
        
        // Insert before submit button
        const submitContainer = document.querySelector('.form-actions');
        form.insertBefore(otpGroup, submitContainer);
        
        // Disable other form fields
        document.getElementById('fullName').disabled = true;
        document.getElementById('email').disabled = true;
        document.getElementById('password').disabled = true;
        document.getElementById('confirmPassword').disabled = true;
        document.getElementById('mobile').disabled = true;
        document.getElementById('location').disabled = true;
        document.getElementById('cropType').disabled = true;
        document.getElementById('language').disabled = true;
        document.getElementById('terms').disabled = true;
    }
}

// Show Message
function showMessage(message, type) {
    if (!formMessage) return;

    formMessage.textContent = message;
    formMessage.className = `form-message ${type}`;
    formMessage.style.display = 'block';

    // Scroll to message
    formMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Auto-hide after 5 seconds (except success)
    if (type !== 'success') {
        setTimeout(() => {
            formMessage.style.display = 'none';
        }, 5000);
    }
}

// Add CSS for form message
const style = document.createElement('style');
style.textContent = `
    .form-message {
        padding: 1rem;
        border-radius: 8px;
        margin: 1rem 0;
        font-size: 0.95rem;
        animation: slideDown 0.3s ease-out;
    }
    .form-message.success {
        background: #d4edda;
        color: #155724;
        border-left: 4px solid #28a745;
    }
    .form-message.error {
        background: #f8d7da;
        color: #721c24;
        border-left: 4px solid #dc3545;
    }
    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);
