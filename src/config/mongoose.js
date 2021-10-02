const mongoose = require('mongoose');
const {mongo} = require('./vars');

exports.connect = uri => {
  const dbUri = uri || mongo.uri;
  if (!dbUri) {
    return false;
  }
  mongoose.connect(dbUri, {
    keepAlive: 1,
    connectTimeoutMS: 30000,
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  return mongoose.connection;
};
