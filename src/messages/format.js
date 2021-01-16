module.exports = {
  start: () => `Hi, send me any message which contains a links:

- From a channel/group by "Forward" a message links.
- By a direct text message links to me.`,
  showIvMessage: (...args) =>
    `${args[3] || ''}${args[0]}[InstantView](${args[1]}) from [Source](${
      args[2]
    })`,
  broken: link =>
    `Sorry, but your [link](${link}) is broken, restricted, or content is empty`,
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
};
