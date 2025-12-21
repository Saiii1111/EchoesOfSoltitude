// Echoes of Solitude - Retro Arcade Horror Game
// Audio Context for generated sounds
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Sound Generator
const Sound = {
  playFootstep: () => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = 80;
    gain.gain.value = 0.1;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    osc.stop(audioCtx.currentTime + 0.1);
  },

  playAmbient: () => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();
    
    lfo.frequency.value = 0.5;
    lfoGain.gain.value = 20;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    
    osc.type = 'sine';
    osc.frequency.value = 60;
    gain.gain.value = 0.15;
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    lfo.start();
    
    return { osc, lfo, gain };
  },

  playScreech: () => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sawtooth';
    osc.frequency.value = 1200;
    gain.gain.value = 0.3;
    osc.start();
    osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    osc.stop(audioCtx.currentTime + 0.5);
  },

  playHeartbeat: () => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = 50;
    gain.gain.value = 0;
    osc.start();
    gain.gain.linearRampToValueAtTime(0.4, audioCtx.currentTime + 0.05);
    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.1);
    osc.stop(audioCtx.currentTime + 0.15);
  },

  playGlitch: () => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'square';
    osc.frequency.value = Math.random() * 1000 + 200;
    gain.gain.value = 0.2;
    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
  },

  playDeath: () => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sawtooth';
    osc.frequency.value = 400;
    gain.gain.value = 0.4;
    osc.start();
    osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 2);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 2);
    osc.stop(audioCtx.currentTime + 2);
  }
};

// Game State
const game = {
  canvas: null,
  ctx: null,
  player: { x: 100, y: 100, size: 16, speed: 2, sanity: 100, health: 100 },
  entities: [],
  walls: [],
  darkness: 100,
  glitchIntensity: 0,
  keys: {},
  messages: [],
  gameOver: false,
  level: 1,
  timeInDarkness: 0,
  ambient: null,
  heartbeatInterval: null,
  bloodParticles: []
};

// Traumatic messages
const traumaticMessages = [
  "IT SEES YOU",
  "YOU CANT ESCAPE",
  "THEY ARE INSIDE",
  "NO ONE IS COMING",
  "YOU ARE ALONE",
  "IT KNOWS YOUR NAME",
  "BEHIND YOU",
  "DONT LOOK BACK",
  "WHY DID YOU COME HERE",
  "THEY WANT YOU TO STAY",
  "THE WALLS ARE BREATHING",
  "YOU HEAR YOUR OWN SCREAMING",
  "THIS IS YOUR FAULT",
  "REMEMBER WHAT YOU DID",
  "THEY NEVER LEFT",
  "IT WAS ALWAYS HERE"
];

// Entity Types (enemies)
class Entity {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.speed = type === 'stalker' ? 0.8 : type === 'screamer' ? 1.5 : 0.5;
    this.size = 20;
    this.frame = 0;
    this.visible = type !== 'shadow';
    this.chasePlayer = false;
    this.aiTimer = Math.random() * 100;
  }

  update() {
    this.frame++;
    this.aiTimer++;

    const dx = game.player.x - this.x;
    const dy = game.player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 150) {
      this.chasePlayer = true;
      if (this.type === 'screamer' && Math.random() < 0.01) {
        Sound.playScreech();
        game.glitchIntensity = 1;
      }
    }

    if (this.chasePlayer) {
      const angle = Math.atan2(dy, dx);
      this.x += Math.cos(angle) * this.speed;
      this.y += Math.sin(angle) * this.speed;
    } else {
      if (this.aiTimer % 120 === 0) {
        this.targetX = Math.random() * game.canvas.width;
        this.targetY = Math.random() * game.canvas.height;
      }
      if (this.targetX && this.targetY) {
        const tdx = this.targetX - this.x;
        const tdy = this.targetY - this.y;
        const angle = Math.atan2(tdy, tdx);
        this.x += Math.cos(angle) * this.speed * 0.5;
        this.y += Math.sin(angle) * this.speed * 0.5;
      }
    }

    if (dist < 30) {
      game.player.health -= 0.5;
      game.player.sanity -= 0.3;
      if (Math.random() < 0.05) Sound.playGlitch();
      
      for (let i = 0; i < 3; i++) {
        game.bloodParticles.push({
          x: game.player.x,
          y: game.player.y,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          life: 60
        });
      }
    }
  }

  draw() {
    const ctx = game.ctx;
    ctx.save();
    
    if (this.type === 'stalker') {
      ctx.fillStyle = `rgba(150, 0, 0, ${0.8 + Math.sin(this.frame * 0.1) * 0.2})`;
      ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
      ctx.fillStyle = 'rgba(255, 0, 0, 0.9)';
      ctx.fillRect(this.x - 4, this.y - 8, 3, 3);
      ctx.fillRect(this.x + 2, this.y - 8, 3, 3);
    } else if (this.type === 'screamer') {
      ctx.fillStyle = `rgba(200, 200, 200, ${0.6 + Math.sin(this.frame * 0.2) * 0.4})`;
      for (let i = 0; i < 8; i++) {
        const angle = (this.frame * 0.1) + (i * Math.PI / 4);
        const x = this.x + Math.cos(angle) * (this.size/2);
        const y = this.y + Math.sin(angle) * (this.size/2);
        ctx.fillRect(x - 2, y - 2, 4, 4);
      }
    } else if (this.type === 'shadow') {
      if (Math.random() < 0.3) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
      }
    }
    
    ctx.restore();
  }
}

