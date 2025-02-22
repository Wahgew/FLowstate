class GameManager {
    constructor(songData = null) {
        // important dont move placement
        this.songData = songData;
        this.songFile = this.songData?.songPath;
        this.music = new Audio(this.songFile);
        this.music.loop = false;

        // debug initialization
        // Debug mode configuration
        this.debugMode = false;
        this.autoPlay = false;
        this.gameStarted = false;  // Track if game has started

        // Add stats tracking
        this.stats = {
            perfectCount: 0,
            goodCount: 0,
            badCount: 0,
            missCount: 0,
            maxCombo: 0,
            totalNotes: 0
        };

        // FPS control
        this.targetFPS = 60;
        this.frameInterval = 1000 / this.targetFPS; // Time between frames in ms
        this.lastFrameTime = 0;
        this.frameDeltas = [];
        this.currentFPS = 60;
        this.accumulator = 0;

        // Auto-play timing data (preloaded)
        this.allNoteTimings = [];
        this.autoPlayNextNoteIndex = 0;

        // Add tracking for auto-play hit positions
        this.autoPlayHitPositions = [];
        this.lastHitPosition = null;

        // Preload timing data if we have song data
        if (this.songData) {
            this.preloadTimingData();
        }

        this.lanes = [];
        this.noteSpawnTimers = [];
        this.noteCount = 0;
        this.gameTimer = 0;

        // Convert AR to actual timing
        this.approachRate = 3; // Configurable AR
        this.approachDuration = 1200 - (150 * this.approachRate); // Time note is visible in ms

        // Calculate fall distance and speed
        this.spawnY = -100; // Starting Y position
        this.hitZoneY = 1060; // optimal position for hit zones (based on 10ms allowance)
        this.distanceToHitLine = this.hitZoneY - this.spawnY;

        // Calculate approach time based on AR
        this.approachTime = Math.max(1200 - (150 * this.approachRate), 300); // in milliseconds

        this.canvas = document.getElementById('gameWorld');
        this.ctx = this.canvas.getContext('2d');

        // Add missing properties needed for drawing
        this.laneHeight = this.canvas.height;  // Full height of canvas
        this.laneStartX = 0;  // Will be calculated in initialize()

        // Gameplay configuration
        this.laneWidth = 130;
        this.noteRadius = 50;
        this.visualHitZoneY = 950;  // Position for visual feedback only

        this.score = 0;
        this.currentCombo = 0;
        this.isRunning = false;

        this.hitTextDuration = 500;
        this.hitTextTimers = new Map();

        // Track pressed keys for visual feedback
        this.pressedKeys = new Set();

        // Create audio elements for each lane
        this.hitSounds = new Map();

        // Initialize volume settings
        this.hitSoundVolume = 0.5;  // Default hit sound volume
        this.songVolume = 0.5;      // Default song volume

        // Set initial song volume
        if (this.music) {
            this.music.volume = this.songVolume;
        }

        // Initialize hit sounds for each lane
        ['s', 'd', 'k', 'l'].forEach(key => {
            const audio = new Audio('./effects/hitsound.wav');
            audio.volume = this.hitSoundVolume;
            this.hitSounds.set(key, audio);
        });

        // Timing windows for hit detection (in milliseconds)
        this.timingWindows = {
            perfect: 60,    // ±20ms for PERFECT
            good: 70,      // ±120ms for GOOD
            bad: 100,       // ±100ms for BAD
        };

        // spawn time distance
        this.distanceToHitLine = this.hitZoneY - this.spawnY;

        // Calculate pixels per frame needed to travel the distance in the approach duration
        this.noteSpeed = (this.distanceToHitLine / (this.approachDuration / 1000)) / this.targetFPS;

        // Add restart tracking
        this.rKeyPressTime = 0;
        this.isRKeyPressed = false;
        this.restartHoldDuration = 1000; // 2 seconds to hold R
        this.onSongSelect = null; // Callback for returning to song select

        // End screen properties
        this.showingEndScreen = false;
        this.fadeStartTime = 0;
        this.fadeDuration = 2000; // 2 seconds

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

        console.log('Hit zone configuration:', {
            mechanicsHitZone: this.hitZoneY,
            visualHitZone: this.visualHitZoneY,
            distanceToTravel: this.distanceToHitLine,
            approachDuration: this.approachDuration,
            noteSpeed: this.noteSpeed,
        });

        // Store event listener references for cleanup
        this.keydownListener = null;
        this.keyupListener = null;

        this.initializeStartMenu();
        this.initializeEventListeners();
    }

    initialize() {
        const totalLaneWidth = this.laneWidth * 4;
        const offsetX = (this.canvas.width - totalLaneWidth) / 2;
        this.laneStartX = offsetX;

        // Reset auto-play index
        this.autoPlayNextNoteIndex = 0;

        // Initialize lanes and spawn notes
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

    // handle font loading and start menu initialization
    async initializeStartMenu() {
        try {
            // Wait for font to load
            await document.fonts.load('20px Nunito');
            console.log('Nunito font loaded successfully');

            // Now draw the start menu
            this.drawStartMenu();
        } catch (error) {
            console.error('Error loading font:', error);
            // Fallback to draw start menu anyway
            this.drawStartMenu();
        }
    }

    initializeEventListeners() {
        // Remove any existing listeners first
        if (this.keydownListener) {
            document.removeEventListener('keydown', this.keydownListener);
        }
        if (this.keyupListener) {
            document.removeEventListener('keyup', this.keyupListener);
        }
        if (this.startClickListener) {
            this.canvas.removeEventListener('click', this.startClickListener);
        }
        if (this.startKeyListener) {
            document.removeEventListener('keydown', this.startKeyListener);
        }

        // Initialize start screen listeners
        this.startClickListener = () => {
            if (!this.gameStarted) {
                this.startGame();
                this.canvas.removeEventListener('click', this.startClickListener);
                document.removeEventListener('keydown', this.startKeyListener);
            }
        };
        this.canvas.addEventListener('click', this.startClickListener);

        this.startKeyListener = (event) => {
            if (event.key === ' ' && !this.gameStarted) {
                this.startGame();
                this.canvas.removeEventListener('click', this.startClickListener);
                document.removeEventListener('keydown', this.startKeyListener);
            }
        };
        document.addEventListener('keydown', this.startKeyListener);

        // Initialize gameplay listeners
        this.keydownListener = (event) => {
            // Handle F2 for debug mode
            if (event.key === 'F2') {
                if (!this.gameStarted) {
                    this.toggleDebugMode();
                }
                return;
            }

            // Only process gameplay keys if not in auto-play
            if (!this.autoPlay) {
                const pressedLane = this.lanes.find(lane => lane.key === event.key);
                if (pressedLane && !this.pressedKeys.has(event.key)) {
                    this.pressedKeys.add(event.key);
                    this.playHitSound(event.key);
                    this.handleNoteHit(pressedLane);
                }
            }

            // R key press handling
            if (event.key.toLowerCase() === 'r' && !this.isRKeyPressed) {
                this.isRKeyPressed = true;
                this.rKeyPressTime = performance.now();
            }
        };

        this.keyupListener = (event) => {
            const pressedLane = this.lanes.find(lane => lane.key === event.key);
            if (pressedLane) {
                this.pressedKeys.delete(event.key);
            }

            // R key release handling - check hold duration
            if (event.key.toLowerCase() === 'r') {
                const holdDuration = performance.now() - this.rKeyPressTime;
                if (this.isRKeyPressed && holdDuration >= this.restartHoldDuration) {
                    this.handleRestart();
                }
                this.isRKeyPressed = false;
                this.rKeyPressTime = 0;
            }
        };

        // Add the gameplay listeners
        document.addEventListener('keydown', this.keydownListener);
        document.addEventListener('keyup', this.keyupListener);
    }

    // Update preloadTimingData to keep times in seconds
    preloadTimingData() {
        console.log('Preloading timing data...');
        this.allNoteTimings = [];

        this.songData.sheet.forEach((laneData, laneIndex) => {
            laneData.notes.forEach(note => {
                this.allNoteTimings.push({
                    time: note.hitTime, // Keep in seconds
                    laneIndex: laneIndex
                });
            });
        });

        // Sort timings chronologically
        this.allNoteTimings.sort((a, b) => a.time - b.time);

        console.log('Timing data preloaded:', {
            totalNotes: this.allNoteTimings.length,
            firstNoteTime: this.allNoteTimings[0]?.time.toFixed(3),
            lastNoteTime: this.allNoteTimings[this.allNoteTimings.length - 1]?.time.toFixed(3)
        });
    }

    // Toggle debug/auto-play mode
    toggleDebugMode() {
        // Only allow toggling debug mode before game starts
        if (this.gameStarted) {
            console.log('Cannot toggle debug mode after game has started');
            return;
        }

        this.debugMode = !this.debugMode;
        this.autoPlay = this.debugMode;

        console.log('Debug mode toggled:', {
            debugMode: this.debugMode,
            autoPlay: this.autoPlay,
            gameStarted: this.gameStarted
        });
    }

    handleNoteHit(lane) {
        if (!lane.notes.length) return;

        const currentTime = (performance.now() - this.startTime) / 1000;
        let closestNote = null;
        let closestTimeDiff = Infinity;
        let closestIndex = -1;

        // Debug timing information
        console.log('Hit detected:', {
            lane: lane.key,
            currentTime: currentTime,
            noteCount: lane.notes.length
        });

        // Find the closest note by time difference
        lane.notes.forEach((note, index) => {
            const timeDiff = Math.abs(currentTime - note.targetTime);

            console.log('Note timing check:', {
                noteIndex: index,
                noteTargetTime: note.targetTime,
                timeDifference: timeDiff,
                currentClosest: closestTimeDiff
            });

            if (timeDiff < closestTimeDiff) {
                closestTimeDiff = timeDiff;
                closestNote = note;
                closestIndex = index;
            }
        });

        // Convert time difference to milliseconds for window checking
        const timeDiffMs = closestTimeDiff * 1000;

        console.log('Closest note found:', {
            timeDifference: timeDiffMs,
            hitWindowPerfect: this.timingWindows.perfect,
            hitWindowGood: this.timingWindows.good,
            hitWindowBad: this.timingWindows.bad
        });

        // Check timing windows
        if (closestNote && timeDiffMs <= this.timingWindows.bad) {
            if (timeDiffMs <= this.timingWindows.perfect) {
                this.showHitText(lane, 'PERFECT', '#00ff00');
                this.score += 300;
                this.currentCombo++;
                console.log('Hit result: PERFECT');
            } else if (timeDiffMs <= this.timingWindows.good) {
                this.showHitText(lane, 'GOOD', '#ffff00');
                this.score += 150;
                this.currentCombo++;
                console.log('Hit result: GOOD');
            } else {
                // BAD hit - still maintains combo
                this.showHitText(lane, 'BAD', '#ff6666');
                this.score += 50;
                this.currentCombo++; // Keep the combo going
                console.log('Hit result: BAD');
            }

            // Remove the hit note
            lane.notes.splice(closestIndex, 1);
        }
        // Early hits or no notes in range - no penalty
    }

    // Modified showHitText to handle misses
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

    // Draws all canvas and components
    draw() {
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw game elements
        this.drawLaneSeparators();
        this.drawGameplayHitZones();

        if (this.debugMode) {
            this.drawHitZones();
        }

        //this.ctx.strokeStyle = 'blue';
        //this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawNotes();
        this.drawHitText();

        // Draw centered score at top
        this.drawCenteredText(`${this.score}`, 60, '32px');

        // Draw combo if greater than 0
        if (this.currentCombo > 0) {
            this.drawCenteredText(this.currentCombo.toString(), 400, '40px');
        }

        // Draw key hints
        this.ctx.font = '20px nunito';
        this.lanes.forEach(lane => {
            const centerX = lane.x + (this.laneWidth / 2);
            this.ctx.fillText(lane.key.toUpperCase(), centerX - 5, this.visualHitZoneY + 80);
        });

        // Draw restart progress if R is being held
        if (this.isRKeyPressed && this.rKeyPressTime > 0) {
            const currentTime = performance.now();
            const holdDuration = currentTime - this.rKeyPressTime;
            const progress = Math.min(holdDuration / this.restartHoldDuration, 1);

            // Draw progress bar at the top center of the screen
            const barWidth = 200;
            const barHeight = 10;
            const x = (this.canvas.width - barWidth) / 2;
            const y = 20;

            // Background
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.fillRect(x, y, barWidth, barHeight);

            // Progress
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            this.ctx.fillRect(x, y, barWidth * progress, barHeight);

            // Text
            if (progress < 1) {
                this.ctx.fillStyle = 'white';
                this.ctx.font = '14px nunito';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('Hold R to restart', this.canvas.width / 2, y + 25);
            }
        }
    }

    // Modified drawHitZones to use debug information
    drawHitZones() {
        if (!this.debugMode) return;

        // Draw debug info background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(5, 5, 300, 180);

        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.font = '14px nunito';

        const avgYPosition = this.autoPlayHitPositions.length > 0
            ? this.autoPlayHitPositions.reduce((a, b) => a + b, 0) / this.autoPlayHitPositions.length
            : this.visualHitZoneY;

        const debugInfo = [
            `Game Time: ${this.gameTimer.toFixed(0)}ms`,
            `FPS: ${this.currentFPS.toFixed(1)}`,  // Add this line
            `Auto-Play: ${this.autoPlay ? 'ON' : 'OFF'}`,
            `Total Notes: ${this.allNoteTimings.length}`,
            `Auto-Play Hits: ${this.autoPlayHitPositions.length}`,
            `Last Hit Y-Pos: ${this.lastHitPosition?.toFixed(1) || 'N/A'}`,
            `Avg Hit Y-Pos: ${avgYPosition.toFixed(1)}`,
            `Mechanics Y: ${this.hitZoneY}`,
            `Visual Y: ${this.visualHitZoneY}`,
            `Score: ${this.score}`,
            `Max Score: ${this.allNoteTimings.length * 300}`
        ];

        debugInfo.forEach((text, index) => {
            this.ctx.fillText(text, 10, 25 + (index * 18));
        });

        // Draw horizontal line at visual hit position
        this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.visualHitZoneY);
        this.ctx.lineTo(this.canvas.width, this.visualHitZoneY);
        this.ctx.stroke();

        // Draw fainter line at mechanics hit position
        this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.hitZoneY);
        this.ctx.lineTo(this.canvas.width, this.hitZoneY);
        this.ctx.stroke();

        this.ctx.setLineDash([]); // Reset line style
    }

    // Modified drawNotes method to ensure proper note size
    drawNotes() {
        this.ctx.fillStyle = 'white';
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';

        this.lanes.forEach(lane => {
            lane.notes.forEach(note => {
                const centerX = lane.x + (this.laneWidth / 2);

                // Draw note circle
                this.ctx.beginPath();
                this.ctx.arc(centerX, note.position.y, this.noteRadius, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();

                // Draw debug info for each note if in debug mode
                if (this.debugMode) {
                    const currentTime = (performance.now() - this.startTime) / 1000;
                    const timeToHit = (note.targetTime - currentTime) * 1000;
                    this.ctx.fillStyle = 'gray';
                    this.ctx.font = '10px nunito';
                    this.ctx.fillText(`${timeToHit.toFixed(0)}ms`, centerX - 15, note.position.y);
                }
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
                this.ctx.fillText(lane.hitText, centerX, this.hitZoneY - 200);
            }
        });

        this.ctx.textAlign = 'left'; // Reset text align for score
    }

    // Draw centered text
    drawCenteredText(text, y, fontSize = '20px', color = 'white') {
        this.ctx.font = `${fontSize} nunito`;
        this.ctx.fillStyle = color;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(text, this.canvas.width / 2, y);
        this.ctx.textAlign = 'left'; // Reset alignment
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

    drawGameplayHitZones() {
        // Draw hit zone circles in each lane
        this.lanes.forEach(lane => {
            const centerX = lane.x + (this.laneWidth / 2);

            // Draw outer circle (hit zone)
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(centerX, this.visualHitZoneY, this.noteRadius, 0, Math.PI * 2);
            this.ctx.stroke();

            // Fill circle if key is pressed
            if (this.pressedKeys.has(lane.key)) {
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                this.ctx.fill();
            }
        });

        this.ctx.lineWidth = 1;
    }

    // Add method to check for missed notes in update loop
    update() {
        const currentTime = (performance.now() - this.startTime) / 1000;
        this.gameTimer = currentTime * 1000;

        // Auto-play handling
        if (this.autoPlay) {
            this.handleAutoPlay();
        }

        // Check for missed notes in each lane
        this.lanes.forEach(lane => {
            // Check each note in the lane
            for (let i = lane.notes.length - 1; i >= 0; i--) {
                const note = lane.notes[i];
                const timeDiff = Math.abs(currentTime - note.targetTime) * 1000;

                // Only count as miss if the note is well past the hit window
                if (currentTime > note.targetTime && timeDiff > this.timingWindows.bad) {
                    this.showHitText(lane, 'MISS', '#ff0000');
                    this.currentCombo = 0; // Only reset combo on complete misses
                    lane.notes.splice(i, 1);

                    console.log('Note missed:', {
                        targetTime: note.targetTime,
                        currentTime: currentTime,
                        timeDiff: timeDiff,
                        lane: lane.key
                    });
                }
            }

            // Update remaining notes
            lane.notes.forEach(note => {
                note.position.y += this.noteSpeed;
            });
        });

        //this.frameCount++;
        this.lastFrameTime = performance.now();
    }

// Modified gameLoop with proper frame limiting
    gameLoop(timestamp) {
        if (!this.isRunning) return;

        // Calculate frame delta
        const frameTime = timestamp - this.lastFrameTime;
        this.lastFrameTime = timestamp;

        // Accumulate time delta
        this.accumulator += frameTime;

        // Update FPS tracking
        this.frameDeltas.push(frameTime);
        if (this.frameDeltas.length > 60) {
            this.frameDeltas.shift();
        }
        this.currentFPS = 1000 / (this.frameDeltas.reduce((a, b) => a + b, 0) / this.frameDeltas.length);

        // Process accumulated time in fixed timesteps
        while (this.accumulator >= this.frameInterval) {
            this.update();
            this.accumulator -= this.frameInterval;
        }

        // Draw at whatever rate the display can handle
        this.draw();

        requestAnimationFrame((t) => this.gameLoop(t));
    }

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
        this.ctx.font = '40px nunito';
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'center';

        const startX = this.canvas.width / 2;
        const startY = this.canvas.height / 2;

        // Show autoplay status in start menu
        if (this.debugMode) {
            this.ctx.fillText('Auto-Play Mode', startX, startY - 40);
        }

        this.ctx.fillText('Start', startX, startY);

        // Add instructions
        this.ctx.font = '20px nunito';
        this.ctx.fillText('Press F2 to toggle Auto-Play before starting', startX, startY + 40);
        this.ctx.fillText('Press SPACE or Click to start', startX, startY + 70);
    }

    playHitSound(key) {
        const sound = this.hitSounds.get(key);
        if (sound) {
            // Create a new Audio element for overlapping sounds
            const newSound = new Audio('./effects/hitsound.wav');
            newSound.volume = this.hitSoundVolume;
            newSound.play().catch(error => console.error('Error playing hit sound:', error));

            // Replace the old sound with the new one
            this.hitSounds.set(key, newSound);
        }
    }

    // set hit sound volume
    setHitSoundVolume(volume) {
        this.hitSoundVolume = Math.max(0, Math.min(1, volume));
        this.hitSounds.forEach(sound => {
            sound.volume = this.hitSoundVolume;
        });
        console.log('Hit sound volume set to:', this.hitSoundVolume);
    }

    // set song volume
    setSongVolume(volume) {
        this.songVolume = Math.max(0, Math.min(1, volume));
        if (this.music) {
            this.music.volume = this.songVolume;
        }
        console.log('Song volume set to:', this.songVolume);
    }

    async handleRestart() {
        // Stop current game loop and music
        this.isRunning = false;
        this.music.pause();
        this.music.currentTime = 0;

        // Clear game state
        this.score = 0;
        this.currentCombo = 0;
        this.gameTimer = 0;
        this.gameStarted = false;
        this.pressedKeys.clear();

        // Clear notes and timers
        this.lanes = [];
        this.noteSpawnTimers.forEach(timer => clearTimeout(timer));
        this.noteSpawnTimers = [];
        this.hitTextTimers.forEach(timer => clearTimeout(timer));
        this.hitTextTimers.clear();

        // Reset auto-play state if in debug mode
        if (this.debugMode) {
            this.debugMode = false;
            this.autoPlay = false;
        }

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Return to start menu
        if (this.onSongSelect) {
            this.onSongSelect();
        } else {
            // Fallback to reinitializing start menu if no song select callback
            await this.initializeStartMenu();
            this.initializeEventListeners();
        }
    }

    // Handles autoplay
    handleAutoPlay() {
        console.log("Autoplay called");
        const currentTime = (performance.now() - this.startTime) / 1000; // Current time in seconds
        this.gameTimer = currentTime * 1000; // Game timer in milliseconds

        // Check if we have any notes to process
        while (this.autoPlayNextNoteIndex < this.allNoteTimings.length) {
            const nextNote = this.allNoteTimings[this.autoPlayNextNoteIndex];
            const lane = this.lanes[nextNote.laneIndex];

            // Debug current state
            console.log('Auto-play state:', {
                gameTimeSeconds: currentTime.toFixed(3),
                nextNoteTimeSeconds: nextNote.time.toFixed(3),
                laneIndex: nextNote.laneIndex,
                notesInLane: lane?.notes.length || 0,
                autoPlayIndex: this.autoPlayNextNoteIndex
            });

            // Check if the lane exists and has notes
            if (!lane || lane.notes.length === 0) {
                // Only increment index if we're well past the note time
                if (currentTime > (nextNote.time + 1)) {
                    console.log('Skipping note - no note in lane or too late:', {
                        currentTime: currentTime.toFixed(3),
                        noteTime: nextNote.time.toFixed(3),
                        laneIndex: nextNote.laneIndex
                    });
                    this.autoPlayNextNoteIndex++;
                }
                break; // Wait for notes to spawn
            }

            // Get the first note in the lane
            const noteToHit = lane.notes[0];
            const timeDiff = Math.abs(currentTime - nextNote.time); // Compare in seconds

            console.log('Auto-play timing check:', {
                currentTimeSeconds: currentTime.toFixed(3),
                noteTimeSeconds: nextNote.time.toFixed(3),
                timeDiffSeconds: timeDiff.toFixed(3),
                timeDiffMs: (timeDiff * 1000).toFixed(1),
                noteY: noteToHit.position.y.toFixed(1),
                index: this.autoPlayNextNoteIndex
            });

            // If we're within 12ms (0.012 seconds) of the target time
            if (timeDiff <= 0.020) { // 12ms error
                console.log('Auto-play hit triggered:', {
                    hitTime: currentTime.toFixed(3),
                    targetTime: nextNote.time.toFixed(3),
                    timeDiffMs: (timeDiff * 1000).toFixed(1),
                    lane: nextNote.laneIndex,
                    noteY: noteToHit.position.y.toFixed(1)
                });

                // Store the y-position before hitting
                this.lastHitPosition = noteToHit.position.y;
                this.autoPlayHitPositions.push(noteToHit.position.y);

                // Trigger the hit
                this.handleNoteHit(lane);
                this.autoPlayNextNoteIndex++;
            } else if (currentTime < nextNote.time) {
                // Haven't reached the note time yet
                break;
            } else if (timeDiff > 0.1) { // If we're more than 100ms past the note
                // Move to next note if we've missed this one
                console.log('Note missed - too late:', {
                    currentTime: currentTime.toFixed(3),
                    noteTime: nextNote.time.toFixed(3),
                    timeDiffMs: (timeDiff * 1000).toFixed(1)
                });
                this.autoPlayNextNoteIndex++;
            }
        }
    }

    startGame() {
        if (!this.songData) {
            console.error('No song data available');
            return;
        }

        this.gameStarted = true;

        if (this.autoPlay) {
            console.log('Starting in auto-play mode with preloaded timings:', {
                totalNotes: this.allNoteTimings.length,
                autoPlayIndex: this.autoPlayNextNoteIndex
            });

            this.initialize();
            this.startTime = performance.now();
            this.music.play().catch((error) => {
                console.error('Error playing music:', error);
            });
        } else {
            this.music.play().then(() => {
                this.startTime = performance.now();
                this.initialize();
            }).catch((error) => {
                console.error('Error playing music:', error);
            });
        }
    }
}

// Create and initialize the game when the window loads
window.onload = function() {
    window.gameManager = new GameManager();  // Set gameManager globally
};