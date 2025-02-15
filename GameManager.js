class GameManager {
    constructor(songData = null) {
        this.songData = songData;
        this.songFile = this.songData?.songPath;
        this.music = new Audio(this.songFile);
        this.music.loop = false;

        this.lanes = [];
        this.noteSpawnTimers = [];
        this.noteCount = 0;

        // FPS control
        this.targetFPS = 60;
        this.frameTime = 1000 / this.targetFPS;
        this.lastFrameTime = 0;

        // Convert AR to actual timing
        this.approachRate = 4; // Configurable AR
        this.approachDuration = 1200 - (150 * this.approachRate); // Time note is visible in ms

        // Calculate fall distance and speed
        this.spawnY = -100; // Starting Y position
        this.distanceToHitLine = this.hitZoneY - this.spawnY;

        // Calculate approach time based on AR
        this.approachTime = Math.max(1200 - (150 * this.approachRate), 300); // in milliseconds

        this.canvas = document.getElementById('gameWorld');
        this.ctx = this.canvas.getContext('2d');

        // Add missing properties needed for drawing
        this.laneHeight = this.canvas.height;  // Full height of canvas
        this.laneStartX = 0;  // Will be calculated in initialize()

        // Gameplay configuration
        this.laneWidth = 120;
        this.noteRadius = 40;
        this.hitZoneY = 900;
        this.perfectWindow = 16;
        this.goodWindow = 40;
        this.badWindow = 80;

        this.score = 0;
        this.isRunning = false;

        this.hitTextDuration = 500;
        this.hitTextTimers = new Map();

        this.distanceToHitLine = this.hitZoneY - this.spawnY;

        // Calculate pixels per frame needed to travel the distance in the approach duration
        this.noteSpeed = (this.distanceToHitLine / (this.approachDuration / 1000)) / this.targetFPS;

        console.log('Timing configuration:', {
            approachRate: this.approachRate,
            approachTime: this.approachTime,
            noteSpeed: this.noteSpeed,
            pixelsPerSecond: this.noteSpeed * this.targetFPS
        });

        console.log('Canvas dimensions:', {
            width: this.canvas.width,
            height: this.canvas.height
        });

        console.log('Lane positions:', this.lanes.map(lane => ({
            x: lane.x,
            width: this.laneWidth,
            centerX: lane.x + (this.laneWidth / 2)
        })));

        this.drawStartMenu();
        this.addEventListeners();
    }

    initialize() {
        const totalLaneWidth = this.laneWidth * 4;
        const offsetX = (this.canvas.width - totalLaneWidth) / 2;
        this.laneStartX = offsetX;

        this.songData.sheet.forEach((laneData, index) => {
            const lane = {
                x: offsetX + (index * this.laneWidth),
                y: 0,
                key: ['s', 'd', 'k', 'l'][index],
                hitText: '',
                notes: []
            };
            this.lanes.push(lane);

            laneData.notes.forEach(note => {
                // Calculate when to spawn based on hit time
                const spawnTime = (note.hitTime * 1000) - this.approachDuration;

                const timer = setTimeout(() => {
                    this.spawnNote(lane, note.hitTime);
                    this.noteCount++;
                }, Math.max(0, spawnTime));

                this.noteSpawnTimers.push(timer);
            });
        });

        this.isRunning = true;
        this.lastFrameTime = performance.now();
        this.gameLoop(this.lastFrameTime);
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

    // Rest of the methods remain the same, but update any note.y references to note.position.y
    handleNoteHit(lane) {
        if (!lane.notes.length) return;

        let closestNote = null;
        let closestDistance = Infinity;
        let closestIndex = -1;

        lane.notes.forEach((note, index) => {
            const distance = Math.abs(note.position.y - this.hitZoneY);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestNote = note;
                closestIndex = index;
            }
        });

        if (closestNote && closestDistance <= this.badWindow) {
            if (closestDistance <= this.perfectWindow) {
                this.showHitText(lane, 'PERFECT', '#00ff00');
                this.score += 300;
            } else if (closestDistance <= this.goodWindow) {
                this.showHitText(lane, 'GOOD', '#ffff00');
                this.score += 150;
            } else {
                this.showHitText(lane, 'BAD', '#ff6666');
                this.score += 50;
            }
            lane.notes.splice(closestIndex, 1);
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

            // Draw BAD hit zone (largest, dimmest)
            this.ctx.strokeStyle = 'rgba(200, 200, 200, 0.2)';
            this.ctx.beginPath();
            this.ctx.arc(centerX, this.hitZoneY, this.badWindow, 0, Math.PI * 2);
            this.ctx.stroke();

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

        this.lanes.forEach((lane, laneIndex) => {
            // console.log(`Lane ${laneIndex} has ${lane.notes.length} notes`);

            lane.notes.forEach((note, noteIndex) => {
                const centerX = note.position.x + (this.laneWidth / 2);

                // console.log(`Drawing note ${noteIndex} at:`, {
                //     centerX,
                //     y: note.position.y,
                //     radius: this.noteRadius,
                //     originalX: note.position.x,
                //     laneWidth: this.laneWidth
                // });

                this.ctx.beginPath();
                this.ctx.arc(centerX, note.position.y, this.noteRadius, 0, Math.PI * 2);
                this.ctx.fill();

                // Draw a rectangle around the note for debugging
                this.ctx.strokeStyle = 'red';
                this.ctx.strokeRect(
                    centerX - this.noteRadius,
                    note.position.y - this.noteRadius,
                    this.noteRadius * 2,
                    this.noteRadius * 2
                );
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

        // Draw game elements
        this.drawLaneSeparators();
        this.drawHitZones();

        // Debug: Draw canvas boundaries
        this.ctx.strokeStyle = 'blue';
        this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawNotes();  // Make sure this is called
        this.drawHitText();

        // Draw score and other UI
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
        const currentTime = performance.now();

        this.lanes.forEach(lane => {
            lane.notes.forEach(note => {
                // Move at constant speed
                note.position.y += this.noteSpeed;

                // Check for miss
                if (note.position.y >= this.hitZoneY + this.badWindow) {
                    this.showHitText(lane, 'MISS', '#ff0000');
                }
            });

            // Remove passed notes
            lane.notes = lane.notes.filter(note =>
                note.position.y <= this.hitZoneY + this.badWindow + this.noteRadius);
        });

        this.lastFrameTime = currentTime;
    }

    gameLoop(timestamp) {
        if (!this.isRunning) return;

        // Maintain consistent frame rate
        const elapsed = timestamp - this.lastFrameTime;
        if (elapsed < this.frameTime) {
            requestAnimationFrame((t) => this.gameLoop(t));
            return;
        }

        this.update();
        this.draw();

        requestAnimationFrame((t) => this.gameLoop(t));
    }

    // spawnNote(lane, hitTime) {
    //     this.noteCount++;
    //     // Create note as an object with position properties
    //     const note = {
    //         position: {
    //             x: lane.x,
    //             y: this.spawnOffset
    //         },
    //         targetTime: hitTime,
    //         spawnTime: performance.now()
    //     };
    //
    //     console.log(`Spawning note#${this.noteCount} for hit time ${hitTime}ms at ${note.spawnTime - this.startTime}ms`);
    //
    //     console.log(`Spawning note#${this.noteCount}:`, {
    //         x: note.position.x,
    //         y: note.position.y,
    //         laneX: lane.x,
    //         spawnOffset: this.spawnOffset,
    //         laneWidth: this.laneWidth
    //     });
    //     lane.notes.push(note);
    // }

    calculateSpawnY(hitTime) {
        const currentTime = performance.now() - this.startTime;
        const timeUntilHit = (hitTime * 1000) - currentTime;

        // Calculate how far the note should be based on time until hit
        const progress = timeUntilHit / this.approachDuration;
        return this.spawnY + (this.distanceToHitLine * (1 - progress));
    }

    spawnNote(lane, hitTime) {
        const spawnY = this.calculateSpawnY(hitTime);

        const note = {
            position: {
                x: lane.x,
                y: spawnY
            },
            targetTime: hitTime,
            spawnTime: performance.now()
        };

        console.log(`Spawning note# ${this.noteCount} for hit time ${hitTime}ms:`, {
            spawnY,
            speed: this.noteSpeed,
            timeToHit: hitTime * 1000 - (performance.now() - this.startTime)
        });

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
            this.startTime = performance.now();
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