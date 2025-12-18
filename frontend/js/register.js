// API Configuration
const API_URL = 'http://localhost:3000/api';

// DOM Elements
const form = document.getElementById('registrationForm');
const submitBtn = document.getElementById('submitBtn');
const formMessage = document.getElementById('formMessage');
const togglePasswordBtn = document.getElementById('togglePassword');

// Form Fields
const formFields = {
    fullName: document.getElementById('fullName'),
    email: document.getElementById('email'),
    mobile: document.getElementById('mobile'),
    password: document.getElementById('password'),
    confirmPassword: document.getElementById('confirmPassword'),
    location: document.getElementById('location'),
    cropType: document.getElementById('cropType'),
    language: document.getElementById('language'),
    terms: document.getElementById('terms')
};

// Error Message Elements
const errorElements = {
    fullName: document.getElementById('fullNameError'),
    email: document.getElementById('emailError'),
    mobile: document.getElementById('mobileError'),
    password: document.getElementById('passwordError'),
    confirmPassword: document.getElementById('confirmPasswordError'),
    location: document.getElementById('locationError'),
    cropType: document.getElementById('cropTypeError'),
    language: document.getElementById('languageError'),
    terms: document.getElementById('termsError')
};

// Validation Rules
const validationRules = {
    fullName: {
        required: true,
        minLength: 3,
        pattern: /^[a-zA-Z\s]+$/,
        message: 'Please enter a valid name (letters only, minimum 3 characters)'
    },
    email: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: 'Please enter a valid email address'
    },
    mobile: {
        required: true,
        pattern: /^[6-9]\d{9}$/,
        message: 'Please enter a valid 10-digit mobile number starting with 6-9'
    },
    password: {
        required: true,
        minLength: 8,
        pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
        message: 'Password must be at least 8 characters with uppercase, lowercase, and number'
    },
    confirmPassword: {
        required: true,
        match: 'password',
        message: 'Passwords do not match'
    },
    location: {
        required: true,
        minLength: 3,
        message: 'Please enter your location'
    },
    cropType: {
        required: true,
        message: 'Please select your primary crop type'
    },
    language: {
        required: true,
        message: 'Please select your preferred language'
    },
    terms: {
        required: true,
        message: 'You must agree to the terms and conditions'
    }
};

// Initialize Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    initializeValidation();
    setupPasswordToggle();
    setupFormSubmission();
});

// Initialize Real-time Validation
function initializeValidation() {
    Object.keys(formFields).forEach(fieldName => {
        const field = formFields[fieldName];
        
        if (field.type === 'checkbox') {
            field.addEventListener('change', () => validateField(fieldName));
        } else {
            // Validate on blur
            field.addEventListener('blur', () => validateField(fieldName));
            
            // Clear error on input
            field.addEventListener('input', () => {
                if (field.classList.contains('error')) {
                    clearError(fieldName);
                }
            });
        }
    });

    // Special handling for mobile number - only allow digits
    formFields.mobile.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '');
    });
}

// Setup Password Toggle
function setupPasswordToggle() {
    togglePasswordBtn.addEventListener('click', () => {
        const passwordField = formFields.password;
        const type = passwordField.type === 'password' ? 'text' : 'password';
        passwordField.type = type;
        togglePasswordBtn.textContent = type === 'password' ? '👁️' : '🙈';
    });
}

// Validate Individual Field
function validateField(fieldName) {
    const field = formFields[fieldName];
    const rules = validationRules[fieldName];
    const errorElement = errorElements[fieldName];
    
    if (!rules) return true;

    let isValid = true;
    let errorMessage = '';

    // Required validation
    if (rules.required) {
        if (field.type === 'checkbox') {
            if (!field.checked) {
                isValid = false;
                errorMessage = rules.message;
            }
        } else if (!field.value.trim()) {
            isValid = false;
            errorMessage = rules.message;
        }
    }

    // Pattern validation
    if (isValid && rules.pattern && field.value.trim()) {
        if (!rules.pattern.test(field.value.trim())) {
            isValid = false;
            errorMessage = rules.message;
        }
    }

    // Min length validation
    if (isValid && rules.minLength && field.value.trim()) {
        if (field.value.trim().length < rules.minLength) {
            isValid = false;
            errorMessage = rules.message;
        }
    }

    // Match validation (for confirm password)
    if (isValid && rules.match && field.value) {
        const matchField = formFields[rules.match];
        if (field.value !== matchField.value) {
            isValid = false;
            errorMessage = rules.message;
        }
    }

    // Update UI
    if (isValid) {
        field.classList.remove('error');
        field.classList.add('success');
        errorElement.textContent = '';
        errorElement.classList.remove('show');
    } else {
        field.classList.remove('success');
        field.classList.add('error');
        errorElement.textContent = errorMessage;
        errorElement.classList.add('show');
    }

    return isValid;
}

// Clear Error
function clearError(fieldName) {
    const field = formFields[fieldName];
    const errorElement = errorElements[fieldName];
    
    field.classList.remove('error');
    errorElement.textContent = '';
    errorElement.classList.remove('show');
}

// Validate All Fields
function validateForm() {
    let isValid = true;
    
    Object.keys(formFields).forEach(fieldName => {
        if (!validateField(fieldName)) {
            isValid = false;
        }
    });
    
    return isValid;
}

// Setup Form Submission
function setupFormSubmission() {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Validate form
        if (!validateForm()) {
            showMessage('Please correct the errors in the form', 'error');
            // Scroll to first error
            const firstError = form.querySelector('.error');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        // Prepare form data
        const formData = {
            fullName: formFields.fullName.value.trim(),
            email: formFields.email.value.trim().toLowerCase(),
            mobile: formFields.mobile.value.trim(),
            password: formFields.password.value,
            location: formFields.location.value.trim(),
            cropType: formFields.cropType.value,
            language: formFields.language.value,
            registeredAt: new Date().toISOString()
        };

        // Submit to backend
        await submitRegistration(formData);
    });
}

// Submit Registration to Backend
async function submitRegistration(formData) {
    try {
        // Show loading state
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
        hideMessage();

        // Make API call
        const response = await fetch(`${API_URL}/farmers/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (response.ok) {
            // Success
            showMessage('Registration successful! Redirecting to login...', 'success');
            form.reset();
            
            // Clear all success classes
            Object.values(formFields).forEach(field => {
                field.classList.remove('success', 'error');
            });

            // Redirect after 2 seconds
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        } else {
            // Error from server
            showMessage(result.message || 'Registration failed. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        
        // Show fallback success message if server is not running
        if (error.message.includes('fetch')) {
            showMessage('Registration data validated successfully! (Note: Backend server not running)', 'success');
            console.log('Form Data:', formData);
            
            // Reset form after showing success
            setTimeout(() => {
                form.reset();
                Object.values(formFields).forEach(field => {
                    field.classList.remove('success', 'error');
                });
            }, 2000);
        } else {
            showMessage('An error occurred. Please try again later.', 'error');
        }
    } finally {
        // Remove loading state
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
    }
}

// Show Message
function showMessage(message, type) {
    formMessage.textContent = message;
    formMessage.className = 'form-message show ' + type;
    formMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Hide Message
function hideMessage() {
    formMessage.className = 'form-message';
    formMessage.textContent = '';
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        validateField,
        validateForm
    };
}
