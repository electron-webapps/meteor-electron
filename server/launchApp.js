var isRunning = Meteor.wrapAsync(Npm.require("is-running"));
var fs = Npm.require('fs');
var path = Npm.require('path');
var proc = Npm.require('child_process');

var ElectronProcesses = new Mongo.Collection("processes");

var ProcessManager = {
  add: function(pid){
    ElectronProcesses.insert({pid: pid, settings: Meteor.settings.electron});
  },

  running: function(){
    //TODO restrict search based on Meteor.settings.electron
    var isProcessRunning = false;
    ElectronProcesses.find().forEach(function(proc){
      if (isRunning(proc.pid)){
        isProcessRunning = true;
      }
      else {
        ElectronProcesses.remove({_id: proc._id});
      }
    });
    return isProcessRunning;
  }
};

launchApp = function(build) {
  // Safeguard.
  if (process.env.NODE_ENV !== 'development') return;

  if (ProcessManager.running()){
    // console.log("app is already running");
    return;
  }

  //TODO make this platform independent

  // Locate the app in a way that's independent of its name (which may have been customized by the user).
  var app = _.find(fs.readdirSync(build), function(file) {
    return /\.app$/.test(file);
  });
  var electronExecutable = path.join(build, app, "Contents", "MacOS", "Electron");
  var appDir = path.join(build, app, "Contents", "Resources", "app");

  //TODO figure out how to handle case where electron executable or
  //app dir don't exist

  var child = proc.spawn(electronExecutable, [appDir]);
  child.stdout.on("data", function(data){
    console.log("ATOM:", data.toString());
  });

  child.stderr.on("data", function(data){
    console.log("ATOM:", data.toString());
  });

  ProcessManager.add(child.pid);
};
