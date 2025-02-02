// import { AudioManager } from './AudioManager.js';

export class GameManager {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.isRunning = false;
        this.score = 0;
        // this.audioManager = new AudioManager();

        // // Lane configuration
        // this.lanes = [
        //     { x: 0, y: 0, key: 's', hitText: '' },
        //     { x: 0, y: 0, key: 'd', hitText: '' },
        //     { x: 0, y: 0, key: 'k', hitText: '' },
        //     { x: 0, y: 0, key: 'l', hitText: '' }
        // ];

        // Note configuration
        this.noteSpeed = 3; // increased speed for better visibility
        this.notes = []; // Simplified note storage

        // Lane separators
        this.laneWidth = 100;
        this.laneStartX = 400;
        this.laneHeight = 1000;

        // Hit zone configuration
        this.hitZoneY = 900;
        this.hitZoneRadius = 50;
        this.noteRadius = 20;

        // Hit detection configuration
        this.perfectWindow = 20;
        this.goodWindow = 50;

        // Hit text display configuration
        this.hitTextDuration = 500;
        this.hitTextTimers = new Map();

        document.fonts.load('20px nunito');
    }

    // initialize() {
    //     this.canvas = document.getElementById('gameWorld');
    //     this.ctx = this.canvas.getContext('2d');
    //
    //     // Calculate lane positions based on the canvas width
    //     this.lanes = []; // Reset lanes each time
    //     const totalLaneWidth = this.laneWidth * this.songData.length; // Use the song data to determine number of lanes
    //     const offsetX = (this.canvas.width - totalLaneWidth) / 2;
    //
    //
    //     this.laneStartX = offsetX - 50;
    //
    //     // Update lane x positions
    //     this.lanes.forEach((lane, index) => {
    //         lane.x = offsetX + (index * this.laneWidth);
    //     });
    //
    //     this.addEventListeners();
    //     this.isRunning = true;
    //     this.gameLoop();
    // }

    initialize() {
        this.canvas = document.getElementById('gameWorld');
        this.ctx = this.canvas.getContext('2d');

        // Dynamically set lanes based on the song data
        this.lanes = []; // Reset lanes each time
        const totalLaneWidth = this.laneWidth * this.songData.length;  // Use the song data to determine number of lanes
        const offsetX = (this.canvas.width - totalLaneWidth) / 2;

        this.addEventListeners();
        this.isRunning = true;
        this.gameLoop();
    }


    addEventListeners() {
        document.addEventListener('keydown', (event) => {
            const pressedLane = this.lanes.find(lane => lane.key === event.key);
            if (pressedLane) {
                this.handleNoteHit(pressedLane);
            }
        });
    }

    createNote(laneIndex, startY = 0) {
        // Make sure laneIndex is valid
        if (this.lanes[laneIndex]) {
            return {
                x: this.lanes[laneIndex].x,
                y: startY,
                laneIndex: laneIndex,
                isActive: true
            };
        } else {
            console.error(`Invalid lane index: ${laneIndex}`);
            return null;
        }
    }

    // loadSong(songData) {
    //     this.notes = []; // Clear existing notes
    //
    //     // Directly use the provided song data
    //     songData.forEach((track, laneIndex) => {
    //         track.notes.forEach(note => {
    //             // Convert delay into initial Y position (starting from top)
    //             const startY = -100 - (note.delay * 200); // Increased spacing between notes
    //             const newNote = this.createNote(laneIndex, startY);
    //             this.notes.push(newNote);
    //         });
    //     });
    //
    //     // Sort notes by Y position to ensure proper order
    //     this.notes.sort((a, b) => a.y - b.y);
    // }

    // In GameManager.js

    async loadSong(songData) {
        this.songData = songData;  // Store the song data
        this.notes = [];  // Clear any existing notes

        // Initialize lanes based on the song data length
        this.lanes = songData.map((_, laneIndex) => ({
            x: this.laneWidth * laneIndex,
            y: 0,
            key: ['s', 'd', 'k', 'l'][laneIndex],
            hitText: ''
        }));

        // Create notes based on the song data
        songData.forEach((track, laneIndex) => {
            track.notes.forEach(note => {
                const startY = -100 - (note.delay * 200);  // Adjust the note's starting position based on its delay
                const newNote = this.createNote(laneIndex, startY);
                this.notes.push(newNote);
            });
        });

        // Sort notes by Y position to ensure proper order
        this.notes.sort((a, b) => a.y - b.y);

        // After song is loaded, initialize the game
        this.initialize();  // Now that song data is available, initialize
    }


    // Add this method to check if the song is finished
    isSongFinished() {
        console.log("song done");
        return this.notes.every(note => !note.isActive || note.y > this.canvas.height);
    }

    handleNoteHit(lane) {
        const laneIndex = this.lanes.indexOf(lane);

        // Find the closest active note in this lane near the hit zone
        const activeNote = this.notes.find(note =>
            note.isActive &&
            note.laneIndex === laneIndex &&
            Math.abs(note.y - this.hitZoneY) <= this.hitZoneRadius + this.noteRadius
        );

        if (!activeNote) return;

        const distance = Math.abs(activeNote.y - this.hitZoneY);
        let result;

        if (distance <= this.perfectWindow) {
            result = 'PERFECT';
            this.score += 300;
        } else if (distance <= this.goodWindow) {
            result = 'GOOD';
            this.score += 150;
        } else if (distance <= this.hitZoneRadius + this.noteRadius) {
            result = 'BAD';
            this.score += 50;
        } else {
            return;
        }

        activeNote.isActive = false;
        this.showHitText(lane, result, this.getHitColor(result));
    }

    getHitColor(result) {
        switch(result) {
            case 'PERFECT': return '#00ff00';
            case 'GOOD': return '#ffff00';
            case 'BAD': return '#ff0000';
            default: return '#ff0000';
        }
    }

    showHitText(lane, text, color) {
        lane.hitText = text;
        lane.hitTextColor = color;

        if (this.hitTextTimers.has(lane.key)) {
            clearTimeout(this.hitTextTimers.get(lane.key));
        }

        const timer = setTimeout(() => {
            lane.hitText = '';
            this.hitTextTimers.delete(lane.key);
        }, this.hitTextDuration);

        this.hitTextTimers.set(lane.key, timer);
    }

    update() {
        // Update note positions
        this.notes.forEach(note => {
            if (note.isActive) {
                note.y += this.noteSpeed;

                // Check if note was missed
                if (note.y > this.canvas.height) {
                    note.isActive = false;
                    const lane = this.lanes[note.laneIndex];
                    this.showHitText(lane, 'MISS', '#ff0000');
                }
            }
        });

        // Check if all notes are finished
        // if (this.isSongFinished()) {
        //     // Display "Press R to restart" message
        //     this.ctx.fillStyle = 'white';
        //     this.ctx.font = 'bold 24px nunito';
        //     this.ctx.textAlign = 'center';
        //     this.ctx.fillText('Press R to restart', this.canvas.width / 2, this.canvas.height / 2);
        // }
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw lane separators
        this.drawLaneSeparators();

        // Draw hit zones
        this.drawHitZones();

        // Draw active notes
        this.drawNotes();

        // Draw hit text and score
        this.drawHitText();
        this.drawScore();
    }

    drawLaneSeparators() {
        this.ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
        this.ctx.lineWidth = 2;

        for (let i = 0; i <= 4; i++) {
            const x = this.laneStartX + (i * this.laneWidth);
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.laneHeight);
            this.ctx.stroke();
        }
    }

    drawHitZones() {
        this.lanes.forEach(lane => {
            // Draw GOOD hit zone
            this.ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
            this.ctx.beginPath();
            this.ctx.arc(lane.x, this.hitZoneY, this.goodWindow, 0, Math.PI * 2);
            this.ctx.stroke();

            // Draw PERFECT hit zone
            this.ctx.strokeStyle = 'rgba(200, 200, 200, 0.8)';
            this.ctx.beginPath();
            this.ctx.arc(lane.x, this.hitZoneY, this.perfectWindow, 0, Math.PI * 2);
            this.ctx.stroke();

            // Draw key hint
            this.ctx.fillStyle = 'white';
            this.ctx.font = '16px nunito';
            this.ctx.fillText(lane.key.toUpperCase(), lane.x - 5, this.hitZoneY + 60);
        });
    }

    drawNotes() {
        this.ctx.fillStyle = 'white';
        this.notes.forEach(note => {
            if (note.isActive) {
                this.ctx.beginPath();
                this.ctx.arc(note.x, note.y, this.noteRadius, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
    }

    drawHitText() {
        this.ctx.textAlign = 'center';
        this.ctx.font = 'bold 24px nunito';

        this.lanes.forEach(lane => {
            if (lane.hitText) {
                this.ctx.fillStyle = lane.hitTextColor;
                this.ctx.fillText(lane.hitText, lane.x, this.hitZoneY - 50);
            }
        });
    }

    drawScore() {
        this.ctx.textAlign = 'left';
        this.ctx.fillStyle = 'white';
        this.ctx.font = '20px nunito';
        this.ctx.fillText('Score:', 20, 30);
        this.ctx.fillText(this.score, 90, 30);
    }

    gameLoop() {
        if (!this.isRunning) return;
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

window.onload = function() {
    window.gameManager = new GameManager();
};