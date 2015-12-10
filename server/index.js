if ((process.env.NODE_ENV === 'development') && (process.env.ELECTRON_AUTO_BUILD !== 'false')) {
  var build = createBinaries();
  launchApp(build);
}

serveDownloadUrl();
serveUpdateFeed();
