/* TODO:
 * debounce keyboard nav
 * mobile fixes
 */

// -------------------------------
// Helper: Get currently visible section
// -------------------------------
function getCurrentVisibleSection(main, sections) {
  const mainRect = main.getBoundingClientRect();
  for (const section of sections) {
    const rect = section.getBoundingClientRect();
    if (rect.left >= mainRect.left && rect.left < mainRect.right) {
      return section;
    }
  }
  return null;
}

// -------------------------------
// Helper: add proper anchor tags to links in text
// -------------------------------
function linkify(text) {
  const urlPattern = /(\bhttps?:\/\/[^\s<>"]+|\bwww\.[^\s<>"]+)/gi;
  return text.replace(urlPattern, (url) => {
    let href = url;
    if (!href.match(/^https?:\/\//i)) {
      href = 'https://' + href; // add protocol if missing
    }
    return `<a href="${href}" target="_blank" rel="noopener noreferrer nofollow">${url}</a>`;
  });
}

/* dumb bc resets state when background containers are clicked. boo.
// -------------------------------
// Splash click handler
// -------------------------------
document.querySelectorAll('.initial').forEach(element => {
  element.addEventListener('click', function () {
    const allElements = document.querySelectorAll('.initial, .activated, .background');
    allElements.forEach(el => {
      if (el === this) {
        el.classList.remove('initial', 'background');
        el.classList.add('activated');
      } else {
        el.classList.remove('initial', 'activated');
        el.classList.add('background');
      }
    });
  });
});
*/
// -------------------------------
// Splash click handler (remembers scroll position per container)
// -------------------------------
/*
const lastSectionByContainer = new Map();

document.querySelectorAll('#creative, #technologist').forEach(container => {
  const main = container.querySelector('main');
  const sections = main?.querySelectorAll('section[id]');

  if (!main || !sections) return;

  container.addEventListener('click', () => {
console.group(`🌀 Container Click: ${container.id}`);
console.log('Active container before click:', document.querySelector('.activated')?.id || 'none');
    const isAlreadyActive = container.classList.contains('activated');
    if (isAlreadyActive) return; // do nothing if already active

    // Save the currently visible section of the currently active container
    const currentActive = document.querySelector('.activated');
    if (currentActive) {
      const currentMain = currentActive.querySelector('main');
      const currentSection = getCurrentVisibleSection(currentMain, currentMain.querySelectorAll('section[id]'));
      if (currentSection) {
console.log(`📦 Saving current section for ${currentActive.id}:`, currentSection.id);
        lastSectionByContainer.set(currentActive.id, currentSection.id);
      }
    }

    // Activate this container, background the other
    const allContainers = document.querySelectorAll('#creative, #technologist');
    allContainers.forEach(el => {
      if (el === container) {
        el.classList.remove('initial', 'background');
        el.classList.add('activated');
      } else {
        el.classList.remove('initial', 'activated');
        el.classList.add('background');
      }
    });

    // Restore previous section if known
    const previousSectionId = lastSectionByContainer.get(container.id);
console.log(`🔁 Attempting to restore section for ${container.id}:`, previousSectionId);
    if (previousSectionId) {
      const targetSection = container.querySelector(`section#${previousSectionId}`);
if (targetSection) {
  console.log(`📍 Scrolling to section: #${previousSectionId}`);
} else {
  console.warn(`⚠️ Section #${previousSectionId} not found in ${container.id}`);
}
      if (targetSection) {

//        requestAnimationFrame(() => {
//          targetSection.scrollIntoView({
//            behavior: 'instant',
//            block: 'nearest',
//            inline: 'start'
//          });
//console.log(`✅ scrollIntoView complete for #${previousSectionId}`);
//console.groupEnd();
//
//targetSection.style.outline = '2px solid limegreen';
//setTimeout(() => {
//  targetSection.style.outline = '';
//}, 1000);
//        });

        requestAnimationFrame(() => {
          setTimeout(() => {
            targetSection.scrollIntoView({
              behavior: 'instant',
              block: 'nearest',
              inline: 'start'
            });
            console.log(`✅ Final scrollIntoView for #${previousSectionId}`);
          }, ); // allow layout + snap settle
        });
      }
    }
  });
});
*/
// ---------------------------------------------
// Splash click handler (snapproof + scroll-restore + hash-stable)
// ---------------------------------------------

const lastSectionByContainer = new Map();

document.querySelectorAll('#creative, #technologist').forEach(container => {
  const main = container.querySelector('main');
  const sections = main?.querySelectorAll('section[id]');
  if (!main || !sections) return;

  container.addEventListener('click', () => {
    const isAlreadyActive = container.classList.contains('activated');
    if (isAlreadyActive) return;

    // 🧠 Save current section of the active container
    const currentActive = document.querySelector('.activated');
    if (currentActive) {
      const currentMain = currentActive.querySelector('main');
      const currentSection = getCurrentVisibleSection(
        currentMain,
        currentMain.querySelectorAll('section[id]')
      );
      if (currentSection) {
        lastSectionByContainer.set(currentActive.id, currentSection.id);
      }
    }

    // 🧠 Get section to restore
    const previousSectionId = lastSectionByContainer.get(container.id);
    const targetSection = previousSectionId
      ? container.querySelector(`section#${previousSectionId}`)
      : null;

    // 🫥 Temporarily activate layout (but not visual state)
    container.classList.add('pre-activated');

    // 🔍 Scroll to correct section BEFORE snap/paint
    if (targetSection) {
      targetSection.scrollIntoView({
        behavior: 'instant',
        block: 'nearest',
        inline: 'start'
      });
    }

    // 🛡️ Prevent scrollIntoView from updating the URL
    history.replaceState(null, '', ' '); // wipe hash to avoid accidental browser override

    // 🎯 Commit container class changes
    document.querySelectorAll('#creative, #technologist').forEach(el => {
      if (el === container) {
        el.classList.remove('initial', 'background', 'pre-activated');
        el.classList.add('activated');
      } else {
        el.classList.remove('initial', 'activated', 'pre-activated');
        el.classList.add('background');
      }
    });

    // ✅ Optional: restore hash after scroll if you want
    if (previousSectionId) {
      history.replaceState(null, '', `#${previousSectionId}`);
    }
  });
});

// -------------------------------
// Blog tag click handler
// -------------------------------
const tagLinks = document.querySelectorAll('div.tags a');
const tagSpans = document.querySelectorAll('div.tags span');
const posts = document.querySelectorAll('div.blog li');
const dateHeadings = document.querySelectorAll('div.blog h2');

tagLinks.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();

    const clickedTag = link.textContent.trim().toLowerCase();
    const clickedSpan = link.parentElement;

    if (clickedTag === 'all') {
      // Deselect all other tags
      tagSpans.forEach(span => span.classList.remove('selected'));
      clickedSpan.classList.add('selected');
      posts.forEach(post => post.classList.remove('hidden'));
      updateDateHeadingVisibility();
      return;
    }

    // Toggle clicked tag
    clickedSpan.classList.toggle('selected');

    // If any tag besides "all" is selected, deselect "all"
    const anyOtherSelected = [...tagSpans].some(span =>
      span.classList.contains('selected') &&
      span.textContent.trim().toLowerCase() !== 'all'
    );

    tagSpans.forEach(span => {
      if (span.textContent.trim().toLowerCase() === 'all') {
        span.classList.toggle('selected', !anyOtherSelected);
      }
    });

    // Gather all selected tags (excluding "all")
    const activeTags = [...tagSpans]
      .filter(span =>
        span.classList.contains('selected') &&
        span.textContent.trim().toLowerCase() !== 'all'
      )
      .map(span => span.textContent.trim().toLowerCase());

    // If none are selected, fallback to "All"
    if (activeTags.length === 0) {
      tagSpans.forEach(span => {
        if (span.textContent.trim().toLowerCase() === 'all') {
          span.classList.add('selected');
        }
      });
      posts.forEach(post => post.classList.remove('hidden'));
      updateDateHeadingVisibility();
      return;
    }

    // Otherwise, show posts that match any selected tag
    posts.forEach(post => {
      const postClasses = post.className.split(/\s+/);
      const matches = activeTags.some(tag => postClasses.includes(tag));
      post.classList.toggle('hidden', !matches);
    });

    updateDateHeadingVisibility();
  });
});

