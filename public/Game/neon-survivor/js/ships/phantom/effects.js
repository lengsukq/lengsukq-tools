window.NeonShips.registerEffects('phantom', {
  pilot(ctx, pilot) {
    window.NeonPhantomScythe?.render(ctx, pilot);
  },
  world(ctx, game) {
    window.NeonPhantom?.renderMarks(ctx, game);
  }
});
