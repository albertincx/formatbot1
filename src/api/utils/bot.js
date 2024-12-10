const broadcast = require('tgsend');
const fs = require('fs');
const {
    TG_ADMIN_ID,
    TG_BUGS_GROUP,
    BLACK_LIST_FILE,
    MONGO_URI_SECOND,
    MONGO_URI_BROAD,
} = require('../../config/vars');
const {logger} = require('./logger');

const {createConnection} = require("../../config/mongoose");

const TG_ADMIN = parseInt(TG_ADMIN_ID, 10);
const OFF = 'Off';
const ON = 'On';

const PARSE_MODE_MARK = 'Markdown';

const INLINE_TITLE = 'InstantView created. Click me to send';
const BANNED_ERROR = 'USER_BANNED_IN_CHANNEL';
const RIGHTS_ERROR = 'need administrator rights in the channel chat';

class BotHelper {
    constructor(bot, worker) {
        this.bot = bot;
        this.config = {no_puppet: false};
        try {
            this.config = JSON.parse(`${fs.readFileSync('.conf/config.json')}`);
        } catch (e) {
            logger(e);
        }
        this.tgAdmin = TG_ADMIN;
        this.waitSec = false;
        this.worker = worker;
    }

    isAdmin(chatId) {
        return chatId === this.tgAdmin;
    }

    botMes(chatId, text, mark = true) {
        if (this.worker) {
            return Promise.resolve();
        }
        let opts = {};
        if (mark) {
            opts = {parse_mode: this.markdown()};
        }
        return this.bot
            .sendMessage(chatId, text, opts)
            .catch(e => this.sendError(e, `${chatId}${text}`));
    }

    sendAdmin(textParam, chatIdParam = '', mark = false) {
        if (this.worker) {
            return Promise.resolve();
        }
        let chatId = chatIdParam;
        let text = textParam;
        let opts = {};
        if (mark === true) {
            opts = {
                parse_mode: this.markdown(),
                disable_web_page_preview: true,
            };
        }
        if (!chatId) {
            chatId = TG_ADMIN;
        }
        if (`${chatId}` === `${this.tgAdmin}`) {
            text = `service: adm ${text}`;

            if (text.match('Too Many')) {
                const [sec] = text.match(/[0-9]+$/) || [];
                if (sec) {
                    this.waitSec = sec;
                    clearTimeout(this.timer);
                    this.timer = setTimeout(() => {
                        this.waitSec = false;
                    }, sec * 1000);
                }
            }
        }

        return this.bot.sendMessage(chatId, text, opts)
            .catch(e => {
                logger('Send admin');
                logger(e);
            });
    }

    sendAdminOpts(text, opts) {
        if (this.worker) {
            return Promise.resolve();
        }
        const chatId = TG_BUGS_GROUP || TG_ADMIN;

        return this.bot.sendMessage(chatId, text, opts)
            .catch(e => {
                logger('Send admin opts');
                logger(e);
            });
    }

    sendInline({
                   title,
                   messageId,
                   ivLink
               }) {
        if (this.worker) {
            return Promise.resolve();
        }
        let inlineTitle = title;
        if (!title) {
            inlineTitle = INLINE_TITLE;
        }
        const queryResult = {
            type: 'article',
            id: messageId,
            title: inlineTitle,
            input_message_content: {message_text: ivLink},
        };

        return this.bot.answerInlineQuery(messageId, [queryResult]);
    }

    sendAdminMark(text, chatId) {
        if (this.worker) {
            return Promise.resolve();
        }
        return this.sendAdmin(text, chatId, true);
    }

    getParams(hostname, chatId, force) {
        const params = {};
        const contentSelector =
            force === 'content' || this.getConf(`${hostname}_content`);
        if (contentSelector) {
            params.content = contentSelector;
        }
        const puppetOnly = force === 'puppet' || this.getConf(`${hostname}_puppet`);
        if (puppetOnly) {
            params.isPuppet = true;
        }
        const customOnly = force === 'custom' || this.getConf(`${hostname}_custom`);
        if (customOnly) {
            params.isCustom = true;
        }
        const wget = force === 'wget' || this.getConf(`${hostname}_wget`);
        if (wget) {
            params.isWget = true;
        }
        const cached = force === 'cached' || this.getConf(`${hostname}_cached`);
        if (cached) {
            params.isCached = true;
        }
        const scroll = this.getConf(`${hostname}_scroll`);
        if (scroll) {
            params.scroll = scroll;
        }
        const noLinks =
            force === 'no_links' || this.getConf(`${hostname}_no_links`);
        if (noLinks) {
            params.noLinks = true;
        }
        const pcache = force === 'p_cache';
        if (pcache) {
            params.isCached = true;
            params.cachefile = 'puppet.html';
            params.content = this.getConf('p_cache_content');
        }
        if (this.isAdmin(chatId)) {
            if (this.getConf('test_puppet')) {
                params.isPuppet = true;
            }
            if (this.getConf('test_custom')) {
                params.isCustom = true;
            }
        }
        const mozilla = this.getConf('mozilla');
        if (mozilla) {
            params.mozilla = true;
        }
        return params;
    }

