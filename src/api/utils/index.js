const CHECK_REGEX = /(p_cache|content|custom|puppet|wget|cached)_force(.*?)$/;
function check(txt) {
  const m = txt.match(CHECK_REGEX);
  if (m && m[1]) {
    return m[1];
  }
  return false;
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
  if (process.env[`${name}_0`]) {
    arr.push(process.env[`${name}_0`]);
  }
  for (let i = 1; i < 10; i += 1) {
    if (process.env[`${name}_${i}`]) {
      arr.push(process.env[`${name}_${i}`]);
    }
  }
  return arr;
}

module.exports.check = check;
module.exports.timeout = timeout;
module.exports.checkData = checkData;

module.exports.parseEnvArray = parseEnvArray;
