class GameManager {
    constructor() {
        this.songData = map;
        this.songFile = this.songData.songPath;
        this.music = new Audio(this.songFile);
        this.music.loop = true; // Make the music loop
        this.lanes = [];
        this.noteSpawnTimers = [];

        this.canvas = null;
        this.ctx = null;
        this.isRunning = false;
        this.score = 0;


        // // Initialize lanes and note spawn timers
        // this.songData.sheet.forEach((laneData, index) => {
        //     const lane = {
        //         x: 0,
        //         y: 0,
        //         key: ['s', 'd', 'k', 'l'][index],
        //         hitText: '',
        //         notes: [] // Create a separate array to store the notes for each lane
        //     };
        //     this.lanes.push(lane);
        //
        //     laneData.notes.forEach(note => {
        //         const timer = setTimeout(() => {
        //             this.spawnNote(lane, note.delay);
        //         }, note.delay * 1000); // Convert delay to milliseconds
        //         this.noteSpawnTimers.push(timer);
        //         //note.delay += 1; // Increase the delay by 1 second for each note
        //     });
        // });

        // // Lane configuration
        // this.lanes = [
        //     { x: 0, y: 0, key: 's', hitText: '' },
        //     { x: 0, y: 0, key: 'd', hitText: '' },
        //     { x: 0, y: 0, key: 'k', hitText: '' },
        //     { x: 0, y: 0, key: 'l', hitText: '' },
        // ];

        // Lane separators
        this.laneWidth = 100;
        this.laneStartX = 0; // Start position of first separator (50px before first note)
        this.laneHeight = 1000; // Full height of canvas

        // Hit zone configuration
        this.hitZoneY = 900;
        this.hitZoneRadius = 30;
        this.noteRadius = 20;

        // Hit detection configuration
        this.perfectWindow = 15;  // ±20 pixels from center for PERFECT
        this.goodWindow = 40;     // ±40 pixels from center for GOOD

        // Hit text display configuration
        this.hitTextDuration = 500; // Duration in milliseconds to show hit text
        this.hitTextTimers = new Map(); // Store timers for hit text

        this.canvas = document.getElementById('gameWorld');
        this.ctx = this.canvas.getContext('2d');

        this.drawStartMenu();
        this.addEventListeners();

        // Load fonts
        document.fonts.load('20px nunito').then(() => {
            //this.initialize();
        })
    }

    initialize() {
        // this.canvas = document.getElementById('gameWorld');
        // this.ctx = this.canvas.getContext('2d');

        // Calculate lane positions based on the canvas width
        const totalLaneWidth = this.laneWidth * 4;
        const offsetX = (this.canvas.width - totalLaneWidth) / 2;

        this.laneStartX = offsetX; // lane start is 50px before first lane

        // Initialize lanes and note spawn timers
        this.songData.sheet.forEach((laneData, index) => {
            const lane = {
                x: offsetX + (index * this.laneWidth),
                y: 0,
                key: ['s', 'd', 'k', 'l'][index],
                hitText: '',
                notes: [] // Create a separate array to store the notes for each lane
            };
            this.lanes.push(lane);

            laneData.notes.forEach(note => {
                const timer = setTimeout(() => {
                    this.spawnNote(lane, note.delay);
                }, note.delay * 1000); // Convert delay to milliseconds
                this.noteSpawnTimers.push(timer);
                //note.delay += 1; // Increase the delay by 1 second for each note
            });
        });

        // Update the lane x positions based on the new canvas width
        this.lanes.forEach((lane, index) => {
            lane.x = offsetX + (index * this.laneWidth);
        });

        //this.addEventListeners();
        this.isRunning = true;
        this.gameLoop();
    }

    addEventListeners() {
        this.startClickListener = () => {
            this.startGame();
            this.canvas.removeEventListener('click', this.startClickListener);
            document.removeEventListener('keydown', this.startKeyListener);
        };
        this.canvas.addEventListener('click', this.startClickListener);

        this.startKeyListener = (event) => {
            if (event.key === ' ') {
                this.startGame();
                this.canvas.removeEventListener('click', this.startClickListener);
                document.removeEventListener('keydown', this.startKeyListener);
            }
        };
        document.addEventListener('keydown', this.startKeyListener);

        const pressedKeys = new Set();

        document.addEventListener('keydown', (event) => {
            if (!pressedKeys.has(event.key)) {
                const pressedLane = this.lanes.find(lane => lane.key === event.key);
                if (pressedLane) {
                    this.handleNoteHit(pressedLane);
                    pressedKeys.add(event.key);
                }
            }
        });

        document.addEventListener('keyup', (event) => {
            const pressedLane = this.lanes.find(lane => lane.key === event.key);
            if (pressedLane) {
                pressedKeys.delete(event.key);
            }
        });
    }

