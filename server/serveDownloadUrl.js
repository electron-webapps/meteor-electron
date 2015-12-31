serveDownloadUrl = function() {
  serve('/app/download', function(req, res, next) {
    var installerUrl = DOWNLOAD_URLS[req.query.platform];
    if (_.isObject(installerUrl)) {
      installerUrl = installerUrl.installer;
    }
    if (installerUrl) {
      res.statusCode = 302; // Moved Temporarily
      res.setHeader('Location', installerUrl);
      res.end();
    } else {
      res.statusCode = 404;
      res.end();
    }
  });
};
