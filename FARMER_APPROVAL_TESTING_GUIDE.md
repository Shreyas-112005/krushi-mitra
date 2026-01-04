# 🧪 FARMER APPROVAL TESTING GUIDE

## Quick Test - Admin Approval Flow

### Step 1: Register a Test Farmer

1. **Open Farmer Registration Page:**
   ```
   http://localhost:3000/frontend/html/register.html
   ```

2. **Fill the form with test data:**
   ```
   Full Name: Test Farmer Kumar
   Email: testfarmer@example.com
   Password: Test@123
   Mobile: 9876543210
   Location: Bangalore
   Crop Type: Rice
   Farm Size: 5 acres
   Language: Kannada
   ```

3. **Submit the form** - You should see success message

---

### Step 2: Login as Admin

1. **Open Admin Login:**
   ```
   http://localhost:3000/frontend/html/admin-login.html
   ```

2. **Enter credentials:**
   ```
   Email: admin@krushimithra.com
   Password: Admin@12345
   ```

3. **Click "Sign In"**

---

### Step 3: Approve the Farmer

1. **Once on Admin Dashboard**, click **"Farmers"** tab in navigation

2. **You should see** the pending farmer card:
   ```
   ┌─────────────────────────────────────┐
   │ Test Farmer Kumar          [pending]│
   │ 📧 testfarmer@example.com           │
   │ 📱 9876543210                       │
   │ 📍 Bangalore                        │
   │ 🌾 Rice                             │
   │ 🗣️ Kannada                          │
   │ 📅 [Registration Date]              │
   │                                     │
   │ [✅ Approve]  [❌ Reject]            │
   └─────────────────────────────────────┘
   ```

3. **Click "✅ Approve" button**

4. **Confirm** when prompted: "Are you sure you want to approve this farmer?"

5. **Expected Results:**
   - Card disappears from list
   - Success toast: "✅ Farmer approved successfully!"
   - Pending Approvals count decreases by 1
   - Approved Farmers count increases by 1

---

### Step 4: Verify Farmer Can Login

1. **Open Farmer Login Page:**
   ```
   http://localhost:3000/frontend/html/farmer-login.html
   ```

2. **Enter the farmer credentials:**
   ```
   Email: testfarmer@example.com
   Password: Test@123
   ```

3. **Click "Sign In"**

4. **Expected Result:**
   - Should successfully login
   - Redirected to farmer dashboard
   - Can access all features

---

## 🔍 Troubleshooting Approval Issues

### Issue 1: "✅ Approve" button not working (no response)

**Check in Browser Console (F12):**
```javascript
// Test if function is available
console.log(typeof window.approveFarmer); 
// Should output: "function"

// Test manually
window.approveFarmer('FARMER_ID_HERE');
```

**Solution:** Make sure `admin-dashboard-optimized.js` is loaded:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Type: `window.approveFarmer`
4. Should show: `ƒ approveFarmer(farmerId) { ... }`

If undefined, check:
- HTML has: `<script src="../js/admin-dashboard-optimized.js"></script>`
- No JavaScript errors in console
- File path is correct

---

### Issue 2: Approve button clicks but shows error

**Check Network Tab:**
1. Open DevTools (F12) → Network tab
2. Click "✅ Approve" button
3. Look for request to: `PUT /api/admin/farmers/:id/approve`
4. Check:
   - **Status Code:** Should be `200 OK`
   - **Response:** Should have `"success": true`
   - **Headers:** Should have `Authorization: Bearer ...`

**Common Errors:**

| Status Code | Error | Solution |
|-------------|-------|----------|
| 401 | Unauthorized | Token expired - login again |
| 404 | Not Found | Farmer ID is invalid |
| 500 | Server Error | Check server logs |

---

### Issue 3: Approval succeeds but farmer still can't login

**Check Farmer Status in Database:**

1. **Option A - Via API (Thunder Client / Postman):**
   ```
   GET http://localhost:3000/api/admin/farmers
   Authorization: Bearer YOUR_ADMIN_TOKEN
   ```
   
   Look for farmer and check:
   ```json
   {
     "email": "testfarmer@example.com",
     "status": "approved",  // ← Should be "approved"
     "approvedBy": "...",
     "approvedAt": "2026-01-04..."
   }
   ```

2. **Option B - Via MongoDB Compass:**
   - Open MongoDB Compass
   - Connect to: `mongodb+srv://cluster0.vvhdici.mongodb.net/`
   - Database: `krushi_mithra`
   - Collection: `farmers`
   - Find document with email: `testfarmer@example.com`
   - Check `status` field = `"approved"`

**Solution if status is not "approved":**
```javascript
// Manually update in MongoDB Compass:
{
  "status": "approved",
  "approvedBy": ObjectId("..."), // Your admin ID
  "approvedAt": ISODate("2026-01-04T...")
}
```

---

