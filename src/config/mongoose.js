const mongoose = require('mongoose');
const { mongo } = require('./vars');

exports.connect = () => {
  if (!mongo.uri) return false;
  mongoose.connect(mongo.uri, {
    keepAlive: 1,
    connectTimeoutMS: 30000,
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  return mongoose.connection;
};
