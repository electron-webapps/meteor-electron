/* global Package:false, Npm:false */

Package.describe({
  name: 'meson:electron',
  summary: "Electron",
  version: "0.1.3",
  git: "https://github.com/rissem/meteor-electron"
});

Npm.depends({
  "electron-packager": "https://github.com/mixmaxhq/electron-packager/archive/f511e2680efa39c014d8bedca872168e585f8daf.tar.gz",
  "is-running": "1.0.5",
  "lucy-dirsum": "https://github.com/mixmaxhq/lucy-dirsum/archive/08299b483cd0f79d18cd0fa1c5081dcab67c5649.tar.gz",
  "mkdirp": "0.5.1",
  "ncp": "2.0.0",
  "rimraf": "2.4.4",
  "semver": "5.1.0",
  "url-join": "0.0.1"
});

Package.onUse(function (api) {
  api.use(["mongo-livedata@1.0.9", "webapp@1.2.3", "ejson@1.0.7"], "server");
  api.use("underscore@1.0.4", ["server", "client"]);
  api.use(["iron:router@0.9.4"], {weak: true});

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

  api.addAssets([
    "app/autoUpdater.js",
    "app/main.js",
    "app/menu.js",
    "app/package.json",
    "app/preload.js",
    "app/proxyWindowEvents.js"
  ], "server");

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
