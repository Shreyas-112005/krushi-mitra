# 🚀 KRUSHI MITHRA - SERVER STARTUP GUIDE

## Quick Start Commands (Copy & Paste)

### Step 1: Navigate to Backend
```powershell
cd "C:\Users\mahal\OneDrive\Documents\KRUSHI MITHRA 3.0\backend"
```

### Step 2: Start Server
```powershell
npm start
```

**OR** if server is already running and needs restart:
```powershell
Stop-Process -Name node -Force -ErrorAction SilentlyContinue ; Start-Sleep -Seconds 2 ; npm start
```

---

## ✅ Success Indicators

Server started successfully when you see:
```
✅ Successfully connected to MongoDB
✅ MAIN_ADMIN already exists
📊 Loading initial market prices...
✅ Market prices loaded successfully
🌾 KRUSHI MITHRA Server Started
```

**Server URL:** http://localhost:3000

---

## 🔐 Default Admin Credentials

**Admin Dashboard:** http://localhost:3000/frontend/html/admin-dashboard.html

```
Email: admin@krushimithra.com
Password: Admin@12345
```

---

## 📋 Complete Startup Checklist

### Before Starting Server:

1. **Check MongoDB Connection**
   - MongoDB Atlas URL is configured in environment
   - Connection string: `mongodb+srv://cluster0.vvhdici.mongodb.net/krushi_mithra`

2. **Environment Variables** (Verify in `.env`):
   ```
   MONGODB_URI=mongodb+srv://...
   JWT_SECRET=your_jwt_secret_key_here_make_it_long_and_random
   PORT=3000
   ADMIN_EMAIL=admin@krushimithra.com
   ADMIN_PASSWORD=Admin@12345
   ```

### Starting Server:

