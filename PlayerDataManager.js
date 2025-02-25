// PlayerDataManager.js
class PlayerDataManager {
    static DB_NAME = 'RhythmGameDB';
    static DB_VERSION = 1;
    static STORE_NAME = 'songRecords';
    static SETTINGS_STORE = 'gameSettings';

    // Grade color scheme using pastel colors (matching EndScreenUI)
    static GRADE_COLORS = {
        SS: '#FFB347', // Soft orange
        S: '#FF9B9B',  // Pastel coral/orange-red
        A: '#90EE90',  // Pastel green
        B: '#87CEEB',  // Pastel blue
        C: '#DDA0DD',  // Pastel purple
        D: '#FFB6C1',  // Pastel red
        F: '#808080'   // Gray for fail
    };

    constructor() {
        this.db = null;
        this.initializeDB();
    }

    async initializeDB() {
        try {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(PlayerDataManager.DB_NAME, PlayerDataManager.DB_VERSION);

                request.onerror = (event) => {
                    console.error('Database error:', event.target.error);
                    reject(event.target.error);
                };

                request.onsuccess = (event) => {
                    this.db = event.target.result;
                    console.log('Database opened successfully');
                    resolve();
                };

                request.onupgradeneeded = (event) => {
                    const db = event.target.result;

                    // Create object store for song records
                    if (!db.objectStoreNames.contains(PlayerDataManager.STORE_NAME)) {
                        const store = db.createObjectStore(PlayerDataManager.STORE_NAME, {
                            keyPath: 'songId'
                        });

                        // Create indexes
                        store.createIndex('grade', 'grade', { unique: false });
                        store.createIndex('isFullCombo', 'isFullCombo', { unique: false });
                        store.createIndex('timestamp', 'timestamp', { unique: false });
                    }

                    // Create object store for game settings
                    if (!db.objectStoreNames.contains(PlayerDataManager.SETTINGS_STORE)) {
                        db.createObjectStore(PlayerDataManager.SETTINGS_STORE, {
                            keyPath: 'id'
                        });
                    }
                };
            });
        } catch (error) {
            console.error('Failed to initialize database:', error);
            throw error;
        }
    }

    async saveSongRecord(songId, stats) {
        if (!this.db) await this.initializeDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([PlayerDataManager.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(PlayerDataManager.STORE_NAME);

            // First check if there's an existing record
            const getRequest = store.get(songId);

            getRequest.onsuccess = (event) => {
                const existingRecord = event.target.result;
                const grade = this.calculateGrade(parseFloat(stats.accuracy), stats.isFullCombo);

                // Create new record
                const newRecord = {
                    songId,
                    grade,
                    score: stats.score,
                    accuracy: stats.accuracy,
                    isFullCombo: stats.isFullCombo,
                    maxCombo: stats.maxCombo,
                    perfectCount: stats.perfectCount,
                    goodCount: stats.goodCount,
                    badCount: stats.badCount,
                    missCount: stats.missCount,
                    timestamp: Date.now()
                };

                // Only update if new score is better
                if (existingRecord) {
                    const shouldUpdate = this.shouldUpdateRecord(existingRecord, newRecord);
                    if (!shouldUpdate) {
                        resolve(existingRecord);
                        return;
                    }
                }

                // Save the record
                const putRequest = store.put(newRecord);
                putRequest.onsuccess = () => resolve(newRecord);
                putRequest.onerror = () => reject(putRequest.error);
            };

            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    shouldUpdateRecord(oldRecord, newRecord) {
        // Update if new score is higher
        if (newRecord.score > oldRecord.score) return true;

        // Update if accuracy is better with same score
        if (newRecord.score === oldRecord.score &&
            parseFloat(newRecord.accuracy) > parseFloat(oldRecord.accuracy)) return true;

        // Update if got full combo and didn't have it before
        return !!(newRecord.isFullCombo && !oldRecord.isFullCombo);


    }

    async saveVolumeSettings(volumeSettings) {
        if (!this.db) await this.initializeDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([PlayerDataManager.SETTINGS_STORE], 'readwrite');
            const store = transaction.objectStore(PlayerDataManager.SETTINGS_STORE);

            const request = store.put({
                id: 'volumeSettings',
                songVolume: volumeSettings.songVolume,
                hitSoundVolume: volumeSettings.hitSoundVolume,
                // Add new volume settings
                scrollSoundVolume: volumeSettings.scrollSoundVolume || 0.1,
                missSoundVolume: volumeSettings.missSoundVolume || 0.8,
                applauseSoundVolume: volumeSettings.applauseSoundVolume || 0.3,
                timestamp: Date.now()
            });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getSongRecord(songId) {
        if (!this.db) await this.initializeDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([PlayerDataManager.STORE_NAME], 'readonly');
            const store = transaction.objectStore(PlayerDataManager.STORE_NAME);
            const request = store.get(songId);

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }

    async getVolumeSettings() {
        if (!this.db) await this.initializeDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([PlayerDataManager.SETTINGS_STORE], 'readonly');
            const store = transaction.objectStore(PlayerDataManager.SETTINGS_STORE);
            const request = store.get('volumeSettings');

            request.onsuccess = () => {
                if (request.result) {
                    resolve({
                        songVolume: request.result.songVolume,
                        hitSoundVolume: request.result.hitSoundVolume,
                        // Include new volume settings with fallbacks
                        scrollSoundVolume: request.result.scrollSoundVolume || 0.1,
                        missSoundVolume: request.result.missSoundVolume || 0.8,
                        applauseSoundVolume: request.result.applauseSoundVolume || 0.3
                    });
                } else {
                    // Return default values if no settings found
                    resolve({
                        songVolume: 0.5,
                        hitSoundVolume: 0.4,
                        scrollSoundVolume: 0.1,
                        missSoundVolume: 0.8,
                        applauseSoundVolume: 0.3
                    });
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    async getAllRecords() {
        if (!this.db) await this.initializeDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([PlayerDataManager.STORE_NAME], 'readonly');
            const store = transaction.objectStore(PlayerDataManager.STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    calculateGrade(accuracy, isFullCombo) {
        if (accuracy >= 100 && isFullCombo) return 'SS';
        if (accuracy >= 95) return 'S';
        if (accuracy >= 85) return 'A';
        if (accuracy >= 70) return 'B';
        if (accuracy >= 60) return 'C';
        if (accuracy >= 50) return 'D';
        return 'F';
    }

    getGradeColor(grade) {
        return PlayerDataManager.GRADE_COLORS[grade] || PlayerDataManager.GRADE_COLORS.F;
    }

    async clearAllRecords() {
        if (!this.db) await this.initializeDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([PlayerDataManager.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(PlayerDataManager.STORE_NAME);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}