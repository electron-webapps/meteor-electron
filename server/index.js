if ((process.env.NODE_ENV === 'development') && (process.env.ELECTRON_AUTO_BUILD !== 'false')) {
  var builds = createBinaries();
  var buildForThisPlatform = builds[process.platform + "-" + process.arch];
  if (buildForThisPlatform){
    launchApp(buildForThisPlatform);
  }
}

serveUpdateFeed();