### Issue 4: No pending farmers showing up

**Verify farmers exist:**

1. **Check if any farmers registered:**
   - Open browser console on admin dashboard
   - Run:
   ```javascript
   fetch('http://localhost:3000/api/admin/farmers', {
     headers: {
       'Authorization': 'Bearer ' + (localStorage.getItem('token') || sessionStorage.getItem('adminToken'))
     }
   })
   .then(r => r.json())
   .then(d => console.log(d));
   ```

2. **Expected output:**
   ```json
   {
     "success": true,
     "count": 1,
     "farmers": [
       {
         "_id": "...",
         "fullName": "Test Farmer Kumar",
         "status": "pending",
         ...
       }
     ]
   }
   ```

3. **If count is 0:**
   - No farmers registered yet
   - Go register a farmer first (Step 1)

4. **If farmers exist but status is not "pending":**
   - They're already approved/rejected
   - Register a new test farmer

---

## 🔧 Manual Debugging Steps

### Debug Step 1: Check Token
```javascript
// In browser console:
const token = localStorage.getItem('token') || sessionStorage.getItem('adminToken');
console.log('Token exists:', !!token);
console.log('Token value:', token);
```

### Debug Step 2: Check API Response
```javascript
// In browser console:
async function testApproval(farmerId) {
  const token = localStorage.getItem('token') || sessionStorage.getItem('adminToken');
  const response = await fetch(`http://localhost:3000/api/admin/farmers/${farmerId}/approve`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  const data = await response.json();
  console.log('Response:', data);
}

// Replace FARMER_ID with actual ID
testApproval('FARMER_ID_HERE');
```

### Debug Step 3: Check Server Logs
Look in terminal where server is running for:
```
[ADMIN APPROVE] Approving farmer: 67...
[ADMIN APPROVE] Using MongoDB mode
[ADMIN APPROVE] ✅ Farmer approved: testfarmer@example.com
```

---

## 🎯 Complete Test Checklist

- [ ] Server is running (`npm start` in backend/)
- [ ] MongoDB is connected (see ✅ in server logs)
- [ ] Admin can login successfully
- [ ] Farmers tab shows in navigation
- [ ] Can see pending farmers list
- [ ] Approve button is visible and clickable
- [ ] Clicking approve shows confirmation dialog
- [ ] After confirmation, see loading state
- [ ] Card disappears from list after approval
- [ ] Success toast message appears
- [ ] Stats update correctly
- [ ] Approved farmer can login
- [ ] Approved farmer sees dashboard

---

## 🚨 Emergency Reset

### If nothing works, reset everything:

1. **Stop server:** `Ctrl + C` in terminal

2. **Clear browser storage:**
   ```javascript
   // In browser console:
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```

3. **Restart server:**
   ```powershell
   cd "C:\Users\mahal\OneDrive\Documents\KRUSHI MITHRA 3.0\backend"
   npm start
   ```

4. **Login fresh:**
   - Go to: http://localhost:3000/frontend/html/admin-login.html
   - Login with: admin@krushimithra.com / Admin@12345

5. **Try approval again**

---

## 📞 Quick Support Commands

### Check if server is running:
```powershell
Get-Process node -ErrorAction SilentlyContinue
```

### View server logs:
Just look at the terminal where you ran `npm start`

### Test API directly (PowerShell):
```powershell
# Get all farmers
$token = "YOUR_TOKEN_HERE"
$headers = @{ "Authorization" = "Bearer $token" }
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/farmers" -Headers $headers
```

---

## ✅ Expected Working Flow

```
1. Farmer Registers
   ↓
2. Status = "pending"
   ↓
3. Shows in Admin Dashboard "Farmers" tab
   ↓
4. Admin clicks "✅ Approve"
   ↓
5. Confirmation dialog appears
   ↓
6. Admin confirms
   ↓
7. API call: PUT /api/admin/farmers/:id/approve
   ↓
8. Database updates: status = "approved"
   ↓
9. Card removed from pending list
   ↓
10. Stats updated
   ↓
11. Farmer can now login ✅
```

---

## 🎉 Success Indicators

When everything works correctly, you'll see:

1. **In Admin Dashboard:**
   - ✅ Pending Approvals count decreases
   - ✅ Approved Farmers count increases
   - ✅ Farmer card disappears
   - ✅ Toast notification appears

2. **In Server Logs:**
   ```
   [ADMIN APPROVE] Approving farmer: 67...
   [ADMIN APPROVE] ✅ Farmer approved: testfarmer@example.com
   ```

3. **In Browser Network Tab:**
   - ✅ Status: 200 OK
   - ✅ Response: `{"success": true, ...}`

4. **Farmer Login:**
   - ✅ Can login successfully
   - ✅ Sees dashboard
   - ✅ All features accessible

---

**Need more help?** 
Check the main startup guide: `START_SERVER_GUIDE.md`
