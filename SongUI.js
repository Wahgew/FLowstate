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
        this.spacing = 15;

        // New properties for circular scrolling
        this.visibleSongsCount = 9;
        this.isAnimating = false;
        this.animationProgress = 0;
        this.animationDirection = 0; // 1 for down, -1 for up
        this.animationSpeed = 1; // Controls animation speed (0-1)
        this.previousSelectedIndex = 0;

        // Mouse interaction properties
        this.mousePosition = { x: 0, y: 0 };
        this.hoveredIndex = -1; // Song index being hovered
        this.isMouseOverSong = false;

        // Animation frame request ID
        this.animationFrameId = null;

        // Load all song records when initializing
        this.loadSongRecords();

        // Set up mouse event listeners
        this.setupMouseListeners();
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

    // Add this method to set up mouse event listeners
    setupMouseListeners() {
        // Mouse move handler for hover effects
        this.canvas.addEventListener('mousemove', (event) => {
            if (!this.isVisible) return;

            // Get mouse position relative to canvas
            const rect = this.canvas.getBoundingClientRect();
            const scale = this.canvas.width / rect.width; // Handle scaling
            this.mousePosition = {
                x: (event.clientX - rect.left) * scale,
                y: (event.clientY - rect.top) * scale
            };

            // Check if mouse is over any song box
            this.checkMouseOverSongs();

            // Redraw UI to show hover effects
            this.draw();
        });

        // Mouse click handler - simplified to play song immediately
        this.canvas.addEventListener('click', (event) => {
            if (!this.isVisible || this.isAnimating) return;

            // Get mouse position relative to canvas
            const rect = this.canvas.getBoundingClientRect();
            const scale = this.canvas.width / rect.width; // Handle scaling
            this.mousePosition = {
                x: (event.clientX - rect.left) * scale,
                y: (event.clientY - rect.top) * scale
            };

            // Check which song is being clicked
            this.checkMouseOverSongs();

            // If mouse is over a song, select and play it immediately
            if (this.isMouseOverSong && this.hoveredIndex !== -1) {
                this.selectedIndex = this.hoveredIndex;
                // Return the selected song to trigger playback
                const selectedSong = this.songLoader.getAllSongs()[this.selectedIndex];

                // Handle song selection via callback if available
                if (this.onSongSelect) {
                    this.onSongSelect(selectedSong);
                }
            }
        });

        // Mouse wheel handler for scrolling
        this.canvas.addEventListener('wheel', (event) => {
            if (!this.isVisible || this.isAnimating) return;

            event.preventDefault(); // Prevent page scrolling

            const songs = this.songLoader.getAllSongs();
            this.previousSelectedIndex = this.selectedIndex;

            // Determine scroll direction
            if (event.deltaY > 0) {
                // Scroll down
                this.selectedIndex = (this.selectedIndex + 1) % songs.length;
                this.animationDirection = -1;
            } else {
                // Scroll up
                this.selectedIndex = (this.selectedIndex - 1 + songs.length) % songs.length;
                this.animationDirection = 1;
            }

            this.isAnimating = true;
            this.animationProgress = 0;
            this.playScrollSound();
            this.draw();
        }, { passive: false }); // Important for preventDefault to work

    }

    // Method to determine if mouse is over any song
    checkMouseOverSongs() {
        const visibleSongs = this.getVisibleSongs();
        this.isMouseOverSong = false;
        this.hoveredIndex = -1;

        // Get the center X position for the song boxes
        const boxCenterX = this.canvas.width / 2;
        const boxLeft = boxCenterX - (this.songBoxWidth / 2);

        // Check each visible song
        visibleSongs.forEach((song, visibleIndex) => {
            const y = this.getYPosition(visibleIndex);

            // Skip if offscreen (for animation)
            if (y < 80 || y > this.canvas.height - 150) return;

            // Check if mouse is within this song's box
            if (this.mousePosition.x >= boxLeft &&
                this.mousePosition.x <= boxLeft + this.songBoxWidth &&
                this.mousePosition.y >= y &&
                this.mousePosition.y <= y + this.songBoxHeight) {

                this.isMouseOverSong = true;
                this.hoveredIndex = song.originalIndex !== undefined ? song.originalIndex : visibleIndex;

                // Change cursor to pointer
                this.canvas.style.cursor = 'pointer';
            }
        });

        // Reset cursor if not over any song
        if (!this.isMouseOverSong) {
            this.canvas.style.cursor = 'default';
        }
    }

    scrollToSong(targetIndex) {
        // Calculate how many steps we need to animate
        const songs = this.songLoader.getAllSongs();
        const currentIndex = this.selectedIndex;

        // Find shortest path (may need to wrap around)
        let steps = targetIndex - currentIndex;
        if (Math.abs(steps) > songs.length / 2) {
            // Shorter to go the other way around
            steps = steps > 0 ? steps - songs.length : steps + songs.length;
        }

        // We'll use this for animation direction
        this.animationDirection = steps > 0 ? -1 : 1;

        // For large jumps, we might want a faster animation or multiple steps
        this.animationSpeed = Math.min(1, 0.2 + (Math.abs(steps) * 0.15));

        this.isAnimating = true;
        this.animationProgress = 0;
        this.draw();
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
            if (y < 80 || y > this.canvas.height - 30) return;

            // Check if selected or hovered
            const isSelected = originalIndex === this.selectedIndex;
            const isHovered = originalIndex === this.hoveredIndex && this.isMouseOverSong;

            // Determine box color based on state
            if (isSelected) {
                this.ctx.fillStyle = '#444'; // Selected color
            } else if (isHovered) {
                this.ctx.fillStyle = '#333'; // Hover color
            } else {
                this.ctx.fillStyle = '#222'; // Normal color
            }

            // Draw box background
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
            const record = this.songRecords.get(song.id);
            this.ctx.font = '40px nunito';
            this.ctx.textAlign = 'left';
            if (record?.isFullCombo) {
                this.ctx.fillStyle = '#FFD700'; // Gold color for FC
                this.ctx.fillText('FC✦', boxLeft + 10, y + (this.songBoxHeight / 2) + 8);
            }

            // Draw song title in center (slightly higher to make room for difficulty stars)
            this.ctx.fillStyle = 'white';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(song.title, boxCenterX, y + (this.songBoxHeight / 2) - 5);

            // Draw difficulty stars below title
            this.ctx.font = '16px nunito';
            this.ctx.fillStyle = this.getDifficultyColor(song.difficulty || 3);
            this.ctx.fillText(this.getDifficultyStars(song.difficulty || 3), boxCenterX, y + (this.songBoxHeight / 2) + 20);

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

        // Just one simple instruction at the bottom
        this.ctx.font = '16px nunito';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Click song to play or press ENTER', this.canvas.width / 2, this.canvas.height - 15);
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
                // Return the selected song
                const selectedSong = songs[this.selectedIndex];

                // Handle song selection via callback if available
                if (this.onSongSelect) {
                    this.onSongSelect(selectedSong);
                    return null;
                }

                return selectedSong;
        }

        return null;
    }

    handleMouseClick() {
        if (this.isAnimating) return;

        // If mouse is over a song and it's not already selected, select it
        if (this.isMouseOverSong && this.hoveredIndex !== -1) {
            if (this.hoveredIndex !== this.selectedIndex) {
                // Store previous index for animation
                this.previousSelectedIndex = this.selectedIndex;
                this.selectedIndex = this.hoveredIndex;

                // Use the smooth scroll function for better transitions
                this.scrollToSong(this.hoveredIndex);
                this.playScrollSound();
            } else {
                // If clicking already selected song, return as if Enter was pressed
                this.onSongSelected();
            }
        }
    }


    // Method to be called when a song is selected (clicked or Enter pressed)
    onSongSelected() {
        const songs = this.songLoader.getAllSongs();
        return songs[this.selectedIndex];
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

    getDifficultyColor(difficulty) {
        // Returns a color based on the 1-5 star scale
        if (difficulty >= 4.8) return '#ff0000'; // 5 stars: Red
        if (difficulty >= 3.8) return '#ff44aa'; // 4 stars: Pink/magenta
        if (difficulty >= 2.8) return '#ff6600'; // 3 stars: Orange
        if (difficulty >= 1.8) return '#ffcc00'; // 2 stars: Yellow
        return '#00cc00';                       // 1 star: Green
    }

    getDifficultyStars(difficulty) {
        // Convert difficulty (1.0-5.0) directly to 1-5 stars
        // No scaling applied - just round to nearest star
        const stars = Math.round(difficulty);
        const maxStars = 5;

        let starDisplay = '';

        // Add filled stars
        for (let i = 0; i < stars; i++) {
            starDisplay += '★';
        }

        // Add empty stars
        for (let i = stars; i < maxStars; i++) {
            starDisplay += '☆';
        }

        return starDisplay;
    }

    getDifficultyText(difficulty) {
        // Match text to the star rating
        if (difficulty >= 4.8) return 'Expert';
        if (difficulty >= 3.8) return 'Hard';
        if (difficulty >= 2.8) return 'Normal+';
        if (difficulty >= 1.8) return 'Normal';
        return 'Easy';
    }

    getYPosition(index, offset = 0) {
        const startY = 100; // Slightly higher start position
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