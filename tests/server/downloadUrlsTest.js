/******************************************************************************/
/* Mac                                                                        */
/******************************************************************************/

Tinytest.add('download URL parsing - Mac - returns undefined if `downloadUrls.darwin` not specified', function(test) {
  test.isUndefined(parseMacDownloadUrl());
  test.isUndefined(parseMacDownloadUrl({
    downloadUrls: {}
  }));
});

Tinytest.add('download URL parsing - Mac - returns the specified URL', function(test) {
  test.equal(parseMacDownloadUrl({
    downloadUrls: {
      darwin: 'https://myapp.com/download/osx/MyApp.zip'
    }
  }), 'https://myapp.com/download/osx/MyApp.zip');
});

Tinytest.add('download URL parsing - Mac - versions the specified URL', function(test) {
  test.equal(parseMacDownloadUrl({
    version: '1.1.1',
    downloadUrls: {
      darwin: 'https://myapp.com/download/osx/{{version}}/MyApp.zip'
    }
  }), 'https://myapp.com/download/osx/1.1.1/MyApp.zip');
});

/******************************************************************************/
/* Windows                                                                    */
/******************************************************************************/

/*
 * a unified URL
 */
Tinytest.add('download URL parsing - Windows - a unified URL - returns undefined if `downloadUrls.win32` not specified', function(test) {
  test.isUndefined(parseWindowsDownloadUrls());
  test.isUndefined(parseWindowsDownloadUrls({
    downloadUrls: {}
  }));
});

Tinytest.add('download URL parsing - Windows - a unified URL - attempting to version fails', function(test) {
  var origConsoleErr = console.error;
  var consoleErrorWasCalled = false;
  console.error = function() { consoleErrorWasCalled = true; };

  try {
    test.isUndefined(parseWindowsDownloadUrls({
      downloadUrls: {
        win32: 'https://myapp.com/download/win32/{{version}}'
      }
    }));
    test.isTrue(consoleErrorWasCalled);
  } finally {
    console.error = origConsoleErr;
  }
});

/* the releases URL */
Tinytest.add('download URL parsing - Windows - a unified URL - the releases URL - is returned properly', function(test) {
  var releasesUrl = parseWindowsDownloadUrls({
    downloadUrls: {
      win32: 'https://myapp.com/download/win32'
    }
  }).releases;

  test.equal(releasesUrl, 'https://myapp.com/download/win32');
});

/* the installer URL */
Tinytest.add('download URL parsing - Windows - a unified URL - the installer URL - is returned properly', function(test) {
  var installerUrl = parseWindowsDownloadUrls({
    name: 'MyApp',
    downloadUrls: {
      win32: 'https://myapp.com/download/win32'
    }
  }).installer;

  // Not `equal` because of cachebusting (tested next).
  test.isTrue(installerUrl && (installerUrl.indexOf('https://myapp.com/download/win32/MyAppSetup.exe') === 0));
});

Tinytest.add('download URL parsing - Windows - a unified URL - the installer URL - is cachebusted', function(test) {
  var installerUrl = parseWindowsDownloadUrls({
    name: 'MyApp',
    downloadUrls: {
      win32: 'https://myapp.com/download/win32'
    }
  }).installer;

  test.isTrue(installerUrl && (installerUrl.indexOf('?cb=') > -1));
});

/*
 * separate URLs
 */

/* the releases URL */
Tinytest.add('download URL parsing - Windows - separate URLs - the releases URL - attempting to version fails', function(test) {
  var origConsoleErr = console.error;
  var consoleErrorWasCalled = false;
  console.error = function() { consoleErrorWasCalled = true; };

  try {
    test.isUndefined(parseWindowsDownloadUrls({
      downloadUrls: {
        win32: {
          releases: 'https://myapp.com/download/win32/{{version}}',
          installer: 'https://myapp.com/download/win32/{{version}}/MyAppSetup.exe'
        }
      }
    }));
    test.isTrue(consoleErrorWasCalled);
  } finally {
    console.error = origConsoleErr;
  }
});

Tinytest.add('download URL parsing - Windows - separate URLs - the releases URL - is returned as specified', function(test) {
  var releasesUrl = parseWindowsDownloadUrls({
    downloadUrls: {
      win32: {
        releases: 'https://myapp.com/download/win32',
        installer: 'https://myapp.com/download/win32/MyAppSetup.exe'
      }
    }
  }).releases;

  test.equal(releasesUrl, 'https://myapp.com/download/win32');
});

/* the installer URL */
Tinytest.add('download URL parsing - Windows - separate URLs - the installer URL - is returned as specified', function(test) {
  var installerUrl = parseWindowsDownloadUrls({
    downloadUrls: {
      win32: {
        releases: 'https://myapp.com/download/win32',
        installer: 'https://myapp.com/download/win32/MyAppSetup.exe'
      }
    }
  }).installer;

  // Not `equal` because of cachebusting (tested next).
  test.isTrue(installerUrl && (installerUrl.indexOf('https://myapp.com/download/win32') === 0));
});

Tinytest.add('download URL parsing - Windows - separate URLs - the installer URL - is cachebusted if not versioned', function(test) {
  var installerUrl = parseWindowsDownloadUrls({
    downloadUrls: {
      win32: {
        releases: 'https://myapp.com/download/win32',
        installer: 'https://myapp.com/download/win32/MyAppSetup.exe'
      }
    }
  }).installer;

  test.isTrue(installerUrl && (installerUrl.indexOf('?cb=') > -1));
});

Tinytest.add('download URL parsing - Windows - separate URLs - the installer URL - is versioned as specified (and then not cachebusted)', function(test) {
  var installerUrl = parseWindowsDownloadUrls({
    version: '1.1.1',
    downloadUrls: {
      win32: {
        releases: 'https://myapp.com/download/win32',
        installer: 'https://myapp.com/download/win32/{{version}}/MyAppSetup.exe'
      }
    }
  }).installer;

  test.equal(installerUrl, 'https://myapp.com/download/win32/1.1.1/MyAppSetup.exe');
});
