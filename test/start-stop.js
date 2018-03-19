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
  });

  describe('Instances launch successfully', function () {
    describe('One of each type', function () {
      let stateInstanceName;
      let regularInstanceName;
      let brokerInstanceName;

      beforeEach(async function () {
        stateInstanceName = instances.generateSCCInstanceName('state');
        regularInstanceName = instances.generateSCCInstanceName('regular');
        brokerInstanceName = instances.generateSCCInstanceName('broker');

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
        stateInstanceName = instances.generateSCCInstanceName('state');
        regularInstanceName1 = instances.generateSCCInstanceName('regular');
        brokerInstanceName1 = instances.generateSCCInstanceName('broker');
        regularInstanceName2 = instances.generateSCCInstanceName('regular');
        brokerInstanceName2 = instances.generateSCCInstanceName('broker');

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
});
