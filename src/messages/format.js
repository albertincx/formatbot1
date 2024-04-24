module.exports = {
  start: () => `Hi, send me any message which contains a links:

- From a channel/group by "Forward" a message links.
- By a direct text message links to me.`,
  showIvMessage: (long, InstantViewUrl, sourceLink) =>
    `${long ? `${long} ` : ''}from [source](${sourceLink})`,
  broken: (link, helpMessage) =>
    `Sorry, but your [link](${link}) is broken, restricted, or content is empty${
      helpMessage ? `\n${helpMessage}` : ''
    }`,
  brokenFile: reason => `Sorry, but your file invalid, reason: ${reason}`,
  timeOut: () =>
    'Process has been reset/server is not responding, please try again later',
  isLooksLikeFile: link => `It looks like a file [link](${link})`,
  resolved: () => 'This error resolved, please check link again',
  support: links => {
    let s = 'For support:';
    s += `${links.length ? `\n${links.join('\n\n')}` : ''}`;
    return s;
  },
  cleanCommands: links =>
    `${links.length ? `\n/cleardb3_${links.join('\n/cleardb3_')}` : ''}`,
  errorEnv: () =>
    'PLEASE CREATE .env file with params, for more info see .env.example',
  warningMQ: () => 'warn: env MESSAGE_QUEUE is NOT set',
  errorTasks: () => 'PLEASE ADD TASKS_DEV, TASKS2_DEV params in .env file',
};
