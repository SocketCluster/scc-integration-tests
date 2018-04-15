let childProcess = require('child_process');
let exec = childProcess.exec;
let fork = childProcess.fork;
let uuid = require('uuid');
let path = require('path');

function InstanceManager(config) {
  this.config = config;
  this.activeDockerInstanceList = [];
  this.activeNodeInstanceMap = {};
  this.absoluteControllerPath = path.join(__dirname, 'controllers');
  this.count = 0;
}

InstanceManager.prototype.launchSCCInstance = function (instanceType, externalPort, instanceName, stateServerHost, customEnvs) {
  stateServerHost = stateServerHost || '127.0.0.1';
  let instanceTypeConfig = this.config[instanceType];
  return new Promise((resolve, reject) => {
    let volumeFlag = '';
    let envFlag = '';
    if (instanceType !== 'state') {
      envFlag = ` -e "SCC_STATE_SERVER_HOST=${stateServerHost}"`;
      if (instanceType === 'regular') {
        envFlag += ` -e "SOCKETCLUSTER_MASTER_CONTROLLER=/usr/src/app/server.js"`;
        envFlag += ` -e "SOCKETCLUSTER_WORKER_CONTROLLER=/usr/src/app/worker.js"`;
        envFlag += ` -e "SOCKETCLUSTER_BROKER_CONTROLLER=/usr/src/app/broker.js"`;
        volumeFlag = ` -v ${this.absoluteControllerPath}:/usr/src/app/`;
      }
    }
    if (customEnvs) {
      Object.keys(customEnvs).forEach((key) => {
        envFlag += ` -e "${key}=${customEnvs[key]}"`;
      });
    }
    // console.log('Launching SCC instance:', `docker run -d -p ${externalPort}:${instanceTypeConfig.internalContainerPort}${volumeFlag}${envFlag} --name ${instanceName} ${instanceTypeConfig.imageName}:${instanceTypeConfig.versionTag}`);
    let instanceProcess = exec(`docker run -d -p ${externalPort}:${instanceTypeConfig.internalContainerPort}${volumeFlag}${envFlag} --name ${instanceName} ${instanceTypeConfig.imageName}:${instanceTypeConfig.versionTag}`, (err) => {
      if (err) {
        reject(err);
      } else {
        this.activeDockerInstanceList.push(instanceName);
        resolve(instanceProcess);
      }
    });
  });
};

InstanceManager.prototype.stopSCCInstance = function (instanceName) {
  return new Promise((resolve, reject) => {
    // console.log('Stopping SCC instance:', `docker stop -t 0 ${instanceName}`);
    exec(`docker stop -t 0 ${instanceName}`, (err) => {
      if (err) {
        reject(err);
      } else {
        this.activeDockerInstanceList = this.activeDockerInstanceList.filter((curInstanceName) => {
          return curInstanceName !== instanceName;
        });
        resolve();
      }
    });
  });
};

InstanceManager.prototype.getRunningInstanceNames = function () {
  return new Promise((resolve, reject) => {
    exec(`docker ps --format '{{.Names}}'`, (err, stdout) => {
      if (err) {
        reject(err);
      } else {
        resolve(stdout.split('\n'));
      }
    });
  });
};

InstanceManager.prototype.isInstanceRunning = async function (instanceName) {
  let instanceNameList = await this.getRunningInstanceNames();
  return instanceNameList.indexOf(instanceName) !== -1;
};

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
};

InstanceManager.prototype.destroySCCInstance = async function (instanceName) {
  await this.stopSCCInstance(instanceName);
  await this.removeSCCInstance(instanceName);
};

InstanceManager.prototype.destroyAllSCCInstances = function () {
  let destroyInstanceListPromises = this.activeDockerInstanceList.map((instanceName) => {
    return this.destroySCCInstance(instanceName);
  });
  return Promise.all(destroyInstanceListPromises);
};

InstanceManager.prototype.stopAllDockerInstances = function () {
  return new Promise((resolve, reject) => {
    exec(`docker stop -t 0 $(docker ps -a -q)`, (err) => {
      resolve();
    });
  });
};

InstanceManager.prototype.removeAllDockerInstances = function () {
  return new Promise((resolve, reject) => {
    exec(`docker rm $(docker ps -a -q)`, (err) => {
      resolve();
    });
  });
};

InstanceManager.prototype.destroyAllDockerInstances = async function () {
  await this.stopAllDockerInstances();
  await this.removeAllDockerInstances();
};

InstanceManager.prototype.getDockerInstanceIP = function (instanceName) {
  return new Promise((resolve, reject) => {
    exec(`docker inspect -f "{{.NetworkSettings.IPAddress}}" ${instanceName}`, (err, stdout) => {
      if (err) {
        reject(err);
      } else {
        resolve(stdout.split('\n')[0]);
      }
    });
  });
};

InstanceManager.prototype.generateSCCInstanceName = function (instanceType) {
  return `scc-${instanceType}-` + this.count++;
};

