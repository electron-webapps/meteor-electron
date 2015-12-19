serveDownloadUrl = function() {
  // Abort if the user has not yet configured downloads.
  if (!DOWNLOAD_URL_WIN32 && !DOWNLOAD_URL_DARWIN) return;

  serve('/app/latest/download', function(req, res, next) {
    res.statusCode = 302; // Moved Temporarily
    if (req.query.platform === "darwin"){
      res.setHeader('Location', DOWNLOAD_URL_DARWIN);
    } else if (req.query.platform === "win32"){
      res.setHeader('Location', DOWNLOAD_URL_WIN32);
    }
    res.end();
  });
};
