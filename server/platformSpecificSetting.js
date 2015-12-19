platformSpecificSetting = function(settings, platform) {
  switch (platform) {
    case 'darwin':
      return settings.darwin;
  }
};
