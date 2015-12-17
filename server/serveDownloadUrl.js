serveDownloadUrl = function() {
  // Abort if the user has not yet configured downloads.
  if (!DOWNLOAD_URL) return;

  serve('/app/latest/download', function(req, res, next) {
    // TODO: Choose the Windows vs. Mac download URL based on the user agent.
    res.statusCode = 302; // Moved Temporarily
    res.setHeader('Location', DOWNLOAD_URL);
    res.end();
  });
};
