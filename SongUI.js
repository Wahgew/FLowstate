class SongSelectUI {
    constructor(canvas, songLoader, playerDataManager) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.songLoader = songLoader;
        this.playerDataManager = playerDataManager;
        this.selectedIndex = 0;
        this.isVisible = false;
        this.songRecords = new Map(); // Cache for song records

        // Basic UI constants
        this.songBoxWidth = 550;
        this.songBoxHeight = 80;
        this.spacing = 20;

        // New properties for circular scrolling
        this.visibleSongsCount = 8; // Number of songs visible at once
        this.isAnimating = false;
        this.animationProgress = 0;
        this.animationDirection = 0; // 1 for down, -1 for up
        this.animationSpeed = 1; // Controls animation speed (0-1)
        this.previousSelectedIndex = 0;

        // Animation frame request ID
        this.animationFrameId = null;

        // Load all song records when initializing
        this.loadSongRecords();
    }

    async loadSongRecords() {
        try {
            const records = await this.playerDataManager.getAllRecords();
            this.songRecords.clear();
            records.forEach(record => {
                this.songRecords.set(record.songId, record);
            });
        } catch (error) {
            console.error('Failed to load song records:', error);
        }
    }

    show() {
        this.isVisible = true;
        this.loadSongRecords().then(() => {
            this.startAnimationLoop();
            this.updateSoundVolume();
            this.draw();
        });
    }

    hide() {
        this.isVisible = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    // Update sound volume based on global settings
    updateSoundVolume() {
        // We don't need to update the base sound object volume
        // as we're getting the volume directly when playing the sound

        // Log current volume settings for debugging
        if (window.volumeState) {
            console.log('Current volume state:', {
                hitSoundVolume: window.volumeState.hitSoundVolume,
                songVolume: window.volumeState.songVolume
            });
        } else {
            console.log('Volume state not available');
        }
    }

    // Method to play scroll sound effect
    playScrollSound() {
        // Get volume directly from global state
        if (!window.volumeState || typeof window.volumeState.scrollSoundVolume !== 'number') {
            console.log('No volume state available, using default');
            return; // Exit if no volume state
        }

        // Check if volume is 0 or very low, don't play sound
        if (window.volumeState.scrollSoundVolume <= 0.01) {
            console.log('Scroll sound muted, volume:', window.volumeState.scrollSoundVolume);
            return;
        }

        // Create a new audio instance to allow overlapping sounds
        const sound = new Audio('./effects/minimal-pop-click-ui-8.mp3');

        // Set the volume from global state
        sound.volume = window.volumeState.scrollSoundVolume;

        console.log('Playing scroll sound with volume:', window.volumeState.scrollSoundVolume);

        // Play the sound
        sound.play().catch(error => {
            console.error('Error playing scroll sound:', error);
        });
    }

    startAnimationLoop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }

        const animate = () => {
            if (!this.isVisible) return;

            if (this.isAnimating) {
                // Update animation progress
                this.animationProgress += this.animationSpeed;
                if (this.animationProgress >= 1) {
                    this.animationProgress = 0;
                    this.isAnimating = false;
                }

                this.draw();
            }

            this.animationFrameId = requestAnimationFrame(animate);
        };

        this.animationFrameId = requestAnimationFrame(animate);
    }

    draw() {
        if (!this.isVisible) return;

        // Clear canvas
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw title
        this.ctx.font = '40px nunito';
        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Song Selection', this.canvas.width / 2, 60);

        // Get visible songs with their original indices
        const visibleSongs = this.getVisibleSongs();

        // Draw song boxes
        visibleSongs.forEach((song, visibleIndex) => {
            const originalIndex = song.originalIndex !== undefined ? song.originalIndex : visibleIndex;
            const y = this.getYPosition(visibleIndex);

            // Skip if offscreen (for animation)
            if (y < 80 || y > this.canvas.height - 150) return;

            const isSelected = originalIndex === this.selectedIndex;
            const record = this.songRecords.get(song.id);

            // Draw box background with a highlight for selected item
            this.ctx.fillStyle = isSelected ? '#444' : '#222';
            this.ctx.fillRect(
                (this.canvas.width - this.songBoxWidth) / 2,
                y,
                this.songBoxWidth,
                this.songBoxHeight
            );

            // Set up text positions
            const boxCenterX = this.canvas.width / 2;
            const boxLeft = boxCenterX - (this.songBoxWidth / 2);
            const boxRight = boxCenterX + (this.songBoxWidth / 2);

            // Draw FC marker on left if achieved
            this.ctx.font = '40px nunito';
            this.ctx.textAlign = 'left';
            if (record?.isFullCombo) {
                this.ctx.fillStyle = '#FFD700'; // Gold color for FC
                this.ctx.fillText('FC✦', boxLeft + 10, y + (this.songBoxHeight / 2) + 8);
            }

            // Draw song title in center
            this.ctx.fillStyle = 'white';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(song.title, boxCenterX, y + (this.songBoxHeight / 2) + 8);

            // Draw grade on right if exists
            this.ctx.font = '40px nunito';
            this.ctx.textAlign = 'right';
            if (record) {
                this.ctx.fillStyle = this.playerDataManager.getGradeColor(record.grade);
                this.ctx.fillText(record.grade, boxRight - 10, y + (this.songBoxHeight / 2) + 8);
            } else {
                this.ctx.fillStyle = '#666';
                this.ctx.fillText('-', boxRight - 10, y + (this.songBoxHeight / 2) + 8);
            }
        });

        // Draw scroll indicators if there are more songs than visible area
        const songs = this.songLoader.getAllSongs();
        if (songs.length > this.visibleSongsCount) {
            this.drawScrollIndicators();
        }

        // Draw instructions
        this.ctx.font = '20px nunito';
        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'center';
        const instructions = [
            '↑↓ to select, ENTER to play, F2 for debug mode',
            'Controls: S D | J K',
            'Hold R for 1 second to restart song',
            'IT IS HIGHLY RECOMMEND TO PLAY ON FULLSCREEN',
            'As this gives you best hit detection',
        ];

        instructions.forEach((text, index) => {
            this.ctx.fillText(text,
                this.canvas.width / 2,
                this.canvas.height - (105 - index * 25)
            );
        });
    }

    drawScrollIndicators() {
        const centerX = this.canvas.width / 2;

        // Draw up indicator (if not at the top or if wrapping is enabled)
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.beginPath();
        this.ctx.moveTo(centerX - 15, 95);
        this.ctx.lineTo(centerX + 15, 95);
        this.ctx.lineTo(centerX, 80);
        this.ctx.closePath();
        this.ctx.fill();

        // Draw down indicator (if not at the bottom or if wrapping is enabled)
        const bottomY = this.getYPosition(this.visibleSongsCount) + 10;
        this.ctx.beginPath();
        this.ctx.moveTo(centerX - 15, bottomY);
        this.ctx.lineTo(centerX + 15, bottomY);
        this.ctx.lineTo(centerX, bottomY + 15);
        this.ctx.closePath();
        this.ctx.fill();
    }

    handleInput(event) {
        if (!this.isVisible || this.isAnimating) return;

        const songs = this.songLoader.getAllSongs();
        this.previousSelectedIndex = this.selectedIndex;

        switch(event.key) {
            case 'ArrowUp':
                this.selectedIndex = (this.selectedIndex - 1 + songs.length) % songs.length;
                this.animationDirection = 1; // Scrolling up means content moves down
                this.isAnimating = true;
                this.animationProgress = 0;
                this.playScrollSound();
                this.draw();
                break;

            case 'ArrowDown':
                this.selectedIndex = (this.selectedIndex + 1) % songs.length;
                this.animationDirection = -1; // Scrolling down means content moves up
                this.isAnimating = true;
                this.animationProgress = 0;
                this.playScrollSound();
                this.draw();
                break;

            case 'Enter':
                return songs[this.selectedIndex];
        }

        return null;
    }

    getVisibleSongs() {
        const songs = this.songLoader.getAllSongs();
        const totalSongs = songs.length;

        if (totalSongs <= this.visibleSongsCount) {
            return songs; // Return all songs if we have fewer than visible count
        }

        // Get the visible range of indices
        const visibleSongs = [];
        let startIndex = this.selectedIndex - Math.floor(this.visibleSongsCount / 2);

        // Adjust for circular wrapping
        for (let i = 0; i < this.visibleSongsCount; i++) {
            let index = (startIndex + i) % totalSongs;
            if (index < 0) index += totalSongs; // Handle negative indices
            visibleSongs.push({
                ...songs[index],
                originalIndex: index // Store the original index for selection
            });
        }

        return visibleSongs;
    }

    getYPosition(index, offset = 0) {
        const startY = 120;
        let position = startY + (index * (this.songBoxHeight + this.spacing));

        // Apply animation offset if animating
        if (this.isAnimating) {
            const animationOffset = this.animationDirection *
                (this.songBoxHeight + this.spacing) *
                this.animationProgress;
            position += animationOffset;
        }

        return position + offset;
    }
}