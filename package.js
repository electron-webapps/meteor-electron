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
  api.add_files(['server.js'], 'server')
  api.export("Electron", ["client", "server"]);
});
