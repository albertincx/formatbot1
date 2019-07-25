class Mover {
  constructor(model = false) {
    this.model = model;
  }

  async moveDocuments(toModel, filter, batchSize) {
    let count;
    while ((count = await this.model.find(filter).countDocuments()) > 0) {
      const sourceDocs = await this.model.find(filter).limit(batchSize);

      const idsOfCopiedDocs = await this.insertBatch(toModel,
          sourceDocs);
      await this.model.deleteMany({ _id: { $in: idsOfCopiedDocs } }).exec();
    }
  }

  async insertBatch(model, documents) {
    const bulkInsert = model.collection.initializeOrderedBulkOp();
    const insertedIds = [];
    let id;
    documents.forEach(function(doc) {
      id = doc._id;
      // Insert without raising an error for duplicates
      bulkInsert.find({ _id: id }).upsert().replaceOne(doc);
      insertedIds.push(id);
    });
    await bulkInsert.execute();
    return insertedIds;
  }
}

module.exports = Mover;
