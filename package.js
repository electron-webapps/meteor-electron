/* global Package:false, Npm:false */

Package.describe({
  name: 'meson:electron',
  summary: "Electron",
  version: "0.1.4",
  git: "https://github.com/electron-webapps/meteor-electron"
});

Npm.depends({
  "electron-packager": "https://github.com/mixmaxhq/electron-packager/archive/f511e2680efa39c014d8bedca872168e585f8daf.tar.gz",
  "is-running": "1.0.5",
  "lucy-dirsum": "https://github.com/mixmaxhq/lucy-dirsum/archive/08299b483cd0f79d18cd0fa1c5081dcab67c5649.tar.gz",
  "mkdirp": "0.5.1",
  "ncp": "2.0.0",
  "rimraf": "2.4.4",
  "semver": "5.1.0",
  "url-join": "0.0.1",
  "electron-rebuild": "1.0.1"
});

Package.onUse(function (api) {
  api.versionsFrom("METEOR@1.0");
  api.use(["mongo-livedata", "webapp", "ejson", "promise@0.6.7"], "server");
  api.use("underscore", ["server", "client"]);
  api.use(["iron:router@0.9.4||1.0.0"], {weak: true});
  api.use("meteorhacks:picker@1.0.0", "server", {weak: true});

  api.addFiles([
    'server/createBinaries.js',
    'server/downloadUrls.js',
    'server/launchApp.js',
    'server/serve.js',
    'server/serveDownloadUrl.js',
    'server/serveUpdateFeed.js',
    // Must go last so that its dependencies have been defined.
    'server/index.js'
  ], 'server');

  var assets = [
    "app/autoUpdater.js",
    "app/main.js",
    "app/menu.js",
    "app/package.json",
    "app/preload.js",
    "app/proxyWindowEvents.js"
  ];

  // Use Meteor 1.2+ API, but fall back to the pre-1.2 API if necessary
  if (api.addAssets) {
    api.addAssets(assets, "server");
  } else {
    api.addFiles(assets, "server", {isAsset: true});
  }

  api.addFiles(['client/index.js'], "client");

  // Test exports.
  api.export([
    'parseMacDownloadUrl',
    'parseWindowsDownloadUrls'
  ], 'server', {
    testOnly: true
  });

  // Public exports.
  api.export("Electron", ["client"]);
});

Package.onTest(function(api) {
  api.use(['meson:electron', 'tinytest']);

  api.addFiles('tests/server/downloadUrlsTest.js', 'server');
});