function updateDateHeadingVisibility() {
  dateHeadings.forEach(heading => {
    const nextList = heading.nextElementSibling;
    if (!nextList || nextList.tagName.toLowerCase() !== 'ul') return;

    const visibleItems = [...nextList.children].filter(
      el => !el.classList.contains('hidden')
    );

    heading.classList.toggle('hidden', visibleItems.length === 0);
  });
}

// -------------------------------
// Anchor-based initial state
// -------------------------------
/*
function matchHash() {
console.log("matching hash");
  const hash = window.location.hash;
  if (!hash) return;

  const creative = document.getElementById('creative');
  const technologist = document.getElementById('technologist');

  const creativeSections = creative.querySelectorAll('section[id]');
  const technologistSections = technologist.querySelectorAll('section[id]');

  const matchInContainer = (sections) =>
    Array.from(sections).some(section => `#${section.id}` === hash);

  const isCreative = matchInContainer(creativeSections);
  const isTechnologist = matchInContainer(technologistSections);

  if (isCreative) {
    creative.classList.remove('initial');
    technologist.classList.remove('initial');
    creative.classList.add('activated');
    technologist.classList.add('background');
  } else if (isTechnologist) {
    creative.classList.remove('initial');
    technologist.classList.remove('initial');
    technologist.classList.add('activated');
    creative.classList.add('background');
  }
}
*/
function matchHash() {
  const hash = window.location.hash.substring(1); // remove '#'
  if (!hash) return;

  const target = document.getElementById(hash);
  if (!target) return;

  // Determine which container the target belongs to
  const container = target.closest("#creative, #technologist");
  const otherContainer = container.id === "creative" ? document.getElementById("technologist") : document.getElementById("creative");

  // Activate the correct container
  container.classList.remove("initial", "background");
  container.classList.add("activated");

  // Set the other container to background
  otherContainer.classList.remove("initial", "activated");
  otherContainer.classList.add("background");

  // Focus and scroll to the target section
  setTimeout(() => {
    // 1) keep focus for a11y without scrolling the window
    target.focus({ preventScroll: true });

    // 2) scroll horizontally *inside* <main>
    const main = target.closest("main");
    if (main) {
      main.scrollTo({
        left:     target.offsetLeft,
        behavior: "instant"
      });
    }

    // 3) reset the page’s vertical scroll so your <aside> remains in view
    window.scrollTo({ top: 0, behavior: "instant" });
  }, 500);
}

