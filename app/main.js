var path = require("path");
var fs = require("fs");
var createDefaultMenu = require('./menu.js');
var proxyWindowEvents = require('./proxyWindowEvents');

require('electron-debug')({
    showDevTools: false
});


if (process.env.METEOR_SETTINGS){
  var meteorSettings = JSON.parse(process.env.METEOR_SETTINGS);
  var electronSettings = meteorSettings.electron || {};
} else {
  var electronSettings = JSON.parse(fs.readFileSync(
    path.join(__dirname, "electronSettings.json"), "utf-8"));
}

var rootUrl = electronSettings.rootUrl || process.env.APP_ROOT_URL || process.env.ROOT_URL;

var app = require('app'); // Module to control application life.
var BrowserWindow = require('browser-window'); // Module to create native browser window.

var windowOptions = {
  width: electronSettings.width || 800,
  height: electronSettings.height || 600,
  resizable: true,
  frame: true,
  /**
   * Disable Electron's Node integration so that browser dependencies like `moment` will load themselves
   * like normal i.e. into the window rather than into modules, and also to prevent untrusted client
   * code from having access to the process and file system:
   *  - https://github.com/atom/electron/issues/254
   *  - https://github.com/atom/electron/issues/1753
   */
  webPreferences: {
    nodeIntegration: false,
    // See comments at the top of `preload.js`.
    preload: path.join(__dirname, 'preload.js')
  }
};

if (electronSettings.resizable === false){
  windowOptions.resizable = false;
}

if (electronSettings['title-bar-style']) {
  windowOptions['title-bar-style'] = electronSettings['title-bar-style'];
}

if (electronSettings.minWidth) {
  windowOptions.minWidth = electronSettings.minWidth;
}

if (electronSettings.maxWidth) {
  windowOptions.maxWidth = electronSettings.maxWidth;
}

if (electronSettings.minHeight) {
  windowOptions.minHeight = electronSettings.minHeight;
}

if (electronSettings.maxHeight) {
  windowOptions.maxHeight = electronSettings.maxHeight;
}

if (electronSettings.frame === false){
  windowOptions.frame = false;
}

// Keep a global reference of the window object so that it won't be garbage collected
// and the window closed.
var mainWindow = null;

app.on("ready", function(){
  mainWindow = new BrowserWindow(windowOptions);
  proxyWindowEvents(mainWindow);
  mainWindow.focus();
  mainWindow.loadURL(rootUrl);
});

createDefaultMenu(app, electronSettings.name);
