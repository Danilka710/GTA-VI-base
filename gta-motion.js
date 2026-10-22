const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const motionTargets = document.querySelectorAll(
  ".hero-copy, .hero-visual, .section-heading, .subsection-heading, .leonida-map-panel, .news-shelf, .catalog-cta, .fact-card, .platform-strip, .leak-feature, .leak-card, .rumor-check, .unknown-card, .text-panel, .mini-card, .roster-card, .location-card, .world-observation, .timeline-item, .catalog-hero .container, .catalog-card, .source-guide"
);
const canAnimateOnScroll = !prefersReducedMotion && "IntersectionObserver" in window;

if (!canAnimateOnScroll) {
  motionTargets.forEach((element) => element.classList.add("motion-visible"));
} else {
  if (!document.hidden) document.documentElement.classList.add("motion-enabled");

  const motionObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("motion-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -35px 0px" }
  );

  motionTargets.forEach((element, index) => {
    element.classList.add("motion-item");
    element.style.setProperty("--motion-order", String(index % 4));
    motionObserver.observe(element);
  });

  function revealMotionTargetsInViewport() {
    motionTargets.forEach((element) => {
      if (element.classList.contains("motion-visible")) return;
      const bounds = element.getBoundingClientRect();
      if (bounds.bottom > -80 && bounds.top < window.innerHeight + 80) {
        element.classList.add("motion-visible");
      }
    });
  }

  let revealCheckPending = false;
  function revealVisibleMotionTargets() {
    if (revealCheckPending) return;
    revealCheckPending = true;
    window.requestAnimationFrame(() => {
      revealMotionTargetsInViewport();
      revealCheckPending = false;
    });
  }

  window.addEventListener("scroll", revealVisibleMotionTargets, { passive: true });
  window.addEventListener("resize", revealVisibleMotionTargets);
  if (!document.hidden) {
    revealMotionTargetsInViewport();
    revealVisibleMotionTargets();
  }

  document.addEventListener("visibilitychange", () => {
    document.documentElement.classList.toggle("motion-enabled", !document.hidden);
    if (!document.hidden) revealVisibleMotionTargets();
  });
}

const heroImage = document.querySelector(".hero-artwork-image");
if (heroImage && !prefersReducedMotion) {
  let framePending = false;

  function updateHeroParallax() {
    const hero = heroImage.closest(".hero");
    if (!hero) return;
    const bounds = hero.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, -bounds.top / Math.max(1, bounds.height)));
    const offset = -progress * 28;
    heroImage.style.setProperty("--hero-scroll", `${offset.toFixed(1)}px`);
    heroImage.style.setProperty("--hero-scroll-scale", (1.02 + progress * 0.12).toFixed(3));
  }

  function requestHeroParallax() {
    if (framePending) return;
    framePending = true;
    window.requestAnimationFrame(() => {
      updateHeroParallax();
      framePending = false;
    });
  }

  window.addEventListener("scroll", requestHeroParallax, { passive: true });
  window.addEventListener("resize", requestHeroParallax);
  updateHeroParallax();
}

const sceneImages = [...document.querySelectorAll(".news-card .thumb img")];
if (sceneImages.length && !prefersReducedMotion) {
  let sceneFramePending = false;

  function updateSceneImages() {
    const viewportCenter = window.innerHeight / 2;
    sceneImages.forEach((image) => {
      const bounds = image.getBoundingClientRect();
      if (bounds.bottom < -80 || bounds.top > window.innerHeight + 80) return;
      const distanceFromCenter = (bounds.top + bounds.height / 2 - viewportCenter) / window.innerHeight;
      const offset = Math.max(-12, Math.min(12, -distanceFromCenter * 18));
      image.style.setProperty("--scene-scroll-y", `${offset.toFixed(1)}px`);
    });
  }

  function requestSceneUpdate() {
    if (sceneFramePending) return;
    sceneFramePending = true;
    window.requestAnimationFrame(() => {
      updateSceneImages();
      sceneFramePending = false;
    });
  }

  sceneImages.forEach((image) => {
    const thumb = image.closest(".thumb");
    thumb?.addEventListener("pointermove", (event) => {
      if (event.pointerType !== "mouse") return;
      const bounds = thumb.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 8;
      const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 6;
      image.style.setProperty("--scene-pointer-x", `${x.toFixed(1)}px`);
      image.style.setProperty("--scene-pointer-y", `${y.toFixed(1)}px`);
    });
    thumb?.addEventListener("pointerleave", () => {
      image.style.setProperty("--scene-pointer-x", "0px");
      image.style.setProperty("--scene-pointer-y", "0px");
    });
  });

  window.addEventListener("scroll", requestSceneUpdate, { passive: true });
  window.addEventListener("resize", requestSceneUpdate);
  requestSceneUpdate();
}

