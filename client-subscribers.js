let socketClusterClient = require('socketcluster-client');
let argv = require('minimist')(process.argv.slice(2));

let options = JSON.parse(argv.options);

let clientOptions = {
  port: options.targetPort || 8000,
  hostname: options.targetHost || '127.0.0.1',
  multiplex: false
};

let clientCount = options.clientCount || 1;
let channelCount = options.channelCount || 100;
let channelsPerClient = options.channelsPerClient || 1;

let channelNames = [];

for (let i = 0; i < channelCount; i++) {
  channelNames.push(`someChannel${i}`);
}

let pendingSubscriptionPromises = [];
let c = 0;

for (let i = 0; i < clientCount; i++) {
  let socket = socketClusterClient.create(clientOptions);
  for (let j = 0; j < channelsPerClient; j++) {
    let targetChannelName = channelNames[c % channelCount];
    let channel = socket.subscribe(targetChannelName);
    pendingSubscriptionPromises.push(
      new Promise((resolve) => {
        channel.once('subscribe', () => {
          resolve();
        });
      });
    );
    channel.watch((data) => {
      console.log('received:', data);
    });
    c++;
  }
}

await Promise.all(pendingSubscriptionPromises);
console.log('ready');
