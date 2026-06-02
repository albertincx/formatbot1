const co = require('co');

const cBroad = '/createBroadcast';
const sBroad = '/startBroadcast';

let log = false;
const logger = (r) => log && console.log(r);

const processRows = async (cc, limit = 25, timeout, cb) => {
    if (!cb) return;

    let items = [];
    await co(function* () {
        for (let doc = yield cc.next(); doc != null; doc = yield cc.next()) {
            const item = doc.toObject();
            if (items.length === limit) {
                try {
                    yield cb(items);
                } catch (e) {
                    console.log(e);
                }
                items = [];
                if (timeout) {
                    yield new Promise(resolve => setTimeout(() => resolve(), timeout));
                }
            }
            items.push(item);
        }
    });

    if (items.length) {
        try {
            await cb(items);
        } catch (e) {
            console.log(e);
        }
    }
};

const getCmdParams = txt => {
    let params = txt.match(/r_c_id_([0-9_-]+)/);
    if (params && params[1]) {
        params = params[1].split('_');
        params = params.map(Number);
    }

    return params || [];
};

const createBroadcast = async (ctx, txt, botHelper) => {
    const [cId] = getCmdParams(txt);
    if (!cId) return ctx.reply('broad err no id');

    const connSecond = botHelper.conn;

    const messages = connSecond.model('broadcasts', botHelper.schema);

    const users = connSecond.model('users', botHelper.schema);
    let filter = {id: 1};

    const cursor = users.find(filter).cursor();

    let updates = [], document;
    const ids = [
        36058859,
    ]
    for (let i = 0; i < ids.length; i++) {
        updates.push({
            insertOne: {
                document: {
                    uid: ids[i],
                    cId
                }
            },
        });
    }
    while ((document = await cursor.next())) {
        const {id} = document.toObject();
        updates.push({
            insertOne: {
                document: {
                    uid: id,
                    cId
                }
            },
        });

        if (updates.length % 1000 === 0) {
            console.log(`updates added ${updates.length}`);
            await messages.bulkWrite(updates, {ordered: false}).catch(e => console.log(e));
            updates = [];
        }
    }

    if (updates.length) {
        console.log(`updates added ${updates.length}`);
        await messages.bulkWrite(updates, {ordered: false}).catch(e => console.log(e));
    }

    const updFilter = {
        cId,
        sent: {$exists: false}
    };
    const cnt = await messages.countDocuments(updFilter);
    ctx.reply(`broad ${cId} created: ${cnt}`);

    return connSecond.close();
};

const startBroadcast = async (ctx, txtParam, botHelper) => {
    let [cId, mId, fromId, isChannel] = getCmdParams(txtParam);
    if (!cId) {
        return ctx.reply('broad err no id');
    }
    let preMessage = botHelper.getMidMessage(mId);
    const result = {
        err: 0,
        success: 0,
    };

    const connSend = botHelper.connSend;

    const messages = connSend.model('broadcasts', botHelper.schema);
    cId = String(cId)
    const filter = {
        sent: {$exists: false},
        cId,
    };

    const cursor = messages.find(filter)
        .limit(800)
        .cursor();
    // console.log(cursor.count)
    let breakProcess = false;

    await processRows(cursor, 5, 500, async items => {
        if (breakProcess) {
            return;
        }
        const success = [];
        try {
            for (let itemIdx = 0; itemIdx < items.length; itemIdx += 1) {
                if (breakProcess) break;

                const {
                    _id,
                    uid: id
                } = items[itemIdx];

                const runCmd = () => botHelper.forwardMes(mId, fromId * (isChannel ? -1 : 1), id);
                const preCmd = !preMessage ? false : (() => botHelper.sendAdmin(preMessage, id));

                try {
                    if (preCmd) {
                        logger('run preCmd');
                        await preCmd();
                    }
                    logger('runCmd');
                    await runCmd();

                    success.push({
                        updateOne: {
                            filter: {_id},
                            update: {sent: true},
                        },
                    });
                    result.success += 1;
                } catch (e) {
                    logger(e);
                    if (e.code !== 'ETIMEDOUT') {
                        if (e.code === 429) {
                            breakProcess = JSON.stringify(e);
                        }
                        result.err += 1;
                        success.push({
                            updateOne: {
                                filter: {_id},
                                update: {
                                    sent: true,
                                    error: JSON.stringify(e),
                                    code: e.code,
                                },
                            },
                        });
                    }
                }
            }
        } catch (e) {
            logger(e);
            if (e.code === 429) {
                if (e.response.parameters) {
                    // logger(e.response.parameters.retry_after);
                }
                breakProcess = JSON.stringify(e);
            }
        }
        if (success.length) {
            await messages.bulkWrite(success);
        }
    });

    const resulStr = `${JSON.stringify(result)}`;
    const cntSent = await messages.countDocuments({
        cId,
        sent: true
    });
    const cntTotal = await messages.countDocuments({cId});

    let log = `${cntTotal}/${cntSent}`;

    if (cntTotal === cntSent) {
        const cntActive = await messages.countDocuments({
            cId,
            error: {$exists: false}
        });

        log += `/${cntActive}`;
        botHelper.toggleConfig({
            text: 'broadcast',
            chat: ctx.message.chat
        }, false);
    }
    await connSend.close();

    try {
        return ctx.reply(`broad completed: ${resulStr} with ${breakProcess || ''} ${log}`);
    } catch (e) {
        // logger(e);
    }
};

