var path = Npm.require('path');
var proc = Npm.require('child_process')
var os = Npm.require('os');
var fs = Npm.require('fs');
var connect = Npm.require('connect');
var mkdirp = Meteor.wrapAsync(Npm.require('mkdirp'));
var electronPackager = Meteor.wrapAsync(Npm.require("electron-packager"));
var serveStatic = Npm.require('serve-static');

var exec = Meteor.wrapAsync(function(command, options, callback){
  proc.exec(command, options, function(err, stdout, stderr){
    callback(err, {stdout: stdout, stderr: stderr});
  });
});

var isRunning = Meteor.wrapAsync(Npm.require("is-running"));
var writeFile = Meteor.wrapAsync(fs.writeFile);

var zlib = Npm.require('zlib');
var tar = Npm.require('tar');
var fstream = Npm.require("fstream");

Meteor.wrapAsync(Npm.require("is-running"));

function platformSpecificSetting(settings) {
  switch (process.platform) {
    case 'darwin':
      return settings.osx;
  }
}


var build = null;
var name = null;

function createBinaries() {
  // TODO(jeff): Use existing binaries if the app hasn't changed.

  var tmpDir = os.tmpdir();
  // *finalDir* contains zipped apps ready to be downloaded
  var finalDir = path.join(tmpDir, "electron", "final");
  mkdirp(finalDir);
  var buildDir = null;


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

  writeFile(path.join(appDir, "main.js"), Assets.getText("app/main.js"));
  writeFile(path.join(appDir, "package.json"), Assets.getText("app/package.json"));

  //TODO be smarter about caching this..
  var result = exec("npm install", {cwd: appDir});

  var settings = _.defaults({}, Meteor.settings.electron, {
    rootUrl: process.env.APP_ROOT_URL || process.env.ROOT_URL
  });
  writeFile(path.join(appDir, "electronSettings.json"), JSON.stringify(settings));

  var packagerSettings = {
    dir: appDir,
    name: "Electron",
    platform: "darwin",
    arch: "x64",
    version: "0.35.0",
    out: buildDir,
    cache: binaryDir,
    overwrite: true
  };
  if (Meteor.settings.electron) {
    if (Meteor.settings.electron.name) {
      packagerSettings.name = Meteor.settings.electron.name;
    }

    if (Meteor.settings.electron.icon) {
      var icon = platformSpecificSetting(Meteor.settings.electron.icon);
      if (icon) {
        var iconPath = path.join(process.cwd(), 'assets', 'app', icon);
        packagerSettings.icon = iconPath;
      }
    }
  }
  name = packagerSettings.name;


  build = electronPackager(packagerSettings)[0];
  console.log("Build created at", build);

  var compressedDownload = path.join(finalDir, "app-darwin.tar.gz");
  var writer = fstream.Reader({"path": build, "type": "Directory"})
  .pipe(tar.Pack())
  .pipe(zlib.Gzip())
  .pipe(fstream.Writer({path: compressedDownload}));
  writer.on("close", function(){
    console.log("Downloadable created at", compressedDownload);
  });


  var serve = serveStatic(finalDir);

  if (Package["iron:router"]){
    Package["iron:router"].Router.route("/app-darwin.tar.gz", function(){
      serve(this.request, this.response);
    }, {where: "server"});
  } else {
  //console.log("iron router not found, using WebApp.rawConnectHandlers
    WebApp.rawConnectHandlers.use(function(req, res, next){
      serve(req, res, next);
    });
  }
}

if (process.env.ELECTRON_AUTO_BUILD !== 'false') {
  createBinaries();
}

if (build && (process.env.NODE_ENV === 'development')){
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
          isProcessRunning = true
        }
        else {
          ElectronProcesses.remove({_id: proc._id});
        }
      });
      return isProcessRunning;
    }
  };

  if (ProcessManager.running()){
    // console.log("app is already running");
    return;
  }

  //TODO make this platform independent
  var electronExecutable = path.join(build, name + ".app", "Contents", "MacOS", "Electron");
  var appDir = path.join(build, name + ".app", "Contents", "Resources", "app");

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
}
