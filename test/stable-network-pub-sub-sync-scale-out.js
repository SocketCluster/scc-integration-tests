let assert = require('assert');
let InstanceManager = require('../instance-manager');
let config = require('../config');

let instances = new InstanceManager(config);

before(async function () {
  await instances.destroyAllDockerInstances();
});

describe('Stable network, pub/sub sync after scaling out', () => {
  afterEach(async function () {
    await instances.destroyAllDockerInstances();
    await instances.destroyAllNodeInstances();
    instances.reset();
  });

  describe('Pub/sub channels stay in sync after adding new scc-broker instances', function () {
    let instanceDetailsList = [];
    let subscriberNodeInstance;
    let publisherNodeInstance;

    beforeEach(async function () {
      instanceDetailsList = instances.generateSCCInstanceClusterDetailsList({
        workerInstanceCount: 2,
        brokerInstanceCount: 1,
        stateInstanceStartPort: 7777,
        workerInstanceStartPort: 8000,
        brokerInstanceStartPort: 8888
      });
      let clusterInfo = await instances.launchSCCInstanceCluster(instanceDetailsList, 2000);
      subscriberNodeInstance = await instances.launchSubscriberNodeInstance('subscriber', {
        targetPort: 8000,
        clientCount: 100,
        uniqueChannelCount: 100,
        channelsPerClient: 1
      });
      await instances.waitForTimeout(3000);
      await Promise.all([
        instances.launchSCCInstance('broker', 8890, instances.generateSCCInstanceName('broker'), clusterInfo.stateInstanceIP),
        instances.launchSCCInstance('broker', 8891, instances.generateSCCInstanceName('broker'), clusterInfo.stateInstanceIP)
      ]);
      await instances.waitForTimeout(6000);
      publisherNodeInstance = await instances.launchPublisherNodeInstance('publisher', {
        targetPort: 8001,
        clientCount: 10,
        uniqueChannelCount: 100,
        publishesPerClient: 20,
        publishInterval: 100,
        publishRandomness: 100
      });
      await instances.waitForTimeout(5000);
    });

    it('messages that are published on one SocketCluster instance should reach subscribers on a different SocketCluster instance in the cluster', function () {
      assert.equal(publisherNodeInstance.failedToSendMessages.length, 0);
      assert.equal(subscriberNodeInstance.receivedMessages.length, publisherNodeInstance.sentMessages.length);
      assert.equal(subscriberNodeInstance.receivedMessages.length, 200);
    });
  });

  describe('Pub/sub channels stay in sync after adding new scc-worker instances', function () {
    let instanceDetailsList = [];
    let subscriberNodeInstance;
    let publisherNodeInstance;

    beforeEach(async function () {
      instanceDetailsList = instances.generateSCCInstanceClusterDetailsList({
        workerInstanceCount: 2,
        brokerInstanceCount: 1,
        stateInstanceStartPort: 7777,
        workerInstanceStartPort: 8000,
        brokerInstanceStartPort: 8888
      });
      let clusterInfo = await instances.launchSCCInstanceCluster(instanceDetailsList, 2000);
      subscriberNodeInstance = await instances.launchSubscriberNodeInstance('subscriber', {
        targetPort: 8000,
        clientCount: 100,
        uniqueChannelCount: 100,
        channelsPerClient: 1
      });
      await instances.waitForTimeout(4000);
      publisherNodeInstance = await instances.launchPublisherNodeInstance('publisher', {
        targetPort: 8001,
        clientCount: 10,
        uniqueChannelCount: 100,
        publishesPerClient: 20,
        publishInterval: 100,
        publishRandomness: 100
      });
      await Promise.all([
        instances.launchSCCInstance('worker', 8002, instances.generateSCCInstanceName('broker'), clusterInfo.stateInstanceIP),
        instances.launchSCCInstance('worker', 8003, instances.generateSCCInstanceName('broker'), clusterInfo.stateInstanceIP)
      ]);
      await instances.waitForTimeout(5000);
    });

    it('messages that are published on one SocketCluster instance should reach subscribers on a different SocketCluster instance in the cluster', function () {
      assert.equal(publisherNodeInstance.failedToSendMessages.length, 0);
      assert.equal(subscriberNodeInstance.receivedMessages.length, publisherNodeInstance.sentMessages.length);
      assert.equal(subscriberNodeInstance.receivedMessages.length, 200);
    });
  });

  describe('Pub/sub channels stay in sync after adding a new scc-worker instance and an scc-broker instance', function () {
    let instanceDetailsList = [];
    let subscriberNodeInstance;
    let publisherNodeInstance;

    beforeEach(async function () {
      instanceDetailsList = instances.generateSCCInstanceClusterDetailsList({
        workerInstanceCount: 2,
        brokerInstanceCount: 1,
        stateInstanceStartPort: 7777,
        workerInstanceStartPort: 8000,
        brokerInstanceStartPort: 8888
      });
      let clusterInfo = await instances.launchSCCInstanceCluster(instanceDetailsList, 2000);
      subscriberNodeInstance = await instances.launchSubscriberNodeInstance('subscriber', {
        targetPort: 8000,
        clientCount: 100,
        uniqueChannelCount: 100,
        channelsPerClient: 1
      });
      await instances.waitForTimeout(4000);
      publisherNodeInstance = await instances.launchPublisherNodeInstance('publisher', {
        targetPort: 8001,
        clientCount: 10,
        uniqueChannelCount: 100,
        publishesPerClient: 20,
        publishInterval: 100,
        publishRandomness: 100
      });
      await Promise.all([
        instances.launchSCCInstance('broker', 8889, instances.generateSCCInstanceName('broker'), clusterInfo.stateInstanceIP),
        instances.launchSCCInstance('worker', 8002, instances.generateSCCInstanceName('worker'), clusterInfo.stateInstanceIP)
      ]);
      await instances.waitForTimeout(5000);
    });

    it('messages that are published on one SocketCluster instance should reach subscribers on a different SocketCluster instance in the cluster', function () {
      assert.equal(publisherNodeInstance.failedToSendMessages.length, 0);
      assert.equal(subscriberNodeInstance.receivedMessages.length, publisherNodeInstance.sentMessages.length);
      assert.equal(subscriberNodeInstance.receivedMessages.length, 200);
    });
  });

  describe('Pub/sub channels stay in sync after adding a new scc-worker instance and then an scc-broker instance', function () {
    let instanceDetailsList = [];
    let subscriberNodeInstance;
    let publisherNodeInstance;

    beforeEach(async function () {
      instanceDetailsList = instances.generateSCCInstanceClusterDetailsList({
        workerInstanceCount: 2,
        brokerInstanceCount: 1,
        stateInstanceStartPort: 7777,
        workerInstanceStartPort: 8000,
        brokerInstanceStartPort: 8888
      });
      let clusterInfo = await instances.launchSCCInstanceCluster(instanceDetailsList, 2000);
      subscriberNodeInstance = await instances.launchSubscriberNodeInstance('subscriber', {
        targetPort: 8000,
        clientCount: 100,
        uniqueChannelCount: 100,
        channelsPerClient: 1
      });
      await instances.waitForTimeout(4000);
      publisherNodeInstance = await instances.launchPublisherNodeInstance('publisher', {
        targetPort: 8001,
        clientCount: 10,
        uniqueChannelCount: 100,
        publishesPerClient: 20,
        publishInterval: 100,
        publishRandomness: 100
      });
      await instances.launchSCCInstance('worker', 8002, instances.generateSCCInstanceName('worker'), clusterInfo.stateInstanceIP)
      await instances.launchSCCInstance('broker', 8889, instances.generateSCCInstanceName('broker'), clusterInfo.stateInstanceIP),
      await instances.waitForTimeout(5000);
    });

    it('messages that are published on one SocketCluster instance should reach subscribers on a different SocketCluster instance in the cluster', function () {
      assert.equal(publisherNodeInstance.failedToSendMessages.length, 0);
      assert.equal(subscriberNodeInstance.receivedMessages.length, publisherNodeInstance.sentMessages.length);
      assert.equal(subscriberNodeInstance.receivedMessages.length, 200);
    });
  });

  describe('Pub/sub channels stay in sync after adding a new scc-broker instance and then an scc-worker instance', function () {
    let instanceDetailsList = [];
    let subscriberNodeInstance;
    let publisherNodeInstance;

    beforeEach(async function () {
      instanceDetailsList = instances.generateSCCInstanceClusterDetailsList({
        workerInstanceCount: 2,
        brokerInstanceCount: 1,
        stateInstanceStartPort: 7777,
        workerInstanceStartPort: 8000,
        brokerInstanceStartPort: 8888
      });
      let clusterInfo = await instances.launchSCCInstanceCluster(instanceDetailsList, 2000);
      subscriberNodeInstance = await instances.launchSubscriberNodeInstance('subscriber', {
        targetPort: 8000,
        clientCount: 100,
        uniqueChannelCount: 100,
        channelsPerClient: 1
      });
      await instances.waitForTimeout(4000);
      publisherNodeInstance = await instances.launchPublisherNodeInstance('publisher', {
        targetPort: 8001,
        clientCount: 10,
        uniqueChannelCount: 100,
        publishesPerClient: 20,
        publishInterval: 100,
        publishRandomness: 100
      });
      await instances.launchSCCInstance('broker', 8889, instances.generateSCCInstanceName('broker'), clusterInfo.stateInstanceIP),
      await instances.launchSCCInstance('worker', 8002, instances.generateSCCInstanceName('worker'), clusterInfo.stateInstanceIP)
      await instances.waitForTimeout(5000);
    });

    it('messages that are published on one SocketCluster instance should reach subscribers on a different SocketCluster instance in the cluster', function () {
      assert.equal(publisherNodeInstance.failedToSendMessages.length, 0);
      assert.equal(subscriberNodeInstance.receivedMessages.length, publisherNodeInstance.sentMessages.length);
      assert.equal(subscriberNodeInstance.receivedMessages.length, 200);
    });
  });
});
