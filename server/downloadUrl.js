var electronSettings = Meteor.settings.electron || {};
var latestVersion = electronSettings.version;
if (electronSettings.downloadUrl){
  if (electronSettings.downloadUrl.win32){
    DOWNLOAD_URL_WIN32 = electronSettings.downloadUrl.win32.replace('{{version}}', latestVersion);
  }
  if (electronSettings.downloadUrl.darwin){
    DOWNLOAD_URL_DARWIN   = electronSettings.downloadUrl.darwin.replace('{{version}}', latestVersion);
  }
}