// add the function above to both content load and hash change
document.addEventListener("DOMContentLoaded", () => {
  window.addEventListener('hashchange', matchHash);
  matchHash(); // run once on initial load
});


// -------------------------------
// Nav highlight on section intersection
// -------------------------------
// now updated to match id or (single) class on section
document.addEventListener("DOMContentLoaded", () => {
  function setupNavObserver(containerId) {
    const container = document.getElementById(containerId);
    const navLinks = container.querySelectorAll("nav a[href^='#']");
    const sections = container.querySelectorAll("section");

    if (!container || sections.length === 0) return;

    const sectionMap = new Map();

    sections.forEach(section => {
      const id = section.id;
      const className = section.classList.length === 1 ? section.classList[0] : null;
      sectionMap.set(section, { id, className });
    });

    const observer = new IntersectionObserver(entries => {
      // Find the topmost visible section (best match)
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visible) return;

      const { id, className } = sectionMap.get(visible.target);

      navLinks.forEach(link => {
        const href = link.getAttribute("href");
        const target = href?.slice(1); // Remove the '#' for comparison

        const matchesId = id && target === id;
        const matchesClass = className && target === className;

        link.classList.toggle("current", matchesId || matchesClass);
      });
    }, {
      root: container.querySelector("main"),
      threshold: [0.4, 0.6, 0.8]
    });

    sections.forEach(section => observer.observe(section));
  }

  setupNavObserver("creative");
  setupNavObserver("technologist");
});

