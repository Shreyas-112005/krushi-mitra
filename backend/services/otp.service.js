const crypto = require('crypto');
const nodemailer = require('nodemailer');

/**
 * OTP SERVICE
 * Handles OTP generation, validation, and email sending
 */

// In-memory OTP storage (for production, use Redis or database)
const otpStore = new Map();

/**
 * Generate 6-digit OTP
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Hash OTP for secure storage
 */
function hashOTP(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

/**
 * Store OTP with expiration (5 minutes)
 */
function storeOTP(email, otp) {
  const hashedOTP = hashOTP(otp);
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  
  otpStore.set(email.toLowerCase(), {
    hashedOTP,
    expiresAt,
    attempts: 0
  });
  
  console.log('[OTP SERVICE] ✅ OTP stored for:', email);
  console.log('[OTP SERVICE] 🔐 OTP (FOR TESTING):', otp); // Remove in production
  
  return true;
}

/**
 * Verify OTP
 */
function verifyOTP(email, otp) {
  const stored = otpStore.get(email.toLowerCase());
  
  if (!stored) {
    console.log('[OTP SERVICE] ❌ No OTP found for:', email);
    return { valid: false, message: 'OTP not found or expired' };
  }
  
  // Check expiration
  if (Date.now() > stored.expiresAt) {
    console.log('[OTP SERVICE] ❌ OTP expired for:', email);
    otpStore.delete(email.toLowerCase());
    return { valid: false, message: 'OTP has expired' };
  }
  
  // Check attempts
  if (stored.attempts >= 3) {
    console.log('[OTP SERVICE] ❌ Too many attempts for:', email);
    otpStore.delete(email.toLowerCase());
    return { valid: false, message: 'Too many failed attempts' };
  }
  
  // Verify OTP
  const hashedInput = hashOTP(otp);
  if (hashedInput === stored.hashedOTP) {
    console.log('[OTP SERVICE] ✅ OTP verified for:', email);
    otpStore.delete(email.toLowerCase()); // Remove after successful verification
    return { valid: true, message: 'OTP verified successfully' };
  }
  
  // Increment attempts
  stored.attempts++;
  otpStore.set(email.toLowerCase(), stored);
  
  console.log('[OTP SERVICE] ❌ Invalid OTP for:', email, '- Attempts:', stored.attempts);
  return { valid: false, message: 'Invalid OTP' };
}

/**
 * Send OTP via Email
 */
async function sendOTPEmail(email, otp, farmerName = 'Farmer') {
  try {
    console.log('[OTP SERVICE] 📧 Sending OTP email to:', email);
    
    // Create transporter (configure with your email service)
    const transporter = nodemailer.createTransport({
      service: 'gmail', // or 'smtp.gmail.com'
      auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASSWORD || 'your-app-password'
      }
    });
    
    // Email content
    const mailOptions = {
      from: `"KRUSHI MITHRA" <${process.env.EMAIL_USER || 'noreply@krushimithra.com'}>`,
      to: email,
      subject: 'Your KRUSHI MITHRA Login OTP',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .otp-box { background: white; border: 2px dashed #667eea; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0; }
            .otp-code { font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 5px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🌾 KRUSHI MITHRA</h1>
              <p>Your Agricultural Companion</p>
            </div>
            <div class="content">
              <h2>Hello ${farmerName},</h2>
              <p>You requested to login to your KRUSHI MITHRA account. Use the OTP below to complete your login:</p>
              
              <div class="otp-box">
                <p style="margin: 0; color: #666; font-size: 14px;">Your One-Time Password</p>
                <div class="otp-code">${otp}</div>
              </div>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>This OTP is valid for <strong>5 minutes</strong></li>
                  <li>Never share this OTP with anyone</li>
                  <li>KRUSHI MITHRA will never ask for your OTP</li>
                </ul>
              </div>
              
              <p>If you didn't request this OTP, please ignore this email or contact support if you have concerns.</p>
              
              <p style="margin-top: 30px;">
                Best regards,<br>
                <strong>KRUSHI MITHRA Team</strong>
              </p>
            </div>
            <div class="footer">
              <p>© 2026 KRUSHI MITHRA. All rights reserved.</p>
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log('[OTP SERVICE] ✅ Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('[OTP SERVICE] ❌ Email send failed:', error.message);
    
    // For development: Still return success but log OTP
    if (process.env.NODE_ENV === 'development') {
      console.log('[OTP SERVICE] 📝 DEVELOPMENT MODE - OTP:', otp);
      return { success: true, dev: true, otp: otp }; // Return OTP in dev mode
    }
    
    return { success: false, error: error.message };
  }
}

/**
 * Generate and send OTP
 */
async function generateAndSendOTP(email, farmerName) {
  const otp = generateOTP();
  storeOTP(email, otp);
  
  const result = await sendOTPEmail(email, otp, farmerName);
  
  return {
    success: result.success,
    message: result.success 
      ? 'OTP sent successfully to your email' 
      : 'Failed to send OTP',
    ...(process.env.NODE_ENV === 'development' && result.dev ? { otp } : {})
  };
}

/**
 * Clean expired OTPs (run periodically)
 */
function cleanExpiredOTPs() {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [email, data] of otpStore.entries()) {
    if (now > data.expiresAt) {
      otpStore.delete(email);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log('[OTP SERVICE] 🧹 Cleaned', cleaned, 'expired OTPs');
  }
}

// Clean expired OTPs every minute
setInterval(cleanExpiredOTPs, 60 * 1000);

module.exports = {
  generateAndSendOTP,
  verifyOTP,
  storeOTP,
  sendOTPEmail
};
