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

        // FPS control
        this.targetFPS = 60;
        this.frameTime = 1000 / this.targetFPS;
        this.lastFrameTime = 0;
        // Frame counting for debug output throttling
        this.frameCount = 0;

        this.gameTimer = 0;

        // Convert AR to actual timing
        this.approachRate = 4; // Configurable AR
        this.approachDuration = 1200 - (150 * this.approachRate); // Time note is visible in ms

        // Calculate fall distance and speed
        this.spawnY = -100; // Starting Y position
        this.hitZoneY = 900; // optimal position for hit zones (based on 10ms allowance)
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
        this.visualHitZoneY = 805;  // Position for visual feedback only

        this.score = 0;
        this.isRunning = false;

        this.hitTextDuration = 500;
        this.hitTextTimers = new Map();

        // Timing windows for hit detection (in milliseconds)
        this.timingWindows = {
            perfect: 30,    // ±20ms for PERFECT
            good: 60,      // ±120ms for GOOD
            bad: 100,       // ±300ms for BAD
            miss: 600       // ±600ms for MISS
        };

        // spawn time distance
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

        console.log('Hit zone configuration:', {
            mechanicsHitZone: this.hitZoneY,
            visualHitZone: this.visualHitZoneY,
            distanceToTravel: this.distanceToHitLine,
            approachDuration: this.approachDuration,
            noteSpeed: this.noteSpeed,
        });

        this.drawStartMenu();
        this.addEventListeners();
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

    addEventListeners() {
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

        const pressedKeys = new Set();

        // Single event listener for all keyboard events
        document.addEventListener('keydown', (event) => {
            // Handle F2 for debug mode toggle
            if (event.key === 'F2') {
                if (!this.gameStarted) {
                    this.toggleDebugMode();
                    console.log('Debug mode toggled:', {
                        debugMode: this.debugMode,
                        autoPlay: this.autoPlay,
                        gameStarted: this.gameStarted
                    });
                }
                return;
            }

            // Only process gameplay keys if not in auto-play
            if (!this.autoPlay) {
                if (!pressedKeys.has(event.key)) {
                    const pressedLane = this.lanes.find(lane => lane.key === event.key);
                    if (pressedLane) {
                        this.handleNoteHit(pressedLane);
                        pressedKeys.add(event.key);
                    }
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

    // Modified hit detection to use timing instead of pixels
    handleNoteHit(lane) {
        if (!lane.notes.length) return;

        // Get current time relative to when the song started
        const currentTime = (performance.now() - this.startTime) / 1000; // Convert to seconds

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

        // Check if the note is within any timing window
        if (closestNote && timeDiffMs <= this.timingWindows.bad) {
            if (timeDiffMs <= this.timingWindows.perfect) {
                this.showHitText(lane, 'PERFECT', '#00ff00');
                this.score += 300;
                console.log('Hit result: PERFECT');
            } else if (timeDiffMs <= this.timingWindows.good) {
                this.showHitText(lane, 'GOOD', '#ffff00');
                this.score += 150;
                console.log('Hit result: GOOD');
            } else {
                this.showHitText(lane, 'BAD', '#ff6666');
                this.score += 50;
                console.log('Hit result: BAD');
            }

            // Remove the hit note
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
                    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
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

    drawGameplayHitZones() {
        // Draw hit zone circles in each lane at visual position
        this.lanes.forEach(lane => {
            const centerX = lane.x + (this.laneWidth / 2);

            // Draw outer circle (hit zone)
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(centerX, this.visualHitZoneY, this.noteRadius, 0, Math.PI * 2);
            this.ctx.stroke();

            // Add subtle fill for better visibility
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            this.ctx.fill();
        });

        this.ctx.lineWidth = 2;
    }

    draw() {
        // Clear the canvas
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw game elements
        this.drawLaneSeparators();
        this.drawGameplayHitZones();

        // debug only hit zones
        if (this.debugMode) {
            this.drawHitZones(); // Debug visualization
        }

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

        // Draw key hints relative to visual hit zone
        this.ctx.font = '15px nunito';
        this.lanes.forEach(lane => {
            const centerX = lane.x + (this.laneWidth / 2);
            this.ctx.fillText(lane.key.toUpperCase(), centerX - 5, this.visualHitZoneY + 60);
        });
    }

    // Modified update method to check for misses based on timing
    // Auto-play hit detection in update method
    // update() {
    //     const currentTime = (performance.now() - this.startTime) / 1000;
    //     this.gameTimer = currentTime * 1000; // Convert to milliseconds
    //
    //     // Auto-play note hitting based on timing
    //     if (this.autoPlay) {
    //         console.log("AutoPlay is turned on")
    //         // Check upcoming notes
    //         while (this.autoPlayNextNoteIndex < this.allNoteTimings.length) {
    //             const nextNote = this.allNoteTimings[this.autoPlayNextNoteIndex];
    //             const timeDiff = Math.abs(this.gameTimer - nextNote.time);
    //
    //             console.log('Auto-play check:', {
    //                 gameTime: this.gameTimer.toFixed(1),
    //                 nextNoteTime: nextNote.time,
    //                 timeDiff: timeDiff.toFixed(3),
    //                 index: this.autoPlayNextNoteIndex
    //             });
    //
    //             // If we're within 2ms of the note time, hit it
    //             console.log("Note should auto hit + in if statement")
    //             if (timeDiff <= 15) {
    //                 const lane = this.lanes[nextNote.laneIndex];
    //                 if (lane && lane.notes.length > 0) {
    //                     this.handleNoteHit(lane);
    //                     console.log('Auto-play hit triggered:', {
    //                         time: this.gameTimer.toFixed(1),
    //                         noteTime: nextNote.time,
    //                         lane: nextNote.laneIndex
    //                     });
    //                 }
    //                 this.autoPlayNextNoteIndex++;
    //             } else if (this.gameTimer < nextNote.time) {
    //                 // Haven't reached the next note time yet
    //                 break;
    //             } else {
    //                 // Passed the note time
    //                 this.autoPlayNextNoteIndex++;
    //             }
    //         }
    //     }
    //
    //     // Regular note updates
    //     this.lanes.forEach(lane => {
    //         lane.notes.forEach(note => {
    //             note.position.y += this.noteSpeed;
    //         });
    //     });
    //
    //     this.frameCount++;
    //     this.lastFrameTime = performance.now();
    // }

    update() {
        const currentTime = (performance.now() - this.startTime) / 1000;
        this.gameTimer = currentTime * 1000;

        if (this.autoPlay) {
            this.handleAutoPlay();
            //console.log("We called auto play")
        }

        // Regular note updates
        this.lanes.forEach(lane => {
            lane.notes.forEach(note => {
                note.position.y += this.noteSpeed;
            });
        });

        this.frameCount++;
        this.lastFrameTime = performance.now();
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
        this.ctx.font = '30px nunito';
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'center';

        const startX = this.canvas.width / 2;
        const startY = this.canvas.height / 2;

        // Show auto-play status in start menu
        if (this.debugMode) {
            this.ctx.fillText('Auto-Play Mode', startX, startY - 40);
        }

        this.ctx.fillText('Start', startX, startY);

        // Add instructions
        this.ctx.font = '16px nunito';
        this.ctx.fillText('Press F2 to toggle Auto-Play before starting', startX, startY + 40);
        this.ctx.fillText('Press SPACE or Click to start', startX, startY + 70);
    }

    handleAutoPlay() {
        console.log("Auto-play called");
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

            // If we're within 10ms (0.010 seconds) of the target time
            if (timeDiff <= 0.010) { // 10ms error
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