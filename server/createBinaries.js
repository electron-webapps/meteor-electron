var electronPackager = Meteor.wrapAsync(Npm.require("electron-packager"));
var fs = Npm.require('fs');
var mkdirp = Meteor.wrapAsync(Npm.require('mkdirp'));
var ncp = Meteor.wrapAsync(Npm.require('ncp'));
var path = Npm.require('path');
var proc = Npm.require('child_process');
var dirsum = Meteor.wrapAsync(Npm.require('lucy-dirsum'));
var readFile = Meteor.wrapAsync(fs.readFile);
var writeFile = Meteor.wrapAsync(fs.writeFile);
var stat = Meteor.wrapAsync(fs.stat);

var exec = Meteor.wrapAsync(function(command, options, callback){
  proc.exec(command, options, function(err, stdout, stderr){
    callback(err, {stdout: stdout, stderr: stderr});
  });
});

var exists = function(path) {
  try {
    stat(path);
    return true;
  } catch(e) {
    return false;
  }
};

createBinaries = function() {
  var buildRequired = false;

  // Use a predictable directory so that other scripts can locate the builds, also so that the builds
  // may be cached:
  // TODO(jeff): Use existing binaries if the app hasn't changed.
  var workingDir = path.join(process.env.PWD, '.meteor-electron');
  mkdirp(workingDir);

  //TODO probably want to allow users to add other more unusual
  //architectures if they want (ARM, 32 bit, etc.)
  var platform = "darwin";
  var arch = "x64";

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

  var resolvedAppSrcDir;
  if (electronSettings.appSrcDir) {
    resolvedAppSrcDir = path.join(process.env.PWD, 'private', electronSettings.appSrcDir);
  } else {
    // See http://stackoverflow.com/a/29745318/495611 for how the package asset directory is derived.
    // We can't read this from the project directory like the user-specified app directory since
    // we may be loaded from Atmosphere rather than locally.
    resolvedAppSrcDir = path.join('assets', 'packages', 'quark_electron', 'app');
  }

  if (appHasChanged(resolvedAppSrcDir, workingDir)) {
    buildRequired = true;

    var packagePath = packageJSONPath(resolvedAppSrcDir);
    var packageJSON = Npm.require(packagePath);

    // If we're using the default package.json, replace its parameters (note: before the comparison).
    var didReplacePackageParameters = false;
    if (!electronSettings.appSrcDir) {
      if (appVersion) packageJSON.version = appVersion;
      if (appName) {
        packageJSON.name = appName.toLowerCase().replace(/\s/g, '-');
        packageJSON.productName = appName;
      }
      didReplacePackageParameters = true;
    }

    // Record whether `package.json` has changed before overwriting it.
    var packageHasChanged = packageJSONHasChanged(packageJSON, appDir);

    // Ensure that the directory ends in a slash so that we copy its contents.
    // TODO(wearhere): Platform independence.
    ncp(path.join(resolvedAppSrcDir, '/'), appDir);

    // If we replaced the package parameters, update it in the app dir since we just overwrote it.
    if (didReplacePackageParameters) {
      writeFile(packageJSONPath(appDir), JSON.stringify(packageJSON));
    }
    if (packageHasChanged) {
      exec("npm install", {cwd: appDir});
    }
  }

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

  if (settingsHaveChanged(settings, appDir)) {
    buildRequired = true;
    writeFile(settingsPath(appDir), JSON.stringify(settings));
  }

  var packagerSettings = {
    dir: appDir,
    name: appName || "Electron",
    platform: platform,
    arch: arch,
    version: "0.36.0",
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
      var iconPath = path.join(process.env.PWD, 'private', icon);
      packagerSettings.icon = iconPath;
      if (iconHasChanged(iconPath, workingDir)) {
        buildRequired = true;
      }
    }
  }
  if (signingIdentity) {
    // TODO(wearhere): If/when the signing identity expires, does its name change? If not, we'll need
    // to force the app to be rebuilt somehow.
    packagerSettings.sign = signingIdentity;
  }
  if (electronSettings.protocols) {
    packagerSettings.protocols = electronSettings.protocols;
  }

  if (packagerSettingsHaveChanged(packagerSettings, workingDir)) {
    buildRequired = true;
  }

  var app = appPath(appName, platform, arch, buildDir);
  if (!exists(app)) {
    buildRequired = true;
  }

  if (buildRequired) {
    var build = electronPackager(packagerSettings)[0];
    console.log("Build created at", build);
  }

  // Package the app for download.
  // TODO(wearhere): make this platform independent

  // The auto-updater framework only supports installing ZIP releases:
  // https://github.com/Squirrel/Squirrel.Mac#update-json-format
  var downloadName = (appName || "app") + ".zip";
  var compressedDownload = path.join(finalDir, downloadName);

  if (buildRequired || !exists(compressedDownload)) {
    // Use `ditto` to ZIP the app because I couldn't find a good npm module to do it and also that's
    // what a couple of other related projects do:
    // - https://github.com/Squirrel/Squirrel.Mac/blob/8caa2fa2007b29a253f7f5be8fc9f36ace6aa30e/Squirrel/SQRLZipArchiver.h#L24
    // - https://github.com/jenslind/electron-release/blob/4a2a701c18664ec668c3570c3907c0fee72f5e2a/index.js#L109
    exec('ditto -ck --sequesterRsrc --keepParent "' + app + '" "' + compressedDownload + '"');
    console.log("Downloadable created at", compressedDownload);
  }

  return {
    app: app,
    buildRequired: buildRequired
  };
};

