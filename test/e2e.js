let assert = require('assert');
let path = require('path');
let InstanceManager = require('../instance-manager');

const config = {
  state: {
    imageName: 'socketcluster/scc-state',
    versionTag: 'v1.7.1',
    internalContainerPort: 7777
  },
  regular: {
    imageName: 'socketcluster/socketcluster',
    versionTag: 'v10.1.2',
    internalContainerPort: 8000
  },
  broker: {
    imageName: 'socketcluster/scc-broker',
    versionTag: 'v1.6.3',
    internalContainerPort: 8888
  },
  subscriberInstancePath: path.join(__dirname, 'client-subscribers.js'),
  publisherInstancePath: path.join(__dirname, 'client-publishers.js')
};

let instances = new InstanceManager(config);

before(async function () {
  await instances.destroyAllDockerInstances();
});

describe('Basic tests', () => {
  afterEach(async function () {
    await instances.destroyAllDockerInstances();
  });

  describe('Instances launch successfully', function () {
    describe('One of each type', function () {
      let stateInstanceName;
      let regularInstanceName;
      let brokerInstanceName;

      beforeEach(async function () {
        stateInstanceName = instances.generateRandomSCCInstanceName('state');
        regularInstanceName = instances.generateRandomSCCInstanceName('regular');
        brokerInstanceName = instances.generateRandomSCCInstanceName('broker');

        await Promise.all([
          instances.launchSCCInstance('state', 7777, stateInstanceName),
          instances.launchSCCInstance('regular', 8000, regularInstanceName),
          instances.launchSCCInstance('broker', 8888, brokerInstanceName)
        ]);
      });

      it('should run all instances successfully', async function () {
        let isStateInstanceRunning = await instances.isInstanceRunning(stateInstanceName);
        assert(isStateInstanceRunning, true);
        let isRegularInstanceRunning = await instances.isInstanceRunning(regularInstanceName);
        assert(isRegularInstanceRunning, true);
        let isBrokerInstanceRunning = await instances.isInstanceRunning(brokerInstanceName);
        assert(isBrokerInstanceRunning, true);
      });
    });

    describe('Multiple of each type', function () {
      let stateInstanceName;
      let regularInstanceName1;
      let regularInstanceName2;
      let brokerInstanceName1;
      let brokerInstanceName2;

      beforeEach(async function () {
        stateInstanceName = instances.generateRandomSCCInstanceName('state');
        regularInstanceName1 = instances.generateRandomSCCInstanceName('regular');
        brokerInstanceName1 = instances.generateRandomSCCInstanceName('broker');
        regularInstanceName2 = instances.generateRandomSCCInstanceName('regular');
        brokerInstanceName2 = instances.generateRandomSCCInstanceName('broker');

        await Promise.all([
          instances.launchSCCInstance('state', 7777, stateInstanceName),
          instances.launchSCCInstance('regular', 8000, regularInstanceName1),
          instances.launchSCCInstance('broker', 8888, brokerInstanceName1),
          instances.launchSCCInstance('regular', 8001, regularInstanceName2),
          instances.launchSCCInstance('broker', 8889, brokerInstanceName2)
        ]);
      });

      it('should run all instances successfully', async function () {
        let isStateInstanceRunning = await instances.isInstanceRunning(stateInstanceName);
        assert(isStateInstanceRunning, true);
        let isRegularInstance1Running = await instances.isInstanceRunning(regularInstanceName1);
        assert(isRegularInstance1Running, true);
        let isBrokerInstance1Running = await instances.isInstanceRunning(brokerInstanceName1);
        assert(isBrokerInstance1Running, true);
        let isRegularInstance2Running = await instances.isInstanceRunning(regularInstanceName2);
        assert(isRegularInstance2Running, true);
        let isBrokerInstance2Running = await instances.isInstanceRunning(brokerInstanceName2);
        assert(isBrokerInstance2Running, true);
      });
    });
  });
});
