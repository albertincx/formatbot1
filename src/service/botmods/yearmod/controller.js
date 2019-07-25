const AnyModel = require('../api/models/any.model');
const AnySchema = require('../api/models/any.schema');

const getText = (text) => text.replace(/\/[a-zA-Z0-9]+\s/, '');

const collect = {
  users: 'yearmodusers',
  gifts: 'yearmodgifts',
};

exports.startExport = async (cmd) => {
  const type = getText(cmd);
  const model = AnyModel.collection.conn.model('Task', AnySchema);
  let msg = 'type undefined';
  if (type) {
    await model.update({ type }, { $set: { status: 1 } })
      .exec();
    msg = 'success';
  }
  return msg;
};
exports.getUsers = async (page = 1) => {
  const model = AnyModel.collection.conn.model(collect.users, AnySchema);
  let msg = '';
  const users = await model.list({
    perPage: 10,
    page,
  });
  users.map(u => msg += `${u.name}\n`);
  return msg;
};
