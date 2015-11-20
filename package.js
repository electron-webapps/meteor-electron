Package.describe({
  name: 'quark:electron',
  summary: "Electron",
  version: "0.1.3",
  git: "https://github.com/rissem/meteor-electron"
});

Npm.depends({
  connect: '2.11.0',
  "electron-packager": "5.0.2",
  "is-running": "1.0.5",
  "mkdirp": "0.5.1",
  "tar":"2.2.1",
  "fstream":"1.0.8",
  "serve-static": "1.1.0"
});

Package.on_use(function (api, where) {
  // api.use("sanjo:meteor-files-helpers@1.1.0_7", "server");
  api.use(["mongo-livedata", "webapp", "ejson", "underscore"], "server");
  api.use(["iron:router"], {weak: true});
  api.add_files(['server.js'], 'server')
  api.add_files(['index.js'], 'server', {isAsset: true});
  api.add_files([
    // "electron-v0.31.0-darwin-x64.zip",
    // "electron-v0.31.0-linux-arm.zip",
    // "electron-v0.31.0-linux-ia32.zip",
    // "electron-v0.31.0-linux-x64.zip",
    // "electron-v0.31.0-win32-ia32.zip",
    // "electron-v0.31.0-win32-x64.zip",
    "app/package.json",
    "app/main.js"
  ], "server", {isAsset: true});
  api.add_files(['client.js'], "client");
  api.export("Electron", ["client", "server"]);
});