// Initialize game
function init() {
  game.canvas = document.getElementById('gameCanvas');
  game.ctx = game.canvas.getContext('2d');
  
  game.canvas.width = 800;
  game.canvas.height = 600;

  // Create maze walls
  for (let i = 0; i < 15; i++) {
    game.walls.push({
      x: Math.random() * (game.canvas.width - 100),
      y: Math.random() * (game.canvas.height - 100),
      w: Math.random() * 100 + 50,
      h: Math.random() * 100 + 50
    });
  }

  spawnEntities();
  
  game.ambient = Sound.playAmbient();
  
  game.heartbeatInterval = setInterval(() => {
    if (game.player.sanity < 50) {
      Sound.playHeartbeat();
      setTimeout(() => Sound.playHeartbeat(), 150);
    }
  }, 1000);

  document.addEventListener('keydown', (e) => game.keys[e.key] = true);
  document.addEventListener('keyup', (e) => game.keys[e.key] = false);

  gameLoop();
}

function spawnEntities() {
  const types = ['stalker', 'screamer', 'shadow'];
  const count = 3 + game.level;
  
  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const x = Math.random() * game.canvas.width;
    const y = Math.random() * game.canvas.height;
    game.entities.push(new Entity(x, y, type));
  }
}

function showMessage(text) {
  game.messages.push({ text, life: 180, y: 50 + game.messages.length * 30 });
  Sound.playGlitch();
}

// Game Loop
function gameLoop() {
  if (game.gameOver) {
    drawGameOver();
    return;
  }

  update();
  draw();
  requestAnimationFrame(gameLoop);
}

function update() {
  // Player movement
  let moved = false;
  const oldX = game.player.x;
  const oldY = game.player.y;

  if (game.keys['ArrowUp'] || game.keys['w']) {
    game.player.y -= game.player.speed;
    moved = true;
  }
  if (game.keys['ArrowDown'] || game.keys['s']) {
    game.player.y += game.player.speed;
    moved = true;
  }
  if (game.keys['ArrowLeft'] || game.keys['a']) {
    game.player.x -= game.player.speed;
    moved = true;
  }
  if (game.keys['ArrowRight'] || game.keys['d']) {
    game.player.x += game.player.speed;
    moved = true;
  }

  if (moved && Math.random() < 0.1) {
    Sound.playFootstep();
  }

  // Wall collision
  for (let wall of game.walls) {
    if (game.player.x > wall.x && game.player.x < wall.x + wall.w &&
        game.player.y > wall.y && game.player.y < wall.y + wall.h) {
      game.player.x = oldX;
      game.player.y = oldY;
    }
  }

  // Keep player in bounds
  game.player.x = Math.max(game.player.size, Math.min(game.canvas.width - game.player.size, game.player.x));
  game.player.y = Math.max(game.player.size, Math.min(game.canvas.height - game.player.size, game.player.y));

  // Update entities
  game.entities.forEach(e => e.update());

  // Sanity drain
  game.player.sanity -= 0.02;
  
  if (game.player.sanity < 30 && Math.random() < 0.01) {
    showMessage(traumaticMessages[Math.floor(Math.random() * traumaticMessages.length)]);
  }

  // Glitch effect
  if (game.glitchIntensity > 0) {
    game.glitchIntensity -= 0.02;
  }

  // Update messages
  game.messages = game.messages.filter(m => {
    m.life--;
    return m.life > 0;
  });

  // Update blood particles
  game.bloodParticles = game.bloodParticles.filter(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.2;
    p.life--;
    return p.life > 0;
  });

  // Check death
  if (game.player.health <= 0 || game.player.sanity <= 0) {
    game.gameOver = true;
    Sound.playDeath();
    if (game.ambient) {
      game.ambient.osc.stop();
      game.ambient.lfo.stop();
    }
    clearInterval(game.heartbeatInterval);
  }

  // Level progression
  if (game.entities.length === 0) {
    game.level++;
    spawnEntities();
    showMessage(`LEVEL ${game.level} - THEY MULTIPLY`);
  }
}

