const mongoose = require('mongoose');

mongoose.set('strictQuery', false);

const schema = new mongoose.Schema(
  {},
  {
    timestamps: {
      createdAt: true,
      updatedAt: false
    },
    strict: false,
  },
);

module.exports = schema;
