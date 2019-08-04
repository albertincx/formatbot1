const path = require('path');
require('dotenv-safe').load({
  path: path.join(__dirname, '../../.env'),
  sample: path.join(__dirname, '../../.env.example'),
});

module.exports = {
  root: path.join(__dirname, '/../../'),
  env: process.env.NODE_ENV,
  logs: process.env.NODE_ENV === 'production' ? 'combined' : 'dev',
};
