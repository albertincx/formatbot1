const mongoose = require('mongoose');
const {
  NO_DB,
  MONGO_URI
} = require('./vars');

const createConnection = (uri) => {
  if (!uri || NO_DB) {
    return false;
  }

  return mongoose.createConnection(uri, {
    connectTimeoutMS: 30000,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    keepAlive: uri === MONGO_URI,
  });
};

exports.createConnection = createConnection;
