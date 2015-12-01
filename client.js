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

  // When the app is running in Electron, the following methods will be implemented by `preload.js`.
  // Stub them out in case the client tries to call them even when not running in Electron.

  /**
   * Open the given external protocol URL in the desktop's default manner. (For example, http(s):
   * URLs in the user's default browser.)
   *
   * @param {String} url - The URL to open.
   */
  openExternal: _.noop,

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
  onWindowEvent: _.noop
};

if (typeof ElectronImplementation !== 'undefined') {
  // The app is running in Electron. Merge the implementations from `preload.js`.
  _.extend(Electron, ElectronImplementation);
}
