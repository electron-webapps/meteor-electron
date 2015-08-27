var electron = Npm.require('electron-prebuilt')
var path = Npm.require('path');
var proc = Npm.require('child_process')
var os = Npm.require('os');
var fs = Npm.require('fs');
var connect = Npm.require('connect');

var isRunning = Meteor.wrapAsync(Npm.require("is-running"));
var writeFile = Meteor.wrapAsync(fs.writeFile);

Meteor.wrapAsync(Npm.require("is-running"));

var ElectronProcesses = new Meteor.Collection("processes");

var ProcessManager = {
  add: function(pid){
    ElectronProcesses.insert({pid: pid, settings: Meteor.settings.electron});
  },

  running: function(){
    //TODO restrict search based on Meteor.settings.electron
    var isProcessRunning = false;
    ElectronProcesses.find().forEach(function(proc){
      if (isRunning(proc.pid)){
        isProcessRunning = true
      }
      else {
        ElectronProcesses.remove({_id: proc._id});
      }
    });
    return isProcessRunning;
  }
};
 


//HACK fix up path, should use sanjo:meteor-files-helpers
electron = electron.replace(/package-new-[0-9A-z]*\//, "package/");
//console.log("PATH TO ELECGTRON", electron);

var indexJsContents = Assets.getText("index.js");
var scriptPath = path.join(os.tmpDir(), "index.js");

//TODO better way to check if we're in development
if (process.env.NODE_ENV === 'development'){
  writeFile(scriptPath, indexJsContents);

  if (ProcessManager.running()){
    // console.log("app is already running");
    return;
  }


  var child = proc.spawn(
    electron, [scriptPath],
    {env:{METEOR_SETTINGS: JSON.stringify(Meteor.settings),
          ROOT_URL: process.env.ROOT_URL}});

  ProcessManager.add(child.pid);
  child.stdout.on("data", function(data){
    console.log("ATOM:", data.toString());
  });

  child.stderr.on("data", function(data){
    console.log("ATOM:", data.toString());
  });
}


//TODO FOR DEVELOPMENT
//map between Meteor.settings.electron and current process PIDs
//are there any running instances of electron w/ current paremeters?
//yes: then use them
//no:  spawn a new electron instance
//optionally kill all the electrons running w/ old parameters


//TODO FOR PRODUCTION (and maybe development too..)
//on server startup create the donwnloadable apps

//combine Meteor.settings with ROOT_URL and place into each of the unzipped architectures
//zip them back up and put them somewhere..GRID_FS? S3 would be a nice option
//could store in memory, but that's probably not very nice to the hosting providers
//any file system generically available to a Metoer app?

WebApp.rawConnectHandlers.use(function(req, res, next){
  // console.log("INTERCEPTED", req.url);

  if (req.url === "/electron-download/:platform"){
    //find the right platform and return it to the user
   console.log("INITIATE THE ELECTRON DOWNLOAD");
  } else {
    next();
  }
});
