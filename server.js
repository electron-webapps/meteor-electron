var electron = Npm.require('electron-prebuilt')
var path = Npm.require('path');
var proc = Npm.require('child_process')
var os = Npm.require('os');
var fs = Npm.require('fs');

 
// will something similar to print /Users/maf/.../Electron 
console.log(electron)
//HACK fix up path, should use sanjo:meteor-files-helpers
electron = electron.replace(/package-new-[1-9A-z]*\//, "package/");


var indexJsContents = Assets.getText("index.js");
var scriptPath = path.join(os.tmpDir(), "index.js");

fs.writeFile(scriptPath, indexJsContents, function(err){
  if (err){
    console.error("ERROR WRITING ATOM CONTROL FILE", err);
  }

  // spawn electron
  var child = proc.spawn(
    electron, [scriptPath],
    {env:{METEOR_SETTINGS: JSON.stringify(Meteor.settings),
          ROOT_URL: process.env.ROOT_URL}});

  child.stdout.on("data", function(data){
    console.log("ATOM:", data.toString());
  });

  child.stderr.on("data", function(data){
    console.log("ATOM:", data.toString());
  });
});

