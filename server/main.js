const electron = require('electron');
const express = require('express')
const expressApp = express();
const http = require('http').createServer(expressApp);
const io = require('socket.io')(http);
const ncp = require('ncp').ncp;
const rimraf = require("rimraf");
const { exec } = require('child_process');
const { app, Menu, Tray, ipcMain, BrowserWindow } = electron;
const notes = require('./notes.js')(app.getPath('userData'));

// App lock
if(!app.requestSingleInstanceLock()) {
    console.log('Unable to request app lockcd ..')
    app.exit();
}

// Delete old tmp folder, clone public folder and start server
const dataPath = app.getPath('userData');
rimraf(`${dataPath}/publictmp`, function() {
    ncp(`${__dirname}/public`, `${dataPath}/publictmp`, (err) => {
        if(err) {
            return console.error(err);
        }

        expressApp.use('/',express.static(dataPath + '/publictmp'));

        http.listen(42069, function(){
            console.log('listening on *:42069');
        });

        Menu.setApplicationMenu(null);
    });
});

// System tray
let tray = null
app.on('ready', () => {
    notes.load();

    tray = new Tray(`${__dirname}/assets/icon.ico`)
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Add note', click: () => {
            addNote();
        }},
        { label: 'Reload Client', click: () => {
            console.log('Reloading client');
            reloadClient();
        }},
        { label: 'Close Client', click: () => {
            console.log('Closing client');
            io.sockets.emit('close');
        }},
        { label: 'Restart Server', click: () => {
            cleanUpTmpFolder();
            app.relaunch();
            app.quit();
            console.log('Restarting server');
        }},
        { label: 'Shutdown Server', click: () => {
            cleanUpTmpFolder();
            app.exit();
        }}
    ]);

    tray.setToolTip('PiDeck Controls')
    tray.setContextMenu(contextMenu)
});

// Socket events
io.on('connection', function(socket){
    socket.emit('loadFile', 'base.html');

    socket.on('skynode', function(data) {
        console.log(data);
        ahkScript('text.exe "' + links[data] + '"');
    });

    socket.on('copypaste', function(data) {
        ahkScript('text.exe "' + copypastas[data] + '"');
    });

    socket.on('reload', function() {
        reloadClient();
    });

    socket.on('notes', function(args) {
        if(args.type == 'add') {
            addNote();
        } else if(args.type == 'delete') {
            notes.delete(args.payload);
        }

        socket.emit('notes', notes.get());
    });
});

// System events
ipcMain.on('notes', function(e, data) {
    notes.add({description: data});
    io.sockets.emit('notes', notes.get());
    e.reply('');
});

// Methods
function cleanUpTmpFolder() {
    rimraf.sync(`${dataPath}/publictmp`);
}

function addNote() {
    var popup = new BrowserWindow({autoHideMenuBar: true, frame:false, width: 300, height: 225, resizable: false, webPreferences: { nodeIntegration: true }});
    popup.loadURL(`file://${__dirname}/assets/popup.html`);
    popup.on('hide', () => { popup = null; });
}