    getConf(param) {
        let configParam = this.config[param] || this.config[`_${param}`];

        return configParam === OFF ? '' : configParam;
    }

    parseConfig(params) {
        let content;
        if (params[0] === '_') {
            // eslint-disable-next-line no-unused-vars
            const [_, param, ...val] = params.split('_');
            params = `${param} ${val.join('_')}`;
        }
        let config = params.replace(' _content', '_content');
        config = config.split(/\s/);
        let [param] = config;

        if (config.length === 2) {
            content = config[1].replace(/~/g, ' ');
            if (this.config[param] === content) content = OFF;
        } else {
            if (this.config[param] === ON || this.config[param]) {
                content = OFF;
            } else {
                content = ON;
            }
        }

        return {
            param,
            content
        };
    }

    toggleConfig(msg, send = true) {
        if (typeof msg === 'string') {
            msg = {text: msg};
        }
        let params = msg.text.replace('/config', '');
        params = params.trim();

        if (!params || !this.isAdmin(msg.chat.id)) {
            return Promise.resolve('no param or forbidden');
        }

        const {
            param,
            content
        } = this.parseConfig(params);
        this.config[param] = content;
        fs.writeFileSync('.conf/config.json', JSON.stringify(this.config));

        return send && this.botMes(TG_ADMIN, content, false);
    }

    showConfig() {
        return `${JSON.stringify(this.config)} db is ${this.db}`;
    }

    sendError(error, text = '') {
        let errorResult = error;
        if (typeof errorResult === 'object' && !global.isDevEnabled) {
            if (errorResult.response && typeof errorResult.response === 'object') {
                errorResult = errorResult.response.description || 'unknown error';
                if (errorResult.match(BANNED_ERROR) || errorResult.match(RIGHTS_ERROR)) {
                    return;
                }
            }
        } else {
            errorResult = `has error: ${JSON.stringify(errorResult)} ${errorResult.toString()} ${text}`;
        }

        this.sendAdmin(errorResult);
    }

    disDb() {
        console.log('db disabled');
        this.db = false;
    }

    setBlacklist() {
        const blf = fs.readFileSync(BLACK_LIST_FILE);
        this.bllist = `${blf ? `${blf}` : ''}`;
    }

    isBlackListed(h) {
        return this.bllist && this.bllist.match(h);
    }

    forwardMes(mid, from, to) {
        if (this.worker) {
            return Promise.resolve();
        }
        return this.bot.forwardMessage(to, from, mid);
    }

    sendIV(chatId, messageId, inlineMessageId, messageText, extra) {
        if (this.worker) {
            return Promise.resolve();
        }

        let text = messageText;
        if (extra && extra.parse_mode === this.markdown()) {
            text = text.replace(/[*`]/gi, '');
        }

        return this.bot
            .editMessageText(chatId, messageId, inlineMessageId, text, extra)
            .catch(e => {
                logger('send iv error');
                logger(e);
            });
    }

    sendIVNew(chatId, messageText, extra) {
        if (this.worker) {
            return Promise.resolve();
        }
        let text = messageText;
        if (extra && extra.parse_mode === this.markdown()) {
            text = text.replace(/[*`]/gi, '');
        }
        return this.bot.sendMessage(chatId, text, extra)
            .catch(e => {
                logger('send iv new error');
                logger(e);
            });
    }

    delMessage(chatId, messageId) {
        if (this.worker) {
            return Promise.resolve();
        }
        return this.bot.deleteMessage(chatId, messageId)
            .catch((e) => {
                logger('del mess error');
                logger(e);
            });
    }

    markdown() {
        return PARSE_MODE_MARK;
    }

    restartApp() {
        const {spawn} = require('child_process');
        spawn('pm2', ['restart', 'Format'], {
            stdio: 'ignore',
            detached: true,
        })
            .unref();
        this.sendAdmin('restarted');
    }

    gitPull() {
        const {spawn} = require('child_process');
        const gPull = spawn('git pull && pm2 restart Format --time', {shell: true});
        let log = 'Res: ';
        gPull.stdout.on('data', data => {
            log += `${data}`;
        });
        gPull.stdout.on('end', () => {
            logger(log);
            this.sendAdmin(log);
        });
    }

    setConn(c) {
        this.conn = c;
    }

    getInfo() {
        if (this.conn) {
            return this.conn.db.command({atlasSize: 1});
        }
        return Promise.resolve({});
    }

    getMidMessage(mId) {
        let mMessage = process.env[`MID_MESSAGE${mId}`] || '';
        mMessage = mMessage.replace('*', '\n');
        return mMessage;
    }

    startBroad(ctx) {
        this.conn = createConnection(MONGO_URI_SECOND);
        this.connSend = createConnection(MONGO_URI_BROAD);
        broadcast(ctx, this);
    }
}

exports.BotHelper = BotHelper;
exports.BANNED_ERROR = BANNED_ERROR;