const broadCustom = async (ctx, txt, botHelper) => {
    const connSecond = botHelper.conn;
    const connSend = botHelper.connSend;
    if (!connSecond || !connSend) {
        return ctx.reply('Ошибка: нет подключения к БД в botHelper');
    }
    try {
        const args = txt.replace(/^\/broad_custom\s+/i, '').trim().split(/\s+/);
        if (args.length < 3) {
            return ctx.reply('Использование:\nРассылка текста:\n/broad_custom <campaign_id> <limit> text:<текст>\n\nРассылка сообщения канала:\n/broad_custom <campaign_id> <limit> chan:<message_id>:<channel_id>\n\nРассылка по ссылке на канал:\n/broad_custom <campaign_id> <limit> chanlink:<t.me_link>');
        }

        const cId = args[0];
        const limit = parseInt(args[1], 10) || 800;
        const typeAndContent = args.slice(2).join(' ');

        let mode = ''; // 'text' or 'chan'
        let content = ''; // text string or { mId, fromId }

        if (typeAndContent.startsWith('text:')) {
            mode = 'text';
            content = typeAndContent.substring(5);
        } else if (typeAndContent.startsWith('chan:')) {
            mode = 'chan';
            const parts = typeAndContent.substring(5).split(':');
            if (parts.length < 2) {
                return ctx.reply('Ошибка: неверный формат chan:<message_id>:<channel_id>');
            }
            content = {
                mId: parseInt(parts[0], 10),
                fromId: parseInt(parts[1], 10)
            };
        } else if (typeAndContent.startsWith('chanlink:')) {
            mode = 'chan';
            const urlPart = typeAndContent.substring(9).trim();

            // Private channel link regex: https://t.me/c/2170558032/6
            const privateMatch = urlPart.match(/t\.me\/c\/(\d+)\/(\d+)/i);

            // Public channel link regex: https://t.me/username/6
            const publicMatch = urlPart.match(/t\.me\/([a-zA-Z0-9_]{5,})\/(\d+)/i);

            if (privateMatch) {
                const rawChanId = privateMatch[1];
                const rawMsgId = privateMatch[2];
                content = {
                    mId: parseInt(rawMsgId, 10),
                    fromId: parseInt(`-100${rawChanId}`, 10)
                };
            } else if (publicMatch) {
                const username = publicMatch[1];
                const rawMsgId = publicMatch[2];
                content = {
                    mId: parseInt(rawMsgId, 10),
                    fromId: `@${username}`
                };
            } else {
                return ctx.reply('Ошибка: Неверный формат ссылки в chanlink. Должен быть вида https://t.me/c/123/456 или https://t.me/username/456');
            }
        } else {
            return ctx.reply('Ошибка: формат должен начинаться с text:, chan: или chanlink:');
        }

        ctx.reply(`Начинаем подготовку кампании ${cId} (лимит отправки ${limit})...`);

        const messages = connSend.model('broadcasts', botHelper.schema);

        let users;
        try {
            users = connSecond.model('users', botHelper.schema);
        } catch (e) {
            users = connSecond.model('users');
        }

        // 1. Populate broadcasts collection with users
        let start = cId.match(/^_/)
        let start10 = cId.match(/^_10_/)
        if (start10) start = false

        let filter = start ? {username: 'safiullin'} : { blocked: { $ne: true } }

        const cursor = users.find(filter).limit(start10 ? 10 : 0).cursor();
        let updates = [];
        let document;

        while ((document = await cursor.next())) {
            const {id} = document.toObject();
            if (!id) continue;
            updates.push({
                insertOne: {
                    document: {
                        uid: id,
                        cId,
                        mode,
                        content
                    }
                },
            });

            if (updates.length % 1000 === 0) {
                await messages.bulkWrite(updates, {ordered: false}).catch(e => console.log(e));
                updates = [];
            }
        }

        if (updates.length) {
            await messages.bulkWrite(updates, {ordered: false}).catch(e => console.log(e));
        }

        const campaignCount = await messages.countDocuments({cId, sent: {$exists: false}});

        if (start) {
            ctx.reply(`Кампания ${cId} создана. Получателей: ${campaignCount}. Запуск рассылки...`);
            // 2. Sending Phase (run campaign)
            const result = {success: 0, err: 0};
            const sendFilter = {cId, sent: {$exists: false}};
            const sendCursor = messages.find(sendFilter).limit(limit).cursor();

            let breakProcess = false;
            const chunkSize = Math.min(limit, 5);
            const blockedUserIds = [];

            await processRows(sendCursor, chunkSize, 500, async items => {
                if (breakProcess) return;
                const bulkOps = [];
                for (const item of items) {
                    const {_id, uid: id} = item;

                    try {
                        if (mode === 'text') {
                            await botHelper.botMes(id, content, true);
                        } else {
                            await botHelper.forwardMes(content.mId, content.fromId, id);
                        }

                        bulkOps.push({
                            updateOne: {
                                filter: {_id},
                                update: {sent: true}
                            }
                        });
                        result.success += 1;
                    } catch (e) {
                        console.log(e);
                        if (e.code === 429) {
                            breakProcess = JSON.stringify(e);
                        }
                        if (e.code === 403 || (e.response && e.response.error_code === 403)) {
                            blockedUserIds.push(id);
                        }
                        result.err += 1;
                        bulkOps.push({
                            updateOne: {
                                filter: {_id},
                                update: {
                                    sent: true,
                                    error: JSON.stringify(e),
                                    code: e.code
                                }
                            }
                        });
                    }
                }

                if (bulkOps.length) {
                    await messages.bulkWrite(bulkOps);
                }
            });

            // Auto-Soft-Block users who blocked the bot
            if (blockedUserIds.length > 0) {
                try {
                    const usersModel = connSecond.model('users', botHelper.schema);
                    await usersModel.updateMany(
                        { $or: [{ id: { $in: blockedUserIds } }, { uid: { $in: blockedUserIds } }] },
                        { $set: { blocked: true } }
                    );
                    console.log(`[SOFT BLOCK] Bulk marked ${blockedUserIds.length} users as blocked.`);
                } catch (e) {
                    console.error('Failed to bulk mark users as blocked in broadCustom:', e);
                }
            }

            const successCount = await messages.countDocuments({cId, sent: true});
            let responseMsg = `Рассылка ${cId} завершена!\nУспешно: ${result.success}\nОшибок: ${result.err}\nВсего отправлено: ${successCount}`;
            if (breakProcess) {
                responseMsg += `\n⚠️ Процесс был приостановлен из-за превышения лимитов (429): ${breakProcess}`;
            }
            return ctx.reply(responseMsg);
        } else {
            ctx.reply(`Кампания ${cId} создана. Получателей: ${campaignCount}.`);
        }
    } catch (err) {
        console.error('Error in broadCustom:', err);
        return ctx.reply(`Ошибка рассылки: ${err.message || err}`);
    } finally {
        if (connSecond && typeof connSecond.close === 'function') {
            await connSecond.close().catch(e => console.error('Error closing connSecond:', e));
        }
        if (connSend && typeof connSend.close === 'function') {
            await connSend.close().catch(e => console.error('Error closing connSend:', e));
        }
    }
};

