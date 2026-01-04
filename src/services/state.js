// ═══════════════════════════════════════════════════════════════════
// STATE MANAGEMENT SERVICE
// ═══════════════════════════════════════════════════════════════════

const STATE_TTL = 30 * 60 * 1000; // 30 minutes
const stateStore = new Map();

class StateService {
  set(userId, key, value) {
    const userState = stateStore.get(userId) || {};
    userState[key] = value;
    userState.lastUpdated = Date.now();
    stateStore.set(userId, userState);
    console.log(`[STATE] Set ${key} for user ${userId}:`, value);
  }

  get(userId, key) {
    const userState = stateStore.get(userId);
    if (!userState) return null;
    
    // Check if state has expired
    if (Date.now() - userState.lastUpdated > STATE_TTL) {
      console.log(`[STATE] Expired for user ${userId}, clearing`);
      stateStore.delete(userId);
      return null;
    }
    
    return userState[key];
  }

  clear(userId, key) {
    if (key) {
      const userState = stateStore.get(userId);
      if (userState) {
        delete userState[key];
        console.log(`[STATE] Cleared ${key} for user ${userId}`);
      }
    } else {
      stateStore.delete(userId);
      console.log(`[STATE] Cleared all state for user ${userId}`);
    }
  }

  getAll(userId) {
    const userState = stateStore.get(userId);
    if (!userState) return {};
    
    // Check if state has expired
    if (Date.now() - userState.lastUpdated > STATE_TTL) {
      console.log(`[STATE] Expired for user ${userId}, clearing`);
      stateStore.delete(userId);
      return {};
    }
    
    return userState;
  }

  has(userId, key) {
    const userState = stateStore.get(userId);
    if (!userState) return false;
    
    // Check if state has expired
    if (Date.now() - userState.lastUpdated > STATE_TTL) {
      stateStore.delete(userId);
      return false;
    }
    
    return key in userState;
  }

  // Clean up expired states periodically
  cleanup() {
    const now = Date.now();
    for (const [userId, state] of stateStore.entries()) {
      if (now - state.lastUpdated > STATE_TTL) {
        console.log(`[STATE] Cleaning up expired state for user ${userId}`);
        stateStore.delete(userId);
      }
    }
  }
}

const state = new StateService();

// Run cleanup every 10 minutes
setInterval(() => state.cleanup(), 10 * 60 * 1000);

export default state;
