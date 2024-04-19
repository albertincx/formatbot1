const Mercury = require('@postlight/parser');
const {logger} = require('./logger');

const mercury = async (url, options = {}) => {
  let result = '';
  try {
    result = await Mercury.parse(url, options);
    logger('Mercury');
  } catch (e) {
    logger(e)
    throw new Error('Mercury failed');
  }
  return result;
};
module.exports = mercury;
