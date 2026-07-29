const {Readability} = require('@mozilla/readability');
const {JSDOM} = require('jsdom');

const {logger} = require('./logger');
const {fetchTimeout} = require("./index");

const parse = async (url, options = {}) => {
    let result = '';
    let html = options.html || '';
    if (!html) {
        try {
            logger('readability start');
            let _html = await fetchTimeout(url, options).then(r => r.text());
            logger('readability end');
            html = _html
        } catch {
            throw new Error('Mercury failed');
        }
    }
    if (html) {
        const doc = new JSDOM(html, {url}).window.document;
        result = new Readability(doc).parse();
    }
    return result;
};
module.exports = parse;