const broadStartCustom = async (ctx, txt, botHelper) => {
    const connSend = botHelper.connSend;
    if (!connSend) {
        return ctx.reply('Ошибка: нет подключения к БД в botHelper');
    }
    try {
        let cId;
        let limit = 800; // Default limit for total messages sent in one command run

        // Support underscore format: broad_start_custom_[campaign]_[limit] or /broad_start_custom_[campaign]_[limit]
        const underscoreMatch = txt.match(/^\/?broad_start_custom_([\s\S]+)_(\d+)$/i);
        const underscoreCidOnlyMatch = txt.match(/^\/?broad_start_custom_([\s\S]+)$/i);

        if (underscoreMatch) {
            cId = underscoreMatch[1];
            limit = parseInt(underscoreMatch[2], 10) || 800;
        } else if (underscoreCidOnlyMatch && !txt.includes(' ')) {
            cId = underscoreCidOnlyMatch[1];
        } else {
            // Space-separated format: /broad_start_custom <campaign_id> [limit]
            const args = txt.replace(/^\/?broad_start_custom\s+/i, '').trim().split(/\s+/);
            if (args.length < 1 || !args[0]) {
                return ctx.reply('Использование: /broad_start_custom <campaign_id> [limit]\nИли в формате: broad_start_custom_[campaign]_[limit]');
            }
            cId = args[0];
            limit = parseInt(args[1], 10) || 800;
        }

        ctx.reply(`Запуск отправки кампании ${cId} (лимит отправки ${limit})...`);

        const messages = connSend.model('broadcasts', botHelper.schema);

        // Find the first unsent document to determine the mode and content
        const sample = await messages.findOne({cId, sent: {$exists: false}});
        if (!sample) {
            // Maybe all are sent, let's check if the campaign even exists
            const total = await messages.countDocuments({cId});
            if (total === 0) {
                return ctx.reply(`Ошибка: кампания ${cId} не найдена в базе данных.`);
            }
            return ctx.reply(`Кампания ${cId} уже полностью отправлена (всего получателей: ${total}).`);
        }

        const mode = sample.get('mode') || 'text';
        const content = sample.get('content');

        if (!content) {
            return ctx.reply(`Ошибка: у кампании ${cId} отсутствует содержимое для отправки.`);
        }

        const campaignCount = await messages.countDocuments({cId, sent: {$exists: false}});
        ctx.reply(`Найдено неотправленных: ${campaignCount}. Запуск отправки...`);

        const result = {success: 0, err: 0};
        const sendFilter = {cId, sent: {$exists: false}};
        const sendCursor = messages.find(sendFilter).limit(limit).cursor();

        let breakProcess = false;
        const chunkSize = Math.min(limit, 5);
        const blockedUserIds = [];

        await processRows(sendCursor, chunkSize, 500, async items => {
            if (breakProcess) return;
            const bulkOps = [];
            for (const item of items) {
                const {_id, uid: id} = item;

                try {
                    if (mode === 'text') {
                        await botHelper.botMes(id, content, true);
                    } else {
                        await botHelper.forwardMes(content.mId, content.fromId, id);
                    }

                    bulkOps.push({
                        updateOne: {
                            filter: {_id},
                            update: {sent: true}
                        }
                    });
                    result.success += 1;
                } catch (e) {
                    console.log(e);
                    if (e.code === 429) {
                        breakProcess = JSON.stringify(e);
                    }
                    if (e.code === 403 || (e.response && e.response.error_code === 403)) {
                        blockedUserIds.push(id);
                    }
                    result.err += 1;
                    bulkOps.push({
                        updateOne: {
                            filter: {_id},
                            update: {
                                sent: true,
                                error: JSON.stringify(e),
                                code: e.code
                            }
                        }
                    });
                }
            }

            if (bulkOps.length) {
                await messages.bulkWrite(bulkOps);
            }
        });

        // Auto-Soft-Block users who blocked the bot
        if (blockedUserIds.length > 0) {
            try {
                const { MONGO_URI_SECOND } = require('../../config/vars');
                const { createConnection } = require('../../config/mongoose');
                const connSecond = createConnection(MONGO_URI_SECOND);
                if (connSecond) {
                    await new Promise((resolve, reject) => {
                        connSecond.once('open', resolve);
                        connSecond.once('error', reject);
                    }).catch(() => {});

                    const schema = botHelper.schema || require('../models/schema');
                    const usersModel = connSecond.model('users', schema);
                    await usersModel.updateMany(
                        { $or: [{ id: { $in: blockedUserIds } }, { uid: { $in: blockedUserIds } }] },
                        { $set: { blocked: true } }
                    );
                    console.log(`[SOFT BLOCK] Bulk marked ${blockedUserIds.length} users as blocked.`);
                    await connSecond.close();
                }
            } catch (e) {
                console.error('Failed to bulk mark users as blocked in broadStartCustom:', e);
            }
        }

        const successCount = await messages.countDocuments({cId, sent: true});
        let responseMsg = `Рассылка ${cId} завершена!\nУспешно: ${result.success}\nОшибок: ${result.err}\nВсего отправлено: ${successCount}`;
        if (breakProcess) {
            responseMsg += `\n⚠️ Процесс был приостановлен из-за превышения лимитов (429): ${breakProcess}`;
        }
        return ctx.reply(responseMsg);
    } catch (err) {
        console.error('Error in broadStartCustom:', err);
        return ctx.reply(`Ошибка запуска рассылки: ${err.message || err}`);
    } finally {
        if (connSend && typeof connSend.close === 'function') {
            await connSend.close().catch(e => console.error('Error closing connSend:', e));
        }
    }
};