// -------------------------------
// Enhance headings + keyboard nav
// -------------------------------
document.addEventListener("DOMContentLoaded", () => {
  function enhanceSectionNavigation(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const navLinks = Array.from(container.querySelectorAll("nav a[href^='#']"));
    const sectionIds = navLinks
      .map(link => link.getAttribute("href").slice(1))
      .filter(id => container.querySelector(`#${id}`));

    const sections = sectionIds.map(id => container.querySelector(`#${id}`));

    // Inject « » links into h1s
    sections.forEach((section, i, arr) => {
      const heading = section.querySelector("h1");
      if (!heading) return;

      // Prevent duplicate links
      if (!heading.querySelector('.nav-prev') && !heading.querySelector('.nav-next')) {
        const prevId = arr[(i - 1 + arr.length) % arr.length].id;
        const nextId = arr[(i + 1) % arr.length].id;

        const prevLink = document.createElement("a");
        prevLink.href = `#${prevId}`;
        prevLink.innerHTML = "&laquo;";
        prevLink.className = "nav-prev";
        prevLink.setAttribute("aria-label", "Previous section");

        const nextLink = document.createElement("a");
        nextLink.href = `#${nextId}`;
        nextLink.innerHTML = "&raquo;";
        nextLink.className = "nav-next";
        nextLink.setAttribute("aria-label", "Next section");

        heading.prepend(prevLink);
        heading.append(nextLink);
      }
    });

    // Enable ←/→ keyboard nav
    const main = container.querySelector("main");
    if (!main) return;
    main.setAttribute("tabindex", "0");

    main.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;

      const currentSection = getCurrentVisibleSection(main, sections);
      if (!currentSection) return;

      const currentIndex = sectionIds.indexOf(currentSection.id);
      const targetIndex = e.key === "ArrowLeft"
        ? (currentIndex - 1 + sectionIds.length) % sectionIds.length
        : (currentIndex + 1) % sectionIds.length;

      const targetSection = sections[targetIndex];
      if (targetSection) {
//        targetSection.scrollIntoView({ behavior: "smooth", inline: "start" });
        targetSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
        history.replaceState(null, "", `#${sectionIds[targetIndex]}`);
      }
    });
/* */

  }

  enhanceSectionNavigation("creative");
  enhanceSectionNavigation("technologist");
});

/*
// -------------------------------
// On resize, scroll current section back into view
// -------------------------------
window.addEventListener("resize", () => {
  const activeContainer = document.querySelector(".activated");
  if (!activeContainer) return;

  const main = activeContainer.querySelector("main");
  if (!main) return;

  const currentSection = getCurrentVisibleSection(main, main.querySelectorAll("section[id]"));
  if (!currentSection) return;

//  currentSection.scrollIntoView({ behavior: "instant" });
  currentSection.scrollIntoView({
    behavior: "smooth",
    block: "nearest",  // Stable, safe
    inline: "start"    // Optional for horizontal scroll snap
  });
});
*/
/*
// -------------------------------
// On resize, scroll current section back into view (debounced)
// -------------------------------
let resizeTimeout;

window.addEventListener("resize", () => {
  clearTimeout(resizeTimeout);

  resizeTimeout = setTimeout(() => {
    const activeContainer = document.querySelector(".activated");
    if (!activeContainer) return;

    const main = activeContainer.querySelector("main");
    if (!main) return;

    const currentSection = getCurrentVisibleSection(
      main,
      main.querySelectorAll("section[id]")
    );
    if (!currentSection) return;

    currentSection.scrollIntoView({
        behavior: "instant",
        block: "nearest"
    });
  }, 150); // Adjust delay if needed
});
*/
// ---------------------------------------------
// Preserve current section after resize
// ---------------------------------------------
// Prevent scroll snapping from drifting the view during resize.
// Waits for resize to settle, then scrolls current section back into view.
let resizeTimeout = null;
let lastWindowWidth = window.innerWidth;

