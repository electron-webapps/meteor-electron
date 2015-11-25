var path = require("path");
var fs = require("fs");
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
    nodeIntegration: false
  }
};

if (electronSettings.resizable === false){
  windowOptions.resizable = false;
}

if (electronSettings.frame === false){
  windowOptions.frame = false;
}

app.on("ready", function(){
  mainWindow = new BrowserWindow(windowOptions);
  mainWindow.focus();
  mainWindow.loadURL(rootUrl);
});
