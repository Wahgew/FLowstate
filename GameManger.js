class GameManager {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.isRunning = false;
        this.score = 0;

        // Lane configuration
        this.lanes = [
            { x: 556, y: 0, key: 's', hitText: '' },
            { x: 656, y: 0, key: 'd', hitText: '' },
            { x: 756, y: 0, key: 'k', hitText: '' },
            { x: 856, y: 0, key: 'l', hitText: '' }
        ];

        // Lane separators
        this.laneWidth = 100;
        this.laneStartX = 0; // Start position of first separator (50px before first note)
        this.laneHeight = 1000; // Full height of canvas

        // Hit zone configuration
        this.hitZoneY = 900;
        this.hitZoneRadius = 30;
        this.noteRadius = 20;

        // Hit detection configuration
        this.perfectWindow = 20;  // ±15 pixels from center for PERFECT
        this.goodWindow = 40;     // ±40 pixels from center for GOOD

        // Hit text display configuration
        this.hitTextDuration = 500; // Duration in milliseconds to show hit text
        this.hitTextTimers = new Map(); // Store timers for hit text

        // Load fonts
        document.fonts.load('20px nunito').then(() => {
            this.initialize();
        })
    }

    initialize() {
        this.canvas = document.getElementById('gameWorld');
        this.ctx = this.canvas.getContext('2d');

        // Calculate lane positions based on the canvas width
        const totalLaneWidth = this.laneWidth * this.lanes.length;
        const offsetX = (this.canvas.width - totalLaneWidth) / 2;

        this.laneStartX = offsetX - 50; // lane start is 50px before first lane

        // Update the lane x positions based on the new canvas width
        this.lanes.forEach((lane, index) => {
            lane.x = offsetX + (index * this.laneWidth);
        });

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

    handleNoteHit(lane) {
        // Calculate distance from perfect hit
        const distance = Math.abs(lane.y - this.hitZoneY);

        if (distance <= this.perfectWindow) {
            this.showHitText(lane, 'PERFECT', '#00ff00');
            this.score += 300;
        } else if (distance <= this.goodWindow) {
            this.showHitText(lane, 'GOOD', '#ffff00');
            this.score += 150;
        } else if (distance <= this.hitZoneRadius + this.noteRadius) {
            this.showHitText(lane, 'BAD', '#ff0000');
            this.score += 50;
        } else {
            // Note wasn't in hit range at all
            return;
        }

        // Reset note to top after hit
        lane.y = 0;
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
            // Draw GOOD hit zone (larger, dimmer)
            this.ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
            this.ctx.beginPath();
            this.ctx.arc(lane.x, this.hitZoneY, this.goodWindow, 0, Math.PI * 2);
            this.ctx.stroke();

            // Draw PERFECT hit zone (smaller, brighter)
            this.ctx.strokeStyle = 'rgba(200, 200, 200, 0.8)';
            this.ctx.beginPath();
            this.ctx.arc(lane.x, this.hitZoneY, this.perfectWindow, 0, Math.PI * 2);
            this.ctx.stroke();
        });
    }

    drawNotes() {
        this.ctx.fillStyle = 'white';

        this.lanes.forEach(lane => {
            this.ctx.beginPath();
            this.ctx.arc(lane.x, lane.y, this.noteRadius, 0, Math.PI * 2);
            this.ctx.fill();
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
        this.ctx.fillText('Your Score:', this.canvas.width - 150, 50);
        this.ctx.fillText(this.score, this.canvas.width - 150, 75);

        // Draw key hints
        this.ctx.font = '16px nunito';
        this.lanes.forEach(lane => {
            this.ctx.fillText(lane.key.toUpperCase(), lane.x - 5, this.hitZoneY + 60);
        });
    }

    update() {
        this.lanes.forEach(lane => {
            lane.y += 2; // fall speed

            if (lane.y > this.canvas.height) {
                lane.y = 0;
                this.showHitText(lane, 'MISS', '#ff0000');
            }
        });
    }

    gameLoop() {
        if (!this.isRunning) return;
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Create and initialize the game when the window loads
window.onload = function() {
    window.gameManager = new GameManager();  // Set gameManager globally
};