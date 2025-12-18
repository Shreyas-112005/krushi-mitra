const Admin = require('../models/admin.model');

/**
 * Initialize MAIN_ADMIN on Server Startup
 * Creates the one and only admin account if it doesn't exist
 * Uses credentials from environment variables
 */
async function initializeMainAdmin() {
  try {
    // Check if MAIN_ADMIN already exists
    const adminExists = await Admin.mainAdminExists();
    
    if (adminExists) {
      console.log('✅ MAIN_ADMIN already exists');
      return { success: true, message: 'Admin already exists' };
    }

    // Get admin credentials from environment variables
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    // Validate environment variables
    if (!adminEmail || !adminPassword) {
      console.error('❌ ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env file');
      throw new Error('Missing admin credentials in environment variables');
    }

    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(adminEmail)) {
      throw new Error('Invalid admin email format');
    }

    // Validate password length
    if (adminPassword.length < 8) {
      throw new Error('Admin password must be at least 8 characters long');
    }

    // Create MAIN_ADMIN
    const admin = new Admin({
      email: adminEmail,
      password: adminPassword,
      role: 'MAIN_ADMIN',
      isActive: true
    });

    await admin.save();

    console.log('✅ MAIN_ADMIN created successfully');
    console.log(`   Email: ${adminEmail}`);
    console.log('   Role: MAIN_ADMIN');
    
    return { 
      success: true, 
      message: 'Main admin created successfully',
      admin: admin.toSafeObject()
    };

  } catch (error) {
    console.error('❌ Error initializing MAIN_ADMIN:', error.message);
    
    // If it's a duplicate key error, admin might have been created in parallel
    if (error.code === 11000) {
      return { success: true, message: 'Admin already exists (duplicate key)' };
    }
    
    throw error;
  }
}

module.exports = { initializeMainAdmin };
