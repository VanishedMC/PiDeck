const { remote } = require('electron');
const socket = remote.getGlobal("socket");

if(process.platform !== 'win32') {
    $('body').addClass("hideCursor");
}

const updateFolderPath = function(folder) {
    let path = '';

    $.getJSON('http://pi.deck:42069/data.json', function(pideck) {
        let folderData = pideck[folder];

        while(folderData.parentFolder != null) {
            path = ` / <a onclick="loadFolder('${folderData.name}')">` + folderData.displayName + '</a>' + path;
            folderData = pideck[folderData.parentFolder];
        }

        path = '<a onclick="loadFolder(\'homePage\')">Home folder</a>' + path;

        $('.path').html(path);
    });
}

document.addEventListener("keydown", function (e) {
    if (e.which === 123) {
        remote.getCurrentWindow().toggleDevTools();
    } else if (e.which === 116) {
        location.reload();
    }
});

const command = function(channel, message) {
    socket.emit(channel, message);
}

const loadPage = function(page, folder = 'homePage') {
    $('#main').html('');
    $('.path').html('');
    $('#content').load(page, () => {
        if(page == 'mainWindow.html') {
            loadFolder(folder);
        }
    });
}
