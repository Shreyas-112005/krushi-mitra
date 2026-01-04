# 🔄 OTP-BASED LOGIN SYSTEM - IMPLEMENTATION GUIDE

## ⚠️ CRITICAL ARCHITECTURAL CHANGE

This document provides a **COMPLETE IMPLEMENTATION PLAN** to replace the Admin Approval system with OTP-based authentication.

---

## 📋 WHAT'S CHANGING

### ❌ OLD SYSTEM (Being Removed):
- Admin must approve/reject farmers
- Farmers wait for approval
- Password-based login with approval check
- Status: pending/approved/rejected

### ✅ NEW SYSTEM (Implementing):
- Farmers register and can login immediately
- OTP sent to email for verification
- No admin approval needed
- Admin can VIEW farmers only

---

## 🚀 IMPLEMENTATION STEPS

### Step 1: Install Required Packages

```bash
cd backend
npm install nodemailer
```

### Step 2: Configure Environment Variables

Add to `backend/.env`:

```env
# Email Configuration for OTP
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# For Gmail:
# 1. Enable 2FA on your Google account
# 2. Generate App Password: https://myaccount.google.com/apppasswords
# 3. Use the 16-character password here
```

---

## 📁 FILES ALREADY CREATED

### ✅ 1. OTP Service (`backend/services/otp.service.js`)

**Status:** ✅ CREATED  
**Location:** `c:\Users\mahal\OneDrive\Documents\KRUSHI MITHRA 3.0\backend\services\otp.service.js`

**Features:**
- 6-digit OTP generation
- SHA-256 hashing for security
- 5-minute expiration
- Email sending with HTML template
- Rate limiting (max 3 attempts)
- Automatic cleanup of expired OTPs

**Functions:**
```javascript
generateAndSendOTP(email, farmerName) // Generate + send
verifyOTP(email, otp)                 // Verify OTP
```

---

## 📝 FILES TO MODIFY

### 2. Farmer Model (`backend/models/farmer.model.js`)

**Changes Made:**
- ✅ Removed: `status`, `approvedAt`, `approvedBy`, `rejectionReason`
- ✅ Added: `isVerified`, `lastOTPRequestedAt`
- ✅ Password field kept (set to dummy value)

**New Schema Fields:**
```javascript
isVerified: {
  type: Boolean,
  default: false  // Set to true after first successful OTP login
},
lastOTPRequestedAt: {
  type: Date  // For rate limiting OTP requests
}
```

### 3. Farmer Routes (`backend/routes/farmer.routes.js`)

**Changes Made:**
- ✅ Updated registration (no password required)
- ✅ Added `/request-otp` endpoint
- ✅ Added `/verify-otp` endpoint
- ✅ Deprecated old `/login` endpoint

**New Endpoints:**

#### POST /api/farmers/register
```javascript
// Request
{
  "fullName": "Test Farmer",
  "email": "farmer@example.com",
  "mobile": "9876543210",
  "location": "Bangalore",
  "cropType": "rice",
  "language": "english"
}

// Response
{
  "success": true,
  "message": "Registration successful! You can now login using OTP sent to your email.",
  "farmer": { ...farmerDetails }
}
```

#### POST /api/farmers/request-otp
```javascript
// Request
{
  "email": "farmer@example.com"
}

// Response (Success)
{
  "success": true,
  "message": "OTP sent successfully to your email",
  "email": "farmer@example.com",
  "otp": "123456"  // Only in development mode
}

// Response (Rate Limited)
{
  "success": false,
  "message": "Please wait before requesting another OTP",
  "retryAfter": 45  // seconds
}
```

#### POST /api/farmers/verify-otp
```javascript
// Request
{
  "email": "farmer@example.com",
  "otp": "123456"
}

// Response (Success)
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "farmer": {
    "id": "...",
    "fullName": "Test Farmer",
    "email": "farmer@example.com",
    ...
  }
}

// Response (Invalid OTP)
{
  "success": false,
  "message": "Invalid OTP"  // or "OTP has expired" or "Too many failed attempts"
}
```

---

### 4. Admin Routes (`backend/routes/admin.routes.js`)

**Changes Needed:**

#### ❌ REMOVE These Routes:
```javascript
PUT  /api/admin/farmers/:id/approve
PUT  /api/admin/farmers/:id/reject  
PUT  /api/admin/farmers/:id/suspend
GET  /api/admin/farmers/:id/debug
```

#### ✅ UPDATE These Routes:

**GET /api/admin/farmers**
```javascript
// Remove status filtering
// Show ALL farmers (no pending/approved distinction)
router.get('/farmers', verifyMainAdmin, async (req, res) => {
  const { search, page = 1, limit = 50 } = req.query;
  
  const query = {};
  if (search) {
    query.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { mobile: { $regex: search, $options: 'i' } }
    ];
  }
  
  const farmers = await Farmer.find(query)
    .select('-password')
    .sort({ registeredAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit);
  
  res.json({
    success: true,
    farmers,
    total: await Farmer.countDocuments(query)
  });
});
```

