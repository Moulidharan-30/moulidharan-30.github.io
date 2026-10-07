(function () {
  const TOTAL_FRAMES = 240;
  const canvas = document.getElementById('scroll-canvas');
  const ctx = canvas.getContext('2d');
  const loader = document.getElementById('loader');
  const progressText = document.getElementById('load-progress');
  const progressBarFill = document.getElementById('progress-bar-fill');

  const images = new Array(TOTAL_FRAMES);
  let loadedCount = 0;
  let currentFrame = 0;
  let targetFrame = 0;
  let lastDrawnIndex = -1;
  let lenisInstance = null;
  let isLoaderDone = false;

  // Frame file path generator with cache buster
  function getFramePath(index) {
    const frameNumber = String(index + 1).padStart(3, '0');
    return `ezgif-7800986f91681f37-png-split/ezgif-frame-${frameNumber}.png?v=6`;
  }

  // Configure Canvas sizing
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    drawFrame(Math.round(currentFrame), true);
  }

  // Draw frame to canvas cleanly (no gradients/no overlays)
  function drawFrame(frameIndex, force = false) {
    const clampedIndex = Math.max(0, Math.min(TOTAL_FRAMES - 1, frameIndex));
    if (!force && clampedIndex === lastDrawnIndex) return;

    const img = images[clampedIndex];
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    const r = Math.max(cw / iw, ch / ih);
    const nw = iw * r;
    const nh = ih * r;
    const nx = (cw - nw) / 2;
    const ny = (ch - nh) / 2;

    ctx.drawImage(img, nx, ny, nw, nh);
    lastDrawnIndex = clampedIndex;
  }

  // Calculate target frame from scroll
  function updateScroll() {
    const scrollY = lenisInstance ? lenisInstance.scroll : window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (maxScroll <= 0) {
      targetFrame = 0;
      return;
    }
    const scrollFraction = Math.max(0, Math.min(1, scrollY / maxScroll));
    targetFrame = scrollFraction * (TOTAL_FRAMES - 1);
  }

  // Main Animation Loop with Butter-Smooth Lerping
  function animate(time) {
    if (lenisInstance) {
      lenisInstance.raf(time);
    }

    // Silky smooth interpolation
    const diff = targetFrame - currentFrame;
    if (Math.abs(diff) > 0.0005) {
      currentFrame += diff * 0.085;
    } else {
      currentFrame = targetFrame;
    }

    drawFrame(Math.round(currentFrame));
    requestAnimationFrame(animate);
  }

  // Initialize Smooth Scrolling with Lenis
  function initLenis() {
    if (typeof Lenis !== 'undefined') {
      lenisInstance = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 0.95,
        touchMultiplier: 1.5,
        autoRaf: false,
      });

      lenisInstance.on('scroll', () => {
        updateScroll();
      });
    }
  }

  // Preload all 240 frames
  function preloadImages() {
    // 1. Immediately load frame 0 (Resting/eyes closed state at top of page)
    const firstImg = new Image();
    firstImg.src = getFramePath(0);
    images[0] = firstImg;

    firstImg.onload = () => {
      loadedCount++;
      resizeCanvas();
      drawFrame(0, true);
    };

    // 2. Load all remaining frames
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      if (i === 0) continue;

      const img = new Image();
      img.src = getFramePath(i);
      images[i] = img;

      img.onload = () => {
        loadedCount++;
        const pct = Math.round((loadedCount / TOTAL_FRAMES) * 100);
        if (progressText) progressText.textContent = `${pct}%`;
        if (progressBarFill) progressBarFill.style.width = `${pct}%`;

        // Hide preloader once smooth buffer is ready
        if (!isLoaderDone && (loadedCount >= Math.min(40, TOTAL_FRAMES) || loadedCount === TOTAL_FRAMES)) {
          isLoaderDone = true;
          setTimeout(() => {
            if (loader) loader.classList.add('loaded');
          }, 200);
        }
      };

      img.onerror = () => {
        loadedCount++;
      };
    }
  }

  // Smooth Anchor Navigation
  function setupNavScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href === '#' || !href) return;
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          if (lenisInstance) {
            lenisInstance.scrollTo(target, { offset: -60, duration: 1.4 });
          } else {
            target.scrollIntoView({ behavior: 'smooth' });
          }
        }
      });
    });
  }

  // Listeners
  window.addEventListener('resize', resizeCanvas, { passive: true });
  window.addEventListener('scroll', updateScroll, { passive: true });

  // Start
  initLenis();
  resizeCanvas();
  preloadImages();
  setupNavScroll();
  updateScroll();
  requestAnimationFrame(animate);
})();
