var electron = Npm.require('electron-prebuilt')
var proc = Npm.require('child_process')
 
// will something similar to print /Users/maf/.../Electron 
console.log(electron)

//HACK fix up path
electron = electron.replace(/package-new-[1-9A-z]*\//, "package/");
console.log("ELECTRON", electron);

console.log(process.env.ROOT_URL);

// spawn electron 
var child = proc.spawn(electron);

child.stdout.on("data", function(data){
  console.log("STDOUT", data.toString());
});

child.stderr.on("data", function(data){
  console.log("STDERR", data.toString());
});
