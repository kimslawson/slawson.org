/* TODO:
 * debounce keyboard nav
 */

// ——————————————————————————————————————————————
// Keep track of last visible section per container
// ——————————————————————————————————————————————
const lastSectionByContainer = {};  // { creative: "portfolio", technologist: "softwarehardware", … }

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("#creative, #technologist").forEach(container => {
    const main     = container.querySelector("main");
    const sections = main.querySelectorAll("section[id]");
    if (!main || !sections.length) return;

    let scrollTimeout;
    // on every scroll, debounced snap-read the current section
    // BUT ONLY if this container is currently active
    main.addEventListener("scroll", () => {
      // Ignore scroll events from inactive containers
      if (!container.classList.contains("activated")) {
        console.log(`[${container.id}] ignoring scroll (not active)`);
        return;
      }
      
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const curr = getCurrentVisibleSection(main, sections);
        if (curr) {
          lastSectionByContainer[container.id] = curr.id;
          console.log(`[${container.id}] scroll settled on:`, curr.id);
        }
      }, 150); // wait for scroll to settle
    });
    
    // Initialize with the first section
    const firstSection = sections[0];
    if (firstSection) {
      lastSectionByContainer[container.id] = firstSection.id;
    }
  });
});

// -------------------------------
// Helper: Get currently visible section
// -------------------------------
function getCurrentVisibleSection(main, sections) {
  const mainRect = main.getBoundingClientRect();
  const mainCenter = mainRect.left + mainRect.width / 2;
  
  let closestSection = null;
  let closestDistance = Infinity;
  
  for (const section of sections) {
    const rect = section.getBoundingClientRect();
    const sectionCenter = rect.left + rect.width / 2;
    const distance = Math.abs(sectionCenter - mainCenter);
    
    // Find the section whose center is closest to the main container's center
    if (distance < closestDistance) {
      closestDistance = distance;
      closestSection = section;
    }
  }
  
  return closestSection;
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

// ---------------------------------------------
// Splash click handler - waits for width-transition before scrolling
// ---------------------------------------------
document.querySelectorAll("#creative, #technologist").forEach(container => {
  container.addEventListener("click", () => {
    // a) if it's already active, do nothing
    if (container.classList.contains("activated")) return;

    // b) Capture the current visible section in the container we're LEAVING
    const currentlyActive = document.querySelector("#creative.activated, #technologist.activated");
    if (currentlyActive) {
      const activeMain = currentlyActive.querySelector("main");
      const activeSections = activeMain.querySelectorAll("section[id]");
      const activeCurr = getCurrentVisibleSection(activeMain, activeSections);
      if (activeCurr) {
        lastSectionByContainer[currentlyActive.id] = activeCurr.id;
        console.log(`Leaving [${currentlyActive.id}], saving section:`, activeCurr.id);
      }
    }

    // c) pick the section to restore (or default to the very first)
    const firstSection = container.querySelector("section[id]");
    const firstId = firstSection ? firstSection.id : null;
    const restoreId = lastSectionByContainer[container.id] || firstId;
    const target = restoreId ? container.querySelector(`#${restoreId}`) : firstSection;
    
    console.log(`Entering [${container.id}], restoring section:`, restoreId);

    // d) flip classes NOW so CSS begins the width transition
    document.querySelectorAll("#creative, #technologist").forEach(el => {
      el.classList.toggle("activated",  el === container);
      el.classList.toggle("background", el !== container);
      el.classList.remove("initial", "pre-activated");
    });

    // e) once that width animation finishes, do our scroll + hash
    function onTransitionEnd(e) {
      // only fire on our container's width transition
      if (e.target === container && e.propertyName === "width") {
        container.removeEventListener("transitionend", onTransitionEnd);
        clearTimeout(fallback);

        if (target) {
          const main = container.querySelector('main');
          if (target && main) {
            // Small delay to ensure layout is settled
            setTimeout(() => {
              main.scrollTo({
                left:     target.offsetLeft,
                behavior: 'instant'
              });
              console.log(`Scrolled [${container.id}] to:`, target.id, 'at offsetLeft:', target.offsetLeft);
            }, 50);
          }
        }
        if (restoreId) {
          history.replaceState(null, "", `#${restoreId}`);
        }
      }
    }

    container.addEventListener("transitionend", onTransitionEnd);

    // f) fallback in case transitionend doesn't fire
    const fallback = setTimeout(() => {
      container.removeEventListener("transitionend", onTransitionEnd);
      if (target) {
        const main = container.querySelector('main');
        if (target && main) {
          main.scrollTo({
            left:     target.offsetLeft,
            behavior: 'instant'
          });
          console.log(`Fallback: Scrolled [${container.id}] to:`, target.id);
        }
      }
      if (restoreId) {
        history.replaceState(null, "", `#${restoreId}`);
      }
    }, 600); // match CSS 250ms + cushion

    /* (Optional) Pin the window vertical scroll 
     * If you want absolute insurance that nothing ever moves the page vertically, 
     * after you've swapped classes you can re-pin the window at the very top
     */
    // after you scroll <main> and swap .activated/.background…
    //window.scrollTo({ top: 0, behavior: 'instant' });
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

    // 3) reset the page's vertical scroll so your <aside> remains in view
    window.scrollTo({ top: 0, behavior: "instant" });
  }, 500);
}

// add the function above to both content load and hash change
document.addEventListener("DOMContentLoaded", () => {
  // Set up the section class/id mapping to handle multi-match sections
  function setupNavObserver(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const navLinks = container.querySelectorAll("aside nav a[href^='#']");
    const sections = container.querySelectorAll("main section[id]");

    // Build a Map of section → { id, className }
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

    // Enable ←/→ keyboard nav with proper debouncing
    const main = container.querySelector("main");
    if (!main) return;
    main.setAttribute("tabindex", "0");

    let keyNavTimeout = null;
    let isNavigating = false;

    main.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      
      // Prevent default to stop any browser scroll behavior
      e.preventDefault();
      
      // Debounce: ignore rapid keypresses
      if (isNavigating) return;
      
      isNavigating = true;

      const currentSection = getCurrentVisibleSection(main, sections);
      if (!currentSection) {
        isNavigating = false;
        return;
      }

      const currentIndex = sectionIds.indexOf(currentSection.id);
      const targetIndex = e.key === "ArrowLeft"
        ? (currentIndex - 1 + sectionIds.length) % sectionIds.length
        : (currentIndex + 1) % sectionIds.length;

      const targetSection = sections[targetIndex];
      if (targetSection) {
        // Use main.scrollTo instead of scrollIntoView to avoid browser snap interference
        main.scrollTo({
          left: targetSection.offsetLeft,
          behavior: "smooth"
        });
        history.replaceState(null, "", `#${sectionIds[targetIndex]}`);
      }
      
      // Reset the navigation lock after scroll completes
      setTimeout(() => {
        isNavigating = false;
      }, 400); // Match smooth scroll duration
    });

  }

  enhanceSectionNavigation("creative");
  enhanceSectionNavigation("technologist");
});

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

