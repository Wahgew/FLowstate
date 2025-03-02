class WelcomeScreen {
    constructor(canvas, ctx, onComplete) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.onComplete = onComplete;
        this.isVisible = true;
        this.audioContext = null;
        this.analyser = null;
        this.frequencyData = null;
        this.startupSound = null;
        this.audioInitialized = false;
        this.animationId = null;
        this.startTime = 0;
        this.fadeDuration = 750; // ms for fade out
        this.isFadingOut = false;

        // Define custom widths for letters
        this.letterWidths = {
            'W': 100 * 0.9, // Make W wider
            'O': 100 * 0.7, // Slightly wider O
            'default': 100 * 0.6 // Default letter width
        };

        // Initialize with colorful static screen
        this.drawColorfulStaticScreen();

        // Set up event listeners
        this.setupEventListeners();
    }

    // Draw colorful static screen
    drawColorfulStaticScreen() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw title with colors
        const title = "FLOWSTATE";
        const fontSize = 100;
        this.ctx.font = `bold ${fontSize}px nunito`;
        this.ctx.textAlign = 'center';

        // Calculate letter positions similar to the animated version
        let totalWidth = 0;
        const letterSpacing = 30;

        for (let i = 0; i < title.length; i++) {
            const char = title[i];
            const letterWidth = this.letterWidths[char] || this.letterWidths.default;
            totalWidth += letterWidth;

            if (i < title.length - 1) {
                totalWidth += letterSpacing;
            }
        }

        const startX = (this.canvas.width - totalWidth) / 2;

        // Draw each letter with unique color
        for (let i = 0; i < title.length; i++) {
            // Set a unique color for each letter
            const hue = (i * 30) % 360;
            this.ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;

            // Calculate position
            let x = startX;
            for (let j = 0; j < i; j++) {
                const prevChar = title[j];
                const prevWidth = this.letterWidths[prevChar] || this.letterWidths.default;
                x += prevWidth + letterSpacing;
            }

            // Add current letter's half width to center it
            const currentWidth = this.letterWidths[title[i]] || this.letterWidths.default;
            x += currentWidth / 2;

            // Draw the letter
            this.ctx.fillText(title[i], x, this.canvas.height / 2);
        }

        // Draw click prompt
        this.ctx.font = '24px nunito';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.fillText('Click or press ENTER to start', this.canvas.width / 2, this.canvas.height / 2 + 120);
    }

    setupEventListeners() {
        // Click handler
        this.clickHandler = () => {
            if (this.isVisible && !this.audioInitialized) {
                this.initAudio();
                this.audioInitialized = true;
            }
        };
        this.canvas.addEventListener('click', this.clickHandler);

        // Keyboard handler
        this.keyHandler = (event) => {
            if (this.isVisible && (event.key === 'Enter' || event.key === ' ') && !this.audioInitialized) {
                this.initAudio();
                this.audioInitialized = true;
            }
        };
        document.addEventListener('keydown', this.keyHandler);
    }

    async initAudio() {
        try {
            console.log("Initializing audio after user interaction");

            // Create audio context - this requires user interaction first
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Resume the context (important for Chrome)
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256; // Increased for more frequency data
            this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);

            // Load startup sound
            const response = await fetch('./effects/flowstate.mp3');
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

            // Set up audio source
            this.startupSound = this.audioContext.createBufferSource();
            this.startupSound.buffer = audioBuffer;
            this.startupSound.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);

            // Set up event for when sound finishes
            this.startupSound.onended = () => {
                console.log("Sound playback complete, auto-proceeding");
                this.startFadeOut();
            };

            // Start playback and animation
            this.startTime = performance.now();
            this.startupSound.start();
            this.animate();
            console.log("Audio visualization started");

        } catch (error) {
            console.error('Error initializing welcome screen audio:', error);
            // If audio fails, just proceed to the game
            this.onComplete();
        }
    }

    startFadeOut() {
        if (!this.isFadingOut) {
            this.isFadingOut = true;
            this.fadeStartTime = performance.now();
        }
    }

    animate() {
        if (!this.isVisible) {
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }
            return;
        }

        // Get frequency data for visualization
        if (this.analyser) {
            this.analyser.getByteFrequencyData(this.frequencyData);
        }

        this.draw();

        // Check if we should fade out
        if (this.isFadingOut) {
            const elapsed = performance.now() - this.fadeStartTime;
            if (elapsed >= this.fadeDuration) {
                this.cleanup();
                if (this.onComplete) this.onComplete();
                return;
            }
        }

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Calculate opacity for fade out
        let opacity = 1;
        if (this.isFadingOut) {
            const elapsed = performance.now() - this.fadeStartTime;
            opacity = 1 - (elapsed / this.fadeDuration);
        }

        // Draw title with audio visualization
        const title = "FLOWSTATE";
        const fontSize = 100;
        this.ctx.font = `bold ${fontSize}px nunito`;
        this.ctx.textAlign = 'center';

        // Calculate total width based on actual letter widths
        let totalWidth = 0;
        const letterSpacing = 30; // Increased spacing between letters

        for (let i = 0; i < title.length; i++) {
            const char = title[i];
            const letterWidth = this.letterWidths[char] || this.letterWidths.default;
            totalWidth += letterWidth;

            // Add spacing between letters (not after the last letter)
            if (i < title.length - 1) {
                totalWidth += letterSpacing;
            }
        }

        const startX = (this.canvas.width - totalWidth) / 2;

        // Scale frequencies to span the entire title
        const freqStep = Math.floor(this.analyser?.frequencyBinCount / title.length) || 1;

        // Create bass response for overall movement
        let bassValue = 0;
        if (this.frequencyData) {
            // Average the first few bins (low frequencies/bass)
            for (let i = 0; i < 5; i++) {
                bassValue += this.frequencyData[i] || 0;
            }
            bassValue = bassValue / 5;
        }

        // Overall horizontal movement based on bass
        const horizontalOffset = this.frequencyData ? (bassValue / 255) * 15 : 0;

        for (let i = 0; i < title.length; i++) {
            // Get a unique frequency bin for each letter
            const startFreq = i * freqStep;

            // Average several frequency bins around the letter's main frequency
            let freqSum = 0;
            const binCount = 3; // How many bins to average

            for (let j = 0; j < binCount; j++) {
                const freqIndex = Math.min(startFreq + j, this.analyser?.frequencyBinCount - 1 || 0);
                freqSum += this.frequencyData ? this.frequencyData[freqIndex] || 0 : 50;
            }

            const frequency = freqSum / binCount;

            // Vertical movement based on this letter's frequency range
            const vibration = this.frequencyData ? (frequency / 255) * 20 : 0;

            // Unique color for each letter that shifts over time
            const hue = (i * 30 + performance.now() / 50) % 360;

            // Calculate position for each letter based on its actual width
            let x = startX;

            // Add width of all previous letters plus spacing
            for (let j = 0; j < i; j++) {
                const prevChar = title[j];
                const prevWidth = this.letterWidths[prevChar] || this.letterWidths.default;
                x += prevWidth + letterSpacing;
            }

            // Add current letter's half width to center it
            const currentWidth = this.letterWidths[title[i]] || this.letterWidths.default;
            x += currentWidth / 2;

            // Add visualization movement
            x += horizontalOffset * Math.sin(i + performance.now() / 500);
            const y = this.canvas.height / 2 - vibration;

            // Draw letter
            this.ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${opacity})`;
            this.ctx.fillText(title[i], x, y);

            // Draw vibration effect (glow) below letter
            this.ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${opacity * 0.3})`;
            this.ctx.fillText(title[i], x, y + vibration * 2);

            // Add a subtle horizontal glow effect
            this.ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${opacity * 0.2})`;
            this.ctx.fillText(title[i], x + vibration/2, y);
        }
    }

    cleanup() {
        this.isVisible = false;

        // Remove event listeners
        this.canvas.removeEventListener('click', this.clickHandler);
        document.removeEventListener('keydown', this.keyHandler);

        // Stop animation
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        // Clean up audio resources
        if (this.startupSound && this.startupSound.stop) {
            try {
                this.startupSound.stop();
            } catch (e) {
                // Ignore if already stopped
            }
        }

        if (this.audioContext && this.audioContext.state !== 'closed') {
            // Just disconnect nodes rather than closing the context
            // as it might be reused for other audio
            if (this.analyser) {
                this.analyser.disconnect();
            }
        }
    }
}