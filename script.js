    var piano = Synth.createInstrument('piano'); 
function initialize() {
    $("#octave-down").click(function() {
        GrandPiano.decrementOctave();
        GrandPiano.playCentralNote();
    });
    $("#octave-up").click(function() {
        GrandPiano.incrementOctave();
        GrandPiano.playCentralNote();
    });
    $("#do-warmup").click(function() {
        doWarmup()
    });
    $("#do-randomize").click(function() {
        numRandom = parseInt($("#num-random-input").val())
        if (numRandom > 0) {
            doRandomize(numRandom)
        } else {
            doRandomize()
        }
    });
    $("#trainer").click(function() {
        //parseTrainerInput($("#trainer-input").val())
    });
}

function doWarmup() {
    var s = new SyncScope()

    for (let octave = Trainer.minOctave(); octave <= Trainer.maxOctave(); octave ++) {
        s.call((sync) => {GrandPiano.playNote({note:"C", octave, duration: 2}, sync)})
    }
    for (let octave = Trainer.minOctave(); octave <= Trainer.maxOctave(); octave ++) {
        s.call((sync) => {GrandPiano.playNote({note:"C", octave, duration: 1}, sync)})
    }
    for (let octave = Trainer.maxOctave(); octave >= Trainer.minOctave(); octave --) {
        s.call((sync) => {GrandPiano.playNote({note:"C", octave, duration: 2}, sync)})
    }
    for (let octave = Trainer.maxOctave(); octave >= Trainer.minOctave(); octave --) {
        s.call((sync) => {GrandPiano.playNote({note:"C", octave, duration: 1}, sync)})
    }
}

function forEachGen(n) {
    return Array.apply(null, Array(n))
}

function doRandomize(numRandom=3) {
    var s = new SyncScope()

    for (let i = 0; i < numRandom; i ++) {
        
        let sizeOfChord = getRandomInt(1, 5)
        let randomChord = []

        for (let j = 0; j < sizeOfChord; j ++) {
            let randomNote = {note: "X", octave: 4, duration:2}
            randomNote.note = randomItem(GrandPiano.chromaticScale)
            randomNote.octave = getRandomInt(Trainer.minOctave(), Trainer.maxOctave())
            randomChord.push(randomNote)
        }

        s.call((sync) => {GrandPiano.playChord(randomChord, sync)})
    }
}

// inclusive
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem(arr) {
    return arr[Math.floor(Math.random()*arr.length)]
}

function Clone(x) {
    for(p in x)
    this[p] = (typeof(x[p]) == 'object' && x[p] !== null)? new Clone(x[p]) : x[p];
 }

class Mutex {
    constructor() {
        this.locked = false
    }
    lock() {
        this.locked = true
    }
    unlock() {
        this.locked = false
    }
    isLocked() {
        return this.locked
    }
}

class SyncScope {
    constructor() {
        this._mutex = new Mutex()
        this._functionQueue = []
        this._eventLoop = null
    }

    _isIdle() {
        return this._eventLoop === null
    }

    _startEventLoop() {
        var that = this
        this._eventLoop = setInterval(function() {
            if (!that._mutex.isLocked()) {
                that._executeNextFunction() 
            }
        }, 10)
    }

    _executeNextFunction() {
        this._mutex.lock()
        var nextFunc = this._functionQueue.shift()
        nextFunc(this)
    }

    syncReturn() {
        this._mutex.unlock()
        if (this._functionQueue.length === 0) {
            clearInterval(this._eventLoop)
            this._eventLoop = null
        }
    }

    // func must take a final parameter (SyncScope <scope>)
    // func must call <scope>.syncReturn() before returning
    call(func) {
        if (this._isIdle()) {
            this._startEventLoop()
        }
        this._functionQueue.push(func)
    }
}

$(document).ready(function() {
    initialize();
    GrandPiano.drawPiano();
})

var Trainer = {
    octaves: [2,3,4,5],
    minOctave: function() {
        return Trainer.octaves[0]
    },
    maxOctave: function() {
        return Trainer.octaves[Trainer.octaves.length - 1]
    }
}

var GrandPiano = {
    chromaticScale: ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'],
    centralOctave: 4,
    drawPiano: function() {
        $("#grand-piano").empty()
        left = 0;
        color = "none";

        for (i = -1; i <= 1; i ++) {
            $.each(this.chromaticScale, function(index, note) {

                cssClass = note.length === 2 ? "black" : "white"
                cssClass += " key"

                if (color === "black") {
                    left += 15;
                } else if (color === "white") {
                    if (note.length === 2) {
                        left += 25;
                    } else {
                        left += 40;
                    }
                }
                style = "style='left: " + left + "px'" 
                color = note.length === 2 ? "black" : "white";

                id = note + (GrandPiano.centralOctave + i)

                element = "<div class='" + cssClass + "' " + style + " id='" + id + "'" + "></div>";
                $("#grand-piano").append(element)

                $("#" + escapeSelector(id)).contextmenu(function(e) {
                    e.preventDefault();
                })

                $("#" + escapeSelector(id)).mousedown(function(e) {
                    note = {
                        note: this.id.slice(0,-1),
                        octave: this.id.substr(-1)
                    }
                    GrandPiano.playNote(note) 
                });
                $("#" + escapeSelector(id)).mouseup(function(e) {
                    if (e.button === 1) {
                        DurationCreation.stopTimer();
                        SongManager.setTemporaryNoteDuration(DurationCreation.dur);
                        SongManager.playTemporaryNote();
                    }
                });
            })
        }
    },
    // note: {note,octave}
    playNote: function(note, sync) {
        if (!note.duration) {
            note.duration = 1
        }
        piano.play(note.note, note.octave, note.duration);

        if (sync) {
            setTimeout(function() {
                sync.syncReturn()
            }, 600 * note.duration)
        }
    },
    playChord: function(notes, sync) {
        if (notes.length === 0) {
            if (sync) {
                sync.syncReturn()
            }
        }
        for (let i = 0; i < notes.length-1; i ++) {
            this.playNote(notes[i])
        }
        this.playNote(notes[notes.length - 1], sync)
    },
    playCentralNote: function() {
        piano.play("C", GrandPiano.centralOctave, 1);
    },
    
    incrementOctave: function() {
        if (GrandPiano.centralOctave < 7) {
            GrandPiano.centralOctave ++
        }
        GrandPiano.drawPiano();
    },
    decrementOctave: function() {
        if (GrandPiano.centralOctave > 2) {
            GrandPiano.centralOctave --
        }
        GrandPiano.drawPiano();
    },
}

function escapeSelector(s){
    return s.replace( /(:|\#|\[|\])/g, "\\$1" );
}
