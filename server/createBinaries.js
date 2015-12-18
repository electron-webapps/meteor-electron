var electronPackager = Meteor.wrapAsync(Npm.require("electron-packager"));
var fs = Npm.require('fs');
var mkdirp = Meteor.wrapAsync(Npm.require('mkdirp'));
var path = Npm.require('path');
var proc = Npm.require('child_process');
var dirsum = Meteor.wrapAsync(Npm.require('lucy-dirsum'));
var readFile = Meteor.wrapAsync(fs.readFile);
var writeFile = Meteor.wrapAsync(fs.writeFile);
var rmFile = Meteor.wrapAsync(fs.unlink);
var stat = Meteor.wrapAsync(fs.stat);
var util = Npm.require('util');
var rimraf = Meteor.wrapAsync(Npm.require('rimraf'));
var ncp = Meteor.wrapAsync(Npm.require('ncp'));

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

var projectRoot = function(){
  if (process.platform === "win32"){
    return process.env.METEOR_SHELL_DIR.split(".meteor")[0];
  } else {
    return process.env.PWD;
  }
}

var electronSettings = Meteor.settings.electron || {};

var IS_MAC = (process.platform === 'darwin');

/* Entry Point */
createBinaries = function() {
  var results = {};
  var builds;
  if (electronSettings.builds){
    builds = electronSettings.builds;
  } else {
    //just build for the current platform/architecture
    // TODO(wearhere): Re-enable this once https://github.com/rissem/meteor-electron/issues/39 is
    // fixed.
    // builds = [{platform: process.platform, arch: process.arch}];
    console.error('You must specify one or more builds in Meteor.settings.electron.');
    return results;
  }

  // Filter builds by platform (see reasoning in README).
  builds = _.filter(builds, function(buildInfo) {
    return buildInfo.platform === process.platform;
  });

  if (_.isEmpty(builds)) {
    console.error('No builds available for this platform.');
    return results;
  }

  builds.forEach(function(buildInfo){
    var buildRequired = false;

    var buildDirs = createBuildDirectories(buildInfo);

    /* Write out Electron application files */
    var appVersion = electronSettings.version;
    var appName = electronSettings.name || "electron";
    var appDescription = electronSettings.description;

    var resolvedAppSrcDir;
    if (electronSettings.appSrcDir) {
      resolvedAppSrcDir = path.join(projectRoot(), 'private', electronSettings.appSrcDir);
    } else {
      // See http://stackoverflow.com/a/29745318/495611 for how the package asset directory is derived.
      // We can't read this from the project directory like the user-specified app directory since
      // we may be loaded from Atmosphere rather than locally.
      resolvedAppSrcDir = path.join(process.cwd(), 'assets', 'packages', 'quark_electron', 'app');
    }

    if (appHasChanged(resolvedAppSrcDir, buildDirs.working)) {
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
        if (appDescription){
          packageJSON.description = appDescription;
        }
        didReplacePackageParameters = true;
      }

      // Record whether `package.json` has changed before overwriting it.
      var packageHasChanged = packageJSONHasChanged(packageJSON, buildDirs.app);

      // Copy the app directory over while also pruning old files.
       if (IS_MAC) {
        // Ensure that the app source directory ends in a slash so we copy its contents.
        // Except node_modules from pruning since we prune that below.
        // TODO(wearhere): `rsync` also uses checksums to only copy what's necessary so theoretically we
        // could always `rsync` rather than checking if the directory's changed first.
         exec(util.format('rsync -a --delete --force --filter="P node_modules" "%s" "%s"',
          path.join(resolvedAppSrcDir, '/'), buildDirs.app));
      } else {
        // TODO(wearhere): More efficient sync on Windows (where `rsync` isn't available.)
        rimraf(buildDirs.app);
        mkdirp(buildDirs.app);
        ncp(resolvedAppSrcDir, buildDirs.app);
      }

      // If we replaced the package parameters, update it in the app dir since we just overwrote it.
      if (didReplacePackageParameters) {
        //for some reason when this file isn't manually removed it
        //fails to be overwritten with an EACCES error
        rimraf(packageJSONPath(buildDirs.app));
        writeFile(packageJSONPath(buildDirs.app), JSON.stringify(packageJSON));
      }
      if (packageHasChanged || !IS_MAC) {
        exec("npm install && npm prune", {cwd: buildDirs.app});
      }
    }

    /* Write out Electron Settings */
    var settings = _.defaults({}, electronSettings, {
      rootUrl: process.env.ROOT_URL
    });

    var signingIdentity = electronSettings.sign;
    var signingIdentityRequiredAndMissing = false;
    if (canServeUpdates(buildInfo.platform)) {
      // Enable the auto-updater if possible.
      if ((buildInfo.platform === 'darwin') && !signingIdentity) {
        // If the app isn't signed and we try to use the auto-updater, it will
        // throw an exception. Log an error if the settings have changed, below.
        signingIdentityRequiredAndMissing = true;
      } else {
        settings.updateFeedUrl = settings.rootUrl + UPDATE_FEED_PATH;
      }
    }

    if (settingsHaveChanged(settings, buildDirs.app)) {
      if (signingIdentityRequiredAndMissing) {
        console.error('Developer ID signing identity is missing: remote updates will not work.');
      }
      buildRequired = true;
      writeFile(settingsPath(buildDirs.app), JSON.stringify(settings));
    }

    var packagerSettings = getPackagerSettings(buildInfo, buildDirs);
    if (packagerSettings.icon && iconHasChanged(packagerSettings.icon, buildDirs.working)) {
      buildRequired = true;
    }

    // TODO(wearhere): If/when the signing identity expires, does its name change? If not, we'll need
    // to force the app to be rebuilt somehow.

    if (packagerSettingsHaveChanged(packagerSettings, buildDirs.working)) {
      buildRequired = true;
    }

    var app = appPath(appName, buildInfo.platform, buildInfo.arch, buildDirs.build);
    if (!exists(app)) {
      buildRequired = true;
    }

    /* Create Build */
    if (buildRequired) {
      var build = electronPackager(packagerSettings)[0];
      console.log("Build created for ", buildInfo.platform, buildInfo.arch, "at", build);
    }

    /* Package the build for download. */
    // TODO(rissem): make this platform independent

    if (buildInfo.platform === 'darwin') {
      // The auto-updater framework only supports installing ZIP releases:
      // https://github.com/Squirrel/Squirrel.Mac#update-json-format
      var downloadName = (appName || "app") + ".zip";
      var compressedDownload = path.join(buildDirs.final, downloadName);

      if (buildRequired || !exists(compressedDownload)) {
        // Use `ditto` to ZIP the app because I couldn't find a good npm module to do it and also that's
        // what a couple of other related projects do:
        // - https://github.com/Squirrel/Squirrel.Mac/blob/8caa2fa2007b29a253f7f5be8fc9f36ace6aa30e/Squirrel/SQRLZipArchiver.h#L24
        // - https://github.com/jenslind/electron-release/blob/4a2a701c18664ec668c3570c3907c0fee72f5e2a/index.js#L109
        exec('ditto -ck --sequesterRsrc --keepParent "' + app + '" "' + compressedDownload + '"');
        console.log("Downloadable created at", compressedDownload);
      }
    }

    results[buildInfo.platform + "-" + buildInfo.arch] = {
      app: app,
      buildRequired: buildRequired
    };
  });

  return results;
};

function createBuildDirectories(build){
  // Use a predictable directory so that other scripts can locate the builds, also so that the builds
  // may be cached:

  var workingDir = path.join(projectRoot(), '.meteor-electron', build.platform + "-" + build.arch);
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
  };
}

function getPackagerSettings(buildInfo, dirs){
  var packagerSettings = {
    dir: dirs.app,
    name: electronSettings.name || "Electron",
    platform: buildInfo.platform,
    arch: buildInfo.arch,
    version: "0.36.0",
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
      var iconPath = path.join(projectRoot(), 'private', icon);
      packagerSettings.icon = iconPath;
    }
  }
  if (electronSettings.sign) {
    packagerSettings.sign = electronSettings.sign;
  }
  if (electronSettings.protocols) {
    packagerSettings.protocols = electronSettings.protocols;
  }
  return packagerSettings;
}

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
