const {
  Agent,
  fetch
} = require('undici');

const CHECK_REGEX = /(p_cache|content|custom|puppet|wget|cached|no_db)_force(.*?)$/;

function commandCheck(txt) {
  const found = txt.match(CHECK_REGEX);

  return found && found[1];
}

function fetchTimeout(u, connectTimeout = 10000) {
  return fetch(u, {
    dispatcher: new Agent({connectTimeout})
  });
}

function timeout(s, f) {
  const tm = r =>
    setTimeout(() => {
      if (f) {
        f();
      }
      r(true);
    }, s * 1000);
  return new Promise(r => tm(r));
}

function checkData(data, msg = 'missing data') {
  if (data) {
    throw Error(msg);
  }
}

function parseEnvArray(name = '') {
  const arr = [];
  const {env} = process;

  if (env[`${name}_0`]) {
    arr.push(env[`${name}_0`]);
  }
  for (let envItem = 1; envItem < 10; envItem += 1) {
    if (env[`${name}_${envItem}`]) {
      arr.push(env[`${name}_${envItem}`]);
    }
  }
  return arr;
}

const toUrl = url => {
  if (url.match('www.')) {
    url = url.replace(/www\./, '');
  }
  if (!url.match(/^(https?|ftp|file)/)) return `http://${url}`;
  return url;
};

const isDateMoreADay = (date) => {
  if (!date) {
    return true;
  }
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  return (now - date) > oneDay;
}

module.exports.commandCheck = commandCheck;
module.exports.timeout = timeout;
module.exports.checkData = checkData;
module.exports.toUrl = toUrl;

module.exports.parseEnvArray = parseEnvArray;
module.exports.fetchTimeout = fetchTimeout;
module.exports.isDateMoreADay = isDateMoreADay;
