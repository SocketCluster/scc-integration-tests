let socketClusterClient = require('socketcluster-client');
let argv = require('minimist')(process.argv.slice(2));

let options = JSON.parse(argv.options);

let clientOptions = {
  port: options.targetPort || 8000,
  hostname: options.targetHost || '127.0.0.1',
  multiplex: false
};

let clientCount = options.clientCount || 1;
let publishInterval = options.publishInterval || 500;
let publishRandomness = options.publishRandomness || 500;
let channelCount = options.channelCount || 100;

let channelNames = [];

for (let i = 0; i < channelCount; i++) {
  channelNames.push(`someChannel${i}`);
}

for (let i = 0; i < clientCount; i++) {
  let intervalRandomness = Math.random() * publishRandomness;
  let socket = socketClusterClient.create(clientOptions);
  let targetChannel = channelNames[i % channelCount];
  let packet = {
    message: `This is socket ${i}`
  };
  socket.publishInterval = setInterval(() => {
    socket.publish(targetChannel, packet);
  }, publishInterval + intervalRandomness);
}
console.log('ready');
