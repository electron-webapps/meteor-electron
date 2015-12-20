serveDownloadUrl = function() {
  serve('/app/download', function(req, res, next) {
    var downloadUrl = DOWNLOAD_URLS[req.query.platform];
    if (downloadUrl) {
      res.statusCode = 302; // Moved Temporarily
      res.setHeader('Location', downloadUrl);
      res.end();
    } else {
      res.statusCode = 404;
      res.end();
    }
  });
};
