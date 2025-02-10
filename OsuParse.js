class OsuParser {
    constructor() {
        this.bpm = 0;
        this.offset = 0;
        this.hitObjects = [];
    }

    parseOsuFile(content) {
        const lines = content.split('\n');
        let currentSection = '';

        const songData = {
            general: {
                AudioFilename: undefined
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
        const [time, beatLength, ...rest] = line.split(',');
        return {
            time: parseFloat(time),
            beatLength: parseFloat(beatLength),
            // Convert beat length to BPM
            bpm: 60000 / parseFloat(beatLength)
        };
    }

    parseHitObject(line) {
        const [x, y, time, type, ...rest] = line.split(',');
        return {
            x: parseInt(x),
            y: parseInt(y),
            time: parseInt(time),
            type: parseInt(type)
        };
    }

    convertToGameFormat(osuData) {
        // Initialize 4 lanes (S, D, K, L)
        const lanes = Array(4).fill(null).map(() => ({ notes: [] }));

        // Get base timing point for BPM calculation
        const baseTimingPoint = osuData.timingPoints[0];
        const baseBPM = baseTimingPoint ? baseTimingPoint.bpm : 90; // Default to 120 BPM if not specified
        const offset = baseTimingPoint ? baseTimingPoint.time / 1000 : 0; // Convert to seconds

        // Convert hit objects to lane notes
        // Add a manual offset adjustment (in seconds)
        const manualOffset = -2; // Adjust this value as needed

        // Convert hit objects to lane notes
        for (const hitObject of osuData.hitObjects) {
            const laneIndex = Math.floor((hitObject.x / 512) * 4);
            if (laneIndex >= 0 && laneIndex < 4) {
                const delay = (hitObject.time / 1000) - offset + manualOffset;

                lanes[laneIndex].notes.push({
                    delay: delay,
                    window: (60 / baseBPM) * 0.2
                });
            }
        }

        return {
            songPath: `songs/${osuData.general.AudioFilename}`,
            bpm: baseBPM,
            offset: offset + manualOffset, // Include manual offset in returned data
            sheet: lanes
        };
    }
}

// Usage example:
function loadOsuFile(fileContent) {
    const parser = new OsuParser();
    return parser.parseOsuFile(fileContent);
}