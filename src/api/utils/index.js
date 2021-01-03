function check(txt) {
  const m = txt.match(
    /(pcache|content|custom|puppet|wget|cached)_force(.*?)$/,
  );
  if (m && m[1]) {
    return m[1];
  }
  return false;
}

module.exports.check = check;
