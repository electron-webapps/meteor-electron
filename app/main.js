var app = require('electron').app; // Module to control application life.
var BrowserWindow = require('electron').BrowserWindow; // Module to create native browser window.
var autoUpdater = require('./autoUpdater');
var path = require("path");
var fs = require("fs");
var createDefaultMenu = require('./menu.js');
var proxyWindowEvents = require('./proxyWindowEvents');

require('electron-debug')({
    showDevTools: false
});

var electronSettings = JSON.parse(fs.readFileSync(
  path.join(__dirname, "electronSettings.json"), "utf-8"));

var checkForUpdates;
if (electronSettings.updateFeedUrl) {
  autoUpdater.setFeedURL(electronSettings.updateFeedUrl + '?version=' + electronSettings.version);
  autoUpdater.checkForUpdates();
  checkForUpdates = function() {
    autoUpdater.checkForUpdates(true /* userTriggered */);
  };
}

createDefaultMenu(app, checkForUpdates);

var launchUrl = electronSettings.rootUrl;
if (electronSettings.launchPath) {
  launchUrl += electronSettings.launchPath;
}

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

var hideInsteadofClose = function(e) {
  this.hide();
  e.preventDefault();
}

app.on("ready", function(){
  mainWindow = new BrowserWindow(windowOptions);

  // Hide the main window instead of closing it, so that we can bring it back
  // more quickly.
  mainWindow.on('close', hideInsteadofClose);
  proxyWindowEvents(mainWindow);
  mainWindow.focus();
  mainWindow.loadURL(launchUrl);
});

app.on("before-quit", function(){
  // We need to remove our close event handler from the main window,
  // otherwise the app will not quit.
  var mainWindow = BrowserWindow.fromId(1);
  mainWindow.removeListener('close', hideInsteadofClose);
});