**GET /api/admin/stats**
```javascript
// Remove approval-related stats
router.get('/stats', verifyMainAdmin, async (req, res) => {
  const stats = {
    totalFarmers: await Farmer.countDocuments(),
    verifiedFarmers: await Farmer.countDocuments({ isVerified: true }),
    unverifiedFarmers: await Farmer.countDocuments({ isVerified: false }),
    activeToday: await Farmer.countDocuments({
      lastLogin: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }),
    totalSubsidies: await Subsidy.countDocuments(),
    marketPrices: await MarketPrice.countDocuments()
  };
  
  res.json({ success: true, stats });
});
```

---

### 5. Frontend: Registration Page (`frontend/html/register.html`)

**Changes Needed:**

#### ❌ REMOVE:
- Password input field
- Confirm password field
- Password validation

#### ✅ UPDATE:
```html
<form id="farmerRegisterForm">
  <input type="text" name="fullName" required placeholder="Full Name">
  <input type="email" name="email" required placeholder="Email">
  <input type="tel" name="mobile" required placeholder="Mobile (10 digits)">
  <input type="text" name="location" required placeholder="Location">
  <select name="cropType" required>
    <option value="">Select Crop Type</option>
    <option value="rice">Rice</option>
    <option value="wheat">Wheat</option>
    <option value="vegetables">Vegetables</option>
    <!-- ... more options -->
  </select>
  <button type="submit">Register</button>
</form>

<script>
document.getElementById('farmerRegisterForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = {
    fullName: e.target.fullName.value,
    email: e.target.email.value,
    mobile: e.target.mobile.value,
    location: e.target.location.value,
    cropType: e.target.cropType.value
  };
  
  const response = await fetch('http://localhost:3000/api/farmers/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  });
  
  const data = await response.json();
  
  if (data.success) {
    alert('Registration successful! Please check your email for OTP to login.');
    window.location.href = 'farmer-login.html';
  } else {
    alert(data.message);
  }
});
</script>
```

---

### 6. Frontend: Farmer Login Page (`frontend/html/farmer-login.html`)

