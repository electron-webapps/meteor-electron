if ((process.env.NODE_ENV === 'development') && (process.env.ELECTRON_AUTO_BUILD !== 'false')) {
  var buildResults = createBinaries();
  var buildResultForThisPlatform = buildResults[process.platform + '-' + process.arch];
  if (buildResultForThisPlatform) {
    launchApp(buildResultForThisPlatform.app, buildResultForThisPlatform.buildRequired);
  }
}

serveDownloadUrl();
serveUpdateFeed();
