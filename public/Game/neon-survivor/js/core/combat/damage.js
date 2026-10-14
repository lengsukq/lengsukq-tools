    /* Damage resolution, drops, throttled combat audio and player damage intake. */
    NeonCore.define(NeonSurvivorGame, class {
      dealDamage(target, rawDamage, source = 'combat', forceCrit = false, attacker = this.player) {
        if (this.lanCoop?.ally && source !== 'lan-resonance') {
          rawDamage *= 1 + this.lanCoop.getLinkBonus(attacker);
        }
        if (this.endlessMode) {
          rawDamage = window.NeonRogueRelics?.modifyDamage(this, target, rawDamage, source) ?? rawDamage;
          rawDamage = window.NeonRogueFusions?.modifyDamage(this, target, rawDamage, source) ?? rawDamage;
        }
        // The co-op link adds crit chance when a Phantom is on either side of it.
        // That contribution was computed and then read by nobody, so two Phantoms
        // standing together received no bonus at all -- the damage bonus needs a
        // Riftblade and the shield needs an Astra.
        const critChance = (attacker.critRate || 0) +
          (this.lanCoop?.getLinkCrit?.(attacker) || 0);
        const isCrit = forceCrit || Math.random() < critChance;
        // Shared +3% per character level: exactly one multiplication per hit.
        let finalDamage = (isCrit ? rawDamage * (attacker.critDmg || 1.5) : rawDamage) *
          (1 + Math.max(0, (attacker.level || 1) - 1) * 0.03);

        // Boss Carrier Shield Absorption
        if (target.isBoss && target.hasShield) {
          finalDamage *= 0.15;
          if (Math.random() < 0.25) {
            this.texts.push({
              x: target.x + (Math.random() - 0.5) * 20,
              y: target.y - 20,
              text: '🛡️ 力场偏折吸收!',
              color: '#00f3ff',
              size: 13,
              life: 0.45,
              maxLife: 0.45
            });
          }
        }

        // Shield pylon buff on regular minions
        if (target.shielded) {
          finalDamage *= 0.5;
        }
        if (target.isBoss && target.rogueAffixes?.includes('armored')) finalDamage *= 0.83;
        finalDamage = window.NeonLanEncounters?.modifyBossDamage(this, target, finalDamage) ?? finalDamage;

        // Celestial Ward amplification: Astra standing within ward gets +70% personal damage amp!
        if (window.NeonAstra?.wardDamageBonus) {
          try {
            const wardBonus = window.NeonAstra.wardDamageBonus(this, target, attacker);
            if (wardBonus > 1.0) {
              finalDamage *= wardBonus;
              if (this.texts.length < 28 && Math.random() < 0.2) {
                this.texts.push({
                  x: target.x,
                  y: target.y - 24,
                  text: '✨炮台超频+70%',
                  color: '#d8b4fe',
                  size: 11,
                  life: 0.4,
                  maxLife: 0.4
                });
              }
            }
          } catch (e) {
            // Guard against any ward bonus calculation issues
          }
        }

        // Spectral Mark amplification: enemies branded with Phantom's mark take +25% extra damage from Phantom!
        if (attacker?.shipId === 'phantom' && window.NeonPhantom?.markDamageBonus) {
          const markAmp = window.NeonPhantom.markDamageBonus(attacker, target, this.survivalTime || 0);
          if (markAmp > 1.0) {
            finalDamage *= markAmp;
            if (this.texts.length < 28 && Math.random() < 0.22) {
              this.texts.push({
                x: target.x,
                y: target.y - 24,
                text: '💀死印易伤+25%',
                color: '#67e8f9',
                size: 11,
                life: 0.4,
                maxLife: 0.4
              });
            }
          }
        }

        // Riftblade Assault Surge: +30% damage boost following a warp slash
        const isRiftblade = !attacker?.shipId || attacker?.shipId === 'riftblade';
        if (isRiftblade && (attacker?.riftSurgeTimer || 0) > 0) {
          finalDamage *= 1.30;
        }

        target.hp -= finalDamage;
        this.totalDamageDealt += finalDamage;
        if (this.endlessMode) window.NeonRogueFusions?.onDamage(this, target, finalDamage, source);

        // Floating combat text with pool limit & clean thousand formatting
        if (this.texts.length < 28 || isCrit) {
          const formattedDmg = finalDamage >= 1000 ? (finalDamage / 1000).toFixed(1) + 'k' : Math.round(finalDamage);
          this.texts.push({
            x: target.x + (Math.random() - 0.5) * 16,
            y: target.y - 12,
            text: isCrit ? `💥${formattedDmg}!` : `${formattedDmg}`,
            color: isCrit ? '#ffea00' : '#ffffff',
            size: isCrit ? (finalDamage >= 1000 ? 18 : 16) : (finalDamage >= 1000 ? 14 : 12),
            life: 0.45,
            maxLife: 0.45
          });
        }

        // Hit spark particles with strict budget
        if (this.particles.length < (this.fxLow ? 15 : 45)) {
          const sparkCount = isCrit ? 2 : 1;
          for (let i = 0; i < sparkCount; i++) {
            this.particles.push({
              type: 'spark',
              x: target.x,
              y: target.y,
              vx: (Math.random() - 0.5) * 120,
              vy: (Math.random() - 0.5) * 120,
              radius: Math.random() * 2 + 1,
              color: isCrit ? '#ffea00' : target.color,
              life: 0.18,
              maxLife: 0.18
            });
          }
        }

        if (target.hp <= 0 && !target.dead) {
          target.dead = true;
          this.onEnemyKilled(target, source);
        }
      }

      rollNormalDrop(roll, source = 'combat') {
        const rules = this.getDifficultyRules();
        const routeBonus = window.NeonRogueEndless?.getDropMultiplier(this) || 1;
        const heal = 0.015 * rules.normalDrops * routeBonus;
        const magnet = 0.011 * rules.normalDrops * routeBonus;
        const nuke = source === 'nuke' ? 0 : 0.009 * rules.nukeDrops;
        if (roll < heal) return 'heal';
        if (roll < heal + magnet) return 'magnet';
        if (roll < heal + magnet + nuke) return 'nuke';
        return 'gem';
      }

      playCombatSound(channel, callback, maxPerFrame = 2) {
        const time = this.survivalTime || 0;
        const state = this.combatSoundBudget ||= {};
        const item = state[channel] ||= { time: NaN, count: 0 };
        if (item.time !== time) { item.time = time; item.count = 0; }
        if (item.count >= maxPerFrame) return false;
        item.count++;
        callback?.();
        return true;
      }

      hitPlayer(dmg) {
        if (this.player.downed) return;
        if (this.player.invulnTimer > 0) return;
        if (this.player.shipId === 'phantom' && this.player.phantom?.shiftActive) {
          // Immune to all collision and projectile damage while shifted
          return;
        }
        window.NeonRogueEndless?.onDamageTaken(this);
        dmg *= this.getDifficultyRules().enemyDamage *
          (window.NeonLanEncounters?.active(this) ? window.NeonLanEncounters.TUNING.enemyDamage : 1);
        if (this.player.hasDockedGunner) {
          dmg *= (1 - (window.NeonPhantom?.BASE?.carrierRearDamageReduction || 0.40));
        }
        // Spell wards reduce incoming damage; class-link shields consume the
        // remainder before HP. Absorbed hits grant a brief 0.28s grace window
        // so a touching melee enemy does not drain shields 60 times per second.
        const preShieldDmg = dmg;
        const prevAstraShield = (this.player.astraTempShield?.remaining > 0 && this.player.astraTempShield?.value > 0)
          ? this.player.astraTempShield.value : 0;
        dmg = window.NeonAstra?.incomingDamage(this, this.player, dmg) ?? dmg;
        dmg = window.NeonLanResonance?.absorb(this.player, dmg, this.survivalTime || 0) ?? dmg;
        const postAstraShield = (this.player.astraTempShield?.remaining > 0 && this.player.astraTempShield?.value > 0)
          ? this.player.astraTempShield.value : 0;
        const astraShieldAbsorbed = Math.max(0, prevAstraShield - postAstraShield);
        if (dmg <= 0) {
          this.player.invulnTimer = Math.max(this.player.invulnTimer || 0, 0.28);
          this.shockwaves.push({
            x: this.player.x,
            y: this.player.y,
            radius: 14,
            maxRadius: 68,
            alpha: 0.85,
            color: '#38bdf8'
          });
          this.texts.push({
            x: this.player.x,
            y: this.player.y - 24,
            text: `🛡️ 护盾抵消 -${Math.max(1, Math.round(astraShieldAbsorbed || preShieldDmg))}`,
            color: '#38bdf8',
            size: 15,
            life: 0.65,
            maxLife: 0.65
          });
          try { this.sound?.playLaser?.(520, 'sine'); } catch (_) {}
          return;
        }
        if (astraShieldAbsorbed > 0) {
          this.texts.push({
            x: this.player.x,
            y: this.player.y - 38,
            text: `🛡️ 护盾吸收 -${Math.max(1, Math.round(astraShieldAbsorbed))}`,
            color: '#67e8f9',
            size: 13,
            life: 0.65,
            maxLife: 0.65
          });
        }
        this.combatTelemetry.damageTaken += dmg;
        this.player.hp -= dmg;
        this.player.invulnTimer = 0.35; // Invulnerable frame
        this.screenShake = 12;
        this.sound.playLaser(140, 'triangle');
        this.vibrateGamepad(160, 0.65, 0.35);

        // Floating damage text on player
        this.texts.push({
          x: this.player.x,
          y: this.player.y - 20,
          text: `-${Math.round(dmg)}`,
          color: '#ff0055',
          size: 16,
          life: 0.8,
          maxLife: 0.8
        });

        if (this.player.hp <= 0) {
          if (this.player.hasCheatDeath && !this.player.cheatDeathUsed) {
            this.player.cheatDeathUsed = true;
            this.player.hp = this.player.maxHp * 0.6;
            this.player.invulnTimer = 2.0;
            this.shockwaves.push({
              x: this.player.x,
              y: this.player.y,
              radius: 10,
              maxRadius: 280,
              alpha: 1,
              color: '#00ffaa'
            });
            this.texts.push({
              x: this.player.x,
              y: this.player.y - 30,
              text: `🛡️ 纳米重构紧急复活!`,
              color: '#00ffaa',
              size: 20,
              life: 1.5,
              maxLife: 1.5
            });
          } else if ((this.lanCoop?.allies?.size || 0) > 1) {
            // 3/4 person rooms use the generic multi-pilot rescue clock.
            this.player.hp = 0;
            window.NeonLanMultiRules?.tick(this, [...this.lanCoop.allies.values()], 0.001);
          } else if (!window.NeonLanRevive?.knockDown(this, 'host')) {
            this.gameOver();
          }
        }
      }
    });
