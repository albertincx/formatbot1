const mongoose = require('mongoose');
const {
  NO_DB,
} = require('./vars');

const createConnection = (uri) => {
  if (!uri || NO_DB) {
    return false;
  }

  return mongoose.createConnection(uri, {
    connectTimeoutMS: 30000,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    keepAlive: true,
  });
};

exports.createConnection = createConnection;
