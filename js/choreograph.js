//  Choreograph.js
//  lightweight demonstration and simulation for touch events
//  supports tap, swipe, and drag
//  version 1.1 • 2025-06-14
//  Kim Slawson • https://github.com/kimslawson/

/*  Usage:

    // Wait 400ms, then tap
    choreograph.tap('#btn', { after: 400 });

    // Delay swipe 1s, simulate interaction
    choreograph.swipe('#carousel', {
      direction: 'right',
      after: 1000,
      simulate: true
    });

    // Chain a drag after 2s
    choreograph.drag('#slider', {
      to: { x: 500, y: 300 },
      after: 2000,
      simulate: true
    });

    // Sequence an arbitrary number of events, one after another
    choreograph.sequence([
      {
        action: 'tap',
        selector: '#launch',
        options: {
          simulate: true,
          after: 200
        }
      },
      {
        action: 'swipe',
        selector: '#carousel',
        options: {
          direction: 'right',
          simulate: true,
          duration: 800
        }
      },
      {
        action: 'drag',
        selector: '#knob',
        options: {
          to: { x: 700, y: 250 },
          simulate: true,
          easing: 'ease-in-out',
          duration: 1000
        }
      }
    ]);
*/

const choreograph = (() => {
  const defaultOptions = {
    duration: 600,
    easing: 'ease-out',
    radius: 16,
    color: '#000',
    opacity: 0.15,
    zIndex: 9999,
    simulate: false,
    after: 0
  };

  const easings = {
    linear: t => t,

    easeInQuad: t => t * t,
    easeOutQuad: t => t * (2 - t),
    easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,

    easeInCubic: t => t * t * t,
    easeOutCubic: t => (--t) * t * t + 1,
    easeInOutCubic: t =>
      t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,

    easeInQuart: t => t * t * t * t,
    easeOutQuart: t => 1 - (--t) * t * t * t,
    easeInOutQuart: t =>
      t < 0.5
        ? 8 * t * t * t * t
        : 1 - 8 * (--t) * t * t * t,

    easeInQuint: t => t * t * t * t * t,
    easeOutQuint: t => 1 + (--t) * t * t * t * t,
    easeInOutQuint: t =>
      t < 0.5
        ? 16 * t * t * t * t * t
        : 1 + 16 * (--t) * t * t * t * t,

    // subtle bounce, short and snappy
    spring: t =>
      1 - Math.cos(t * Math.PI * 3) * Math.exp(-t * 5) * 0.4,

    easeOutElastic: t => {
      const p = 0.3;
      const s = p / 4;
      return t === 0
        ? 0
        : t === 1
        ? 1
        : Math.pow(2, -10 * t) * Math.sin((t - s) * (2 * Math.PI) / p) + 1;
    }
  };

  function createTouchDot({ x, y }, opts = {}) {
    const o = { ...defaultOptions, ...opts };
    const dot = document.createElement('div');
    Object.assign(dot.style, {
      position: 'fixed',
      top: `${y - o.radius}px`,
      left: `${x - o.radius}px`,
      width: `${2 * o.radius}px`,
      height: `${2 * o.radius}px`,
      borderRadius: '50%',
      background: o.color,
      opacity: o.opacity,
      pointerEvents: 'none',
      transition: `all ${o.duration}ms ${o.easing}`,
      zIndex: o.zIndex
    });
    document.body.appendChild(dot);
    return dot;
  }

  function getCenter(el) {
    const rect = el.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  }

  function dispatchPointerEvent(type, x, y, target) {
    const evt = new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      pointerType: 'pointer'
    });
    target.dispatchEvent(evt);
  }

  function animateDot(dot, from, to, duration, easing, onUpdate, onDone) {
    const start = performance.now();

    const easingFunc = typeof easing === 'function'
      ? easing
      : easings[easing] || easings.linear;

    function step(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = easingFunc(t);
      const x = from.x + (to.x - from.x) * eased;
      const y = from.y + (to.y - from.y) * eased;

      dot.style.transform = `translate(${x}px, ${y}px)`;
      if (onUpdate) onUpdate({ x, y });

      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        if (onDone) onDone();
        dot.remove();
      }
    }

    requestAnimationFrame(step);
  }

  /* actions */
  function tap(selector, { click = true, ...options } = {}) {
    const opts = { ...defaultOptions, ...options };
    setTimeout(() => {
      const el = document.querySelector(selector);
      if (!el) {
        console.warn(`choreograph: No element found for selector "${selector}"`);
        return;
      }
      const center = getCenter(el);
      const dot = createTouchDot(center, opts);

      if (opts.simulate) {
        dispatchPointerEvent('pointerdown', center.x, center.y, el);
        dispatchPointerEvent('pointerup', center.x, center.y, el);
        if (click) {
          el.dispatchEvent(new MouseEvent('click', {
            bubbles: true,
            cancelable: true
          }));
        }
      }

      setTimeout(() => {
        dot.style.opacity = 0;
        dot.style.transform = 'scale(1.5)';
      }, 50);

      setTimeout(() => dot.remove(), opts.duration);
    }, opts.after);
  }

  function swipe(selector, { direction = 'left', distance = 100, ...options } = {}) {
    const opts = { ...defaultOptions, ...options };
    setTimeout(() => {
      const el = document.querySelector(selector);
      if (!el) {
        console.warn(`choreograph: No element found for selector "${selector}"`);
        return;
      }
      const start = getCenter(el);
      const delta = {
        left: [-distance, 0],
        right: [distance, 0],
        up: [0, -distance],
        down: [0, distance]
      }[direction] || [-distance, 0];
      const end = { x: start.x + delta[0], y: start.y + delta[1] };
      const dot = createTouchDot(start, opts);

      if (opts.simulate) {
        dispatchPointerEvent('pointerdown', start.x, start.y, el);
      }

      animateDot(dot, start, end, opts.duration, opts.easing,
        pos => {
          if (opts.simulate) dispatchPointerEvent('pointermove', pos.x, pos.y, el);
        },
        () => {
          if (opts.simulate) dispatchPointerEvent('pointerup', end.x, end.y, el);
        }
      );
    }, opts.after);
  }

  function drag(selector, { to, click = true, ...options }) {
    const opts = { ...defaultOptions, ...options };
    setTimeout(() => {
      const el = document.querySelector(selector);
      if (!el) {
        console.warn(`choreograph: No element found for selector "${selector}"`);
        return;
      }
      const from = getCenter(el);
      const dot = createTouchDot(from, opts);

      if (opts.simulate) {
        dispatchPointerEvent('pointerdown', from.x, from.y, el);
      }

      animateDot(dot, from, to, opts.duration, opts.easing,
        pos => {
          if (opts.simulate) dispatchPointerEvent('pointermove', pos.x, pos.y, el);
        },
        () => {
          if (opts.simulate) dispatchPointerEvent('pointerup', to.x, to.y, el);
          if (click) {
            el.dispatchEvent(new MouseEvent('click', {
              bubbles: true,
              cancelable: true
            }));
          }
        }
      );
    }, opts.after);
  }

  return {
    tap,
    swipe,
    drag,
    sequence: function (steps) {
      let i = 0;
      const actions = { tap, swipe, drag };

      function next() {
        if (i >= steps.length) return;

        const step = steps[i++];
        const fn = actions[step.action];
        if (typeof fn !== 'function') {
          console.warn(`choreograph: Unknown action: "${step.action}"`);
          next();
          return;
        }

        const opts = { ...step.options };
        const duration = opts.duration || defaultOptions.duration;
        const after = opts.after || 0;

        fn(step.selector, opts);

        // 50ms buffer between sequenced actions
        const buffer = 50;
        setTimeout(next, after + duration + buffer);
      }

      next();
    },
    // Expose internals for testing
    _easings: easings,
    _getCenter: getCenter
  };
})();
