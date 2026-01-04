module.exports = {
  url: process.env.MONGODB_URI || 'mongodb://localhost:27017/krushi_mithra',
  options: {
    // Modern MongoDB driver doesn't need these deprecated options
  }
};