const links = {
    "setup_jarfile": "https://help.skynode.pro/en/article/installing-a-server-jar-file-1uawpl0/",
    "setup_sftp": "https://help.skynode.pro/en/article/how-to-manage-files-using-sftp-1dn4a06/",
    "setup_forge": "https://help.skynode.pro/en/article/installing-forge-jg4xda/",
    "setup_world": "https://help.skynode.pro/en/article/how-to-upload-a-custom-world-17o6mzk/",
    "setup_domain": "https://help.skynode.pro/en/article/setting-up-a-domain-szk9qk/",
    "setup_diagnose": "https://help.skynode.pro/en/article/diagnosing-issues-6r7dj/",
    "setup_icon": "https://help.skynode.pro/en/article/how-to-set-your-server-icon-1m5tocq/",
    "setup_subusers": "https://help.skynode.pro/en/article/how-to-use-subusers-multiple-accounts-jqvwdi/",
    "setup_resourcepack": "https://help.skynode.pro/en/article/setting-a-custom-resource-pack-6btrip/",
    "plugins_install": "https://help.skynode.pro/en/article/how-to-install-plugins-1i0ldb6/",
    "plugins_votifier": "https://help.skynode.pro/en/article/how-to-setup-votifier-162xx6e/",
    "vps_multicraft": "https://help.skynode.pro/en/article/installing-multicraft-17w5bw4/",
    "vps_setupKeys": "https://help.skynode.pro/en/article/how-to-create-ssh-keys-xpryno/",
    "vps_loginKeys": "https://help.skynode.pro/en/article/how-to-connect-to-your-vps-using-putty-1hsfsh4/",
    "vps_putty": "https://help.skynode.pro/en/article/how-to-login-using-ssh-keys-1j1bsij/",
    "general_changePlan": "https://help.skynode.pro/en/article/upgradingdowngrading-your-plan-17fh9n3/",
    "general_cancel": "https://help.skynode.pro/en/article/how-to-cancel-your-paypal-subscription-svum1v/",
    "general_bestPlan": "https://help.skynode.pro/en/article/what-plan-suits-me-the-best-by1wcu/",
    "youtube": "https://www.youtube.com/channel/UCh5wWyEj4gCJGr5-29W34-w"
};

