serveDownloadUrl = function() {
  serve('/app/download', function(req, res, next) {
    var installerUrl = DOWNLOAD_URLS[req.query.platform];
    if (_.isObject(installerUrl)) {
      if (req.query.format && installerUrl[req.query.format]) {
        installerUrl = installerUrl[req.query.format];
      } else {
        installerUrl = installerUrl.installer;
      }
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
