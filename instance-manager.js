let childProcess = require('child_process');
let exec = childProcess.exec;
let fork = childProcess.fork;
let uuid = require('uuid');

function InstanceManager(config) {
  this.config = config;
  this.activeDockerInstanceList = [];
  this.activeNodeInstanceMap = {};
}

InstanceManager.prototype.launchSCCInstance = function (instanceType, externalPort, instanceName) {
  let instanceTypeConfig = this.config[instanceType];
  return new Promise((resolve, reject) => {
    exec(`docker run -d -p ${externalPort}:${instanceTypeConfig.internalContainerPort} --name ${instanceName} ${instanceTypeConfig.imageName}:${instanceTypeConfig.versionTag}`, (err) => {
      if (err) {
        reject(err);
      } else {
        this.activeDockerInstanceList.push(instanceName);
        resolve();
      }
    });
  });
};

InstanceManager.prototype.stopSCCInstance = function (instanceName) {
  return new Promise((resolve, reject) => {
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

InstanceManager.prototype.generateRandomSCCInstanceName = function (instanceType) {
  return `scc-${instanceType}-` + uuid.v4();
};

InstanceManager.prototype.launchSubscriberNodeInstance = function (instanceName, options) {
  let optionsString = JSON.stringify(options || {});
  let args = ['--options', optionsString];
  return new Promise((resolve, reject) => {
    this.activeNodeInstanceMap[instanceName] = fork(this.config.subscriberInstancePath, args, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

InstanceManager.prototype.launchPublisherNodeInstance = function (instanceName, options) {
  let optionsString = JSON.stringify(options || {});
  let args = ['--options', optionsString];
  return new Promise((resolve, reject) => {
    this.activeNodeInstanceMap[instanceName] = fork(this.config.publisherInstancePath, args, (err) => {
      if (err) {
        reject(err);
      } else {
        this.activeNodeInstanceMap.push(instanceName);
        resolve();
      }
    });
  });
};

InstanceManager.prototype.destroyNodeInstance = function (instanceName) {
  this.activeNodeInstanceMap[instanceName].kill();
};

module.exports = InstanceManager;
