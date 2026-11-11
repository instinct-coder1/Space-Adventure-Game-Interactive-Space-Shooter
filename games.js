(() => {
  const welcomeScreen = document.getElementById('welcomeScreen');
  const gameScreen = document.getElementById('gameScreen');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const resumeBtn = document.getElementById('resumeBtn');
  const restartBtn = document.getElementById('restartBtn');
  const homeBtn = document.getElementById('homeBtn');
  const pauseOverlay = document.getElementById('pauseOverlay');
  const gameOverOverlay = document.getElementById('gameOverOverlay');
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const scoreValue = document.getElementById('scoreValue');
  const livesValue = document.getElementById('livesValue');
  const levelValue = document.getElementById('levelValue');
  const finalScore = document.getElementById('finalScore');
  const waveValue = document.getElementById('waveValue');

  const LEVELS = {
    easy: { label: 'ROOKIE', enemySpeed: 1.45, spawnRate: 1050, lives: 4 },
    normal: { label: 'PILOT', enemySpeed: 2.0, spawnRate: 850, lives: 3 },
    hard: { label: 'ACE', enemySpeed: 2.65, spawnRate: 650, lives: 2 }
  };

  let selectedLevel = 'easy';
  let config = LEVELS.easy;
  let player, bullets, enemies, particles, stars, score, lives, frame, spawnClock;
  let running = false, paused = false, animationId = null, lastTime = 0;
  const keys = Object.create(null);

  document.querySelectorAll('.difficulty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedLevel = btn.dataset.level;
    });
  });

  function makeStars() {
    stars = Array.from({ length: 95 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      size: Math.random() * 1.8 + .3, speed: Math.random() * 1.1 + .35,
      alpha: Math.random() * .65 + .2
    }));
  }

  function resetGame() {
    config = LEVELS[selectedLevel];
    player = { x: canvas.width / 2, y: canvas.height - 62, w: 38, h: 43, speed: 5.2, cooldown: 0, invulnerable: 0 };
    bullets = []; enemies = []; particles = [];
    score = 0; lives = config.lives; frame = 0; spawnClock = 0;
    makeStars(); updateHud();
    levelValue.textContent = config.label;
    waveValue.textContent = 'WAVE 01';
  }

  function updateHud() {
    scoreValue.textContent = String(score).padStart(6, '0');
    livesValue.textContent = Array.from({ length: config.lives }, (_, i) => i < lives ? '♥' : '♡').join(' ');
  }

  function startGame() {
    cancelAnimationFrame(animationId);
    resetGame();
    welcomeScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    pauseOverlay.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');
    running = true; paused = false; lastTime = performance.now();
    animationId = requestAnimationFrame(loop);
  }

  function pauseGame() {
    if (!running) return;
    paused = !paused;
    pauseOverlay.classList.toggle('hidden', !paused);
    pauseBtn.innerHTML = paused ? '▶ <span>RESUME</span>' : 'Ⅱ <span>PAUSE</span>';
    if (!paused) { lastTime = performance.now(); animationId = requestAnimationFrame(loop); }
  }

  function endGame() {
    running = false; paused = false;
    finalScore.textContent = score.toLocaleString();
    gameOverOverlay.classList.remove('hidden');
    cancelAnimationFrame(animationId);
  }

  function spawnEnemy() {
    const size = 28 + Math.random() * 13;
    enemies.push({
      x: 24 + Math.random() * (canvas.width - 48), y: -size,
      w: size, h: size * .82,
      speed: config.enemySpeed + Math.min(score / 650, 2.4) + Math.random() * .8,
      drift: (Math.random() - .5) * 1.25,
      phase: Math.random() * Math.PI * 2,
      color: Math.random() > .5 ? '#ff668d' : '#a47bff'
    });
  }

  function shoot() {
    if (player.cooldown > 0) return;
    bullets.push({ x: player.x, y: player.y - 25, speed: 8.5, radius: 3 });
    player.cooldown = 15;
    addParticles(player.x, player.y - 25, '#5deaff', 3);
  }

  function addParticles(x, y, color, count = 9) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + .7;
      particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 22 + Math.random() * 16, maxLife: 38, color, size: Math.random() * 3 + 1 });
    }
  }

  function rectHit(a, b) {
    return Math.abs(a.x - b.x) < (a.w + b.w) / 2 &&
           Math.abs(a.y - b.y) < (a.h + b.h) / 2;
  }

  function update(dt) {
    frame++;
    const step = Math.min(dt / 16.67, 2.2);
    stars.forEach(s => {
      s.y += s.speed * step;
      if (s.y > canvas.height) { s.y = 0; s.x = Math.random() * canvas.width; }
    });

    const move = player.speed * step;
    if (keys.ArrowLeft || keys.a || keys.A) player.x -= move;
    if (keys.ArrowRight || keys.d || keys.D) player.x += move;
    if (keys.ArrowUp || keys.w || keys.W) player.y -= move;
    if (keys.ArrowDown || keys.s || keys.S) player.y += move;
    player.x = Math.max(24, Math.min(canvas.width - 24, player.x));
    player.y = Math.max(30, Math.min(canvas.height - 28, player.y));
    if (player.cooldown > 0) player.cooldown--;
    if (player.invulnerable > 0) player.invulnerable--;

    if (keys.Space) shoot();
    bullets.forEach(b => b.y -= b.speed * step);
    bullets = bullets.filter(b => b.y > -12);

    spawnClock += dt;
    const interval = Math.max(320, config.spawnRate - score * .35);
    if (spawnClock >= interval) { spawnEnemy(); spawnClock = 0; }

    enemies.forEach(e => {
      e.y += e.speed * step;
      e.x += (e.drift + Math.sin(frame * .025 + e.phase) * .6) * step;
      if (e.x < e.w / 2 || e.x > canvas.width - e.w / 2) e.drift *= -1;
    });

    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      let destroyed = false;
      for (let j = bullets.length - 1; j >= 0; j--) {
        const bullet = bullets[j];
        if (Math.abs(bullet.x - enemy.x) < enemy.w * .55 && Math.abs(bullet.y - enemy.y) < enemy.h * .6) {
          bullets.splice(j, 1); enemies.splice(i, 1); addParticles(enemy.x, enemy.y, enemy.color, 14);
          score += 10; updateHud(); destroyed = true; break;
        }
      }
      if (destroyed) continue;
      if (enemy.y > canvas.height + 30) { enemies.splice(i, 1); continue; }
      if (player.invulnerable === 0 && rectHit(
        { x: player.x, y: player.y, w: 25, h: 30 },
        { x: enemy.x, y: enemy.y, w: enemy.w * .8, h: enemy.h * .8 }
      )) {
        enemies.splice(i, 1); addParticles(player.x, player.y, '#ff718f', 18);
        lives--; player.invulnerable = 75; updateHud();
        if (lives <= 0) { endGame(); return; }
      }
    }

    particles.forEach(p => { p.x += p.vx * step; p.y += p.vy * step; p.life -= step; });
    particles = particles.filter(p => p.life > 0);
    if (score >= 150) waveValue.textContent = 'WAVE 02';
    if (score >= 400) waveValue.textContent = 'WAVE 03';
  }

  function drawShip(x, y) {
    ctx.save(); ctx.translate(x, y);
    ctx.shadowBlur = 18; ctx.shadowColor = '#5deaff';
    ctx.fillStyle = '#7ceeff';
    ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(18, 17); ctx.lineTo(7, 12);
    ctx.lineTo(0, 18); ctx.lineTo(-7, 12); ctx.lineTo(-18, 17); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 8; ctx.fillStyle = '#e8fcff';
    ctx.beginPath(); ctx.ellipse(0, -5, 5, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7389ff';
    ctx.beginPath(); ctx.moveTo(-5, 17); ctx.lineTo(0, 29 + Math.random() * 7); ctx.lineTo(5, 17); ctx.fill();
    ctx.restore();
  }

  function drawEnemy(e) {
    ctx.save(); ctx.translate(e.x, e.y); ctx.shadowBlur = 14; ctx.shadowColor = e.color;
    ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.moveTo(0, e.h * .48); ctx.lineTo(-e.w * .5, -e.h * .25);
    ctx.lineTo(-e.w * .18, -e.h * .12); ctx.lineTo(0, -e.h * .48);
    ctx.lineTo(e.w * .18, -e.h * .12); ctx.lineTo(e.w * .5, -e.h * .25); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.globalAlpha = .7; ctx.fillRect(-3, -5, 6, 5);
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#080e27'); gradient.addColorStop(1, '#08091b');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => {
      ctx.globalAlpha = s.alpha; ctx.fillStyle = '#dceaff';
      ctx.fillRect(s.x, s.y, s.size, s.size);
    });
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(93,234,255,.07)'; ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
    for (let y = 0; y < canvas.height; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }

    bullets.forEach(b => {
      ctx.save(); ctx.shadowBlur = 15; ctx.shadowColor = '#5deaff';
      ctx.fillStyle = '#a9faff'; ctx.fillRect(b.x - 2, b.y - 10, 4, 16); ctx.restore();
    });
    enemies.forEach(drawEnemy);
    particles.forEach(p => {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife); ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
    if (player && (player.invulnerable === 0 || Math.floor(frame / 5) % 2 === 0)) drawShip(player.x, player.y);
  }

  function loop(now) {
    if (!running || paused) return;
    const dt = Math.min(now - lastTime, 40); lastTime = now;
    update(dt); draw();
    if (running) animationId = requestAnimationFrame(loop);
  }

  window.addEventListener('keydown', e => {
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
    keys[e.code === 'Space' ? 'Space' : e.key] = true;
    if (e.key.toLowerCase() === 'p' && !e.repeat && gameScreen.classList.contains('hidden') === false) pauseGame();
  });
  window.addEventListener('keyup', e => { keys[e.code === 'Space' ? 'Space' : e.key] = false; });
  window.addEventListener('blur', () => { if (running && !paused) pauseGame(); });

  startBtn.addEventListener('click', startGame);
  pauseBtn.addEventListener('click', pauseGame);
  resumeBtn.addEventListener('click', pauseGame);
  restartBtn.addEventListener('click', startGame);
  homeBtn.addEventListener('click', () => {
    running = false; cancelAnimationFrame(animationId);
    gameScreen.classList.add('hidden'); welcomeScreen.classList.remove('hidden');
  });

  makeStars();
})();
