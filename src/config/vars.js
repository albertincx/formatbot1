const path = require('path');
require('dotenv-safe').config({
  allowEmptyValues: true,
  path: path.join(__dirname, '../../.env'),
  sample: path.join(__dirname, '../../.env.example'),
});

module.exports = {
  root: path.join(__dirname, '/../../'),
  env: process.env.NODE_ENV,
  logs: process.env.NODE_ENV === 'production' ? 'combined' : 'dev',
  DEV_API: process.env.DEV_API || '',
  PORT: process.env.PORT || 5000,
  NOBOT: process.env.NOBOT || '',
};
