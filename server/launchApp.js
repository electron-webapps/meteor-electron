var isRunning = Meteor.wrapAsync(Npm.require("is-running"));
var path = Npm.require('path');
var proc = Npm.require('child_process');

var ElectronProcesses = new Mongo.Collection("processes");

var ProcessManager = {
  add: function(pid){
    if (pid) ElectronProcesses.insert({ pid: pid });
  },

  running: function(){
    var runningProcess;
    ElectronProcesses.find().forEach(function(proc){
      if (proc.pid && isRunning(proc.pid)) {
        runningProcess = proc.pid;
      } else {
        ElectronProcesses.remove({ _id: proc._id });
      }
    });
    return runningProcess;
  },

  stop: function(pid) {
    process.kill(pid);
    ElectronProcesses.remove({ pid: pid });
  }
};

launchApp = function(buildResult) {
  // Safeguard.
  if (process.env.NODE_ENV !== 'development' || !buildResult.buildRequired) return;

  var runningProcess = ProcessManager.running();
  if (runningProcess) {
      ProcessManager.stop(runningProcess);
  }

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
