const { omit } = require('lodash');
const counter = require('../../api/models/increment.model');

/**
 *
 * @param model
 * @param schema
 * @returns {Promise<void>}
 */
async function setIncrement(model, schema) {
  if (model.isNew || !model.objectId) {
    const count = await counter.findByIdAndUpdate({ _id: schema },
        { $inc: { seq: 1 } },
        {
          new: true,
          upsert: true,
        });
    model.objectId = count.seq;
  }
}

function omitParams(params) {
  return omit(
      params,
      [
        'loaded',
        'perPage',
        'model',
        'page',
        'tasks',
        'desc',
        'asc',
        'task',
        'value',
        'groupBy',
        'sum',
        'project',
        'fields',
        '$or',
      ],
  );
}

async function updateMany(model, params, update) {
  const search = omitParams(params);
  await model.updateMany(search, { $set: update }).exec();
}

function toLocalTime(val) {
  const d = new Date(val);
  d.setHours(d.getHours() + ((new Date().getTimezoneOffset() / 60) * -1));

  return new Date(d.getTime());
}

function getDateOrInt(val) {
  if (/^([0-9]+$)/.test(val)) {
    return parseInt(val);
  }
  try {
    return toLocalTime(val);
  } catch (e) {
  }
  return false;
}

function parseParams(params) {
  const options = omitParams(params);
  const searchOptions = {};
  const ranges = [];
  Object.keys(options).map((key) => {
    const val = options[key];
    const isRangeField = /(To|From)$/.test(key);
    if (isRangeField) {
      ranges.push(key.replace(/(To|From)$/, ''));
      return false;
    }

    if (/\*/.test(val)) {
      searchOptions[key] = new RegExp(val.replace(/\*/g, ''));
    } else {
      searchOptions[key] = val;
    }

    return false;
  });

  if (ranges.length) {
    ranges.map(key => {
      let val = '';
      if (!searchOptions[key]) {
        searchOptions[key] = {};
      }
      if (options[`${key}From`]) {
        val = getDateOrInt(options[`${key}From`]);
        if (val) searchOptions[key].$gte = val;
      }
      if (options[`${key}To`]) {
        val = getDateOrInt(options[`${key}To`]);
        if (val) searchOptions[key].$lte = val;
      }
    });
  }
  return searchOptions;
}

async function group(model, search, { groupBy, sum, project }) {
  // and here are the grouping request:
  const aggregate = model.aggregate();
  const $group = {
    _id: `$${groupBy}`, // grouping key - group by field
    // minPrice: { $min: '$price' }, // we need some stats for each group (for each district)
    // maxPrice: { $max: '$price' },
  };
  if (sum) {
    $group[`${sum}`] = { $sum: 1 };
    $group[`${sum}Amount`] = { $sum: `$${sum}` };
  }
  if (project) {
    aggregate.append({ $project: project });
  }
  aggregate.append({ $match: search });
  aggregate.append({
    $group,
  });

  aggregate.cursor({});
  return aggregate.exec().toArray();
}

/**
 *
 * @param model
 * @param params
 * @param sortParam
 * @returns {Promise<{items: any, count: any, filters: any} | never>}
 */
async function createSearchPromises(model, params = {}, sortParam = {}) {
  const { page = 1, loaded = 'false', fields } = params;
  const perPage = params.perPage ? parseInt(params.perPage) : 10;

  let sort = sortParam;

  if (params.asc || params.desc) {
    sort = {};
  }

  if (params.asc) {
    sort[params.asc] = 1;
  }
  if (params.desc) {
    sort[params.desc] = -1;
  }
  const fieldsOnly = {};
  if (fields) {
    fields.split(',').map(field => fieldsOnly[field] = 1);
  }
  const searchOptions = parseParams(params);

  if (params.$or) {
    searchOptions.$or = params.$or;
  }
  const search = model.find(searchOptions, fieldsOnly).
      sort(sort).
      skip(perPage * (page - 1)).
      limit(perPage);
  let tasks = [search];
  if (params.groupBy) {
    const arrg = group(model, searchOptions, params);
    tasks = [arrg];
  }
  if (loaded === 'false') {
    tasks.push(model.countDocuments(searchOptions));
    if (typeof params.tasks !== 'undefined') {
      const task = params.tasks();
      tasks = tasks.concat([task]);
    }
  }
  return Promise.all(tasks).then(([items, count, filters]) => {
    return {
      items,
      count,
      filters,
    };
  });
}

module.exports = {
  updateMany,
  createSearchPromises,
  setIncrement,
};
