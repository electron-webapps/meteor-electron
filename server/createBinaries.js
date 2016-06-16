var electronPackager = Meteor.wrapAsync(Npm.require("electron-packager"));
var electronRebuild = Npm.require('electron-rebuild');
var fs = Npm.require('fs');
var mkdirp = Meteor.wrapAsync(Npm.require('mkdirp'));
var path = Npm.require('path');
var proc = Npm.require('child_process');
var dirsum = Meteor.wrapAsync(Npm.require('lucy-dirsum'));
var readFile = Meteor.wrapAsync(fs.readFile);
var writeFile = Meteor.wrapAsync(fs.writeFile);
var stat = Meteor.wrapAsync(fs.stat);
var util = Npm.require('util');
var rimraf = Meteor.wrapAsync(Npm.require('rimraf'));
var ncp = Meteor.wrapAsync(Npm.require('ncp'));
var url = Npm.require('url');
const async = Npm.require('async');

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
};

var ELECTRON_VERSION = '0.36.7';

// Make a deep clone of Meteor.settings.electron to keep that unmodified
var electronSettings = JSON.parse(JSON.stringify(Meteor.settings.electron)) || {};

var IS_MAC = (process.platform === 'darwin');
var IS_WIN = (process.platform === 'win32');
var IS_LINUX = (process.platform === 'linux');

