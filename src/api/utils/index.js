function check(txt) {
  const m = txt.match(
    /(p_cache|content|custom|puppet|wget|cached)_force(.*?)$/,
  );
  if (m && m[1]) {
    return m[1];
  }
  return false;
}

function timeout(s) {
  const tm = r => setTimeout(() => r(true), s * 1000);
  return new Promise(r => tm(r));
}

function checkData(data, msg = 'missing data') {
  if (data) {
    throw Error(msg);
  }
}

module.exports.check = check;
module.exports.timeout = timeout;
module.exports.checkData = checkData;
