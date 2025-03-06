class GameManager {
    constructor(songInfo = null, playerData = null) {
        // important dont move placement
        this.playerData = playerData;
        this.songData = songInfo?.data || null;
        this.songId = songInfo?.id || null;

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

        // Track keys currently being held down
        this.heldKeys = new Set();
        // Track active hold notes
        this.activeHoldNotes = new Map(); // key -> note mapping

        // timing lines
        this.timingLines = [];
        this.timingLineSpacing = 2.0 // line spacing occurrence
        this.showTimingLines = true;

        // timer display
        this.songLength = 0;
        this.timeRemaining = 0;

        // Convert AR to actual timing
        this.approachRate = 3; // Configurable AR
        this.approachDuration = 1200 - (150 * this.approachRate); // Time note is visible in ms

        // Calculate fall distance and speed
        this.spawnY = -100; // Starting Y position
        this.hitZoneY = 1000; // optimal position for hit zones (based on 10ms allowance)
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
        this.hitSoundVolume = 0.4;  // Default hit sound volume
        this.songVolume = 0.5;      // Default song volume

        // Set initial song volume
        if (this.music) {
            this.music.volume = this.songVolume;
        }

        // Add cleanup tracking
        this.lastCleanupTime = 0;
        this.cleanupThreshold = 5000; // Cleanup every 5 seconds
        this.animationFrameId = null;
        this.noteSpawnPromises = [];

        // Initialize hit sounds for each lane
        ['s', 'd', 'k', 'l'].forEach(key => {
            const audio = new Audio('./effects/hitsound.wav');
            audio.volume = this.hitSoundVolume;
            this.hitSounds.set(key, audio);
        });

        // Add miss sound effect
        this.missSound = new Audio('./effects/miss.mp3');

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

        this.endScreenUI = new EndScreenUI(this.canvas, this.ctx);
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
                    this.spawnNote(lane, note.hitTime, note);
                    this.noteCount++;
                }, Math.max(0, spawnTime));
                this.noteSpawnTimers.push(timer);
            });
        });

        this.initializeTimingLines();
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
            this.keydownListener = null;
        }
        if (this.keyupListener) {
            document.removeEventListener('keyup', this.keyupListener);
            this.keyupListener = null;
        }
        if (this.startClickListener) {
            this.canvas.removeEventListener('click', this.startClickListener);
            this.startClickListener = null;
        }
        if (this.startKeyListener) {
            document.removeEventListener('keydown', this.startKeyListener);
            this.startKeyListener = null;
        }
        if (this.endScreenKeyListener) {
            document.removeEventListener('keydown', this.endScreenKeyListener);
            this.endScreenKeyListener = null;
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
            // Skip all input processing if end screen is showing
            if (this.showingEndScreen) return;

            // Handle F2 for debug mode
            if (event.key === 'F2') {
                if (!this.gameStarted) {
                    this.toggleDebugMode();
                }
                return;
            }

            const pressedLane = this.lanes.find(lane => lane.key === event.key);
            if (pressedLane && !this.pressedKeys.has(event.key)) {
                this.pressedKeys.add(event.key);
                this.heldKeys.add(event.key); // Track key as being held
                this.playHitSound(event.key);
                this.handleNoteHit(pressedLane);
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
            // Skip all input processing if end screen is showing
            if (this.showingEndScreen) return;

            const pressedLane = this.lanes.find(lane => lane.key === event.key);
            if (pressedLane) {
                this.pressedKeys.delete(event.key);
            }

            const releasedLane = this.lanes.find(lane => lane.key === event.key);
            if (releasedLane) {
                this.heldKeys.delete(event.key); // Remove from held keys
                this.pressedKeys.delete(event.key);

                // Handle hold note release if there's an active hold note
                if (this.activeHoldNotes.has(event.key)) {
                    this.handleHoldNoteRelease(releasedLane, event.key);
                }
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

    // inti visual timing lines
    initializeTimingLines() {
        if (!this.music || !this.showTimingLines) return;

        // Clear existing timing lines
        this.timingLines = [];

        // Calculate total song length in seconds
        this.songLength = this.music.duration;
        this.timeRemaining = this.songLength;

        // Don't create lines if the song is too short
        if (this.songLength <= 0) return;

        // Create timing lines evenly spaced across the song - simplified approach
        const lineCount = Math.floor(this.songLength / this.timingLineSpacing);

        for (let i = 0; i < lineCount; i++) {
            const hitTime = i * this.timingLineSpacing;

            // No overlap check - just add all lines with even spacing
            this.timingLines.push({
                hitTime: hitTime,
                position: { y: this.spawnY },
                active: true,
                spawnTime: (hitTime * 1000) // Store spawn time in ms
            });
        }

        console.log(`Created ${this.timingLines.length} timing lines for ${this.songLength}s song`);
    }

    cleanupResources() {
        const currentTime = performance.now();

        // Only cleanup every few seconds to avoid excessive garbage collection
        if (currentTime - this.lastCleanupTime < this.cleanupThreshold) {
            return;
        }

        // Cleanup old notes
        this.lanes.forEach(lane => {
            // Remove notes that are way past the hit zone
            lane.notes = lane.notes.filter(note => {
                const noteTime = note.targetTime * 1000;
                const currentGameTime = currentTime - this.startTime;
                return currentGameTime - noteTime < 2000; // Keep notes within 2 seconds of current time
            });
        });

        // Clear old hit text timers
        this.hitTextTimers.forEach((timer, key) => {
            clearTimeout(timer);
            this.hitTextTimers.delete(key);
        });

        // Clear hit positions array if it's getting too large
        if (this.autoPlayHitPositions.length > 100) {
            this.autoPlayHitPositions = this.autoPlayHitPositions.slice(-50);
        }

        this.lastCleanupTime = currentTime;
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

        // Find closest note logic (existing code)
        lane.notes.forEach((note, index) => {
            const timeDiff = Math.abs(currentTime - note.targetTime);
            if (timeDiff < closestTimeDiff) {
                closestTimeDiff = timeDiff;
                closestNote = note;
                closestIndex = index;
            }
        });

        const timeDiffMs = closestTimeDiff * 1000;

        if (closestNote && timeDiffMs <= this.timingWindows.bad) {
            // If it's a hold note, handle it differently
            if (closestNote.isHold) {
                if (timeDiffMs <= this.timingWindows.perfect) {
                    this.showHitText(lane, 'PERFECT', '#00ff00');
                    this.score += 300; // Initial points for hitting the start perfectly
                    this.currentCombo++;
                    this.stats.perfectCount++;

                    // Track this hold note as active
                    this.activeHoldNotes.set(lane.key, {
                        note: closestNote,
                        startScore: 300,
                        laneIndex: this.lanes.indexOf(lane),
                        noteIndex: closestIndex
                    });
                } else if (timeDiffMs <= this.timingWindows.good) {
                    this.showHitText(lane, 'GOOD', '#ffff00');
                    this.score += 150;
                    this.currentCombo++;
                    this.stats.goodCount++;

                    // Track this hold note as active
                    this.activeHoldNotes.set(lane.key, {
                        note: closestNote,
                        startScore: 150,
                        laneIndex: this.lanes.indexOf(lane),
                        noteIndex: closestIndex
                    });
                } else {
                    this.showHitText(lane, 'BAD', '#ff6666');
                    this.score += 50;
                    this.currentCombo++;
                    this.stats.badCount++;

                    // Track this hold note as active
                    this.activeHoldNotes.set(lane.key, {
                        note: closestNote,
                        startScore: 50,
                        laneIndex: this.lanes.indexOf(lane),
                        noteIndex: closestIndex
                    });
                }
            } else {
                // Regular note handling (existing code)
                if (timeDiffMs <= this.timingWindows.perfect) {
                    this.showHitText(lane, 'PERFECT', '#00ff00');
                    this.score += 300;
                    this.currentCombo++;
                    this.stats.perfectCount++;
                } else if (timeDiffMs <= this.timingWindows.good) {
                    this.showHitText(lane, 'GOOD', '#ffff00');
                    this.score += 150;
                    this.currentCombo++;
                    this.stats.goodCount++;
                } else {
                    this.showHitText(lane, 'BAD', '#ff6666');
                    this.score += 50;
                    this.currentCombo++;
                    this.stats.badCount++;
                }

                // Remove the hit note (only for regular notes)
                lane.notes.splice(closestIndex, 1);
            }

            // Update max combo
            this.stats.maxCombo = Math.max(this.stats.maxCombo, this.currentCombo);
        }
    }

    handleHoldNoteRelease(lane, key) {
        const holdInfo = this.activeHoldNotes.get(key);
        if (!holdInfo) return;

        const currentTime = (performance.now() - this.startTime) / 1000;
        const note = holdInfo.note;

        // Remove the active hold note
        this.activeHoldNotes.delete(key);

        // Remove the hold note from the lane
        const targetLane = this.lanes[holdInfo.laneIndex];
        if (targetLane) {
            const noteIndex = targetLane.notes.findIndex(n => n === note);
            if (noteIndex !== -1) {
                targetLane.notes.splice(noteIndex, 1);
            }
        }
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
        if (this.showingEndScreen) {
            this.drawEndScreen();
            return;
        }

        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw timing lines (behind lanes and notes)
        this.drawTimingLines();

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

        this.drawTimer();

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
            const y = 80;

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
                this.ctx.fillText('Hold R to restart', this.canvas.width / 2, y + 30);
            }
        }
        //this.checkSongEnd();
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
            this.ctx.fillText(text, 10, 300 + (index * 18));
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
        // Count notes of each type for debugging - MOVED THIS OUTSIDE THE LOOP
        let regularCount = 0;
        let holdCount = 0;

        this.lanes.forEach(lane => {
            regularCount += lane.notes.filter(note => !note.isHold).length;
            holdCount += lane.notes.filter(note => note.isHold).length;
        });

        console.log(`Drawing notes: ${regularCount} regular, ${holdCount} hold notes`);

        this.ctx.fillStyle = 'white';
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';

        this.lanes.forEach(lane => {
            lane.notes.forEach(note => {
                const centerX = lane.x + (this.laneWidth / 2);

                if (note.isHold) {
                    // Current time to calculate the end position of hold note
                    const currentTime = (performance.now() - this.startTime) / 1000;

                    // For hold notes, we need to draw a rectangle from the start to the end
                    // Calculate end position based on currentTime and endTime
                    let endY = note.position.y;

                    // If current time is before end time, calculate the visible length
                    if (note.endTime && currentTime < note.endTime) {
                        // Calculate how much time is left in the hold
                        const timeLeft = note.endTime - currentTime;

                        // Calculate the distance this time represents
                        const distanceLeft = timeLeft * (this.noteSpeed * this.targetFPS);

                        // Calculate end Y position
                        // For hold notes coming down, the end position should be ABOVE the current position
                        endY = Math.max(this.spawnY, note.position.y - distanceLeft);
                    }

                    // Draw the hold note as a rectangle
                    const holdHeight = Math.abs(note.position.y - endY);

                    // Draw hold body (only if there's height to draw)
                    if (holdHeight > 0) {
                        // Constants for drawing
                        const holdWidth = this.noteRadius * 2; // Width same as circle diameter

                        // Draw hold body as a rounded rectangle with consistent width
                        this.ctx.fillStyle = 'rgb(211,211,211)'; // gray with transparency

                        // Draw main rectangle body
                        this.ctx.beginPath();
                        this.ctx.roundRect(
                            centerX - this.noteRadius,
                            endY,
                            holdWidth,
                            holdHeight,
                            [this.noteRadius, this.noteRadius, 0, 0] // Round only the top corners
                        );
                        this.ctx.fill();

                        // Draw start circle (the one that stays at the hit line)
                        this.ctx.fillStyle = 'rgb(133, 190, 242)'; // Solid blue
                        this.ctx.beginPath();
                        this.ctx.arc(centerX, note.position.y, this.noteRadius, 0, Math.PI * 2);
                        this.ctx.fill();
                        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
                        this.ctx.stroke();

                        // Draw end circle if the trail is long enough
                        if (holdHeight > this.noteRadius) {
                            this.ctx.fillStyle = 'rgba(133, 190, 242, 0.9)';
                            this.ctx.beginPath();
                            this.ctx.arc(centerX, endY, this.noteRadius, 0, Math.PI * 2);
                            this.ctx.fill();
                            this.ctx.stroke();
                        }
                    } else {
                        // If no height (end time passed), just draw as regular note
                        this.ctx.fillStyle = 'white';
                        this.ctx.beginPath();
                        this.ctx.arc(centerX, note.position.y, this.noteRadius, 0, Math.PI * 2);
                        this.ctx.fill();
                        this.ctx.stroke();
                    }
                } else {
                    // Regular note drawing
                    this.ctx.fillStyle = 'white';
                    this.ctx.beginPath();
                    this.ctx.arc(centerX, note.position.y, this.noteRadius, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.stroke();
                }

                // Debug info
                if (this.debugMode) {
                    const currentTime = (performance.now() - this.startTime) / 1000;
                    const timeToHit = (note.targetTime - currentTime) * 1000;
                    this.ctx.fillStyle = 'gray';
                    this.ctx.font = '10px nunito';
                    this.ctx.fillText(`${timeToHit.toFixed(0)}ms`, centerX - 15, note.position.y);

                    // Add hold note debug info
                    if (note.isHold && note.endTime) {
                        this.ctx.fillText(`Hold: ${((note.endTime - note.targetTime) * 1000).toFixed(0)}ms`,
                            centerX - 20, note.position.y + 15);
                    }
                }
            });
        });
    }

    drawTimingLines() {
        if (!this.showTimingLines) return;

        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'; // Subtle gray for timing lines
        this.ctx.lineWidth = 2;

        this.timingLines.forEach(line => {
            if (line.active && line.position.y >= this.spawnY) {
                // Draw a dashed line across all lanes
                this.ctx.beginPath();
                //this.ctx.setLineDash([5, 10]); // Create dashed line
                this.ctx.moveTo(this.laneStartX, line.position.y);
                this.ctx.lineTo(this.laneStartX + (this.laneWidth * 4), line.position.y);
                this.ctx.stroke();
            }
        });

        // Reset line style
        //this.ctx.setLineDash([]);
    }

    drawHitText() {
        this.ctx.textAlign = 'center';
        this.ctx.font = 'bold 15px nunito'; // Change font size to 36px

        this.lanes.forEach(lane => {
            if (lane.hitText) {
                const centerX = lane.x + (this.laneWidth / 2);
                this.ctx.fillStyle = lane.hitTextColor;
                this.ctx.fillText(lane.hitText, centerX, this.hitZoneY - 150);
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

    drawEndScreen() {
        if (!this.showingEndScreen) return;

        const stats = {
            score: this.score,
            maxCombo: this.stats.maxCombo,
            accuracy: this.stats.accuracy,
            perfectCount: this.stats.perfectCount,
            goodCount: this.stats.goodCount,
            badCount: this.stats.badCount,
            missCount: this.stats.missCount,
            isFullCombo: this.stats.isFullCombo
        };

        this.endScreenUI.drawEndScreen(stats);
    }

    drawTimer() {
        // Only draw if we have a valid song length
        if (this.songLength <= 0) return;

        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = Math.floor(this.timeRemaining % 60);
        const timeText = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        // Draw timer in the bottom right corner
        this.ctx.font = '24px nunito';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(timeText, this.canvas.width - 20, this.canvas.height - 20);

        // Reset text alignment
        this.ctx.textAlign = 'left';
    }


    // Add method to check for missed notes in update loop
    update() {
        const currentTime = (performance.now() - this.startTime) / 1000;
        this.gameTimer = currentTime * 1000;

        // Update time remaining
        if (this.music && this.music.duration > 0) {
            this.timeRemaining = Math.max(0, this.music.duration - this.music.currentTime);
        }

        this.cleanupResources();

        // Auto-play handling
        if (this.autoPlay) {
            this.handleAutoPlay();
        }

        // Update timing lines
        if (this.showTimingLines) {
            // Update active timing lines - same logic as notes to ensure consistent speed
            this.timingLines.forEach(line => {
                if (line.active) {
                    // Calculate position based on current time - this ensures lines move at exactly the same speed as notes
                    const elapsedTime = this.gameTimer - line.spawnTime;
                    const progress = elapsedTime / this.approachDuration;
                    line.position.y = this.spawnY + (this.distanceToHitLine * progress);

                    // Deactivate line if it's past the hit zone
                    if (line.position.y > this.hitZoneY + 100) {
                        line.active = false;
                    }
                }
            });
        }

        // Check for missed notes in each lane
        this.lanes.forEach(lane => {
            // Check each note in the lane
            for (let i = lane.notes.length - 1; i >= 0; i--) {
                const note = lane.notes[i];
                const timeDiff = Math.abs(currentTime - note.targetTime) * 1000;

                // For regular notes
                if (!note.isHold) {
                    // Only count as miss if the note is well past the hit window
                    if (currentTime > note.targetTime && timeDiff > this.timingWindows.bad) {
                        this.showHitText(lane, 'MISS', '#ff0000');
                        this.currentCombo = 0; // Only reset combo on complete misses
                        this.stats.missCount++;
                        lane.notes.splice(i, 1);
                        this.playMissSound();
                    }
                }
                // For hold notes
                else {
                    // Only count as miss if the start time is past the hit window
                    if (currentTime > note.targetTime && timeDiff > this.timingWindows.bad) {
                        if (!this.activeHoldNotes.has(lane.key)) {
                            // Player missed the start of the hold note
                            this.showHitText(lane, 'MISS', '#ff0000');
                            this.currentCombo = 0;
                            this.stats.missCount++;
                            lane.notes.splice(i, 1);
                            this.playMissSound();
                        }
                    }
                }
            }
        });

        // Check active hold notes
        this.activeHoldNotes.forEach((holdInfo, key) => {
            const note = holdInfo.note;

            // If player released key too early (before end time)
            if (!this.heldKeys.has(key) && currentTime < note.endTime) {
                // Player released too early - handle as needed
                // For your game, we don't penalize early release
                this.activeHoldNotes.delete(key);

                // Remove the hold note from the lane
                const lane = this.lanes[holdInfo.laneIndex];
                if (lane) {
                    const noteIndex = lane.notes.findIndex(n => n === note);
                    if (noteIndex !== -1) {
                        lane.notes.splice(noteIndex, 1);
                    }
                }
            }
            // If the hold note ended naturally
            else if (currentTime >= note.endTime) {
                // Hold completed successfully
                this.activeHoldNotes.delete(key);

                // Remove the hold note from the lane
                const lane = this.lanes[holdInfo.laneIndex];
                if (lane) {
                    const noteIndex = lane.notes.findIndex(n => n === note);
                    if (noteIndex !== -1) {
                        lane.notes.splice(noteIndex, 1);
                    }
                }
            }
        });

        // Update remaining notes
        this.lanes.forEach(lane => {
            lane.notes.forEach(note => {
                note.position.y += this.noteSpeed;
            });
        });

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

        // Check for song end after update - ENHANCED END CONDITION CHECK
        const songEnded = this.music.ended || (this.music.currentTime >= this.music.duration - 0.1); // Consider "almost ended" as ended
        const noMoreNotes = this.lanes.every(lane => lane.notes.length === 0);
        const allNotesSpawned = this.noteSpawnTimers.length === 0 || this.noteCount >= this.allNoteTimings.length;

        if ((songEnded && noMoreNotes) || (noMoreNotes && allNotesSpawned)) {
            console.log('Game ending conditions met:', {
                songEnded,
                noMoreNotes,
                allNotesSpawned
            });

            this.isRunning = false;
            this.showEndScreen();
            return;
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

    // In the spawnNote method
    spawnNote(lane, hitTime, noteInfo = null) {
        const spawnY = this.calculateSpawnY(hitTime);

        // Get the note info from lane
        const isHold = noteInfo ? noteInfo.isHold : false;
        const endTime = noteInfo ? noteInfo.endTime : null;

        const note = {
            position: {
                x: lane.x,
                y: spawnY
            },
            targetTime: hitTime,
            spawnTime: performance.now(),
            isHold: isHold
        };

        // If it's a hold note, add endTime property
        if (isHold && endTime) {
            note.endTime = endTime;
            console.log('Spawning hold note:', {
                lane: lane.key,
                targetTime: hitTime,
                endTime: endTime,
                duration: (endTime - hitTime) + 's'
            });
        }

        console.log(`Spawning note# ${this.noteCount} for hit time ${hitTime}ms:`, {
            isHold: isHold,
            spawnY,
            speed: this.noteSpeed,
            timeToHit: hitTime * 1000 - (performance.now() - this.startTime)
        });

        lane.notes.push(note);
    }

    // Add end screen display method
    async showEndScreen() {
        if (this.showingEndScreen) return;

        this.showingEndScreen = true;

        // *** IMPORTANT: Remove the gameplay key listeners when showing end screen ***
        if (this.keydownListener) {
            document.removeEventListener('keydown', this.keydownListener);
            this.keydownListener = null;
        }
        if (this.keyupListener) {
            document.removeEventListener('keyup', this.keyupListener);
            this.keyupListener = null;
        }

        // Clear any pressed keys that might be stuck
        this.pressedKeys.clear();

        // Calculate final stats
        this.stats.totalNotes = this.noteCount;
        const accuracy = (this.stats.perfectCount / this.stats.totalNotes) * 100;
        this.stats.accuracy = accuracy.toFixed(2);
        this.stats.isFullCombo = this.stats.maxCombo === this.stats.totalNotes;

        // Save record to database if playerData is available
        if (this.playerData && this.songId) {  // Check for songId instead of songData
            try {
                await this.playerData.saveSongRecord(this.songId, {
                    score: this.score,
                    maxCombo: this.stats.maxCombo,
                    accuracy: this.stats.accuracy,
                    perfectCount: this.stats.perfectCount,
                    goodCount: this.stats.goodCount,
                    badCount: this.stats.badCount,
                    missCount: this.stats.missCount,
                    isFullCombo: this.stats.isFullCombo
                });
            } catch (error) {
                console.error('Error saving song record:', error);
            }
        }

        // Create stats object for end screen
        const endScreenStats = {
            score: this.score,
            maxCombo: this.stats.maxCombo,
            accuracy: this.stats.accuracy,
            perfectCount: this.stats.perfectCount,
            goodCount: this.stats.goodCount,
            badCount: this.stats.badCount,
            missCount: this.stats.missCount,
            isFullCombo: this.stats.isFullCombo
        };

        // Set up a dedicated end screen input handler
        this.setupEndScreenControls();

        // Show the end screen with stats
        this.endScreenUI.show(endScreenStats);
    }

    setupEndScreenControls() {
        // Remove any existing listener first (safety check)
        if (this.endScreenKeyListener) {
            document.removeEventListener('keydown', this.endScreenKeyListener);
        }

        // Create a dedicated listener for the end screen
        this.endScreenKeyListener = (event) => {
            if (event.key === 'Enter') {
                console.log('Enter key pressed on end screen, returning to song select');

                // Handle end screen input through the EndScreenUI
                if (this.endScreenUI.handleInput(event)) {
                    // Clean up the end screen listener
                    document.removeEventListener('keydown', this.endScreenKeyListener);
                    this.endScreenKeyListener = null;

                    // Call the song select callback
                    if (this.onSongSelect) {
                        this.onSongSelect();
                    } else {
                        this.handleRestart();
                    }
                }
            }
        };

        // Add the end screen listener
        document.addEventListener('keydown', this.endScreenKeyListener);
        console.log('End screen controls set up');
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
        // Also update miss sound volume
        // if (this.missSound) {
        //     this.missSound.volume = this.hitSoundVolume;
        // }
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

    // set miss volume
    setMissSoundVolume(volume) {
        this.missSoundVolume = Math.max(0, Math.min(1, volume));
        console.log('Miss sound volume set to:', this.missSoundVolume);
    }

    // Add this method to play the miss sound
    playMissSound() {
        // Get volume from global state
        let soundVolume = 0.8; // Default fallback

        if (window.volumeState && typeof window.volumeState.missSoundVolume === 'number') {
            soundVolume = window.volumeState.missSoundVolume;
        }

        // If volume is 0 or very low, don't play sound
        if (soundVolume <= 0.01) {
            return;
        }

        // Create a new Audio instance to allow overlapping sounds
        const sound = new Audio('./effects/miss.mp3');
        sound.volume = soundVolume;
        sound.play().catch(error => console.error('Error playing miss sound:', error));
    }

    async handleRestart() {
        // Stop current game loop and music
        this.isRunning = false;
        this.music.pause();
        this.music.currentTime = 0;

        // Remove all event listeners
        if (this.keydownListener) {
            document.removeEventListener('keydown', this.keydownListener);
            this.keydownListener = null;
        }
        if (this.keyupListener) {
            document.removeEventListener('keyup', this.keyupListener);
            this.keyupListener = null;
        }
        if (this.endScreenKeyListener) {
            document.removeEventListener('keydown', this.endScreenKeyListener);
            this.endScreenKeyListener = null;
        }

        // Cancel animation frame
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // Clear all timeouts
        this.noteSpawnTimers.forEach(timer => clearTimeout(timer));
        this.noteSpawnTimers = [];

        // Wait for any pending note spawn promises to resolve
        await Promise.all(this.noteSpawnPromises);
        this.noteSpawnPromises = [];

        // Clear game state
        this.score = 0;
        this.currentCombo = 0;
        this.gameTimer = 0;
        this.gameStarted = false;
        this.showingEndScreen = false;
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

        // Initialize song length and timer
        this.music.addEventListener('loadedmetadata', () => {
            this.songLength = this.music.duration;
            this.timeRemaining = this.songLength;
            console.log(`Song loaded, duration: ${this.songLength}s`);

            // Initialize timing lines now that we know the song length
            this.initializeTimingLines();
        });

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