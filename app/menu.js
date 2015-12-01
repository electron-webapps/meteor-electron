var BrowserWindow = require('browser-window');
var Menu = require('menu');

/**
 * Creates a default menu. Modeled after https://github.com/atom/electron/pull/1863.
 */
var createDefaultMenu = function(app, appName) {
  appName = appName || 'Electron';

  app.once('ready', function() {
    var template;
    if (process.platform == 'darwin') {
      template = [
        {
          label: appName,
          submenu: [
            {
              label: 'About ' + appName,
              selector: 'orderFrontStandardAboutPanel:'
            },
            {
              type: 'separator'
            },
            {
              label: 'Services',
              submenu: []
            },
            {
              type: 'separator'
            },
            {
              label: 'Hide ' + appName,
              accelerator: 'Command+H',
              selector: 'hide:'
            },
            {
              label: 'Hide Others',
              accelerator: 'Command+Shift+H',
              selector: 'hideOtherApplications:'
            },
            {
              label: 'Show All',
              selector: 'unhideAllApplications:'
            },
            {
              type: 'separator'
            },
            {
              label: 'Quit',
              accelerator: 'Command+Q',
              click: function() { app.quit(); }
            },
          ]
        },
        {
          label: 'Edit',
          submenu: [
            {
              label: 'Undo',
              accelerator: 'Command+Z',
              selector: 'undo:'
            },
            {
              label: 'Redo',
              accelerator: 'Shift+Command+Z',
              selector: 'redo:'
            },
            {
              type: 'separator'
            },
            {
              label: 'Cut',
              accelerator: 'Command+X',
              selector: 'cut:'
            },
            {
              label: 'Copy',
              accelerator: 'Command+C',
              selector: 'copy:'
            },
            {
              label: 'Paste',
              accelerator: 'Command+V',
              selector: 'paste:'
            },
            {
              label: 'Select All',
              accelerator: 'Command+A',
              selector: 'selectAll:'
            },
          ]
        },
        {
          label: 'View',
          submenu: [
            {
              label: 'Reload',
              accelerator: 'Command+R',
              click: function() {
                var focusedWindow = BrowserWindow.getFocusedWindow();
                if (focusedWindow) {
                  focusedWindow.restart();
                }
              }
            },
            {
              label: 'Toggle Full Screen',
              accelerator: 'Ctrl+Command+F',
              click: function() {
                var focusedWindow = BrowserWindow.getFocusedWindow();
                if (focusedWindow) {
                  focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
                }
              }
            }
          ]
        },
        {
          label: 'Window',
          submenu: [
            {
              label: 'Minimize',
              accelerator: 'Command+M',
              selector: 'performMiniaturize:'
            },
            {
              label: 'Close',
              accelerator: 'Command+W',
              selector: 'performClose:'
            },
            {
              type: 'separator'
            },
            {
              label: 'Bring All to Front',
              selector: 'arrangeInFront:'
            },
          ]
        }
      ];
    } else {
      template = [
        {
          label: '&File',
          submenu: [
            {
              label: '&Open',
              accelerator: 'Ctrl+O',
            },
            {
              label: '&Close',
              accelerator: 'Ctrl+W',
              click: function() {
                var focusedWindow = BrowserWindow.getFocusedWindow();
                if (focusedWindow) {
                  focusedWindow.close();
                }
              }
            },
          ]
        },
        {
          label: '&View',
          submenu: [
            {
              label: '&Reload',
              accelerator: 'Ctrl+R',
              click: function() {
                var focusedWindow = BrowserWindow.getFocusedWindow();
                if (focusedWindow) {
                  focusedWindow.reload();
                }
              }
            },
            {
              label: 'Toggle &Full Screen',
              accelerator: 'F11',
              click: function() {
                var focusedWindow = BrowserWindow.getFocusedWindow();
                if (focusedWindow) {
                  focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
                }
              }
            }
          ]
        }
      ];
    }

    var menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  });
};

module.exports = createDefaultMenu;
