class ColorJourneyGame {
  constructor(canvas, sentiment) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.sentiment = sentiment;

    // --- NEW: Game State ---
    this.paused = false; // Tracks if the game is paused
    this.running = false;
    this.lastTime = null;
    this.rafId = null;

    // Player
    this.player = {
      x: 0, y: 0, size: 30, vx: 0, vy: 0,
      onGround: true, color: "#fff",
    };

    // World
    this.clouds = [];
    this.orbs = [];
    this.collected = 0;
    this.targetCollected = 20;
    this.spawnTimer = 0;
    this.nextSpawnAt = this.randomSpawnInterval();
    this.groundY = 0;

    // Keys
    this.keys = {};
    
    // Bind methods
    this.animate = this.animate.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onResize = this.onResize.bind(this);

    this.onResize();
    this.initClouds();
    this.player.x = this.canvas.width / 6;
    this.player.y = this.groundY - 100;
  }

  // --- NEW: Pause Method ---
  // This is called by the UI in index.html
  togglePause() {
    this.paused = !this.paused;
    if (!this.paused) {
      // If we are unpausing, restart the animation loop
      this.lastTime = null; // Reset delta time to prevent a large jump
      this.rafId = requestAnimationFrame(this.animate);
    }
    return this.paused;
  }

  // --- Lifecycle Methods ---
  start() {
    this.running = true;
    this.lastTime = null;
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("resize", this.onResize);

    // --- BUG FIX ---
    // The container's animation takes time. We force a resize after a
    // tiny delay to ensure the canvas gets the correct final dimensions.
    setTimeout(() => this.onResize(), 10);

    this.rafId = requestAnimationFrame(this.animate);
  }

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("resize", this.onResize);
  }

  // Event Handlers
  onKeyDown(e) { this.keys[e.key] = true; }
  onKeyUp(e) { this.keys[e.key] = false; }

  onResize() {
    const container = this.canvas.parentElement;
    if (!container) return;
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
    this.groundY = this.canvas.height - 80;
    this.initClouds();
  }

  // Game Logic
  randomSpawnInterval() { return 0.8 + Math.random() * 1.5; }

  initClouds() {
    this.clouds = [];
    for (let i = 0; i < 6; i++) {
        this.clouds.push({
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height * 0.3,
            rx: 100 + Math.random() * 150,
            ry: 40 + Math.random() * 60,
            speed: 20 + Math.random() * 50,
        });
    }
  }

  createOrb() {
    this.orbs.push({
        x: Math.random() * (this.canvas.width - 40) + 20,
        y: -20,
        size: 12 + Math.random() * 8,
        speed: 80 + Math.random() * 160,
        color: `hsl(${Math.floor(Math.random() * 60 + 40)}, 90%, 55%)`,
    });
  }

  // --- UPDATED: Main Game Loop ---
  animate(ts) {
    // If paused or not running, stop the loop
    if (this.paused || !this.running) {
        return;
    }
    
    if (!this.lastTime) this.lastTime = ts;
    const dt = (ts - this.lastTime) / 1000;
    this.lastTime = ts;

    this.update(dt);
    this.draw();

    this.rafId = requestAnimationFrame(this.animate);
  }

  update(dt) {
    const gravity = 1500;

    this.spawnTimer += dt;
    if (this.spawnTimer >= this.nextSpawnAt) {
        this.createOrb();
        this.spawnTimer = 0;
        this.nextSpawnAt = this.randomSpawnInterval();
    }

    // Player movement
    if (this.keys["ArrowLeft"] || this.keys["a"]) this.player.x -= 320 * dt;
    if (this.keys["ArrowRight"] || this.keys["d"]) this.player.x += 320 * dt;
    if ((this.keys[" "] || this.keys["Spacebar"]) && this.player.onGround) {
        this.player.vy = -600;
        this.player.onGround = false;
    }

    this.player.vy += gravity * dt;
    this.player.y += this.player.vy * dt;

    if (this.player.y + this.player.size > this.groundY) {
        this.player.y = this.groundY - this.player.size;
        this.player.vy = 0;
        this.player.onGround = true;
    }

    if (this.player.x < 0) this.player.x = 0;
    if (this.player.x > this.canvas.width - this.player.size) this.player.x = this.canvas.width - this.player.size;

    this.orbs.forEach((orb) => {
        orb.y += orb.speed * dt;
        const dx = orb.x - (this.player.x + this.player.size / 2);
        const dy = orb.y - (this.player.y + this.player.size / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < orb.size + this.player.size / 2) {
            orb.collected = true;
            this.collected++;
        }
    });
    this.orbs = this.orbs.filter((orb) => orb.y < this.canvas.height && !orb.collected);

    if (this.collected >= this.targetCollected) {
        this.stop();
    }
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    
    const progressRatio = this.collected / this.targetCollected;
    const bgTopColor = this.sentiment === 'sad' ? this.lerpColor("#4a4a4a", "#87CEEB", progressRatio) : "#87CEEB";
    const bgBottomColor = this.sentiment === 'sad' ? this.lerpColor("#2b2b2b", "#00BFFF", progressRatio) : "#00BFFF";
    const groundColor = this.sentiment === 'sad' ? this.lerpColor("#111", "#2e8b57", progressRatio) : "#2e8b57";
    const cloudSpeedMultiplier = this.sentiment === 'sad' ? (0.3 + 0.7 * progressRatio) : 1;

    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, bgTopColor);
    g.addColorStop(1, bgBottomColor);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    this.clouds.forEach((c) => {
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, c.rx, c.ry, 0, 0, Math.PI * 2);
        ctx.fill();
        c.x += c.speed * 0.016 * cloudSpeedMultiplier;
        if (c.x - c.rx > w) c.x = -c.rx;
    });

    ctx.fillStyle = groundColor;
    ctx.fillRect(0, this.groundY, w, 80);

    this.orbs.forEach((o) => {
        ctx.beginPath();
        ctx.fillStyle = o.color;
        ctx.arc(o.x, o.y, o.size, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.fillStyle = this.player.color;
    ctx.beginPath();
    ctx.arc(this.player.x + this.player.size / 2, this.player.y + this.player.size / 2, this.player.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.font = "20px Inter";
    ctx.fillText(`Progress: ${this.collected}/${this.targetCollected}`, 20, 40);
  }
  
  lerpColor(a, b, amount) {
    const hexToRgb = (h) => {
      const match = h.slice(1).match(/.{2}/g);
      if (!match) return [0,0,0];
      const [r, g, bl] = match.map(x => parseInt(x, 16));
      return [r, g, bl];
    };
    const [r1, g1, b1] = hexToRgb(a);
    const [r2, g2, b2] = hexToRgb(b);
    const r = Math.round(r1 + (r2 - r1) * amount);
    const g = Math.round(g1 + (g2 - g1) * amount);
    const bl = Math.round(b1 + (b2 - b1) * amount);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`;
  }
}
