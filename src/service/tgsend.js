const co = require('co');

let log = false;

const logger = (r) => log && console.log(r);

const BROAD_COLLECTION = process.env.BROAD_COLLECTION || 'broadcasts';
const USERS_COLLECTION = process.env.USERS_COLLECTION || 'users';

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

    const messages = connSecond.model(BROAD_COLLECTION, botHelper.schema);

    const users = connSecond.model(USERS_COLLECTION, botHelper.schema);
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

    const messages = connSend.model(BROAD_COLLECTION, botHelper.schema);
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

const showCampaigns = async (ctx, botHelper) => {
    try {
        const connSend = botHelper.connSend;
        if (!connSend) {
            return ctx.reply('Ошибка: нет подключения к БД в botHelper');
        }

        const messages = connSend.model(BROAD_COLLECTION, botHelper.schema);

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

        const messages = connSend.model(BROAD_COLLECTION, botHelper.schema);
        const count = await messages.countDocuments();

        await messages.deleteMany({});
        return ctx.reply(`Очередь кампаний очищена! Удалено записей: ${count}`);
    } catch (err) {
        console.error('Error in clearCampaigns:', err);
        return ctx.reply(`Ошибка очистки очереди: ${err.message || err}`);
    }
};

const getLastCampaign = async (ctx, botHelper) => {
    const connSend = botHelper.connSend;
    try {
        if (!connSend) {
            return ctx.reply('Ошибка: нет подключения к БД в botHelper');
        }

        const messages = connSend.model(BROAD_COLLECTION, botHelper.schema);
        const distinctCids = await messages.distinct('cId');

        const validCids = (distinctCids || []).filter(id => id !== null && id !== undefined && id !== '');
        if (validCids.length === 0) {
            return ctx.reply('Очередь кампаний пуста.');
        }

        const sortedCids = [...validCids].sort((a, b) => {
            const numA = Number(a);
            const numB = Number(b);
            if (!isNaN(numA) && !isNaN(numB)) {
                return numB - numA;
            }
            return String(b).localeCompare(String(a), undefined, {numeric: true});
        });

        const lastCid = sortedCids[0];

        const cIdVariants = [lastCid];
        if (typeof lastCid === 'string' && !isNaN(Number(lastCid))) {
            cIdVariants.push(Number(lastCid));
        } else if (typeof lastCid === 'number') {
            cIdVariants.push(String(lastCid));
        }

        const filter = {cId: {$in: cIdVariants}};

        const total = await messages.countDocuments(filter);
        const sent = await messages.countDocuments({...filter, sent: true});
        const pending = await messages.countDocuments({...filter, sent: {$exists: false}});
        const errors = await messages.countDocuments({...filter, error: {$exists: true, $ne: false}});

        let response = `📌 *Последний cId в базе:* \`${lastCid}\`\n\n`;
        response += `• Всего получателей: ${total}\n`;
        response += `• Отправлено: ${sent}\n`;
        response += `• В очереди: ${pending}\n`;
        if (errors > 0) {
            response += `• Ошибок: ${errors}\n`;
        }

        if (!isNaN(Number(lastCid))) {
            const nextCid = Number(lastCid) + 1;
            response += `\n💡 *Следующий cId:* \`${nextCid}\`\n`;
            response += `Команда: \`/createBroadcast_r_c_id_${nextCid}_0\``;
        }

        return ctx.replyWithMarkdown(response);
    } catch (err) {
        console.error('Error in getLastCampaign:', err);
        return ctx.reply(`Ошибка получения последнего cId: ${err.message || err}`);
    } finally {
        if (connSend && typeof connSend.close === 'function') {
            await connSend.close().catch(e => console.error('Error closing connSend:', e));
        }
    }
};

const processBroadcast = async (txtParam, ctx, botHelper) => {
    let txt = txtParam;

    if (txt === '/showcids') {
        return showCampaigns(ctx, botHelper);
    }
    if (txt === '/clearbroadcasts') {
        return clearCampaigns(ctx, botHelper);
    }
    const cleanCmd = txt ? txt.trim().split(/\s+/)[0].toLowerCase().split('@')[0] : '';
    if (cleanCmd === '/lastcid' || cleanCmd === '/last_cid' || cleanCmd === '/getlastcid') {
        return getLastCampaign(ctx, botHelper);
    }
    if (txt.match(/^\/?createBroadcast/i)) {
        ctx.reply('broad new started');
        return createBroadcast(ctx, txt, botHelper);
    }
    if (txt.match(/^\/?startBroadcast/i)) {
        txt = txt.replace(/^\/?startBroadcast(@[a-zA-Z0-9_]+)?/i, '').trim();
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
