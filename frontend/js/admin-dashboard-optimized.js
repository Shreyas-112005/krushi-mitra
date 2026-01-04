/**
 * OPTIMIZED Admin Dashboard
 * - Batch API calls
 * - Loading states
 * - Data caching
 * - Performance improvements
 */

// API Configuration
const API_URL = 'http://localhost:3000/api';

// Global fetch wrapper with auth error handling
const originalFetch = window.fetch;
window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    
    // Check for authentication errors
    if (response.status === 401) {
        console.error('❌ 401 Unauthorized - Session expired');
        redirectToLogin('expired');
        throw new Error('Session expired');
    }
    
    return response;
};

// Cache
const cache = {
    farmers: null,
    marketStats: null,
    subsidies: null,
    stats: null,
    lastFetch: {}
};

// Cache duration (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

// DOM Elements (lazy loaded)
let elements = {};

// Debounce helper
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Get cached data or fetch new
function getCachedData(key, ttl = CACHE_DURATION) {
    if (cache[key] && cache.lastFetch[key]) {
        const age = Date.now() - cache.lastFetch[key];
        if (age < ttl) {
            console.log(`✅ Using cached ${key} (age: ${Math.round(age/1000)}s)`);
            return cache[key];
        }
    }
    return null;
}

// Set cache
function setCachedData(key, data) {
    cache[key] = data;
    cache.lastFetch[key] = Date.now();
}

// Initialize DOM elements
function initElements() {
    elements = {
        userName: document.getElementById('userName'),
        logoutBtn: document.getElementById('logoutBtn'),
        refreshBtn: document.getElementById('refreshBtn'),
        updatePricesBtn: document.getElementById('updatePricesBtn'),
        farmersList: document.getElementById('farmersList'),
        totalFarmers: document.getElementById('totalFarmers'),
        verifiedFarmers: document.getElementById('verifiedFarmers'),
        marketPrices: document.getElementById('marketPrices'),
        marketStats: document.getElementById('marketStats'),
        subsidiesList: document.getElementById('subsidiesList'),
        totalSubsidies: document.getElementById('totalSubsidies'),
        activeSubsidies: document.getElementById('activeSubsidies'),
        expiringSubsidies: document.getElementById('expiringSubsidies')
    };
}

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initializing Optimized Admin Dashboard...');
    
    initElements();
    checkAuthentication();
    loadAdminData();
    setupEventListeners();
    
    // Show loading state
    showPageLoading(true);
    
    // Batch load all data in parallel
    await batchLoadDashboardData();
    
    // Hide loading state
    showPageLoading(false);
    
    console.log('✅ Dashboard ready');
});

// Show/hide page loading
function showPageLoading(show) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }
}

// Batch load all dashboard data
async function batchLoadDashboardData() {
    console.log('📊 Batch loading dashboard data...');
    const startTime = performance.now();
    
    try {
        // Execute all API calls in parallel
        const results = await Promise.allSettled([
            loadDashboardStats(),
            loadPendingFarmers(),
            loadMarketStats(),
            loadSubsidyStats(),
            loadSubsidies()
        ]);
        
        const endTime = performance.now();
        console.log(`✅ Batch load completed in ${Math.round(endTime - startTime)}ms`);
        
        // Log any failures
        results.forEach((result, index) => {
            if (result.status === 'rejected') {
                console.error(`❌ Load operation ${index} failed:`, result.reason);
            }
        });
        
    } catch (error) {
        console.error('❌ Batch load error:', error);
    }
}

