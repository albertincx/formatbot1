const mongoose = require('mongoose');
const {
  NO_DB,
  MONGO_URI
} = require('./vars');

exports.connect = uri => {
  const dbUri = uri || MONGO_URI;

  if (!dbUri || NO_DB) {
    return false;
  }

  mongoose.connect(dbUri, {
    connectTimeoutMS: 30000,
  });

  return mongoose.connection;
};

const createConnection = (uri) => {
  if (!uri || NO_DB) {
    return false;
  }

  return mongoose.createConnection(uri, {
    connectTimeoutMS: 30000,
  });
};

exports.createConnection = createConnection;
