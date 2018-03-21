let assert = require('assert');
let InstanceManager = require('../instance-manager');
let config = require('../config');

let instances = new InstanceManager(config);

before(async function () {
  await instances.destroyAllDockerInstances();
});

describe('Unstable network, pub/sub sync', () => {
  afterEach(async function () {
    await instances.destroyAllDockerInstances();
    await instances.destroyAllNodeInstances();
  });

  describe('Pub/sub channels sync after multiple broker crashes', function () {
    let instanceDetailsList = [];
    let subscriberNodeInstance;
    let publisherNodeInstance;

    beforeEach(async function () {
      instanceDetailsList = instances.generateSCCInstanceClusterDetailsList({
        regularInstanceCount: 2,
        brokerInstanceCount: 3,
        stateInstanceStartPort: 7777,
        regularInstanceStartPort: 8000,
        brokerInstanceStartPort: 8888
      });
      await instances.launchSCCInstanceCluster(instanceDetailsList, 2000);
      subscriberNodeInstance = await instances.launchSubscriberNodeInstance('subscriber', {
        targetPort: 8000,
        clientCount: 100,
        uniqueChannelCount: 100,
        channelsPerClient: 1
      });
      await instances.waitForTimeout(5000);
      let brokerInstanceDetailsList = instanceDetailsList.filter((instanceDetails) => {
        return instanceDetails.type === 'broker';
      });
      instances.stopSCCInstance(brokerInstanceDetailsList[0].name);
      instances.stopSCCInstance(brokerInstanceDetailsList[1].name);
      // Wait for cluster to sync.
      await instances.waitForTimeout(1500);
      publisherNodeInstance = await instances.launchPublisherNodeInstance('publisher', {
        targetPort: 8001,
        clientCount: 10,
        uniqueChannelCount: 100,
        publishesPerClient: 10,
        publishInterval: 100,
        publishRandomness: 100
      });
      await instances.waitForTimeout(5000);
    });

    it('messages that are published on one SC instance should reach subscribers on a different SC instance in the cluster', function () {
      assert.equal(publisherNodeInstance.failedToSendMessages.length, 0);
      assert.equal(subscriberNodeInstance.receivedMessages.length, publisherNodeInstance.sentMessages.length);
      assert.equal(subscriberNodeInstance.receivedMessages.length, 100);
    });
  });

  describe('Pub/sub channels sync if brokers crash soon after launch', function () {
    let instanceDetailsList = [];
    let subscriberNodeInstance;
    let publisherNodeInstance;

    beforeEach(async function () {
      instanceDetailsList = instances.generateSCCInstanceClusterDetailsList({
        regularInstanceCount: 2,
        brokerInstanceCount: 3,
        stateInstanceStartPort: 7777,
        regularInstanceStartPort: 8000,
        brokerInstanceStartPort: 8888
      });
      await instances.launchSCCInstanceCluster(instanceDetailsList, 0);
      subscriberNodeInstance = await instances.launchSubscriberNodeInstance('subscriber', {
        targetPort: 8000,
        clientCount: 100,
        uniqueChannelCount: 100,
        channelsPerClient: 1
      });
      await instances.waitForTimeout(1000);
      let brokerInstanceDetailsList = instanceDetailsList.filter((instanceDetails) => {
        return instanceDetails.type === 'broker';
      });
      instances.stopSCCInstance(brokerInstanceDetailsList[0].name);
      instances.stopSCCInstance(brokerInstanceDetailsList[1].name);
      // Wait for cluster to sync.
      await instances.waitForTimeout(1500);
      publisherNodeInstance = await instances.launchPublisherNodeInstance('publisher', {
        targetPort: 8001,
        clientCount: 10,
        uniqueChannelCount: 100,
        publishesPerClient: 10,
        publishInterval: 100,
        publishRandomness: 100
      });
      await instances.waitForTimeout(5000);
    });

    it('messages that are published on one SC instance should reach subscribers on a different SC instance in the cluster', function () {
      assert.equal(publisherNodeInstance.failedToSendMessages.length, 0);
      assert.equal(subscriberNodeInstance.receivedMessages.length, publisherNodeInstance.sentMessages.length);
      assert.equal(subscriberNodeInstance.receivedMessages.length, 100);
    });
  });
});