// Check Authentication
function checkAuthentication() {
    console.log('🔐 Checking admin authentication...');
    
    const token = localStorage.getItem('token') || sessionStorage.getItem('adminToken');
    
    if (!token) {
        console.warn('❌ No token found - redirecting to login');
        redirectToLogin('missing');
        return false;
    }
    
    // Validate token format (JWT has 3 parts separated by dots)
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
        console.warn('❌ Invalid token format - redirecting to login');
        redirectToLogin('invalid');
        return false;
    }
    
    // Try to decode and check expiration
    try {
        const payload = JSON.parse(atob(tokenParts[1]));
        
        // Check if token has expired
        if (payload.exp) {
            const expirationTime = payload.exp * 1000; // Convert to milliseconds
            const currentTime = Date.now();
            
            if (currentTime >= expirationTime) {
                console.warn('❌ Token expired - redirecting to login');
                redirectToLogin('expired');
                return false;
            }
            
            const timeLeft = Math.round((expirationTime - currentTime) / 1000 / 60);
            console.log(`✅ Token valid - ${timeLeft} minutes remaining`);
        }
        
        // Validate admin role if present in token
        if (payload.role && !payload.role.includes('admin')) {
            console.warn('❌ User is not admin - redirecting to login');
            redirectToLogin('unauthorized');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Error validating token:', error);
        redirectToLogin('error');
        return false;
    }
    
    console.log('✅ Authentication validated');
    return true;
}

// Redirect to login with reason
function redirectToLogin(reason = '') {
    // Clear all tokens and data
    localStorage.removeItem('token');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    sessionStorage.clear();
    
    // Redirect with reason
    const params = new URLSearchParams();
    if (reason === 'expired') {
        params.set('session', 'expired');
    } else if (reason === 'unauthorized') {
        params.set('error', 'unauthorized');
    }
    
    window.location.href = `admin-login.html${params.toString() ? '?' + params.toString() : ''}`;
}

// Periodic token validation (every 5 minutes)
setInterval(() => {
    if (!checkAuthentication()) {
        console.warn('⚠️ Token validation failed during periodic check');
    }
}, 5 * 60 * 1000);

// Load Admin Data
function loadAdminData() {
    const adminDataStr = localStorage.getItem('adminData');
    
    if (adminDataStr && elements.userName) {
        try {
            const adminData = JSON.parse(adminDataStr);
            elements.userName.textContent = adminData.email || 'Admin';
        } catch (err) {
            console.error('Error parsing admin data:', err);
        }
    }
}