**Complete Rewrite Needed:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Farmer Login - KRUSHI MITHRA</title>
  <link rel="stylesheet" href="../css/style.css">
  <style>
    .otp-container {
      display: none;
    }
    .otp-container.active {
      display: block;
    }
    .otp-input {
      width: 50px;
      height: 50px;
      font-size: 24px;
      text-align: center;
      margin: 5px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🌾 Farmer Login</h1>
    
    <!-- Step 1: Email Input -->
    <div id="emailStep">
      <form id="emailForm">
        <input type="email" id="email" placeholder="Enter your email" required>
        <button type="submit">Send OTP</button>
      </form>
    </div>
    
    <!-- Step 2: OTP Input -->
    <div id="otpStep" class="otp-container">
      <p>OTP sent to <strong id="displayEmail"></strong></p>
      <form id="otpForm">
        <div style="display: flex; justify-content: center;">
          <input type="text" class="otp-input" maxlength="1" />
          <input type="text" class="otp-input" maxlength="1" />
          <input type="text" class="otp-input" maxlength="1" />
          <input type="text" class="otp-input" maxlength="1" />
          <input type="text" class="otp-input" maxlength="1" />
          <input type="text" class="otp-input" maxlength="1" />
        </div>
        <button type="submit">Verify & Login</button>
        <button type="button" id="resendBtn">Resend OTP</button>
      </form>
    </div>
  </div>

  <script>
    const API_URL = 'http://localhost:3000/api';
    let userEmail = '';

    // Step 1: Request OTP
    document.getElementById('emailForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      userEmail = document.getElementById('email').value;

      try {
        const response = await fetch(`${API_URL}/farmers/request-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userEmail })
        });

        const data = await response.json();

        if (data.success) {
          document.getElementById('emailStep').style.display = 'none';
          document.getElementById('otpStep').classList.add('active');
          document.getElementById('displayEmail').textContent = userEmail;
          
          // In development, log OTP
          if (data.otp) {
            console.log('OTP:', data.otp);
            alert(`DEV MODE: OTP is ${data.otp}`);
          } else {
            alert('OTP sent to your email!');
          }
        } else {
          alert(data.message);
        }
      } catch (error) {
        alert('Failed to send OTP. Please try again.');
      }
    });

    // OTP input auto-focus
    const otpInputs = document.querySelectorAll('.otp-input');
    otpInputs.forEach((input, index) => {
      input.addEventListener('input', (e) => {
        if (e.target.value.length === 1 && index < otpInputs.length - 1) {
          otpInputs[index + 1].focus();
        }
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && index > 0) {
          otpInputs[index - 1].focus();
        }
      });
    });

    // Step 2: Verify OTP
    document.getElementById('otpForm').addEventListener('submit', async (e) => {
      e.preventDefault();

      const otp = Array.from(otpInputs).map(input => input.value).join('');

      if (otp.length !== 6) {
        alert('Please enter complete 6-digit OTP');
        return;
      }

      try {
        const response = await fetch(`${API_URL}/farmers/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userEmail, otp })
        });

        const data = await response.json();

        if (data.success) {
          localStorage.setItem('farmerToken', data.token);
          localStorage.setItem('farmerData', JSON.stringify(data.farmer));
          alert('Login successful!');
          window.location.href = 'farmer-dashboard.html';
        } else {
          alert(data.message);
          otpInputs.forEach(input => input.value = '');
          otpInputs[0].focus();
        }
      } catch (error) {
        alert('Verification failed. Please try again.');
      }
    });

    // Resend OTP
    document.getElementById('resendBtn').addEventListener('click', async () => {
      const response = await fetch(`${API_URL}/farmers/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail })
      });

      const data = await response.json();
      if (data.success) {
        alert('New OTP sent!');
        otpInputs.forEach(input => input.value = '');
        otpInputs[0].focus();
      } else {
        alert(data.message);
      }
    });
  </script>
</body>
</html>
```

---

### 7. Frontend: Admin Dashboard (`frontend/html/admin-dashboard.html`)

**Changes Needed:**

#### ❌ REMOVE from Farmers Section:
```html
<!-- Remove approve/reject buttons -->
<button onclick="approveFarmer(id)">Approve</button>
<button onclick="rejectFarmer(id)">Reject</button>
```

#### ✅ UPDATE Farmers Table:
```html
<table id="farmersTable">
  <thead>
    <tr>
      <th>Name</th>
      <th>Email</th>
      <th>Mobile</th>
      <th>Location</th>
      <th>Crop Type</th>
      <th>Verified</th>
      <th>Registered</th>
      <th>Last Login</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    <!-- Populated via JavaScript -->
  </tbody>
</table>

<script>
async function loadFarmers() {
  const response = await fetch('http://localhost:3000/api/admin/farmers', {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  
  const data = await response.json();
  
  const tbody = document.querySelector('#farmersTable tbody');
  tbody.innerHTML = data.farmers.map(farmer => `
    <tr>
      <td>${farmer.fullName}</td>
      <td>${farmer.email}</td>
      <td>${farmer.mobile}</td>
      <td>${farmer.location}</td>
      <td>${farmer.cropType}</td>
      <td>${farmer.isVerified ? '✅ Yes' : '⏳ No'}</td>
      <td>${new Date(farmer.registeredAt).toLocaleDateString()}</td>
      <td>${farmer.lastLogin ? new Date(farmer.lastLogin).toLocaleDateString() : 'Never'}</td>
      <td>
        <button onclick="viewFarmer('${farmer._id}')">👁️ View</button>
      </td>
    </tr>
  `).join('');
}

function viewFarmer(id) {
  // Show modal with full farmer details
  // No approve/reject actions
}
</script>
```

---

## 🧪 TESTING PROCEDURE

### 1. Test Farmer Registration
```bash
curl -X POST http://localhost:3000/api/farmers/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test Farmer",
    "email": "test@example.com",
    "mobile": "9876543210",
    "location": "Bangalore",
    "cropType": "rice"
  }'
```

Expected: Success message, farmer created

### 2. Test OTP Request
```bash
curl -X POST http://localhost:3000/api/farmers/request-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

Expected: OTP sent to email (check console in dev mode)

### 3. Test OTP Verification
```bash
curl -X POST http://localhost:3000/api/farmers/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "otp": "123456"
  }'
```

Expected: JWT token returned

### 4. Test Admin View Farmers
```bash
curl http://localhost:3000/api/admin/farmers \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Expected: List of all farmers (no status field)

---

## ✅ COMPLETION CHECKLIST

- [ ] OTP service created (`services/otp.service.js`)
- [ ] Email configured in `.env`
- [ ] Farmer model updated (removed approval fields)
- [ ] Farmer registration updated (no password)
- [ ] OTP endpoints created (`/request-otp`, `/verify-otp`)
- [ ] Old login endpoint deprecated
- [ ] Admin approval routes removed
- [ ] Admin farmers list updated (view only)
- [ ] Frontend registration updated (no password)
- [ ] Frontend login page rewritten (OTP-based)
- [ ] Admin dashboard updated (remove approve/reject)
- [ ] Testing completed

---

## 🚨 CRITICAL NOTES

1. **Email Configuration:** Must configure real email credentials for production
2. **OTP Storage:** Current implementation uses in-memory storage. For production, use Redis
3. **Rate Limiting:** Implemented at 1 OTP per minute per email
4. **Security:** OTPs are hashed using SHA-256 before storage
5. **Development Mode:** OTP is returned in API response for testing

---

## 📞 SUPPORT

If you encounter issues:
1. Check email configuration in `.env`
2. Verify nodemailer is installed
3. Check console logs for errors
4. Test with development mode to see OTP in console

**All OTP service code is ready in:** `backend/services/otp.service.js`  
**Follow this guide step-by-step to complete the migration.**
