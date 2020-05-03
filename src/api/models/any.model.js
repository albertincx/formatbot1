const mongoose = require('mongoose');
const anySchema = require('./any.schema');

/**
 * @typedef Any
 */
module.exports = mongoose.model('Any', anySchema);
