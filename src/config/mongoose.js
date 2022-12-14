const mongoose = require('mongoose');
const {mongo} = require('./vars');

exports.connect = uri => {
  const dbUri = uri || mongo.uri;
  if (!dbUri || mongo.disabled) {
    return false;
  }
  mongoose.connect(dbUri, {
    keepAlive: true,
    connectTimeoutMS: 30000,
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  return mongoose.connection;
};
