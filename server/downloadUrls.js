var urlJoin = Npm.require('url-join');

// Global for tests.
parseMacDownloadUrl = function(electronSettings) {
  if (!electronSettings || !electronSettings.downloadUrls || !electronSettings.downloadUrls.darwin) return;

  return electronSettings.downloadUrls.darwin.replace('{{version}}', electronSettings.version);
};

// Global for tests.
parseWindowsDownloadUrls = function(electronSettings) {
  if (!electronSettings || !electronSettings.downloadUrls || !electronSettings.downloadUrls.win32) return;

  // The default value here is what `createBinaries` writes into the app's package.json, which is
  // what is read by `grunt-electron-installer` to name the installer.
  var appName = electronSettings.name || 'electron';

  var releasesUrl, installerUrl;
  var installerUrlIsVersioned = false;

  if (_.isString(electronSettings.downloadUrls.win32)) {
    if (electronSettings.downloadUrls.win32.indexOf('{{version}}') > -1) {
      console.error('Only the Windows installer URL may be versioned. Specify `downloadUrls.win32.installer`.');
      return;
    }
    releasesUrl = electronSettings.downloadUrls.win32;
    // 'AppSetup.exe' refers to the output of `grunt-electron-installer`.
    installerUrl = urlJoin(electronSettings.downloadUrls.win32, appName + 'Setup.exe');
  } else {
    releasesUrl = electronSettings.downloadUrls.win32.releases;
    if (releasesUrl.indexOf('{{version}}') > -1) {
      console.error('Only the Windows installer URL may be versioned.');
      return;
    }
    installerUrl = electronSettings.downloadUrls.win32.installer;
    if (installerUrl.indexOf('{{version}}') > -1) {
      installerUrl = installerUrl.replace('{{version}}', electronSettings.version);
      installerUrlIsVersioned = true;
    }
  }

  // Cachebust the installer URL if it's not versioned.
  // (The releases URL will also be cachebusted, but by `serveUpdateFeed` since we've got to append
  // the particular paths requested by the client).
  if (!installerUrlIsVersioned) {
    installerUrl = cachebustedUrl(installerUrl);
  }

  return {
    releases: releasesUrl,
    installer: installerUrl
  };
};

function cachebustedUrl(url) {
  var querySeparator = (url.indexOf('?') > -1) ? '&' : '?';
  return url + querySeparator + 'cb=' + Date.now();
}

DOWNLOAD_URLS = {
  darwin: parseMacDownloadUrl(Meteor.settings.electron),
  win32: parseWindowsDownloadUrls(Meteor.settings.electron)
};
