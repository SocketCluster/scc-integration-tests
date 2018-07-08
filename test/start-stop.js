let assert = require('assert');
let InstanceManager = require('../instance-manager');
let config = require('../config');

let instances = new InstanceManager(config);

before(async function () {
  await instances.destroyAllDockerInstances();
});

describe('Instances start and stop', () => {
  afterEach(async function () {
    await instances.destroyAllDockerInstances();
    await instances.destroyAllNodeInstances();
    instances.reset();
  });

  describe('Instances launch successfully', function () {
    describe('One of each type', function () {
      let stateInstanceName;
      let workerInstanceName;
      let brokerInstanceName;

      beforeEach(async function () {
        stateInstanceName = instances.generateSCCInstanceName('state');
        workerInstanceName = instances.generateSCCInstanceName('worker');
        brokerInstanceName = instances.generateSCCInstanceName('broker');

        await Promise.all([
          instances.launchSCCInstance('state', 7777, stateInstanceName),
          instances.launchSCCInstance('worker', 8000, workerInstanceName),
          instances.launchSCCInstance('broker', 8888, brokerInstanceName)
        ]);
      });

      it('should run all instances successfully', async function () {
        let isStateInstanceRunning = await instances.isInstanceRunning(stateInstanceName);
        assert.equal(isStateInstanceRunning, true);
        let isWorkerInstanceRunning = await instances.isInstanceRunning(workerInstanceName);
        assert.equal(isWorkerInstanceRunning, true);
        let isBrokerInstanceRunning = await instances.isInstanceRunning(brokerInstanceName);
        assert.equal(isBrokerInstanceRunning, true);
      });
    });

    describe('Multiple of each type', function () {
      let stateInstanceName;
      let workerInstanceName1;
      let workerInstanceName2;
      let brokerInstanceName1;
      let brokerInstanceName2;

      beforeEach(async function () {
        stateInstanceName = instances.generateSCCInstanceName('state');
        workerInstanceName1 = instances.generateSCCInstanceName('worker');
        brokerInstanceName1 = instances.generateSCCInstanceName('broker');
        workerInstanceName2 = instances.generateSCCInstanceName('worker');
        brokerInstanceName2 = instances.generateSCCInstanceName('broker');

        await Promise.all([
          instances.launchSCCInstance('state', 7777, stateInstanceName),
          instances.launchSCCInstance('worker', 8000, workerInstanceName1),
          instances.launchSCCInstance('broker', 8888, brokerInstanceName1),
          instances.launchSCCInstance('worker', 8001, workerInstanceName2),
          instances.launchSCCInstance('broker', 8889, brokerInstanceName2)
        ]);
      });

      it('should run all instances successfully', async function () {
        let isStateInstanceRunning = await instances.isInstanceRunning(stateInstanceName);
        assert.equal(isStateInstanceRunning, true);
        let isWorkerInstance1Running = await instances.isInstanceRunning(workerInstanceName1);
        assert.equal(isWorkerInstance1Running, true);
        let isBrokerInstance1Running = await instances.isInstanceRunning(brokerInstanceName1);
        assert.equal(isBrokerInstance1Running, true);
        let isWorkerInstance2Running = await instances.isInstanceRunning(workerInstanceName2);
        assert.equal(isWorkerInstance2Running, true);
        let isBrokerInstance2Running = await instances.isInstanceRunning(brokerInstanceName2);
        assert.equal(isBrokerInstance2Running, true);
      });
    });
  });
});
