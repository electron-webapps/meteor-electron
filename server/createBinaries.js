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

var electronSettings = Meteor.settings.electron || {};

var createBuildDirectories = function(build){
  // Use a predictable directory so that other scripts can locate the builds, also so that the builds
  // may be cached:
  // TODO(jeff): Use existing binaries if the app hasn't changed.

  var workingDir = path.join(process.env.PWD, '.meteor-electron', build.platform + "-" + build.arch);
  mkdirp(workingDir);

  //TODO consider seeding the binaryDir from package assets so package
  //could work without an internet connection

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

  return {
    working: workingDir,
    binary: binaryDir,
    app: appDir,
    build: buildDir,
    final: finalDir
  }
}

var packagerSettings = function(buildInfo, dirs){
  var packagerSettings = {
    dir: dirs.app,
    name: electronSettings.name || "Electron",
    platform: buildInfo.platform,
    arch: buildInfo.arch,
    version: "0.35.0",
    out: dirs.build,
    cache: dirs.binary,
    overwrite: true
  };

  if (electronSettings.version) {
    packagerSettings['app-version'] = electronSettings.version;
  }
  if (electronSettings.icon) {
    var icon = platformSpecificSetting(electronSettings.icon, buildInfo.platform);
    if (icon) {
      var iconPath = path.join(process.cwd(), 'assets', 'app', icon);
      packagerSettings.icon = iconPath;
    }
  }
  if (electronSettings.sign) {
    packagerSettings.sign = electronSettings.sign;
  }
  return packagerSettings;
}

/* Entry Point */
createBinaries = function() {
  var result = {};

  if (electronSettings.builds){
    var builds = electronSettings.builds;
  } else {
    //just build for the current platform/architecture
    var builds = [{platform: process.platform, arch: process.arch}];
  }

  builds.forEach(function(buildInfo){
    var buildDirs = createBuildDirectories(buildInfo);

    /* Write out Electron Settings */
    var appVersion = electronSettings.version;
    var appName = electronSettings.name;
    var signingIdentity = electronSettings.sign;

    var settings = _.defaults({}, electronSettings, {
      rootUrl: process.env.ROOT_URL
    });

    if (canServeUpdates()) {
      // Enable the auto-updater if possible.
      if ((buildInfo.platform === 'darwin') && !signingIdentity) {
        // If the app isn't signed and we try to use the auto-updater, it will
        // throw an exception.
        console.error('Developer ID signing identity is missing: remote updates will not work.');
      } else {
        settings.updateFeedUrl = settings.rootUrl + UPDATE_FEED_PATH;
      }
    }
    writeFile(path.join(buildDirs.app, "electronSettings.json"), JSON.stringify(settings));

    /* Write out Electron application files */
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

      writeFile(path.join(buildDirs.app, filename), fileContents);
    });

    //TODO be smarter about caching this..
    exec("npm install", {cwd: buildDirs.app});

    /* Create Build */
    var build = electronPackager(packagerSettings(buildInfo, buildDirs))[0];
    console.log("Build created for ", buildInfo.platform, buildInfo.arch, "at", build);

    /* Package the build for download. */

    // The auto-updater framework only supports installing ZIP releases:
    // https://github.com/Squirrel/Squirrel.Mac#update-json-format
    if (appName){
      var downloadName = appName.toLowercase() + "-" + buildInfo.platform + "-" + buildInfo.arch + ".zip";
    } else {
      var downloadName = "Electron-" + buildInfo.platform + "-" + buildInfo.arch + ".zip";
    }

    var compressedDownload = path.join(buildDirs.final, downloadName);

    // Use `ditto` to ZIP the app because I couldn't find a good npm module to do it and also that's
    // what a couple of other related projects do:
    // - https://github.com/Squirrel/Squirrel.Mac/blob/8caa2fa2007b29a253f7f5be8fc9f36ace6aa30e/Squirrel/SQRLZipArchiver.h#L24
    // - https://github.com/jenslind/electron-release/blob/4a2a701c18664ec668c3570c3907c0fee72f5e2a/index.js#L109
    exec('ditto -ck --sequesterRsrc --keepParent "' + build + '" "' + compressedDownload + '"');
    console.log("Downloadable created at", compressedDownload);
    result[buildInfo.platform + "-" + buildInfo.arch] = build
  });
  return result;
};
