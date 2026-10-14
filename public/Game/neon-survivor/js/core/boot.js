    /* Global error trap and game bootstrap on DOMContentLoaded. */
    window.addEventListener('error', (e) => {
      console.warn("Global safety handler caught:", e.error || e.message);
    });

    // Initialize Game on load
    window.addEventListener('DOMContentLoaded', () => {
      window.game = new NeonSurvivorGame();
      // Scanning a host QR opens the game and joins the room without asking the
      // guest to find the LAN menu or retype the code.
      const invite = window.NeonLanInvite?.parse(window.location?.href);
      if (invite) window.NeonLanLobby?.open(window.game,
        { roomCode: invite.room, autoJoin: invite.autoJoin });
    });
