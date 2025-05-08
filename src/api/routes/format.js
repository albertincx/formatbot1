const url = require('url');
const {Markup} = require("telegraf");

const keyboards = require('../../keyboards/keyboards');
const messages = require('../../messages/format');
const rabbitMq = require('../../service/rabbitmq');

const {
    IS_PUPPET_DISABLED,
    NO_MQ,
    IV_CHAN_ID,
    IV_CHAN_MID,
    IV_CHAN_MID_2,
} = require('../../config/vars');

const db = require('../utils/db');
const {
    commandCheck,
    timeout,
    toUrl,
    isDateMoreADay,
} = require('../utils');
const {logger} = require('../utils/logger');
const puppet = require('../utils/puppet');
const {
    getAllLinks,
    getLinkFromEntity,
    getLink
} = require('../utils/links');
const {jobMessage} = require('../../service/jobMessage');
const {dbKeys} = require("../../config/consts");

global.lastIvTime = +new Date();

const validRegex = '^(https?:\\/\\/)?(www.)?(graph.org|telegra.ph|www.youtube.com\/watch)';

if (!NO_MQ) {
    rabbitMq.startFirst();
}

const PDF_LINK = 'https://pdf.pdf/pdf';
const privateChatId = process.env.PRIVATE_CHAIN_ID;
const PARTNER_ID = process.env.PARTNER_ID;
const PARTNER_URL = process.env.PARTNER_URL;
const privateUserId = +process.env.PRIVATE_USER_ID;

const support = async (ctx, botHelper) => {
    let system = JSON.stringify(ctx.message.from);
    const {
        chat: {id: chatId},
    } = ctx.message;

    try {
        if (!Number.isNaN(IV_CHAN_MID)) {
            botHelper
                .forwardMes(IV_CHAN_MID, IV_CHAN_ID * -1, chatId)
                .catch(() => {
                });
        }
        if (!Number.isNaN(IV_CHAN_MID_2)) {
            botHelper
                .forwardMes(IV_CHAN_MID_2, IV_CHAN_ID * -1, chatId)
                .catch(() => {
                });
        }
    } catch (e) {
        system = `${e}${system}`;
    }
    botHelper.sendAdmin(`support ${system}`);
};

const startOrHelp = (ctx, botHelper) => {
    if (ctx && ctx.message.text && ctx.message.text.match(/\/start\s(.*?)/)) {
        const cmd = ctx.message.text.match(/\/start\s(.*?)$/)[1];
        if (cmd === 'support') {
            support(ctx, botHelper);
            return;
        }
    }

    let system = JSON.stringify(ctx.message.from);
    try {
        ctx.reply(messages.start(), keyboards.start());
    } catch (e) {
        system = `${e}${system}`;
    }

    return botHelper.sendAdmin(system);
};

global.emptyTextCount = 0;

