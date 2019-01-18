let asyngularClient = require('asyngular-client');
let argv = require('minimist')(process.argv.slice(2));

let options = JSON.parse(argv.options || '{}');

let clientOptions = {
  port: options.targetPort || 8000,
  hostname: options.targetHost || '127.0.0.1'
};

let clientCount = options.clientCount || 1;
let uniqueChannelCount = options.uniqueChannelCount || 100;
let channelsPerClient = options.channelsPerClient || 1;

let channelNames = [];

for (let i = 0; i < uniqueChannelCount; i++) {
  channelNames.push(`testChannel${i}`);
}

let pendingSubscriptionPromises = [];
let c = 0;

for (let i = 0; i < clientCount; i++) {
  let socket = asyngularClient.create(clientOptions);

  (async () => {
    for await (let {error} of socket.listener('error')) {
      process.send({
        type: 'error',
        name: error.name,
        message: error.message
      });
    }
  })();

  for (let j = 0; j < channelsPerClient; j++) {
    let targetChannelName = channelNames[c++ % uniqueChannelCount];
    if (socket.isSubscribed(targetChannelName, true)) {
      continue;
    }
    let channel = socket.subscribe(targetChannelName);
    pendingSubscriptionPromises.push(channel.listener('subscribe').once());

    (async () => {
      for await (let data of channel) {
        process.send({
          type: 'received',
          socketId: socket.id,
          channel: channel.name,
          data
        });
      }
    })();
  }
}

async function waitForSubscribersToBeReady() {
  await Promise.all(pendingSubscriptionPromises);
  process.send({
    type: 'ready'
  });
}

waitForSubscribersToBeReady();