function settingsPath(appDir) {
  return path.join(appDir, 'electronSettings.json');
}

function settingsHaveChanged(settings, appDir) {
  var electronSettingsPath = settingsPath(appDir);
  var existingElectronSettings;
  try {
    existingElectronSettings = Npm.require(electronSettingsPath);
  } catch(e) {
    // No existing settings.
  }
  return !existingElectronSettings || !_.isEqual(settings, existingElectronSettings);
}

function appHasChanged(appSrcDir, workingDir) {
  var appChecksumPath = path.join(workingDir, 'appChecksum.txt');
  var existingAppChecksum;
  try {
    existingAppChecksum = readFile(appChecksumPath, 'utf8');
  } catch(e) {
    // No existing checksum.
  }

  var appChecksum = dirsum(appSrcDir);
  if (appChecksum !== existingAppChecksum) {
    writeFile(appChecksumPath, appChecksum);
    return true;
  } else {
    return false;
  }
}

function packageJSONPath(appDir) {
  return path.join(appDir, 'package.json');
}

function packageJSONHasChanged(packageJSON, appDir) {
  var packagePath = packageJSONPath(appDir);
  var existingPackageJSON;
  try {
    existingPackageJSON = Npm.require(packagePath);
  } catch(e) {
    // No existing package.
  }

  return !existingPackageJSON || !_.isEqual(packageJSON, existingPackageJSON);
}

function packagerSettingsHaveChanged(settings, workingDir) {
  var settingsPath = path.join(workingDir, 'lastUsedPackagerSettings.json');
  var existingPackagerSettings;
  try {
    existingPackagerSettings = Npm.require(settingsPath);
  } catch(e) {
    // No existing settings.
  }

  if (!existingPackagerSettings || !_.isEqual(settings, existingPackagerSettings)) {
    writeFile(settingsPath, JSON.stringify(settings));
    return true;
  } else {
    return false;
  }
}

function iconHasChanged(iconPath, workingDir) {
  var iconChecksumPath = path.join(workingDir, 'iconChecksum.txt');
  var existingIconChecksum;
  try {
    existingIconChecksum = readFile(iconChecksumPath, 'utf8');
  } catch(e) {
    // No existing checksum.
  }

  // `dirsum` works for files too.
  var iconChecksum = dirsum(iconPath);
  if (iconChecksum !== existingIconChecksum) {
    writeFile(iconChecksumPath, iconChecksum);
    return true;
  } else {
    return false;
  }
}

function appPath(appName, platform, arch, buildDir) {
  return path.join(buildDir, [appName, platform, arch].join('-'), appName + '.app');
}
