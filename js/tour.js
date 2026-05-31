//  tour.js
//  First-run site tour for slawson.org
//  Demonstrates: panel switching, section chevrons, keyboard nav, swipe, blob nav
//  version 1.0 • 2026-05-31
//  Kim Slawson • https://github.com/kimslawson/

const tour = (() => {
  const STORAGE_KEY = 'slawson_tour_seen';

  let _tooltipEl = null;
  let _stepTimeout = null;
  let _currentSteps = [];
  let _currentIndex = 0;

  const isMobile = () => window.innerWidth <= 768;

  const isDarkMode = () =>
    document.documentElement.classList.contains('dark') ||
    (!document.documentElement.classList.contains('light') &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Steps: onlyMobile / onlyDesktop filter which platform sees each step.
  // demo() fires choreograph visuals. simulate: false keeps navigation state intact.
  const steps = [
    {
      title: 'Welcome to slawson.org',
      body: 'Here\'s a quick tour of how to get around. Click <strong>Next</strong> to continue or <em>skip tour</em> to dismiss.',
      target: '#creative h1',
      duration: 4000
    },
    {
      title: 'Switch panels',
      body: 'Click the background panel to toggle between <em>Creative</em> and <em>Technologist</em>.',
      target: '#technologist .logo',
      demo: () => choreograph.tap('#technologist .logo', {
        after: 700,
        color: 'var(--blue)',
        opacity: 0.7,
        radius: 24
      }),
      duration: 3500
    },
    {
      title: 'Section chevrons',
      body: 'Click <strong>«</strong> or <strong>»</strong> beside any heading to navigate backward or forward.',
      target: '#creative .nav-next',
      demo: () => choreograph.tap('#creative .nav-next', {
        after: 600,
        color: 'var(--blue)',
        opacity: 0.8,
        radius: 18
      }),
      duration: 3200,
      onlyDesktop: true
    },
    {
      title: 'Keyboard navigation',
      body: 'Press <kbd>←</kbd> <kbd>→</kbd> to navigate between sections. Click into the content area first to focus it.',
      target: '#creative main',
      duration: 3200,
      onlyDesktop: true
    },
    {
      title: 'Sidebar navigation',
      body: 'Click any item in the sidebar to jump directly to that section.',
      target: '#creative nav',
      demo: () => choreograph.tap('#creative nav li:nth-child(2) a', {
        after: 600,
        color: 'var(--blue)',
        opacity: 0.7,
        radius: 16
      }),
      duration: 3200,
      onlyDesktop: true
    },
    {
      title: 'Swipe to navigate',
      body: 'Swipe left or right on the content area to move between sections.',
      target: '#creative main',
      demo: () => choreograph.swipe('#creative main', {
        direction: 'left',
        distance: 90,
        after: 600,
        color: 'var(--blue)',
        opacity: 0.7,
        duration: 700
      }),
      duration: 3200,
      onlyMobile: true
    },
    {
      title: 'Tap nav to cycle',
      body: 'Tap the navigation area to advance to the next section.',
      target: '#creative nav',
      demo: () => choreograph.tap('#creative nav', {
        after: 600,
        color: 'var(--blue)',
        opacity: 0.7,
        radius: 20
      }),
      duration: 3000,
      onlyMobile: true
    }
  ];

  function getActiveSteps() {
    const mobile = isMobile();
    return steps.filter(s =>
      !(s.onlyDesktop && mobile) && !(s.onlyMobile && !mobile)
    );
  }

  function positionTooltip(el, targetSelector) {
    const target = document.querySelector(targetSelector);
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    const tooltipW = 290;
    const tooltipH = el.offsetHeight || 130;
    const margin = 14;

    let top, left;

    // Prefer below the target; fall back to above
    if (rect.bottom + tooltipH + margin < vpH) {
      top = rect.bottom + margin;
    } else if (rect.top - tooltipH - margin > 0) {
      top = rect.top - tooltipH - margin;
    } else {
      top = margin;
    }

    // Center horizontally on the target, clamped to viewport
    left = rect.left + rect.width / 2 - tooltipW / 2;
    left = Math.max(margin, Math.min(left, vpW - tooltipW - margin));

    el.style.top = `${Math.round(top)}px`;
    el.style.left = `${Math.round(left)}px`;
  }

  function buildTooltip(step, index, total) {
    const dark = isDarkMode();
    const el = document.createElement('div');
    el.id = 'tour-tooltip';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Site tour');

    // Colors matching Solarized palette
    const bg     = dark ? '#002b36' : '#fdf6e3';
    const border  = dark ? '#586e75' : '#93a1a1';
    const text    = dark ? '#839496' : '#657b83';
    const btnBg   = dark ? '#073642' : '#eee8d5';

    Object.assign(el.style, {
      position:   'fixed',
      width:      '290px',
      padding:    '14px 16px 12px',
      borderRadius: '6px',
      background: bg,
      color:      text,
      border:     `1px solid ${border}`,
      boxShadow:  '0 4px 20px rgba(0,0,0,0.22)',
      zIndex:     '10001',
      fontSize:   '14px',
      lineHeight: '1.5',
      fontFamily: 'Mercury Text G4, Georgia, serif',
      pointerEvents: 'all',
      opacity:    '0',
      transition: 'opacity 0.2s ease'
    });

    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
        <strong style="font-size:15px;color:${dark ? '#93a1a1' : '#586e75'}">${step.title}</strong>
        <span style="opacity:0.45;font-size:11px;letter-spacing:0.03em">${index + 1} / ${total}</span>
      </div>
      <p style="margin:0 0 11px">${step.body}</p>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <button id="tour-skip" style="background:none;border:none;cursor:pointer;opacity:0.45;font-size:12px;padding:0;color:inherit;font-family:inherit">skip tour</button>
        <button id="tour-next" style="border:none;cursor:pointer;font-weight:bold;padding:5px 12px;border-radius:4px;background:${btnBg};color:${text};font-size:13px;font-family:inherit">${index + 1 < total ? 'Next →' : 'Done'}</button>
      </div>
    `;

    document.body.appendChild(el);

    // Position after appending (so offsetHeight is available)
    positionTooltip(el, step.target);

    // Fade in
    requestAnimationFrame(() => { el.style.opacity = '1'; });

    el.querySelector('#tour-next').addEventListener('click', next);
    el.querySelector('#tour-skip').addEventListener('click', stop);

    return el;
  }

  function removeTooltip() {
    if (_tooltipEl) {
      _tooltipEl.remove();
      _tooltipEl = null;
    }
    if (_stepTimeout) {
      clearTimeout(_stepTimeout);
      _stepTimeout = null;
    }
  }

  function showStep(index) {
    removeTooltip();
    if (index >= _currentSteps.length) {
      stop();
      return;
    }

    const step = _currentSteps[index];
    _currentIndex = index;
    _tooltipEl = buildTooltip(step, index, _currentSteps.length);

    if (typeof step.demo === 'function') step.demo();

    _stepTimeout = setTimeout(next, step.duration);
  }

  function next() {
    showStep(_currentIndex + 1);
  }

  function stop() {
    removeTooltip();
    localStorage.setItem(STORAGE_KEY, '1');
  }

  function start() {
    _currentSteps = getActiveSteps();
    _currentIndex = 0;
    showStep(0);
  }

  // Call on DOMContentLoaded; starts tour automatically on first visit
  function firstRunCheck() {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setTimeout(start, 1500);
    }
  }

  // Allow resetting the tour (useful for testing and the ? button)
  function reset() {
    localStorage.removeItem(STORAGE_KEY);
  }

  return { start, stop, reset, firstRunCheck };
})();
