export const __resilienceTestOnly = {
  resetState(online = true) {
    listeners.clear();
    initialized = false;
    if (pollTimer) clearInterval(pollTimer);
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    pollTimer = null;
    heartbeatTimer = null;
    state = {
      online,
      maintenance: null,
      lastHeartbeatAt: null,
    };
  },
};