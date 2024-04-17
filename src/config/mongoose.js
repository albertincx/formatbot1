const mongoose = require('mongoose');
const {NO_DB, MONGO_URI} = require('./vars');

exports.connect = uri => {
  const dbUri = uri || MONGO_URI;

  if (!dbUri || NO_DB) {
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

