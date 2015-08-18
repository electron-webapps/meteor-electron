console.log("WORKING DIRECTORY", process.cwd());
console.log("ENVIRONMENT", process.env);

var meteorSettings = JSON.parse(process.env.METEOR_SETTINGS);
var rootUrl = process.env.ROOT_URL;
console.log("METEOR SETTINGS", meteorSettings);
console.log("ROOT URL", rootUrl);

var appName = meteorSettings.appName;

var app = require('app'); // Module to control application life.
var BrowserWindow = require('browser-window'); // Module to create native browser window.

var windowOptions = {
  width: 800,
  height:600,
  resizeable: true,
  frame: true
};

app.on("ready", function(){
  mainWindow = new BrowserWindow(windowOptions);
  mainWindow.focus();
  mainWindow.loadUrl(rootUrl);
});

