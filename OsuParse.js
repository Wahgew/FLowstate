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
        const lanes = Array(4).fill(null).map(() => ({ notes: [] }));

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

        return {
            songPath: `songs/${osuData.general.AudioFilename}`,
            bpm: bpm,
            msPerBeat: msPerBeat,
            scrollSpeed: scrollSpeed,
            spawnOffset: spawnY,
            hitLineY: hitLineY,
            sheet: lanes
        };
    }

}

function loadOsuFile(fileContent) {
    const parser = new OsuParser();
    return parser.parseOsuFile(fileContent);
}