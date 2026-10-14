    /* NeonSurvivorGame: construction, DOM wiring, run lifecycle and the frame loop. */
    class NeonSurvivorGame {
      constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.sound = new SoundEngine();

        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.cameraZoom = 1;

        this.state = 'start'; // 'start', 'playing', 'paused', 'levelup', 'gameover', 'victory'
        this.loopRunning = false;
        this.gamepadVibrationEnabled = SafeStorage.get('neon_vibration', 'true') !== 'false';
        this.unlockedDifficulty = Math.max(0, Math.min(6, parseInt(SafeStorage.get('neon_ascension_unlocked', '0'), 10) || 0));
        this.selectedDifficulty = Math.max(0, Math.min(this.unlockedDifficulty, parseInt(SafeStorage.get('neon_difficulty_selected', '0'), 10) || 0));
        this.difficulty = this.selectedDifficulty;
        this.combatTelemetry = { invulnerableSeconds: 0, nukeDrops: 0, damageTaken: 0, preciseDashes: 0 };
        this.isHelpOpen = false;
        this.prevHelpState = 'start';
        this.lastTime = 0;
        this.survivalTime = 0;
        this.kills = 0;
        this.totalDamageDealt = 0;
        this.endlessMode = false;
        this.lanRTC = null;
        this.lanCoop = null;

        // Player
        this.player = {
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          baseSpeed: 240,
          radius: 16,
          hp: 100,
          maxHp: 100,
          regen: 0.8, // 战机原生缓慢回血 (0.8 HP/s)
          invulnTimer: 0,
          // Dash: 3 Stored Charges + Path Slicing
          dashCharges: 3,
          maxDashCharges: 3,
          dashRechargeTimer: 0,
          dashRechargeTime: 2.2,
          isDashing: false,
          dashDuration: 0.18,
          dashTimeLeft: 0,
          dashDir: { x: 0, y: 0 },
          dashHitEnemies: new Set(),
          // Upgrades and Levels
          level: 1,
          xp: 0,
          xpNeeded: 10,
          crystals: 0,
          magnetRadius: 100,
          // Passives
          dmgMultiplier: 1.0,
          cdrMultiplier: 1.0,
          critRate: 0.08,
          critDmg: 1.5,
          cheatDeathUsed: false,
          hasCheatDeath: false,
          areaMultiplier: 1.0,
          extraProjectiles: 0,
          dashSlashDmgMult: 1.0,
          dashSlashWidthMult: 1.0,
          riftSurgeTimer: 0,
          hasPlasmaTrail: false,
          dashUpgrades: {},
          aegisTimer: 0,
          aegisPulseTimer: 0,
          hasAegis: false,
          aegisDuration: 0,
          aegisDamage: 0,
          aegisRadius: 0,
          hasAegisBurst: false,
          hasDashBlast: false,
          dashBlastDamage: 0,
          dashBlastRadius: 0,
          hasFireTrail: false,
          fireTrailDamage: 0,
          fireTrailDuration: 0,
          hasDashCryo: false,
          dashCryoDuration: 0,
          dashAlwaysCrit: false,
          dashCombo: 0,
          dashComboUntil: 0,
          dashPreciseHit: false,
          limitBreaks: {},
          totalLimitBreaks: 0,
          // Equipped weapons: id -> level
          weapons: { blaster: 1 },
          passives: {},
          aimAngle: 0,
          autoAim: true
        };
        // Gamepad badges on ordinary menu actions are created only while a
        // connected controller is present. Buttons remain fully clickable.
        for (const [id, key] of [
          ['btn-start-game', 'a'], ['btn-start-help', 'x'],
          ['btn-resume', 'a'], ['btn-pause-help', 'x']
        ]) {
          document.getElementById(id)?.setAttribute?.('data-gamepad-action', key);
        }
        this.selectedShipId = window.NeonShips?.DEFAULT_SHIP_ID || 'riftblade';
        this.player.shipId = this.selectedShipId;
        // Authoritative player container; legacy game.player remains the exact
        // same object. Remote pilots are registered by the co-op adapter.
        this.players = window.NeonPlayers ? new window.NeonPlayers.PlayerRegistry() : null;
        this.players?.register('host', this.player);

        // Entities
        this.bullets = [];
        this.enemies = [];
        this.enemyBullets = [];
        this.gems = [];
        this.particles = [];
        this.texts = [];
        this.orbiters = [];
        this.shockwaves = [];
        this.laserBeams = [];
        this.companionDrones = [];
        this.blackHoles = [];
        this.mines = [];
        this.lightningTethers = [];
        this.dashTrails = [];

        // Weapon Cooldown Timers
        this.weaponTimers = {
          blaster: 0,
          tesla: 0,
          missiles: 0,
          nova: 0,
          laser: 0,
          drones: 0,
          blackhole: 0,
          cryomine: 0
        };
        this.player.timers = this.weaponTimers;
        this.bossCycle = 0;

        // Spawning director
        this.spawnTimer = 0;
        this.waveTimer = 0;
        this.bossSpawned = false;
        this.currentBoss = null;

        // Controls
        this.keys = {};
        this.mouse = { x: this.width / 2, y: this.height / 2, down: false };
        this.touch = { active: false, identifier: null, startX: 0, startY: 0, currentX: 0, currentY: 0 };

        // Visual effects
        this.screenShake = 0;
        this.screenShakeAngle = 0;
        this.camera = { x: 0, y: 0 };
        this.gridOffset = { x: 0, y: 0 };

        this.initDOM();
        this.setupEvents();
        window.NeonGameSettings?.apply(this);
        this.renderDifficultySelector();
        window.NeonShipSelection?.render(this);
        this.resize();
        this.renderWeaponsHUD();

        // 启动全局唯一定时循环，杜绝多次重开产生并发循环
        this.loopRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
      }

      showStartMenu() {
        if (this.lanCoop?.rtc?.connected &&
            this.lanCoop.rtc.role === 'host' &&
            this.lanCoop.returnToReady?.()) return;
        this.state = 'start';
        this.releaseJoystickTouch();
        this.hideAllModals();
        this.modalStart.classList.add('active');
        this.renderDifficultySelector();
        window.NeonShipSelection?.render(this);
      }

      initDOM() {
        this.hudLevel = document.getElementById('level-badge');
        this.hudHp = document.getElementById('hp-fill');
        this.hudDash = document.getElementById('dash-fill');
        this.hudTimer = document.getElementById('hud-timer');
        this.hudKills = document.getElementById('hud-kills');
        this.hudCrystals = document.getElementById('hud-crystals');
        this.hudXp = document.getElementById('xp-bar');
        this.bossHud = document.getElementById('boss-hud');
        this.bossHpFill = document.getElementById('boss-hp-fill');
        this.weaponsBar = document.getElementById('weapons-bar');

        this.modalStart = document.getElementById('modal-start');
        this.modalLevelup = document.getElementById('modal-levelup');
        this.modalPause = document.getElementById('modal-pause');
        this.modalGameover = document.getElementById('modal-gameover');
        this.modalVictory = document.getElementById('modal-victory');
        this.upgradeGrid = document.getElementById('upgrade-options');
        this.crtOverlay = document.getElementById('crtOverlay');
      }

      resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width * this.dpr;
        this.canvas.height = this.height * this.dpr;
        this.ctx.resetTransform();
        this.ctx.scale(this.dpr, this.dpr);
      }

      releaseJoystickTouch() {
        this.touch.active = false;
        this.touch.identifier = null;
        const joyBase = document.getElementById('joystickBase');
        if (joyBase) joyBase.style.display = 'none';
      }

      startNewGame() {
        if (this.lanCoop?.rtc?.connected &&
            this.lanCoop.rtc.role === 'host') this.lanCoop.restartHostMatch?.();
        this.state = 'playing';
        this.releaseJoystickTouch();
        if (this.lanCoop?.rtc.connected && this.lanCoop.ally) this.lanCoop.startHost();
        this.difficulty = this.selectedDifficulty;
        this.combatTelemetry = { invulnerableSeconds: 0, nukeDrops: 0, damageTaken: 0, preciseDashes: 0 };
        this.survivalTime = 0;
        this.kills = 0;
        this.totalDamageDealt = 0;
        this.endlessMode = false;
        this.bossSpawned = false;
        this.currentBoss = null;

        // Reset player
        this.player.x = 0;
        this.player.y = 0;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.hp = 100;
        this.player.maxHp = 100;
        this.player.regen = 0.8; // 原生回血
        this.player.level = 1;
        this.player.xp = 0;
        this.player.xpNeeded = this.calcXpNeeded(1);
        this.pendingLevelUps = 0;
        this.upgradeSession = null;
        this.endlessUpgradeRerolls = 2;
        this.endlessUpgradeBanishes = 2;
        this.banishedUpgrades = new Set();
        this.player.crystals = 0;
        this.player.invulnTimer = 0;
        this.player.dashCharges = 3;
        this.player.maxDashCharges = 3;
        this.player.dashRechargeTimer = 0;
        this.player.isDashing = false;
        this.player.dashTimeLeft = 0;
        this.player.dashHitEnemies = new Set();

        this.player.dmgMultiplier = 1.0;
        this.player.cdrMultiplier = 1.0;
        this.player.critRate = 0.08;
        this.player.critDmg = 1.5;
        this.player.baseSpeed = 240;
        this.player.magnetRadius = 120;
        this.player.hasCheatDeath = false;
        this.player.cheatDeathUsed = false;

        this.player.weapons = { blaster: 1 };
        this.player.passives = {};
        this.player.areaMultiplier = 1.0;
        this.player.extraProjectiles = 0;
        this.player.dashSlashDmgMult = 1.0;
        this.player.dashSlashWidthMult = 1.0;
        this.player.riftSurgeTimer = 0;
        this.player.hasPlasmaTrail = false;
        this.player.dashUpgrades = {};
        this.player.aegisTimer = 0;
        this.player.aegisPulseTimer = 0;
        this.player.hasAegis = false;
        this.player.aegisDuration = 0;
        this.player.aegisDamage = 0;
        this.player.aegisRadius = 0;
        this.player.hasAegisBurst = false;
        this.player.hasDashBlast = false;
        this.player.dashBlastDamage = 0;
        this.player.dashBlastRadius = 0;
        this.player.hasFireTrail = false;
        this.player.fireTrailDamage = 0;
        this.player.fireTrailDuration = 0;
        this.player.hasDashCryo = false;
        this.player.dashCryoDuration = 0;
        this.player.dashAlwaysCrit = false;
        this.player.dashCombo = 0;
        this.player.dashComboUntil = 0;
        this.player.dashPreciseHit = false;
        this.player.limitBreaks = {};
        this.player.totalLimitBreaks = 0;
        // A new run must never inherit previously charged mage spells,
        // stored star anchors, phase counters or co-op shield duration.
        // Keep these resets independent of which ship will be selected.
        this.player.astra = null;
        this.player.astraArsenal = null;
        this.player.starWeave = null;
        this.player.astraTempShield = null;
        this.player.coopShield = null;
        this.player.phantom = null;
        this.player.phantomScythe = null;
        // Current Riftblade stats are identical to the historical defaults.
        // Future ships supply their initial loadout through the same factory.
        const shipStart = window.NeonShips?.startingState(this.selectedShipId);
        if (shipStart) Object.assign(this.player, shipStart);
        this.recalculateDashStats();
        window.NeonGameSettings?.apply(this); // Restore per-device preferences on every restart.

        this.bullets = [];
        this.enemies = [];
        this.enemyBullets = [];
        this.gems = [];
        this.particles = [];
        this.texts = [];
        this.orbiters = [];
        this.shockwaves = [];
        this.laserBeams = [];
        this.companionDrones = [];
        this.blackHoles = [];
        this.mines = [];
        this.lightningTethers = [];
        this.dashTrails = [];

        this.weaponTimers = { blaster: 0, tesla: 0, missiles: 0, nova: 0, laser: 0, drones: 0, blackhole: 0, cryomine: 0 };
        this.player.timers = this.weaponTimers;
        this.bossCycle = 0;
        this.lastSwarmWave = 0;
        this.lastEliteWave = 0;
        this.afkTimer = 0;
        this.lastAfkX = 0;
        this.lastAfkY = 0;
        this.spawnTimer = 0;
        this.waveTimer = 0;
        this.hudAccum = 0; // HUD DOM throttle accumulator; see simulation/index.js
        window.NeonRogueEndless?.reset(this);
        window.NeonShips?.runAbility?.(this.player, 'onStart', this);

        this.hideAllModals();
        this.bossHud.style.display = 'none';
        this.renderWeaponsHUD();
        this.updateHUD();

        this.lastTime = performance.now();
        if (!this.loopRunning) {
          this.loopRunning = true;
          requestAnimationFrame((t) => this.loop(t));
        }
      }

      hideAllModals() {
        this.modalStart.classList.remove('active');
        this.modalLevelup.classList.remove('active');
        this.modalPause.classList.remove('active');
        this.modalGameover.classList.remove('active');
        this.modalVictory.classList.remove('active');
      }

      pauseGame() {
        if (this.lanCoop?.guestMode || this.state === 'lan-client') return;
        if (this.state !== 'playing') return;
        this.state = 'paused';
        if (this.lanCoop?.ally) {
          this.lanCoop.ally.input = { dx: 0, dy: 0, aim: this.lanCoop.ally.aimAngle, dash: false };
          this.lanCoop.ally.lastInputAt = 0;
        }
        this.releaseJoystickTouch();
        try { this.renderStatsTable('pause-stats'); } catch (e) { console.error(e); }
        if (this.modalPause) this.modalPause.classList.add('active');
      }

      resumeGame() {
        if (this.lanCoop?.guestMode || this.state === 'lan-client') return;
        if (this.state !== 'paused') return;
        if (this.modalPause) this.modalPause.classList.remove('active');
        this.state = 'playing';
        this.lastTime = performance.now();
      }

      gameOver() {
        this.state = 'gameover';
        this.releaseJoystickTouch();
        this.saveRunResults(false);
        this.saveEndlessResults();
        try { this.sound.playExplosion('large'); } catch (e) {}
        try { this.renderStatsTable('gameover-stats'); } catch (e) { console.error(e); }
        if (this.modalGameover) this.modalGameover.classList.add('active');
      }

      victory() {
        if (this.state !== 'playing') return;
        this.state = 'victory';
        this.releaseJoystickTouch();
        this.saveRunResults(true);
        try { this.sound.playLevelUp(); } catch (e) {}
        try { this.renderStatsTable('victory-stats'); } catch (e) { console.error(e); }
        if (this.modalVictory) this.modalVictory.classList.add('active');
      }

      saveEndlessResults() {
        if (!this.endlessMode || !this.endlessState) return;
        const key = 'neon_endless_records_v3';
        let records = {};
        try { records = JSON.parse(SafeStorage.get(key, '{}')) || {}; } catch (error) { records = {}; }
        const tier = String(this.difficulty);
        const old = records[tier] || { attempts: 0, bestStage: 0, bestSeconds: 0, mostRelics: 0 };
        records[tier] = {
          attempts: old.attempts + 1,
          bestStage: Math.max(old.bestStage, this.endlessState.stage || 0),
          bestSeconds: Math.max(old.bestSeconds, this.survivalTime),
          mostRelics: Math.max(old.mostRelics, this.endlessState.relics.length)
        };
        SafeStorage.set(key, JSON.stringify(records));
      }

      loop(timestamp) {
        requestAnimationFrame((t) => this.loop(t));
        try {
          if (!this.lastTime) this.lastTime = timestamp;
          const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
          this.lastTime = timestamp;

          this.pollGamepad(dt);
          if (this.state === 'lan-client' && this.lanCoop?.guestMode) {
            this.lanCoop.updateGuest(dt);
            this.lanCoop.renderGuest();
            return;
          }
          this.update(dt);
          this.lanCoop?.updateHost(dt);
          this.render();
          this.lanCoop?.renderHostUpgradeWait?.(this.ctx);
          if (this.lanCoop?.ally && this.lanCoop.rtc?.connected) {
            window.NeonLanRevive?.overlay(this.ctx, this, {
              rescue: window.NeonLanRevive.summary(this)
            });
          }
        } catch (err) {
          console.error("Game loop non-fatal error caught:", err);
        }
      }
    }
