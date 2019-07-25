const { getComplects } = require('../../service/helpers/utils');
const fs = require('fs');
const SAND_PF = '_sand';
class SandBox {
  constructor(fotobankDir) {
    this.fotobankDir = fotobankDir;
  }

  getSandDir(dir, isFull = false) { //sand only
    const sand_pf = isFull ? '' : SAND_PF;
    if (dir.endsWith(SAND_PF)) {
      return dir;
    }
    const isComplectDir = dir.match(/images\/(.*?)$/);
    if (isComplectDir && isComplectDir[1]) {
      return dir;
    }
    let imgDir = /\/images/.test(dir) ? dir : `${dir}/images`;
    if (!fs.existsSync(imgDir)) {
      this.mkRecursive(imgDir);
    }
    let newComplect = this.getNewComplect(imgDir, sand_pf);
    if (newComplect) {
      imgDir = `${imgDir}/${newComplect}`;
    }

    return imgDir;
  }

  getNewComplect(dir, sand_pf = '') {
    let newComplect = '';
    const isLastImages = dir.endsWith('images');
    const complects = getComplects(dir, isLastImages);
    let i = 1;
    let found = false;
    while (i < 50) {
      found = !complects[`00${i}`];
      if (isLastImages) {
        found = found && !complects[`00${i}${sand_pf}`];
      }
      if (found) {
        newComplect = `00${i}${sand_pf}`;
        break;
      }
      i += 1;
    }
    return newComplect;
  }

  makeDestFolder(route, { isSandBox = false, isFull = false }) {
    route = route.replace('/auto/fotobank', '');
    const slashes = route.split('/');

    const dest = `${this.fotobankDir}/${route}`;
    let destination = dest.replace(/\/\//g, '/');
    const isExists = fs.existsSync(destination);
    if (isSandBox) {
      if (slashes.length === 1) {
        destination = `${this.fotobankDir}/.sandBox/${route}`;
      }
      return this.getSandDir(destination, isFull);
    }
    if (slashes.length === 9 || slashes.length === 1) {
      if (!isExists) {
        this.mkRecursive(destination);
      }
      return destination;
    }
    return isExists ? destination : false;
  }

  mkRecursive(dest) {
    try {
      this.mkDirByPathSync(dest);
    } catch (e) {
      console.log(e);
    }
  }

  mkDirByPathSync(targetDir) {
    return targetDir.split('/').reduce((parentDir, childDir) => {
      const curDir = `${parentDir}/${childDir}`;
      try {
        fs.mkdirSync(curDir);
      } catch (err) {
        if (err.code === 'EEXIST') { // curDir already exists!
          return curDir;
        }
        if (err.code === 'ENOENT') { // Throw the original parentDir error on curDir `ENOENT` failure.
          throw new Error(`EACCES: permission denied, mkdir '${parentDir}'`);
        }
      }
      return curDir;
    }, '');
  }
}

module.exports = SandBox;