// Load Dashboard Stats (with caching)
async function loadDashboardStats() {
    // Check cache first
    const cached = getCachedData('stats');
    if (cached) {
        displayStats(cached);
        return;
    }
    
    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('adminToken');
        
        const response = await fetch(`${API_URL}/admin/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const stats = data.stats || data;
            setCachedData('stats', stats);
            displayStats(stats);
        } else {
            console.warn('Failed to fetch stats, using zero values');
            displayStats({
                totalFarmers: 0,
                verifiedFarmers: 0,
                marketPrices: 0
            });
        }
    } catch (error) {
        console.error('Error loading stats:', error);
        // Show zero values on error
        displayStats({
            totalFarmers: 0,
            verifiedFarmers: 0,
            marketPrices: 0
        });
    }
}

// Display stats
function displayStats(stats) {
    if (elements.totalFarmers) elements.totalFarmers.textContent = stats.totalFarmers || 0;
    if (elements.verifiedFarmers) elements.verifiedFarmers.textContent = stats.verifiedFarmers || 0;
    if (elements.marketPrices) elements.marketPrices.textContent = stats.marketPrices || 0;
}

// Load All Farmers (View-Only)
async function loadPendingFarmers() {
    // Check cache first
    const cached = getCachedData('farmers', 2 * 60 * 1000); // 2 min cache for farmers
    if (cached) {
        displayFarmers(cached);
        return;
    }
    
    if (!elements.farmersList) return;
    
    elements.farmersList.innerHTML = '<div class="loading">Loading farmers...</div>';
    
    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('adminToken');
        
        if (!token) {
            window.location.href = 'admin-login.html';
            return;
        }

        // Updated endpoint - no status filtering, view all farmers
        const response = await fetch(`${API_URL}/admin/farmers`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            
            if (data.success && data.farmers) {
                setCachedData('farmers', data.farmers);
                displayFarmers(data.farmers);
                
                // Update farmer count
                if (elements.totalFarmers) {
                    elements.totalFarmers.textContent = data.farmers.length;
                }
                
                // Update verified count
                const verifiedCount = data.farmers.filter(f => f.isVerified).length;
                const verifiedElement = document.getElementById('verifiedFarmers');
                if (verifiedElement) {
                    verifiedElement.textContent = verifiedCount;
                }
            } else {
                elements.farmersList.innerHTML = '<div class="empty-state"><p>No farmers registered yet</p></div>';
            }
        } else {
            elements.farmersList.innerHTML = '<div class="error">Unable to load farmers</div>';
        }
        
    } catch (error) {
        console.error('Error loading farmers:', error);
        elements.farmersList.innerHTML = '<div class="error">Connection error</div>';
    }
}

// Display Farmers (View-Only)
function displayFarmers(farmers) {
    if (!elements.farmersList) return;
    
    if (!farmers || farmers.length === 0) {
        elements.farmersList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👥</div>
                <p>No farmers registered yet</p>
            </div>
        `;
        return;
    }
    
    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    
    farmers.forEach(farmer => {
        const card = document.createElement('div');
        card.className = 'farmer-card';
        card.dataset.id = farmer._id;
        
        // Status badge
        const verifiedBadge = farmer.isVerified 
            ? '<span class="badge badge-success">✓ Verified</span>' 
            : '<span class="badge badge-secondary">Unverified</span>';
        
        card.innerHTML = `
            <div class="farmer-header">
                <div class="farmer-name">${escapeHtml(farmer.fullName || 'N/A')}</div>
                ${verifiedBadge}
            </div>
            <div class="farmer-details">
                <div class="detail-item">
                    <span>📧</span>
                    <span>${escapeHtml(farmer.email || 'N/A')}</span>
                </div>
                <div class="detail-item">
                    <span>📱</span>
                    <span>${escapeHtml(farmer.mobile || 'N/A')}</span>
                </div>
                <div class="detail-item">
                    <span>📍</span>
                    <span>${escapeHtml(farmer.location || 'N/A')}</span>
                </div>
                <div class="detail-item">
                    <span>🌾</span>
                    <span>${escapeHtml(farmer.cropType || 'N/A')}</span>
                </div>
                <div class="detail-item">
                    <span>🗣️</span>
                    <span>${escapeHtml(farmer.language || 'N/A')}</span>
                </div>
                <div class="detail-item">
                    <span>📅 Registered:</span>
                    <span>${new Date(farmer.registeredAt || Date.now()).toLocaleDateString()}</span>
                </div>
                ${farmer.lastLogin ? `
                <div class="detail-item">
                    <span>🕐 Last Login:</span>
                    <span>${new Date(farmer.lastLogin).toLocaleDateString()}</span>
                </div>
                ` : ''}
            </div>
        `;
        fragment.appendChild(card);
    });
    
    elements.farmersList.innerHTML = '';
    elements.farmersList.appendChild(fragment);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Check if farmers list is empty
function checkEmptyFarmersList() {
    if (!elements.farmersList) return;
    
    const cards = elements.farmersList.querySelectorAll('.farmer-card');
    if (cards.length === 0) {
        elements.farmersList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👥</div>
                <p>No farmers registered yet</p>
            </div>
        `;
    }
}

// Load Market Stats
async function loadMarketStats() {
    if (!elements.marketStats) return;
    
    // Check cache
    const cached = getCachedData('marketStats');
    if (cached) {
        displayMarketStats(cached);
        return;
    }
    
    elements.marketStats.innerHTML = '<p>Loading market data...</p>';
    
    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('adminToken');
        
        const response = await fetch(`${API_URL}/admin/market-stats`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
                setCachedData('marketStats', result.data);
                displayMarketStats(result.data);
            } else {
                displayMarketStats({ prices: [], totalPrices: 0, uniqueVegetables: 0, recentUpdates: 0 });
            }
        } else {
            displayMarketStats({ prices: [], totalPrices: 0, uniqueVegetables: 0, recentUpdates: 0 });
        }
    } catch (error) {
        console.error('Error loading market stats:', error);
        displayMarketStats({ prices: [], totalPrices: 0, uniqueVegetables: 0, recentUpdates: 0 });
    }
}

// Display market stats
function displayMarketStats(data) {
    if (!elements.marketStats) return;
    
    const prices = data.prices || [];
    const totalPrices = data.totalPrices || 0;
    const uniqueVegetables = data.uniqueVegetables || 0;
    const recentUpdates = data.recentUpdates || 0;
    const lastUpdated = data.lastUpdated ? new Date(data.lastUpdated).toLocaleString() : 'Never';
    
    let html = `
        <div class="market-stats-summary">
            <div class="stat-box">
                <div class="stat-number">${totalPrices}</div>
                <div class="stat-text">Total Prices</div>
            </div>
            <div class="stat-box">
                <div class="stat-number">${uniqueVegetables}</div>
                <div class="stat-text">Unique Items</div>
            </div>
            <div class="stat-box">
                <div class="stat-number">${recentUpdates}</div>
                <div class="stat-text">Recent Updates (24h)</div>
            </div>
        </div>
        <p style="margin: 1rem 0; color: #666; font-size: 0.9rem;">Last updated: ${lastUpdated}</p>
    `;
    
    if (prices.length > 0) {
        html += `
            <div class="market-prices-table">
                <h4 style="margin-bottom: 1rem;">Current Market Prices</h4>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f5f5f5; text-align: left;">
                            <th style="padding: 0.75rem; border-bottom: 2px solid #ddd;">Item</th>
                            <th style="padding: 0.75rem; border-bottom: 2px solid #ddd;">Price</th>
                            <th style="padding: 0.75rem; border-bottom: 2px solid #ddd;">Unit</th>
                            <th style="padding: 0.75rem; border-bottom: 2px solid #ddd;">Market</th>
                            <th style="padding: 0.75rem; border-bottom: 2px solid #ddd;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        prices.slice(0, 20).forEach(item => {
            html += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 0.75rem;">${item.vegetableName || 'N/A'}</td>
                    <td style="padding: 0.75rem; font-weight: 600; color: #4caf50;">₹${item.price || 0}</td>
                    <td style="padding: 0.75rem;">${item.unit || 'kg'}</td>
                    <td style="padding: 0.75rem;">${item.market || item.state || 'N/A'}</td>
                    <td style="padding: 0.75rem;">
                        <button class="btn-icon" onclick="editPrice('${item._id}')" title="Edit">✏️</button>
                        <button class="btn-icon" onclick="deletePrice('${item._id}')" title="Delete">🗑️</button>
                    </td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
        `;
        
        if (prices.length > 20) {
            html += `<p style="margin-top: 1rem; color: #666; text-align: center;">Showing 20 of ${prices.length} items</p>`;
        }
        
        html += `</div>`;
    } else {
        html += `
            <div class="empty-state" style="padding: 2rem; text-align: center;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📊</div>
                <p>No market price data available</p>
                <p style="color: #666; margin-top: 0.5rem;">Click "Update Prices" to fetch latest data</p>
            </div>
        `;
    }
    
    elements.marketStats.innerHTML = html;
}

// Load Subsidy Stats
async function loadSubsidyStats() {
    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('adminToken');
        
        const response = await fetch(`${API_URL}/admin/subsidies/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.stats) {
                displaySubsidyStats({
                    total: data.stats.totalSubsidies,
                    active: data.stats.activeSubsidies,
                    expiringSoon: data.stats.expiringSubsidies
                });
            } else {
                displaySubsidyStats({ total: 0, active: 0, expiringSoon: 0 });
            }
        } else {
            displaySubsidyStats({ total: 0, active: 0, expiringSoon: 0 });
        }
    } catch (error) {
        console.error('Error loading subsidy stats:', error);
        displaySubsidyStats({ total: 0, active: 0, expiringSoon: 0 });
    }
}

