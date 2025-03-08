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

        // Add live accuracy tracking
        this.liveAccuracy = 0.00;

        // Add FPS tracking (in game)
        this.fpsUpdateInterval = 500; // Update FPS display every 500ms
        this.lastFpsUpdate = 0;
        this.frameCount = 0;
        this.currentFps = 0;
        this.showFps = false; // Default to not showing FPS


        // FPS control
        this.targetFPS = 60;
        this.frameInterval = 1000 / this.targetFPS; // Time between frames in ms
        this.lastFrameTime = 0;
        this.frameDeltas = [];
        this.currentFPS = 60;
        this.accumulator = 0;

        // Auto-play and debug configuration
        this.debugMode = false;
        this.autoPlay = false;
        this.devModeEnabled = false; // New developer mode flag
        this.gameStarted = false;  // Track if game has started

        // Add a secret key sequence for toggling developer mode
        this.devModeSequence = ['`','y', 'u', 'f', 'i'];
        this.currentSequenceIndex = 0;
        this.setupDevModeToggle();

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
        this.keyBindings = {
            lane1: 's',
            lane2: 'd',
            lane3: 'k',
            lane4: 'l'
        };
        this.noteSpawnTimers = [];
        this.noteCount = 0;
        this.gameTimer = 0;

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
        this.hitTextAnimations = new Map(); // Track animation properties for each hit text

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

        // Initialize lanes with custom key bindings
        const laneKeys = [this.keyBindings.lane1, this.keyBindings.lane2, this.keyBindings.lane3, this.keyBindings.lane4];

        // Initialize lanes and spawn notes
        this.songData.sheet.forEach((laneData, index) => {
            const lane = {
                x: offsetX + (index * this.laneWidth),
                y: 0,
                key: laneKeys[index],
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

        this.canvas.style.cursor = 'default';
        this.hitTextAnimations.clear();
        // Cleanup old notes
        this.lanes.forEach(lane => {
            // Remove notes that are way past the hit zone
            lane.notes = lane.notes.filter(note => {
                const noteTime = note.targetTime * 1000;
                const currentGameTime = currentTime - this.startTime;
                return currentGameTime - noteTime < 2000; // Keep notes within 2 seconds of current time
            });
        });

        // Ensure hit text timers are properly cleared
        this.hitTextTimers.forEach((timer, key) => {
            clearTimeout(timer);
            this.hitTextTimers.delete(key);

            // Also clear the hit text for this lane
            const lane = this.lanes.find(l => l.key === key);
            if (lane) {
                lane.hitText = '';
                lane.hitTextColor = '';
            }
        });

        // Clear auto-play hit positions if it's getting too large
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
            devMode: this.devModeEnabled,
            gameStarted: this.gameStarted
        });

        // Redraw the start menu to show updated status
        this.drawStartMenu();
    }

    // toggle FPS display
    toggleFpsDisplay() {
        this.showFps = !this.showFps;
        console.log(`FPS display ${this.showFps ? 'enabled' : 'disabled'}`);
        return this.showFps;
    }

    handleNoteHit(lane) {
        if (!lane.notes.length) return;

        const currentTime = (performance.now() - this.startTime) / 1000;
        let closestNote = null;
        let closestTimeDiff = Infinity;
        let closestIndex = -1;

        // Find closest note logic...
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
            let pointsAwarded = 0;

            if (timeDiffMs <= this.timingWindows.perfect) {
                this.showHitText(lane, 'PERFECT', '#00ff00');
                pointsAwarded = 300;
                this.currentCombo++;
                this.stats.perfectCount++;
            } else if (timeDiffMs <= this.timingWindows.good) {
                this.showHitText(lane, 'GOOD', '#ffff00');
                pointsAwarded = 150;
                this.currentCombo++;
                this.stats.goodCount++;
            } else {
                this.showHitText(lane, 'BAD', '#ff6666');
                pointsAwarded = 50;
                this.currentCombo++;
                this.stats.badCount++;
            }

            // Update the score
            this.score += pointsAwarded;

            // Update live accuracy
            const totalNotes = this.stats.perfectCount + this.stats.goodCount + this.stats.badCount + this.stats.missCount;
            const totalPoints = this.stats.perfectCount * 300 + this.stats.goodCount * 150 + this.stats.badCount * 50;
            const maxPossiblePoints = totalNotes * 300;

            if (maxPossiblePoints > 0) {
                this.liveAccuracy = (totalPoints / maxPossiblePoints) * 100;
            } else {
                this.liveAccuracy = 100.00;
            }

            // Update max combo
            this.stats.maxCombo = Math.max(this.stats.maxCombo, this.currentCombo);

            // Remove the hit note
            lane.notes.splice(closestIndex, 1);
        }
    }

    // Modified showHitText to handle misses
    showHitText(lane, text, color) {
        // Set the hit text and color
        lane.hitText = text;
        lane.hitTextColor = color;

        // Clear any existing timer for this lane
        if (this.hitTextTimers.has(lane.key)) {
            clearTimeout(this.hitTextTimers.get(lane.key));
            this.hitTextTimers.delete(lane.key);
        }

        // Initialize animation properties
        this.hitTextAnimations.set(lane.key, {
            startTime: performance.now(),
            opacity: 1.0,
            scale: 1.0,
            offsetY: 0  // We'll move the text up slightly during animation
        });

        // Create a timer to clear the text after the duration
        const timer = setTimeout(() => {
            // Clear the text
            lane.hitText = '';
            lane.hitTextColor = '';
            // Remove animation data
            this.hitTextAnimations.delete(lane.key);
            // Remove the timer
            this.hitTextTimers.delete(lane.key);
        }, this.hitTextDuration);

        // Store the timer reference
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

        // Draw accuracy in the top right corner
        this.ctx.textAlign = 'right';
        this.ctx.font = '24px nunito';

        // Choose color based on accuracy with pastel colors
        if (this.liveAccuracy >= 95) {
            this.ctx.fillStyle = '#90EE90'; // Pastel green for excellent accuracy
        } else if (this.liveAccuracy >= 85) {
            this.ctx.fillStyle = '#FFD700'; // Soft gold for good accuracy
        } else if (this.liveAccuracy >= 70) {
            this.ctx.fillStyle = '#FFB6C1'; // Light pink for okay accuracy
        } else {
            this.ctx.fillStyle = '#FF9B9B'; // Pastel coral/red for poor accuracy
        }

        // Format accuracy to 2 decimal places
        const formattedAccuracy = this.liveAccuracy.toFixed(2);
        this.ctx.fillText(`${formattedAccuracy}%`, this.canvas.width - 20, 60);

        this.drawTimer();

        // Draw FPS counter if enabled
        if (this.showFps) {
            // Update counter every fpsUpdateInterval ms
            const currentTime = performance.now();
            this.frameCount++;

            if (currentTime - this.lastFpsUpdate >= this.fpsUpdateInterval) {
                // Calculate FPS
                this.currentFps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFpsUpdate));
                this.frameCount = 0;
                this.lastFpsUpdate = currentTime;
            }

            // Display FPS
            this.ctx.font = '16px nunito';
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            this.ctx.fillText(`${this.currentFps} FPS`, this.canvas.width - 80, 90);
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
        this.ctx.font = 'bold 24px nunito';

        const currentTime = performance.now();

        this.lanes.forEach(lane => {
            if (lane.hitText) {
                const centerX = lane.x + (this.laneWidth / 2);
                const baseY = this.hitZoneY - 150;

                // Get animation properties
                let animation = this.hitTextAnimations.get(lane.key);
                if (!animation) {
                    // If no animation data (shouldn't happen), create default
                    animation = {
                        startTime: currentTime,
                        opacity: 1.0,
                        scale: 1.0,
                        offsetY: 0
                    };
                }

                // Calculate progress (0.0 to 1.0)
                const elapsed = currentTime - animation.startTime;
                const progress = Math.min(1.0, elapsed / this.hitTextDuration);

                // Update animation properties based on progress
                animation.opacity = 1.0 - progress * 0.7; // Fade to 0.3 opacity
                animation.scale = 1.0 - progress * 0.2;   // Shrink to 0.8 scale
                animation.offsetY = -progress * 20;       // Move up by 20 pixels

                // Apply animation
                this.ctx.save();

                // Position at center of lane with offset
                this.ctx.translate(centerX, baseY + animation.offsetY);
                this.ctx.scale(animation.scale, animation.scale);

                // Set opacity
                this.ctx.globalAlpha = animation.opacity;

                // Draw the hit judgment text
                switch (lane.hitText) {
                    case 'PERFECT':
                        this.ctx.fillStyle = '#00ff00'; // Bright green
                        break;
                    case 'GOOD':
                        this.ctx.fillStyle = '#ffff00'; // Yellow
                        break;
                    case 'BAD':
                        this.ctx.fillStyle = '#ff6666'; // Light red
                        break;
                    case 'MISS':
                        this.ctx.fillStyle = '#ff0000'; // Red
                        break;
                    default:
                        this.ctx.fillStyle = lane.hitTextColor || 'white';
                }

                // Draw with subtle glow effect
                this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                this.ctx.shadowBlur = 4;
                this.ctx.shadowOffsetX = 2;
                this.ctx.shadowOffsetY = 2;

                this.ctx.fillText(lane.hitText, 0, 0);

                // Reset shadow
                this.ctx.shadowBlur = 0;
                this.ctx.shadowOffsetX = 0;
                this.ctx.shadowOffsetY = 0;

                // Restore context (resets transformations and alpha)
                this.ctx.restore();
            }
        });

        this.ctx.textAlign = 'left'; // Reset text align
        this.ctx.globalAlpha = 1.0;  // Reset alpha
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
        this.canvas.style.cursor = 'pointer';
        // Clear canvas with black background
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const startX = this.canvas.width / 2;
        const startY = this.canvas.height / 2;

        // Draw song title with larger font
        this.ctx.textAlign = 'center';
        this.ctx.font = 'bold 48px nunito';
        this.ctx.fillStyle = 'white';

        // Show song title if available
        if (this.songData && this.songData.title) {
            this.ctx.fillText(this.songData.title, startX, startY - 80);
        }

        // Draw start button with subtle glow effect
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.beginPath();
        this.ctx.roundRect(startX - 150, startY - 40, 300, 80, 10);
        this.ctx.fill();

        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.roundRect(startX - 150, startY - 40, 300, 80, 10);
        this.ctx.stroke();

        // Draw "START" text
        this.ctx.font = 'bold 40px nunito';
        this.ctx.fillStyle = 'white';
        this.ctx.fillText('START', startX, startY + 15);

        // Show auto-play status if enabled
        if (this.autoPlay) {
            // Draw auto-play indicator
            this.ctx.font = '24px nunito';
            this.ctx.fillStyle = '#ff9b9b'; // Soft red/pink
            this.ctx.fillText('Auto-Play Mode Enabled', startX, startY + 70);
            this.ctx.font = '16px nunito';
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            this.ctx.fillText('Scores in this mode will not be saved', startX, startY + 100);
        }

        // Draw F2 tip at the bottom
        this.ctx.font = '16px nunito';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.fillText('Press F2 to toggle Auto-Play', startX, startY + 160);
        this.ctx.fillText('Press SPACE or Click to start', startX, startY + 190);

        // Draw developer mode indicator if active
        if (this.debugMode && this.devModeEnabled) {
            this.ctx.font = '14px nunito';
            this.ctx.fillStyle = 'rgba(0, 255, 0, 0.5)'; // Green for dev mode
            this.ctx.fillText('Developer Mode: Scores will be saved', startX, this.canvas.height - 20);
        }
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

                // Only count as miss if the note is well past the hit window
                if (currentTime > note.targetTime && timeDiff > this.timingWindows.bad) {
                    this.showHitText(lane, 'MISS', '#ff0000');
                    this.currentCombo = 0; // Only reset combo on complete misses
                    this.stats.missCount++;
                    lane.notes.splice(i, 1);
                    this.playMissSound();

                    // Update accuracy calculation for misses - make sure this runs
                    // Note that misses contribute 0 points to the score
                    const totalNotes = this.stats.perfectCount + this.stats.goodCount + this.stats.badCount + this.stats.missCount;
                    const totalPoints = this.stats.perfectCount * 300 + this.stats.goodCount * 150 + this.stats.badCount * 50;
                    const maxPossiblePoints = totalNotes * 300;

                    if (maxPossiblePoints > 0) {
                        this.liveAccuracy = (totalPoints / maxPossiblePoints) * 100;
                    }

                    console.log('Note missed:', {
                        targetTime: note.targetTime,
                        currentTime: currentTime,
                        timeDiff: timeDiff,
                        lane: lane.key,
                        accuracy: this.liveAccuracy.toFixed(2)
                    });
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

    updateKeyBindings(newBindings) {
        console.log('Updating key bindings to:', newBindings);
        this.keyBindings = { ...newBindings };

        // Update existing lanes if they exist
        if (this.lanes && this.lanes.length === 4) {
            this.lanes[0].key = this.keyBindings.lane1;
            this.lanes[1].key = this.keyBindings.lane2;
            this.lanes[2].key = this.keyBindings.lane3;
            this.lanes[3].key = this.keyBindings.lane4;

            console.log('Updated lane keys:', this.lanes.map(lane => lane.key));
        }

        // Update hit sounds map with new keys
        if (this.hitSounds) {
            // Clear existing hit sounds
            this.hitSounds.clear();

            // Create new hit sounds for each key
            const laneKeys = [this.keyBindings.lane1, this.keyBindings.lane2, this.keyBindings.lane3, this.keyBindings.lane4];
            laneKeys.forEach(key => {
                const audio = new Audio('./effects/hitsound.wav');
                audio.volume = this.hitSoundVolume;
                this.hitSounds.set(key, audio);
            });
        }
    }

    // updates accuracy in game
    updateLiveAccuracy() {
        const totalNotes = this.stats.perfectCount + this.stats.goodCount + this.stats.badCount + this.stats.missCount;
        const totalPoints = this.stats.perfectCount * 300 + this.stats.goodCount * 150 + this.stats.badCount * 50;
        const maxPossiblePoints = totalNotes * 300;

        if (maxPossiblePoints > 0) {
            this.liveAccuracy = (totalPoints / maxPossiblePoints) * 100;
        } else {
            this.liveAccuracy = 0.00; // Start at 0 when no notes have been judged yet
        }

        console.log('Accuracy updated:', {
            perfect: this.stats.perfectCount,
            good: this.stats.goodCount,
            bad: this.stats.badCount,
            miss: this.stats.missCount,
            accuracy: this.liveAccuracy.toFixed(2)
        });
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

    // Add end screen display method
    async showEndScreen() {
        if (this.showingEndScreen) return;

        this.showingEndScreen = true;

        // Make sure to clear all hit text
        this.lanes.forEach(lane => {
            lane.hitText = '';
            lane.hitTextColor = '';
        });

        // Clear all hit text timers
        this.hitTextTimers.forEach((timer, key) => {
            clearTimeout(timer);
        });
        this.hitTextTimers.clear();

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

        // Only save record if not in auto-play mode or if dev mode is enabled
        if (this.playerData && this.songId && (!this.autoPlay || (this.autoPlay && this.devModeEnabled))) {
            try {
                await this.playerData.saveSongRecord(this.songId, {
                    score: this.score,
                    maxCombo: this.stats.maxCombo,
                    accuracy: this.stats.accuracy,
                    perfectCount: this.stats.perfectCount,
                    goodCount: this.stats.goodCount,
                    badCount: this.stats.badCount,
                    missCount: this.stats.missCount,
                    isFullCombo: this.stats.isFullCombo,
                    autoPlayUsed: this.autoPlay // Add flag to indicate if auto-play was used
                });
                console.log('Song record saved. Auto-play:', this.autoPlay, 'Dev mode:', this.devModeEnabled);
            } catch (error) {
                console.error('Error saving song record:', error);
            }
        } else if (this.autoPlay && !this.devModeEnabled) {
            console.log('Auto-play mode active and dev mode disabled - score not saved');
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
            isFullCombo: this.stats.isFullCombo,
            autoPlayUsed: this.autoPlay // Add flag to indicate if auto-play was used
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

        // Remove any existing click listener
        if (this.endScreenClickListener) {
            this.canvas.removeEventListener('click', this.endScreenClickListener);
        }

        // Make cursor pointer on end screen to indicate clickable
        this.canvas.style.cursor = 'pointer';

        // Create a dedicated listener for the end screen keyboard input
        this.endScreenKeyListener = (event) => {
            if (event.key === 'Enter') {
                console.log('Enter key pressed on end screen, returning to song select');
                this.handleEndScreenExit();
            }
        };

        // Create a dedicated click listener for the end screen
        this.endScreenClickListener = () => {
            console.log('Click detected on end screen, returning to song select');
            this.handleEndScreenExit();
        };

        // Add the listeners
        document.addEventListener('keydown', this.endScreenKeyListener);
        this.canvas.addEventListener('click', this.endScreenClickListener);

        console.log('End screen controls set up');
    }

    // helper method to handle end screen exit logic
    handleEndScreenExit() {
        // Clean up the end screen listeners
        if (this.endScreenKeyListener) {
            document.removeEventListener('keydown', this.endScreenKeyListener);
            this.endScreenKeyListener = null;
        }

        if (this.endScreenClickListener) {
            this.canvas.removeEventListener('click', this.endScreenClickListener);
            this.endScreenClickListener = null;
        }

        // Handle the EndScreenUI input event
        if (this.endScreenUI && this.endScreenUI.handleInput({ key: 'Enter' })) {
            // Call the song select callback
            if (this.onSongSelect) {
                this.onSongSelect();
            } else {
                this.handleRestart();
            }
        }
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

        // Remove dev mode listener if it exists
        if (this.devModeListener) {
            document.removeEventListener('keypress', this.devModeListener);
        }

        // Cancel animation frame
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // Reset cursor to default
        this.canvas.style.cursor = 'default';

        // Clear all timeouts
        this.noteSpawnTimers.forEach(timer => clearTimeout(timer));
        this.noteSpawnTimers = [];

        // Clear hit text timers
        this.hitTextTimers.forEach(timer => clearTimeout(timer));
        this.hitTextTimers.clear();
        this.hitTextAnimations.clear();

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

    setupDevModeToggle() {
        // Create a non-game related keypress listener for dev mode
        const devModeListener = (e) => {
            // Only check before game starts and not during gameplay
            if (this.gameStarted) return;

            const key = e.key.toLowerCase();

            // Check if the pressed key matches the next key in the sequence
            if (key === this.devModeSequence[this.currentSequenceIndex]) {
                this.currentSequenceIndex++;

                // If the full sequence is entered
                if (this.currentSequenceIndex === this.devModeSequence.length) {
                    // Toggle dev mode
                    this.devModeEnabled = !this.devModeEnabled;
                    console.log('Developer mode ' + (this.devModeEnabled ? 'enabled' : 'disabled'));

                    // Reset sequence index
                    this.currentSequenceIndex = 0;

                    // Redraw start menu to show dev mode status
                    if (!this.gameStarted) {
                        this.drawStartMenu();
                    }
                }
            } else {
                // Reset sequence if wrong key pressed
                this.currentSequenceIndex = 0;
            }
        };

        // Add the listener with a separate reference so it doesn't interfere with gameplay
        document.addEventListener('keypress', devModeListener);

        // Store reference for cleanup
        this.devModeListener = devModeListener;
    }

    startGame() {
        if (!this.songData) {
            console.error('No song data available');
            return;
        }

        this.gameStarted = true;

        // Set cursor to default during gameplay
        this.canvas.style.cursor = 'default';

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
    if (window.settingsUI) {
        const keyBindings = window.settingsUI.getKeyBindings();
        window.gameManager.updateKeyBindings(keyBindings);
    }
};