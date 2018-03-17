let assert = require('assert');
let childProcess = require('child_process');
let exec = childProcess.exec;
let uuid = require('uuid');

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
  }
};

let activeInstanceList = [];

function launchSCCInstance(instanceType, externalPort, instanceName) {
  let instanceTypeConfig = config[instanceType];
  return new Promise((resolve, reject) => {
    exec(`docker run -d -p ${externalPort}:${instanceTypeConfig.internalContainerPort} --name ${instanceName} ${instanceTypeConfig.imageName}:${instanceTypeConfig.versionTag}`, (err) => {
      if (err) {
        reject(err);
      } else {
        activeInstanceList.push(instanceName);
        resolve();
      }
    });
  });
}

function stopSCCInstance(instanceName) {
  return new Promise((resolve, reject) => {
    exec(`docker stop -t 0 ${instanceName}`, (err) => {
      if (err) {
        reject(err);
      } else {
        activeInstanceList = activeInstanceList.filter((curInstanceName) => {
          return curInstanceName !== instanceName;
        });
        resolve();
      }
    });
  });
}

function getRunningInstanceNames() {
  return new Promise((resolve, reject) => {
    exec(`docker ps --format '{{.Names}}'`, (err, stdout) => {
      if (err) {
        reject(err);
      } else {
        resolve(stdout.split('\n'));
      }
    });
  });
}

async function isInstanceRunning(instanceName) {
  let instanceNameList = await getRunningInstanceNames();
  return instanceNameList.indexOf(instanceName) !== -1;
}

function removeSCCInstance(instanceName) {
  return new Promise((resolve, reject) => {
    exec(`docker rm ${instanceName}`, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

async function destroySCCInstance(instanceName) {
  await stopSCCInstance(instanceName);
  return removeSCCInstance(instanceName);
}

function destroyAllSCCInstances() {
  let destroyInstanceListPromises = activeInstanceList.map((instanceName) => {
    return destroySCCInstance(instanceName);
  });
  return Promise.all(destroyInstanceListPromises);
}

function stopAllDockerInstances() {
  return new Promise((resolve, reject) => {
    exec(`docker stop -t 0 $(docker ps -a -q)`, (err) => {
      resolve();
    });
  });
}

function removeAllDockerInstances() {
  return new Promise((resolve, reject) => {
    exec(`docker rm $(docker ps -a -q)`, (err) => {
      resolve();
    });
  });
}

async function destroyAllDockerInstances() {
  await stopAllDockerInstances();
  await removeAllDockerInstances();
}

function generateRandomInstanceName(instanceType) {
  return `scc-${instanceType}-` + uuid.v4();
}

before(async function () {
  await destroyAllDockerInstances();
});

describe('Basic tests', () => {
  afterEach(async function () {
    await destroyAllDockerInstances();
  });

  describe('Instances launch successfully', function () {
    describe('One of each type', function () {
      let stateInstanceName;
      let regularInstanceName;
      let brokerInstanceName;

      beforeEach(async function () {
        stateInstanceName = generateRandomInstanceName('state');
        regularInstanceName = generateRandomInstanceName('regular');
        brokerInstanceName = generateRandomInstanceName('broker');

        await Promise.all([
          launchSCCInstance('state', 7777, stateInstanceName),
          launchSCCInstance('regular', 8000, regularInstanceName),
          launchSCCInstance('broker', 8888, brokerInstanceName)
        ]);
      });

      it('should run all instances successfully', async function () {
        let isStateInstanceRunning = await isInstanceRunning(stateInstanceName);
        assert(isStateInstanceRunning, true);
        let isRegularInstanceRunning = await isInstanceRunning(regularInstanceName);
        assert(isRegularInstanceRunning, true);
        let isBrokerInstanceRunning = await isInstanceRunning(brokerInstanceName);
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
        stateInstanceName = generateRandomInstanceName('state');
        regularInstanceName1 = generateRandomInstanceName('regular');
        brokerInstanceName1 = generateRandomInstanceName('broker');
        regularInstanceName2 = generateRandomInstanceName('regular');
        brokerInstanceName2 = generateRandomInstanceName('broker');

        await Promise.all([
          launchSCCInstance('state', 7777, stateInstanceName),
          launchSCCInstance('regular', 8000, regularInstanceName1),
          launchSCCInstance('broker', 8888, brokerInstanceName1),
          launchSCCInstance('regular', 8001, regularInstanceName2),
          launchSCCInstance('broker', 8889, brokerInstanceName2)
        ]);
      });

      it('should run all instances successfully', async function () {
        let isStateInstanceRunning = await isInstanceRunning(stateInstanceName);
        assert(isStateInstanceRunning, true);
        let isRegularInstance1Running = await isInstanceRunning(regularInstanceName1);
        assert(isRegularInstance1Running, true);
        let isBrokerInstance1Running = await isInstanceRunning(brokerInstanceName1);
        assert(isBrokerInstance1Running, true);
        let isRegularInstance2Running = await isInstanceRunning(regularInstanceName2);
        assert(isRegularInstance2Running, true);
        let isBrokerInstance2Running = await isInstanceRunning(brokerInstanceName2);
        assert(isBrokerInstance2Running, true);
      });
    });
  });
});
