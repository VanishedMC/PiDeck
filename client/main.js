const electron = require('electron');
const url = require('url');
const path = require('path');
const io = require('socket.io-client');
const socket = io('http://pi.deck:42069', {
    reconnectionDelayMax: 2000,
    reconnectionDelay: 200
});

const {app, BrowserWindow, Menu, ipcMain} = electron;

let mainWindow;

app.on('ready', function() {   
    let windowSettings = {};

    if(process.platform == 'linux') {
        windowSettings = {
            width: 800,
            height: 480,
            fullscreen: true,

            webPreferences: {
                nodeIntegration: true
            }
        };
    } else {
        windowSettings = {
            width: 800,
            height: 480,
            frame: false,
            resizable: false,
            
            webPreferences: {
                nodeIntegration: true
            }
        };
    }

    mainWindow = new BrowserWindow(windowSettings);
    mainWindow.loadURL(`file://${__dirname}/assets/black.html`);

    Menu.setApplicationMenu(null);
    if(process.platform == 'linux') {
        mainWindow.maximize();
    }

    global.socket = socket;
});

socket.on('loadFile', function(file) {
    mainWindow.loadURL(`http://pi.deck:42069/${file}`);
});

socket.on('disconnect', function() {
    mainWindow.loadURL(`file://${__dirname}/assets/black.html`);
});

socket.on('close', function() {
    app.quit();
});
