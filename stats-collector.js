let url = require('url');
let socketClusterClient = require('socketcluster-client');

let trailingPortNumberRegex = /:[0-9]+$/;

function StatsCollector(sccInstanceClusterDetailsList) {
  this.clients = [];
  this.sccInstanceClusterDetailsList = sccInstanceClusterDetailsList;

  let targets = this.sccInstanceClusterDetailsList
  .filter((instanceDetails) => {
    return instanceDetails.type === 'worker';
  });

  targets.forEach((instanceDetails) => {
    let clientOptions = {
      hostname: '127.0.0.1',
      port: instanceDetails.port,
      multiplex: false
    };
    let socket = socketClusterClient.create(clientOptions);
    socket.instanceName = instanceDetails.name;
    socket.on('error', (err) => {
      process.send({
        type: 'error',
        name: err.name,
        message: err.message
      });
    });
    this.clients.push(socket);
  });
}

StatsCollector.prototype.collectStats = function () {
  let collectStatsPromises = [];
  this.clients.forEach((socket) => {
    collectStatsPromises.push(
      new Promise((resolve, reject) => {
        socket.emit('getStats', null, (err, result) => {
          if (err) {
            reject(err);
            return;
          }
          resolve({
            instanceName: socket.instanceName,
            stats: result
          });
        });
      })
    );
  });
  return Promise.all(collectStatsPromises)
  .then((results) => {
    let stats = {};
    results.forEach((result) => {
      stats[result.instanceName] = result.stats;
    });
    return stats;
  });
};

StatsCollector.prototype.destroy = function () {
  this.clients.forEach((socket) => {
    socket.destroy();
  });
};

module.exports = StatsCollector;
