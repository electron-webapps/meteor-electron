var os = Npm.require('os');
var mkdirp = Meteor.wrapAsync(Npm.require('mkdirp'));
var path = Npm.require('path');
var proc = Npm.require('child_process');
var serveStatic = Npm.require('serve-static');

var exec = Meteor.wrapAsync(function(command, options, callback){
  proc.exec(command, options, function(err, stdout, stderr){
    callback(err, {stdout: stdout, stderr: stderr});
  });
});

serveBuild = function(build) {
  var tmpDir = os.tmpdir();

  // *finalDir* contains zipped apps ready to be downloaded
  var finalDir = path.join(tmpDir, "electron", "final");
  mkdirp(finalDir);

  // The auto-updater framework only supports installing ZIP releases:
  // https://github.com/Squirrel/Squirrel.Mac#update-json-format
  var downloadName = "app-darwin.zip";
  var compressedDownload = path.join(finalDir, downloadName);

  // Use `ditto` to ZIP the app because I couldn't find a good npm module to do it and also that's
  // what a couple of other related projects do:
  // - https://github.com/Squirrel/Squirrel.Mac/blob/8caa2fa2007b29a253f7f5be8fc9f36ace6aa30e/Squirrel/SQRLZipArchiver.h#L24
  // - https://github.com/jenslind/electron-release/blob/4a2a701c18664ec668c3570c3907c0fee72f5e2a/index.js#L109
  exec('ditto -ck --sequesterRsrc --keepParent ' + build + ' ' + compressedDownload);
  console.log("Downloadable created at", compressedDownload);
  serve("/" + downloadName, serveStatic(finalDir));
};