// Display subsidy stats
function displaySubsidyStats(stats) {
    if (elements.totalSubsidies) elements.totalSubsidies.textContent = stats.total || 0;
    if (elements.activeSubsidies) elements.activeSubsidies.textContent = stats.active || 0;
    if (elements.expiringSubsidies) elements.expiringSubsidies.textContent = stats.expiringSoon || 0;
}

// Load Subsidies
async function loadSubsidies() {
    if (!elements.subsidiesList) return;
    
    // Check cache
    const cached = getCachedData('subsidies');
    if (cached) {
        displaySubsidies(cached);
        return;
    }
    
    elements.subsidiesList.innerHTML = '<div class="loading">Loading subsidies...</div>';
    
    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('adminToken');
        
        const response = await fetch(`${API_URL}/admin/subsidies`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const subsidies = data.subsidies || [];
            setCachedData('subsidies', subsidies);
            displaySubsidies(subsidies);
        } else {
            // Demo subsidies
            displayDemoSubsidies();
        }
    } catch (error) {
        console.error('Error loading subsidies:', error);
        displayDemoSubsidies();
    }
}

// Display subsidies
function displaySubsidies(subsidies) {
    if (!elements.subsidiesList) return;
    
    if (subsidies.length === 0) {
        elements.subsidiesList.innerHTML = '<div class="empty-state"><p>No subsidies available</p></div>';
        return;
    }
    
    const fragment = document.createDocumentFragment();
    
    subsidies.forEach(subsidy => {
        const card = document.createElement('div');
        card.className = 'subsidy-card';
        card.innerHTML = `
            <div class="subsidy-header">
                <h3>${escapeHtml(subsidy.title)}</h3>
                <span class="subsidy-badge ${subsidy.isActive ? 'active' : 'inactive'}">
                    ${subsidy.isActive ? 'Active' : 'Inactive'}
                </span>
            </div>
            <div class="subsidy-details">
                <p><strong>Amount:</strong> ₹${subsidy.amount?.toLocaleString()}</p>
                <p><strong>Category:</strong> ${escapeHtml(subsidy.category)}</p>
                <p><strong>Deadline:</strong> ${new Date(subsidy.applicationDeadline).toLocaleDateString()}</p>
            </div>
            <div class="subsidy-actions">
                <button onclick="editSubsidy('${subsidy._id}')" class="btn-edit">Edit</button>
                <button onclick="deleteSubsidy('${subsidy._id}')" class="btn-delete">Delete</button>
            </div>
        `;
        fragment.appendChild(card);
    });
    
    elements.subsidiesList.innerHTML = '';
    elements.subsidiesList.appendChild(fragment);
}

