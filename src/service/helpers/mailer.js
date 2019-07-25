const nodemailer = require('nodemailer');
const {
  mailConf,
} = require('../../config/vars');

class Mailer {
  constructor(enabled = false) {
    this.enabled = enabled;
  }

  async send(message) {
    const mailOpts = {
      host: mailConf.host,
      port: mailConf.port,
      secure: true,
      auth: {
        user: mailConf.email,
        pass: mailConf.pass,
      },
      logger: false,
      debug: false, // include SMTP traffic in the logs
    };

    const enabled = this.enabled;
    // const enabled = true;
    if (enabled) {
      const transporter = nodemailer.createTransport(
        mailOpts,
        {
          from: `<${mailConf.email}>`,
          headers: {
            'X-Laziness-level': 1000, // just an example header, no need to use this
          },
        },
      );
      return await transporter.sendMail(message);
    }
  }
}

module.exports = Mailer;
