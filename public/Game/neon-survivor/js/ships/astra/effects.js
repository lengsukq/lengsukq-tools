window.NeonShips.registerEffects('astra', {
  pilot(ctx, pilot) {
    window.NeonAstra?.renderWard(ctx, pilot);
    window.NeonAstraWeave?.render(ctx, pilot);
  },
  network(ctx, snapshot) {
    const arcane = snapshot.arcane;
    if (arcane?.wardRemaining > 0) {
      window.NeonAstra?.renderWard(ctx, {
        shipId: 'astra',
        astra: {
          wardX: arcane.wardX,
          wardY: arcane.wardY,
          wardRemaining: arcane.wardRemaining
        },
        passives: snapshot.passives || {}
      });
    }
    if (arcane?.anchors?.length) {
      window.NeonAstraWeave?.render(ctx, { starWeave: { anchors: arcane.anchors } });
    }
  }
});
