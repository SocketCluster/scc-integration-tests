let path = require('path');

module.exports = {
  state: {
    imageName: 'socketcluster/agc-state',
    versionTag: 'v6.0.0',
    internalContainerPort: 7777
  },
  worker: {
    imageName: 'socketcluster/asyngular',
    versionTag: 'v6.1.0',
    internalContainerPort: 8000
  },
  broker: {
    imageName: 'socketcluster/agc-broker',
    versionTag: 'v6.0.0',
    internalContainerPort: 8888
  },
  subscriberInstancePath: path.resolve(__dirname, 'client-subscribers.js'),
  publisherInstancePath: path.resolve(__dirname, 'client-publishers.js'),
  indirectPublisherInstancePath: path.resolve(__dirname, 'client-indirect-publishers.js')
};