const format = (bot, botHelper, skipCountBool) => {
    bot.command(['start', 'help'], ctx => startOrHelp(ctx, botHelper));
    bot.hears('👋 Help', ctx => startOrHelp(ctx, botHelper));
    bot.hears('👍Support', ctx => support(ctx, botHelper));
    bot.command('support', ctx => support(ctx, botHelper));
    bot.hears('⌨️ Hide keyboard', ctx => {
        try {
            ctx.reply('Type /help to show.', keyboards.hide());
        } catch (e) {
            botHelper.sendError(e);
        }
    });

    bot.on('inline_query', async msg => {
        const {id, chat_type} = msg.update.inline_query;
        let {query} = msg.update.inline_query;
        let chatId = msg.from.id;
        let userId = chatId;

        if (privateUserId && privateUserId !== userId) {
            // console.log('privateUserId', userId);
            return;
        }

        if (privateChatId && chat_type === 'channel') {
            const hasAccess = await botHelper.checkAccess(privateChatId, userId);
            if (chatId < 0) return;

            if (!hasAccess && process.env.PRIVATE_CHAIN_INVITE_LINK) {
                return botHelper.botMes(
                    userId,
                    'You don\'t have access to this chat! Please subscribe to this chat! ' + process.env.PRIVATE_CHAIN_INVITE_LINK
                );
            }
        }

        query = query.trim();
        const links = getAllLinks(query);
        if (links.length === 0) {
            const res = {
                type: 'article',
                id,
                title: 'Links not found',
                cache_time: 0,
                is_personal: true,
                input_message_content: {message_text: 'Links not found'},
            };
            return msg.answerInlineQuery([res])
                .catch(() => {
                });
        }
        const ivObj = await db.getIV(links[0])
            .catch(() => false);
        if (ivObj && ivObj.iv) {
            return botHelper
                .sendInline({
                    messageId: id,
                    ivLink: ivObj.iv,
                })
                .catch(e => {
                    logger('sendInline');
                    logger(e);
                });
        }
        const exist = await db.getInline(links[0])
            .catch(() => false);
        const res = {
            type: 'article',
            id,
            title: 'Waiting for InstantView... Type \'Any symbol\' to check',
            input_message_content: {message_text: links[0]},
        };
        if (!exist) {
            rabbitMq.addToChannel({
                message_id: id,
                chatId: msg.from.id,
                link: links[0],
                inline: true,
            });
        }
        return msg
            .answerInlineQuery([res], {
                cache_time: 60,
                is_personal: true,
            })
            .catch(() => {
            });
    });

    const addToQueue = async ctx => {
        const {update} = ctx;
        let {message} = ctx;
        const isChannelPost = update && update.channel_post;
        if (
            message &&
            message.text &&
            message.text.match(/(createBroadcast|startBroadcast)/)
        ) {
            botHelper.startBroad(ctx)
            return;
        }
        let isChanMesId = false;
        if (isChannelPost) {
            message = update.channel_post;
        }

        const {
            reply_to_message: rplToMsg,
            caption_entities: cEntities,
            from,
        } =
        message || {};
        if (rplToMsg || message.audio) {
            // if (message.from && botHelper.isAdmin(message.from.id)) {
            //     botHelper.sendAdmin(rplToMsg.message_id, message.from.id);
            // }
            return;
        }
        let {entities} = message;

        const msg = message;
        if (isChannelPost) {
            isChanMesId = msg.message_id;
        }
        const {
            chat: {id: chatId},
            caption,
        } = msg;
        let userId = (from && from.id) || chatId;

        if (privateChatId && isChannelPost) {
            const hasAccess = await botHelper.checkAccess(privateChatId, userId);
            // console.log('hasAccess');
            // console.log(hasAccess);
            if (chatId < 0) return;

            if (!hasAccess && process.env.PRIVATE_CHAIN_INVITE_LINK) {
                return botHelper.botMes(
                    userId,
                    'You don\'t have access to this chat! Please subscribe to this chat! ' + process.env.PRIVATE_CHAIN_INVITE_LINK
                );
            }
        }
        if (privateUserId && privateUserId !== userId) return;

        let {text} = msg;

        const isAdm = botHelper.isAdmin(chatId);
        const rpl = rplToMsg;
        let pdfData = {};

        if (msg.document || (rpl && rpl.document)) {
            const {file_name, mime_type, file_id, file_size} = msg.document;
            if (!file_name) return;
            if (
                file_name.match(/.pdf$/) &&
                mime_type === 'application/pdf'
            ) {
                if (file_size < 4e6) {
                    const cnt = await db.get({
                        key: dbKeys.counter,
                        filter: {url: chatId, iv: 'pdf'},
                        project: 'af updatedAt'
                    });
                    if (cnt) {
                        const now = Date.now();
                        if (isDateMoreADay(cnt.updatedAt)) {
                            pdfData.pdfReset = 1;
                        } else {
                            if (cnt.af >= 10) {
                                console.log('exceeded pdf');
                                let hours = Math.floor((now - cnt.updatedAt) / 3_600_000);
                                if (isChannelPost) return;

                                return ctx.reply(
                                    'You have exceeded the maximum number of pdfs in 24 hours period, come back after ' + (24 - hours) + 'h'
                                ).catch(e => {
                                    // skip
                                });
                            }
                        }
                    }
                    pdfData.pdf = file_id;
                    pdfData.pdfTitle = file_name.replace(/[^a-z\s0-9]/gi, '').replace(/\s/g, '_');
                    text = PDF_LINK + encodeURI(file_name);
                } else {
                    console.log('big pdf');
                    if (isChannelPost) return;
                    return ctx.reply('You have exceeded the maximum size of pdf (4mb) ').catch(e => {
                        // skip
                    });
                }
            } else {
                return;
            }
        }

        if (caption) {
            text = caption;
            if (cEntities) {
                entities = cEntities;
            }
        }
        if (msg && text) {
            let links = getAllLinks(text);
            let link = links[0];
            if (!link && entities) {
                links = getLinkFromEntity(entities, text);
            }
            link = getLink(links);

            if (!link) {
                logger('no link');
                return;
            }

            let parsed;
            if (link) {
                link = toUrl(link);
            }
            try {
                parsed = new url.URL(link);
            } catch (e) {
                logger('exit wrong url');
                logger(e);
                return;
            }
            logger('parsed');
            logger(parsed.protocol);
            try {
                if (link.match(/^(https?:\/\/)?(www.)?google/)) {
                    const matchUrl = link.match(/url=(.*?)($|&)/);
                    if (matchUrl && matchUrl[1]) link = decodeURIComponent(matchUrl[1]);
                }

                if (link.match(new RegExp(validRegex))) {
                    ctx
                        .reply(messages.showIvMessage('', link, link, parsed.host), {
                            parse_mode: botHelper.markdown(),
                        })
                        .catch(e => {
                            logger('reply');
                            logger(e);
                            botHelper.sendError(e);
                        });
                    return;
                }
                if (link.match(/^((https?):\/\/)?(www\.)?(youtube|t)\.(com|me)\/?/)) {
                    logger('youtube exit');
                    return;
                }

                if (link.match(/yandex\.ru\/showcap/)) {
                    logger('yandex cap');
                    return;
                }

                // allow https only main page
                if (!parsed.pathname && !parsed.protocol.match('https')) {
                    logger('main no ssl');
                    return;
                }

                let mid;
                if (!botHelper.waitSec) {
                    if (PARTNER_ID && chatId > 0) {
                        const item = {url: chatId, iv: PARTNER_ID}
                        const cnt = await db.get({
                            key: dbKeys.counter,
                            filter: item,
                            project: 'af updatedAt'
                        });
                        if (!cnt || (cnt && isDateMoreADay(cnt.updatedAt))) {
                            let u = PARTNER_URL.replace('T=', chatId) + `&language=${from.language_code || 'en'}`;
                            const pad = await fetch(u)
                                .then(res => res.json())
                                // .then(res => res.result)
                                .catch(e => {
                                    console.log(`${e}`.substr(0,5));
                                });
                            // console.log(pad, u)
                            await db.updateOneLink(item, db.getCol(dbKeys.counter));
                            if (pad) {
                                ctx.replyWithPhoto(pad.image_url,
                                    {
                                        protect_content: true,
                                        caption: pad.text_html,
                                        parse_mode: 'html',
                                        ...Markup.inlineKeyboard([
                                            Markup.button.url(pad.button_name, pad.click_url),
                                        ])
                                    });
                            }
                        }
                    }

                    const res = await ctx.reply('Waiting for instantView...')
                        .catch((e) => {
                            logger('reply wait');
                            logger(e);
                            return {};
                        });

                    const messageId = res && res.message_id;
                    await timeout(0.1);
                    if (!messageId) {
                        logger('no MessageId exit');
                        return;
                    }
                    mid = messageId;
                }

                // const cnt = await db.get({
                //   key: dbKeys.counter,
                //   filter: {url: chatId, iv: 'iv'},
                //   project: 'af updatedAt'
                // });
                //
                // if (cnt && cnt.af >= 10) {
                //   console.log('exceeded pdf');
                //   return;
                // }

                const task = {
                    message_id: mid,
                    chatId,
                    link,
                    isChanMesId,
                    ...pdfData,
                };

                if (from) task.fromId = from.id;

                const force = (isAdm || (task.fromId && botHelper.isAdmin(task.fromId))) && commandCheck(text);
                if (force) task.force = force;

                let newIvTime = +new Date();
                newIvTime = (newIvTime - global.lastIvTime) / 1000;
                if (newIvTime > 3600) {
                    global.lastIvTime = +new Date();
                    botHelper.sendAdmin(`alert ${newIvTime} sec`);
                }
                if (from) {
                    task.fromId = from.id;
                }

                if (NO_MQ) {
                    console.log('cloud massaging is disabled');
                    return jobMessage(task);
                }
                rabbitMq.addToChannel(task);
            } catch (e) {
                logger('send error');
                logger(e);
            }
        }
    };

    // bot.use(ctx =>
    //     addToQueue(ctx)
    //         .catch(e =>
    //             botHelper.sendError(`tg err1: ${JSON.stringify(e)}`),
    //         ),
    // );

    bot.on('channel_post', ctx =>
        addToQueue(ctx)
            .catch(e => {
                console.log(e);
                botHelper.sendError(`tg err1: ${JSON.stringify(e)}`)
            }),
    );

    bot.hears(/.*/, ctx =>
        addToQueue(ctx)
            .catch(e => {
                console.log(e);
                botHelper.sendError(`tg err2: ${JSON.stringify(e)}`)
            }),
    );

    bot.on('message', ctx =>
        addToQueue(ctx)
            .catch(e => {
                console.log(e);
                botHelper.sendError(`tg err3: ${JSON.stringify(e)}`)
            }),
    );

    let browserWs = null;
    if (!botHelper.config.no_puppet && !IS_PUPPET_DISABLED) {
        puppet.getBrowser()
            .then(ws => {
                browserWs = ws;
            });
    }

    try {
        rabbitMq.runMqChannels(jobMessage(botHelper, browserWs, skipCountBool));
    } catch (e) {
        botHelper.sendError(e);
    }
};

module.exports = format;
