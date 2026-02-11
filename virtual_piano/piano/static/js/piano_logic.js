const video = document.getElementById('webcam');
const canvas = document.getElementById('pianoCanvas');
const ctx = canvas.getContext('2d');

// --- PREMIUM PIANO LAYOUT ---
const whiteKeys = [
    { note: 'C', label: 'C' }, { note: 'D', label: 'D' },
    { note: 'E', label: 'E' }, { note: 'F', label: 'F' },
    { note: 'G', label: 'G' }, { note: 'A', label: 'A' },
    { note: 'B', label: 'B' }
];

const blackKeys = [
    { note: 'C#', pos: 1 }, { note: 'D#', pos: 2 },
    { note: 'F#', pos: 4 }, { note: 'G#', pos: 5 },
    { note: 'A#', pos: 6 }
];

let activeKeys = new Set();
let floatingNotes = []; 

// Premium Sound Engine
const reverb = new Tone.Reverb({ decay: 2.5, wet: 0.3 }).toDestination();
const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "triangle" },
    envelope: { attack: 0.02, release: 1 }
}).connect(reverb);

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

function onResults(results) {
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 1. MIRRORING
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    
    // Background Video
    ctx.globalAlpha = 0.4;
    if (results.image) {
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    }

    // 2. DIMENSIONS
    const wKeyWidth = canvas.width / whiteKeys.length;
    const bKeyWidth = wKeyWidth * 0.55;
    const pianoY = canvas.height - 300;
    const chassisHeight = 220;
    const bKeyHeight = 160;

    // --- DRAW PREMIUM CASIO CHASSIS ---
    ctx.fillStyle = "#111111";
    ctx.beginPath();
    ctx.roundRect(0, pianoY - chassisHeight, canvas.width, chassisHeight, [20, 20, 0, 0]);
    ctx.fill();

    // Red Casio Button
    ctx.fillStyle = "#d32f2f";
    ctx.beginPath();
    ctx.arc(80, pianoY - 100, 15, 0, Math.PI * 2);
    ctx.fill();
    
    // Digital Blue Screen (LCD)
    ctx.fillStyle = "#1a237e";
    ctx.beginPath();
    ctx.roundRect(canvas.width/2 - 100, pianoY - 180, 200, 80, 5);
    ctx.fill();
    
    // Static Screen Text
    ctx.save();
    ctx.scale(-1, 1);
    ctx.fillStyle = "#00e5ff";
    ctx.font = "14px Courier New";
    ctx.fillText("STAGE PIANO 01", -(canvas.width/2 + 60), pianoY - 135);
    ctx.restore();

    const currentlyDetectedNotes = new Set();

    // 3. HAND MAPPING
    if (results.multiHandLandmarks) {
        for (const landmarks of results.multiHandLandmarks) {
            const indexTip = landmarks[8];
            const x = indexTip.x * canvas.width;
            const y = indexTip.y * canvas.height;

            ctx.shadowBlur = 20;
            ctx.shadowColor = "#ff0055";
            ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.arc(x, y, 10, 0, 2 * Math.PI);
            ctx.fill();
            ctx.shadowBlur = 0;

            if (y > pianoY) {
                let hitNote = null;
                blackKeys.forEach(bk => {
                    const bx = (bk.pos * wKeyWidth) - (bKeyWidth / 2);
                    if (x > bx && x < bx + bKeyWidth && y < pianoY + bKeyHeight) {
                        hitNote = bk.note;
                    }
                });
                if (!hitNote) {
                    const keyIndex = Math.floor(indexTip.x * whiteKeys.length);
                    if (whiteKeys[keyIndex]) hitNote = whiteKeys[keyIndex].note;
                }
                if (hitNote) currentlyDetectedNotes.add(hitNote);
            }
        }
    }

    // 4. DRAW PIANO KEYS
    whiteKeys.forEach((key, i) => {
        const x = i * wKeyWidth;
        const isPressed = activeKeys.has(key.note);
        ctx.fillStyle = isPressed ? "#e0e0e0" : "#ffffff";
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x, pianoY, wKeyWidth, 300, [0, 0, 5, 5]);
        ctx.fill();
        ctx.stroke();
    });

    blackKeys.forEach(bk => {
        const bx = (bk.pos * wKeyWidth) - (bKeyWidth / 2);
        const isPressed = activeKeys.has(bk.note);
        ctx.fillStyle = isPressed ? "#444444" : "#222222";
        ctx.beginPath();
        ctx.roundRect(bx, pianoY, bKeyWidth, bKeyHeight, [0, 0, 3, 3]);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.strokeRect(bx + 5, pianoY, bKeyWidth - 10, bKeyHeight - 10);
    });

    // 5. AUDIO LOGIC & KEY-POSITIONED FLOATING NOTES
    const allNotes = [...whiteKeys.map((k, i) => ({...k, x: i * wKeyWidth + wKeyWidth/2})), 
                      ...blackKeys.map(bk => ({...bk, x: bk.pos * wKeyWidth}))];

    allNotes.forEach(keyObj => {
        const note = keyObj.note;
        if (currentlyDetectedNotes.has(note) && !activeKeys.has(note)) {
            Tone.start(); 
            synth.triggerAttack(note + "4");
            activeKeys.add(note);

            // SPAWN NOTE EXACTLY ABOVE THE KEY
            floatingNotes.push({
                text: note,
                x: keyObj.x,      // Use the key's specific X position
                y: pianoY - 20,    // Start just above the key
                alpha: 1.0,
                size: 30
            });
        } else if (!currentlyDetectedNotes.has(note) && activeKeys.has(note)) {
            synth.triggerRelease(note + "4");
            activeKeys.delete(note);
        }
    });

    // --- DRAW & ANIMATE FLOATING NOTES ---
    ctx.save();
    ctx.scale(-1, 1); 
    floatingNotes.forEach((fn, index) => {
        ctx.globalAlpha = fn.alpha;
        ctx.fillStyle = "#00ffcc"; 
        ctx.font = `bold ${fn.size}px Arial`;
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#00ffcc";
        ctx.textAlign = "center";
        
        ctx.fillText(fn.text, -fn.x, fn.y);
        
        fn.y -= 3;          // Float UP
        fn.alpha -= 0.02;    // Fade OUT
        fn.size += 0.5;      // Grow slightly

        if (fn.alpha <= 0) {
            floatingNotes.splice(index, 1);
        }
    });
    ctx.restore();

    ctx.restore();
}

const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});
hands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.6 });
hands.onResults(onResults);

const camera = new Camera(video, {
    onFrame: async () => { await hands.send({image: video}); },
    width: 1280, height: 720
});
camera.start();