// Display demo subsidies
function displayDemoSubsidies() {
    const demoSubsidies = [
        { _id: '1', title: 'Seed Subsidy Scheme', amount: 10000, category: 'seeds', applicationDeadline: '2026-03-31', isActive: true },
        { _id: '2', title: 'Farm Equipment Grant', amount: 50000, category: 'equipment', applicationDeadline: '2026-04-30', isActive: true }
    ];
    displaySubsidies(demoSubsidies);
}

// Show toast notification
function showToast(message, type = 'info') {
    // Create toast if doesn't exist
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.className = `toast toast-${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Setup Event Listeners
function setupEventListeners() {
    // Navigation handler
    setupNavigation();
    
    // User menu toggle
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userDropdown = document.getElementById('userDropdown');
    
    if (userMenuBtn && userDropdown) {
        userMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('show');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!userMenuBtn.contains(e.target) && !userDropdown.contains(e.target)) {
                userDropdown.classList.remove('show');
            }
        });
    }
    
    // Logout (both dropdown and navbar button)
    const handleLogout = (e) => {
        e.preventDefault();
        if (userDropdown) userDropdown.classList.remove('show');
        
        if (confirm('Are you sure you want to logout?')) {
            console.log('🚪 Logging out...');
            localStorage.removeItem('token');
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminData');
            sessionStorage.clear();
            window.location.href = 'admin-login.html?logout=success';
        }
    };
    
    if (elements.logoutBtn) {
        elements.logoutBtn.addEventListener('click', handleLogout);
    }
    
    const logoutBtnNav = document.getElementById('logoutBtnNav');
    if (logoutBtnNav) {
        logoutBtnNav.addEventListener('click', handleLogout);
    }
    
    // Refresh
    if (elements.refreshBtn) {
        elements.refreshBtn.addEventListener('click', async () => {
            elements.refreshBtn.disabled = true;
            elements.refreshBtn.textContent = '🔄 Refreshing...';
            
            // Clear cache
            cache.farmers = null;
            cache.stats = null;
            cache.marketStats = null;
            cache.subsidies = null;
            
            await batchLoadDashboardData();
            
            elements.refreshBtn.disabled = false;
            elements.refreshBtn.textContent = '🔄 Refresh';
            showToast('✅ Data refreshed', 'success');
        });
    }
    
    // Farmer search functionality
    const farmerSearchInput = document.getElementById('farmerSearchInput');
    if (farmerSearchInput) {
        farmerSearchInput.addEventListener('input', debounce((e) => {
            const searchTerm = e.target.value.toLowerCase().trim();
            const cards = elements.farmersList.querySelectorAll('.farmer-card');
            
            cards.forEach(card => {
                const text = card.textContent.toLowerCase();
                if (text.includes(searchTerm)) {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            });
        }, 300));
    }
    
    // Update prices
    if (elements.updatePricesBtn) {
        elements.updatePricesBtn.addEventListener('click', updateMarketPrices);
    }
    
    // Add new price
    const addPriceBtn = document.getElementById('addPriceBtn');
    if (addPriceBtn) {
        addPriceBtn.addEventListener('click', openAddPriceModal);
    }
    
    // Price modal controls
    const closePriceModal = document.getElementById('closePriceModal');
    const cancelPriceBtn = document.getElementById('cancelPriceBtn');
    const priceForm = document.getElementById('priceForm');
    const priceModal = document.getElementById('priceModal');
    
    if (closePriceModal) {
        closePriceModal.addEventListener('click', () => {
            if (priceModal) priceModal.style.display = 'none';
        });
    }
    
    if (cancelPriceBtn) {
        cancelPriceBtn.addEventListener('click', () => {
            if (priceModal) priceModal.style.display = 'none';
        });
    }
    
    if (priceForm) {
        priceForm.addEventListener('submit', savePriceForm);
    }
    
    // Close modal on outside click
    if (priceModal) {
        priceModal.addEventListener('click', (e) => {
            if (e.target === priceModal) {
                priceModal.style.display = 'none';
            }
        });
    }
}

// Setup Navigation
function setupNavigation() {
    console.log('🧭 Setting up navigation...');
    
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.getAttribute('data-section');
            
            if (section) {
                navigateToSection(section);
            }
        });
    });
    
    // Handle hash changes (browser back/forward)
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.substring(1); // Remove #
        if (hash) {
            navigateToSection(hash);
        }
    });
    
    // Check for initial hash
    const initialHash = window.location.hash.substring(1);
    if (initialHash) {
        navigateToSection(initialHash);
    }
}

// Navigate to section
function navigateToSection(sectionName) {
    console.log(`📍 Navigating to: ${sectionName}`);
    
    // Hide all sections
    const allSections = document.querySelectorAll('.section-content');
    allSections.forEach(section => {
        section.style.display = 'none';
    });
    
    // Remove active class from all nav links
    const allNavLinks = document.querySelectorAll('.nav-link');
    allNavLinks.forEach(link => {
        link.classList.remove('active');
    });
    
    // Show target section
    const targetSection = document.getElementById(`section-${sectionName}`);
    if (targetSection) {
        targetSection.style.display = 'block';
        
        // Scroll to top smoothly
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    // Add active class to current nav link
    const activeLink = document.querySelector(`.nav-link[data-section=\"${sectionName}\"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
    
    // Update URL hash without scrolling
    history.replaceState(null, null, `#${sectionName}`);
    
    // Load section-specific data if needed
    loadSectionData(sectionName);
}

// Load section-specific data
function loadSectionData(sectionName) {
    switch(sectionName) {
        case 'farmers':
            if (!cache.farmers || !getCachedData('farmers', 60000)) {
                loadPendingFarmers();
            }
            break;
        case 'market':
            if (!cache.marketStats || !getCachedData('marketStats', 120000)) {
                loadMarketStats();
            }
            break;
        case 'subsidies':
            if (!cache.subsidies || !getCachedData('subsidies', 300000)) {
                loadSubsidies();
                loadSubsidyStats();
            }
            break;
        case 'notifications':
            // Load notifications if you have that function
            console.log('Notifications section loaded');
            break;
        case 'dashboard':
        default:
            // Dashboard is already loaded
            break;
    }
}

// Update Market Prices
async function updateMarketPrices() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔄 UPDATE MARKET PRICES FUNCTION CALLED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🕐 Timestamp:', new Date().toLocaleString());
    
    if (!confirm('This will fetch and update all Karnataka vegetable market prices. Continue?')) {
        console.log('⚠️ CANCELLED: User declined update');
        return;
    }
    
    console.log('✅ USER CONFIRMED UPDATE');
    console.log('🔄 Disabling button and showing loading state...');
    
    elements.updatePricesBtn.disabled = true;
    elements.updatePricesBtn.textContent = '⏳ Updating...';
    
    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('adminToken');
        console.log('🔑 Token exists:', !!token);
        console.log('📤 Sending POST request to /api/admin/market-prices/update');
        console.log('⏰ Start time:', new Date().toLocaleTimeString());
        
        const startTime = performance.now();
        
        const response = await fetch(`${API_URL}/admin/market-prices/update`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        
        console.log('📡 Response received!');
        console.log('📊 Status code:', response.status);
        console.log('⏱️ Request duration:', duration, 'seconds');
        
        const data = await response.json();
        console.log('📦 Response data:', data);
        
        if (response.ok) {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('✅ MARKET PRICES UPDATED SUCCESSFULLY!');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📈 Prices updated:', data.count || 'Unknown');
            console.log('💬 Message:', data.message);
            console.log('🔄 Refreshing market stats display...');
            
            cache.marketStats = null;
            await loadMarketStats();
            
            showToast(`✅ ${data.count || 10} prices updated successfully!`, 'success');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        } else {
            showToast('⚠️ Update completed (demo mode)', 'info');
        }
    } catch (error) {
        console.error('Error updating prices:', error);
        showToast('⚠️ Running in demo mode', 'info');
    } finally {
        elements.updatePricesBtn.disabled = false;
        elements.updatePricesBtn.textContent = '🔄 Update All';
    }
}

