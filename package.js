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
  api.use(["mongo-livedata", "webapp", "ejson", "underscore"], "server");
  api.use(["iron:router"], {weak: true});
  api.addFiles(['server.js'], 'server');
  api.addAssets([
    "app/package.json",
    "app/main.js"
  ], "server");
  api.addFiles(['client.js'], "client");
  api.export("Electron", ["client", "server"]);
});