const showCampaigns = async (ctx, botHelper) => {
    try {
        const connSend = botHelper.connSend;
        if (!connSend) {
            return ctx.reply('Ошибка: нет подключения к БД в botHelper');
        }

        const messages = connSend.model('broadcasts', botHelper.schema);

        const agg = [
            {
                $group: {
                    _id: "$cId",
                    total: {$sum: 1},
                    sent: {$sum: {$cond: [{$eq: ["$sent", true]}, 1, 0]}},
                    errors: {$sum: {$cond: [{$ifNull: ["$error", false]}, 1, 0]}}
                }
            },
            {
                $sort: {_id: -1}
            }
        ];

        const results = await messages.aggregate(agg);
        if (results.length === 0) {
            return ctx.reply('Очередь кампаний пуста.');
        }

        let response = '📋 *Список всех кампаний рассылки:*\n\n';
        results.forEach((r, idx) => {
            const pending = r.total - r.sent;
            response += `${idx + 1}. *Кампания:* \`${r._id || 'нет ID'}\`\n`;
            response += `• Всего получателей: ${r.total}\n`;
            response += `• Отправлено: ${r.sent}\n`;
            response += `• В очереди: ${pending}\n`;
            response += `• Ошибок: ${r.errors}\n\n`;
        });

        return ctx.replyWithMarkdown(response);
    } catch (err) {
        console.error('Error in showCampaigns:', err);
        return ctx.reply(`Ошибка получения списка кампаний: ${err.message || err}`);
    }
};

