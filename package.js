/* global Package:false, Npm:false */

Package.describe({
  name: 'quark:electron',
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
  "semver": "5.1.0"
});

Package.on_use(function (api) {
  api.use(["mongo-livedata", "webapp", "ejson"], "server");
  api.use("underscore", ["server", "client"]);
  api.use(["iron:router"], {weak: true});

  api.addFiles([
    'server/createBinaries.js',
    'server/downloadUrl.js',
    'server/launchApp.js',
    'server/platformSpecificSetting.js',
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

  api.export("Electron", ["client"]);
});
