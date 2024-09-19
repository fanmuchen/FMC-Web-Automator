const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    onNavigateTo: (callback) => ipcRenderer.on('navigate-to', callback),
    pageLoaded: (page) => ipcRenderer.send('page-loaded', page),
    onGetElement: (callback) => ipcRenderer.on('get-element-info', callback),
    elementGot: (element) => ipcRenderer.send('element-got', element),
    onMouseClick: (callback) => ipcRenderer.on('mouse-click', callback),
    onKeyClick: (callback) => ipcRenderer.on('key-click', callback),
    onMouseMove: (callback) => ipcRenderer.on('mouse-move', callback),
    onMousePress: (callback) => ipcRenderer.on('mouse-press', callback),
    onMouseUp: (callback) => ipcRenderer.on('mouse-up', callback),
    onKeyPress: (callback) => ipcRenderer.on('key-press', callback),
    onKeyUp: (callback) => ipcRenderer.on('key-up', callback),
    onType: (callback) => ipcRenderer.on('type', callback),
    onScroll: (callback) => ipcRenderer.on('scroll', callback),
    onGetSize: (callback) => ipcRenderer.on('get-size', callback),
    webviewSize: (webviewSize) => ipcRenderer.send('webview-size', webviewSize)
});

console.log('Preload script executed'); // Debug log
