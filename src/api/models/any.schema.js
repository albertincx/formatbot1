const mongoose = require('mongoose');

mongoose.set('strictQuery', false);

const anySchema = new mongoose.Schema(
  {},
  {
    timestamps: {createdAt: true, updatedAt: false},
    strict: false,
  },
);

anySchema.method({
  transform() {
    return this.toObject();
  },
});

module.exports = anySchema;