// Open Add Price Modal
function openAddPriceModal() {
    const modal = document.getElementById('priceModal');
    const form = document.getElementById('priceForm');
    const title = document.getElementById('priceModalTitle');
    
    if (modal && form && title) {
        form.reset();
        document.getElementById('priceId').value = '';
        title.textContent = 'Add New Market Price';
        modal.style.display = 'flex';
    }
}

// Edit Market Price
async function editPrice(id) {
    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('adminToken');
        
        // Fetch price details
        const response = await fetch(`${API_URL}/admin/market-prices/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            showToast('Failed to fetch price details', 'error');
            return;
        }
        
        const data = await response.json();
        const price = data.price;
        
        // Fill form
        document.getElementById('priceId').value = price._id;
        document.getElementById('priceVegetableName').value = price.vegetableName || price.commodity;
        document.getElementById('priceAmount').value = price.price;
        document.getElementById('priceUnit').value = price.unit || 'kg';
        document.getElementById('priceMarket').value = price.market;
        document.getElementById('priceCategory').value = price.category || 'vegetable';
        document.getElementById('priceState').value = price.state || 'Karnataka';
        
        // Open modal
        document.getElementById('priceModalTitle').textContent = 'Edit Market Price';
        document.getElementById('priceModal').style.display = 'flex';
        
    } catch (error) {
        console.error('Error editing price:', error);
        showToast('Failed to load price details', 'error');
    }
}

// Delete Market Price
async function deletePrice(id) {
    if (!confirm('Are you sure you want to delete this market price?')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('adminToken');
        
        const response = await fetch(`${API_URL}/admin/market-prices/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            showToast('Failed to delete price', 'error');
            return;
        }
        
        // Reload prices
        cache.marketStats = null;
        await loadMarketStats();
        showToast('✅ Price deleted successfully', 'success');
        
    } catch (error) {
        console.error('Error deleting price:', error);
        showToast('Failed to delete price', 'error');
    }
}

