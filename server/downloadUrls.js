var urlJoin = Npm.require('url-join');
var util = Npm.require('util');
var url = Npm.require('url');

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

// Global for tests.
parseLinuxDownloadUrls = function(electronSettings) {
  var platform = 'linux';
  if (!electronSettings || !electronSettings.downloadUrls || !electronSettings.downloadUrls[platform]) return;

  return parseUrlVariables(electronSettings, platform,
    electronSettings.downloadUrls[platform].formats || ['deb', 'rpm']);
};

function cachebustedUrl(url) {
  var querySeparator = (url.indexOf('?') > -1) ? '&' : '?';
  return url + querySeparator + 'cb=' + Date.now();
}

function parseUrlVariables(settings, platform, formats) {
  if (_.isObject(settings.downloadUrls[platform])) {
    formats = Object.keys(settings.downloadUrls[platform]);
  }

  var urls, urlsByFormat = _.isObject(settings.downloadUrls[platform]);
  var replaces = {
    arch: settings.arch || 'amd64',
    ext: 'zip',
    name: settings.name.toLowerCase().replace(/\s/g, '-') || 'electron',
    platform: platform,
    rootUrl: settings.rootUrl || process.env.ROOT_URL.slice(0, -1),
    version: settings.version
  };

  if (_.isArray(formats)) {
    urls = {};
    _.each(formats, function(format) {
      var url = urlsByFormat ? settings.downloadUrls[platform][format] : settings.downloadUrls[platform];
      if (url) {
        replaces.ext = format;
        urls[format] = replaceUrlTokens(url, replaces);
      } else {
        console.warn(util.format('Missing download url for %s format on %s platform', format, platform));
      }
    });
  } else if (_.isString(settings.downloadUrls[platform])) {
    urls = replaceUrlTokens(settings.downloadUrls[platform], replaces);
  } else {
    console.warn(util.format('Cannot parse %s url because of provided value is not a string', platform));
  }

  return urls;
}

function replaceUrlTokens(parsedUrl, replaces) {
  Object.keys(replaces).forEach(function(token) {
    parsedUrl = parsedUrl.replace(new RegExp(util.format('{{%s}}', token), 'g'), replaces[token]);
  });
  if (!/^https?:\/\//.test(url)) {
    parsedUrl = url.resolve(replaces.rootUrl, parsedUrl);
  }
  return parsedUrl;
}

DOWNLOAD_URLS = {
  darwin: parseMacDownloadUrl(Meteor.settings.electron),
  linux: parseLinuxDownloadUrls(Meteor.settings.electron),
  win32: parseWindowsDownloadUrls(Meteor.settings.electron)
};
