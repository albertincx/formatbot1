const {Readability} = require('@mozilla/readability');
const {JSDOM, VirtualConsole} = require('jsdom');

const {logger} = require('./logger');
const {fetchTextWithLimit, MAX_HTML_BYTES} = require("./index");

const virtualConsole = new VirtualConsole();

const parse = async (url, options = {}) => {
    let result = '';
    let html = options.html || '';
    if (!html) {
        try {
            logger('readability start');
            html = await fetchTextWithLimit(url, options);
            logger('readability end');
        } catch (e) {
            logger(e);
            throw new Error('Mercury failed');
        }
    }
    if (html) {
        const byteLength = Buffer.isBuffer(html) ? html.length : Buffer.byteLength(html);
        if (byteLength > MAX_HTML_BYTES) {
            throw new Error(`HTML content too large (${byteLength} bytes)`);
        }
        const dom = new JSDOM(html, {url, virtualConsole});
        try {
            result = new Readability(dom.window.document).parse();
        } finally {
            dom.window.close();
        }
    }
    return result;
};
module.exports = parse;
