    /* Adaptive quality ladder.
     *
     * Phone heat on this game is dominated by fill rate: how many pixels the
     * canvas writes per frame, and how many of those draws carry a shadow
     * blur. The profiler shows the per-entity query loops are a fraction of a
     * percent of a frame, so the only lever with real headroom is how much the
     * canvas is asked to rasterise.
     *
     * The ladder is ordered best-first and every step down reduces the
     * backing-store scale, which is the single strongest lever available:
     * dropping the device pixel ratio cap from 2.0 to 1.25 is 2.56x fewer
     * pixels to fill. Shadow blur is dropped at the same step because it costs
     * an extra pass per primitive.
     *
     * A user-chosen low-effects setting is a ceiling, never a target: the
     * ladder may degrade below it but must never climb above it, so an
     * explicit preference is always honoured.
     */
    const QualityLadder = Object.freeze({
      // Ordered from best to worst. Index 0 is the default.
      LEVELS: Object.freeze([
        Object.freeze({ name: 'high', dprCap: 2, shadow: true }),
        Object.freeze({ name: 'medium', dprCap: 1.5, shadow: true }),
        Object.freeze({ name: 'low', dprCap: 1.25, shadow: false }),
        Object.freeze({ name: 'minimal', dprCap: 1, shadow: false })
      ]),

      /** Frames averaged before the ladder is allowed to move. */
      SAMPLE_FRAMES: 30,
      /** Average render cost above this means the frame is at risk. */
      BUDGET_MS: 12,
      /** Recovery needs to be clearly under budget, not merely under it. */
      RECOVER_RATIO: 0.6,
      /** Consecutive good windows required before stepping back up. */
      RECOVER_WINDOWS: 4,

      /** The user's preference is both the starting level and the best level
       * the ladder is allowed to recover back to. Degrading below it is always
       * permitted, because a device that cannot hold the frame rate must be
       * allowed to shed more work.
       */
      startIndex(lowEffects) {
        return lowEffects ? 2 : 0;
      },

      /** Worst level the ladder may reach. */
      floorIndex() {
        return this.LEVELS.length - 1;
      },

      level(index) {
        const clamped = Math.max(0, Math.min(this.LEVELS.length - 1, index | 0));
        return this.LEVELS[clamped];
      },

      /** Pure decision step: where should the ladder move to next?
       *
       * Returns 1 to degrade (index + 1), -1 to recover (index - 1), 0 to hold.
       * Kept free of game state so it can be tested directly.
       */
      decide(index, averageMs, goodWindows, lowEffects) {
        const start = this.startIndex(lowEffects);
        if (averageMs > this.BUDGET_MS) {
          return index < this.floorIndex() ? 1 : 0;
        }
        if (averageMs < this.BUDGET_MS * this.RECOVER_RATIO) {
          return (goodWindows >= this.RECOVER_WINDOWS && index > start) ? -1 : 0;
        }
        return 0;
      }
    });
