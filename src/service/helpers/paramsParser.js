const parse = (params) => {
  const cmds = {};
  params.forEach((val) => {
    const vars = val.match(/([a-z]+)=([a-zA-Zа-яА-Я0-9,_\-.:\/]+)/g);
    if (vars) {
      vars.forEach((item) => {
        const vars1 = item.match(/([a-z]+)=([a-zA-Zа-яА-Я0-9,_\-.:\/]+)/);
        if (vars1 && vars1.length === 3) {
          const cmd = vars1[1];
          let value = vars1[2];
          if (['sourceid'].indexOf(cmd) !== -1 || /limit/.test(cmd)) {
            value = parseInt(value);
          }
          cmds[cmd] = value;
        }
      });
    }
  });
  return cmds;
};

module.exports = parse;
