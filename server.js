var electron = Npm.require('electron-prebuilt')
var path = Npm.require('path');
var proc = Npm.require('child_process')
var os = Npm.require('os');
var fs = Npm.require('fs');
var connect = Npm.require('connect');

 
//prints path to electron
//console.log(electron)
//HACK fix up path, should use sanjo:meteor-files-helpers
electron = electron.replace(/package-new-[1-9A-z]*\//, "package/");

var indexJsContents = Assets.getText("index.js");
var scriptPath = path.join(os.tmpDir(), "index.js");

fs.writeFile(scriptPath, indexJsContents, function(err){
  if (err){
    console.error("ERROR WRITING ATOM CONTROL FILE", err);
  }

  //TODO only do this in development mode
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

//TODO FOR DEVELOPMENT
//map between Meteor.settings.electron and current process PIDs
//are there any running instances of electron w/ current paremeters?
//yes: then use them
//no:  spawn a new electron instance
//optionally kill all the electrons running w/ old parameters


//TODO FOR PRODUCTION (and maybe development too..)
//on server startup create the donwnloadable apps

//combine Meteor.settings with ROOT_URL and place into each of the unzipped architectures
//zip them back up and put them somewhere..GRID_FS? S3 would be a nice option
//could store in memory, but that's probably not very nice to the hosting providers
//any file system generically available to a Metoer app?

WebApp.rawConnectHandlers.use(function(req, res, next){
  // console.log("INTERCEPTED", req.url);

  if (req.url === "/electron-download/:platform"){
    //find the right platform and return it to the user
   console.log("INITIATE THE ELECTRON DOWNLOAD");
  } else {
    next();
  }
});