InstanceManager.prototype.generateSCCInstanceClusterDetailsList = function (options) {
  let instanceDetailList = [];

  let stateInstanceStartPort = options.stateInstanceStartPort || 7777;
  let regularInstanceStartPort = options.regularInstanceStartPort || 8000;
  let brokerInstanceStartPort = options.brokerInstanceStartPort || 8888;

  let stateInstanceEnvs = options.stateInstanceEnvs || null;
  let regularInstanceEnvs = options.regularInstanceEnvs || null;
  let brokerInstanceEnvs = options.brokerInstanceEnvs || null;

  instanceDetailList.push({
    type: 'state',
    name: this.generateSCCInstanceName('state'),
    port: stateInstanceStartPort,
    envs: stateInstanceEnvs
  });
  for (let i = 0; i < options.regularInstanceCount; i++) {
    instanceDetailList.push({
      type: 'regular',
      name: this.generateSCCInstanceName('regular'),
      port: regularInstanceStartPort + i,
      envs: regularInstanceEnvs
    });
  }
  for (let i = 0; i < options.brokerInstanceCount; i++) {
    instanceDetailList.push({
      type: 'broker',
      name: this.generateSCCInstanceName('broker'),
      port: brokerInstanceStartPort + i,
      envs: brokerInstanceEnvs
    });
  }
  return instanceDetailList;
};

InstanceManager.prototype.waitForTimeout = function (delay) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, delay);
  });
};

InstanceManager.prototype.launchSCCInstanceCluster = async function (clusterDetailsList, readyDelay) {
  let stateInstanceDetails = clusterDetailsList.filter((instanceDetails) => {
    return instanceDetails.type === 'state';
  })[0];

  await this.launchSCCInstance(stateInstanceDetails.type, stateInstanceDetails.port, stateInstanceDetails.name, null, stateInstanceDetails.envs);
  let stateInstanceIP = await this.getDockerInstanceIP(stateInstanceDetails.name);

  let otherInstanceDetailsList = clusterDetailsList.filter((instanceDetails) => {
    return instanceDetails.type !== 'state';
  });

  let launchInstancePromises = otherInstanceDetailsList.map((instanceDetails) => {
    return this.launchSCCInstance(instanceDetails.type, instanceDetails.port, instanceDetails.name, stateInstanceIP, stateInstanceDetails.envs);
  });
  await Promise.all(launchInstancePromises);
  if (readyDelay) {
    await this.waitForTimeout(readyDelay);
  }
  return {
    stateInstanceIP: stateInstanceIP
  };
};

InstanceManager.prototype.launchSubscriberNodeInstance = function (instanceName, options) {
  let optionsString = JSON.stringify(options || {});
  let args = ['--options', optionsString];
  return new Promise((resolve, reject) => {
    let instanceProcess = fork(this.config.subscriberInstancePath, args);
    instanceProcess.on('error', (err) => {
      instanceProcess.removeAllListeners('error');
      instanceProcess.removeAllListeners('message');
      reject(err);
    });
    instanceProcess.receivedMessages = [];
    instanceProcess.on('message', (message) => {
      if (message.type === 'ready') {
        instanceProcess.removeAllListeners('error');
        resolve(instanceProcess);
      } else if (message.type === 'received') {
        instanceProcess.receivedMessages.push(message);
      }
    });
    instanceProcess.instanceName = instanceName;
    this.activeNodeInstanceMap[instanceName] = instanceProcess;
  });
};

InstanceManager.prototype.launchPublisherNodeInstance = function (instanceName, options) {
  let optionsString = JSON.stringify(options || {});
  let args = ['--options', optionsString];
  return new Promise((resolve, reject) => {
    let instanceProcess = fork(this.config.publisherInstancePath, args);
    instanceProcess.on('error', (err) => {
      instanceProcess.removeAllListeners('error');
      instanceProcess.removeAllListeners('message');
      reject(err);
    });
    instanceProcess.sentMessages = [];
    instanceProcess.failedToSendMessages = [];
    instanceProcess.on('message', (message) => {
      if (message.type === 'ready') {
        instanceProcess.removeAllListeners('error');
        resolve(instanceProcess);
      } else if (message.type === 'sent') {
        instanceProcess.sentMessages.push(message);
      } else if (message.type === 'failedToSend') {
        instanceProcess.failedToSendMessages.push(message);
      }
    });
    instanceProcess.instanceName = instanceName;
    this.activeNodeInstanceMap[instanceName] = instanceProcess;
  });
};

InstanceManager.prototype.destroyNodeInstance = function (instanceName) {
  this.activeNodeInstanceMap[instanceName].kill();
  delete this.activeNodeInstanceMap[instanceName];
};

InstanceManager.prototype.destroyAllNodeInstances = function (instanceName) {
  Object.keys(this.activeNodeInstanceMap).forEach((instanceName) => {
    this.destroyNodeInstance(instanceName);
  });
};

module.exports = InstanceManager;
