This bot makes instant view from channel post that have not IV

You can find this bot by keywords such as “InstantViewBot”
## [![Patreon](https://c5.patreon.com/external/logo/become_a_patron_button.png)](https://www.patreon.com/bePatron?u=26037444)
## Features

- [x] Extract link from amp,clck,bit.ly
- [x] Create IW from any full link
- [x] Compress Content
- [x] Partially support too long content
- [x] Second "process queue"
- [x] Text/Html/MD Document from storage
- [ ] Better parse images
- [ ] Multi links

## 🔨 Installation
**Required env:**
- DEV           = 1 show logging
- TBTKN         = bot token
- TGGROUP       = group for logs
- TGADMIN       = admin telegram id
- TGPHTOKEN     = Telegra.ph token
- MESSAGE_QUEUE = rabbitmq message queue connection, thanks [cloudamqp.com](https://cloudamqp.com)
- MONGO_URI     = mongodb connetcion uri, thanks [cloud.mongodb.com](https://cloud.mongodb.com) 

**dev:**

```
bash dev-install.txt
npm install
npm run dev
```
Wiki [Instruction to run](https://github.com/albertincx/formatbot1/wiki/How-to-RUN)
