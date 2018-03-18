let socketClusterClient = require('socketcluster-client');
let argv = require('minimist')(process.argv.slice(2));

let options = JSON.parse(argv.options || '{}');

let clientOptions = {
  port: options.targetPort || 8000,
  hostname: options.targetHost || '127.0.0.1',
  multiplex: false
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
  let socket = socketClusterClient.create(clientOptions);
  socket.on('error', (err) => {
    process.send({
      type: 'error',
      name: err.name,
      message: err.message
    });
  });
  for (let j = 0; j < channelsPerClient; j++) {
    let targetChannelName = channelNames[c++ % uniqueChannelCount];
    if (socket.isSubscribed(targetChannelName, true)) {
      continue;
    }
    let channel = socket.subscribe(targetChannelName);
    pendingSubscriptionPromises.push(
      new Promise((resolve) => {
        channel.once('subscribe', () => {
          resolve();
        });
      })
    );
    channel.watch((data) => {
      process.send({
        type: 'received',
        socketId: socket.id,
        channel: channel.name,
        data: data
      });
    });
  }
}

async function waitForSubscribersToBeReady() {
  await Promise.all(pendingSubscriptionPromises);
  process.send({
    type: 'ready'
  });
}

waitForSubscribersToBeReady();
