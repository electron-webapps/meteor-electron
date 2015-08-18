Package.describe({
  name: 'quark:electron',
  summary: "Electron",
  version: "0.1.3",
  git: "https://github.com/rissem/meteor-electron"
});

Npm.depends({
  "electron-prebuilt": "0.30.4"
});

Package.on_use(function (api, where) {
  api.use("sanjo:meteor-files-helpers@1.1.0_7", "server");
  api.add_files(['server.js'], 'server')
  api.add_files(['index.js'], 'server', {isAsset: true});
  api.export("Electron", ["client", "server"]);
});
