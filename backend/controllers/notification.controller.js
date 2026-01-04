const Notification = require('../models/notification.model');
const Farmer = require('../models/farmer.model');

/**
 * Get Farmer Notifications
 * Returns all active notifications relevant to the logged-in farmer
 */
const getFarmerNotifications = async (req, res) => {
  try {
    const farmerId = req.farmer?._id;
    
    // Get farmer data to check targeting
    const farmer = await Farmer.findById(farmerId);
    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: 'Farmer not found'
      });
    }

    // Get all active notifications
    const allNotifications = await Notification.find({
      isActive: true,
      $or: [
        { expiryDate: { $exists: false } },
        { expiryDate: { $gte: new Date() } }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(50);

    // Filter notifications relevant for this farmer
    const relevantNotifications = allNotifications.filter(notification => 
      notification.isRelevantForFarmer(farmer)
    );

    // Mark which ones have been read by this farmer
    const notificationsWithReadStatus = relevantNotifications.map(notif => {
      const notifObj = notif.toObject();
      notifObj.isRead = notif.readBy.some(r => r.farmer.toString() === farmerId.toString());
      return notifObj;
    });

    res.json({
      success: true,
      data: notificationsWithReadStatus,
      count: notificationsWithReadStatus.length
    });
  } catch (error) {
    console.error('[NOTIFICATION] Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications',
      error: error.message
    });
  }
};

/**
 * Mark Notification as Read
 */
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const farmerId = req.farmer?._id;

    if (!farmerId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const notification = await Notification.findById(id);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check if already marked as read
    const alreadyRead = notification.readBy.some(r => r.farmer.toString() === farmerId.toString());
    
    if (!alreadyRead) {
      notification.readBy.push({
        farmer: farmerId,
        readAt: new Date()
      });
      await notification.save();
    }

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('[NOTIFICATION] Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating notification',
      error: error.message
    });
  }
};

/**
 * Get Admin Notifications
 * Returns system notifications for admins
 */
const getAdminNotifications = async (req, res) => {
  try {
    // Get all notifications (admins can see all)
    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('createdBy', 'email username');

    res.json({
      success: true,
      data: notifications,
      count: notifications.length
    });
  } catch (error) {
    console.error('[NOTIFICATION] Get admin notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications',
      error: error.message
    });
  }
};

/**
 * Create and Broadcast Notification
 * Admin creates notification for farmers
 */
const createNotification = async (req, res) => {
  try {
    const { 
      title, 
      message, 
      type, 
      priority,
      targetAudience,
      targetLocations,
      targetCrops,
      icon,
      expiryDate
    } = req.body;

    // Validate required fields
    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required'
      });
    }

    // Create new notification
    const newNotification = new Notification({
      title,
      message,
      type: type || 'info',
      priority: priority || 'medium',
      targetAudience: targetAudience || 'all',
      targetLocations: targetLocations || [],
      targetCrops: targetCrops || [],
      icon: icon || '📢',
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      isActive: true,
      createdBy: req.admin?._id
    });

    await newNotification.save();

    console.log('[NOTIFICATION] Created:', {
      id: newNotification._id,
      title: newNotification.title,
      targetAudience: newNotification.targetAudience
    });

    // Count target farmers
    let targetCount = 0;
    if (targetAudience === 'all') {
      targetCount = await Farmer.countDocuments({ status: 'approved' });
    } else if (targetAudience === 'approved') {
      targetCount = await Farmer.countDocuments({ status: 'approved' });
    } else if (targetAudience === 'pending') {
      targetCount = await Farmer.countDocuments({ status: 'pending' });
    } else if (targetAudience === 'location' && targetLocations && targetLocations.length > 0) {
      const locationRegex = targetLocations.map(loc => new RegExp(loc, 'i'));
      targetCount = await Farmer.countDocuments({ 
        status: 'approved',
        location: { $in: locationRegex }
      });
    } else if (targetAudience === 'crop' && targetCrops && targetCrops.length > 0) {
      const cropRegex = targetCrops.map(crop => new RegExp(crop, 'i'));
      targetCount = await Farmer.countDocuments({ 
        status: 'approved',
        cropType: { $in: cropRegex }
      });
    }

    res.json({
      success: true,
      message: 'Notification created and broadcast successfully',
      data: newNotification,
      targetFarmersCount: targetCount
    });
  } catch (error) {
    console.error('[NOTIFICATION] Create notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating notification',
      error: error.message
    });
  }
};

/**
 * Delete Notification
 */
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByIdAndDelete(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('[NOTIFICATION] Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting notification',
      error: error.message
    });
  }
};

module.exports = {
  getFarmerNotifications,
  markAsRead,
  getAdminNotifications,
  createNotification,
  deleteNotification
};
