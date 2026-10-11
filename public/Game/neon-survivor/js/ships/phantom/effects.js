window.NeonShips.registerEffects('phantom', {
  pilot(ctx, pilot) {
    window.NeonPhantomScythe?.render(ctx, pilot);
  },
  world(ctx, game) {
    window.NeonPhantom?.renderMarks(ctx, game);
  },
  network(ctx, snapshot) {
    if (snapshot.spectral?.scythes?.length) {
      window.NeonPhantomScythe?.render(ctx, {
        phantomScythe: {scythes:snapshot.spectral.scythes}
      });
    }
  }
});
