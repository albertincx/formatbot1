const fs = require('fs');

const logger = (content, file) => {
  if (process.env.DEV || global.isDevEnabled) {
    if (file) {
      fs.writeFileSync(`.conf/${file}`, String(content));
    } else {
      console.log(content);
    }
  }
};
module.exports = logger;
