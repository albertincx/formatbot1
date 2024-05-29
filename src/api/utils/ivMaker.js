const makeTelegraph = require('./makeTelegraph');
const {logger} = require('./logger');
const ParseHelper = require('./parseHelper');
const db = require('./db');
const {
    toUrl,
    fetchTimeout
} = require('./index');

function from64(v) {
    return Buffer.from(v, 'base64');
}

const G = from64('bmV3cy5nb29nbGUuY29t');

const makeIvLink = async (urlParam, paramsObj) => {
    const url = toUrl(urlParam);
    if (url.match(/yandex\.ru\/showcap/)) {
        throw new Error('unsupported');
    }
    const {
        access_token: accessToken,
        ...params
    } = paramsObj;

    const authorUrl = `${url}`;
    const parseHelper = new ParseHelper(url, params);
    const {
        title,
        content
    } = await parseHelper.parse();
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
        await db.updateOne({url, ...res});
    }

    res.isLong = res.p;
    return res;
};

const parse = u => {
    if (u.match(G)) {
        let p = u.split(/es\/(.*?)\?/);
        if (p) {
            p = `${from64(p[1])}`;
            p = p.match(/^\x08\x13".(.*)\//);
            return p[1];
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

    let u = toUrl(urlParam);
    if (!u.match('%')) u = encodeURI(u);

    let startsText = false;
    let url = u;
    logger(url);
    try {
        const r = await fetchTimeout(url);
        const {
            url: newUrl,
            headers
        } = r;
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
