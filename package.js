/* global Package:false, Npm:false */

Package.describe({
  name: 'risetechnologies:electron',
  summary: 'Electron',
  version: '0.2.0',
  git: 'https://github.com/risetechnologies/meteor-electron',
});

Npm.depends({
  'electron-builder': '6.5.2',
  lodash: '4.15.0',
  'is-running': '1.0.5',
  'lucy-dirsum': '0.1.1',
  mkdirp: '0.5.1',
  ncp: '2.0.0',
  rimraf: '2.5.4',
});

Package.onUse(api => {
  api.versionsFrom('METEOR@1.3');
  api.use(['mongo-livedata', 'ejson', 'promise'], 'server');
  api.use(['modules', 'ecmascript'], ['server', 'client']);

  api.addAssets([
    'app/autoUpdater.js',
    'app/main.js',
    'app/menu.js',
    'app/package.json',
    'app/preload.js',
    'app/proxyWindowEvents.js',
  ], 'server');

  api.mainModule('server/index.js', 'server');
  api.mainModule('client/index.js', 'client');
  // Public exports.
  api.export('Electron', ['client']);
});
