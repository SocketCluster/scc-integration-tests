let path = require('path');

module.exports = {
  state: {
    imageName: 'socketcluster/scc-state',
    versionTag: 'v2.0.0',
    internalContainerPort: 7777
  },
  regular: {
    imageName: 'socketcluster/socketcluster',
    versionTag: 'v11.0.0',
    internalContainerPort: 8000
  },
  broker: {
    imageName: 'socketcluster/scc-broker',
    versionTag: 'v2.0.0',
    internalContainerPort: 8888
  },
  subscriberInstancePath: path.resolve(__dirname, 'client-subscribers.js'),
  publisherInstancePath: path.resolve(__dirname, 'client-publishers.js')
};
