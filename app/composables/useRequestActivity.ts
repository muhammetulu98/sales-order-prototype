// composables/useRequestActivity.ts
//
// Global request activity tracker with two-target smooth progress.
//
//   start() → softTarget grows (anticipated completion target)
//   end()   → hardTarget grows (confirmed completion target)
//
// JS animation loop runs each frame:
//   - progress < hardTarget → fast catch-up (rapid acceleration)
//   - hardTarget ≤ progress < softTarget → slow asymptotic drift
//   - progress reaches softTarget → animation halts until next event
//
// Progress is capped at 95% during active state. Only when all requests
// are truly settled (1500ms idle) does the bar snap to 100%, hold briefly,
// then reset. Late stragglers within the settle window extend the batch.

import { ref, computed } from "vue";

interface ErrorState {
  hasError: boolean;
  message: string | null;
}

// ─── Module-level singleton state (client-only) ───
const _activeCount = ref(0);
const _peakCount = ref(0);
const _displayProgress = ref(0);
const _errorState = ref<ErrorState>({ hasError: false, message: null });
const _pendingReserved = ref(0);

// Two-target animation model
let _softTarget = 0;
let _hardTarget = 0;
let _animFrame: number | null = null;

let _resetTimer: ReturnType<typeof setTimeout> | null = null;
let _holdTimer: ReturnType<typeof setTimeout> | null = null;
// If reserved slots never fire (e.g. caller called reserve(N) but only M<N
// requests went through useApi), this timer drops the unfulfilled reservation
// so the bar can finalise instead of waiting forever.
let _pendingDecayTimer: ReturnType<typeof setTimeout> | null = null;

// ─── Constants ───
const ACTIVE_CAP = 95; // bar can't exceed 95% while requests are pending
const SETTLE_DELAY_MS = 1500; // wait this long after last end before finalising
const HOLD_AT_100_MS = 500; // hold the bar at 100% so user can see it
const SPEED_CATCH_UP = 0.22; // per-frame factor when below hardTarget (fast)
const SPEED_DRIFT = 0.04; // per-frame factor when above hardTarget (slow)
// Drop unfulfilled reservations after this long without any new request.
// Kept short: reserved slots whose requests are cached/short-circuited (or fired
// before reserve() as unreserved) would otherwise keep the bar spinning needlessly.
const PENDING_DECAY_MS = 350;

// ─── Internal helpers ───

const cancelReset = () => {
  if (_resetTimer) {
    clearTimeout(_resetTimer);
    _resetTimer = null;
  }
  if (_holdTimer) {
    clearTimeout(_holdTimer);
    _holdTimer = null;
  }
};

const cancelPendingDecay = () => {
  if (_pendingDecayTimer) {
    clearTimeout(_pendingDecayTimer);
    _pendingDecayTimer = null;
  }
};

const schedulePendingDecay = (onDecay: () => void) => {
  cancelPendingDecay();
  _pendingDecayTimer = setTimeout(() => {
    _pendingDecayTimer = null;
    // Only drop reservations if there's still nothing happening
    if (_activeCount.value === 0 && _pendingReserved.value > 0) {
      _pendingReserved.value = 0;
      onDecay();
    }
  }, PENDING_DECAY_MS);
};

const isSettled = () =>
  _activeCount.value === 0 && _pendingReserved.value === 0;

const recomputeTargets = () => {
  if (_peakCount.value === 0) {
    _softTarget = 0;
    _hardTarget = 0;
    return;
  }
  // started = how many requests have begun (consumed reservation or active)
  const started = Math.max(0, _peakCount.value - _pendingReserved.value);
  // completed = how many have ended
  const completed = Math.max(
    0,
    _peakCount.value - _activeCount.value - _pendingReserved.value,
  );
  const cap = ACTIVE_CAP;
  const newSoft = (started / _peakCount.value) * cap;
  const newHard = (completed / _peakCount.value) * cap;
  // Monotonic — never decrease
  if (newSoft > _softTarget) _softTarget = newSoft;
  if (newHard > _hardTarget) _hardTarget = newHard;
};

const animate = () => {
  const current = _displayProgress.value;
  const target = _softTarget;
  const diff = target - current;

  if (Math.abs(diff) < 0.05) {
    _displayProgress.value = target;
    _animFrame = null;
    return;
  }

  // Speed depends on whether we're catching up to a confirmed completion
  // or asymptotically drifting toward an anticipated one.
  const speed = current < _hardTarget ? SPEED_CATCH_UP : SPEED_DRIFT;
  _displayProgress.value = current + diff * speed;

  if (typeof requestAnimationFrame !== "undefined") {
    _animFrame = requestAnimationFrame(animate);
  } else {
    _animFrame = null;
  }
};

const startAnim = () => {
  if (_animFrame !== null) return;
  if (typeof requestAnimationFrame === "undefined") return;
  _animFrame = requestAnimationFrame(animate);
};

const finaliseSnap = () => {
  // Truly done — push targets to 100% so the bar fills to the end
  _softTarget = 100;
  _hardTarget = 100;
  startAnim();
  // Hold at 100% briefly so the user sees the completed bar, then reset.
  _holdTimer = setTimeout(() => {
    if (isSettled()) {
      _peakCount.value = 0;
      _displayProgress.value = 0;
      _softTarget = 0;
      _hardTarget = 0;
      _errorState.value = { hasError: false, message: null };
    }
    _holdTimer = null;
  }, HOLD_AT_100_MS);
};

