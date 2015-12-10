if ((process.env.NODE_ENV === 'development') && (process.env.ELECTRON_AUTO_BUILD !== 'false')) {
  var buildResult = createBinaries();
  launchApp(buildResult.app, buildResult.buildRequired);
}

serveDownloadUrl();
serveUpdateFeed();
