platformSpecificSetting = function(settings) {
  switch (process.platform) {
    case 'darwin':
      return settings.osx;
  }
};