function draw() {
  const ctx = game.ctx;
  
  // Background
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, game.canvas.width, game.canvas.height);

  // Glitch effect
  if (game.glitchIntensity > 0 || Math.random() < 0.02) {
    ctx.save();
    ctx.translate(Math.random() * 10 - 5, Math.random() * 10 - 5);
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = `rgba(${Math.random() * 255}, 0, 0, 0.3)`;
      ctx.fillRect(Math.random() * game.canvas.width, Math.random() * game.canvas.height, 
                   Math.random() * 200, Math.random() * 5);
    }
    ctx.restore();
  }

  // Walls
  ctx.fillStyle = '#222';
  game.walls.forEach(wall => {
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
  });

  // Blood particles
  game.bloodParticles.forEach(p => {
    ctx.fillStyle = `rgba(139, 0, 0, ${p.life / 60})`;
    ctx.fillRect(p.x, p.y, 3, 3);
  });

  // Entities
  game.entities.forEach(e => e.draw());

  // Player
  ctx.fillStyle = '#00ff00';
  ctx.fillRect(game.player.x - game.player.size/2, game.player.y - game.player.size/2, 
               game.player.size, game.player.size);

  // Vignette effect based on sanity
  const gradient = ctx.createRadialGradient(
    game.canvas.width/2, game.canvas.height/2, 100,
    game.canvas.width/2, game.canvas.height/2, game.canvas.width
  );
  const vignetteStrength = (100 - game.player.sanity) / 100;
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(1, `rgba(139, 0, 0, ${vignetteStrength * 0.8})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, game.canvas.width, game.canvas.height);

  // UI
  ctx.fillStyle = '#0f0';
  ctx.font = '14px monospace';
  ctx.fillText(`HEALTH: ${'█'.repeat(Math.floor(game.player.health / 10))}`, 10, 20);
  
  ctx.fillStyle = game.player.sanity < 30 ? '#f00' : '#0ff';
  ctx.fillText(`SANITY: ${'█'.repeat(Math.floor(game.player.sanity / 10))}`, 10, 40);
  
  ctx.fillStyle = '#fff';
  ctx.fillText(`LEVEL: ${game.level}`, 10, 60);
  ctx.fillText(`ENTITIES: ${game.entities.length}`, 10, 80);

  // Messages
  game.messages.forEach((msg, i) => {
    const alpha = Math.min(msg.life / 60, 1);
    ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
    ctx.font = 'bold 24px monospace';
    const x = game.canvas.width/2 - ctx.measureText(msg.text).width/2;
    ctx.fillText(msg.text, x + Math.random() * 4 - 2, msg.y + Math.random() * 4 - 2);
  });

  // Scanlines
  for (let y = 0; y < game.canvas.height; y += 4) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, y, game.canvas.width, 2);
  }
}

function drawGameOver() {
  const ctx = game.ctx;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, game.canvas.width, game.canvas.height);
  
  ctx.fillStyle = '#f00';
  ctx.font = 'bold 48px monospace';
  let text = game.player.health <= 0 ? 'YOU DIED' : 'YOU WENT INSANE';
  ctx.fillText(text, game.canvas.width/2 - ctx.measureText(text).width/2, game.canvas.height/2);
  
  ctx.font = '20px monospace';
  ctx.fillStyle = '#fff';
  text = `SURVIVED ${game.level} LEVELS`;
  ctx.fillText(text, game.canvas.width/2 - ctx.measureText(text).width/2, game.canvas.height/2 + 50);
  
  ctx.fillStyle = '#888';
  text = 'REFRESH TO TRY AGAIN';
  ctx.fillText(text, game.canvas.width/2 - ctx.measureText(text).width/2, game.canvas.height/2 + 100);
}

// Start game when page loads
window.addEventListener('load', init);
