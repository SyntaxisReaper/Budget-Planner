// Simple Web Audio API Synthesizer for UI Sounds
// Generates sounds procedurally without requiring asset files.

let audioCtx = null;

function getContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(freq, type, duration, vol, startTimeOffset = 0, slideToFreq = null) {
  const ctx = getContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  
  const startTime = ctx.currentTime + startTimeOffset;
  
  osc.frequency.setValueAtTime(freq, startTime);
  if (slideToFreq) {
    osc.frequency.exponentialRampToValueAtTime(slideToFreq, startTime + duration);
  }

  // Envelope
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(vol, startTime + 0.05); // quick attack
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration); // decay

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration);
}

export function isAudioEnabled() {
  return localStorage.getItem('ui_sounds_enabled') !== 'false';
}

export function playSuccessSound() {
  if (!isAudioEnabled()) return;
  // Cha-ching: Two quick rising notes
  playTone(493.88, 'sine', 0.1, 0.3, 0); // B4
  playTone(659.25, 'sine', 0.2, 0.3, 0.1); // E5
}

export function playErrorSound() {
  if (!isAudioEnabled()) return;
  // Dull error: Low frequency square wave
  playTone(130.81, 'triangle', 0.2, 0.4, 0); // C3
  playTone(120.00, 'square', 0.2, 0.2, 0.05); // slight dissonance
}

export function playCelebrationSound() {
  if (!isAudioEnabled()) return;
  // Chime: Bright, slightly sustained chord
  playTone(523.25, 'sine', 0.4, 0.2, 0);    // C5
  playTone(659.25, 'sine', 0.4, 0.2, 0.05); // E5
  playTone(783.99, 'sine', 0.6, 0.2, 0.1);  // G5
  playTone(1046.50, 'sine', 0.8, 0.2, 0.15);// C6
}
