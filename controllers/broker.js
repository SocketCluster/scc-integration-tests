var SCBroker = require('socketcluster/scbroker');
var scClusterBrokerClient = require('scc-broker-client');

class Broker extends SCBroker {
  run() {
    console.log('   >> Broker PID:', process.pid);

    // This is defined in server.js (taken from environment variable SC_CLUSTER_STATE_SERVER_HOST).
    // If this property is defined, the broker will try to attach itself to the SC cluster for
    // automatic horizontal scalability.
    // This is mostly intended for the Kubernetes deployment of SocketCluster - In this case,
    // The clustering/sharding all happens automatically.

    if (this.options.clusterStateServerHost) {
      var sccBrokerClient = scClusterBrokerClient.attach(this, {
        stateServerHost: this.options.clusterStateServerHost,
        stateServerPort: this.options.clusterStateServerPort,
        clientPoolSize: this.options.clusterClientPoolSize,
        mappingEngine: this.options.clusterMappingEngine,
        authKey: this.options.clusterAuthKey,
        stateServerConnectTimeout: this.options.clusterStateServerConnectTimeout,
        stateServerAckTimeout: this.options.clusterStateServerAckTimeout,
        stateServerReconnectRandomness: this.options.clusterStateServerReconnectRandomness
      });

      // ---- Start stats collection ----

      sccBrokerClient.on('subscribe', (data) => {
        this.sendToMaster({
          event: 'subscribe',
          data: data
        });
      });
      sccBrokerClient.on('subscribeFail', (data) => {
        this.sendToMaster({
          event: 'subscribeFail',
          data: data
        });
      });
      sccBrokerClient.on('publish', (data) => {
        this.sendToMaster({
          event: 'publish',
          data: data
        });
      });
      sccBrokerClient.on('publishFail', (data) => {
        this.sendToMaster({
          event: 'publishFail',
          data: data
        });
      });

      // ---- End stats collection ----
    }
  }
}

new Broker();
