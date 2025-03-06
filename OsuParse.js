class OsuParser {
    constructor() {
        this.bpm = 0;
        this.hitObjects = [];
    }

    parseOsuFile(content) {
        const lines = content.split('\n');
        let currentSection = '';

        const songData = {
            general: {
                AudioFilename: undefined,
            },
            timingPoints: [],
            hitObjects: []
        };

        for (let line of lines) {
            line = line.trim();

            // Skip empty lines and comments
            if (!line || line.startsWith('//')) continue;

            // Check for section headers
            if (line.startsWith('[') && line.endsWith(']')) {
                currentSection = line.slice(1, -1);
                continue;
            }

            switch (currentSection) {
                case 'General':
                    this.parseGeneral(line, songData.general);
                    break;
                case 'TimingPoints':
                    if (line.includes(',')) {
                        songData.timingPoints.push(this.parseTimingPoint(line));
                    }
                    break;
                case 'HitObjects':
                    if (line.includes(',')) {
                        songData.hitObjects.push(this.parseHitObject(line));
                    }
                    break;
            }
        }

        return this.convertToGameFormat(songData);
    }

    parseGeneral(line, general) {
        const [key, value] = line.split(':');
        if (key && value) {
            general[key.trim()] = value.trim();
        }
    }

    parseTimingPoint(line) {
        const [time, beatLength, meter, sampleSet, sampleIndex, volume, uninherited, effects] = line.split(',');
        return {
            time: parseFloat(time),
            beatLength: parseFloat(beatLength),
            meter: parseInt(meter),
            uninherited: parseInt(uninherited),
            // Calculate BPM from beat length (ms per beat)
            bpm: uninherited === '1' ? 60000 / parseFloat(beatLength) : null
        };
    }

    // In parseHitObject method in OsuParser.js
    parseHitObject(line) {
        const parts = line.split(',');
        const [x, y, time] = parts.map(part => parseInt(part));
        const type = parseInt(parts[3]);

        console.log('Parsing hit object:', {
            x, y, time, type,
            line: line,
            isHold: (type === 128)
        });

        // Check if it's a hold note (type 128)
        if (type === 128) {
            // Extract end time from the format: endTime:hitSample
            const endTimeInfo = parts[5].split(':');
            const endTime = parseInt(endTimeInfo[0]);

            console.log('Found hold note:', {
                time: time,
                endTime: endTime,
                duration: (endTime - time) / 1000 + 's'
            });

            return {
                x: x,
                y: y,
                time: time,
                type: type,
                endTime: endTime,
                isHold: true
            };
        } else {
            return {
                x: x,
                y: y,
                time: time,
                type: type
            };
        }
    }

    convertToGameFormat(osuData) {
        // Get base timing point
        const baseTimingPoint = osuData.timingPoints.find(tp => tp.uninherited === 1);
        const msPerBeat = baseTimingPoint ? baseTimingPoint.beatLength : 666.666667;
        const bpm = 60000 / msPerBeat;

        // Calculate game-specific timing parameters
        const scrollSpeed = 10; // Match your original speed
        const hitLineY = 900;
        const spawnY = -100;
        const distanceToTravel = hitLineY - spawnY;

        // Calculate how many milliseconds it takes for a note to reach the hit line
        // at our given scroll speed (12 pixels per frame at 60fps)
        const travelTimeMs = (distanceToTravel / (scrollSpeed * 60)) * 1000;

        // Initialize 4 lanes
        const lanes = Array(4).fill(null).map(() => ({notes: []}));

        // Process hit objects
        for (const hitObject of osuData.hitObjects) {
            const laneIndex = Math.min(3, Math.floor((hitObject.x / 512) * 4));

            if (laneIndex >= 0 && laneIndex < 4) {
                // Calculate spawn time by subtracting travel time from hit time
                const hitTimeMs = hitObject.time;
                const spawnTimeMs = Math.max(0, hitTimeMs - travelTimeMs);

                // Check if it's a hold note
                if (hitObject.isHold) {
                    console.log('Adding hold note to lane', laneIndex, {
                        hitTime: hitTimeMs / 1000,
                        endTime: hitObject.endTime / 1000,
                        duration: (hitObject.endTime - hitObject.time) / 1000 + 's'
                    });

                    lanes[laneIndex].notes.push({
                        delay: spawnTimeMs / 1000,
                        hitTime: hitTimeMs / 1000,
                        isHold: true,
                        endTime: hitObject.endTime / 1000,
                        holdDuration: (hitObject.endTime - hitObject.time) / 1000,
                        speed: scrollSpeed,
                        debugInfo: {
                            originalTime: hitTimeMs,
                            endTime: hitObject.endTime,
                            spawnOffset: travelTimeMs
                        }
                    });
                } else {
                    // Regular note
                    lanes[laneIndex].notes.push({
                        delay: spawnTimeMs / 1000,
                        hitTime: hitTimeMs / 1000,
                        speed: scrollSpeed,
                        debugInfo: {
                            originalTime: hitTimeMs,
                            spawnOffset: travelTimeMs
                        }
                    });
                }
            }
        }

        const result = {
            songPath: `songs/${osuData.general.AudioFilename}`,
            bpm: bpm,
            msPerBeat: msPerBeat,
            scrollSpeed: scrollSpeed,
            spawnOffset: spawnY,
            hitLineY: hitLineY,
            sheet: lanes
        };

        result.difficulty = this.estimateDifficulty(result);
        console.log('Lane stats after conversion:');
        lanes.forEach((lane, index) => {
            const holdNotes = lane.notes.filter(note => note.isHold).length;
            const regularNotes = lane.notes.length - holdNotes;
            console.log(`Lane ${index}: ${lane.notes.length} total notes (${regularNotes} regular, ${holdNotes} hold)`);
        });
        return result;
    }

    estimateDifficulty(songData) {
        // Calculate note density (notes per second)
        let totalNotes = 0;
        let totalDuration = 0;

        songData.sheet.forEach(lane => {
            totalNotes += lane.notes.length;

            if (lane.notes.length > 0) {
                const lastNoteTime = Math.max(...lane.notes.map(note => note.hitTime));
                totalDuration = Math.max(totalDuration, lastNoteTime);
            }
        });

        // Avoid division by zero
        if (totalDuration <= 0) return 1.0;

        const notesPerSecond = totalNotes / totalDuration;

        // Check for stream patterns (close consecutive notes in the same lane)
        let streamCount = 0;
        songData.sheet.forEach(lane => {
            if (lane.notes.length < 2) return;

            const notes = lane.notes.sort((a, b) => a.hitTime - b.hitTime);

            for (let i = 1; i < notes.length; i++) {
                const timeBetweenNotes = notes[i].hitTime - notes[i-1].hitTime;
                if (timeBetweenNotes < 0.25) { // Less than 250ms between notes
                    streamCount++;
                }
            }
        });

        // Calculate technical difficulty based on multi-lane patterns
        let jumpCount = 0;

        // Create a chronological list of all notes with their lane info
        const allNotes = [];
        songData.sheet.forEach((lane, laneIndex) => {
            lane.notes.forEach(note => {
                allNotes.push({
                    laneIndex,
                    hitTime: note.hitTime
                });
            });
        });

        // Sort by time
        allNotes.sort((a, b) => a.hitTime - b.hitTime);

        // Check for lane jumps (harder patterns)
        for (let i = 1; i < allNotes.length; i++) {
            const laneDistance = Math.abs(allNotes[i].laneIndex - allNotes[i-1].laneIndex);
            const timeDistance = allNotes[i].hitTime - allNotes[i-1].hitTime;

            if (laneDistance >= 2 && timeDistance < 0.3) {
                jumpCount++;
            }
        }

        // Calculate difficulty factors based on your game's mechanics
        const noteDensityFactor = Math.min(2.5, notesPerSecond * 0.6); // How many notes per second
        const streamFactor = Math.min(1.5, streamCount / Math.max(10, totalNotes) * 4); // How many stream patterns
        const jumpFactor = Math.min(1.5, jumpCount / Math.max(1, allNotes.length) * 5); // How many jumps between lanes

        // Base difficulty scale from 1.0 to 4.5 (matching typical osu! scale)
        let difficulty = 1.0 + noteDensityFactor + streamFactor + jumpFactor;

        // Cap difficulty at 4.5
        difficulty = Math.min(4.5, difficulty);

        // Round to one decimal
        return Math.round(difficulty * 10) / 10;
    }
}

function loadOsuFile(fileContent) {
    const parser = new OsuParser();
    return parser.parseOsuFile(fileContent);
}