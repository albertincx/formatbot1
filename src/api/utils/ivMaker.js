const makeTelegraph = require('./makeTelegraph');
const {logger} = require('./logger');
const ParseHelper = require('./parseHelper');
const db = require('./db');
const {
  toUrl,
  fetchTimeout
} = require('./index');
const {convertPdfToHtml, getTextFromPDF} = require("./pdf");

function from64(v) {
  return Buffer.from(v, 'base64');
}

const GOOGLE_DOMAIN = from64('bmV3cy5nb29nbGUuY29t');

const pdfToHtml = async (link) => {
  try {
    const pdfPath = await getTextFromPDF(link);
    const outputDir = './output';
    return convertPdfToHtml(pdfPath, outputDir);
  } catch (error) {
    console.error('Conversion failed:', error);
  }
}

const makeIvLink = async (urlParam, paramsObj) => {
  const url = toUrl(urlParam);
  let content, title;
  const authorUrl = `${url}`;
  const {
    access_token: accessToken,
    ...params
  } = paramsObj;

  if (paramsObj.pdf) {
    const contentPdf = await pdfToHtml(paramsObj.pdf);
    title = paramsObj.pdfTitle;
    content = contentPdf;
  } else {
    if (url.match(/yandex\.ru\/showcap/)) {
      throw new Error('unsupported');
    }

    const parseHelper = new ParseHelper(url, params);
    const {
      title: t,
      content: c,
    } = await parseHelper.parse();
    content = c;
    title = t;
  }

  if (!content) {
    throw new Error('empty content');
  }

  const obj = {
    title,
    access_token: accessToken
  };
  if (authorUrl.length <= 255) {
    obj.author_url = authorUrl;
    obj.author_name = authorUrl.substring(0, 127);
  }
  logger('make iv');
  const tgRes = await makeTelegraph(obj, content);

  const {
    telegraphLink,
    pages
  } = tgRes;

  if (!telegraphLink) {
    throw new Error('empty ivlink');
  }

  const res = {
    iv: telegraphLink,
    ti: title,
  };

  if (pages) {
    res.p = pages;
  }

  if (paramsObj.db) {
    await db.updateOneLink({url, ...res});
  }

  res.isLong = res.p;

  return res;
};

const parse = u => {
  if (u.match(GOOGLE_DOMAIN)) {
    let parsed = u.split(/es\/(.*?)\?/);
    if (parsed) {
      parsed = `${from64(parsed[1])}`;
      parsed = parsed.match(/^\x08\x13".(.*)\//);
      return parsed[1];
    }
  }

  return u;
};

const isText = async (urlParam, q) => {
  if (q && q.match('cached')) {
    logger('cached is text = true');
    return {
      isText: true,
      url: urlParam
    };
  }

  let fromParam = toUrl(urlParam);
  if (!fromParam.match('%')) fromParam = encodeURI(fromParam);

  let startsText = false;
  let url = fromParam;
  logger(url);
  try {
    const response = await fetchTimeout(url);
    const {
      url: newUrl,
      headers
    } = response;

    url = newUrl;
    const contentType = headers.get('content-type') || '';
    startsText = contentType.startsWith('text/');
  } catch (e) {
    logger(e);
  }

  return {
    isText: startsText,
    url
  };
};

exports.parse = parse;
exports.isText = isText;
exports.makeIvLink = makeIvLink;
