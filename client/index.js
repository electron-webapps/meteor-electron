import * as _ from 'lodash';

export const Electron = _.defaults({
  /**
   * @return {Boolean} `true` if the app is running in Electron, `false` otherwise.
   */
  isElectron: () => /Electron/.test(navigator.userAgent),
}, window.ElectronImplementation);

export default Electron;
