var electronSettings = Meteor.settings.electron || {};
var latestVersion = electronSettings.version;
var downloadUrl = electronSettings.downloadUrl;
if (downloadUrl) {
  downloadUrl = downloadUrl.replace('{{version}}', latestVersion);
}

DOWNLOAD_URL = downloadUrl;
