const Utils = require('./utils');
const cmdParsed = require('./cmdParser');
const getDate = (date) => {
  const d = date ? new Date(date) : new Date();
  d.setHours(d.getHours() + 3);
  return d;
};

function checkByDate(updatedAt, period) {
  const dateNow = getDate();
  updatedAt = getDate(updatedAt);
  const per = parseFloat(period) / 60;
  const hours = parseFloat(Math.abs(dateNow - updatedAt) / 36e5).toFixed(2);
  let skip = hours < per;
  // console.log(hours, per)
  return !skip;
}

function checkByTime(time) {
  if (time.match(',')) {
    time = time.split(',');
  } else {
    time = [time];
  }
  return time.find(timeOne => checkTime(timeOne));
}

function checkTime(time) {
  let testDate = getDate();
  let dateNow = getDate();
  let [hour, min] = time.split(':');
  let roundMin = dateNow.getMinutes();
  roundMin = Math.round(roundMin / 10) * 10;
  const isNextZero = roundMin === 60;
  if (isNextZero || roundMin === 0) {
    if(min === '00' && isNextZero){
      return false;
    }
    roundMin = '00';
  }
  testDate.setSeconds(0);
  testDate.setHours(hour);
  testDate.setMinutes(min);
  if (parseInt(hour) === dateNow.getHours()) {
    return `${roundMin}` === min && dateNow >= testDate;
  }
  return false;
}

module.exports = { Utils, cmdParsed, getDate, checkByDate, checkByTime };
