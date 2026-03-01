const video = document.getElementById('webcam');
const canvas = document.getElementById('pianoCanvas');
const ctx = canvas.getContext('2d');

// --- FULL PIANO LAYOUT (88 Keys) ---
const whiteNotes = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
let whiteKeys = [];
let blackKeys = [];

// Generate full piano keys
for (let octave = 0; octave < 8; octave++) {
    whiteNotes.forEach(note => {
        // Stop at C8
        if (octave === 7 && ['D', 'E', 'F', 'G', 'A', 'B'].includes(note)) return;
        whiteKeys.push({ note: note + octave, label: note });
    });
}

// Generate black keys based on white keys positioning
for (let i = 0; i < whiteKeys.length; i++) {
    const noteName = whiteKeys[i].note[0];
    // Black keys are usually between C-D, D-E, F-G, G-A, A-B
    if (['C', 'D', 'F', 'G', 'A'].includes(noteName)) {
        if (i + 1 < whiteKeys.length) {
            blackKeys.push({
                note: whiteKeys[i].note[0] + '#' + whiteKeys[i].note.slice(-1),
                leftWhiteKeyIndex: i
            });
        }
    }
}

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
    ctx.globalAlpha = 1.0;

    // 2. DIMENSIONS FOR MANY KEYS
    const wKeyWidth = canvas.width / whiteKeys.length;
    const bKeyWidth = wKeyWidth * 0.6; 
    const pianoY = canvas.height - 300;
    const chassisHeight = 220;
    const bKeyHeight = 160;

    // --- DRAW CASIO CHASSIS ---
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
    ctx.textAlign = "center";
    ctx.fillText("FULL PIANO 88", -(canvas.width/2), pianoY - 135);
    ctx.restore();

    // 3. HAND MAPPING (Pakka - Strict Detection)
    const detectedNoteThisFrame = new Set();
    
    if (results.multiHandLandmarks) {
        for (const landmarks of results.multiHandLandmarks) {
            const indexTip = landmarks[8];
            const x = indexTip.x * canvas.width;
            const y = indexTip.y * canvas.height;

            // Draw finger dot
            ctx.shadowBlur = 20;
            ctx.shadowColor = "#ff0055";
            ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.arc(x, y, 10, 0, 2 * Math.PI);
            ctx.fill();
            ctx.shadowBlur = 0;

            if (y > pianoY) {
                let hitNote = null;
                
                // Priority 1: Check Black Keys (higher layer)
                for (let bk of blackKeys) {
                    const leftWhiteKeyX = bk.leftWhiteKeyIndex * wKeyWidth;
                    const bx = leftWhiteKeyX + (wKeyWidth * 0.7);
                    
                    if (x > bx && x < bx + bKeyWidth && y < pianoY + bKeyHeight) {
                        hitNote = bk.note;
                        break;
                    }
                }
                
                // Priority 2: Check White Keys
                if (!hitNote) {
                    const keyIndex = Math.floor(indexTip.x * whiteKeys.length);
                    if (whiteKeys[keyIndex]) hitNote = whiteKeys[keyIndex].note;
                }
                
                if (hitNote) detectedNoteThisFrame.add(hitNote);
            }
        }
    }

    // 4. DRAW PIANO KEYS
    // White Keys
    whiteKeys.forEach((key, i) => {
        const x = i * wKeyWidth;
        const isPressed = detectedNoteThisFrame.has(key.note);
        
        // --- COLOR CHANGE LOGIC ---
        ctx.fillStyle = isPressed ? "#a0d2eb" : "#ffffff"; // Light blue when pressed
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x, pianoY, wKeyWidth, 300, [0, 0, 5, 5]);
        ctx.fill();
        ctx.stroke();

        // Draw Letters
        ctx.save();
        ctx.scale(-1, 1);
        ctx.fillStyle = isPressed ? "#000" : "#555";
        ctx.font = "bold 10px Arial";
        ctx.textAlign = "center";
        ctx.fillText(key.label, -(x + wKeyWidth/2), pianoY + 280);
        ctx.restore();
    });

    // Black Keys
    blackKeys.forEach(bk => {
        const leftWhiteKeyX = bk.leftWhiteKeyIndex * wKeyWidth;
        const bx = leftWhiteKeyX + (wKeyWidth * 0.7);
        const isPressed = detectedNoteThisFrame.has(bk.note);
        
        // --- COLOR CHANGE LOGIC ---
        ctx.fillStyle = isPressed ? "#888888" : "#222222"; // Light grey when pressed
        ctx.beginPath();
        ctx.roundRect(bx, pianoY, bKeyWidth, bKeyHeight, [0, 0, 3, 3]);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.strokeRect(bx + 2, pianoY, bKeyWidth - 4, bKeyHeight - 5);
    });

    // 5. AUDIO LOGIC & FLOATING NOTES
    const allNotesMap = new Map();
    whiteKeys.forEach((k, i) => allNotesMap.set(k.note, {x: i * wKeyWidth + wKeyWidth/2, type: 'white'}));
    blackKeys.forEach(bk => {
        const leftWhiteKeyX = bk.leftWhiteKeyIndex * wKeyWidth;
        allNotesMap.set(bk.note, {x: leftWhiteKeyX + (wKeyWidth * 0.7) + bKeyWidth/2, type: 'black'});
    });

    allNotesMap.forEach((pos, note) => {
        if (detectedNoteThisFrame.has(note) && !activeKeys.has(note)) {
            Tone.start(); 
            synth.triggerAttack(note);
            activeKeys.add(note);

            // Spawn floating note
            floatingNotes.push({
                text: note,
                x: pos.x,
                y: pianoY - 20,
                alpha: 1.0,
                size: 20
            });
        } else if (!detectedNoteThisFrame.has(note) && activeKeys.has(note)) {
            synth.triggerRelease(note);
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
        
        fn.y -= 3;
        fn.alpha -= 0.02;

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
