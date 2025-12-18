const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '../data');
const FARMERS_FILE = path.join(DATA_DIR, 'farmers.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize farmers file if it doesn't exist
if (!fs.existsSync(FARMERS_FILE)) {
  fs.writeFileSync(FARMERS_FILE, JSON.stringify({ farmers: [] }, null, 2));
}

/**
 * Read farmers from JSON file
 */
function readFarmers() {
  try {
    const data = fs.readFileSync(FARMERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading farmers file:', error);
    return { farmers: [] };
  }
}

/**
 * Write farmers to JSON file
 */
function writeFarmers(data) {
  try {
    fs.writeFileSync(FARMERS_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing farmers file:', error);
    return false;
  }
}

/**
 * Generate unique ID
 */
function generateId() {
  return 'farmer_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Find farmer by email or mobile
 */
function findFarmerByEmailOrMobile(email, mobile) {
  const data = readFarmers();
  return data.farmers.find(f => 
    f.email.toLowerCase() === email.toLowerCase() || 
    f.mobile === mobile
  );
}

/**
 * Find farmer by email
 */
function findFarmerByEmail(email) {
  const data = readFarmers();
  return data.farmers.find(f => f.email.toLowerCase() === email.toLowerCase());
}

/**
 * Find farmer by ID
 */
function findFarmerById(id) {
  const data = readFarmers();
  return data.farmers.find(f => f._id === id);
}

/**
 * Create new farmer
 */
async function createFarmer(farmerData) {
  const data = readFarmers();
  
  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(farmerData.password, salt);
  
  const newFarmer = {
    _id: generateId(),
    fullName: farmerData.fullName,
    email: farmerData.email.toLowerCase(),
    mobile: farmerData.mobile,
    password: hashedPassword,
    location: farmerData.location,
    cropType: farmerData.cropType,
    language: farmerData.language || 'english',
    status: 'pending',
    isActive: true,
    registeredAt: new Date().toISOString(),
    lastLogin: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  data.farmers.push(newFarmer);
  
  if (writeFarmers(data)) {
    return newFarmer;
  }
  
  throw new Error('Failed to save farmer data');
}

/**
 * Update farmer
 */
function updateFarmer(id, updates) {
  const data = readFarmers();
  const index = data.farmers.findIndex(f => f._id === id);
  
  if (index === -1) {
    return null;
  }
  
  data.farmers[index] = {
    ...data.farmers[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  if (writeFarmers(data)) {
    return data.farmers[index];
  }
  
  throw new Error('Failed to update farmer data');
}

/**
 * Get all farmers
 */
function getAllFarmers() {
  const data = readFarmers();
  return data.farmers;
}

/**
 * Compare password
 */
async function comparePassword(plainPassword, hashedPassword) {
  return await bcrypt.compare(plainPassword, hashedPassword);
}

module.exports = {
  findFarmerByEmailOrMobile,
  findFarmerByEmail,
  findFarmerById,
  createFarmer,
  updateFarmer,
  getAllFarmers,
  comparePassword
};
