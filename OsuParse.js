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

    parseHitObject(line) {
        const [x, y, time, type] = line.split(',');
        return {
            x: parseInt(x),
            y: parseInt(y),
            time: parseInt(time),
            type: parseInt(type)
        };
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

                lanes[laneIndex].notes.push({
                    delay: spawnTimeMs / 1000, // Convert to seconds for setTimeout
                    hitTime: hitTimeMs / 1000,  // Convert to seconds for game logic
                    speed: scrollSpeed,
                    debugInfo: {
                        originalTime: hitTimeMs,
                        spawnOffset: travelTimeMs
                    }
                });
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