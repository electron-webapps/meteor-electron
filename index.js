var meteorSettings = JSON.parse(process.env.METEOR_SETTINGS);
var electronSettings = meteorSettings.electron || {};
var rootUrl = process.env.ROOT_URL;

var appName = meteorSettings.appName;

var app = require('app'); // Module to control application life.
var BrowserWindow = require('browser-window'); // Module to create native browser window.
Electron = app;

var windowOptions = {
  width: electronSettings.width || 800,
  height: electronSettings.height || 600,
  resizable: true,
  frame: true
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
  mainWindow.loadUrl(rootUrl);
});
