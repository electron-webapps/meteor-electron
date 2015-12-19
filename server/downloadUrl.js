var electronSettings = Meteor.settings.electron || {};
var latestVersion = electronSettings.version;
if (electronSettings.downloadUrl){
  var downloadUrls = {
    "win32": electronSettings.downloadUrl.win32.replace('{{version}}', latestVersion),
    "osx": electronSettings.downloadUrl.osx.replace('{{version}}', latestVersion)
  };
  DOWNLOAD_URL_WIN32 = downloadUrls.win32;
  DOWNLOAD_URL_OSX = downloadUrls.osx;
}