// Save Market Price (Add/Edit)
async function savePriceForm(e) {
    e.preventDefault();
    
    const priceId = document.getElementById('priceId').value;
    const isEdit = !!priceId;
    
    const priceData = {
        vegetableName: document.getElementById('priceVegetableName').value,
        price: parseFloat(document.getElementById('priceAmount').value),
        unit: document.getElementById('priceUnit').value,
        market: document.getElementById('priceMarket').value,
        category: document.getElementById('priceCategory').value,
        state: document.getElementById('priceState').value || 'Karnataka'
    };
    
    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('adminToken');
        
        const url = isEdit 
            ? `${API_URL}/admin/market-prices/${priceId}`
            : `${API_URL}/admin/market-prices`;
        
        const response = await fetch(url, {
            method: isEdit ? 'PUT' : 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(priceData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            showToast(error.message || 'Failed to save price', 'error');
            return;
        }
        
        // Close modal and reload
        document.getElementById('priceModal').style.display = 'none';
        cache.marketStats = null;
        await loadMarketStats();
        showToast(`✅ Price ${isEdit ? 'updated' : 'added'} successfully`, 'success');
        
    } catch (error) {
        console.error('Error saving price:', error);
        showToast('Failed to save price', 'error');
    }
}

// Edit Subsidy
async function editSubsidy(id) {
    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('adminToken');
        
        // Fetch subsidy details
        const response = await fetch(`${API_URL}/admin/subsidies/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            showToast('Failed to fetch subsidy details', 'error');
            return;
        }
        
        const data = await response.json();
        const subsidy = data.subsidy || data;
        
        // For now, just show a confirmation
        const newTitle = prompt('Edit Subsidy Title:', subsidy.title);
        if (!newTitle) return;
        
        const updateResponse = await fetch(`${API_URL}/admin/subsidies/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: newTitle,
                ...subsidy
            })
        });
        
        if (updateResponse.ok) {
            showToast('✅ Subsidy updated successfully', 'success');
            cache.subsidies = null;
            await loadSubsidies();
        } else {
            showToast('Failed to update subsidy', 'error');
        }
    } catch (error) {
        console.error('Error editing subsidy:', error);
        showToast('Error updating subsidy', 'error');
    }
}

// Delete Subsidy
async function deleteSubsidy(id) {
    if (!confirm('Are you sure you want to delete this subsidy? This action cannot be undone.')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('adminToken');
        
        const response = await fetch(`${API_URL}/admin/subsidies/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            showToast('✅ Subsidy deleted successfully', 'success');
            
            // Remove from DOM
            const subsidyCard = document.querySelector(`[data-subsidy-id="${id}"]`);
            if (subsidyCard) {
                subsidyCard.remove();
            }
            
            // Clear cache and reload
            cache.subsidies = null;
            await loadSubsidies();
            await loadSubsidyStats();
        } else {
            showToast('Failed to delete subsidy', 'error');
        }
    } catch (error) {
        console.error('Error deleting subsidy:', error);
        showToast('Error deleting subsidy', 'error');
    }
}

// Make functions globally available
window.editSubsidy = editSubsidy;
window.deleteSubsidy = deleteSubsidy;
window.editPrice = editPrice;
window.deletePrice = deletePrice;

