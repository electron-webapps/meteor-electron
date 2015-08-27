Electron = {}

Electron.isDesktop = function(){
  return /Electron/.test(navigator.userAgent);
}
