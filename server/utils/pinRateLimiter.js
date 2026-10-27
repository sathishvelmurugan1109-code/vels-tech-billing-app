// server/utils/pinRateLimiter.js — Rate limiting and lockout protection for PIN verification
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const LOCKOUT_MS = LOCKOUT_MINUTES * 60 * 1000;

// In-memory tracker for fast IP/Staff sliding window rate limits
const attemptTracker = new Map();

function getTrackerKey(identifier) {
  return String(identifier);
}

function checkRateLimit(identifier) {
  const key = getTrackerKey(identifier);
  const now = Date.now();
  const entry = attemptTracker.get(key);

  if (!entry) {
    return { allowed: true, remaining: MAX_ATTEMPTS, lockedUntil: null };
  }

  if (entry.lockedUntil && entry.lockedUntil > now) {
    const remainingSeconds = Math.ceil((entry.lockedUntil - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      lockedUntil: new Date(entry.lockedUntil),
      remainingSeconds,
    };
  }

  // Reset if window has expired
  if (entry.windowStart && now - entry.windowStart > LOCKOUT_MS) {
    attemptTracker.delete(key);
    return { allowed: true, remaining: MAX_ATTEMPTS, lockedUntil: null };
  }

  const remaining = Math.max(0, MAX_ATTEMPTS - entry.failures);
  return { allowed: remaining > 0, remaining, lockedUntil: null };
}

function recordFailedAttempt(identifier) {
  const key = getTrackerKey(identifier);
  const now = Date.now();
  const entry = attemptTracker.get(key) || { failures: 0, windowStart: now, lockedUntil: null };

  entry.failures += 1;
  if (entry.failures >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS;
    attemptTracker.set(key, entry);
    return {
      locked: true,
      remaining: 0,
      lockedUntil: new Date(entry.lockedUntil),
      remainingSeconds: Math.ceil(LOCKOUT_MS / 1000),
    };
  }

  attemptTracker.set(key, entry);
  return {
    locked: false,
    remaining: MAX_ATTEMPTS - entry.failures,
    lockedUntil: null,
  };
}

function resetRateLimit(identifier) {
  const key = getTrackerKey(identifier);
  attemptTracker.delete(key);
}

module.exports = {
  MAX_ATTEMPTS,
  LOCKOUT_MINUTES,
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
};
