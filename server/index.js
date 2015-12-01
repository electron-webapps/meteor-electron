if (process.env.ELECTRON_AUTO_BUILD !== 'false') {
  var build = createBinaries();
  serveBuild(build);
  if (process.env.NODE_ENV === 'development') {
    launchApp(build);
  }
}
