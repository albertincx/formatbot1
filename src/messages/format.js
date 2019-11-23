module.exports = {
  start: () => `Hi, send me any message which contains a links:

- From a channel/group by "Forward" a message links. 
- By a direct text message links to me.`,
  showIvMessage: (...args) => `${args[0]} [InstantView](${args[1]}) from [Source](${args[2]})`
};
