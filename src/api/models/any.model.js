const mongoose = require('mongoose');

mongoose.set('strictQuery', false);

const anySchema = new mongoose.Schema(
  {},
  {
    timestamps: {createdAt: true, updatedAt: false},
    strict: false,
  },
);

/**
 * @typedef Any
 */
module.exports = mongoose.model('Any', anySchema);
