let assert = require('assert');
let InstanceManager = require('../instance-manager');
let config = require('../config');

let instances = new InstanceManager(config);

before(async function () {
  await instances.destroyAllDockerInstances();
});

describe('Stable network, pub/sub sync while scaling out', () => {
  afterEach(async function () {
    await instances.destroyAllDockerInstances();
    await instances.destroyAllNodeInstances();
  });

  describe('Pub/sub channels sync while adding new scc-broker instances at the same time', function () {
    let instanceDetailsList = [];
    let subscriberNodeInstance;
    let publisherNodeInstance;

    beforeEach(async function () {
      instanceDetailsList = instances.generateSCCInstanceClusterDetailsList({
        regularInstanceCount: 2,
        brokerInstanceCount: 1,
        stateInstanceStartPort: 7777,
        regularInstanceStartPort: 8000,
        brokerInstanceStartPort: 8888
      });
      let clusterInfo = await instances.launchSCCInstanceCluster(instanceDetailsList, 2000);
      subscriberNodeInstance = await instances.launchSubscriberNodeInstance('subscriber', {
        targetPort: 8000,
        clientCount: 100,
        uniqueChannelCount: 100,
        channelsPerClient: 1
      });
      // Wait for subscriptions to sync across the cluster.
      await instances.waitForTimeout(20000);
      publisherNodeInstance = await instances.launchPublisherNodeInstance('publisher', {
        targetPort: 8001,
        clientCount: 10,
        uniqueChannelCount: 100,
        publishesPerClient: 20,
        publishInterval: 500,
        publishRandomness: 500
      });
      await Promise.all([
        instances.launchSCCInstance('broker', 8890, instances.generateRandomSCCInstanceName('broker'), clusterInfo.stateInstanceIP),
        instances.launchSCCInstance('broker', 8891, instances.generateRandomSCCInstanceName('broker'), clusterInfo.stateInstanceIP)
      ]);
      await instances.waitForTimeout(30000);
    });

    it('messages that are published on one SC instance should reach subscribers on a different SC instance in the cluster', function () {
      assert.equal(publisherNodeInstance.failedToSendMessages.length, 0);
      assert.equal(subscriberNodeInstance.receivedMessages.length, publisherNodeInstance.sentMessages.length);
      assert.equal(subscriberNodeInstance.receivedMessages.length, 200);
    });
  });

  describe('Pub/sub channels stay in sync while adding new regular SC instances at the same time', function () {
    let instanceDetailsList = [];
    let subscriberNodeInstance;
    let publisherNodeInstance;

    beforeEach(async function () {
      instanceDetailsList = instances.generateSCCInstanceClusterDetailsList({
        regularInstanceCount: 2,
        brokerInstanceCount: 1,
        stateInstanceStartPort: 7777,
        regularInstanceStartPort: 8000,
        brokerInstanceStartPort: 8888
      });
      let clusterInfo = await instances.launchSCCInstanceCluster(instanceDetailsList, 2000);
      subscriberNodeInstance = await instances.launchSubscriberNodeInstance('subscriber', {
        targetPort: 8000,
        clientCount: 100,
        uniqueChannelCount: 100,
        channelsPerClient: 1
      });
      // Wait for subscriptions to sync across the cluster.
      await instances.waitForTimeout(20000);
      publisherNodeInstance = await instances.launchPublisherNodeInstance('publisher', {
        targetPort: 8001,
        clientCount: 10,
        uniqueChannelCount: 100,
        publishesPerClient: 20,
        publishInterval: 500,
        publishRandomness: 500
      });
      await Promise.all([
        instances.launchSCCInstance('regular', 8002, instances.generateRandomSCCInstanceName('broker'), clusterInfo.stateInstanceIP),
        instances.launchSCCInstance('regular', 8003, instances.generateRandomSCCInstanceName('broker'), clusterInfo.stateInstanceIP)
      ]);
      await instances.waitForTimeout(30000);
    });

    it('messages that are published on one SC instance should reach subscribers on a different SC instance in the cluster', function () {
      assert.equal(publisherNodeInstance.failedToSendMessages.length, 0);
      assert.equal(subscriberNodeInstance.receivedMessages.length, publisherNodeInstance.sentMessages.length);
      assert.equal(subscriberNodeInstance.receivedMessages.length, 200);
    });
  });

  describe('Pub/sub channels stay in sync while adding a new regular SC instance and an scc-broker instance at the same time', function () {
    let instanceDetailsList = [];
    let subscriberNodeInstance;
    let publisherNodeInstance;

    beforeEach(async function () {
      instanceDetailsList = instances.generateSCCInstanceClusterDetailsList({
        regularInstanceCount: 2,
        brokerInstanceCount: 1,
        stateInstanceStartPort: 7777,
        regularInstanceStartPort: 8000,
        brokerInstanceStartPort: 8888
      });
      let clusterInfo = await instances.launchSCCInstanceCluster(instanceDetailsList, 2000);
      subscriberNodeInstance = await instances.launchSubscriberNodeInstance('subscriber', {
        targetPort: 8000,
        clientCount: 100,
        uniqueChannelCount: 100,
        channelsPerClient: 1
      });
      // Wait for subscriptions to sync across the cluster.
      await instances.waitForTimeout(20000);
      publisherNodeInstance = await instances.launchPublisherNodeInstance('publisher', {
        targetPort: 8001,
        clientCount: 10,
        uniqueChannelCount: 100,
        publishesPerClient: 20,
        publishInterval: 500,
        publishRandomness: 500
      });
      await Promise.all([
        instances.launchSCCInstance('broker', 8889, instances.generateRandomSCCInstanceName('broker'), clusterInfo.stateInstanceIP),
        instances.launchSCCInstance('regular', 8002, instances.generateRandomSCCInstanceName('regular'), clusterInfo.stateInstanceIP)
      ]);
      await instances.waitForTimeout(30000);
    });

    it('messages that are published on one SC instance should reach subscribers on a different SC instance in the cluster', function () {
      assert.equal(publisherNodeInstance.failedToSendMessages.length, 0);
      assert.equal(subscriberNodeInstance.receivedMessages.length, publisherNodeInstance.sentMessages.length);
      assert.equal(subscriberNodeInstance.receivedMessages.length, 200);
    });
  });

  describe('Pub/sub channels stay in sync while adding a new regular SC instance and then an scc-broker instance', function () {
    let instanceDetailsList = [];
    let subscriberNodeInstance;
    let publisherNodeInstance;

    beforeEach(async function () {
      instanceDetailsList = instances.generateSCCInstanceClusterDetailsList({
        regularInstanceCount: 2,
        brokerInstanceCount: 1,
        stateInstanceStartPort: 7777,
        regularInstanceStartPort: 8000,
        brokerInstanceStartPort: 8888
      });
      let clusterInfo = await instances.launchSCCInstanceCluster(instanceDetailsList, 2000);
      subscriberNodeInstance = await instances.launchSubscriberNodeInstance('subscriber', {
        targetPort: 8000,
        clientCount: 100,
        uniqueChannelCount: 100,
        channelsPerClient: 1
      });
      // Wait for subscriptions to sync across the cluster.
      await instances.waitForTimeout(20000);
      publisherNodeInstance = await instances.launchPublisherNodeInstance('publisher', {
        targetPort: 8001,
        clientCount: 10,
        uniqueChannelCount: 100,
        publishesPerClient: 20,
        publishInterval: 500,
        publishRandomness: 500
      });
      await instances.launchSCCInstance('regular', 8002, instances.generateRandomSCCInstanceName('regular'), clusterInfo.stateInstanceIP)
      await instances.launchSCCInstance('broker', 8889, instances.generateRandomSCCInstanceName('broker'), clusterInfo.stateInstanceIP),
      await instances.waitForTimeout(30000);
    });

    it('messages that are published on one SC instance should reach subscribers on a different SC instance in the cluster', function () {
      assert.equal(publisherNodeInstance.failedToSendMessages.length, 0);
      assert.equal(subscriberNodeInstance.receivedMessages.length, publisherNodeInstance.sentMessages.length);
      assert.equal(subscriberNodeInstance.receivedMessages.length, 200);
    });
  });

  describe('Pub/sub channels stay in sync while adding a new scc-broker instance and then a regular SC instance', function () {
    let instanceDetailsList = [];
    let subscriberNodeInstance;
    let publisherNodeInstance;

    beforeEach(async function () {
      instanceDetailsList = instances.generateSCCInstanceClusterDetailsList({
        regularInstanceCount: 2,
        brokerInstanceCount: 1,
        stateInstanceStartPort: 7777,
        regularInstanceStartPort: 8000,
        brokerInstanceStartPort: 8888
      });
      let clusterInfo = await instances.launchSCCInstanceCluster(instanceDetailsList, 2000);
      subscriberNodeInstance = await instances.launchSubscriberNodeInstance('subscriber', {
        targetPort: 8000,
        clientCount: 100,
        uniqueChannelCount: 100,
        channelsPerClient: 1
      });
      // Wait for subscriptions to sync across the cluster.
      await instances.waitForTimeout(20000);
      publisherNodeInstance = await instances.launchPublisherNodeInstance('publisher', {
        targetPort: 8001,
        clientCount: 10,
        uniqueChannelCount: 100,
        publishesPerClient: 20,
        publishInterval: 500,
        publishRandomness: 500
      });
      await instances.launchSCCInstance('broker', 8889, instances.generateRandomSCCInstanceName('broker'), clusterInfo.stateInstanceIP),
      await instances.launchSCCInstance('regular', 8002, instances.generateRandomSCCInstanceName('regular'), clusterInfo.stateInstanceIP)
      await instances.waitForTimeout(30000);
    });

    it('messages that are published on one SC instance should reach subscribers on a different SC instance in the cluster', function () {
      assert.equal(publisherNodeInstance.failedToSendMessages.length, 0);
      assert.equal(subscriberNodeInstance.receivedMessages.length, publisherNodeInstance.sentMessages.length);
      assert.equal(subscriberNodeInstance.receivedMessages.length, 200);
    });
  });
});
