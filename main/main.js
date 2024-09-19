const { app, BrowserWindow, ipcMain, session, webContents } = require('electron');
const path = require('path');
const express = require('express');
const WebSocket = require('ws');
const TaskEngine = require('./task-force/taskEngine');

const SERVER_PORT = 8888;
const WS_PORT = 8889;
const IP_FETCH_INTERVAL = 600000;
const IP_FETCH_MINIMAL_INTERVAL = 10000;

let lastIpFetchTime = 0;
let isIpFetchWaiting = false;
let mainWindow;
global.wsClients = [];
const taskEngine = new TaskEngine();

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            webviewTag: true
        }
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));
    console.log("Window initialized.");

    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
        console.log(`[Renderer Console] ${message} (source: ${sourceId}, line: ${line})`);
    });
}

function startServer() {
    const controlPanelApp = express();

    controlPanelApp.use(express.static(path.join(__dirname, '../control-panel/build')));

    controlPanelApp.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../control-panel/build', 'index.html'));
    });

    const server = controlPanelApp.listen(SERVER_PORT, '0.0.0.0', () => {
        console.log(`Control Panel server listening at http://0.0.0.0:${SERVER_PORT}`);
    });

    return server;
}

function startWebSocketServer() {
    const wss = new WebSocket.Server({ port: WS_PORT, host: '0.0.0.0' });

    wss.on('connection', (ws) => {
        console.log('WebSocket connection established');
        global.wsClients.push(ws);

        fetchAndBroadcastIP();
        taskEngine.broadcastTasklist();

        ws.on('message', (message) => {
            const data = JSON.parse(message);

            if (data.type === 'get-tasklist') {
                if (taskEngine.tasklist) {
                    taskEngine.broadcastTasklist();
                }
            } else if (data.type === 'get-task-engine-status') {
                broadcastTaskEngineStatus(taskEngine.isUp);
            } else if (data.type === 'toggle-task-engine') {
                if (taskEngine.isUp) {
                    taskEngine.stop();
                } else {
                    taskEngine.start(mainWindow.webContents);
                }
                broadcastTaskEngineStatus(taskEngine.isUp);
            } else if (data.type === 'add-task') {
                taskEngine.addTask(data.task);
            } else if (data.type === 'delete-task') {
                taskEngine.deleteTask(data.id);
            } else if (data.type === 'edit-task') {
                taskEngine.editTask(data.task);
            } else if (data.type === 'error') {
                console.log('WebSocket received error:', data.message);
                global.wsClients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'error', message: data.message }));
                    }
                });
            }
        });

        ws.on('close', () => {
            console.log('WebSocket connection closed');
            global.wsClients = global.wsClients.filter(client => client !== ws);
        });

        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
        });
    });

    console.log(`WebSocket server listening at ws://0.0.0.0:${WS_PORT}`);
}

async function fetchAndBroadcastIP() {
    const currentTime = Date.now();
    const timeSinceLastFetch = currentTime - lastIpFetchTime;

    if (timeSinceLastFetch < IP_FETCH_MINIMAL_INTERVAL) {
        const waitTime = IP_FETCH_MINIMAL_INTERVAL - timeSinceLastFetch;
        console.log(`Waiting ${waitTime}ms before fetching IP.`);
        if (!isIpFetchWaiting) {
            isIpFetchWaiting = true;
            setTimeout(() => {
                isIpFetchWaiting = false;
                fetchAndBroadcastIP();
            }, waitTime);
        }
        return;
    }

    lastIpFetchTime = Date.now();
    let headlessWindow;
    try {
        headlessWindow = new BrowserWindow({
            show: false,
            webPreferences: {
                preload: path.join(__dirname, 'preload.js')
            }
        });

        await headlessWindow.loadURL('http://ip-api.com/json');

        const ipData = await headlessWindow.webContents.executeJavaScript('document.body.innerText');
        const parsedData = JSON.parse(ipData);

        console.log('Successfully fetched IP data.');

        const message = JSON.stringify({
            type: 'ip-update',
            ip: parsedData.query,
            city: parsedData.city,
            country: parsedData.country
        });

        global.wsClients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    } catch (error) {
        console.error('Error fetching IP data:', error);
    } finally {
        if (headlessWindow) {
            headlessWindow.close();
        }
    }
}

function broadcastTaskEngineStatus(running) {
    const message = JSON.stringify({ type: 'task-engine-status', running });
    global.wsClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

function setUserAgent() {
    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
        details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36';
        callback({ cancel: false, requestHeaders: details.requestHeaders });
    });
}

app.whenReady().then(() => {
    const server = startServer();

    // const autoTargetSession = session.fromPartition('persist:autoTarget');

    // autoTargetSession.setProxy({
    //     mode: 'fixed_servers',
    //     proxyRules: 'http://58.253.210.122:8888'
    // }
    // ).then(() => {
    //     console.log('Proxy set for autoTargetWebview');
    // }).catch((error) => {
    //     console.error('Error setting proxy for autoTargetWebview:', error);
    // });


    createWindow();
    startWebSocketServer();
    setUserAgent();

    setInterval(fetchAndBroadcastIP, IP_FETCH_INTERVAL);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });

    app.on('window-all-closed', () => {
        server.close(() => {
            console.log('Control Panel server closed');
        });
        app.quit();
    });
});
