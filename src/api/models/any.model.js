const mongoose = require('mongoose');
const anySchema = require('./any.schema');

mongoose.set('strictQuery', false);

/**
 * @typedef Any
 */
module.exports = mongoose.model('Any', anySchema);
