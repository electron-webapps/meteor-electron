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
  "mkdirp": "0.5.1",
  "semver": "5.1.0"
});

Package.on_use(function (api) {
  api.use(["mongo-livedata", "webapp", "ejson"], "server");
  api.use("underscore", ["server", "client"]);
  api.use(["iron:router"], {weak: true});

  api.addFiles([
    'server/createBinaries.js',
    'server/launchApp.js',
    'server/platformSpecificSetting.js',
    'server/serve.js',
    'server/serveUpdateFeed.js',
    // Must go last so that its dependencies have been defined.
    'server/index.js'
  ], 'server');

  // When adding new files, also edit `server/createBinaries.js` to write these files into the app directory.
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
