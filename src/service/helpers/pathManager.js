const Utils = require('./utils');

class PathManager {
  constructor(params = {}) {
    this.root = [
      { data: { cars: ['car'] } },
      { Ads: ['Ad'] },
      { Load: { Cars: { Models: ['Model'] } } },
      { yml_catalog: { data: { cars: ['car'] } } },
    ];

    if (typeof params.type !== 'undefined') {
      this.type = params.type;
      this.schema = this.getSchemas();
    }

    this.noOpts = {
      'Brand': 'БезБренда',
      'Model': 'БезМодели',
      'МодельныйГод': 'БезГода',
      'BodyType': 'БезТипаКузова',
      'Modification': 'БезМодификации',
      'Complectation': 'БезКомплектации',
      'Опция': 'БезОпции',
      'Metallic': 'НеМеталлик',
      'Color': 'БезЦвета',
    };
  }

  getSchemas(source = null) {
    let { type } = this;

    if (source) {
      type = source.schemaType;
    }
    const scheme = require('./scheme');
    const schema = scheme[`type${type}`];
    const schemaKeys = Object.keys(schema);
    return { schema, schemaKeys };
  }

  getImageDir(item, schemas = null) {
    const line = [];
    const { schema, schemaKeys } = schemas ? schemas : this.schema;
    // console.log(schema, schemaKeys);
    for (let f = 0; f < schemaKeys.length; f += 1) {
      const key = schemaKeys[f];
      const keyProp = schema[key] ? schema[key] : key;
      line.push(item[keyProp]);
    }
    return this.getPath(line);
  }

  getComplects(dir) {
    return Utils.getComplects(dir);
  }

  getFolderName(index) {
    const { noOpts } = this;

    const fromOpts = Object.keys(noOpts);
    let th = fromOpts[index];
    if (typeof noOpts[th] !== 'undefined') {
      th = noOpts[th];
    } else {
      th = `No${th}`;
    }
    return th;
  }

  getString(base) {
    if (Array.isArray(base)) {
      base = base[0];
    }
    let str = '';
    if (base) {
      if (typeof base !== 'string') {
        base = base.toString();
      }
      str = base.replace(/\s/g, '').replace(/\.$/, '');
    }

    return str;
  }

  changePath(line) {
    if (line[0] === 'Hyundai') {
      if (line[6] && !line[6].match(/[а-яА-Я]/)) {
        let str = `${line[5]} + ${line[6]}`;
        line[5] = str.replace(/\+([^\s])/g, '+ $1').
            replace(/([^\s])\+/g, '$1 +');
      }
    }
  }

  getPath(line, arr = false) {
    const dir = [];
    // skip last;
    for (let j = 0; j < line.length - 1; j += 1) {
      let name;
      if (!line[j]) {
        name = this.getFolderName(j);
      } else {
        name = this.getString(line[j]);
      }
      if (j === 2) {
        // year from AA
        if (/,/.test(name)) {
          name = `${parseInt(name.replace(/[,\s]/g, ''))}`;
        } else {
          name = `${parseInt(name.replace(/\s/, ''))}`;
        }
      }
      if (j === 7) {
        // year from AA
        name = name.trim();
        if (name === 'Да') {
          name = 'Металлик';
        } else {
          name = 'НеМеталлик';
        }
      }
      name = name.replace('/', ':');
      dir.push(`${name}`);
    }
    return arr ? dir : dir.join('/');
  }

  getNextNewDir(dir) {
    const dirs = dir.split('/images/');
    let nextDir = '';

    if (dirs && dirs[1]) {
      nextDir = `00${parseInt(dirs[1]) + 1}`;
      // let imgDir = `${dirs[0]}/images`;
      /*const complects = Utils.getComplects(imgDir);
      let i = 1;
      let found = false;
      while (i < 50) {
        found = !complects[`00${i}`];
        found = found && !complects[`00${i}`];
        if (found) {
          imgDir += `/00${i}`;
          break;
        }
        i += 1;
      }*/
      // nextDir = imgDir;
      // console.log(imgDir);
      nextDir = `${dirs[0]}/images/${nextDir}`;
    }

    if (nextDir) {
      if (nextDir.match(/images\/[0-9]+/)) {
        return nextDir;
      }/**/
    }
    return '';
  }
}

module.exports = PathManager;
