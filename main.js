(() => {
  const body = document.body;
  if (!body.classList.contains('main-body')) return;

  // Trigger the Matrix-like reveal once the DOM is ready
  window.addEventListener('DOMContentLoaded', () => {
    requestAnimationFrame(() => {
      body.classList.add('is-ready');
    });
  });

  // Audio setup
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const audioCtx = AudioCtx ? new AudioCtx() : null;
  let unlocked = false;

  function unlockAudio() {
    if (!audioCtx || unlocked) return;
    audioCtx.resume().then(() => {
      unlocked = true;
      playStartupWhoosh();
    }).catch(() => {});
  }

  function connectMaster(node, level = 0.2) {
    if (!audioCtx) return;
    const master = audioCtx.createGain();
    master.gain.value = level;
    node.connect(master);
    master.connect(audioCtx.destination);
    return master;
  }

  function playStartupWhoosh() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.6, audioCtx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const noise = audioCtx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(2200, now + 0.6);
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);

    noise.connect(filter);
    filter.connect(gain);
    connectMaster(gain, 0.4);
    noise.start(now);
    noise.stop(now + 0.7);
  }

  function playBlip() {
    if (!audioCtx || !unlocked) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    osc.type = 'square';
    const startFreq = 300 + Math.random() * 200;
    const endFreq = 1200 + Math.random() * 600;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.08);
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    osc.connect(gain);
    connectMaster(gain, 0.35);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  ['pointerdown', 'keydown', 'touchstart', 'wheel'].forEach((evt) => {
    document.addEventListener(evt, unlockAudio, { once: true });
  });

  document.querySelectorAll('.card').forEach((card) => {
    card.addEventListener('mouseenter', playBlip);
  });

  const parallaxTargets = document.querySelectorAll('.card, .panel');
  parallaxTargets.forEach((target) => {
    const intensity = target.classList.contains('card') ? 10 : 6;
    const lift = target.classList.contains('card') ? 6 : 3;

    target.addEventListener('pointermove', (event) => {
      if (target.classList.contains('is-dragging')) return;
      const rect = target.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      const rotateX = (0.5 - y) * intensity;
      const rotateY = (x - 0.5) * intensity;

      target.style.setProperty('--px', `${x * 100}%`);
      target.style.setProperty('--py', `${y * 100}%`);
      if (!target.classList.contains('is-dragging')) {
        target.style.setProperty('--tilt-x', `${rotateX}deg`);
        target.style.setProperty('--tilt-y', `${rotateY}deg`);
        target.style.setProperty('--lift', `-${lift}px`);
      }
      target.classList.add('is-active');
    });

    target.addEventListener('pointerleave', () => {
      if (!target.classList.contains('is-dragging')) {
        target.style.removeProperty('--tilt-x');
        target.style.removeProperty('--tilt-y');
        target.style.removeProperty('--lift');
      }
      target.classList.remove('is-active');
    });
  });

  const draggableTargets = document.querySelectorAll('.card');
  draggableTargets.forEach((target) => {
    target.classList.add('draggable');
  });

  const dragState = new WeakMap();
  const rafState = new WeakMap();
  let activeDragTarget = null;

  function getDragValue(target, key) {
    const value = parseFloat(getComputedStyle(target).getPropertyValue(key));
    return Number.isNaN(value) ? 0 : value;
  }

  function animateBack(target) {
    const state = dragState.get(target);
    if (!state) return;

    const k = 0.12;
    const damping = 0.78;
    state.vx = (state.vx + (-state.x) * k) * damping;
    state.vy = (state.vy + (-state.y) * k) * damping;
    state.x += state.vx;
    state.y += state.vy;
    target.style.setProperty('--drag-x', `${state.x}px`);
    target.style.setProperty('--drag-y', `${state.y}px`);

    if (Math.abs(state.x) < 0.5 && Math.abs(state.y) < 0.5 && Math.abs(state.vx) < 0.5 && Math.abs(state.vy) < 0.5) {
      target.style.setProperty('--drag-x', '0px');
      target.style.setProperty('--drag-y', '0px');
      dragState.delete(target);
      target.classList.remove('is-dragging');
      return;
    }

    rafState.set(target, requestAnimationFrame(() => animateBack(target)));
  }

  function endDrag(event) {
    if (!activeDragTarget) return;
    const target = activeDragTarget;
    const state = dragState.get(target);
    if (!state) {
      activeDragTarget = null;
      return;
    }
    state.dragging = false;
    if (event && event.pointerId != null) {
      try { target.releasePointerCapture(event.pointerId); } catch (err) { /* noop */ }
    }
    animateBack(target);
    activeDragTarget = null;
  }

  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  window.addEventListener('blur', endDrag);

  draggableTargets.forEach((target) => {
    target.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      target.setPointerCapture(event.pointerId);
      const currentX = getDragValue(target, '--drag-x');
      const currentY = getDragValue(target, '--drag-y');
      const state = { startX: event.clientX, startY: event.clientY, baseX: currentX, baseY: currentY, x: currentX, y: currentY, vx: 0, vy: 0, dragging: true };
      dragState.set(target, state);
      target.classList.add('is-dragging');
      target.style.setProperty('--tilt-x', '0deg');
      target.style.setProperty('--tilt-y', '0deg');
      target.style.setProperty('--lift', '0px');
      activeDragTarget = target;
      const raf = rafState.get(target);
      if (raf) cancelAnimationFrame(raf);
    });

    target.addEventListener('pointermove', (event) => {
      const state = dragState.get(target);
      if (!state || !state.dragging) return;
      const dx = event.clientX - state.startX;
      const dy = event.clientY - state.startY;
      state.x = state.baseX + dx;
      state.y = state.baseY + dy;
      target.style.setProperty('--drag-x', `${state.x}px`);
      target.style.setProperty('--drag-y', `${state.y}px`);
    });

    target.addEventListener('pointerup', endDrag);
    target.addEventListener('pointercancel', endDrag);
  });

  // Runner removed.
})();