    handleNoteHit(lane) {
        // Find the note that is closest to the hit zone
        const note = lane.notes.find(note => Math.abs(note.y - this.hitZoneY) <= this.goodWindow);

        if (note) {
            // Calculate distance from perfect hit
            const distance = Math.abs(note.y - this.hitZoneY);

            if (distance <= this.perfectWindow) {
                this.showHitText(lane, 'PERFECT', '#00ff00');
                this.score += 300;
            } else if (distance <= this.goodWindow) {
                this.showHitText(lane, 'GOOD', '#ffff00');
                this.score += 150;
            } else {
                this.showHitText(lane, 'BAD', '#ff0000');
                this.score += 50;
            }

            // Remove the note from the lane
            lane.notes.splice(lane.notes.indexOf(note), 1);
        }
    }

    showHitText(lane, text, color) {
        lane.hitText = text;
        lane.hitTextColor = color;

        // Clear text timer for this lane
        if (this.hitTextTimers.has(lane.key)) {
            clearTimeout(this.hitTextTimers.get(lane.key));
        }

        // Set new timer to clear the hit text
        const timer = setTimeout(() => {
            lane.hitText = '';
            this.hitTextTimers.delete(lane.key);
        }, this.hitTextDuration);

        this.hitTextTimers.set(lane.key, timer);
    }

    drawHitZones() {
        this.ctx.strokeStyle = 'rgb(200, 200, 200)';
        this.ctx.lineWidth = 3;

        // Draw outer hit zones
        this.lanes.forEach(lane => {
            // Calculate the center of the lane
            const centerX = lane.x + (this.laneWidth / 2);

            // Draw GOOD hit zone (larger, dimmer)
            this.ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
            this.ctx.beginPath();
            this.ctx.arc(centerX, this.hitZoneY, this.goodWindow, 0, Math.PI * 2);
            this.ctx.stroke();

            // Draw PERFECT hit zone (smaller, brighter)
            this.ctx.strokeStyle = 'rgba(200, 200, 200, 0.8)';
            this.ctx.beginPath();
            this.ctx.arc(centerX, this.hitZoneY, this.perfectWindow, 0, Math.PI * 2);
            this.ctx.stroke();
        });
    }


    drawNotes() {
        this.ctx.fillStyle = 'white';

        this.lanes.forEach(lane => {
            // Draw each note in the lane
            lane.notes.forEach(note => {
                this.ctx.beginPath();
                this.ctx.arc(note.x + (this.laneWidth / 2), note.y, this.noteRadius, 0, Math.PI * 2);
                this.ctx.fill();
            });
        });
    }


    drawHitText() {
        this.ctx.textAlign = 'center';
        this.ctx.font = 'bold 15px nunito'; // Change font size to 36px

        this.lanes.forEach(lane => {
            if (lane.hitText) {
                const centerX = lane.x + (this.laneWidth / 2);
                this.ctx.fillStyle = lane.hitTextColor;
                this.ctx.fillText(lane.hitText, centerX, this.hitZoneY - 50);
            }
        });

        this.ctx.textAlign = 'left'; // Reset text align for score
    }

    // Draw lane separators
    drawLaneSeparators() {
        this.ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)'; // Semi-transparent white
        this.ctx.lineWidth = 2;

        // Draw 5 lines (creating 4 lanes)
        for (let i = 0; i <= 4; i++) {
            const x = this.laneStartX + (i * this.laneWidth);
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.laneHeight);
            this.ctx.stroke();
        }
    }

    draw() {
        // Clear the canvas
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);


        this.drawLaneSeparators();
        this.drawHitZones();
        this.drawNotes();
        this.drawHitText();

        // Draw score
        this.ctx.fillStyle = 'white';
        this.ctx.font = '20px nunito';
        this.ctx.fillText('Your Score:', this.canvas.width - 125, 25);
        this.ctx.fillText(this.score, this.canvas.width - 80, 60);

        // Draw key hints
        this.ctx.font = '15px nunito';
        this.lanes.forEach(lane => {
            const centerX = lane.x + (this.laneWidth / 2);
            this.ctx.fillText(lane.key.toUpperCase(), centerX - 5, this.hitZoneY + 60);
        });
    }

    update() {
        this.lanes.forEach(lane => {
            // Update the y position of each note in the lane
            lane.notes.forEach(note => {
                note.y += 2; // fall speed

                // Remove the note from the lane if it has fallen off the screen
                if (note.y > this.canvas.height) {
                    lane.notes.splice(lane.notes.indexOf(note), 1);
                    this.showHitText(lane, 'MISS', '#ff0000');
                }
            });
        });
    }


    gameLoop() {
        if (!this.isRunning) return;
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }

    spawnNote(lane, delay) {
        // Create a new note object
        const note = {
            x: lane.x,
            y: -delay * 100, // Calculate the initial y position based on the delay
            key: lane.key
        };

        // Add the note to the lane's notes array
        lane.notes.push(note);
    }

    drawStartMenu() {
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = 'white';
        this.ctx.font = '30px nunito';
        this.ctx.textAlign = 'center';

        const startX = this.canvas.width / 2;
        const startY = this.canvas.height / 2;

        this.ctx.fillText('Start', startX, startY);
    }

    startGame() {
        this.music.play().then(() => {
            this.initialize();
        }).catch((error) => {
            console.error('Error playing music:', error);
        });
    }
}

// Create and initialize the game when the window loads
window.onload = function() {
    window.gameManager = new GameManager();  // Set gameManager globally
};