const path = require('path');
require('dotenv-safe').load({
  path: path.join(__dirname, '../../.env'),
  sample: path.join(__dirname, '../../.env.example'),
});

module.exports = {
  root: path.join(__dirname, '/../../'),
  uploadDir: path.join(__dirname, '/../../upload'),
  tmpDir: path.join(__dirname, '/../../data/tmp/images'),
  assetsDir: path.join(__dirname, '/../../src/service/assets'),
  env: process.env.NODE_ENV,
  fotobankDir: process.env.fotobankDir,
  FILES_LIMIT: process.env.FILES_LIMIT,
  mongoSecret: process.env.MONGO_SECRET,
  serviceBearer: process.env.FOTOBANK_FULL_KEY,
  serviceReadBearer: process.env.FOTOBANK_READ_KEY,
  serviceSandBearer: process.env.FOTOBANK_SAND_KEY,
  readBearer: process.env.READ_BEARER,
  port: process.env.NODE_ENV === 'test' ? process.env.PORT_TEST : process.env.PORT,
  mailConf: {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    email: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
  jwtSecret: process.env.JWT_SECRET,
  jwtExpirationInterval: process.env.JWT_EXPIRATION_MINUTES,
  jwtExpirationIntervalMail: process.env.JWT_EXPIRATION_MINUTES_EMAIL,
  mongo: {
    uri: process.env.NODE_ENV === 'test'
      ? process.env.MONGO_URI_TESTS
      : process.env.MONGO_URI,
    images_user: process.env.MONGO_USER_IMAGES,
    images_pass: process.env.MONGO_PASS_IMAGES,
  },
  user: {
    uid: parseInt(process.env.UID, 10),
    gid: parseInt(process.env.GID, 10),
  },
  logs: process.env.NODE_ENV === 'production' ? 'combined' : 'dev',
  experimental: process.env.EXPERIMENTAL,
};