const copypastas = {
    "beemovie": "According to all known laws of aviation, there is no way a bee should be able to fly.LNBRIts wings are too small to get its fat little body off the ground.LNBRThe bee, of course, flies anyways.LNBRbecause bees don't care what humans think is impossible.",
    "rickroll": "We're no strangers to loveLNBRYou know the rules and so do ILNBRA full commitment's what I'm thinking ofLNBRYou wouldn't get this from any other guyLNBRI just wanna tell you how I'm feelingLNBRGotta make you understandLNBRNever gonna give you upLNBRNever gonna let you downLNBRNever gonna run around and desert youLNBRNever gonna make you cryLNBRNever gonna say goodbyeLNBRNever gonna tell a lie and hurt youLNBRWe've known each other for so longLNBRYour heart's been aching but you're too shy to say itLNBRInside we both know what's been going onLNBRWe know the game and we're gonna play itLNBRAnd if you ask me how I'm feelingLNBRDon't tell me you're too blind to seeLNBRNever gonna give you upLNBRNever gonna let you downLNBRNever gonna run around and desert youLNBRNever gonna make you cryLNBRNever gonna say goodbyeLNBRNever gonna tell a lie and hurt youLNBRNever gonna give you upLNBRNever gonna let you downLNBRNever gonna run around and desert youLNBRNever gonna make you cryLNBRNever gonna say goodbyeLNBRNever gonna tell a lie and hurt youLNBRNever gonna give, never gonna giveLNBR(Give you up)LNBR(Ooh) Never gonna give, never gonna giveLNBR(Give you up)LNBRWe've known each other for so longLNBRYour heart's been aching but you're too shy to say itLNBRInside we both know what's been going onLNBRWe know the game and we're gonna play itLNBRI just wanna tell you how I'm feelingLNBRGotta make you understandLNBRNever gonna give you upLNBRNever gonna let you downLNBRNever gonna run around and desert youLNBRNever gonna make you cryLNBRNever gonna say goodbyeLNBRNever gonna tell a lie and hurt youLNBRNever gonna give you upLNBRNever gonna let you downLNBRNever gonna run around and desert youLNBRNever gonna make you cryLNBRNever gonna say goodbyeLNBRNever gonna tell a lie and hurt youLNBRNever gonna give you upLNBRNever gonna let you downLNBRNever gonna run around and desert youLNBRNever gonna make you cry",
    "russia": "Rossiya – svyashchennaya nasha derzhava,LNBRRossiya – lyubimaya nasha strana.LNBRMoguchaya volya, velikaya slava –LNBRTvoio dostoyanye na vse vremena!LNBRSlav'sya, Otechestvo nashe svobodnoye,LNBRBratskih narodov soyuz vekovoi,LNBRPredkami dannaya mudrost' narodnaya!LNBRSlav'sya, strana! My gordimsya toboi!LNBROt yuzhnyh morei do polyarnogo krayaLNBRRaskinulis' nashi lesa i polya.LNBROdna ty na svete! Odna ty takaya –LNBRKhranimaya Bogom rodnaya zemlya!LNBRShirokii prostor dlya mechty i dlya zhizni.LNBRGryadushchiye nam otkryvayut goda.LNBRNam silu daiot nasha vernost' Otchizne.LNBRTak bylo, tak yest' i tak budet vsegda!",
    "moskau": "MoskauLNBRFremd und geheimnisvollLNBRTürme aus rotem GoldLNBRKalt wie das EisLNBRMoskauLNBRDoch wer dich wirklich kenntLNBRDer weiß, ein Feuer brenntLNBRIn dir so heißLNBRKosaken hey hey hey hebt die Gläser (hey, hey)LNBRNatascha ha ha ha du bist schön (ha ha)LNBRTowarisch hey hey hey auf das Leben (hey, hey)LNBRAuf dein Wohl Bruder hey Bruder (hey, hey, hey, hey)LNBRMoskau, MoskauLNBRWirf die Gläser an die WandLNBRRussland ist ein schönes LandLNBRHo ho ho ho ho, heyLNBRMoskau, MoskauLNBRDeine Seele ist so großLNBRNachts da ist der Teufel losLNBRHa ha ha ha ha, heyLNBRMoskau, MoskauLNBRLiebe schmeckt wie KaviarLNBRMädchen sind zum küssen daLNBRHo ho ho ho ho, heyLNBRMoskau, MoskauLNBRKomm wir tanzen auf dem TischLNBRBis der Tisch zusammenbrichtLNBRHa ha ha ha haLNBRMoskauLNBRTor zur VergangenheitLNBRSpiegel der ZarenzeitLNBRRot wie das BlutLNBRMoskauLNBRWer deine Seele kenntLNBRDer weiß, die Liebe brenntLNBRHeiß wie die GlutLNBRKosaken hey hey hey hebt die Gläser (hey, hey)LNBRNatascha ha ha ha du bist schön (ha ha)LNBRTowarisch hey hey hey auf die Liebe (hey, hey)LNBRAuf dein Wohl Mädchen hey Mädchen ho (hey, hey, hey, hey)LNBRMoskau, MoskauLNBRWirf die Gläser an die WandLNBRRussland ist ein schönes LandLNBRHo ho ho ho ho, heyLNBRMoskau, MoskauLNBRDeine Seele ist so großLNBRNachts da ist der Teufel losLNBRHa ha ha ha ha, heyLNBRMoskauLNBRLala lala lala la, lala lala lala laLNBRHo ho ho ho ho, heyLNBRMoskau (Moskau)LNBRLala lala lala la, lala lala lala laLNBRHa ha ha ha haLNBROh oh, oh oh, oh, ohLNBROh oh oh oh, oh, oh, oh (Moskau)LNBR(Moskau) (hey hey, hey, hey, hey, hey)LNBRMoskau, MoskauLNBRLiebe schmeckt wie KaviarLNBRMädchen sind zum küssen daLNBRHo ho ho ho hoLNBRMoskau, MoskauLNBRKomm wir tanzen auf dem TischLNBRBis der Tisch zusammenbrichtLNBRHa ha ha ha ha, hey",
    "allstars": "Somebody once told me the world is gonna roll meLNBRI ain't the sharpest tool in the shedLNBRShe was looking kind of dumb with her finger and her thumbLNBRIn the shape of an \"L\" on her foreheadLNBRWell the years start coming and they don't stop comingLNBRFed to the rules and I hit the ground runningLNBRDidn't make sense not to live for funLNBRYour brain gets smart but your head gets dumbLNBRSo much to do, so much to seeLNBRSo what's wrong with taking the back streets?LNBRYou'll never know if you don't goLNBRYou'll never shine if you don't glowLNBRHey now, you're an all-star, get your game on, go playLNBRHey now, you're a rock star, get the show on, get paidLNBRAnd all that glitters is goldLNBROnly shooting stars break the moldLNBRIt's a cool place and they say it gets colderLNBRYou're bundled up now, wait till you get olderLNBRBut the meteor men beg to differLNBRJudging by the hole in the satellite pictureLNBRThe ice we skate is getting pretty thinLNBRThe water's getting warm so you might as well swimLNBRMy world's on fire, how about yours?LNBRThat's the way I like it and I never get boredLNBRHey now, you're an all-star, get your game on, go playLNBRHey now, you're a rock star, get the show on, get paidLNBRAll that glitters is goldLNBROnly shooting stars break the moldLNBRHey now, you're an all-star, get your game on, go playLNBRHey now, you're a rock star, get the show, on get paidLNBRAnd all that glitters is goldLNBROnly shooting starsLNBRSomebody once asked could I spare some change for gas?LNBRI need to get myself away from this placeLNBRI said yep what a conceptLNBRI could use a little fuel myselfLNBRAnd we could all use a little changeLNBRWell, the years start coming and they don't stop comingLNBRFed to the rules and I hit the ground runningLNBRDidn't make sense not to live for funLNBRYour brain gets smart but your head gets dumbLNBRSo much to do, so much to seeLNBRSo what's wrong with taking the back streets?LNBRYou'll never know if you don't go (go!)LNBRYou'll never shine if you don't glow",
    "racism": "Exscuses me sir,what the cinnamon toast fuck is a white.😡😡Where do you even find them?!?!I have never heard of a white man even after many years of living in Nibbanopolis Nibbasippi.I checked nigipedia today and while relearning my colors I went to white and there was another search result about this thing called a white man.How does that even make any sense.We all know the lightest skin color is Carmel brown.This must be bullshit.Please reconsider the creation of humanity cause I think they're may have been a mistake.LNBRLNBRSincerely, Nigbi Nijowski",
    "cum": "The average person needs 2,000 calories a day.LNBRLNBRThe average ejaculation contains around 1 calorie.LNBRLNBRThat’s 2000 nuts a day or 730,000 nuts per year.LNBRLNBRHowever the average ejaculation is 3 milliliters.LNBRLNBRThat’s 6000 milliliters or 6 liters a day of cum.LNBRLNBRThe human stomach can only hold a maximum of 5 liters.LNBRLNBRImagine your entire digestive system filled to the brim with jizz every single day, it sounds awful and I love the taste of cum.LNBRLNBRTo sustain yourself off of jizz you would need to be the ultimate cumslut.LNBRLNBRExtra info:LNBRLNBRThe average guy takes 5.5 minutes to cum and 20 minutes to recover.LNBRLNBRThat means if a guy had to cum as his job he would nut roughly 20 times in those 8 hours.LNBRLNBRTo get 2000 nuts per day you would need 100 dudes working 8 hours a day.LNBRLNBRThat’s 800 manhours to feed somebody on just jizz for one day.LNBRLNBRAssuming you paid them a fair wage if $15 per hour you’re paying $12,000 dollars per day to sustain yourself.LNBRLNBRThat’s $4,380,000 dollars per year to feed yourself on cum.LNBRLNBRAnd even then you’d be lacking in most nutrients and vitamins.LNBRLNBRAt least you can make some guys very very happy until you die of malnutrition.",
    "man": "⠀⠀⣀⣤LNBR⠀⠀⠀⠀⣿⠿⣶LNBR⠀⠀⠀⠀⣿⣿⣀LNBR⠀⠀⠀⣶⣶⣿⠿⠛⣶LNBR⠤⣀⠛⣿⣿⣿⣿⣿⣿⣭⣿⣤LNBR⠒⠀⠀⠀⠉⣿⣿⣿⣿⠀⠀⠉⣀LNBR⠀⠤⣤⣤⣀⣿⣿⣿⣿⣀⠀⠀⣿LNBR⠀⠀⠛⣿⣿⣿⣿⣿⣿⣿⣭⣶⠉LNBR⠀⠀⠀⠤⣿⣿⣿⣿⣿⣿⣿LNBR⠀⠀⠀⣭⣿⣿⣿⠀⣿⣿⣿LNBR⠀⠀⠀⣉⣿⣿⠿⠀⠿⣿⣿LNBR⠀⠀⠀⠀⣿⣿⠀⠀⠀⣿⣿⣤LNBR⠀⠀⠀⣀⣿⣿⠀⠀⠀⣿⣿⣿LNBR⠀⠀⠀⣿⣿⣿⠀⠀⠀⣿⣿⣿LNBR⠀⠀⠀⣿⣿⠛⠀⠀⠀⠉⣿⣿LNBR⠀⠀⠀⠉⣿⠀⠀⠀⠀⠀⠛⣿LNBR⠀⠀⠀⠀⣿⠀⠀⠀⠀⠀⠀⣿⣿LNBR⠀⠀⠀⠀⣛⠀⠀⠀⠀⠀⠀⠛⠿⠿⠿LNBR⠀⠀⠀⠛⠛LNBRLNBRLNBR⠀⠀⠀⣀⣶⣀LNBR⠀⠀⠀⠒⣛⣭LNBR⠀⠀⠀⣀⠿⣿⣶LNBR⠀⣤⣿⠤⣭⣿⣿LNBR⣤⣿⣿⣿⠛⣿⣿⠀⣀LNBR⠀⣀⠤⣿⣿⣶⣤⣒⣛LNBR⠉⠀⣀⣿⣿⣿⣿⣭⠉LNBR⠀⠀⣭⣿⣿⠿⠿⣿LNBR⠀⣶⣿⣿⠛⠀⣿⣿LNBR⣤⣿⣿⠉⠤⣿⣿⠿LNBR⣿⣿⠛⠀⠿⣿⣿LNBR⣿⣿⣤⠀⣿⣿⠿LNBR⠀⣿⣿⣶⠀⣿⣿⣶LNBR⠀⠀⠛⣿⠀⠿⣿⣿LNBR⠀⠀⠀⣉⣿⠀⣿⣿LNBR⠀⠶⣶⠿⠛⠀⠉⣿LNBR⠀⠀⠀⠀⠀⠀⣀⣿LNBR⠀⠀⠀⠀⠀⣶⣿⠿LNBRLNBR⠀⠀⠀⠀⠀⠀⠀⠀⣤⣿⣿⠶⠀⠀⣀⣀LNBR⠀⠀⠀⠀⠀⠀⣀⣀⣤⣤⣶⣿⣿⣿⣿⣿⣿LNBR⠀⠀⣀⣶⣤⣤⠿⠶⠿⠿⠿⣿⣿⣿⣉⣿⣿LNBR⠿⣉⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠛⣤⣿⣿⣿⣀LNBR⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⣿⣿⣿⣿⣶⣤LNBR⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣤⣿⣿⣿⣿⠿⣛⣿LNBR⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⣿⣿⠛⣿⣿⣿⣿LNBR⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣶⣿⣿⠿⠀⣿⣿⣿⠛LNBR⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⣿⣿⠀⠀⣿⣿⣿LNBR⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠿⠿⣿⠀⠀⣿⣶LNBR⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⠛⠀⠀⣿⣿⣶LNBR⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⣿⣿⠤LNBR⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠿⣿LNBR⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿LNBR⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⣀LNBR⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣶⣿LNBRLNBR⠀⠀⣀LNBR⠀⠿⣿⣿⣀LNBR⠀⠉⣿⣿⣀LNBR⠀⠀⠛⣿⣭⣀⣀⣤LNBR⠀⠀⣿⣿⣿⣿⣿⠛⠿⣶⣀LNBR⠀⣿⣿⣿⣿⣿⣿⠀⠀⠀⣉⣶LNBR⠀⠀⠉⣿⣿⣿⣿⣀⠀⠀⣿⠉LNBR⠀⠀⠀⣿⣿⣿⣿⣿⣿⣿⣿LNBR⠀⣀⣿⣿⣿⣿⣿⣿⣿⣿⠿LNBR⠀⣿⣿⣿⠿⠉⣿⣿⣿⣿LNBR⠀⣿⣿⠿⠀⠀⣿⣿⣿⣿LNBR⣶⣿⣿⠀⠀⠀⠀⣿⣿⣿LNBR⠛⣿⣿⣀⠀⠀⠀⣿⣿⣿⣿⣶⣀LNBR⠀⣿⣿⠉⠀⠀⠀⠉⠉⠉⠛⠛⠿⣿⣶LNBR⠀⠀⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣿LNBR⠀⠀⣿⣿⠀⠀⠀⠀⠀⠀⠀⠀⠉⠉LNBR⣀⣶⣿⠛LNBRLNBR⠀⠀⠀⠀⠀⠀⠀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀LNBR⠀⠀⠀⠀⠀⠀⣿⣿⣿⣤⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣤⣤⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀LNBR⠀⠀⠀⠀⠀⠀⠉⣿⣿⣿⣶⣿⣿⣿⣶⣶⣤⣶⣶⠶⠛⠉⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀LNBR⠀⠀⠀⠀⠀⠀⣤⣿⠿⣿⣿⣿⣿⣿⠀⠀⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀LNBR⠛⣿⣤⣤⣀⣤⠿⠉⠀⠉⣿⣿⣿⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀LNBR⠀⠉⠉⠉⠉⠉⠀⠀⠀⠀⠉⣿⣿⣿⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀LNBR⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣶⣿⣿⣿⣿⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀LNBR⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⣿⣿⣿⣿⣿⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀LNBR⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⣿⣿⣿⣿⣿⠛⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀LNBR⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⣿⣿⣿⣿⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀LNBR⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⣿⣛⣿⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀LNBR⠀⠀⠀⠀⠀⠀⠀⣶⣿⣿⠛⠿⣿⣿⣿⣶⣤⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀LNBR⠀⠀⠀⠀⠀⠀⠀⣿⠛⠉⠀⠀⠀⠛⠿⣿⣿⣶⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀LNBR⠀⠀⠀⠀⠀⠀⣿⣀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠛⠿⣶⣤⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀LNBR⠀⠀⠀⠀⠀⠛⠿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣿⣿⠿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀LNBR⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠛⠉⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀LNBRLNBR⠀⠀⠀⠀⠀⠀⣤⣶⣶LNBR⠀⠀⠀⠀⠀⠀⣿⣿⣿⣿⣀⣀LNBR⠀⠀⠀⠀⠀⣀⣶⣿⣿⣿⣿⣿⣿LNBR⣤⣶⣀⠿⠶⣿⣿⣿⠿⣿⣿⣿⣿LNBR⠉⠿⣿⣿⠿⠛⠉⠀⣿⣿⣿⣿⣿LNBR⠀⠀⠉⠀⠀⠀⠀⠀⠀⣿⣿⣿⣿⣤⣤LNBR⠀⠀⠀⠀⠀⠀⠀⣤⣶⣿⣿⣿⣿⣿⣿LNBR⠀⠀⠀⠀⠀⣀⣿⣿⣿⣿⣿⠿⣿⣿⣿⣿LNBR⠀⠀⠀⠀⣀⣿⣿⣿⠿⠉⠀⠀⣿⣿⣿⣿LNBR⠀⠀⠀⠀⣿⣿⠿⠉⠀⠀⠀⠀⠿⣿⣿⠛LNBR⠀⠀⠀⠀⠛⣿⣿⣀⠀⠀⠀⠀⠀⣿⣿⣀LNBR⠀⠀⠀⠀⠀⣿⣿⣿⠀⠀⠀⠀⠀⠿⣿⣿LNBR⠀⠀⠀⠀⠀⠉⣿⣿⠀⠀⠀⠀⠀⠀⠉⣿LNBR⠀⠀⠀⠀⠀⠀⠀⣿⠀⠀⠀⠀⠀⠀⣀⣿LNBR⠀⠀⠀⠀⠀⠀⣀⣿⣿LNBR⠀⠀⠀⠀⠤⣿⠿⠿⠿",
    "woosh": "r/WOW r/kid you just got r/WOOOOOOSHED!!!! 😂😂👀 “Wooosh” r/means you didn’t r/get the r/joke, as in the r/soundr/made when the r/joke “woooshes” over your r/head. I r/bet you’re too r/stupid to r/get it, r/IDIOT!! 😤😤😂 r/My r/jokewas so r/thoughtfully r/crafted and r/took me a r/total of r/3 r/minutes, you r/SHOULD be r/laughing. 🤬 r/What’s that? My r/joke is r/bad? I r/think that’s r/just r/because you r/failed. I r/outsmarted you, r/nitwit.🤭 In r/conclusion, I am r/posting r/this to the r/community known as “R/Wooooosh” to r/claim my r/internet r/points in your r/embarrassment 😏. r/Imbecile. The r/Germans refer to this r/action as r/Schadenfreude, which r/means r/harm-joy 😬😲. r/WOW! 🤪 Another r/reference I r/had to r/explain to r/you. 🤦‍♂️🤭 I am going to r/cease this r/conversation for I do r/not r/conversewith r/simple r/minded r/persons.😏😂",
    "uwu": "OwO what's this?😳❓Big red❤️💋meaty steak🥩🍖UwU❤️❤️💖Mmm~ So tasty yummy UwO😉😘, licks meat👅👅💓💓Unnf Uwu tastesss soo gwood daddy☺️🤩😜~~ What?!⁉️EGGS?!?🥚⁉️:0 😮UwU Shakeys whittle baby tail🐶💖♥️ mmm Daddy I Wuuuuv eggs~🥚💋💖I Wuuuuuuu💗💞 Yo Eggs espweciawy uwo,mmm tastes soooo good~💦",
    "gru": "gruLNBRLNBRwe all know gru is the Goldy height of 14.5 feet tall and can move at the speed of 200 meters per second. based on average dick size, grus penis is around 14 inches long. also, grus dick would weigh around 2 pounds considering the average weight of a dick is .77 lbs. if he swung his dick in a circular manner, it would have the centripetal acceleration of 72.57 meters per second. this means that gru can dickslap with the immense energy of 11,421 per square inch at the tip greater speed than 584415.58336974 MPH. in conclusion, grus dickslap has enough energy to smash through a 6\" reenforced concrete and will cause a thunderclap as his dick breaks the sound barrier, I rest my case",
    "navyseal": "What the fuck did you just fucking say about me, you little bitch? I’ll have you know I graduated top of my class in the Navy Seals, and I’ve been involved in numerous secret raids on Al-Quaeda, and I have over 300 confirmed kills. I am trained in gorilla warfare and I’m the top sniper in the entire US armed forces. You are nothing to me but just another target. I will wipe you the fuck out with precision the likes of which has never been seen before on this Earth, mark my fucking words. You think you can get away with saying that shit to me over the Internet? Think again, fucker. As we speak I am contacting my secret network of spies across the USAand your IP is being traced right now so you better prepare for the storm, maggot. The storm that wipes out the pathetic little thing you call your life. You’re fucking dead, kid. I can be anywhere, anytime, and I can kill you in over seven hundred ways, and that’s just with my bare hands. Not only am I extensively trained in unarmed combat, but I have access to the entire arsenal of the United States Marine Corps and I will use it to its full extent to wipe your miserable ass off the face of the continent, you little shit. If only you could have known what unholy retribution your little “clever” comment was about to bring down upon you, maybe you would have held your fucking tongue. But you couldn’t, you didn’t, and now you’re paying the price, you goddamn idiot. I will shit fury all over you and you will drown in it. You’re fucking dead, kiddo",
    "boomer": "Ok 👍boomer👴, I've🙋 actually had enough🙅 of your👇 talking🙊. You 👇should contemplate❓ life 👶and lay 🛀off ❌the Monsters👾. The thought💭 of you👇 having a heart💓 attack 💔brings📬 a huge 🙌smile😃 to my face😐. You have no idea💭 how much the world🌎 wants you to die💀. Stop🙅 trying to relate👬 to everyone🌏 because you👇 are old👴, wrinkly👵, and lonely🙎. Reddit👑 doesn't care. Discord 👓doesn't care. Not even Instagram🗿 cares. The only people👥 that will \"care \" are you fellow boomers👴 that act nice👦 for the internet🌐. Go look👀 at minion👽 memes😂, clean💧 your👇 glasses👓, and argue😠 with sensible 😏people👥 about vaccines 💉and climate change🔥🌍. You 👇are in the wrong 🙅side 🔛of the internet🌐. Try seeing👀 a therapist 👨💺and get that massive⬅➡ hole⚫ in your 👇head 😑that you👇 and your👇 so-called \"friends👥 \" filled↗ with nonsensical 🙅👂bullshit🐂💩 cleared. You👇 will die 💀alone👴. You 👇should've died💀 many years👴 before now⌛. I am a bot, and this action was preformed automatically.",
    "RTFM": "```______  _____ ______ ___  ___LNBR| ___ \|_   _||  ___||  \/  |LNBR| |_/ /  | |  | |_   | .  . |LNBR|    /   | |  |  _|  | |\/| |LNBR| |\ \   | |  | |    | |  | |LNBR\_| \_|  \_/  \_|    \_|  |_/```",
    "mobileUser": "OOHH!!! OOHH!!!! I FOUND THE MOBILE📱USER 🤡🤡🤡 GUYS!!! THAT GUY USES MOBILE!!1!1!111!!😂😂😂😂🤣🤣🤣🤣🤣LNBRLNBRHE USED THE CAPITAL R HE'S A MOBILE📱USER GUYS🤣😂🤣😂🤣!!! r/FOUNDTHEMOBILEUSER!1!1!!!😂😂🤣🤣😂ROASTED🔥🔥🔥🔥!!!!!!!!!!!LNBRLNBRI AWAIT MY KARMA AND GOLD 🏅🏅🏅 BECAUSE OF MY EPIC ROAST 🔥🔥🔥🔥🔥MY DUDES, I JUST ROASTED THE MOBILE 🤡🤡🤡 USER!!!! r/FOUNDTHEMOBILEUSER!!!! (NOTICE HOW I DIDN'T USE THE CAPITAL R BECAUSE IM NOT A WUSSY MOBILE 📱USER 🤡🤡🤡, IM A E🅱️IC DESKTOP USER!!!!1!1!1)LNBRLNBRGET WHOOOOOOOOOOSED YOU STUPID WIMPY MOBILE 📱USER!11!!1! r/FOUNDTHEMOBILEUSER !!!1!1!1!1!1!!1!ONEONEONEELEVEN"
};

const ahkScript = function(script) {
    exec(`C:\\Users\\Radboud\\Desktop\\PiDeck\\server\\scripts\\` + script);
}

const reloadClient = function() {
    rimraf(`${dataPath}/publictmp`, function() {
        ncp(`${__dirname}/public`, `${dataPath}/publictmp`, (err) => {
            if(err) {
                return console.error(err);
            }
            io.sockets.emit('loadFile', 'base.html');
        });
    });
}