1. Open **PowerShell** terminal in VS Code (Ctrl + `)

2. Copy and run:
   ```powershell
   cd "C:\Users\mahal\OneDrive\Documents\KRUSHI MITHRA 3.0\backend" ; npm start
   ```

3. Wait for success messages (2-3 seconds)

4. Open browser: http://localhost:3000/frontend/html/admin-dashboard.html

---

## 🛠️ Common Issues & Fixes

### Issue 1: "Port 3000 already in use"
```powershell
Stop-Process -Name node -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
npm start
```

### Issue 2: "MongoDB connection failed"
- Check internet connection
- Verify MongoDB Atlas cluster is running
- Check MONGODB_URI in .env file

### Issue 3: "Module not found" errors
```powershell
npm install
```

### Issue 4: Server hangs or no response
```powershell
# Force kill all node processes and restart
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 3
cd "C:\Users\mahal\OneDrive\Documents\KRUSHI MITHRA 3.0\backend"
npm start
```

---

## 📁 Project Structure Quick Reference

```
KRUSHI MITHRA 3.0/
├── backend/
│   ├── server.js              # Main entry point
│   ├── package.json           # Dependencies
│   ├── .env                   # Environment variables
│   ├── config/                # Database & scheduler config
│   ├── models/                # MongoDB models
│   ├── routes/                # API routes
│   ├── controllers/           # Business logic
│   ├── middleware/            # Auth & validation
│   └── services/              # External services
│
└── frontend/
    ├── html/                  # HTML pages
    ├── js/                    # JavaScript files
    ├── css/                   # Stylesheets
    └── languages/             # Multi-language support
```

---

## 🌐 Application URLs

| Page | URL |
|------|-----|
| Admin Dashboard | http://localhost:3000/frontend/html/admin-dashboard.html |
| Admin Login | http://localhost:3000/frontend/html/admin-login.html |
| Farmer Registration | http://localhost:3000/frontend/html/register.html |
| Farmer Login | http://localhost:3000/frontend/html/farmer-login.html |
| Farmer Dashboard | http://localhost:3000/frontend/html/farmer-dashboard.html |

---

## 📊 Testing the Application

### 1. Test Admin Login
```
1. Go to: http://localhost:3000/frontend/html/admin-login.html
2. Email: admin@krushimithra.com
3. Password: Admin@12345
4. Click "Sign In"
```

### 2. Test Farmer Registration & Approval
```
1. Register new farmer: http://localhost:3000/frontend/html/register.html
2. Fill all details and submit
3. Login as admin
4. Go to "Farmers" section
5. Click "✅ Approve" button
6. Farmer can now login at farmer-login.html
```

### 3. Test Market Prices
```
1. Login as admin
2. Navigate to "Market" section
3. Click "🔄 Update Prices" to fetch real data
4. View Karnataka vegetable prices in table
```

### 4. Test Subsidies
```
1. Login as admin
2. Navigate to "Subsidies" section
3. Click "➕ Add New Subsidy"
4. Fill form and save
5. Test Edit and Delete buttons
```

---

## 🔄 Daily Development Workflow

### Morning Startup:
```powershell
# Navigate to project
cd "C:\Users\mahal\OneDrive\Documents\KRUSHI MITHRA 3.0\backend"

# Start server
npm start
```

### After Code Changes:
```powershell
# Restart server
Ctrl + C  # Stop current server
npm start # Start again
```

**OR** use this one-liner:
```powershell
Stop-Process -Name node -Force -ErrorAction SilentlyContinue ; Start-Sleep -Seconds 2 ; cd "C:\Users\mahal\OneDrive\Documents\KRUSHI MITHRA 3.0\backend" ; npm start
```

### End of Day:
```powershell
# Stop server
Ctrl + C
```

---

## 🐛 Debugging Tips

### Enable Debug Logs
Server already has extensive logging. Watch for:
- `[ADMIN LOGIN]` - Admin authentication logs
- `[ADMIN APPROVE]` - Farmer approval logs
- `[MARKET PRICE]` - Market price updates
- `[SCHEDULER]` - Automated tasks

### Check Server Status
```powershell
# See if server is running
Get-Process node -ErrorAction SilentlyContinue
```

### View Real-time Logs
Server logs appear in terminal automatically. Look for:
- ❌ Red errors - Critical issues
- ⚠️ Yellow warnings - Optional fixes
- ✅ Green success - Everything working

---

## 📞 Database Access

### MongoDB Atlas Dashboard:
1. Visit: https://cloud.mongodb.com/
2. Login with your credentials
3. Select: `cluster0` → `krushi_mithra` database
4. Browse collections:
   - `admins` - Admin users
   - `farmers` - Registered farmers
   - `marketprices` - Vegetable prices
   - `subsidies` - Government subsidies
   - `notifications` - User notifications

---

## 🎯 API Testing (Postman/Thunder Client)

### Base URL
```
http://localhost:3000/api
```

### Example: Admin Login
```
POST http://localhost:3000/api/admin/login
Content-Type: application/json

{
  "email": "admin@krushimithra.com",
  "password": "Admin@12345"
}
```

### Example: Get Farmers (Requires Auth)
```
GET http://localhost:3000/api/admin/farmers
Authorization: Bearer <your_token_here>
```

---

## 🔒 Security Notes

1. **JWT Tokens** expire in 24 hours
2. **Admin routes** require `verifyMainAdmin` middleware
3. **Farmer routes** require JWT authentication
4. **Passwords** are hashed with bcryptjs
5. **CORS** is configured for security

---

## 📝 Quick Command Reference

```powershell
# Start server
npm start

# Install dependencies
npm install

# Check for updates
npm outdated

# Kill all node processes
Stop-Process -Name node -Force -ErrorAction SilentlyContinue

# Navigate to backend
cd "C:\Users\mahal\OneDrive\Documents\KRUSHI MITHRA 3.0\backend"

# One-liner restart
Stop-Process -Name node -Force -ErrorAction SilentlyContinue ; Start-Sleep -Seconds 2 ; npm start
```

---

## ✨ Features Overview

| Feature | Status | Access |
|---------|--------|--------|
| Admin Dashboard | ✅ Working | Admin only |
| Farmer Registration | ✅ Working | Public |
| Farmer Approval | ✅ Working | Admin only |
| Market Prices | ✅ Working | All users |
| Government Subsidies | ✅ Working | Admin CRUD |
| Weather Integration | ✅ Working | Farmers |
| Multi-language Support | ✅ Working | All users |
| MongoDB Atlas | ✅ Connected | Backend |

---

## 🎉 You're All Set!

Copy this command to start server anytime:
```powershell
cd "C:\Users\mahal\OneDrive\Documents\KRUSHI MITHRA 3.0\backend" ; npm start
```

Then open: http://localhost:3000/frontend/html/admin-dashboard.html

**Happy Coding! 🚀**
