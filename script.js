// ========================
// ULTIMATE HORROR GAME ENGINE
// ========================
document.addEventListener('DOMContentLoaded', function() {
    console.log("ASYLUM: Loading...");
    
    const Game = {
        // Canvas
        canvas: null,
        ctx: null,
        width: 1024,
        height: 768,
        
        // Game state
        running: false,
        sanity: 100,
        heartRate: 72,
        filesCollected: 0,
        totalFiles: 5,
        entities: [],
        maxEntities: 20,
        playerFlashlight: true,
        playerRunning: false,
        
        // Player
        player: {
            x: 512,
            y: 384,
            radius: 8,
            speed: 2,
            angle: 0,
            breathing: 0,
            flashlightBattery: 100,
            lastBreath: 0
        },
        
        // Map
        tiles: [],
        tileSize: 64,
        mapWidth: 16,
        mapHeight: 12,
        rooms: [],
        
        // Objects
        files: [],
        bloodStains: [],
        flickeringLights: [],
        
        // Audio
        audio: null,
        lastFootstep: 0,
        lastHeartbeat: 0,
        lastWhisper: 0,
        lastScream: 0,
        
        // Input
        keysPressed: {},
        
        // Effects
        screenShake: 0,
        bloodOverlay: 0,
        staticOverlay: 0,
        breathingEffect: 0,
        
        // Time
        startTime: 0,
        survivalTime: 0,
        lastEntitySpawn: 0,
        
        // Horror events
        activeHorrorEvents: [],
        lastHorrorEvent: 0,
        jumpScareCooldown: 0,
        
        // Configuration
        config: {
            entitySpawnRate: 0.03,
            sanityDrainRate: 0.05,
            sanityDrainNearEntity: 0.3,
            maxHeartRate: 180,
            flashlightDrainRate: 0.1,
            horrorEventInterval: 3000,
            jumpScareCooldown: 10000
        }
    };

    // ========================
    // HORROR AUDIO ENGINE
    // ========================
    class HorrorAudio {
        constructor() {
            try {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
                this.master = this.ctx.createGain();
                this.master.connect(this.ctx.destination);
                this.master.gain.value = 0.3;
                
                // Create reverb
                this.convolver = this.ctx.createConvolver();
                this.createReverb();
                this.convolver.connect(this.master);
                
                // Distortion for intense moments
                this.distortion = this.ctx.createWaveShaper();
                this.distortion.curve = this.makeDistortionCurve(400);
                this.distortion.connect(this.convolver);
                
                // Start ambient horror
                this.startAmbientHorror();
                console.log("Horror Audio Engine: ACTIVE");
            } catch (e) {
                console.error("Audio failed:", e);
                this.ctx = null;
            }
        }
        
        createReverb() {
            const length = this.ctx.sampleRate * 3;
            const impulse = this.ctx.createBuffer(2, length, this.ctx.sampleRate);
            const left = impulse.getChannelData(0);
            const right = impulse.getChannelData(1);
            
            for (let i = 0; i < length; i++) {
                left[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
                right[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
            }
            
            this.convolver.buffer = impulse;
        }
        
        makeDistortionCurve(amount) {
            const samples = 44100;
            const curve = new Float32Array(samples);
            for (let i = 0; i < samples; i++) {
                const x = (i * 2) / samples - 1;
                curve[i] = (Math.PI + amount) * Math.atan(x * 10) / (Math.PI + amount * Math.abs(x));
            }
            return curve;
        }
        
        startAmbientHorror() {
            if (!this.ctx) return;
            
            // Multiple layered drones
            for (let i = 0; i < 4; i++) {
                const osc = this.ctx.createOscillator();
                osc.type = i % 2 === 0 ? 'sawtooth' : 'triangle';
                osc.frequency.value = 30 + i * 15;
                
                const gain = this.ctx.createGain();
                gain.gain.value = 0.02;
                
                // Random LFO for each drone
                const lfo = this.ctx.createOscillator();
                lfo.type = 'sine';
                lfo.frequency.value = 0.05 + Math.random() * 0.1;
                
                const lfoGain = this.ctx.createGain();
                lfoGain.gain.value = 5 + Math.random() * 10;
                
                lfo.connect(lfoGain);
                lfoGain.connect(osc.frequency);
                osc.connect(gain);
                gain.connect(this.distortion);
                
                osc.start();
                lfo.start();
                
                if (!this.drones) this.drones = [];
                this.drones.push({ osc, lfo, gain });
            }
            
            // White noise layer
            const noise = this.ctx.createBufferSource();
            const bufferSize = this.ctx.sampleRate * 2;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            
            noise.buffer = buffer;
            noise.loop = true;
            
            const noiseFilter = this.ctx.createBiquadFilter();
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.value = 500;
            noiseFilter.Q.value = 1;
            
            const noiseGain = this.ctx.createGain();
            noiseGain.gain.value = 0.01;
            
            noise.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(this.distortion);
            
            noise.start();
            this.noise = { noise, noiseGain };
        }
        
        playFootstep(running = false) {
            if (!this.ctx || Date.now() - this.lastFootstep < (running ? 200 : 400)) return;
            this.lastFootstep = Date.now();
            
            const now = this.ctx.currentTime;
            
            // Multiple layered footstep sounds
            for (let i = 0; i < 2; i++) {
                const noise = this.ctx.createBufferSource();
                const bufferSize = this.ctx.sampleRate * 0.08;
                const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                const data = buffer.getChannelData(0);
                
                for (let j = 0; j < bufferSize; j++) {
                    data[j] = Math.random() * 2 - 1;
                }
                
                noise.buffer = buffer;
                
                const filter = this.ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.value = running ? 400 : 250;
                filter.Q.value = 5;
                
                const gain = this.ctx.createGain();
                const delay = i * 0.02;
                gain.gain.setValueAtTime(0, now + delay);
                gain.gain.linearRampToValueAtTime(running ? 0.15 : 0.1, now + delay + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.15);
                
                noise.connect(filter);
                filter.connect(gain);
                gain.connect(this.distortion);
                
                noise.start(now + delay);
                noise.stop(now + delay + 0.15);
            }
        }
        
        playEntitySound(entityType, distance) {
            if (!this.ctx || Math.random() > 0.4) return;
            
            const now = this.ctx.currentTime;
            const volume = Math.max(0.05, 0.4 - (distance / 400));
            
            switch(entityType) {
                case 0: // Whisperer
                    this.playWhisper(now, volume);
                    break;
                case 1: // Crawler
                    this.playCrawler(now, volume);
                    break;
                case 2: // Screamer
                    if (Math.random() < 0.2) this.playScream(now, volume);
                    break;
                case 3: // Distortion
                    this.playDistortion(now, volume);
                    break;
            }
        }
        
        playWhisper(now, volume) {
            // FM synthesis for whisper
            const carrier = this.ctx.createOscillator();
            carrier.type = 'sine';
            carrier.frequency.value = 120 + Math.random() * 200;
            
            const modulator = this.ctx.createOscillator();
            modulator.type = 'sine';
            modulator.frequency.value = 5 + Math.random() * 20;
            
            const modGain = this.ctx.createGain();
            modGain.gain.value = 30 + Math.random() * 50;
            
            const gain = this.ctx.createGain();
            gain.gain.value = volume * 0.5;
            
            modulator.connect(modGain);
            modGain.connect(carrier.frequency);
            carrier.connect(gain);
            gain.connect(this.distortion);
            
            carrier.start(now);
            modulator.start(now);
            
            const duration = 1 + Math.random();
            carrier.stop(now + duration);
            modulator.stop(now + duration);
        }
        
        playCrawler(now, volume) {
            // Wet, dragging sounds
            const noise = this.ctx.createBufferSource();
            const bufferSize = this.ctx.sampleRate * 0.5;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(Math.sin(i / 100), 2);
            }
            
            noise.buffer = buffer;
            
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 200;
            
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(volume * 0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
            
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.distortion);
            
            noise.start(now);
            noise.stop(now + 0.8);
        }
        
        playScream(now, volume) {
            if (Date.now() - this.lastScream < 5000) return;
            this.lastScream = Date.now();
            
            // Multiple oscillators for scream
            for (let i = 0; i < 3; i++) {
                const osc = this.ctx.createOscillator();
                osc.type = i === 0 ? 'sawtooth' : 'square';
                osc.frequency.setValueAtTime(200 + i * 100, now);
                osc.frequency.exponentialRampToValueAtTime(800 + i * 200, now + 0.3);
                
                const gain = this.ctx.createGain();
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(volume * (0.3 - i * 0.1), now + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
                
                osc.connect(gain);
                gain.connect(this.distortion);
                
                osc.start(now);
                osc.stop(now + 0.5);
            }
        }
        
        playDistortion(now, volume) {
            // Glitchy distortion sounds
            const noise = this.ctx.createBufferSource();
            const bufferSize = this.ctx.sampleRate * 0.2;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
                if (i % 50 < 10) data[i] *= 3; // Glitch bursts
            }
            
            noise.buffer = buffer;
            
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(volume * 0.4, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            
            noise.connect(gain);
            gain.connect(this.distortion);
            
            noise.start(now);
            noise.stop(now + 0.3);
        }
        
        playHeartbeat(rate) {
            if (!this.ctx || this.heartbeatActive) return;
            
            this.heartbeatActive = true;
            const now = this.ctx.currentTime;
            
            const playThump = (delay) => {
                setTimeout(() => {
                    if (!this.ctx) return;
                    
                    const osc = this.ctx.createOscillator();
                    osc.frequency.value = 60;
                    
                    const gain = this.ctx.createGain();
                    const audioNow = this.ctx.currentTime;
                    gain.gain.setValueAtTime(0, audioNow);
                    gain.gain.linearRampToValueAtTime(0.3, audioNow + 0.05);
                    gain.gain.exponentialRampToValueAtTime(0.001, audioNow + 0.25);
                    
                    osc.connect(gain);
                    gain.connect(this.distortion);
                    
                    osc.start(audioNow);
                    osc.stop(audioNow + 0.25);
                }, delay);
            };
            
            // Double beat
            playThump(0);
            playThump(120);
            
            setTimeout(() => {
                this.heartbeatActive = false;
            }, 1000 - (rate * 5));
        }
        
        playJumpScare() {
            if (!this.ctx || Date.now() - this.lastJumpScare < 3000) return;
            this.lastJumpScare = Date.now();
            
            const now = this.ctx.currentTime;
            
            // Loud burst with pitch drop
            const noise = this.ctx.createBufferSource();
            const bufferSize = this.ctx.sampleRate * 0.8;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            
            noise.buffer = buffer;
            
            // Extreme distortion
            const extremeDistortion = this.ctx.createWaveShaper();
            const curve = new Float32Array(44100);
            for (let i = 0; i < 44100; i++) {
                const x = (i - 22050) / 22050;
                curve[i] = Math.tanh(x * 30) * 0.7;
            }
            extremeDistortion.curve = curve;
            
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(1.0, now + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
            
            noise.connect(extremeDistortion);
            extremeDistortion.connect(gain);
            gain.connect(this.master);
            
            noise.start(now);
            noise.stop(now + 1.0);
        }
        
        updateIntensity(sanity, heartRate) {
            if (!this.ctx || !this.drones || !this.noise) return;
            
            const intensity = 1 - (sanity / 100);
            
            // Increase drone volume and modulation
            this.drones.forEach((drone, i) => {
                drone.gain.gain.value = 0.02 + (intensity * 0.08);
                if (drone.lfo.frequency) {
                    drone.lfo.frequency.value = 0.05 + (intensity * 0.2) + Math.sin(Date.now() / 5000 + i) * 0.1;
                }
            });
            
            // Increase noise
            this.noise.noiseGain.gain.value = 0.01 + (intensity * 0.04);
            
            // Add distortion based on heart rate
            if (heartRate > 120 && !this.highDistortion) {
                this.highDistortion = true;
                this.distortion.curve = this.makeDistortionCurve(800);
            } else if (heartRate <= 120 && this.highDistortion) {
                this.highDistortion = false;
                this.distortion.curve = this.makeDistortionCurve(400);
            }
        }
        
        resume() {
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
                console.log("Audio resumed");
            }
        }
    }

    // ========================
    // MAP GENERATION - NO WALL STUCK
    // ========================
    function generateMap() {
        console.log("Generating horror map...");
        
        Game.tiles = [];
        Game.entities = [];
        Game.files = [];
        Game.bloodStains = [];
        Game.flickeringLights = [];
        Game.rooms = [];
        
        // Create open map with rooms
        for (let y = 0; y < Game.mapHeight; y++) {
            Game.tiles[y] = [];
            for (let x = 0; x < Game.mapWidth; x++) {
                // Border walls
                if (x === 0 || y === 0 || x === Game.mapWidth - 1 || y === Game.mapHeight - 1) {
                    Game.tiles[y][x] = 1; // Wall
                } else {
                    // Open floor - NO INTERIOR WALLS TO GET STUCK ON
                    Game.tiles[y][x] = 0;
                }
            }
        }
        
        // Add some pillars for atmosphere (not walls that trap)
        for (let i = 0; i < 8; i++) {
            const x = 2 + Math.floor(Math.random() * (Game.mapWidth - 4));
            const y = 2 + Math.floor(Math.random() * (Game.mapHeight - 4));
            
            // Single tile pillars only
            Game.tiles[y][x] = 2; // Pillar
        }
        
        // Place files in corners and edges
        const filePositions = [
            [2, 2],
            [Game.mapWidth - 3, 2],
            [2, Game.mapHeight - 3],
            [Game.mapWidth - 3, Game.mapHeight - 3],
            [Math.floor(Game.mapWidth / 2), Math.floor(Game.mapHeight / 2)]
        ];
        
        Game.filesCollected = 0;
        filePositions.forEach(([gridX, gridY]) => {
            Game.files.push({
                x: gridX * Game.tileSize + Game.tileSize / 2,
                y: gridY * Game.tileSize + Game.tileSize / 2,
                collected: false,
                glow: Math.random() * Math.PI * 2
            });
        });
        
        // Add blood stains
        for (let i = 0; i < 15; i++) {
            const x = Math.random() * Game.width;
            const y = Math.random() * Game.height;
            const size = 20 + Math.random() * 40;
            Game.bloodStains.push({ x, y, size, opacity: 0.3 + Math.random() * 0.4 });
        }
        
        // Add flickering lights
        for (let i = 0; i < 6; i++) {
            const x = Math.random() * Game.width;
            const y = Math.random() * Game.height;
            Game.flickeringLights.push({
                x, y,
                radius: 80 + Math.random() * 120,
                intensity: 0.4 + Math.random() * 0.3,
                flicker: Math.random() * Math.PI * 2,
                active: Math.random() > 0.3
            });
        }
        
        // Spawn LOTS of entities
        for (let i = 0; i < 10; i++) {
            spawnEntity();
        }
        
        console.log("Map generated with", Game.entities.length, "entities");
    }

    function spawnEntity() {
        if (Game.entities.length >= Game.maxEntities) return;
        
        let x, y;
        do {
            x = Math.random() * Game.width;
            y = Math.random() * Game.height;
        } while (distance(x, y, Game.player.x, Game.player.y) < 300);
        
        const entityType = Math.floor(Math.random() * 4);
        let speed, radius, behavior;
        
        switch(entityType) {
            case 0: // Whisperer
                speed = 0.6 + Math.random() * 0.4;
                radius = 15;
                behavior = 'stalk';
                break;
            case 1: // Crawler
                speed = 0.8 + Math.random() * 0.6;
                radius = 12;
                behavior = 'charge';
                break;
            case 2: // Screamer
                speed = 0.4 + Math.random() * 0.3;
                radius = 20;
                behavior = 'scream';
                break;
            case 3: // Distortion
                speed = 0.3 + Math.random() * 0.2;
                radius = 25;
                behavior = 'distort';
                break;
        }
        
        Game.entities.push({
            x, y,
            radius,
            speed,
            type: entityType,
            behavior,
            pulse: Math.random() * Math.PI * 2,
            lastSound: 0,
            lastBehaviorChange: 0,
            targetAngle: Math.random() * Math.PI * 2,
            chargeCooldown: 0,
            visible: true,
            alpha: 1,
            trail: []
        });
    }

    // ========================
    // HORROR EVENT SYSTEM
    // ========================
    function triggerHorrorEvent() {
        if (Date.now() - Game.lastHorrorEvent < Game.config.horrorEventInterval) return;
        if (Game.jumpScareCooldown > 0) return;
        
        Game.lastHorrorEvent = Date.now();
        const eventType = Math.floor(Math.random() * 6);
        
        switch(eventType) {
            case 0: // Jump scare
                if (Game.sanity < 70 && Math.random() < 0.5) {
                    triggerJumpScare();
                }
                break;
            case 1: // Whisper burst
                triggerWhisperBurst();
                break;
            case 2: // Light flicker
                triggerLightFlicker();
                break;
            case 3: // Distortion wave
                triggerDistortionWave();
                break;
            case 4: // Blood vision
                triggerBloodVision();
                break;
            case 5: // Static burst
                triggerStaticBurst();
                break;
        }
    }

    function triggerJumpScare() {
        Game.jumpScareCooldown = Game.config.jumpScareCooldown;
        Game.screenShake = 15;
        Game.bloodOverlay = 10;
        Game.sanity = Math.max(0, Game.sanity - 15);
        
        if (Game.audio) {
            Game.audio.playJumpScare();
        }
        
        // Spawn entity right in front of player
        const angle = Game.player.angle;
        const distance = 50;
        const jumpScareEntity = {
            x: Game.player.x + Math.cos(angle) * distance,
            y: Game.player.y + Math.sin(angle) * distance,
            radius: 25,
            type: 2, // Screamer
            alpha: 1,
            pulse: 0,
            lifetime: 30
        };
        
        Game.activeHorrorEvents.push({
            type: 'jumpScare',
            entity: jumpScareEntity,
            duration: 60
        });
    }

    function triggerWhisperBurst() {
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                if (Game.audio && Game.sanity < 80) {
                    Game.audio.playEntitySound(0, 100);
                }
            }, i * 300);
        }
        
        Game.sanity = Math.max(0, Game.sanity - 5);
    }

    function triggerLightFlicker() {
        Game.flickeringLights.forEach(light => {
            light.active = false;
            setTimeout(() => {
                light.active = true;
            }, 500 + Math.random() * 1000);
        });
    }

    function triggerDistortionWave() {
        Game.screenShake = 8;
        Game.staticOverlay = 5;
        
        Game.activeHorrorEvents.push({
            type: 'distortion',
            duration: 30,
            intensity: 0.3
        });
    }

    function triggerBloodVision() {
        Game.bloodOverlay = 20;
        Game.sanity = Math.max(0, Game.sanity - 10);
    }

    function triggerStaticBurst() {
        Game.staticOverlay = 10;
        
        Game.activeHorrorEvents.push({
            type: 'static',
            duration: 15
        });
    }

    // ========================
    // GAME INITIALIZATION
    // ========================
    function initGame() {
        console.log("Initializing ASYLUM...");
        
        Game.canvas = document.getElementById('gameCanvas');
        Game.ctx = Game.canvas.getContext('2d');
        Game.canvas.width = Game.width;
        Game.canvas.height = Game.height;
        
        // Setup horror audio
        Game.audio = new HorrorAudio();
        
        // Reset game state
        Game.running = true;
        Game.sanity = 100;
        Game.heartRate = 72;
        Game.filesCollected = 0;
        Game.player.x = Game.width / 2;
        Game.player.y = Game.height / 2;
        Game.player.flashlightBattery = 100;
        Game.keysPressed = {};
        Game.startTime = Date.now();
        Game.activeHorrorEvents = [];
        
        // Generate terrifying map
        generateMap();
        
        // Update UI
        updateUI();
        
        // Hide audio warning
        const audioWarning = document.getElementById('audioWarning');
        if (audioWarning) audioWarning.classList.add('hidden');
        
        // Start game loop
        requestAnimationFrame(gameLoop);
        
        console.log("ASYLUM: Game started");
    }

    // ========================
    // GAME LOGIC - SMOOTH MOVEMENT
    // ========================
    function update() {
        if (!Game.running) return;
        
        // Update time
        Game.survivalTime = Date.now() - Game.startTime;
        
        // Update player
        updatePlayer();
        
        // Update entities
        updateEntities();
        
        // Update horror
        updateHorror();
        
        // Update sanity
        updateSanity();
        
        // Update heart rate
        updateHeartRate();
        
        // Spawn more entities
        if (Date.now() - Game.lastEntitySpawn > 1000 && Game.entities.length < Game.maxEntities) {
            if (Math.random() < Game.config.entitySpawnRate) {
                spawnEntity();
                Game.lastEntitySpawn = Date.now();
            }
        }
        
        // Trigger horror events
        if (Game.sanity < 80 && Math.random() < 0.01) {
            triggerHorrorEvent();
        }
        
        // Update cooldowns
        if (Game.jumpScareCooldown > 0) {
            Game.jumpScareCooldown--;
        }
        
        // Update UI
        updateUI();
        
        // Check win condition
        if (Game.filesCollected >= Game.totalFiles) {
            winGame();
        }
    }

    function updatePlayer() {
        // SMOOTH MOVEMENT - NO WALL STUCK
        const speed = Game.playerRunning ? Game.player.speed * 2 : Game.player.speed;
        const moveX = (Game.keysPressed['d'] || Game.keysPressed['arrowright'] ? 1 : 0) - 
                     (Game.keysPressed['a'] || Game.keysPressed['arrowleft'] ? 1 : 0);
        const moveY = (Game.keysPressed['s'] || Game.keysPressed['arrowdown'] ? 1 : 0) - 
                     (Game.keysPressed['w'] || Game.keysPressed['arrowup'] ? 1 : 0);
        
        if (moveX !== 0 || moveY !== 0) {
            // Normalize diagonal movement
            const magnitude = Math.sqrt(moveX * moveX + moveY * moveY);
            const normX = moveX / magnitude;
            const normY = moveY / magnitude;
            
            // Move player
            Game.player.x += normX * speed;
            Game.player.y += normY * speed;
            
            // Play footsteps
            if (Game.audio && Date.now() - Game.lastFootstep > (Game.playerRunning ? 200 : 400)) {
                Game.audio.playFootstep(Game.playerRunning);
                Game.lastFootstep = Date.now();
            }
            
            // Update player angle for movement direction
            Game.player.angle = Math.atan2(normY, normX);
        }
        
        // Keep player in bounds with buffer
        const buffer = Game.player.radius + 10;
        Game.player.x = Math.max(buffer, Math.min(Game.width - buffer, Game.player.x));
        Game.player.y = Math.max(buffer, Math.min(Game.height - buffer, Game.player.y));
        
        // NO WALL COLLISION - Open map design
        
        // Breathing effect
        if (Date.now() - Game.player.lastBreath > 3000) {
            Game.breathingEffect = 5;
            Game.player.lastBreath = Date.now();
        }
        
        // Flashlight battery drain
        if (Game.playerFlashlight && Game.player.flashlightBattery > 0) {
            Game.player.flashlightBattery -= Game.config.flashlightDrainRate;
            if (Game.player.flashlightBattery <= 0) {
                Game.playerFlashlight = false;
                Game.player.flashlightBattery = 0;
            }
        }
        
        // Toggle flashlight with F
        if (Game.keysPressed['f']) {
            Game.playerFlashlight = !Game.playerFlashlight;
            Game.keysPressed['f'] = false;
        }
        
        // Pick up files with E
        if (Game.keysPressed['e']) {
            Game.files.forEach(file => {
                if (!file.collected && distance(Game.player.x, Game.player.y, file.x, file.y) < 40) {
                    file.collected = true;
                    Game.filesCollected++;
                    Game.sanity = Math.min(100, Game.sanity + 10); // Small sanity boost
                    
                    // Spawn more entities when file collected
                    for (let i = 0; i < 2; i++) {
                        spawnEntity();
                    }
                }
            });
            Game.keysPressed['e'] = false;
        }
    }

    function updateEntities() {
        // Update each entity
        Game.entities.forEach((entity, index) => {
            entity.pulse += 0.05;
            
            // Store position for trail
            entity.trail.unshift({ x: entity.x, y: entity.y });
            if (entity.trail.length > 10) entity.trail.pop();
            
            // Behavior-based movement
            const dx = Game.player.x - entity.x;
            const dy = Game.player.y - entity.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            switch(entity.behavior) {
                case 'stalk':
                    // Slow, deliberate stalking
                    if (dist > 100) {
                        const angle = Math.atan2(dy, dx);
                        entity.x += Math.cos(angle) * entity.speed * 0.7;
                        entity.y += Math.sin(angle) * entity.speed * 0.7;
                    }
                    break;
                    
                case 'charge':
                    // Occasional charges
                    if (entity.chargeCooldown <= 0 && dist < 200 && Math.random() < 0.01) {
                        entity.chargeCooldown = 120;
                        entity.targetAngle = Math.atan2(dy, dx);
                    }
                    
                    if (entity.chargeCooldown > 0) {
                        entity.x += Math.cos(entity.targetAngle) * entity.speed * 2;
                        entity.y += Math.sin(entity.targetAngle) * entity.speed * 2;
                        entity.chargeCooldown--;
                    } else if (dist > 80) {
                        const angle = Math.atan2(dy, dx);
                        entity.x += Math.cos(angle) * entity.speed;
                        entity.y += Math.sin(angle) * entity.speed;
                    }
                    break;
                    
                case 'scream':
                    // Stationary but terrifying
                    if (dist < 150 && Math.random() < 0.001) {
                        if (Game.audio) Game.audio.playScream();
                    }
                    break;
                    
                case 'distort':
                    // Warping movement
                    if (Date.now() - entity.lastBehaviorChange > 2000) {
                        entity.targetAngle = Math.random() * Math.PI * 2;
                        entity.lastBehaviorChange = Date.now();
                    }
                    
                    entity.x += Math.cos(entity.targetAngle) * entity.speed * 0.5;
                    entity.y += Math.sin(entity.targetAngle) * entity.speed * 0.5;
                    
                    // Teleport occasionally
                    if (dist > 300 && Math.random() < 0.002) {
                        entity.x = Game.player.x + (Math.random() - 0.5) * 100;
                        entity.y = Game.player.y + (Math.random() - 0.5) * 100;
                    }
                    break;
            }
            
            // Play sounds
            if (Game.audio && dist < 250 && Date.now() - entity.lastSound > 3000 + Math.random() * 4000) {
                Game.audio.playEntitySound(entity.type, dist);
                entity.lastSound = Date.now();
            }
            
            // Keep entities in bounds
            entity.x = Math.max(entity.radius, Math.min(Game.width - entity.radius, entity.x));
            entity.y = Math.max(entity.radius, Math.min(Game.height - entity.radius, entity.y));
            
            // Check collision with player
            if (dist < Game.player.radius + entity.radius) {
                // Entity touches player
                Game.sanity = Math.max(0, Game.sanity - 20);
                Game.screenShake = 10;
                Game.bloodOverlay = 5;
                
                // Remove entity on contact
                Game.entities.splice(index, 1);
                
                // Spawn replacement
                setTimeout(() => spawnEntity(), 1000);
                
                if (Game.sanity <= 0) {
                    gameOver("Touched by the entity");
                }
            }
        });
        
        // Clean up old horror events
        Game.activeHorrorEvents = Game.activeHorrorEvents.filter(event => event.duration > 0);
        Game.activeHorrorEvents.forEach(event => event.duration--);
    }

    function updateHorror() {
        // Update visual effects
        if (Game.screenShake > 0) Game.screenShake--;
        if (Game.bloodOverlay > 0) Game.bloodOverlay--;
        if (Game.staticOverlay > 0) Game.staticOverlay--;
        if (Game.breathingEffect > 0) Game.breathingEffect--;
        
        // Update flickering lights
        Game.flickeringLights.forEach(light => {
            light.flicker += 0.1;
        });
        
        // Update files glow
        Game.files.forEach(file => {
            if (!file.collected) file.glow += 0.05;
        });
        
        // Update audio intensity
        if (Game.audio) {
            Game.audio.updateIntensity(Game.sanity, Game.heartRate);
        }
    }

    function updateSanity() {
        // Base sanity drain
        Game.sanity -= Game.config.sanityDrainRate;
        
        // Increased drain near entities
        let nearbyEntities = 0;
        Game.entities.forEach(entity => {
            const dist = distance(Game.player.x, Game.player.y, entity.x, entity.y);
            if (dist < 200) nearbyEntities++;
        });
        
        Game.sanity -= nearbyEntities * Game.config.sanityDrainNearEntity;
        
        // Sanity drain in darkness
        if (!Game.playerFlashlight && Game.player.flashlightBattery <= 0) {
            Game.sanity -= 0.1;
        }
        
        // Clamp sanity
        Game.sanity = Math.max(0, Math.min(100, Game.sanity));
        
        // Check sanity break
        if (Game.sanity <= 0) {
            gameOver("Sanity broken");
        }
    }

    function updateHeartRate() {
        // Base heart rate based on sanity
        let targetRate = 72 + (100 - Game.sanity) * 0.8;
        
        // Increase near entities
        Game.entities.forEach(entity => {
            const dist = distance(Game.player.x, Game.player.y, entity.x, entity.y);
            if (dist < 150) {
                targetRate += (150 - dist) * 0.2;
            }
        });
        
        // Increase when running
        if (Game.playerRunning) targetRate += 20;
        
        // Clamp heart rate
        targetRate = Math.min(Game.config.maxHeartRate, targetRate);
        
        // Smoothly adjust heart rate
        Game.heartRate += (targetRate - Game.heartRate) * 0.1;
        
        // Play heartbeat sound
        if (Game.audio && Game.heartRate > 100) {
            if (Date.now() - Game.lastHeartbeat > 60000 / Game.heartRate) {
                Game.audio.playHeartbeat(Game.heartRate);
                Game.lastHeartbeat = Date.now();
            }
        }
    }

    function updateUI() {
        // Update HUD elements
        const sanityValue = document.getElementById('sanityValue');
        const sanityBar = document.getElementById('sanityBar');
        const entityCount = document.getElementById('entityCount');
        const heartRate = document.getElementById('heartRate');
        
        if (sanityValue) sanityValue.textContent = Math.floor(Game.sanity) + '%';
        if (sanityBar) sanityBar.style.width = Game.sanity + '%';
        if (entityCount) entityCount.textContent = Game.entities.length;
        if (heartRate) heartRate.textContent = Math.floor(Game.heartRate) + ' BPM';
        
        // Update blood overlay
        const bloodOverlay = document.getElementById('bloodOverlay');
        if (bloodOverlay) {
            const opacity = Game.bloodOverlay / 30;
            bloodOverlay.style.opacity = opacity;
            bloodOverlay.style.background = `radial-gradient(circle at ${Game.player.x / Game.width * 100}% ${Game.player.y / Game.height * 100}%, rgba(200,0,0,${opacity}) 0%, transparent 70%)`;
        }
        
        // Update static overlay
        const staticOverlay = document.getElementById('staticOverlay');
        if (staticOverlay) {
            staticOverlay.style.opacity = Game.staticOverlay / 10;
        }
        
        // Update breathing effect
        const breathingEffect = document.getElementById('breathingEffect');
        if (breathingEffect) {
            breathingEffect.style.opacity = Game.breathingEffect / 10;
            breathingEffect.style.background = `radial-gradient(circle at center, rgba(255,255,255,${Game.breathingEffect / 20}) 0%, transparent 70%)`;
        }
    }

    // ========================
    // RENDERING - TERRIFYING VISUALS
    // ========================
    function render() {
        if (!Game.ctx || !Game.running) return;
        
        const ctx = Game.ctx;
        
        // Clear with dark color
        ctx.fillStyle = '#0a080a';
        ctx.fillRect(0, 0, Game.width, Game.height);
        
        // Apply screen shake
        ctx.save();
        if (Game.screenShake > 0) {
            ctx.translate(
                (Math.random() - 0.5) * Game.screenShake * 2,
                (Math.random() - 0.5) * Game.screenShake * 2
            );
        }
        
        // Draw floor with subtle texture
        ctx.fillStyle = '#121018';
        ctx.fillRect(0, 0, Game.width, Game.height);
        
        // Draw grid lines for asylum floor
        ctx.strokeStyle = 'rgba(80, 60, 80, 0.1)';
        ctx.lineWidth = 1;
        for (let x = 0; x < Game.width; x += Game.tileSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, Game.height);
            ctx.stroke();
        }
        for (let y = 0; y < Game.height; y += Game.tileSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(Game.width, y);
            ctx.stroke();
        }
        
        // Draw blood stains
        Game.bloodStains.forEach(stain => {
            ctx.fillStyle = `rgba(100, 0, 0, ${stain.opacity})`;
            ctx.beginPath();
            ctx.arc(stain.x, stain.y, stain.size, 0, Math.PI * 2);
            ctx.fill();
            
            // Blood splatter texture
            ctx.fillStyle = `rgba(60, 0, 0, ${stain.opacity * 0.7})`;
            for (let i = 0; i < 5; i++) {
                const angle = (i / 5) * Math.PI * 2;
                const dist = stain.size * 0.7;
                ctx.beginPath();
                ctx.arc(
                    stain.x + Math.cos(angle) * dist,
                    stain.y + Math.sin(angle) * dist,
                    stain.size * 0.3,
                    0, Math.PI * 2
                );
                ctx.fill();
            }
        });
        
        // Draw flickering lights
        Game.flickeringLights.forEach(light => {
            if (light.active) {
                const flicker = Math.sin(light.flicker) * 0.3 + 0.7;
                const radius = light.radius * flicker;
                
                const gradient = ctx.createRadialGradient(
                    light.x, light.y, 0,
                    light.x, light.y, radius
                );
                gradient.addColorStop(0, `rgba(150, 100, 80, ${light.intensity * flicker})`);
                gradient.addColorStop(0.5, `rgba(100, 60, 40, ${light.intensity * flicker * 0.5})`);
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                
                ctx.fillStyle = gradient;
                ctx.fillRect(light.x - radius, light.y - radius, radius * 2, radius * 2);
            }
        });
        
        // Draw pillars
        for (let y = 0; y < Game.mapHeight; y++) {
            for (let x = 0; x < Game.mapWidth; x++) {
                if (Game.tiles[y][x] === 2) {
                    const screenX = x * Game.tileSize;
                    const screenY = y * Game.tileSize;
                    
                    // Pillar shadow
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                    ctx.fillRect(screenX + 5, screenY + 5, Game.tileSize, Game.tileSize);
                    
                    // Pillar
                    ctx.fillStyle = '#2a2430';
                    ctx.fillRect(screenX, screenY, Game.tileSize, Game.tileSize);
                    
                    // Pillar texture
                    ctx.fillStyle = '#3a2c40';
                    ctx.fillRect(screenX + 2, screenY + 2, Game.tileSize - 4, Game.tileSize - 4);
                }
            }
        }
        
        // Draw files
        Game.files.forEach(file => {
            if (!file.collected) {
                const glow = Math.sin(file.glow) * 0.3 + 0.7;
                
                // File glow
                ctx.fillStyle = `rgba(0, 100, 200, ${0.2 * glow})`;
                ctx.beginPath();
                ctx.arc(file.x, file.y, 30, 0, Math.PI * 2);
                ctx.fill();
                
                // File document
                ctx.fillStyle = '#e0e0ff';
                ctx.fillRect(file.x - 10, file.y - 15, 20, 30);
                
                // File text
                ctx.fillStyle = '#006';
                ctx.fillRect(file.x - 8, file.y - 8, 16, 3);
                ctx.fillRect(file.x - 8, file.y - 3, 16, 3);
                ctx.fillRect(file.x - 8, file.y + 2, 16, 3);
            }
        });
        
        // Draw entity trails first
        Game.entities.forEach(entity => {
            entity.trail.forEach((pos, i) => {
                const alpha = 0.3 * (1 - i / entity.trail.length);
                ctx.fillStyle = `rgba(200, 0, 0, ${alpha})`;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, entity.radius * 0.5, 0, Math.PI * 2);
                ctx.fill();
            });
        });
        
        // Draw entities - TERRIFYING DESIGNS
        Game.entities.forEach(entity => {
            const pulse = Math.sin(entity.pulse) * 3;
            const alpha = entity.alpha || 1;
            
            // Entity glow
            ctx.fillStyle = `rgba(200, 0, 0, ${0.1 * alpha})`;
            ctx.beginPath();
            ctx.arc(entity.x, entity.y, entity.radius + 10 + pulse, 0, Math.PI * 2);
            ctx.fill();
            
            // Entity body - different shapes based on type
            ctx.fillStyle = `rgba(100, 0, 0, ${alpha})`;
            
            switch(entity.type) {
                case 0: // Whisperer - Humanoid shape
                    ctx.beginPath();
                    ctx.arc(entity.x, entity.y, entity.radius + pulse, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Arms
                    ctx.beginPath();
                    ctx.arc(entity.x - 15, entity.y, 8 + pulse * 0.5, 0, Math.PI * 2);
                    ctx.arc(entity.x + 15, entity.y, 8 + pulse * 0.5, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Face
                    ctx.fillStyle = `rgba(50, 0, 0, ${alpha})`;
                    ctx.beginPath();
                    ctx.arc(entity.x, entity.y - 5, 6, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                    
                case 1: // Crawler - Low to ground
                    ctx.beginPath();
                    ctx.ellipse(entity.x, entity.y + 5, entity.radius + pulse, entity.radius * 0.7 + pulse, 0, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Multiple limbs
                    for (let i = 0; i < 4; i++) {
                        const angle = (i / 4) * Math.PI * 2;
                        ctx.beginPath();
                        ctx.arc(
                            entity.x + Math.cos(angle) * (entity.radius + 5),
                            entity.y + 5 + Math.sin(angle) * (entity.radius * 0.5),
                            4 + pulse * 0.5,
                            0, Math.PI * 2
                        );
                        ctx.fill();
                    }
                    break;
                    
                case 2: // Screamer - Large, open mouth
                    ctx.beginPath();
                    ctx.arc(entity.x, entity.y, entity.radius + pulse, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Screaming mouth
                    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
                    ctx.beginPath();
                    ctx.arc(entity.x, entity.y + 5, 10 + pulse, 0.2, Math.PI - 0.2);
                    ctx.lineTo(entity.x + 10 + pulse, entity.y + 5);
                    ctx.fill();
                    break;
                    
                case 3: // Distortion - Warped, glitchy
                    ctx.beginPath();
                    for (let i = 0; i < 8; i++) {
                        const angle = (i / 8) * Math.PI * 2;
                        const radius = entity.radius + pulse + Math.sin(entity.pulse * 2 + i) * 5;
                        const x = entity.x + Math.cos(angle) * radius;
                        const y = entity.y + Math.sin(angle) * radius;
                        
                        if (i === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.closePath();
                    ctx.fill();
                    break;
            }
            
            // Entity eyes (always look at player)
            const angleToPlayer = Math.atan2(Game.player.y - entity.y, Game.player.x - entity.x);
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(
                entity.x + Math.cos(angleToPlayer - 0.3) * (entity.radius * 0.5),
                entity.y + Math.sin(angleToPlayer - 0.3) * (entity.radius * 0.5),
                3 + pulse * 0.5, 0, Math.PI * 2
            );
            ctx.arc(
                entity.x + Math.cos(angleToPlayer + 0.3) * (entity.radius * 0.5),
                entity.y + Math.sin(angleToPlayer + 0.3) * (entity.radius * 0.5),
                3 + pulse * 0.5, 0, Math.PI * 2
            );
            ctx.fill();
            
            // Entity pupils
            ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
            ctx.beginPath();
            ctx.arc(
                entity.x + Math.cos(angleToPlayer - 0.3) * (entity.radius * 0.5) + Math.cos(angleToPlayer) * 1.5,
                entity.y + Math.sin(angleToPlayer - 0.3) * (entity.radius * 0.5) + Math.sin(angleToPlayer) * 1.5,
                1.5, 0, Math.PI * 2
            );
            ctx.arc(
                entity.x + Math.cos(angleToPlayer + 0.3) * (entity.radius * 0.5) + Math.cos(angleToPlayer) * 1.5,
                entity.y + Math.sin(angleToPlayer + 0.3) * (entity.radius * 0.5) + Math.sin(angleToPlayer) * 1.5,
                1.5, 0, Math.PI * 2
            );
            ctx.fill();
        });
        
        // Draw active horror events
        Game.activeHorrorEvents.forEach(event => {
            if (event.type === 'jumpScare' && event.entity) {
                const entity = event.entity;
                entity.pulse += 0.2;
                const pulse = Math.sin(entity.pulse) * 10;
                
                // Jump scare entity
                ctx.fillStyle = `rgba(255, 0, 0, ${entity.alpha})`;
                ctx.beginPath();
                ctx.arc(entity.x, entity.y, entity.radius + pulse, 0, Math.PI * 2);
                ctx.fill();
                
                // Screaming face
                ctx.fillStyle = `rgba(0, 0, 0, ${entity.alpha})`;
                ctx.beginPath();
                ctx.arc(entity.x, entity.y, 15 + pulse, 0.3, Math.PI - 0.3);
                ctx.lineTo(entity.x + 20 + pulse, entity.y);
                ctx.fill();
                
                entity.lifetime--;
                entity.alpha = entity.lifetime / 30;
            }
        });
        
        // Draw player flashlight cone
        if (Game.playerFlashlight && Game.player.flashlightBattery > 0) {
            const flashlightAngle = Game.player.angle;
            const flashlightLength = 300;
            const flashlightWidth = Math.PI / 3;
            
            ctx.save();
            ctx.translate(Game.player.x, Game.player.y);
            ctx.rotate(flashlightAngle);
            
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, flashlightLength);
            gradient.addColorStop(0, `rgba(200, 180, 100, ${0.3 * (Game.player.flashlightBattery / 100)})`);
            gradient.addColorStop(0.5, `rgba(150, 120, 60, ${0.1 * (Game.player.flashlightBattery / 100)})`);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, flashlightLength, -flashlightWidth / 2, flashlightWidth / 2);
            ctx.closePath();
            ctx.fill();
            
            ctx.restore();
        }
        
        // Draw player
        ctx.fillStyle = Game.playerFlashlight ? '#8af' : '#48a';
        ctx.beginPath();
        ctx.arc(Game.player.x, Game.player.y, Game.player.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Player face (looks in movement direction)
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(
            Game.player.x + Math.cos(Game.player.angle) * 5,
            Game.player.y + Math.sin(Game.player.angle) * 5,
            4, 0, Math.PI * 2
        );
        ctx.fill();
        
        // Player fear indicator (pulse with heart rate)
        const heartPulse = Math.sin(Date.now() / (60000 / Game.heartRate)) * 2;
        ctx.strokeStyle = `rgba(255, 0, 0, ${0.3 + (100 - Game.sanity) / 200})`;
        ctx.lineWidth = 2 + heartPulse;
        ctx.beginPath();
        ctx.arc(Game.player.x, Game.player.y, Game.player.radius + 5 + heartPulse, 0, Math.PI * 2);
        ctx.stroke();
        
        // Flashlight battery indicator
        if (Game.playerFlashlight) {
            ctx.fillStyle = `rgba(200, 180, 100, ${Game.player.flashlightBattery / 100})`;
            ctx.fillRect(Game.player.x - 15, Game.player.y + 20, 30, 3);
            ctx.strokeStyle = '#666';
            ctx.strokeRect(Game.player.x - 15, Game.player.y + 20, 30, 3);
        }
        
        // Draw darkness overlay (fog of war)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, Game.width, Game.height);
        
        // Player light radius
        const playerLightRadius = Game.playerFlashlight ? 150 : 80;
        const gradient = ctx.createRadialGradient(
            Game.player.x, Game.player.y, 0,
            Game.player.x, Game.player.y, playerLightRadius
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.6)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, Game.width, Game.height);
        
        ctx.restore();
    }

    // ========================
    // GAME FLOW
    // ========================
    function gameOver(message) {
        Game.running = false;
        
        const deathScreen = document.getElementById('deathScreen');
        const deathMessage = document.getElementById('deathMessage');
        const survivalTime = document.getElementById('survivalTime');
        const entitiesEncountered = document.getElementById('entitiesEncountered');
        const filesCollected = document.getElementById('filesCollected');
        
        if (deathMessage) deathMessage.textContent = message;
        if (survivalTime) {
            const minutes = Math.floor(Game.survivalTime / 60000);
            const seconds = Math.floor((Game.survivalTime % 60000) / 1000);
            survivalTime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
        if (entitiesEncountered) entitiesEncountered.textContent = Game.entities.length;
        if (filesCollected) filesCollected.textContent = Game.filesCollected;
        
        if (deathScreen) deathScreen.classList.add('visible');
        
        // Play final horror sound
        if (Game.audio) {
            setTimeout(() => Game.audio.playJumpScare(), 500);
        }
        
        console.log("GAME OVER:", message);
    }

    function winGame() {
        Game.running = false;
        
        const winScreen = document.getElementById('winScreen');
        const finalSanity = document.getElementById('finalSanity');
        const finalFiles = document.getElementById('finalFiles');
        
        if (finalSanity) finalSanity.textContent = Math.floor(Game.sanity) + '%';
        if (finalFiles) finalFiles.textContent = Game.filesCollected;
        
        if (winScreen) winScreen.classList.add('visible');
        
        console.log("ESCAPED! Sanity remaining:", Game.sanity);
    }

    function restartGame() {
        Game.running = false;
        
        const deathScreen = document.getElementById('deathScreen');
        const winScreen = document.getElementById('winScreen');
        
        if (deathScreen) deathScreen.classList.remove('visible');
        if (winScreen) winScreen.classList.remove('visible');
        
        setTimeout(() => {
            initGame();
        }, 500);
    }

    // ========================
    // GAME LOOP
    // ========================
    function gameLoop() {
        update();
        render();
        requestAnimationFrame(gameLoop);
    }

    // ========================
    // INPUT HANDLING
    // ========================
    document.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        Game.keysPressed[key] = true;
        
        if (key === 'shift') {
            Game.playerRunning = true;
        }
        
        if (key === 'r' && !Game.running) {
            restartGame();
        }
    });

    document.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        Game.keysPressed[key] = false;
        
        if (key === 'shift') {
            Game.playerRunning = false;
        }
    });

    // Mouse look
    document.addEventListener('mousemove', (e) => {
        if (!Game.canvas || !Game.running) return;
        
        const rect = Game.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Smooth mouse look
        const targetAngle = Math.atan2(mouseY - Game.player.y, mouseX - Game.player.x);
        const angleDiff = targetAngle - Game.player.angle;
        Game.player.angle += angleDiff * 0.3;
    });

    // Start button
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            const startScreen = document.getElementById('startScreen');
            if (startScreen) startScreen.classList.remove('visible');
            
            // Activate audio first
            if (Game.audio) {
                Game.audio.resume();
            }
            
            setTimeout(() => {
                initGame();
            }, 1000);
        });
    }

    // Restart button
    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) {
        restartBtn.addEventListener('click', restartGame);
    }

    // Continue button
    const continueBtn = document.getElementById('continueBtn');
    if (continueBtn) {
        continueBtn.addEventListener('click', restartGame);
    }

    // Activate audio on any click
    document.addEventListener('click', () => {
        if (Game.audio) {
            Game.audio.resume();
            
            const audioWarning = document.getElementById('audioWarning');
            if (audioWarning) audioWarning.classList.add('hidden');
        }
    }, { once: true });

    // ========================
    // UTILITY FUNCTIONS
    // ========================
    function distance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    }
    
    console.log("ASYLUM: Ready to descend into madness...");
});
