const Model = require('../../api/models/any.model');
const { runByDate } = require('../helpers');

const {
  COLLECTION_TASKS,
} = require('../constants/collections');

class TaskManager {
  constructor(taskType) {
    const Tasks = Auto.collection.conn.model(COLLECTION_TASKS, AnySchema);
    this.taskLimit = 5;
    this.taskType = taskType;
    this.taskStatus = 'active';
  }

  enableParents() {
    const filter = {
      status: this.taskStatus,
      perPage: this.taskLimit,
      taskType: this.taskType,
      $or: [{ lock: null }, { lock: 0 }],
      $not: [{ parent: null }],
    };
    const tasks = this.model.list(filter);
    if (!tasks || tasks.length === 0) {

      return false;
    }
    const promises = [];
    for (let i = 0; i < tasks.items.length; i += 1) {
      const task = tasks.items[i];
      const taskObject = task.toObject();
      // const { active } = taskObject;
      const { type, active, parent, params: taskParams, botName } = taskObject;
      const taskParamsParsed = taskParams ? parse(taskParams) : {};
      if (active) {
        const { period, updatedAt } = taskObject;
        const { time } = taskParamsParsed;

        if (runByDate(updatedAt, period, time)) {
          promises.push(apiSend('bot/approve', {
            data: { msg: `task activated: ${parent}` }, botName,
          }));
          // enable main task
          if (parent && tasknames.indexOf(parent) !== -1) {
            promises.push(
                Tasks.updateOne({ type: parent }, { status: 'active' }));
          }
        } else {
          // skip
          // console.log('skip');
          continue;
        }
      }
    }
    return promises;
  }

  getTasks() {
    const filter = {
      status: this.taskStatus,
      perPage: this.taskLimit,
      taskType: this.taskType,
      $or: [{ lock: null }, { lock: 0 }],
    };
    const tasks = this.model.list(filter);
    if (!tasks || tasks.length === 0) {
      return false;
    }
    return tasks;
  }

  checkTask() {

  }
}

module.exports = TaskManager;