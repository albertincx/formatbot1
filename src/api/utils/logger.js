const fs = require('fs');
const {IS_DEV} = require('../../config/vars');

const logger = (content, file) => {
  if (IS_DEV || global.isDevEnabled) {
    if (file) {
      fs.writeFileSync(`.conf/${file}`, String(content));
    } else {
      console.log(content);
    }
  }
};
module.exports = logger;
