    /* ONE movement model for every pilot.
     *
     * "How fast does a pilot move" used to be written three times: the host's
     * own player (progression/recalculate.js + simulation/player.js), the
     * host's simulation of a remote ally (combat/pilots.js stepRemote), and the
     * guest's local prediction (network/prediction.js). They disagreed on every
     * term:
     *
     *   - the ally's dash was a hardcoded 780 px/s while the host's own dash was
     *     baseSpeed * 3.6 -- 864 at level 1 and up to 1386 at the speed cap --
     *     so a guest dashed 10% short at level 1 and 44% short fully upgraded;
     *   - the thruster multiplier was 0.15 for the ally and 0.12 for the host;
     *   - limit-break speed was missing from the ally and from prediction;
     *   - the ally's baseSpeed was never recalculated after a guest picked
     *     Thruster, and it fell back to riftblade's 240 for every ship;
     *   - the astra kite, phantom sprint and spectral-extend multipliers were
     *     applied only to the host's own player.
     *
     * Everything now derives from this module, so the host and the guest cannot
     * drift apart again. It is pure: it reads a pilot and returns numbers, and
     * never touches the DOM, the canvas or the clock. combat/pilots.js and
     * network/prediction.js are classic scripts sharing this global lexical
     * scope, so they call PilotSpeed at run time (they load before this file,
     * but only define functions that run later).
     */
    const PilotSpeed = Object.freeze({
      DASH_DURATION: .18,
      DASH_SPEED_MULTIPLIER: 3.6,
      LEVEL_SPEED_CAP: 120,
      TOTAL_SPEED_CAP: 385,
      PHANTOM_SHIFT_FALLBACK: 1.40,
      PHANTOM_SPRINT: 1.75,
      ASTRA_KITE: 1.5,
      ASTRA_WARD_ANCHOR: .20,

      /** Walk speed from ship, level, Thruster and its limit breaks. Pure. */
      compute(pilot) {
        const shipSpeed = window.NeonShips?.get?.(pilot?.shipId)?.baseStats?.speed || 240;
        const thruster = pilot?.passives?.thruster || 0;
        const level = Math.max(1, pilot?.level || 1);
        const lbBonus = (pilot?.limitBreaks?.thruster || 0) * 5;
        return Math.min(PilotSpeed.TOTAL_SPEED_CAP,
          Math.round(shipSpeed * (1 + thruster * .12) +
            Math.min(PilotSpeed.LEVEL_SPEED_CAP, (level - 1) * 6) + lbBonus));
      },

      /** The speed to actually move at: the authoritative value when the host
       *  has published one (a guest's snapshot), otherwise compute it.
       *
       *  Preferring the cached value is exactly what the host's own movement
       *  already did -- it read `player.baseSpeed` directly -- so the host is
       *  unaffected, and a guest predicts with the host's number instead of
       *  its own guess. recalculate() below is what writes that cache. */
      base(pilot) {
        return Number.isFinite(pilot?.baseSpeed) ? pilot.baseSpeed : PilotSpeed.compute(pilot);
      },

      /** Write baseSpeed onto a pilot. The single writer for hosts and allies. */
      recalculate(pilot) {
        if (!pilot) return 0;
        pilot.baseSpeed = PilotSpeed.compute(pilot);
        return pilot.baseSpeed;
      },

      /** Class state multipliers, multiplied exactly as the host always did.
       *  Docking is deliberately NOT handled here: the host's own movement never
       *  checked it (the phantom plugin pins the pilot to its carrier), while
       *  the ally step and the guest prediction both guard it explicitly. */
      multiplier(pilot) {
        if (!pilot) return 1;
        let value = 1;
        if (pilot.shipId === 'astra') {
          if (pilot.astra?.wardActive) value *= PilotSpeed.ASTRA_WARD_ANCHOR;
          if ((pilot.astra?.kiteSpeedTimer || 0) > 0) value *= PilotSpeed.ASTRA_KITE;
        } else if (pilot.shipId === 'phantom') {
          if (pilot.phantom?.shiftActive) {
            const spectralExtend = pilot.phantom?.warpUpgrades?.spectral_extend ||
              pilot.dashUpgrades?.spectral_extend || 0;
            value *= PilotSpeed.PHANTOM_SHIFT_FALLBACK + spectralExtend * .15;
          }
          if ((pilot.phantom?.sprintTimer || 0) > 0) value *= PilotSpeed.PHANTOM_SPRINT;
        }
        return value;
      },

      /** Movement speed for one tick, including class states and the dash. */
      move(pilot, dashing = false) {
        if (!pilot || pilot.downed) return 0;
        if (dashing) return PilotSpeed.dash(pilot);
        return PilotSpeed.base(pilot) * PilotSpeed.multiplier(pilot);
      },

      /** Dash burst speed. Exactly the host's own dash, for every pilot. */
      dash(pilot) {
        return PilotSpeed.base(pilot) * PilotSpeed.DASH_SPEED_MULTIPLIER;
      },

      /** Distance covered by one full dash, for HUD copy and tests. */
      dashDistance(pilot) {
        return PilotSpeed.dash(pilot) * PilotSpeed.DASH_DURATION;
      }
    });
