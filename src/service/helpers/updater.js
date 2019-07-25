const mongodb = require('mongodb');

class Updater {
  constructor(model = false, uniqField) {
    this.prepareFunction = null;
    this.model = model;
    this.status = {};
    this.items = [];
    this.limit = 1000;
    this.stepLimit = 5000;
    this.uniqField = uniqField;
    this.groupField = false;
    this.newItems = [];
    this.itemsArray = [];
    this.updateMany = false;
    this.insertOnly = false;
    this.existQuery = false;
    this.testOnly = false;
    this.tmp = {
      duplicateCount: 0,
      upd: 0,
      ins: 0,
      itemsLen: 0,
    };
  }

  async add(item) {
    const { uniqField } = this;
    const uniqFieldSearch = item[uniqField];

    if (this.itemsArray.indexOf(uniqFieldSearch) === -1) {
      this.itemsArray.push(uniqFieldSearch);
    } else {
      this.tmp.duplicateCount += 1;
    }
    await this.push(item);
  }

  insert(item) {
    this.newItems.push({
      insertOne: {
        document: item,
      },
    });
  }
  updateOne(item, filter) {
    this.newItems.push({
      updateOne: {
        update: item,
        filter,
      },
    });
  }
  async push(item) {
    this.items.push(item);
    if (this.items.length === this.limit) {
      await this.update(this.items);
      this.items = [];
    }
  }

  async showLog() {
    console.log(this.tmp);
  }

  endInsert() {
    let res = null;
    if (this.newItems.length) {
      res = this.bulkWrite(this.newItems);
      this.newItems = [];
    }
    return res;
  }

  async end() {
    if (this.items.length) {
      await this.update(this.items);
      this.items = [];
    }
    this.showLog();
  }

  setFunction(func) {
    this.prepareFunction = func;
  }

  /**
   *
   * @param query
   */
  setExistsQuery(query = {}) {
    this.existQuery = query;
  }

  setUniqField(field) {
    this.uniqField = field;
  }

  setInsertOnly() {
    this.insertOnly = true;
  }

  setTestOnly() {
    this.testOnly = true;
  }

  setUpdateMany(field) {
    this.updateMany = field;
  }

  setGroupField(field) {
    this.groupField = field;
  }

  setModel(model) {
    this.model = model;
  }

  async checkItem(search, many = false) {
    if (many) {
      return this.model.find(search);
    }
    return this.model.findOne(search);
  }

  async getExistsContainer(items) {
    const objectIds = [];
    const { uniqField } = this;
    let item = {};
    let uniqVal = '';
    let group = 'noGroup';

    const existsContainer = {};
    for (let i = 0; i < items.length; i += 1) {
      item = items[i];
      uniqVal = item[uniqField];
      if (Array.isArray(uniqVal)) {
        [uniqVal] = uniqVal;
      }
      objectIds.push(uniqVal);
    }

    while (objectIds.length) {
      const checkObjects = objectIds.splice(0, this.limit);

      if (checkObjects.length) {
        const search = {};
        search[uniqField] = { $in: checkObjects };
        if (this.existQuery) {
          const sgKeys = Object.keys(this.existQuery);
          for (let i = 0; i < sgKeys.length; i += 1) {
            const k = sgKeys[i];
            search[k] = this.existQuery[k];
          }
        }
        const exists = await this.checkItem(search, true);

        for (let i = 0; i < exists.length; i += 1) {
          const cr = exists[i].transform();
          const field = cr[uniqField];
          if (this.groupField !== false) {
            group = cr[this.groupField];
          }
          if (!existsContainer[group]) {
            existsContainer[group] = {};
          }
          existsContainer[group][field] = cr._id;
        }
      }
    }
    return existsContainer;
  };

  prepareItem(item) {
    if (this.prepareFunction && typeof this.prepareFunction === 'function') {
      return this.prepareFunction(item);
    }
    return item;
  }

  static isUndefined(v) {
    return typeof v === 'undefined';
  }

  static isNotUndefined(v) {
    return !Updater.isUndefined(v);
  }

  static hasKey(v, key) {
    if (Updater.isUndefined(v)) {
      return false;
    }
    return Updater.isNotUndefined(v[key]);
  }

  async bulkWrite(array) {
    if (this.testOnly) {
      this.tmp.itemsLen += array.length;
      return;
    }
    return this.model.bulkWrite(array, {
      ordered: true,
      w: 1,
    });
  }

  /**
   *
   * @param items
   * @returns {Promise<*>}
   */
  async update(items) {
    let item = {};
    let newItems = [];
    let updateItems = [];
    const { uniqField, stepLimit } = this;
    if (!uniqField) {
      throw 'empty uniqField';
    }
    const stat = {
      nouniq: 0,
      nogroup: 0,
    };

    let group = 'noGroup';
    let updateOne = 'updateOne';
    if (this.updateMany) updateOne = 'updateMany';
    const tasks = [];
    try {
      const existsContainer = await this.getExistsContainer(items);
      for (let i = 0; i < items.length; i += 1) {
        item = this.prepareItem(items[i]);

        const field = item[uniqField];
        if (!field) {
          stat.nouniq += 1;
          continue;
        }
        if (this.groupField !== false) {
          group = item[this.groupField];
        }
        if (!Updater.hasKey(existsContainer[group], field)) {
          item.createdAt = new Date();
          item.updatedAt = new Date();
          newItems.push({
            insertOne: {
              document: item,
            },
          });
          this.tmp.ins += 1;
        } else {
          if (!this.insertOnly) {
            item.updatedAt = new Date();
            let filter = {
              _id: mongodb.ObjectID(existsContainer[group][field]),
            };
            if (this.updateMany) {
              filter = { [uniqField]: field };
            }
            const { ...update } = item;
            delete update[uniqField];
            const updateItem = {
              [updateOne]: {
                update,
                filter,
              },
            };
            updateItems.push(updateItem);
            this.tmp.upd += 1;
          } else {
            if (this.testOnly) {
              this.tmp.itemsLen += 1;
            }
          }
        }
        if (newItems.length === this.limit) {
          tasks.push(this.bulkWrite(newItems));
          newItems = [];
        }

        if (updateItems.length === this.limit) {
          tasks.push(this.bulkWrite(updateItems));
          updateItems = [];
        }

        if ((i + 1) % stepLimit === 0) {
          console.log(`processed ${stepLimit}`);
        }
      }

      if (newItems.length) {
        tasks.push(this.bulkWrite(newItems));
      }
      if (updateItems.length) {
        tasks.push(this.bulkWrite(updateItems));
      }
    } catch (e) {
      console.log(e.toString());
      console.log('newItems.length', newItems.length);
      console.log('updateItems.length', updateItems.length);
    }
    return Promise.all(tasks);
  }
}

module.exports = Updater;
