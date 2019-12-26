const mongoose = require('mongoose');
const { mongo } = require('./vars');

// mongoose.Promise = Promise;
// Exit application on error
mongoose.connection.on('error', (err) => {
  console.log(err)
  process.exit(-1);
});

exports.connect = () => {
  mongoose.connect(mongo.uri, {
    keepAlive: 1,
    connectTimeoutMS: 30000,
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  return mongoose.connection;
};