const releaseCountdown = document.querySelector(".release-countdown");
if (releaseCountdown) {
  const releaseDate = new Date(2026, 10, 19).getTime();
  const countdownClock = releaseCountdown.querySelector(".countdown-clock");
  const countdownNote = releaseCountdown.querySelector("[data-countdown-note]");

  function updateReleaseCountdown() {
    const remaining = releaseDate - Date.now();
    if (remaining <= 0) {
      if (countdownClock) countdownClock.hidden = true;
      if (countdownNote) countdownNote.textContent = "Проверь актуальную дату у Rockstar";
      return;
    }

    const seconds = Math.floor(remaining / 1000);
    const units = {
      days: Math.floor(seconds / 86400),
      hours: Math.floor((seconds % 86400) / 3600),
      minutes: Math.floor((seconds % 3600) / 60),
      seconds: seconds % 60
    };

    Object.entries(units).forEach(([unit, value]) => {
      const element = releaseCountdown.querySelector(`[data-countdown-${unit}]`);
      if (element) element.textContent = String(value).padStart(2, "0");
    });
  }

  updateReleaseCountdown();
  window.setInterval(updateReleaseCountdown, 1000);
}

// Keep the world map and section artwork gently in motion while scrolling.
if (!prefersReducedMotion) {
  const map = document.querySelector(".leonida-map");
  let scrollFramePending = false;

  function updateScrollScenes() {
    const viewportCenter = window.innerHeight * 0.5;
    if (map) {
      const bounds = map.getBoundingClientRect();
      const distance = (bounds.top + bounds.height * 0.5 - viewportCenter) / window.innerHeight;
      const offset = Math.max(-18, Math.min(18, distance * -14));
      map.style.setProperty("--map-scroll-y", `${offset.toFixed(1)}px`);
    }

    document.querySelectorAll(".timeline-item, .location-card, .world-observation").forEach((element) => {
      const bounds = element.getBoundingClientRect();
      if (bounds.bottom < -40 || bounds.top > window.innerHeight + 40) return;
      const distance = (bounds.top + bounds.height * 0.5 - viewportCenter) / window.innerHeight;
      element.style.setProperty("--scroll-depth", Math.max(-1, Math.min(1, distance)).toFixed(2));
    });
  }

  function requestScrollSceneUpdate() {
    if (scrollFramePending) return;
    scrollFramePending = true;
    window.requestAnimationFrame(() => {
      updateScrollScenes();
      scrollFramePending = false;
    });
  }

  window.addEventListener("scroll", requestScrollSceneUpdate, { passive: true });
  window.addEventListener("resize", requestScrollSceneUpdate);
  requestScrollSceneUpdate();
}

// Road-trip loading intro followed by the nine-piece poster assembly.
const siteLoader = document.getElementById("site-loader");
if (siteLoader) {
  const progressBar = siteLoader.querySelector("[data-loader-progress]");
  const percentLabel = siteLoader.querySelector("[data-loader-percent]");
  const caption = siteLoader.querySelector("[data-loader-caption]");
  let loadingProgress = 4;
  let assemblyStarted = false;
  let assemblyStartTimer = 0;

  const progressTimer = window.setInterval(() => {
    if (assemblyStarted || loadingProgress >= 88) return;
    loadingProgress = Math.min(88, loadingProgress + Math.max(0.35, (88 - loadingProgress) * 0.035));
    if (progressBar) progressBar.style.width = `${loadingProgress.toFixed(0)}%`;
    if (percentLabel) percentLabel.textContent = `${Math.floor(loadingProgress).toString().padStart(2, "0")}%`;
  }, 70);

  function beginPuzzleAssembly() {
    if (assemblyStarted) return;
    assemblyStarted = true;
    window.clearInterval(progressTimer);
    loadingProgress = 100;
    if (progressBar) progressBar.style.width = "100%";
    if (percentLabel) percentLabel.textContent = "100%";
    if (caption) caption.textContent = "СОБИРАЕМ ВАЙС-СИТИ";
    siteLoader.classList.add("is-assembling");

    window.setTimeout(() => {
      if (caption) caption.textContent = "ПАЗЛ СОБРАН · ЛЕОНИДА ГОТОВА";
      siteLoader.classList.add("is-puzzle-finished");
      window.setTimeout(() => {
        siteLoader.classList.add("is-exiting");
        document.body.classList.remove("site-loading");
        window.setTimeout(() => siteLoader.remove(), 900);
      }, prefersReducedMotion ? 120 : 650);
    }, prefersReducedMotion ? 120 : 5000);
  }

  function queuePuzzleAssembly() {
    if (assemblyStartTimer || assemblyStarted) return;
    assemblyStartTimer = window.setTimeout(beginPuzzleAssembly, prefersReducedMotion ? 0 : 2700);
  }

  if (document.readyState === "complete") queuePuzzleAssembly();
  else window.addEventListener("load", queuePuzzleAssembly, { once: true });
  window.setTimeout(() => {
    if (!assemblyStarted && !assemblyStartTimer) beginPuzzleAssembly();
  }, 6200);
}