const clearCampaigns = async (ctx, botHelper) => {
    try {
        const connSend = botHelper.connSend;
        if (!connSend) {
            return ctx.reply('Ошибка: нет подключения к БД в botHelper');
        }

        const messages = connSend.model('broadcasts', botHelper.schema);
        const count = await messages.countDocuments();

        await messages.deleteMany({});
        return ctx.reply(`Очередь кампаний очищена! Удалено записей: ${count}`);
    } catch (err) {
        console.error('Error in clearCampaigns:', err);
        return ctx.reply(`Ошибка очистки очереди: ${err.message || err}`);
    }
};

const processBroadcast = async (txtParam, ctx, botHelper) => {
    let txt = txtParam;
    if (txt.startsWith('/broad_custom') || txt.startsWith('broad_custom')) {
        return broadCustom(ctx, txt, botHelper);
    }
    if (txt.startsWith('/broad_start_custom') || txt.startsWith('broad_start_custom')) {
        return broadStartCustom(ctx, txt, botHelper);
    }
    if (txt === '/showcids') {
        return showCampaigns(ctx, botHelper);
    }
    if (txt === '/clearbroadcasts') {
        return clearCampaigns(ctx, botHelper);
    }
    if (txt.match(cBroad)) {
        ctx.reply('broad new started');
        return createBroadcast(ctx, txt, botHelper);
    }
    if (txt.match(sBroad)) {
        txt = txt.replace(sBroad, '');
        ctx.reply('broad send started');
        if (botHelper.log) log = true;
        await startBroadcast(ctx, txt, botHelper);
    }
    return Promise.resolve();
};

const tgsend = (ctx, botHelper) => {
    const {
        chat: {id: chatId},
        text,
    } = ctx.message;
    if (!botHelper.isAdmin(chatId) || !text) {
        return Promise.resolve(true);
    }

    processBroadcast(text, ctx, botHelper);
};

module.exports = tgsend;
