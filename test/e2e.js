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
  subscriberInstancePath: path.resolve(__dirname, '..', 'client-subscribers.js'),
  publisherInstancePath: path.resolve(__dirname, '..', 'client-publishers.js')
};

let instances = new InstanceManager(config);

before(async function () {
  await instances.destroyAllDockerInstances();
});

describe('Basic tests without instance failures', () => {
  afterEach(async function () {
    await instances.destroyAllDockerInstances();
    await instances.destroyAllNodeInstances();
  });

  describe.skip('Instances launch successfully', function () {
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
        assert.equal(isStateInstanceRunning, true);
        let isRegularInstanceRunning = await instances.isInstanceRunning(regularInstanceName);
        assert.equal(isRegularInstanceRunning, true);
        let isBrokerInstanceRunning = await instances.isInstanceRunning(brokerInstanceName);
        assert.equal(isBrokerInstanceRunning, true);
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
        assert.equal(isStateInstanceRunning, true);
        let isRegularInstance1Running = await instances.isInstanceRunning(regularInstanceName1);
        assert.equal(isRegularInstance1Running, true);
        let isBrokerInstance1Running = await instances.isInstanceRunning(brokerInstanceName1);
        assert.equal(isBrokerInstance1Running, true);
        let isRegularInstance2Running = await instances.isInstanceRunning(regularInstanceName2);
        assert.equal(isRegularInstance2Running, true);
        let isBrokerInstance2Running = await instances.isInstanceRunning(brokerInstanceName2);
        assert.equal(isBrokerInstance2Running, true);
      });
    });
  });

  describe('Pub/sub channel sync', function () {
    let instanceDetailList = [];
    let subscriberNodeInstance;
    let publisherNodeInstance;

    beforeEach(async function () {
      instanceDetailList = instances.generateSCCInstanceClusterDetailsList({
        regularInstanceCount: 2,
        brokerInstanceCount: 2,
        stateInstanceStartPort: 7777,
        regularInstanceStartPort: 8000,
        brokerInstanceStartPort: 8888
      });
      await instances.launchSCCInstanceCluster(instanceDetailList, 2000);
      subscriberNodeInstance = await instances.launchSubscriberNodeInstance('subscriber', {
        targetPort: 8000,
        clientCount: 100,
        uniqueChannelCount: 100,
        channelsPerClient: 1
      });
      // Wait for cluster to sync.
      await instances.waitForTimeout(10000);
      publisherNodeInstance = await instances.launchPublisherNodeInstance('publisher', {
        targetPort: 8001,
        clientCount: 10,
        uniqueChannelCount: 100,
        publishesPerClient: 10,
        publishInterval: 100,
        publishRandomness: 100
      });
      await instances.waitForTimeout(3000);
    });

    it('the number of messages received by subscribers should match the number of messages sent by publishers', function () {
      assert.equal(subscriberNodeInstance.receivedMessages.length, publisherNodeInstance.sentMessages.length);
    });
  });
});
