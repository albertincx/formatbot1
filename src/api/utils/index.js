const {
  Agent,
  fetch
} = require('undici');

const CHECK_REGEX = /(p_cache|content|custom|puppet|wget|cached|no_db)_force(.*?)$/;

const CHECK_REGEX2 = /(no_db)_force(.*?)$/;

function commandNoDb(txt) {
  const found = txt.match(CHECK_REGEX2);

  return found && found[1];
}

function commandCheck(txt) {
  const found = txt.match(CHECK_REGEX);

  return found && found[1];
}

const MAX_HTML_BYTES = parseInt(process.env.MAX_HTML_BYTES, 10) || 5 * 1024 * 1024;

function fetchTimeout(u, connectTimeout = 10000) {
  const ct = typeof connectTimeout === 'number' ? connectTimeout : 10000;
  return fetch(u, {
    dispatcher: new Agent({connectTimeout: ct})
  });
}

async function fetchTextWithLimit(u, opts = {}) {
  const maxBytes = opts.maxBytes || MAX_HTML_BYTES;
  const connectTimeout = typeof opts.connectTimeout === 'number' ? opts.connectTimeout : 10000;
  const timeoutMs = typeof opts.timeoutMs === 'number' ? opts.timeoutMs : 15000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('Request timeout')), timeoutMs);

  try {
    const response = await fetch(u, {
      dispatcher: new Agent({connectTimeout}),
      signal: controller.signal,
    });

    const contentLength = Number(response.headers.get('content-length'));
    if (contentLength && contentLength > maxBytes) {
      if (response.body) await response.body.cancel().catch(() => {});
      throw new Error(`Content-Length ${contentLength} exceeds limit of ${maxBytes} bytes`);
    }

    if (!response.body) {
      return '';
    }

    const chunks = [];
    let totalBytes = 0;
    for await (const chunk of response.body) {
      totalBytes += chunk.byteLength;
      if (totalBytes > maxBytes) {
        controller.abort(new Error('Response exceeds max size'));
        if (response.body) await response.body.cancel().catch(() => {});
        throw new Error(`Response body exceeds limit of ${maxBytes} bytes`);
      }
      chunks.push(chunk);
    }

    return Buffer.concat(chunks, totalBytes).toString('utf8');
  } finally {
    clearTimeout(timer);
  }
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
module.exports.commandNoDb = commandNoDb;
module.exports.timeout = timeout;
module.exports.checkData = checkData;
module.exports.toUrl = toUrl;

module.exports.parseEnvArray = parseEnvArray;
module.exports.fetchTimeout = fetchTimeout;
module.exports.fetchTextWithLimit = fetchTextWithLimit;
module.exports.MAX_HTML_BYTES = MAX_HTML_BYTES;
module.exports.isDateMoreADay = isDateMoreADay;
