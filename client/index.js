/**
 * Defines useful client-side functionality.
 */
Electron = {
  /**
   * @return {Boolean} `true` if the app is running in Electron, `false` otherwise.
   */
  isDesktop: function(){
    return /Electron/.test(navigator.userAgent);
  },

  /**
   * @return {Boolean} `true` if the app is running in Windows, `false` otherwise.
   */
  isWindows: function(){
    return /Windows NT/.test(navigator.userAgent);
  },



  // When the app is running in Electron, the following methods will be implemented by `preload.js`.
  // Stub them out in case the client tries to call them even when not running in Electron.

  /**
   * Open the given external protocol URL in the desktop's default manner. (For example, http(s):
   * URLs in the user's default browser.)
   *
   * @param {String} url - The URL to open.
   */
  openExternal: function() {},

  /**
   * Determines if the browser window is currently in fullscreen mode.
   *
   * "Fullscreen" here refers to the state triggered by toggling the native controls, not that
   * toggled by the HTML API.
   *
   * To detect when the browser window changes fullscreen state, observe the 'enter-full-screen'
   * and 'leave-full-screen' events using `onWindowEvent`.
   *
   * @return {Boolean} `true` if the browser window is in fullscreen mode, `false` otherwise.
   */
  isFullScreen: function() {},

  /**
   * Invokes _callback_ when the specified `BrowserWindow` event is fired.
   *
   * See https://github.com/atom/electron/blob/master/docs/api/browser-window.md#events for a list
   * of events.
   *
   * @param {String} event - The name of a `BrowserWindow` event.
   * @param {Function} callback - A function to invoke when `event` is triggered. Takes no arguments
   *   and returns no value.
   */
  onWindowEvent: function() {}
};

// Read `ElectronImplementation` from the window vs. doing `typeof ElectronImplementation` because
// Meteor will shadow it with a local variable in the latter case.
if (!_.isUndefined(window.ElectronImplementation)) {
  // The app is running in Electron. Merge the implementations from `preload.js`.
  _.extend(Electron, window.ElectronImplementation);
}
