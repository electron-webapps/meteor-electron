var electronPackager = Meteor.wrapAsync(Npm.require("electron-packager"));
var fs = Npm.require('fs');
var os = Npm.require('os');
var mkdirp = Meteor.wrapAsync(Npm.require('mkdirp'));
var path = Npm.require('path');
var proc = Npm.require('child_process');

var writeFile = Meteor.wrapAsync(fs.writeFile);

var exec = Meteor.wrapAsync(function(command, options, callback){
  proc.exec(command, options, function(err, stdout, stderr){
    callback(err, {stdout: stdout, stderr: stderr});
  });
});

createBinaries = function() {
  // TODO(jeff): Use existing binaries if the app hasn't changed.

  var tmpDir = os.tmpdir();

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
  var buildDir = path.join(tmpDir, "electron", "builds");
  mkdirp(buildDir);

  ["main.js", "menu.js", "proxyWindowEvents.js", "preload.js", "package.json"].forEach(function(filename) {
    writeFile(path.join(appDir, filename), Assets.getText(path.join("app", filename)));
  });

  //TODO be smarter about caching this..
  exec("npm install", {cwd: appDir});

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

  var build = electronPackager(packagerSettings)[0];
  console.log("Build created at", build);

  return build;
};
