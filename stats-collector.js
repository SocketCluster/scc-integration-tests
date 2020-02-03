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
      port: instanceDetails.port
    };
    let socket = socketClusterClient.create(clientOptions);
    socket.instanceName = instanceDetails.name;

    (async () => {
      for await (let {error} of socket.listener('error')) {
        console.error(error);
      }
    })();

    this.clients.push(socket);
  });
}

StatsCollector.prototype.collectStats = function () {
  let collectStatsPromises = [];
  this.clients.forEach((socket) => {
    collectStatsPromises.push(
      (async () => {
        let stats = await socket.invoke('getStats');
        return {
          instanceName: socket.instanceName,
          stats
        };
      })()
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
    socket.disconnect();
  });
};

module.exports = StatsCollector;
