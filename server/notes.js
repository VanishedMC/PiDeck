const fs = require('fs');
var data = {
    noteCounter: 0,
    notes: []
};

module.exports = function(path) {
    var module = {};

    module.load = function() {
        try {
            fs.writeFileSync(`${path}\\notes.json`, JSON.stringify({noteCounter: 0, notes: []}), { flag: 'wx' });
        } catch (err) {}

        data = JSON.parse(fs.readFileSync(`${path}\\notes.json`));
    }

    module.add = function(note) {
        note.id = data.noteCounter;
        data.notes.push(note);
        data.noteCounter = data.noteCounter + 1;

        fs.writeFileSync(`${path}\\notes.json`, JSON.stringify(data), { flag: 'w' }, (err) => { });
    }

    module.delete = function(id) {
        data.notes = data.notes.filter(function(obj) {
            return obj.id != id;
        });

        fs.writeFileSync(`${path}\\notes.json`, JSON.stringify(data), { flag: 'w' }, (err) => { });
    }

    module.get = function() {
        return data.notes;
    }

    return module;
}
