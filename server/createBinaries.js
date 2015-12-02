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

  var electronSettings = Meteor.settings.electron || {};
  var appVersion = electronSettings.version;
  var appName = electronSettings.name;

  ["main.js", "menu.js", "proxyWindowEvents.js", "preload.js", "package.json"].forEach(function(filename) {
    var fileContents = Assets.getText(path.join("app", filename));

    // Replace parameters in `package.json`.
    if (filename === "package.json") {
      var packageJSON = JSON.parse(fileContents);
      if (appVersion) packageJSON.version = appVersion;
      if (appName) {
        packageJSON.name = appName.toLowerCase();
        packageJSON.productName = appName;
      }
      fileContents = JSON.stringify(packageJSON);
    }

    writeFile(path.join(appDir, filename), fileContents);
  });

  //TODO be smarter about caching this..
  exec("npm install", {cwd: appDir});

  var settings = _.defaults({}, electronSettings, {
    rootUrl: process.env.APP_ROOT_URL || process.env.ROOT_URL
  });
  writeFile(path.join(appDir, "electronSettings.json"), JSON.stringify(settings));

  var packagerSettings = {
    dir: appDir,
    name: appName || "Electron",
    platform: "darwin",
    arch: "x64",
    version: "0.35.0",
    out: buildDir,
    cache: binaryDir,
    overwrite: true
  };
  if (appVersion) {
    packagerSettings['app-version'] = appVersion;
  }
  if (electronSettings.icon) {
    var icon = platformSpecificSetting(electronSettings.icon);
    if (icon) {
      var iconPath = path.join(process.cwd(), 'assets', 'app', icon);
      packagerSettings.icon = iconPath;
    }
  }

  var build = electronPackager(packagerSettings)[0];
  console.log("Build created at", build);

  return build;
};
