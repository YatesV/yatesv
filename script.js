const typeText = document.querySelector('.type-text');
const disclaimer = document.querySelector('.disclaimer');
const buttonContainer = document.querySelector('.button-container');
const enterButton = document.querySelector('.pixel-button');
const terminalOverlay = document.querySelector('.terminal-overlay');
const terminalOutput = document.querySelector('.terminal-output');
const terminalWindow = document.querySelector('.terminal-window');

if (typeText && disclaimer && enterButton) {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  let typingTicker = null;
  let interactionUnlocked = false;
  const noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.04, audioCtx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  function unlockAudio() {
    if (interactionUnlocked) return;
    interactionUnlocked = true;
    audioCtx.resume().catch(() => { interactionUnlocked = false; });
  }

  function playTypeTick() {
    const now = audioCtx.currentTime;
    const master = audioCtx.createGain();
    master.gain.value = 0.16 + Math.random() * 0.04;

    const pan = audioCtx.createStereoPanner();
    pan.pan.value = (Math.random() - 0.5) * 0.35;
    master.connect(pan);
    pan.connect(audioCtx.destination);

    // High click — tight high-pass noise burst
    const hiNoise = audioCtx.createBufferSource();
    hiNoise.buffer = noiseBuffer;
    const hiFilter = audioCtx.createBiquadFilter();
    hiFilter.type = 'highpass';
    hiFilter.frequency.value = 2600 + Math.random() * 600;
    hiFilter.Q.value = 8;
    const hiGain = audioCtx.createGain();
    hiGain.gain.setValueAtTime(0.0001, now);
    hiGain.gain.linearRampToValueAtTime(0.12, now + 0.003);
    hiGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

    hiNoise.connect(hiFilter);
    hiFilter.connect(hiGain);
    hiGain.connect(master);

    // Low thock — low-pass noise for a softer mechanical body
    const lowNoise = audioCtx.createBufferSource();
    lowNoise.buffer = noiseBuffer;
    const lowFilter = audioCtx.createBiquadFilter();
    lowFilter.type = 'lowpass';
    lowFilter.frequency.value = 200 + Math.random() * 120;
    lowFilter.Q.value = 0.9;
    const lowGain = audioCtx.createGain();
    lowGain.gain.setValueAtTime(0.0001, now);
    lowGain.gain.linearRampToValueAtTime(0.07, now + 0.005);
    lowGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

    lowNoise.connect(lowFilter);
    lowFilter.connect(lowGain);
    lowGain.connect(master);

    hiNoise.start(now);
    hiNoise.stop(now + 0.09);
    lowNoise.start(now);
    lowNoise.stop(now + 0.12);
  }

  function startTypingSound() {
    if (typingTicker) return;
    typingTicker = setInterval(playTypeTick, 120);
  }

  function stopTypingSound() {
    if (!typingTicker) return;
    clearInterval(typingTicker);
    typingTicker = null;
  }

  typeText.addEventListener('animationstart', (event) => {
    if (event.animationName !== 'neonTyping') return;
    unlockAudio();
    startTypingSound();
  });

  typeText.addEventListener('animationend', (event) => {
    if (event.animationName === 'neonTyping') {
      stopTypingSound();
    }
  });

  typeText.addEventListener('animationcancel', (event) => {
    if (event.animationName === 'neonTyping') {
      stopTypingSound();
    }
  });

  function addUnlockTrigger(element, eventName) {
    element.addEventListener(eventName, unlockAudio, { once: true });
  }

  if (buttonContainer) {
    addUnlockTrigger(buttonContainer, 'pointerenter');
    addUnlockTrigger(buttonContainer, 'pointerover');
  }

  addUnlockTrigger(document, 'pointermove');
  addUnlockTrigger(document, 'pointerdown');
  addUnlockTrigger(document, 'wheel');
  addUnlockTrigger(document, 'keydown');
  addUnlockTrigger(document, 'touchstart');

  const MAIN_URL = 'main.html';
  let hasOpenedDisclaimer = false;
  const termLines = [
    'booting retro shell ...',
    'mount /home/yatesv/projects',
    'loading pixel font',
    'warming up audio drivers',
    'connecting to indie-net ... ok',
    'launching main site'
  ];

  function typeTerminal(lines, onDone) {
    if (!terminalOverlay || !terminalOutput) {
      onDone();
      return;
    }
    terminalOverlay.classList.add('active');
    terminalOutput.innerHTML = '';
    const textSpan = document.createElement('span');
    textSpan.className = 'terminal-text';
    const caretSpan = document.createElement('span');
    caretSpan.className = 'terminal-caret';
    caretSpan.textContent = '█';
    terminalOutput.append(textSpan, caretSpan);
    let lineIndex = 0;
    let charIndex = 0;
    let typingTimer = null;

    function updateCaretGlow() {
      if (!terminalWindow) return;
      const caretRect = caretSpan.getBoundingClientRect();
      const windowRect = terminalWindow.getBoundingClientRect();
      const x = ((caretRect.left + caretRect.width / 2) - windowRect.left) / windowRect.width;
      const y = ((caretRect.top + caretRect.height / 2) - windowRect.top) / windowRect.height;
      terminalWindow.style.setProperty('--caret-x', `${Math.max(0, Math.min(1, x)) * 100}%`);
      terminalWindow.style.setProperty('--caret-y', `${Math.max(0, Math.min(1, y)) * 100}%`);
    }

    function getDelay(lastChar, isNewLine) {
      if (isNewLine) return 140 + Math.random() * 60;
      if (lastChar === '.' || lastChar === ':') return 120 + Math.random() * 40;
      if (lastChar === ' ') return 18 + Math.random() * 18;
      return 24 + Math.random() * 18;
    }

    function nextChar() {
      if (lineIndex >= lines.length) {
        setTimeout(onDone, 350);
        stopTypingSound();
        return;
      }
      const line = lines[lineIndex];
      let delay = 30;
      if (charIndex < line.length) {
        const ch = line[charIndex];
        textSpan.textContent += ch;
        if (ch !== ' ') playTypeTick();
        charIndex += 1;
        delay = getDelay(ch, false);
      } else {
        textSpan.textContent += '\n';
        lineIndex += 1;
        charIndex = 0;
        delay = getDelay('', true);
      }
      updateCaretGlow();
      typingTimer = setTimeout(nextChar, delay);
    }

    function bindTerminalParallax() {
      if (!terminalOverlay || !terminalWindow) return;
      terminalOverlay.addEventListener('pointermove', (event) => {
        const rect = terminalWindow.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        const tiltX = (0.5 - y) * 6;
        const tiltY = (x - 0.5) * 8;
        terminalWindow.style.setProperty('--term-tilt-x', `${tiltX}deg`);
        terminalWindow.style.setProperty('--term-tilt-y', `${tiltY}deg`);
      });
      terminalOverlay.addEventListener('pointerleave', () => {
        terminalWindow.style.setProperty('--term-tilt-x', '0deg');
        terminalWindow.style.setProperty('--term-tilt-y', '0deg');
      });
    }

    unlockAudio();
    bindTerminalParallax();
    nextChar();
  }

  let isLaunching = false;
  enterButton.addEventListener('click', (event) => {
    event.preventDefault();
    if (!hasOpenedDisclaimer) {
      hasOpenedDisclaimer = true;
      disclaimer.classList.add('open');
      unlockAudio();
      typeText.style.animation = 'none';
      // force reflow
      // eslint-disable-next-line no-unused-expressions
      typeText.offsetHeight;
      typeText.style.animation = '';
      return;
    }
    if (isLaunching) return;
    isLaunching = true;
    typeTerminal(termLines, () => {
      window.location.href = MAIN_URL;
    });
  });
}
