# meteor-electron
Experimental electron package

## DISCLAIMER - DOCS BELOW DO NOT REFELECT CURRENT FUNCTIONALITY

Meteor-electron strives to be the easiest way to create a desktop Meteor application.

## Installation

`meteor add quark:electron`

After adding the package, an electron app wrapper will be built and opened.

This app, as well as the ready-to-distribute binaries (see [Deploy](#deploy)), is built within
`YOUR_PROJECT_DIRECTORY/.meteor-electron`. This allows the apps to be easily located as well as
(forthcoming) the apps to be cached for speedier startup. You should add this directory to your
`.gitignore`.

## Configuration
Limited configuration is possible via `Meteor.settings.electron` For example
```json
{
  "electron": {
    "name": "MyApp",
    "icon": {
      "osx": "build/MyApp.icns"
    },
    // Must conform to Semver: https://docs.npmjs.com/getting-started/semantic-versioning.
    "version": "0.1.0",
    // If unset, defaults to the ROOT_URL environment variable.
    "rootUrl": "https://myapp.com",
    // If you want your app to open to a non-root URL. Will be appended to the root URL.
    "launchPath": "/app/landing",
    // Place the latest version of the built app at this location.
    "latestUrl": "...",
    // Must be set to enable auto-updates on Mac.
    "sign": "Developer ID Application: ...",
    // minHeight/maxHeight are also supported.
    "height": 768,
    // minWidth/maxWidth are also supported.
    "width": 1024,
    "frame": true,
    "title-bar-style": "hidden",
    "resizable": true
  }
}
```
If Meteor.settings.electron.rootUrl is unset, defaults to the `APP_ROOT_URL` and then `ROOT_URL` environment variables, in that order.

## Electron specific code

By default, all client code will be executed in Electron. To include/exclude code use `Electron.isDesktop`

```javascript
if (! Electron.isDesktop){
  showModal("Have you considered downloading our Electron app?");
}
```

## Deploy

Copy `YOUR_PROJECT_DIRECTORY/.meteor-electron/final/app-darwin.zip` to a publically-accessible
location, then set `latestUrl` in `Meteor.settings.electron` to that URL.

## Example

[TODO] Link to an awesome chat app

## Q&A

### Q: How is this different from all the other meteor electron packages?
This package differs from [Electrometeor](https://github.com/sircharleswatson/Electrometeor) by *not* baking Meteor into the packaged app. This makes things significantly simpler, but if you need strong offline support, Electrometeor is a better solution.

I have not looked at [jrudio/meteor-electron](https://github.com/jrudio/meteor-electron) or [electrify](https://github.com/arboleya/electrify) too closely, but in general the philsophy of this project is simplicity over customizability. These two are likely a better fit if you're interested in customizing the main process file or the NPM modules used within Electron. More information below.

### Q: Can I modify the main process file or the NPM packages for the app?
No. By maintaining control over the main process file, we are able to offer cross-platform builds. Allowing users to modify the main process file or NPM packages could easily break our build process.

### Q: If I can't modify the main process file, how can I create new browser windows, set app notifications and all the other awesome native functionality that Electron gives me?

This project selectively exposes such functionality to the client, in a way that is safe and avoids
memory leaks, via the `Electron` module--see [`client.js`](client.js). To request that this module
expose additional functionality, please [submit a pull request](https://github.com/rissem/meteor-electron/pull/new/master)
or [file an issue](https://github.com/rissem/meteor-electron/issues/new).

### Q: How do I prevent the Electron app from being built/served in production if for instance I want to do that separately (means forthcoming)?

Set the ELECTRON_AUTO_BUILD environment variable to "false".

## Ideas

- The ultimate goal here would be to build `meteor add-platform desktop`
- But to start off, we'll just figure out a way to get Meteor running with electron somehow. We'll take a different approach than [electrometeor](https://github.com/sircharleswatson/Electrometeor), which runs Meteor inside electron -- instead, we want to run electron inside Meteor.
- Step one is to have an electron package that you can add to your meteor app and configure - eg. window size, URL to load, etc.
- Once we have this up and running we can explore how to expose more of the electron API. Eg. being able to talk to different OS-specific features (task bar, dock, etc)
- We need to figure out how electron fits into meteor's client/server architecture. Is it a "third place"? If so, how does a Meteor developer access it?
