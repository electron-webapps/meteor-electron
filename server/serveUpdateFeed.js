var semver = Npm.require('semver');
var electronSettings = Meteor.settings.electron || {};
var latestVersion = electronSettings.version;

canServeUpdates = function(platform) {
  if (! latestVersion){
    return false;
  }
  if (platform === "darwin"){
    return typeof(DOWNLOAD_URL_OSX) !== 'undefined';
  } else if (platform === "win32"){
    return typeof(DOWNLOAD_URL_WIN32) !== 'undefined';
  }
};

UPDATE_FEED_PATH = "/app/latest";


serveUpdateFeed = function() {
  // https://github.com/Squirrel/Squirrel.Mac#server-support
  if (canServeUpdates("darwin")){
    serve(UPDATE_FEED_PATH, function(req, res, next) {
      var appVersion = req.query.version;
      if (semver.valid(appVersion) && semver.gte(appVersion, latestVersion)) {
        res.statusCode = 204; // No content.
        res.end();
      } else {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          url: DOWNLOAD_URL_OSX
        }));
      }
    });
  }

  // https://github.com/squirrel/squirrel.windows
  if (canServeUpdates("win32")){
    serveDir(UPDATE_FEED_PATH, function(req, res, next){
      //first strip off the UPDATE_FEED_PATH
      var path = req.url.split(UPDATE_FEED_PATH)[1];
      res.statusCode = 302;
      res.setHeader("Location", electronSettings.windowsDownloadURLPrefix + path);
      res.end();
    });
  }
};
