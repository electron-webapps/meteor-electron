var electronPackager = Meteor.wrapAsync(Npm.require("electron-packager"));
var fs = Npm.require('fs');
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
  // Use a predictable directory so that other scripts can locate the builds, also so that the builds
  // may be cached:
  // TODO(jeff): Use existing binaries if the app hasn't changed.
  var workingDir = path.join(process.env.PWD, '.meteor-electron');
  mkdirp(workingDir);

  //TODO probably want to allow users to add other more unusual
  //architectures if they want (ARM, 32 bit, etc.)
  var platform = "darwin";

  //TODO seed the binaryDir from the package assets

  // *binaryDir* holds the vanilla electron apps
  var binaryDir = path.join(workingDir, "releases");
  mkdirp(binaryDir);

  // *appDir* holds the electron application that points to a meteor app
  var appDir = path.join(workingDir, "apps");
  mkdirp(appDir);

  // *buildDir* contains the uncompressed apps
  var buildDir = path.join(workingDir, "builds");
  mkdirp(buildDir);

  // *finalDir* contains zipped apps ready to be downloaded
  var finalDir = path.join(workingDir, "final");
  mkdirp(finalDir);


  var electronSettings = Meteor.settings.electron || {};
  var appVersion = electronSettings.version;
  var appName = electronSettings.name;

  [
    "autoUpdater.js",
    "main.js",
    "menu.js",
    "package.json",
    "preload.js",
    "proxyWindowEvents.js"
  ].forEach(function(filename) {
    var fileContents = Assets.getText(path.join("app", filename));

    // Replace parameters in `package.json`.
    if (filename === "package.json") {
      var packageJSON = JSON.parse(fileContents);
      if (appVersion) packageJSON.version = appVersion;
      if (appName) {
        packageJSON.name = appName.toLowerCase().replace(/\s/g, '-');
        packageJSON.productName = appName;
      }
      fileContents = JSON.stringify(packageJSON);
    }

    writeFile(path.join(appDir, filename), fileContents);
  });

  //TODO be smarter about caching this..
  exec("npm install", {cwd: appDir});

  var settings = _.defaults({}, electronSettings, {
    rootUrl: process.env.ROOT_URL
  });

  var signingIdentity = electronSettings.sign;
  if (canServeUpdates()) {
    // Enable the auto-updater if possible.
    if ((platform === 'darwin') && !signingIdentity) {
      // If the app isn't signed and we try to use the auto-updater, it will
      // throw an exception.
      console.error('Developer ID signing identity is missing: remote updates will not work.');
    } else {
      settings.updateFeedUrl = settings.rootUrl + UPDATE_FEED_PATH;
    }
  }

  writeFile(path.join(appDir, "electronSettings.json"), JSON.stringify(settings));

  var packagerSettings = {
    dir: appDir,
    name: appName || "Electron",
    platform: platform,
    arch: "x64",
    version: "0.35.4",
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
  if (signingIdentity) {
    packagerSettings.sign = signingIdentity;
  }
  if (electronSettings.protocols) {
    packagerSettings.protocols = electronSettings.protocols;
  }

  var build = electronPackager(packagerSettings)[0];
  console.log("Build created at", build);


  // Package the app for download.
  // TODO(wearhere): make this platform independent

  // Locate the app in a way that's independent of its name (which may have been customized by the user).
  var app = path.join(build, _.find(fs.readdirSync(build), function(file) {
    return /\.app$/.test(file);
  }));

  // The auto-updater framework only supports installing ZIP releases:
  // https://github.com/Squirrel/Squirrel.Mac#update-json-format
  var downloadName = (appName || "app") + ".zip";
  var compressedDownload = path.join(finalDir, downloadName);

  // Use `ditto` to ZIP the app because I couldn't find a good npm module to do it and also that's
  // what a couple of other related projects do:
  // - https://github.com/Squirrel/Squirrel.Mac/blob/8caa2fa2007b29a253f7f5be8fc9f36ace6aa30e/Squirrel/SQRLZipArchiver.h#L24
  // - https://github.com/jenslind/electron-release/blob/4a2a701c18664ec668c3570c3907c0fee72f5e2a/index.js#L109
  exec('ditto -ck --sequesterRsrc --keepParent "' + app + '" "' + compressedDownload + '"');
  console.log("Downloadable created at", compressedDownload);

  return app;
};
