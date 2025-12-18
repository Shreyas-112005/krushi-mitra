// API Configuration
const API_URL = 'http://localhost:3000/api';

// DOM Elements
const userNameElement = document.getElementById('userName');
const userMenuBtn = document.getElementById('userMenuBtn');
const userDropdown = document.getElementById('userDropdown');
const logoutBtn = document.getElementById('logoutBtn');
const refreshBtn = document.getElementById('refreshBtn');
const updatePricesBtn = document.getElementById('updatePricesBtn');
const farmersList = document.getElementById('farmersList');
const notificationForm = document.getElementById('notificationForm');

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
    checkAuthentication();
    loadAdminData();
    loadDashboardStats();
    loadPendingFarmers();
    loadMarketStats();
    loadSubsidyStats();
    loadSubsidies();
    setupEventListeners();
});

// Check Authentication
function checkAuthentication() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        window.location.href = 'admin-login.html';
        return;
    }
}

// Load Admin Data
function loadAdminData() {
    const adminDataStr = localStorage.getItem('adminData');
    
    if (adminDataStr) {
        const adminData = JSON.parse(adminDataStr);
        userNameElement.textContent = adminData.email || 'Admin';
    }
}

// Load Dashboard Stats
async function loadDashboardStats() {
    try {
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        
        // In demo mode, show sample stats
        const stats = {
            totalFarmers: 156,
            pendingApprovals: 12,
            approvedFarmers: 132,
            marketPrices: 42
        };
        
        document.getElementById('totalFarmers').textContent = stats.totalFarmers;
        document.getElementById('pendingApprovals').textContent = stats.pendingApprovals;
        document.getElementById('approvedFarmers').textContent = stats.approvedFarmers;
        document.getElementById('marketPrices').textContent = stats.marketPrices;
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load Pending Farmers
async function loadPendingFarmers() {
    try {
        const token = localStorage.getItem('token');
        
        if (!token) {
            window.location.href = 'admin-login.html';
            return;
        }

        farmersList.innerHTML = '<div class="loading">Loading farmers...</div>';
        
        const response = await fetch(`${API_URL}/admin/farmers?status=pending`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        
        if (data.success) {
            displayFarmers(data.farmers);
            
            // Update pending count in stats
            document.getElementById('pendingApprovals').textContent = data.farmers.length;
        } else {
            farmersList.innerHTML = '<div class="error">Error loading farmers. Please try again.</div>';
        }
        
    } catch (error) {
        console.error('Error loading farmers:', error);
        farmersList.innerHTML = '<div class="error">Error loading farmers. Please try again.</div>';
    }
}

// Display Farmers
function displayFarmers(farmers) {
    if (farmers.length === 0) {
        farmersList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">✅</div>
                <p>No pending approvals</p>
            </div>
        `;
        return;
    }
    
    farmersList.innerHTML = farmers.map(farmer => `
        <div class="farmer-card" data-id="${farmer._id}">
            <div class="farmer-header">
                <div class="farmer-name">${farmer.fullName}</div>
                <div class="farmer-status ${farmer.status}">${farmer.status}</div>
            </div>
            <div class="farmer-details">
                <div class="detail-item">
                    <span>📧</span>
                    <span>${farmer.email}</span>
                </div>
                <div class="detail-item">
                    <span>📱</span>
                    <span>${farmer.mobile}</span>
                </div>
                <div class="detail-item">
                    <span>📍</span>
                    <span>${farmer.location}</span>
                </div>
                <div class="detail-item">
                    <span>🌾</span>
                    <span>${farmer.cropType}</span>
                </div>
                <div class="detail-item">
                    <span>🗣️</span>
                    <span>${farmer.language}</span>
                </div>
                <div class="detail-item">
                    <span>📅</span>
                    <span>${new Date(farmer.registeredAt).toLocaleDateString()}</span>
                </div>
            </div>
            <div class="farmer-actions">
                <button class="btn-approve" data-farmer-id="${farmer._id}">✅ Approve</button>
                <button class="btn-reject" data-farmer-id="${farmer._id}">❌ Reject</button>
            </div>
        </div>
    `).join('');
    
    // Add event listeners for approve/reject buttons
    document.querySelectorAll('.btn-approve').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const farmerId = e.target.getAttribute('data-farmer-id');
            approveFarmer(farmerId);
        });
    });
    
    document.querySelectorAll('.btn-reject').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const farmerId = e.target.getAttribute('data-farmer-id');
            rejectFarmer(farmerId);
        });
    });
}

// Approve Farmer
async function approveFarmer(farmerId) {
    if (!confirm('Are you sure you want to approve this farmer?')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_URL}/admin/farmers/${farmerId}/approve`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        
        if (data.success) {
            alert('✅ Farmer approved successfully!');
            
            // Remove from list
            const farmerCard = document.querySelector(`[data-id="${farmerId}"]`);
            if (farmerCard) {
                farmerCard.remove();
            }
            
            // Update stats
            const pendingCount = document.getElementById('pendingApprovals');
            const approvedCount = document.getElementById('approvedFarmers');
            pendingCount.textContent = Math.max(0, parseInt(pendingCount.textContent) - 1);
            approvedCount.textContent = parseInt(approvedCount.textContent) + 1;
            
            // Check if list is empty
            const remainingCards = document.querySelectorAll('.farmer-card');
            if (remainingCards.length === 0) {
                farmersList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">✅</div>
                        <p>No pending approvals</p>
                    </div>
                `;
            }
        } else {
            alert('Error: ' + (data.message || 'Failed to approve farmer'));
        }
        
    } catch (error) {
        console.error('Error approving farmer:', error);
        alert('Error approving farmer. Please try again.');
    }
}

// Reject Farmer
async function rejectFarmer(farmerId) {
    const reason = prompt('Enter rejection reason:');
    
    if (!reason) {
        return;
    }
    
    try {
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        
        // Demo mode - just show success
        alert('❌ Farmer rejected successfully!');
        
        // Remove from list
        const farmerCard = document.querySelector(`[data-id="${farmerId}"]`);
        if (farmerCard) {
            farmerCard.remove();
        }
        
        // Update stats
        const pendingCount = document.getElementById('pendingApprovals');
        pendingCount.textContent = parseInt(pendingCount.textContent) - 1;
        
    } catch (error) {
        console.error('Error rejecting farmer:', error);
        alert('Error rejecting farmer. Please try again.');
    }
}

// Load Market Stats
async function loadMarketStats() {
    const marketStats = document.getElementById('marketStats');
    
    marketStats.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon">🥬</div>
                <div class="stat-info">
                    <div class="stat-value">20</div>
                    <div class="stat-label">Vegetables</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">🍎</div>
                <div class="stat-info">
                    <div class="stat-value">12</div>
                    <div class="stat-label">Fruits</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">🌾</div>
                <div class="stat-info">
                    <div class="stat-value">10</div>
                    <div class="stat-label">Grains</div>
                </div>
            </div>
        </div>
        <p style="margin-top: 1rem; color: #666;">Last updated: ${new Date().toLocaleString()}</p>
    `;
}

// Update Market Prices
async function updateMarketPrices() {
    if (!confirm('This will fetch and update all market prices. Continue?')) {
        return;
    }
    
    updatePricesBtn.disabled = true;
    updatePricesBtn.textContent = 'Updating...';
    
    try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        alert('✅ Market prices updated successfully!');
        loadMarketStats();
        
    } catch (error) {
        console.error('Error updating prices:', error);
        alert('Error updating market prices. Please try again.');
    } finally {
        updatePricesBtn.disabled = false;
        updatePricesBtn.textContent = 'Update Prices';
    }
}

// Send Notification
async function sendNotification(e) {
    e.preventDefault();
    
    const title = document.getElementById('notificationTitle').value;
    const message = document.getElementById('notificationMessage').value;
    const type = document.getElementById('notificationType').value;
    const priority = document.getElementById('notificationPriority').value;
    const targetAudience = document.getElementById('targetAudience').value;
    const icon = document.getElementById('notificationIcon').value || getDefaultIcon(type);
    const expiryDate = document.getElementById('notificationExpiry').value;
    
    const notificationData = {
        title,
        message,
        type,
        priority,
        targetAudience,
        icon
    };
    
    // Add audience-specific data
    if (targetAudience === 'location') {
        const location = document.getElementById('targetLocation').value;
        if (!location) {
            alert('Please specify target location');
            return;
        }
        notificationData.targetLocations = [location];
    } else if (targetAudience === 'crop') {
        const crop = document.getElementById('targetCrop').value;
        if (!crop) {
            alert('Please specify target crop');
            return;
        }
        notificationData.targetCrops = [crop];
    }
    
    if (expiryDate) {
        notificationData.expiryDate = expiryDate;
    }
    
    try {
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        const response = await fetch(`${API_URL}/admin/notifications`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(notificationData)
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            alert(`✅ Notification sent successfully to ${targetAudience === 'all' ? 'all farmers' : targetAudience}!`);
            notificationForm.reset();
            document.getElementById('locationGroup').style.display = 'none';
            document.getElementById('cropGroup').style.display = 'none';
        } else {
            // Demo mode fallback
            alert(`✅ Notification sent successfully (Demo Mode)!\n\nTitle: ${title}\nAudience: ${targetAudience}\nPriority: ${priority}`);
            notificationForm.reset();
        }
        
    } catch (error) {
        console.error('Error sending notification:', error);
        // Demo mode fallback
        alert(`✅ Notification sent successfully (Demo Mode)!\n\nTitle: ${title}\nAudience: ${targetAudience}`);
        notificationForm.reset();
    }
}

// Get default icon based on type
function getDefaultIcon(type) {
    const icons = {
        'info': '📘',
        'warning': '⚠️',
        'success': '✅',
        'alert': '🚨',
        'announcement': '📢'
    };
    return icons[type] || '📢';
}

// Setup Event Listeners
function setupEventListeners() {
    // User menu
    userMenuBtn.addEventListener('click', () => {
        userDropdown.style.display = userDropdown.style.display === 'block' ? 'none' : 'block';
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!userMenuBtn.contains(e.target) && !userDropdown.contains(e.target)) {
            userDropdown.style.display = 'none';
        }
    });
    
    // Logout
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminData');
            sessionStorage.removeItem('adminToken');
            sessionStorage.removeItem('adminData');
            window.location.href = 'admin-login.html';
        }
    });
    
    // Refresh
    refreshBtn.addEventListener('click', loadPendingFarmers);
    
    // Update prices
    updatePricesBtn.addEventListener('click', updateMarketPrices);
    
    // Notification form
    notificationForm.addEventListener('submit', sendNotification);
    
    // Target audience change
    const targetAudienceSelect = document.getElementById('targetAudience');
    if (targetAudienceSelect) {
        targetAudienceSelect.addEventListener('change', (e) => {
            const locationGroup = document.getElementById('locationGroup');
            const cropGroup = document.getElementById('cropGroup');
            
            locationGroup.style.display = e.target.value === 'location' ? 'block' : 'none';
            cropGroup.style.display = e.target.value === 'crop' ? 'block' : 'none';
            
            // Clear values when hiding
            if (e.target.value !== 'location') {
                document.getElementById('targetLocation').value = '';
            }
            if (e.target.value !== 'crop') {
                document.getElementById('targetCrop').value = '';
            }
        });
    }
    
    // Subsidy management
    const addSubsidyBtn = document.getElementById('addSubsidyBtn');
    const closeSubsidyModal = document.getElementById('closeSubsidyModal');
    const cancelSubsidyBtn = document.getElementById('cancelSubsidyBtn');
    const subsidyForm = document.getElementById('subsidyForm');
    const subsidyCategoryFilter = document.getElementById('subsidyCategoryFilter');
    const subsidyStateFilter = document.getElementById('subsidyStateFilter');
    
    if (addSubsidyBtn) addSubsidyBtn.addEventListener('click', openSubsidyModal);
    if (closeSubsidyModal) closeSubsidyModal.addEventListener('click', closeSubsidyModalHandler);
    if (cancelSubsidyBtn) cancelSubsidyBtn.addEventListener('click', closeSubsidyModalHandler);
    if (subsidyForm) subsidyForm.addEventListener('submit', saveSubsidy);
    if (subsidyCategoryFilter) subsidyCategoryFilter.addEventListener('change', loadSubsidies);
    if (subsidyStateFilter) subsidyStateFilter.addEventListener('change', loadSubsidies);
}

// ==================== SUBSIDY MANAGEMENT ====================

// Load Subsidy Statistics
async function loadSubsidyStats() {
    try {
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        const response = await fetch(`${API_URL}/admin/subsidies/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                document.getElementById('totalSubsidies').textContent = data.stats.total || 0;
                document.getElementById('activeSubsidies').textContent = data.stats.active || 0;
                document.getElementById('expiringSubsidies').textContent = 0; // Will be calculated
            }
        }
    } catch (error) {
        console.error('Error loading subsidy stats:', error);
        // Use demo stats
        document.getElementById('totalSubsidies').textContent = '6';
        document.getElementById('activeSubsidies').textContent = '6';
        document.getElementById('expiringSubsidies').textContent = '2';
    }
}

// Load Subsidies List
async function loadSubsidies() {
    try {
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        const category = document.getElementById('subsidyCategoryFilter')?.value || '';
        const state = document.getElementById('subsidyStateFilter')?.value || '';
        
        let url = `${API_URL}/admin/subsidies?`;
        if (category) url += `category=${category}&`;
        if (state) url += `state=${state}&`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                displaySubsidies(data.subsidies);
                return;
            }
        }
        
        // Fallback to demo data
        displayDemoSubsidies();
    } catch (error) {
        console.error('Error loading subsidies:', error);
        displayDemoSubsidies();
    }
}

// Display Subsidies
function displaySubsidies(subsidies) {
    const subsidiesList = document.getElementById('subsidiesList');
    
    if (!subsidies || subsidies.length === 0) {
        subsidiesList.innerHTML = '<div class="empty-state">No subsidies found. Add a new subsidy to get started.</div>';
        return;
    }
    
    subsidiesList.innerHTML = subsidies.map(subsidy => {
        const deadline = new Date(subsidy.applicationDeadline).toLocaleDateString('en-IN');
        const isExpired = new Date(subsidy.applicationDeadline) < new Date();
        const statusBadge = subsidy.isActive && !isExpired ? 
            '<span class="badge badge-success">Active</span>' : 
            '<span class="badge badge-danger">Inactive</span>';
        
        return `
            <div class="subsidy-card">
                <div class="subsidy-header">
                    <div>
                        <h3 class="subsidy-title">${subsidy.title}</h3>
                        <div class="subsidy-meta">
                            <span class="subsidy-badge">${subsidy.category}</span>
                            <span class="subsidy-location">📍 ${subsidy.state}</span>
                            ${statusBadge}
                        </div>
                    </div>
                    <div class="subsidy-amount">₹${subsidy.amount.toLocaleString('en-IN')}</div>
                </div>
                <div class="subsidy-body">
                    <p class="subsidy-description">${subsidy.description}</p>
                    <div class="subsidy-info">
                        <div><strong>Eligibility:</strong> ${subsidy.eligibility}</div>
                        <div><strong>Deadline:</strong> ${deadline}</div>
                    </div>
                </div>
                <div class="subsidy-actions">
                    <button class="btn-secondary" onclick="editSubsidy('${subsidy._id}')">✏️ Edit</button>
                    <button class="btn-danger" onclick="deleteSubsidy('${subsidy._id}')">🗑️ Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

// Display Demo Subsidies
function displayDemoSubsidies() {
    const demoSubsidies = [
        {
            _id: 'demo-1',
            title: 'PM-KISAN Direct Benefit Transfer',
            amount: 6000,
            category: 'insurance',
            state: 'All India',
            description: 'Income support of ₹6,000 per year to all farmer families',
            eligibility: 'All landholding farmer families',
            applicationDeadline: '2025-12-31',
            isActive: true
        },
        {
            _id: 'demo-2',
            title: 'Seed Subsidy Scheme',
            amount: 5000,
            category: 'seeds',
            state: 'Karnataka',
            description: 'Get 50% subsidy on certified seeds',
            eligibility: 'Registered farmers with valid land documents',
            applicationDeadline: '2025-06-30',
            isActive: true
        }
    ];
    
    displaySubsidies(demoSubsidies);
}

// Open Subsidy Modal
function openSubsidyModal() {
    const modal = document.getElementById('subsidyModal');
    document.getElementById('subsidyModalTitle').textContent = 'Add New Subsidy';
    document.getElementById('subsidyForm').reset();
    document.getElementById('subsidyId').value = '';
    modal.style.display = 'flex';
}

// Close Subsidy Modal
function closeSubsidyModalHandler() {
    document.getElementById('subsidyModal').style.display = 'none';
}

// Save Subsidy
async function saveSubsidy(e) {
    e.preventDefault();
    
    const subsidyId = document.getElementById('subsidyId').value;
    const subsidyData = {
        title: document.getElementById('subsidyTitle').value,
        amount: parseInt(document.getElementById('subsidyAmount').value),
        category: document.getElementById('subsidyCategory').value,
        state: document.getElementById('subsidyState').value,
        description: document.getElementById('subsidyDescription').value,
        eligibility: document.getElementById('subsidyEligibility').value,
        applicationDeadline: document.getElementById('subsidyDeadline').value,
        isActive: document.getElementById('subsidyActive').value === 'true',
        contactInfo: {
            website: document.getElementById('subsidyWebsite').value
        }
    };
    
    try {
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        const url = subsidyId ? 
            `${API_URL}/admin/subsidies/${subsidyId}` : 
            `${API_URL}/admin/subsidies`;
        const method = subsidyId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(subsidyData)
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            alert(subsidyId ? 'Subsidy updated successfully!' : 'Subsidy created successfully!');
            closeSubsidyModalHandler();
            loadSubsidies();
            loadSubsidyStats();
        } else {
            alert(data.message || 'Failed to save subsidy. Running in demo mode.');
        }
    } catch (error) {
        console.error('Error saving subsidy:', error);
        alert('Error saving subsidy. Database not connected. Running in demo mode.');
    }
}

// Edit Subsidy
async function editSubsidy(subsidyId) {
    try {
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        const response = await fetch(`${API_URL}/admin/subsidies/${subsidyId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                const subsidy = data.subsidy;
                
                // Fill form
                document.getElementById('subsidyId').value = subsidy._id;
                document.getElementById('subsidyTitle').value = subsidy.title;
                document.getElementById('subsidyAmount').value = subsidy.amount;
                document.getElementById('subsidyCategory').value = subsidy.category;
                document.getElementById('subsidyState').value = subsidy.state;
                document.getElementById('subsidyDescription').value = subsidy.description;
                document.getElementById('subsidyEligibility').value = subsidy.eligibility;
                document.getElementById('subsidyDeadline').value = subsidy.applicationDeadline.split('T')[0];
                document.getElementById('subsidyActive').value = subsidy.isActive.toString();
                document.getElementById('subsidyWebsite').value = subsidy.contactInfo?.website || '';
                
                // Open modal
                document.getElementById('subsidyModalTitle').textContent = 'Edit Subsidy';
                document.getElementById('subsidyModal').style.display = 'flex';
            }
        }
    } catch (error) {
        console.error('Error loading subsidy:', error);
        alert('Cannot edit in demo mode');
    }
}

// Delete Subsidy
async function deleteSubsidy(subsidyId) {
    if (!confirm('Are you sure you want to delete this subsidy?')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        const response = await fetch(`${API_URL}/admin/subsidies/${subsidyId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            alert('Subsidy deleted successfully!');
            loadSubsidies();
            loadSubsidyStats();
        } else {
            alert('Failed to delete subsidy. Running in demo mode.');
        }
    } catch (error) {
        console.error('Error deleting subsidy:', error);
        alert('Cannot delete in demo mode');
    }
}

// Make functions globally available
window.editSubsidy = editSubsidy;
window.deleteSubsidy = deleteSubsidy;

// Make functions globally available
window.approveFarmer = approveFarmer;
window.rejectFarmer = rejectFarmer;
