# meteor-electron

meteor-electron lets you easily transform your Meteor webapp to a desktop app. Its ultimate goal is
to build `meteor add-platform desktop`.

Some of the things it does:

* automatically builds and launches a desktop application, rebuilding when the native code changes
* defines feature detection APIs and a bridge between web and native code
* serves downloads of your application and update feeds

![](docs/overview.png)

## Getting Started

`meteor add meson:electron`

meteor-electron will download the Electron binary for your system and build and launch an Electron
app pointing to your local development server. The download process may take a few minutes based on
your Internet connection but only needs to be done once.

The app, as well as the ready-to-distribute binaries (see [Deploy](#deploy)), is built within
`YOUR_PROJECT_DIRECTORY/.meteor-electron`. This allows the apps to be easily located as well as the
builds to be cached for speedier startup. You should add this directory to your `.gitignore`.

## Configuration

Configuration is possible via `Meteor.settings.electron`. For example,

```json
{
  "electron": {
    "name": "MyApp",
    "icon": {
      "darwin": "private/MyApp.icns",
      "linux": {
        "48x48": "private/MyApp48.png",
        "64x64": "private/MyApp64.png",
        "128x128": "private/MyApp128.png",
        "256x256": "private/MyApp256.png",
      },
      "win32": "private/MyApp.ico"
    },
    "version": "0.1.0",
    "description": "A really cool app.",
    "rootUrl": "https://myapp.com",
    "launchPath": "/app/landing",
    "downloadUrls": {
      "win32": "https://myapp.com/download/win/",
      "linux": {
        "deb": "/download/{{platform}}/{{version}}/{{name}}_{{version}}_{{arch}}.deb",
        "rpm": "/download/{{platform}}/{{version}}/{{name}}-{{version}}.{{arch}}.rpm"
      },
      "darwin": "https://myapp.com/download/osx/{{version}}/MyApp.zip"
    },
    "installer": {
      "linux": {
        "license": "MIT",
        "maintainer": "electron-webapps"
      }
    },
    "sign": "Developer ID Application: ...",
    "height": 768,
    "width": 1024,
    "frame": true,
    "title-bar-style": "hidden",
    "resizable": true,
    "protocols": [{
      "name": "MyApp",
      "schemes": ["myapp"]
    }],
    "appSrcDir": "private/app"
  }
}
```

<dl>
  <dt>icon</dt>
  <dd>platform dependent icon paths relative to Meteor application root (not `appSrcDir`).</dd>
  <dd>For Linux installers you can provide either a string with the path to the icon file or an object for multiple resultions as in the example (learn more <a href="https://www.npmjs.com/package/electron-installer-debian#optionsicon">here</a>). For linux icons you can even provide absolute paths, as they are resolved successfully.
  <dt>version</dt>
  <dd>must confirm to <a href="https://docs.npmjs.com/getting-started/semantic-versioning">semver</a>.</dd>
  <dt>rootUrl</dt>
  <dd>If unset, defaults to the `APP_ROOT_URL` and then `ROOT_URL` environment variables, in that order.</dd>
  <dt>launchPath</dt>
  <dd>If you want your app to open to a non-root URL. Will be appended to the root URL.</dd>
  <dt>downloadUrls</dt>
  <dd>URLs from which downloads are served. A CDN is recommended, but any HTTP server will do. You can place the installers inside the `public` folder of your Meteor app if you want Meteor to serve them.</dd>
  <dt>downloadUrls.win32<dt>
  <dd>Copy the output of `grunt-electron-installer` (see <a href="#building-and-serving-an-auto-updating-windows-app">Building and serving an auto-updating Windows app</a>) to this location. Do not rename the files. If you wish to host the Windows
  installers at versioned URLs for caching or archival reasons, specify this as an object with the
  following keys.</dd>
  <dt>downloadUrls.win32.releases</dt>
  <dd>Copy the output of `grunt-electron-installer` (see <a href="#building-and-serving-an-auto-updating-windows-app">Building and serving an auto-updating Windows app</a>) to this location. Do not rename the files.</dd>
  <dt>downloadUrls.win32.installer</dt>
  <dd>If you like, you may copy the `Setup.exe` file created by `grunt-electron-installer` to this
  location rather than the "releases" location. If the URL contains '{{version}}', it will be
  replaced with `version`.</dd>
  <dt>downloadUrls.darwin</dt>
  <dd>Place the latest app at this location. If the URL contains '{{version}}', it will be replaced
  with `version`.</dd>
  <dt>downloadUrls.linux</dt>
  <dd>Place the latest app at this location. The URL may contain some variables to be dynamically replaced:</dd>
  <dd>- `{{ext}}`: defaults to `["deb", "rpm"]`.</dd>
  <dd>- `{{name}}`: defaults to sanitized (lowercased and hyphenated) `Meteor.settings.electron.name`, or `electron` if none provided.</dd>
  <dd>- `{{platform}}`: defaults to the platform under process (`linux` because of `Meteor.settings.downloadUrls.linux`.</dd>
  <dd>- `{{version}}`: defaults to `Meteor.settings.electron.version`.</dd>
  <dd>`Meteor.settings.rootUrl` or `ROOT_URL`, defaulting in that order, is automatically prepended to the download URL(s) if it does not start with `http://` or `https://`.</dd>
  <dd>This value can be of two types: string or object. There can exist multiple different Linux systems (`deb` or `rpm` at this moment), so you can provide a generic URL pattern to build all the URLs (string) or you can provide an object with the format as key and the pattern as value. You can read more about this  <a href="#q-how-do-i-set-the-download-urls-for-linux">below</a>.</dd>
  <dt>sign</dt>
  <dd>Must be set to enable auto-updates on Mac.</dd>
  <dt>appSrcDir</dt>
  <dd>A directory of code to use instead of meteor-electron's default application, relative to your
  app's project directory. See <a href="#q-if-i-cant-modify-the-main-process-file-how-can-i-create-new-browser-windows-set-app-notifications-and-all-the-other-awesome-native-functionality-that-electron-gives-me">warning</a> below.</dd>
  <dt>installer</dt>
  <dd>Use it to provide additional parameters to the installer builders.</dd>
  <dt>installer.linux</dt>
  <dd>Use it to provide additional parameters to the linux installer builders. You can learn about the extra parameters reading the docs of the involved NPM packages: <a href="https://www.npmjs.com/package/electron-installer-debian">electron-installer-debian</a> for `.deb` packages, and <a href="https://www.npmjs.com/package/electron-installer-redhat">electron-installer-redhat</a> for `.rpm` packages.</dd>
  <dd>When building `rpm` packages:</dd>
  <dd>- The `license` parameter is required.</dd>
  <dd>- `rpm` package is required when building from debian-based systems.</dd>
  <dd>When building `deb` packages:</dd>
  <dd>- The parameter `maintainer` is recommended to be provided.</dd>
  <dd>- `fakeroot` package is required when building from debian-based systems.</dd>
  <dd>Please, provide feedback to complete this section if you try to build linux installers from other linux systems (i.e., redhat-based) and/or platforms (Mac/Windows).</dd>
  <dt>autoBuild</dt>
  <dd>Prevent the Electorn app from automatically being built and launched when set to `false`.</dd>
  <dt>autoPackage</dt>
  <dd>Set to `true` to ZIP the Electron app for distribution.</dd>
</dl>

## Electron-specific code

By default, all client web code will be executed in Electron. To include/exclude code use `Electron.isDesktop`

```javascript
if (!Electron.isDesktop()){
  showModal("Have you considered downloading our Electron app?");
}
```

## Deploying

Hot code push will work to update your app's UI just like it does on the web, since the app is loading the UI
_from_ the web. If you want to update the part of the app that interfaces with the OS, though&mdash;to change
the app icon, to add a menu bar icon, etc.&mdash;you'll need to distribute a new version of the `.app` or
`.exe`. Here's how to do that.

### Building and serving an auto-updating Mac app

1. Set `Meteor.settings.electron.autoPackage` to `true` to ZIP your app for distribution after it is
built.
2. If you wish to enable remote updates, you will need to codesign your application. This requires
that you build your app on a Mac with a [Developer ID certificate](https://developer.apple.com/library/mac/documentation/IDEs/Conceptual/AppDistributionGuide/DistributingApplicationsOutside/DistributingApplicationsOutside.html) installed.
Set `Meteor.settings.electron.sign` to the name of that certificate.
3. Wait for the app to finish building and packaging, then copy
`YOUR_PROJECT_DIRECTORY/.meteor-electron/darwin-x64/final/YOUR_APP_NAME.zip` to a publically-accessible
location.
4. Set `downloadUrls.darwin` in `Meteor.settings.electron` to the URL of the location where you copied the ZIP.

Downloads of the Mac app will be served at your webapp's `ROOT_URL` + `/app/download?platform=darwin`.

### Building and serving an auto-updating Windows app

0. Make sure that you have specified `name`, `version`, and `description` in `Meteor.settings.electron`.
1. Build the app [on a Mac](#building-for-windows-on-mac), because changing a Windows application icon
[does not work on Windows at present](https://github.com/maxogden/electron-packager/issues/53).
2. Ensure the URL specified by `Meteor.settings.electron.downloadUrls.win32` has an empty `RELEASES` file.
2. On a Windows machine or in a Windows VM ([not a Mac, at present](https://github.com/atom/grunt-electron-installer/issues/90)),
run the [electron installer grunt plugin](https://github.com/atom/grunt-electron-installer) against your app.
Your Gruntfile should look something like https://github.com/rissem/meteor-electron-test/tree/master/.test.
The value of `remoteReleases` should be your webapp's `ROOT_URL` + '/app/latest'.
3. Copy the output to the server serving `Meteor.settings.electron.downloadUrls.win32`, to be served
from that location.
4. When you publish a new update, run the installer again and it will generate diffs, a new `RELEASES` file,
and new installers. After copying these to `Meteor.settings.electron.downloadUrls.win32` again (overwriting
the `RELEASES` file and installers), apps that check for updates should receive a new version.

Downloads of the Windows installer will be served at your webapp's `ROOT_URL` + `/app/download?platform=win32`.

### Building and serving an auto-updating Linux app

0. Make sure that you have specified `name`, `version`, `description`, `installer.linux.license` and `installer.linux.maintainer` in `Meteor.settings.electron`.
2. Wait for the app to finish building and packaging, then copy `YOUR_PROJECT_DIRECTORY/.meteor-electron/linux-x64/final/{installer}` (where `{installer}` matches the name(s)/pattern(s) provided in `Meteor.settings.electron.downloadUrls.linux`) to a publically-accessible location.
4. Set `downloadUrls.linux` in `Meteor.settings.electron` to the URL(s) of the location(s) where you copied the installer(s).

Due to the different formats available for Linux, the download URLs will require an additional parameter `format`. Downloads of the Linux installers will be served at your webapp's `ROOT_URL` +:

- `/app/download?platform=linux&format=deb` for the debian-based linux systems installer.
- `/app/download?platform=linux&format=rpm` for the redhat-based linux systems installer.

## Building for Windows on Mac

1. Install [homebrew](http://brew.sh/)
2. `brew update`
3. `brew install wine`
4. Specify a Windows build in your settings (otherwise defaults to current platform (mac)).

```json
{
  "electron": {
    "builds": [
      {"platform": "win32",
       "arch": "ia32"}
    ]
  }
}
```

## Example

[TODO] Link to an awesome chat app

## Q&A

### Q: How is this different from all the other Meteor electron packages?

This package differs from [Electrometeor](https://github.com/sircharleswatson/Electrometeor) and
[Electrify](https://github.com/arboleya/electrify) by *not* baking Meteor into the packaged app.
This makes things significantly simpler, but if you need strong offline support, one of them is a
better solution.

### Q: How can I create new browser windows, set app notifications and all the other awesome native functionality that Electron gives me?

This project selectively exposes such functionality to the client, in a way that is safe and avoids
memory leaks, via the `Electron` module--see [`client.js`](client.js). To request that this module
expose additional functionality, please [submit a pull request](https://github.com/rissem/meteor-electron/pull/new/master)
or [file an issue](https://github.com/rissem/meteor-electron/issues/new).

You may also substitute your own application code for `meteor-electron`'s default application by
setting the `appSrcDir` settings option. `meteor-electron` will continue to package your application
and serve the application update feed and download URLs, but in-app functionality will be your
responsibility.  **Warning**: this responsibility includes setting up your application window and menu,
checking for remote updates, registering the `Electron` module (that defines `Electron.isDesktop`),
and possibly other things. If you take this route, it's recommended that you start by copying
`meteor-electron`'s `app` directory.

Also, you also probably want to keep your application code in a subdirectory of your application's
`private` directory so that Meteor will observe changes to it and restart the server; when it does
so, `meteor-electron` will rebuild and relaunch the app.

### Q: How do I prevent the Electron app from being automatically built and launched?

Set `Meteor.settings.electron.autoBuild` to `"false"`.

### Q: How do I set the download URLs for Linux?

You can provide a global pattern to automatically generate URLs for all the supported formats (deb/rpm at this moment) like this:

```json
{
  "electron": {
    ...
    "name": "Wonderful Meteor App",
    "version": "0.2.9",
    "rootUrl": "https://myapp.com",
    "downloadUrls": {
      "linux": "/download/{{platform}}/{{version}}/{{name}}.{{ext}}",
    }
  }
}
```

which produces:

```html
https://myapp.com/download/linux/0.2.9/wonderful-meteor-app.deb
https://myapp.com/download/linux/0.2.9/wonderful-meteor-app.rpm
```

The other way you can set the download URLs is through an object:

```json
{
  "electron": {
    ...
    "name": "Wonderful Meteor App",
    "version": "0.2.9",
    "rootUrl": "https://myapp.com",
    "downloadUrls": {
      "linux": {
        "deb": "/download/{{platform}}/{{version}}/{{name}}_{{version}}_x64.deb",
        "rpm": "/download/{{platform}}/{{version}}/redhat_{{name}}-{{version}}.x64.{{ext}}"
      }
    }
  }
}
```

which produces:

```html
https://myapp.com/download/linux/0.2.9/wonderful-meteor-app_0.2.9_x64.deb
https://myapp.com/download/linux/0.2.9/redhat_wonderful-meteor-app-0.2.9.x64.rpm
```

Anyway, the generated installers will be automatically renamed after being built to match the final parsed URLs and placed into `YOUR_PROJECT_DIRECTORY/.meteor-electron/linux-x64/final/`.
