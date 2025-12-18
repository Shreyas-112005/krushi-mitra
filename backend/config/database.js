module.exports = {
  url: process.env.MONGODB_URI || 'mongodb://localhost:27017/krushi_mithra',
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }
};
