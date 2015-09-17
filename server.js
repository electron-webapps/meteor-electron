var path = Npm.require('path');
var proc = Npm.require('child_process')
var os = Npm.require('os');
var fs = Npm.require('fs');
var connect = Npm.require('connect');
var mkdirp = Meteor.wrapAsync(Npm.require('mkdirp'));
var electronPackager = Meteor.wrapAsync(Npm.require("electron-packager"));
var serveStatic = Npm.require('serve-static');


var isRunning = Meteor.wrapAsync(Npm.require("is-running"));
var writeFile = Meteor.wrapAsync(fs.writeFile);

var zlib = Npm.require('zlib');
var tar = Npm.require('tar');
var fstream = Npm.require("fstream");

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
 
var buildDir = null;

var createBinaries= function(){
  var tmpDir = os.tmpdir();
  console.log("TMP DIR", tmpDir);
  //TODO probably want to allow users to add other more unusual
  //architectures if they want (ARM, 32 bit, etc.)

  //TODO seed the binaryDir from the package assets

  // *binaryDir* holds the vanilla electron apps
  var binaryDir = path.join(tmpDir, "electron", "releases");
  mkdirp(binaryDir);

  // *appDir* holds the electron application that points to a meteor app
  var appDir = path.join(tmpDir, "electron", "apps");
  mkdirp(appDir);

  // *buildDir* contains the uncompressed apps
  buildDir = path.join(tmpDir, "electron", "builds");
  mkdirp(buildDir);

  // *finalDir* contains zipped apps ready to be downloaded
  finalDir = path.join(tmpDir, "electron", "final");
  mkdirp(finalDir);

  writeFile(path.join(appDir, "main.js"), Assets.getText("app/main.js"));
  writeFile(path.join(appDir, "package.json"), Assets.getText("app/package.json"));
  var settings = _.extend(Meteor.settings, {rootUrl: process.env.ROOT_URL});
  writeFile(path.join(appDir, "electronSettings.json"), JSON.stringify(settings));

  var result = electronPackager({dir: appDir, name: "Electron", platform: "darwin", arch: "x64", version: "0.31.0", out: buildDir, cache: binaryDir, overwrite: true });
  console.log("BUILD CREATED AT", result[0]);

  var compressedDownload = path.join(finalDir, "app-darwin.tar.gz");
  var writer = fstream.Reader({"path": result[0], "type": "Directory"})
  .pipe(tar.Pack())
  .pipe(zlib.Gzip())
  .pipe(fstream.Writer({path: compressedDownload}));
  writer.on("close", function(){
    console.log("Downloadable created at", compressedDownload);
  });
};

var mainJsContents = Assets.getText("app/main.js");
var scriptPath = path.join(os.tmpDir(), "index.js");

createBinaries();

if (process.env.NODE_ENV === 'development'){
  if (ProcessManager.running()){
    // console.log("app is already running");
    return;
  }

  //TODO make this platform independent
  var runnableBuild = path.join(buildDir, "Electron-" + process.platform + "-" + os.arch());
  var electronExecutable = path.join(runnableBuild, "Electron.app", "Contents", "MacOS", "Electron");
  var appDir = path.join(runnableBuild, "Electron.app", "Contents", "Resources", "app");

  //TODO figure out how to handle case where electron executable or
  //app dir don't exist

  var child = proc.spawn(
    electronExecutable, [appDir],
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

var serve = serveStatic(finalDir);

WebApp.rawConnectHandlers.use(function(req, res, next){
  // console.log("REQ", req.url);
  serve(req, res, next)
});
