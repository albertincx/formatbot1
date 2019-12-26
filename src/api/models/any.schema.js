const mongoose = require('mongoose');
const anySchema = new mongoose.Schema({}, {
  timestamps: true,
  strict: false,
});

anySchema.method({
  transform() {
    return this.toObject();
  },
});

const models = {
  'test2': 'test2',
  'objects': 'objects',
  'persons': 'persons',
};

anySchema.statics = {
  connect(modelName) {
    try {
      let { conn } = this.collection;
      let model = models[modelName];
      const schema = this.schema;
      if (model) {
        return conn.model(model, schema);
      }
    } catch (e) {
      console.log(e);
    }

    return false;
  }
};

module.exports = anySchema;
