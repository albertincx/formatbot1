const mongoose = require('mongoose');

mongoose.set('strictQuery', false);

const schemaUpd = new mongoose.Schema(
  {},
  {
    timestamps: {
      createdAt: true,
      updatedAt: true,
    },
    strict: false,
  },
);

module.exports = schemaUpd;
