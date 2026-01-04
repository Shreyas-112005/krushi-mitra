# 🚀 QUICK START REFERENCE CARD

## ONE-COMMAND SERVER START
```powershell
Push-Location "C:\Users\mahal\OneDrive\Documents\KRUSHI MITHRA 3.0\backend"; npm start
```

**OR** if server is already running:
```powershell
Stop-Process -Name node -Force -ErrorAction SilentlyContinue ; Start-Sleep -Seconds 2 ; Push-Location "C:\Users\mahal\OneDrive\Documents\KRUSHI MITHRA 3.0\backend"; npm start
```

---

## 🔗 IMPORTANT URLs

| What | URL |
|------|-----|
| **Admin Dashboard** | http://localhost:3000/frontend/html/admin-dashboard.html |
| **Admin Login** | http://localhost:3000/frontend/html/admin-login.html |
| **Farmer Registration** | http://localhost:3000/frontend/html/register.html |
| **Farmer Login** | http://localhost:3000/frontend/html/farmer-login.html |

---

## 🔐 ADMIN CREDENTIALS

```
Email: admin@krushimithra.com
Password: Admin@12345
```

---

## ✅ SERVER IS READY WHEN YOU SEE:

```
✅ Successfully connected to MongoDB
✅ MAIN_ADMIN already exists
✅ Market prices loaded successfully
🌾 KRUSHI MITHRA Server Started
```

---

## 🧪 QUICK TEST: AUTHENTICATION FLOW

### 1. Register New Farmer (WITH OTP)
→ http://localhost:3000/frontend/html/register.html
- Fill form with email, password, and details
- Click "Register Now" → OTP sent to email
- Enter 6-digit OTP → Registration complete
- Auto-login + redirect to dashboard ✅

### 2. Login as Farmer (EMAIL + PASSWORD)
→ http://localhost:3000/frontend/html/farmer-login.html
- Email: (your registered email)
- Password: (your password)
- Click "Login" → Dashboard ✅
- **NO OTP required for login!**

### 3. Login as Admin
→ http://localhost:3000/frontend/html/admin-login.html
- Email: admin@krushimithra.com
- Password: Admin@12345
- Access admin dashboard ✅

---

## 🛠️ COMMON FIXES

### Port Already in Use
```powershell
Stop-Process -Name node -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
npm start
```

### Module Not Found
```powershell
npm install
```

### Clear Browser Cache
Press: `Ctrl + Shift + Delete` → Clear all

---

## 📚 FULL GUIDES

- **Authentication Fix:** `AUTHENTICATION_FIX_COMPLETE.md` ⭐ **NEW - READ THIS!**
- **Complete Setup:** `START_SERVER_GUIDE.md`
- **API Documentation:** `backend/API_DOCUMENTATION.md`
- **Security Guide:** `SECURITY_GUIDE.md`

---

## ⚡ POWER USER COMMANDS

```powershell
# Navigate to backend
cd "C:\Users\mahal\OneDrive\Documents\KRUSHI MITHRA 3.0\backend"

# Start server
npm start

# Restart server (one-liner)
Push-Location "C:\Users\mahal\OneDrive\Documents\KRUSHI MITHRA 3.0\backend"; Stop-Process -Name node -Force -ErrorAction SilentlyContinue ; Start-Sleep -Seconds 2 ; npm start

# Check if server running
Get-Process node -ErrorAction SilentlyContinue

# Install dependencies
npm install

# View available scripts
npm run
```

---

## 🎯 VERIFICATION CHECKLIST

- [ ] Server running on http://localhost:3000
- [ ] Farmer can register with OTP verification
- [ ] OTP sent to email during registration
- [ ] Farmer can login with email + password (NO OTP)
- [ ] Admin can login
- [ ] Dashboard redirects working
- [ ] Market prices loading
- [ ] Subsidies CRUD working
- [ ] No "deprecated" error messages

---

## 🚨 WHEN THINGS GO WRONG

1. **Stop server:** `Ctrl + C`
2. **Kill all node processes:**
   ```powershell
   Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
   ```
3. **Clear browser:**
   - Press F12 → Console
   - Type: `localStorage.clear(); sessionStorage.clear(); location.reload();`
4. **Restart server:**
   ```powershell
   cd "C:\Users\mahal\OneDrive\Documents\KRUSHI MITHRA 3.0\backend"
   npm start
   ```
5. **Login fresh**

---

## 📊 PROJECT STATS

- **Backend Port:** 3000
- **Database:** MongoDB Atlas
- **Auth:** JWT (24h expiry)
- **Languages:** English, Kannada, Hindi
- **Features:** Admin Dashboard, Farmer Management, Market Prices, Subsidies, Weather

---

## 💡 PRO TIPS

1. **Keep server terminal open** to see real-time logs
2. **Use F12 Console** in browser for debugging
3. **Check Network tab** to see API calls
4. **Watch server logs** for error messages
5. **Clear browser cache** when things look broken

---

**Last Updated:** January 4, 2026  
**Server Version:** 1.0.0  
**Status:** ✅ Authentication Fixed - All Working!

**Copy this command now:**
```powershell
Push-Location "C:\Users\mahal\OneDrive\Documents\KRUSHI MITHRA 3.0\backend"; npm start
```
