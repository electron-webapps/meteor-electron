var path = require("path");
var fs = require("fs");

if (process.env.METEOR_SETTINGS){
  var meteorSettings = JSON.parse(process.env.METEOR_SETTINGS);
  var electronSettings = meteorSettings.electron || {};
} else {
  var electronSettings = JSON.parse(fs.readFileSync(
    path.join(__dirname, "electronSettings.json"), "utf-8"));
}

if (electronSettings.length < 3){
  window.blah();
}

var rootUrl = electronSettings.rootUrl || process.env.ROOT_URL;


var app = require('app'); // Module to control application life.
var BrowserWindow = require('browser-window'); // Module to create native browser window.

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
  mainWindow.loadURL(rootUrl);
});
