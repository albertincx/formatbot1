const fs = require('fs');

function memLog(d) {
  d = d / 1024 / 1024;
  return `${Math.round(d * 100) / 100}MB`;
}

function showMem() {
  if (!this.os) {
    this.os = require('os');
  }
  console.log(memLog(this.os.freemem()));
  console.log(memLog(this.os.totalmem()));
  const used = process.memoryUsage().heapUsed;
  console.log(`used ${memLog(used)}`);
}

function basename(str = '', noExt = false) {
  let base = str.toString().substring(str.lastIndexOf('/') + 1);
  if (!noExt) {
    let ext = str.match(/jpg|png/i);
    if (ext) {
      [ext] = ext;
      base = base.replace(new RegExp(`.${ext}(.*?)$`, 'i'), `.${ext}$1`);
    }
  } else {
    if (base.lastIndexOf('.') !== -1) {
      base = base.substring(0, base.lastIndexOf('.'));
    }
  }

  return base;
}

const asyncForEach = async (array, callback) => {
  for (let index = 0; index < array.length; index += 1) {
    await callback(array[index], index, array);
  }
};

function readDir(dir) {
  return fs.readdirSync(dir);
}

function getComplects(imgDir, withSand = false) {
  const complects = {};
  const folders = readDir(imgDir);
  for (let c = 0; c < folders.length; c += 1) {
    const complectFolder = folders[c];

    if (/resized$/.test(complectFolder)) {
      continue;
    }
    if (!withSand && /_sand$/.test(complectFolder)) {
      continue;
    }

    let complectPath = `${imgDir}/${complectFolder}`;
    try {
      const stats = fs.statSync(complectPath);
      if (stats.isDirectory()) {
        const files = readDir(complectPath);
        const images = [];
        for (let i = 0; i < files.length; i += 1) {
          if (/jpg|png/i.test(files[i])) {
            images.push(files[i]);
          }
        }
        if (images.length) {
          complects[complectFolder] = images;
        }
      }
    } catch (e) {
    }
  }
  return complects;
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

module.exports = {
  showMem,
  basename,
  asyncForEach,
  getComplects,
  capitalizeFirstLetter,
};
