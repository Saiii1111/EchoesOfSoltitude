const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.width = 320;
canvas.height = 200;

// ===== MAP =====
const map = [
  "####################",
  "#........#.........#",
  "#.######.#.#####...#",
  "#.#......#.....#..#",
  "#.#.###########.#..#",
  "#.#.............#..#",
  "#.###############..#",
  "#.................E#",
  "####################"
];

const tileSize = 16;

// ===== PLAYER =====
const player = {
  x: 32,
  y: 32,
  speed: 1,
  fear: 0
};

// ===== MONSTER =====
const monster = {
  x: 256,
  y: 128,
  speed: 0.4,
  active: false
};

// ===== AUDIO =====
let audioCtx, ambient, gain;
let started = false;

function startAudio() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  ambient = audioCtx.createOscillator();
  ambient.type = "sine";
  ambient.frequency.value = 30;

  gain = audioCtx.createGain();
  gain.gain.value = 0.05;

  ambient.connect(gain);
  gain.connect(audioCtx.destination);
  ambient.start();
}

// ===== INPUT =====
const keys = {};
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

document.body.addEventListener("click", () => {
  if (!started) {
    startAudio();
    document.getElementById("hint").remove();
    started = true;
  }
});

// ===== HELPERS =====
function wallAt(x, y) {
  const mx = Math.floor(x / tileSize);
  const my = Math.floor(y / tileSize);
  return map[my][mx] === "#";
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// ===== UPDATE =====
function update() {
  let nx = player.x;
  let ny = player.y;
  let moving = false;

  if (keys["w"] || keys["ArrowUp"]) { ny -= player.speed; moving = true; }
  if (keys["s"] || keys["ArrowDown"]) { ny += player.speed; moving = true; }
  if (keys["a"] || keys["ArrowLeft"]) { nx -= player.speed; moving = true; }
  if (keys["d"] || keys["ArrowRight"]) { nx += player.speed; moving = true; }

  if (!wallAt(nx, ny)) {
    player.x = nx;
    player.y = ny;
  }

  // Fear logic
  const d = distance(player, monster);
  if (d < 100) {
    player.fear = Math.min(1, player.fear + 0.002);
    monster.active = true;
  } else {
    player.fear = Math.max(0, player.fear - 0.001);
  }

  gain.gain.value = 0.05 + player.fear * 0.15;
  ambient.frequency.value = 30 + player.fear * 60;

  // Monster movement (listens)
  if (monster.active && moving) {
    const ang = Math.atan2(player.y - monster.y, player.x - monster.x);
    monster.x += Math.cos(ang) * monster.speed;
    monster.y += Math.sin(ang) * monster.speed;
  }

  // Death
  if (d < 8) {
    alert("You were not alone.");
    location.reload();
  }

  // Escape
  const tile = map[Math.floor(player.y / tileSize)][Math.floor(player.x / tileSize)];
  if (tile === "E") {
    alert("You escaped.\nBut something followed.");
    location.reload();
  }
}

// ===== DRAW =====
function draw() {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Darkness
  ctx.fillStyle = "rgba(0,0,0,0.8)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Light radius
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(player.x, player.y, 40 - player.fear * 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Map
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      if (map[y][x] === "#") {
        ctx.fillStyle = "#222";
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
      }
      if (map[y][x] === "E") {
        ctx.fillStyle = "white";
        ctx.fillRect(x * tileSize + 4, y * tileSize + 4, 8, 8);
      }
    }
  }

  // Monster (barely visible)
  if (monster.active) {
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(monster.x - 4, monster.y - 4, 8, 8);
  }

  // Player
  ctx.fillStyle = "white";
  ctx.fillRect(player.x - 2, player.y - 2, 4, 4);

  // Title
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText("Echoes Of Solitude", 6, 12);
}

// ===== LOOP =====
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
