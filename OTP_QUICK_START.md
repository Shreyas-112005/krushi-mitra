# 🚀 KRUSHI MITHRA - OTP LOGIN QUICK START

## ⚡ ONE-STEP EMAIL SETUP

**Edit this file:** `backend/.env`

**Find these lines:**
```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

**Replace with your Gmail:**
```env
EMAIL_USER=shreyasmahalathakar11@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
```

**Get App Password:**
1. Visit: https://myaccount.google.com/apppasswords
2. Create password for "Mail" → "Other"
3. Copy 16-character password
4. Paste in `.env` file
5. Save and restart server

---

## 🧪 TEST NOW

### 1. Register New Farmer
**URL:** http://localhost:3000/frontend/html/register.html

**Important:**
- ❌ No password field anymore!
- ✅ Use YOUR real email for testing
- ✅ OTP will be sent to this email

### 2. Login with OTP
**URL:** http://localhost:3000/frontend/html/farmer-login.html

**Steps:**
1. Enter your registered email
2. Click "Send OTP"
3. Check your Gmail inbox
4. Enter 6-digit OTP
5. Click "Verify & Login"

---

## 🔑 DEV MODE (Testing Without Email)

**If email not configured yet:**

1. Open browser console (F12)
2. Request OTP
3. Check console for message:
   ```
   🔐 DEV MODE - OTP: 123456
   ```
4. Use this OTP to login

---

## ✅ WHAT CHANGED

### Farmer Login
- ❌ **REMOVED:** Password field
- ✅ **ADDED:** OTP-based 2-step login
- ✅ Email → OTP → Verify → Login

### Farmer Registration
- ❌ **REMOVED:** Password field
- ❌ **REMOVED:** Confirm Password field
- ✅ Register instantly, login with OTP

### Admin Login
- ✅ **UNCHANGED:** Still uses password
- Email: admin@krushimithra.com
- Password: Admin@12345

---

## 📋 QUICK CHECKLIST

Before testing:
- [ ] Server running (`npm start`)
- [ ] Email configured in `.env`
- [ ] Browser open to login page
- [ ] Real email ready for testing

During test:
- [ ] Registration works (no password)
- [ ] OTP email arrives
- [ ] OTP verification succeeds
- [ ] Dashboard loads after login

---

## 🎯 IMMEDIATE NEXT STEP

**RIGHT NOW:** Configure email in `.env` file!

```powershell
# Open file
notepad "C:\Users\mahal\OneDrive\Documents\KRUSHI MITHRA 3.0\backend\.env"

# Update EMAIL_USER and EMAIL_PASSWORD
# Save and close

# Restart server
cd "C:\Users\mahal\OneDrive\Documents\KRUSHI MITHRA 3.0\backend"
npm start
```

**Then test:** http://localhost:3000/frontend/html/register.html

---

**Full Guide:** [OTP_LOGIN_COMPLETE.md](OTP_LOGIN_COMPLETE.md)
