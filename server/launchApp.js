var isRunning = Meteor.wrapAsync(Npm.require("is-running"));
var path = Npm.require('path');
var proc = Npm.require('child_process');

var ElectronProcesses = new Mongo.Collection("processes");

var ProcessManager = {
  add: function(pid){
    if (pid) ElectronProcesses.insert({ pid: pid });
  },

  isRunning: function() {
    var running = false;
    ElectronProcesses.find().forEach(function(proc){
      if (isRunning(proc.pid)) {
        running = true;
      } else {
        ElectronProcesses.remove({ _id: proc._id });
      }
    });
    return running;
  },

  stopAll: function() {
    ElectronProcesses.find().forEach(function(proc){
      isRunning(proc.pid) && process.kill(proc.pid);
      ElectronProcesses.remove({ pid: proc.pid });
    });
  }
};

launchApp = function(buildResult) {
  // Safeguard.
  if (process.env.NODE_ENV !== 'development') return;

  var isRunning = ProcessManager.isRunning();
  // if a process is running and something triggered a rebuild, close the app
  if (isRunning && buildResult.buildRequired) {
    ProcessManager.stopAll();
    isRunning = false;
  }

  // only start a process if no other process is currently running
  if (isRunning) return;
  var child;
  if (process.platform === 'win32') {
    child = proc.spawn(buildResult.electronExecutable);
  } else {
    var appDir = path.join(buildResult.app, "Contents", "Resources", "app");

    //TODO figure out how to handle case where electron executable or
    //app dir don't exist

    child = proc.spawn(buildResult.electronExecutable, [appDir]);
  }

  child.stdout.on("data", function(data){
    console.log("ATOM:", data.toString());
  });

  child.stderr.on("data", function(data){
    console.log("ATOM:", data.toString());
  });

  ProcessManager.add(child.pid);
};
