var fstream = Npm.require("fstream");
var os = Npm.require('os');
var mkdirp = Meteor.wrapAsync(Npm.require('mkdirp'));
var path = Npm.require('path');
var serveStatic = Npm.require('serve-static');
var tar = Npm.require('tar');
var zlib = Npm.require('zlib');

serveBuild = function(build) {
  var tmpDir = os.tmpdir();

  // *finalDir* contains zipped apps ready to be downloaded
  var finalDir = path.join(tmpDir, "electron", "final");
  mkdirp(finalDir);

  var compressedDownload = path.join(finalDir, "app-darwin.tar.gz");
  var writer = fstream.Reader({"path": build, "type": "Directory"})
    .pipe(tar.Pack())
    .pipe(zlib.Gzip())
    .pipe(fstream.Writer({path: compressedDownload}));
    writer.on("close", function(){
      console.log("Downloadable created at", compressedDownload);
    });

  var serve = serveStatic(finalDir);

  if (Package["iron:router"]){
    Package["iron:router"].Router.route("/app-darwin.tar.gz", function(){
      serve(this.request, this.response);
    }, {where: "server"});
  } else {
  //console.log("iron router not found, using WebApp.rawConnectHandlers
    WebApp.rawConnectHandlers.use(function(req, res, next){
      serve(req, res, next);
    });
  }
};
