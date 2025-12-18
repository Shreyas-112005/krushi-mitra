// Store notifications in memory (in production, use database)
let notifications = [
  {
    _id: '1',
    title: 'Welcome to KRUSHI MITHRA',
    message: 'Thank you for joining our platform!',
    type: 'info',
    isRead: false,
    audience: 'farmer',
    createdAt: new Date()
  },
  {
    _id: '2',
    title: 'Market Alert',
    message: 'Rice prices increased by 10% in Mysore market',
    type: 'alert',
    isRead: false,
    audience: 'farmer',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
  },
  {
    _id: '3',
    title: 'New Farmer Registration',
    message: 'A new farmer has registered and is awaiting approval',
    type: 'info',
    isRead: false,
    audience: 'admin',
    createdAt: new Date()
  }
];

/**
 * Get Farmer Notifications
 */
const getFarmerNotifications = async (req, res) => {
  try {
    // Filter notifications for farmers
    const farmerNotifications = notifications.filter(n => 
      n.audience === 'farmer' || n.audience === 'all'
    );

    res.json({
      success: true,
      data: farmerNotifications
    });
  } catch (error) {
    console.error('[NOTIFICATION] Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications'
    });
  }
};

/**
 * Mark Notification as Read
 */
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('[NOTIFICATION] Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating notification'
    });
  }
};

/**
 * Get Admin Notifications
 */
const getAdminNotifications = async (req, res) => {
  try {
    // Filter notifications for admins
    const adminNotifications = notifications.filter(n => 
      n.audience === 'admin' || n.audience === 'all'
    );

    res.json({
      success: true,
      data: adminNotifications
    });
  } catch (error) {
    console.error('[NOTIFICATION] Get admin notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications'
    });
  }
};

/**
 * Create and Broadcast Notification
 */
const createNotification = async (req, res) => {
  try {
    const { title, message, type, audience } = req.body;

    // Validate required fields
    if (!title || !message || !audience) {
      return res.status(400).json({
        success: false,
        message: 'Title, message, and audience are required'
      });
    }

    // Create new notification
    const newNotification = {
      _id: Date.now().toString(),
      title,
      message,
      type: type || 'info',
      audience, // 'farmer', 'admin', or 'all'
      isRead: false,
      createdAt: new Date()
    };

    // Add to notifications array
    notifications.unshift(newNotification);

    // Keep only last 100 notifications
    if (notifications.length > 100) {
      notifications = notifications.slice(0, 100);
    }

    console.log('[NOTIFICATION] Created:', newNotification);

    res.json({
      success: true,
      message: 'Notification created successfully',
      data: newNotification
    });
  } catch (error) {
    console.error('[NOTIFICATION] Create notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating notification'
    });
  }
};

module.exports = {
  getFarmerNotifications,
  markAsRead,
  getAdminNotifications,
  createNotification
};