/* Entry Point */
createBinaries = function() {
  var results = {};
  var builds;
  if (electronSettings.builds){
    builds = electronSettings.builds;
  } else {
    //just build for the current platform/architecture
    if (IS_MAC || IS_LINUX) {
      builds = [{platform: process.platform, arch: process.arch}];
    } else if (IS_WIN) {
      //arch detection doesn't always work on windows, and ia32 works everywhere
      builds = [{platform: process.platform, arch: "ia32"}];
    } else {
      console.error('You must specify one or more builds in Meteor.settings.electron.');
      return results;
    }
  }

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
    var appNameSanitized = appName.toLowerCase().replace(/\s/g, '-');
    var appDescription = electronSettings.description;

    var resolvedAppSrcDir;
    if (electronSettings.appSrcDir) {
      resolvedAppSrcDir = path.join(projectRoot(), electronSettings.appSrcDir);
    } else {
      // See http://stackoverflow.com/a/29745318/495611 for how the package asset directory is derived.
      // We can't read this from the project directory like the user-specified app directory since
      // we may be loaded from Atmosphere rather than locally.
      resolvedAppSrcDir = path.join(process.cwd(), 'assets', 'packages', 'meson_electron', 'app');
    }

    // Check if the package.json has changed before copying over the app files, to account for
    // changes made in the app source dir.
    var packagePath = packageJSONPath(resolvedAppSrcDir);
    var packageJSON = Npm.require(packagePath);

    // Fill in missing package.json fields (note: before the comparison).
    // This isn't just a convenience--`Squirrel.Windows` requires the description and version.
    packageJSON = _.defaults(packageJSON, {
      description: appDescription,
      version: appVersion
    });
    packageJSON = _.extend(packageJSON, {
      name: appNameSanitized,
      productName: appName
    });

    // Check if the package has changed before we possibly copy over the app source since that will
    // of course sync `package.json`.
    var packageHasChanged = packageJSONHasChanged(packageJSON, buildDirs.app);

    var didOverwriteNodeModules = false;

    if (appHasChanged(resolvedAppSrcDir, buildDirs.working)) {
      buildRequired = true;

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
        didOverwriteNodeModules = true;
      }
    }

    if (buildInfo.platform === 'linux') {
      // TODO: Replace with automation-stack/electron-sudo when merged the pull request
      // https://github.com/automation-stack/electron-sudo/pull/14
      packageJSON.dependencies['electron-sudo'] = 'cgalvarez/electron-sudo';
      packageJSON.dependencies['request'] = '^2.72.0';
    }

    /* Write out the application package.json */
    // Do this after writing out the application files, since that will overwrite `package.json`.
    // This logic is a little bit inefficient: it's not the case that _every_ change to package.json
    // means that we have to reinstall the node modules; and if we overwrote the node modules, we
    // don't necessarily have to rewrite `package.json`. But doing it altogether is simplest.
    if (packageHasChanged || didOverwriteNodeModules) {
      buildRequired = true;

      // For some reason when this file isn't manually removed it fails to be overwritten with an
      // EACCES error.
      rimraf(packageJSONPath(buildDirs.app));
      writeFile(packageJSONPath(buildDirs.app), JSON.stringify(packageJSON));

      exec("npm install && npm prune", {cwd: buildDirs.app});

      // Rebuild native modules if any.
      // TODO(jeff): Start using the pre-gyp fix if someone asks for it, so we can make sure it works:
      // https://github.com/electronjs/electron-rebuild#node-pre-gyp-workaround
      Promise.await(electronRebuild.installNodeHeaders(ELECTRON_VERSION, null /* nodeDistUrl */,
        null /* headersDir */, buildInfo.arch));
      Promise.await(electronRebuild.rebuildNativeModules(ELECTRON_VERSION,
        path.join(buildDirs.app, 'node_modules'), null /* headersDir */, buildInfo.arch));
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
        settings.updateFeedUrl = url.resolve(settings.rootUrl, UPDATE_FEED_PATH);
      }
    }

    if (buildInfo.platform === 'linux') {
      // Bundle the app icon(s) inside app/resources and set relative paths for BrowserWindow
      var iconFiles = {};
      if (electronSettings.icon && electronSettings.icon.linux) {
        if (_.isObject(electronSettings.icon.linux)) {
          iconFiles = electronSettings.icon.linux;
        } else if (_.isString(electronSettings.icon.linux)) {
          iconFiles.unique = electronSettings.icon.linux;
        }
      }
      if (!_.isEmpty(iconFiles)) {
        const fse = Npm.require('fs-extra');
        const appResDir = path.resolve(buildDirs.app, './resources');
        const projRoot = projectRoot(); // cache value
        fse.mkdirpSync(appResDir);
        _.each(iconFiles, function(filepath, resolution, list) {
          try {
            var from = path.resolve(projRoot, filepath);
            var to = path.resolve(projRoot, path.join(appResDir, path.basename(filepath)));
            settings.icon.linux[resolution] = path.relative(buildDirs.app, to);
            fse.copySync(from, to);
          } catch (err) {
            console.error(err);
          }
        });
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

    var app = appPath(appNameSanitized, buildInfo.platform, buildInfo.arch, buildDirs.build);
    if (!exists(app)) {
      buildRequired = true;
    }

    /* Create Build */
    var build;
    if (buildRequired) {
      build = electronPackager(packagerSettings)[0];
      console.log("Build created for", buildInfo.platform, buildInfo.arch, "at", build);
    }

    /* Package the build for download if specified. */
    // TODO(rissem): make this platform independent
    if (electronSettings.autoPackage && (buildInfo.platform === 'linux')) {
      if (IS_LINUX) {
        var setup = {
          build: build,
          dirs: buildDirs,
          info: buildInfo,
          name: appName,
          options: (electronSettings.installer && electronSettings.installer.linux)
            ? electronSettings.installer.linux : {},
          // icon paths must be relative to project root or absolute, so use those provided by user
          settings: _.defaults({icon: Meteor.settings.electron.icon}, settings)
        };
        buildInstallersFromLinux(setup);
      } else {
        console.error('At this moment only linux builds from linux are supported.');
      }
    }

    if (electronSettings.autoPackage && (buildInfo.platform === 'darwin')) {
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
    name: electronSettings.name ? electronSettings.name.toLowerCase().replace(/\s/g, '-') : 'Electron',
    platform: buildInfo.platform,
    arch: buildInfo.arch,
    version: ELECTRON_VERSION,
    out: dirs.build,
    cache: dirs.binary,
    overwrite: true,
    // The EXE's `ProductName` is the preferred title of application shortcuts created by `Squirrel.Windows`.
    // If we don't set it, it will default to "Electron".
    'version-string': {
      ProductName: electronSettings.name || 'Electron'
    }
  };

  if (electronSettings.version) {
    packagerSettings['app-version'] = electronSettings.version;
  }
  // electron-packager does not require this setting when building for linux
  // See https://github.com/electron-userland/electron-packager/blob/master/docs/api.md#icon
  if (electronSettings.icon && buildInfo.platform !== 'linux') {
    var icon = electronSettings.icon[buildInfo.platform];
    if (icon) {
      packagerSettings.icon = path.resolve(projectRoot(), icon);
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
  var appExtension = (platform === 'darwin') ? '.app' : '.exe';
  return path.join(buildDir, [appName, platform, arch].join('-'), appName + appExtension);
}

function buildInstallersFromLinux(setup) {
  const lsbRelease = Npm.require('bizzby-lsb-release');
  const distro = lsbRelease().distributorID.toLowerCase();
  var deps = {'deb': [], 'rpm': []};

  // Get the required packages based upon current os family distributor ID
  // (rely on the command lsb_release through the npm package bizzby-lsb-release)
  // See https://gist.github.com/natefoo/814c5bf936922dad97ff
  switch (distro) {
    // rpm based distros
    case 'arch':
    case 'centos':
    case 'fedora':
    case 'gentoo':
    case 'opensuse project':
    case 'redhat':
    case 'redhatenterpriseserver':
    case 'scientific':
    case 'suse linux': // enterprise server
      break;
    // deb based distros
    case 'ubuntu':
    case 'debian':
      deps.deb = ['dpkg', 'fakeroot'];
      deps.rpm = ['rpm'];
      break;
  }

  Object.keys(deps).forEach(function(format) {
    if (deps[format].length) {
      buildWizard(_.extend({}, setup), format, deps[format]);
    }
  });
}

function buildWizard(setup, format, deps) {
  var installer, options = getBuilderOptions(format, setup);
  const cmdRsync = util.format('rsync -a --delete --force --filter="P node_modules" "%s" "%s"',
    path.join(setup.build, '/'), setup.formatBuild);

  switch (format) {
    case 'deb':
      installer = Npm.require('electron-installer-debian');
      break;
    case 'rpm':
      installer = Npm.require('electron-installer-redhat');
      break;
  }

  async.series([
    async.apply(exec, 'which ' + deps.join(' '), {}),
    async.apply(rimraf, setup.formatBuild, {}),
    async.apply(mkdirp, setup.formatBuild),
    async.apply(exec, cmdRsync, {}),
    function(callback) { // save package format in electron settings
      // The auto-updater needs to know the installer/wizard format. We cannot
      // rely on directly changing the electron-packager build, because linux
      // builders are async and electronSettings.json may be in use by another
      // process, so use a different dir for building the installer itself.
      var electronSettingsPath = path.resolve(setup.formatBuild, './resources/app/electronSettings.json');
      var electronSettings = Npm.require(electronSettingsPath);
      electronSettings.format = format;
      writeFile(electronSettingsPath, JSON.stringify(electronSettings));
      callback(null);
    },
    async.apply(installer, options)
  ], function(err, result) {
    if (err) {
      if (err.code === 1 && result.length === 1) {
        console.warn(util.format('Cannot build %s installer because of missing deps (%s)', format, deps.join(', ')));
      } else {
        console.error(util.format('There was an error while building %s package:', format), err.message || err);
        console.error(err.stack);
      }
    } else {
      console.log(util.format('%s installer created at %s', format, options.dest));
    }
  });
}

function getBuilderOptions(format, setup) {
  // Allowed parameters depending on installer format. See:
  //  - https://www.npmjs.com/package/electron-installer-debian
  //  - https://www.npmjs.com/package/electron-installer-redhat
  const common = [
    'description',
    'dest',
    'homepage',
    'icon', // undocummented in electron-installer-windows
    'productDescription',
    'productName',
    'rename',
    'src',
    'version'
  ];
  const allowed = {
    'deb': [
      'arch',
      'bin',
      'categories',
      'depends',
      'enhances', // undocummented
      'genericName',
      'lintianOverrides',
      'maintainer',
      'mimeType',
      'name',
      'preDepends', // undocummented
      'priority',
      'recommends', // undocummented
      'revision',
      'section',
      'size',
      'suggests' // undocummented
    ],
    'rpm': [
      'arch',
      'bin',
      'categories',
      'genericName',
      'group',
      'license',
      'name',
      'requires',
      'revision',
    ]
  };

  var sanitizedName = setup.name.toLowerCase().replace(/\s/g, '-');
  if (!setup.build) {
    setup.build = path.join(setup.dirs.build, [sanitizedName, setup.info.platform, setup.info.arch].join('-'));
  }
  setup.formatBuild = util.format('%s-%s', setup.build, format);
  var options = {
    src: setup.formatBuild + '/',
    dest: setup.dirs.final + '/',
    arch: (setup.info.arch === 'x64') ? 'amd64' : 'i386',
    bin: sanitizedName,
    productName: setup.name,
    name: sanitizedName
  };
  if (setup.settings.rootUrl) {
    options.homepage = setup.settings.rootUrl;
  }
  if (setup.settings.description) {
    options.description = setup.settings.description;
  }
  if (setup.settings.icon && setup.settings.icon[setup.info.platform]) {
    // Pass absolute paths to the installer builder
    const projRoot = projectRoot();
    if (_.isObject(setup.settings.icon[setup.info.platform])) {
      options.icon = {};
      var icons = _.extend({}, setup.settings.icon[setup.info.platform]);
      Object.keys(icons).forEach(function(resolution, index) {
        options.icon[resolution] = path.resolve(projRoot, icons[resolution]);
      });
    } else if (_.isString(setup.settings.icon[setup.info.platform])) {
      options.icon = path.resolve(projRoot, setup.settings.icon[setup.info.platform]);
    }
  }
  if (setup.settings.version) {
    options.version = setup.settings.version;
  }
  if (DOWNLOAD_URLS[setup.info.platform]) { // rename depending on download urls
    options.rename = function(dest, installer) {
      if (DOWNLOAD_URLS[setup.info.platform][format]) {
        filepath = path.join(dest, path.basename(DOWNLOAD_URLS[setup.info.platform][format]));
      } else {
        filepath = path.join(dest, installer);
      }
      return filepath;
    };
  }

  return _.pick.apply(this, _.union([_.defaults({}, setup.options, options)], _.union(common, allowed[format])));
}