window.addEventListener("resize", () => {
  if (resizeTimeout) clearTimeout(resizeTimeout);

  resizeTimeout = setTimeout(() => {
    const currentWindowWidth = window.innerWidth;
    if (currentWindowWidth === lastWindowWidth) {
      scrollToCurrentSectionAfterResize();
    }
    lastWindowWidth = currentWindowWidth;
    resizeTimeout = null;
  }, 150); // Only fire after 150ms of no size changes
});

function scrollToCurrentSectionAfterResize() {
  const active = document.querySelector(".activated");
  if (!active) return;
  const main = active.querySelector("main");
  if (!main) return;
  const section = getCurrentVisibleSection(main, main.querySelectorAll("section[id]"));
  if (!section) return;
  main.scrollTo({
    left:     section.offsetLeft,
    behavior: "smooth"
  });
}

/*
// -------------------------------
// On clicking the baseline toggle, toggle the class on html
// -------------------------------
document.addEventListener("DOMContentLoaded", function () {
  const baselineToggle = document.querySelector('.baseline');

  if (baselineToggle) {
    baselineToggle.addEventListener('change', function () {
      document.documentElement.classList.toggle('show-baseline', baselineToggle.checked);
    });
  }
});
*/
// -------------------------------
// On clicking any baseline toggle, toggle the class on html
// -------------------------------
document.addEventListener("DOMContentLoaded", function () {
  const baselineToggles = document.querySelectorAll('.baseline');

  baselineToggles.forEach(toggle => {
    toggle.addEventListener('change', function () {
      const isChecked = toggle.checked;
      document.documentElement.classList.toggle('show-baseline', isChecked);

      // Sync all other toggles to match
      baselineToggles.forEach(other => {
        if (other !== toggle) other.checked = isChecked;
      });
    });
  });
});


// -------------------------------
// On clicking any dark toggle, toggle the class on html
// -------------------------------
document.addEventListener("DOMContentLoaded", function () {
  const darkmodeToggles = document.querySelectorAll('.darkmode');

  darkmodeToggles.forEach(toggle => {
    toggle.addEventListener('change', function () {
      const isChecked = toggle.checked;
      document.documentElement.classList.toggle('dark', isChecked);

      // Sync all other toggles to match
      darkmodeToggles.forEach(other => {
        if (other !== toggle) other.checked = isChecked;
      });
    });
  });
});




/* mobile blob navigation */

function setupMobileNavCycler(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const nav      = container.querySelector("nav");
  const main     = container.querySelector("main");
  const sections = container.querySelectorAll("section[id]");
  const sectionIds = Array.from(sections).map(s => s.id);

  if (!nav || !main || sections.length < 2) return;

  let currentIndex = 0;

  // Update currentIndex as the user scrolls manually
  main.addEventListener("scroll", () => {
    const current = getCurrentVisibleSection(main, sections);
    if (current) {
      currentIndex = sectionIds.indexOf(current.id);
    }
  });

  nav.addEventListener("click", (e) => {
    if (window.innerWidth > 768) return; // desktop: no cycler
    e.preventDefault();

    // advance to the next section
    currentIndex = (currentIndex + 1) % sectionIds.length;
    const nextSection = container.querySelector(`#${sectionIds[currentIndex]}`);

    // scroll it into view in <main>
    main.scrollTo({
      left:     nextSection.offsetLeft,
      behavior: "smooth"
    });

    // update URL hash without jumping the page
    history.replaceState(null, "", `#${sectionIds[currentIndex]}`);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupMobileNavCycler("creative");
  setupMobileNavCycler("technologist");
//  choreograph.tap('#creative', { after: 1000, color: 'var(--magenta)', opacity: 1, simulate: true });
});

window.addEventListener("load", () => {
  matchHash();
});

