const fetch = require('node-fetch');

const apiSend = async (method, params = {}) => {
  let { data, api, headers: headersParam, botName } = params;
  let apiUrl = api || `${process.env.apiUrl}`;
  if (botName === 'sellers_talk') {
    apiUrl = 'http://nodebot2:3000/';
  }
  const Authorization = `Bearer ${process.env.FOTOBANK_FULL_KEY}`;
  const on = `${process.env.BOT_ON}` === '1';
  if (on && apiUrl) {
    const headers = headersParam || { Authorization };
    headers['Content-Type'] = 'application/json';
    headers['Accept'] = 'application/json';
    const options = { headers };
    if (data) {
      options.method = 'POST';
      options.body = JSON.stringify(data);
    }
    options.timeout = 30000;
    return fetch(`${apiUrl}${method}`, options).
        then(res => {
          console.log(res)
          return res.json();
        }).
        catch(console.log);
  }
};
module.exports = { apiSend };
