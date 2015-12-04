var semver = Npm.require('semver');

var electronSettings = Meteor.settings.electron || {};
var latestVersion = electronSettings.version;
var updateUrl = electronSettings.updateUrl;
if (updateUrl) {
  updateUrl = updateUrl.replace('{{version}}', latestVersion);
}

canServeUpdates = function() {
  return latestVersion && updateUrl;
};

UPDATE_FEED_PATH = "/app/latest";

// https://github.com/Squirrel/Squirrel.Mac#server-support
serveUpdateFeed = function() {
  // Abort if the user has not yet configured updates.
  if (!canServeUpdates()) return;

  serve(UPDATE_FEED_PATH, function(req, res, next) {
    var appVersion = req.query.version;

    if (semver.valid(appVersion) && semver.gte(appVersion, latestVersion)) {
      res.statusCode = 204; // No content.
      res.end();
    } else {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        url: updateUrl
      }));
    }
  });
};
