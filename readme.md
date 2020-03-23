This bot makes instant view from channel post that have not IV

You can find this bot by keywords such as “InstantViewBot”

## Features

- [x] Extract link from amp,clck,bit.ly
- [x] Create IW from any full link
- [x] Compress Content
- [x] Partially support too long content
- [x] Second "process queue"
- [ ] Better parse images
- [ ] Multi links

## 🔨 Installation
**Required env:**
- DEV=1 show logging
- TBTKN=bot token
- TGGROUP=group for logs
- TGADMIN=admin telegram id
- TGPHTOKEN= Telegra.ph token
- MESSAGE_QUEUE=rabbitmq message queue connection, thanks [cloudamqp.com](https://cloudamqp.com)

**dev:**

```
bash dev-install.txt
npm install
npm run dev
```

