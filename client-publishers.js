let socketClusterClient = require('socketcluster-client');
let argv = require('minimist')(process.argv.slice(2));

let options = JSON.parse(argv.options || '{}');

let clientOptions = {
  port: options.targetPort || 8000,
  hostname: options.targetHost || '127.0.0.1'
};

let clientCount = options.clientCount || 1;
let publishInterval = options.publishInterval || 500;
let publishRandomness = options.publishRandomness || 500;
let uniqueChannelCount = options.uniqueChannelCount || 100;
let publishesPerClient = options.publishesPerClient || 10;

let channelNames = [];

for (let i = 0; i < uniqueChannelCount; i++) {
  channelNames.push(`testChannel${i}`);
}

let c = 0;

for (let i = 0; i < clientCount; i++) {
  let intervalRandomness = Math.random() * publishRandomness;
  let socket = socketClusterClient.create(clientOptions);

  (async () => {
    for await (let {error} of socket.listener('error')) {
      process.send({
        type: 'error',
        name: error.name,
        message: error.message
      });
    }
  })();

  let packet = {
    message: `This is socket ${i}`
  };
  socket.publishCount = 0;
  socket.publishInterval = setInterval(() => {
    let targetChannelName = channelNames[c++ % uniqueChannelCount];

    (async () => {
      try {
        await socket.invokePublish(targetChannelName, packet);
      } catch (error) {
        process.send({
          type: 'failedToSend',
          socketId: socket.id,
          channel: targetChannelName,
          data: packet
        });

        return;
      }
      process.send({
        type: 'sent',
        socketId: socket.id,
        channel: targetChannelName,
        data: packet
      });
    })();

    if (++socket.publishCount >= publishesPerClient) {
      clearInterval(socket.publishInterval);
    }
  }, publishInterval + intervalRandomness);
}
process.send({
  type: 'ready'
});