// Arm a decay that drops phantom reservations and finalises the bar if no tracked
// request ever materialises for them. Called whenever the tracker is left in a
// "reserved but idle" state (reserve() with no/fewer requests, or the last end()
// while reservations remain). start() cancels it as soon as a real request begins.
const armPhantomReservationDecay = () => {
  schedulePendingDecay(() => {
    // Phantom reservations have been dropped (_pendingReserved.value → 0) while nothing is
    // active. We're truly done — finalise straight away instead of waiting another full
    // SETTLE_DELAY_MS, which used to make the bar linger ~2.7s after real work finished.
    cancelReset();
    if (isSettled()) {
      finaliseSnap();
    } else {
      recomputeTargets();
      startAnim();
    }
  });
};

// ─── Public API ───
export const useRequestActivity = () => {
  const start = () => {
    cancelReset();
    cancelPendingDecay();

    if (_pendingReserved.value > 0) {
      // Consume a reserved slot
      _pendingReserved.value -= 1;
    } else if (_peakCount.value === 0) {
      // Truly fresh batch (peak was reset to 0)
      _peakCount.value = 1;
      _displayProgress.value = 0;
      _softTarget = 0;
      _hardTarget = 0;
      _errorState.value = { hasError: false, message: null };
    } else {
      // Mid-batch unreserved extension — extend peak
      _peakCount.value = Math.max(
        _peakCount.value,
        _activeCount.value + 1,
      );
    }

    _activeCount.value += 1;
    recomputeTargets();
    startAnim();
  };

  const end = (error?: unknown) => {
    _activeCount.value = Math.max(0, _activeCount.value - 1);

    if (error) {
      const message =
        error instanceof Error && error.message.trim()
          ? error.message.trim()
          : "İşlem tamamlanamadı.";
      _errorState.value = { hasError: true, message };
    }

    recomputeTargets();
    startAnim();

    // Only schedule finalisation if no more requests are pending/reserved
    if (isSettled()) {
      cancelReset();
      _resetTimer = setTimeout(() => {
        _resetTimer = null;
        if (isSettled()) finaliseSnap();
      }, SETTLE_DELAY_MS);
    } else if (_activeCount.value === 0 && _pendingReserved.value > 0) {
      // Active dropped to 0 but caller reserved slots that never materialised
      // (e.g. reserve(2) followed by 1 real request + 1 Promise.resolve).
      // Schedule a decay to drop phantom reservations so the bar can finalise.
      armPhantomReservationDecay();
    }
  };

  const reset = () => {
    cancelReset();
    cancelPendingDecay();
    if (_animFrame !== null) {
      if (typeof cancelAnimationFrame !== "undefined") {
        cancelAnimationFrame(_animFrame);
      }
      _animFrame = null;
    }
    _activeCount.value = 0;
    _peakCount.value = 0;
    _displayProgress.value = 0;
    _softTarget = 0;
    _hardTarget = 0;
    _pendingReserved.value = 0;
    _errorState.value = { hasError: false, message: null };
  };

  /**
   * Pre-declare an expected request count. Keeps the bar visible across
   * sequential bursts and gives the progress maths a head start.
   * Safe to over-call: extra unreserved requests extend the batch.
   *
   * Example:
   *   const activity = useRequestActivity()
   *   activity.reserve(6)
   *   await Promise.all([fetchA(), fetchB(), ..., fetchF()])
   */
  const reserve = (expectedCount: number) => {
    if (expectedCount <= 0) return;
    cancelReset();
    if (isSettled() && _peakCount.value === 0) {
      // Brand new
      _displayProgress.value = 0;
      _softTarget = 0;
      _hardTarget = 0;
      _errorState.value = { hasError: false, message: null };
    }
    _pendingReserved.value += expectedCount;
    _peakCount.value = Math.max(
      _peakCount.value,
      _activeCount.value + _pendingReserved.value,
    );
    recomputeTargets();

    // Self-heal: if the reserved requests are cached/short-circuited and no tracked
    // request ever fires (so end() is never called), arm the decay now so the bar
    // can't stay "active" forever. start() cancels this the moment a request begins.
    if (_activeCount.value === 0) armPhantomReservationDecay();
  };

  /**
   * Convenience: pre-declare batch size and run factories in parallel.
   */
  const batch = async <T>(
    factories: Array<() => Promise<T>>,
  ): Promise<T[]> => {
    reserve(factories.length);
    return Promise.all(factories.map((fn) => fn()));
  };

  return {
    active: computed(
      () => _activeCount.value > 0 || _pendingReserved.value > 0,
    ),
    count: computed(() => _activeCount.value),
    peak: computed(() => _peakCount.value),
    completed: computed(() =>
      Math.max(
        0,
        _peakCount.value - _activeCount.value - _pendingReserved.value,
      ),
    ),
    progress: computed(() => _displayProgress.value),
    hasError: computed(() => _errorState.value.hasError),
    lastError: computed(() => _errorState.value.message),
    start,
    end,
    reset,
    reserve,
    batch,
  };
};
