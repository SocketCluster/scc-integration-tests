let assert = require('assert');
let util = require('util');
let InstanceManager = require('../instance-manager');
let StatsCollector = require('../stats-collector');
let config = require('../config');

let instances = new InstanceManager(config);

before(async function () {
  await instances.destroyAllDockerInstances();
});

describe('Stable network, pub/sub sync', () => {
  afterEach(async function () {
    await instances.destroyAllDockerInstances();
    await instances.destroyAllNodeInstances();
    instances.reset();
  });

  describe('Pub/sub channels sync', function () {
    let instanceDetailsList = [];
    let subscriberNodeInstance;
    let publisherNodeInstance;

    beforeEach(async function () {
      instanceDetailsList = instances.generateSCCInstanceClusterDetailsList({
        workerInstanceCount: 2,
        brokerInstanceCount: 2,
        stateInstanceStartPort: 7777,
        workerInstanceStartPort: 8000,
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

    it('messages that are published on one SC instance should reach subscribers on a different SC instance in the cluster', function () {
      assert.equal(publisherNodeInstance.failedToSendMessages.length, 0);
      assert.equal(subscriberNodeInstance.receivedMessages.length, publisherNodeInstance.sentMessages.length);
      assert.equal(subscriberNodeInstance.receivedMessages.length, 100);
    });
  });

  describe('Pub/sub message distribution with simple hashing', function () {
    let instanceDetailsList = [];
    let subscriberNodeInstance;
    let publisherNodeInstance;
    let stats;

    beforeEach(async function () {
      instanceDetailsList = instances.generateSCCInstanceClusterDetailsList({
        workerInstanceCount: 2,
        brokerInstanceCount: 4,
        stateInstanceStartPort: 7777,
        brokerInstanceStartPort: 8888,
        workerInstanceStartPort: 8000,
        workerInstanceEnvs: {
          SCC_CLIENT_POOL_SIZE: 3,
          SCC_MAPPING_ENGINE: 'simple'
        }
      });
      await instances.launchSCCInstanceCluster(instanceDetailsList, 2000);
      subscriberNodeInstance = await instances.launchSubscriberNodeInstance('subscriber', {
        targetPort: 8000,
        clientCount: 1000,
        uniqueChannelCount: 1000,
        channelsPerClient: 1
      });
      await instances.waitForTimeout(5000);
      publisherNodeInstance = await instances.launchPublisherNodeInstance('publisher', {
        targetPort: 8001,
        clientCount: 100,
        uniqueChannelCount: 1000,
        publishesPerClient: 10,
        publishInterval: 100,
        publishRandomness: 100
      });
      await instances.waitForTimeout(3000);

      let statsCollector = new StatsCollector(instanceDetailsList);
      stats = await statsCollector.collectStats();
      statsCollector.destroy();
    });

    it('messages are evenly spread across scc-broker instances and also within client pools', function () {
      // console.log('      ' + util.inspect(stats, {depth: null, colors: true}));
      let subscriberWorkerInstanceStats = stats['scc-worker-1'];

      Object.keys(subscriberWorkerInstanceStats).forEach((sccBrokerURI) => {
        let sccBrokerStats = subscriberWorkerInstanceStats[sccBrokerURI];
        let sccBrokerSubscribeSum = 0;
        Object.keys(sccBrokerStats).forEach((poolIndex) => {
          let poolClientStats = sccBrokerStats[poolIndex];

          let subscribes = poolClientStats.subscribe;
          let subscribeFails = poolClientStats.subscribeFail;
          let publishes = poolClientStats.publish;
          let publishFails = poolClientStats.publishFail;

          assert.equal(subscribeFails === 0, true);

          // Since no publishers were connected to this scc-worker instance, we don't
          // expect any inbound publishes on this instance.
          assert.equal(publishes === 0, true);
          assert.equal(publishFails === 0, true);

          // Check that the distribution of subscriptions is even between connections in each pool.
          assert.equal(subscribes > 60, true);
          assert.equal(subscribes < 110, true);
          sccBrokerSubscribeSum += subscribes;
        });

        // Check that the distribution of subscriptions is even between scc-broker instances.
        assert.equal(sccBrokerSubscribeSum > 220, true);
        assert.equal(sccBrokerSubscribeSum < 280, true);
      });

      let publisherWorkerInstanceStats = stats['scc-worker-2'];

      Object.keys(publisherWorkerInstanceStats).forEach((sccBrokerURI) => {
        let sccBrokerStats = publisherWorkerInstanceStats[sccBrokerURI];
        let sccBrokerPublishSum = 0;
        Object.keys(sccBrokerStats).forEach((poolIndex) => {
          let poolClientStats = sccBrokerStats[poolIndex];

          let subscribes = poolClientStats.subscribe;
          let subscribeFails = poolClientStats.subscribeFail;
          let publishes = poolClientStats.publish;
          let publishFails = poolClientStats.publishFail;

          assert.equal(publishFails === 0, true);

          // Since no subscribers were connected to this scc-worker instance, we don't
          // expect any inbound subscribes on this instance.
          assert.equal(subscribes === 0, true);
          assert.equal(subscribeFails === 0, true);

          // Check that the distribution of publishes is even between connections in each pool.
          assert.equal(publishes > 60, true);
          assert.equal(publishes < 110, true);
          sccBrokerPublishSum += publishes;
        });

        // Check that the distribution of publishes is even between scc-broker instances.
        assert.equal(sccBrokerPublishSum > 220, true);
        assert.equal(sccBrokerPublishSum < 280, true);
      });
    });
  });

  // This rendezvous hashing test is deterministic with respect to instance URIs.
  // In practice, because Docker container URIs may be different each time they are launched,
  // the exact values reported by this test may not be consistent each time it is run.
  describe('Pub/sub message distribution with skeleton-based rendezvous (HRW) hashing', function () {
    let instanceDetailsList = [];
    let subscriberNodeInstance;
    let publisherNodeInstance;
    let stats;

    beforeEach(async function () {
      instanceDetailsList = instances.generateSCCInstanceClusterDetailsList({
        workerInstanceCount: 2,
        brokerInstanceCount: 4,
        stateInstanceStartPort: 7777,
        brokerInstanceStartPort: 8888,
        workerInstanceStartPort: 8000,
        workerInstanceEnvs: {
          SCC_CLIENT_POOL_SIZE: 3,
          SCC_MAPPING_ENGINE: 'skeletonRendezvous'
        }
      });
      await instances.launchSCCInstanceCluster(instanceDetailsList, 2000);
      subscriberNodeInstance = await instances.launchSubscriberNodeInstance('subscriber', {
        targetPort: 8000,
        clientCount: 1000,
        uniqueChannelCount: 1000,
        channelsPerClient: 1
      });
      await instances.waitForTimeout(5000);
      publisherNodeInstance = await instances.launchPublisherNodeInstance('publisher', {
        targetPort: 8001,
        clientCount: 100,
        uniqueChannelCount: 1000,
        publishesPerClient: 10,
        publishInterval: 100,
        publishRandomness: 100
      });
      await instances.waitForTimeout(3000);

      let statsCollector = new StatsCollector(instanceDetailsList);
      stats = await statsCollector.collectStats();
      statsCollector.destroy();
    });

    it('messages are evenly spread across scc-broker instances and also within client pools', function () {
      // console.log('      ' + util.inspect(stats, {depth: null, colors: true}));
      let subscriberWorkerInstanceStats = stats['scc-worker-1'];

      Object.keys(subscriberWorkerInstanceStats).forEach((sccBrokerURI) => {
        let sccBrokerStats = subscriberWorkerInstanceStats[sccBrokerURI];
        let sccBrokerSubscribeSum = 0;
        Object.keys(sccBrokerStats).forEach((poolIndex) => {
          let poolClientStats = sccBrokerStats[poolIndex];

          let subscribes = poolClientStats.subscribe;
          let subscribeFails = poolClientStats.subscribeFail;
          let publishes = poolClientStats.publish;
          let publishFails = poolClientStats.publishFail;

          assert.equal(subscribeFails === 0, true);

          // Since no publishers were connected to this scc-worker instance, we don't
          // expect any inbound publishes on this instance.
          assert.equal(publishes === 0, true);
          assert.equal(publishFails === 0, true);

          // Check that the distribution of subscriptions is even between connections in each pool.
          assert.equal(subscribes > 60, true);
          assert.equal(subscribes < 110, true);
          sccBrokerSubscribeSum += subscribes;
        });

        // Check that the distribution of subscriptions is even between scc-broker instances.
        assert.equal(sccBrokerSubscribeSum > 220, true);
        assert.equal(sccBrokerSubscribeSum < 280, true);
      });

      let publisherWorkerInstanceStats = stats['scc-worker-2'];

      Object.keys(publisherWorkerInstanceStats).forEach((sccBrokerURI) => {
        let sccBrokerStats = publisherWorkerInstanceStats[sccBrokerURI];
        let sccBrokerPublishSum = 0;
        Object.keys(sccBrokerStats).forEach((poolIndex) => {
          let poolClientStats = sccBrokerStats[poolIndex];

          let subscribes = poolClientStats.subscribe;
          let subscribeFails = poolClientStats.subscribeFail;
          let publishes = poolClientStats.publish;
          let publishFails = poolClientStats.publishFail;

          assert.equal(publishFails === 0, true);

          // Since no subscribers were connected to this scc-worker instance, we don't
          // expect any inbound subscribes on this instance.
          assert.equal(subscribes === 0, true);
          assert.equal(subscribeFails === 0, true);

          // Check that the distribution of publishes is even between connections in each pool.
          assert.equal(publishes > 60, true);
          assert.equal(publishes < 110, true);
          sccBrokerPublishSum += publishes;
        });

        // Check that the distribution of publishes is even between scc-broker instances.
        assert.equal(sccBrokerPublishSum > 220, true);
        assert.equal(sccBrokerPublishSum < 280, true);
      });
    });
  });
});
