# meteor-electron
Experimental electron package

## DISCLAIMER - DOCS BELOW DO NOT REFELECT CURRENT FUNCTIONALITY

Meteor-electron strives to be the easiest way to create a desktop Meteor application.

## Installation

`meteor add quark:electron`

After adding the package, an electron app wrapper will be while you develop.

## Configuration
Limited configuration is possible via `Meteor.settings.electron` For example
```json
{
  "electron": {
    "name": "MyApp",
    "icon": {
      "osx": "build/MyApp.icns"
    },
    // minHeight/maxHeight are also supported.
    "height": 768,
    // minWidth/maxWidth are also supported.
    "width": 1024,
    "frame": true,
    "resizable": true,
    "rootUrl": "https://..."
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

## Download Button

Add a download button to your app with `{{> electronDownload}}`. This button points to `/download/darwin-x64`, `/download/linux-ia64`, etc. based on platform. Feel free to point to these locations manually yourself as well.

The download button will not be shown within the Electron application.

## Deploy

No additional build steps are necessary. After your application has been deployed, the download links will send electron apps that point to production.

## Example

[TODO] Link to an awesome chat app

## Q&A

### Q: How is this different from all the other meteor electron packages?
This package differs from [Electrometeor](https://github.com/sircharleswatson/Electrometeor) by *not* baking Meteor into the packaged app. This makes things significantly simpler, but if you need strong offline support, Electrometeor is a better solution.

I have not looked at [jrudio/meteor-electron](https://github.com/jrudio/meteor-electron) or [electrify](https://github.com/arboleya/electrify) too closely, but in general the philsophy of this project is simplicity over customizability. These two are likely a better fit if you're interested in customizing the main process file or the NPM modules used within Electron. More information below.

### Q: Can I modify the main process file or the NPM packages for the app?
No. By maintaining control over the main process file, we are able to offer cross-platform builds. Allowing users to modify the main process file or NPM packages could easily break our build process.

### Q: If I can't modify the main process file, how can I create new browser windows, set app notifications and all the other awesome native functionality that Electron gives me?
Electron exposes these to the client (of the Meteor app in our case) via the [remote module](http://electron.atom.io/docs/v0.31.0/api/remote/)

### Q: How do I prevent the Electron app from being built/served in production if for instance I want to do that separately (means forthcoming)?

Set the ELECTRON_AUTO_BUILD environment variable to "false".

## Ideas

- The ultimate goal here would be to build `meteor add-platform desktop`
- But to start off, we'll just figure out a way to get Meteor running with electron somehow. We'll take a different approach than [electrometeor](https://github.com/sircharleswatson/Electrometeor), which runs Meteor inside electron -- instead, we want to run electron inside Meteor.
- Step one is to have an electron package that you can add to your meteor app and configure - eg. window size, URL to load, etc.
- Once we have this up and running we can explore how to expose more of the electron API. Eg. being able to talk to different OS-specific features (task bar, dock, etc)
- We need to figure out how electron fits into meteor's client/server architecture. Is it a "third place"? If so, how does a Meteor developer access it?
