const newsItems = window.gtaNewsItems || [];
const shelvesRoot = document.getElementById("news-shelves");
const newsSections = [
  {
    category: "official",
    title: "Официально подтверждено",
    description: "Трейлеры, герои, мир игры и анонсы Rockstar.",
    label: "Проверенные факты"
  },
  {
    category: "leak",
    title: "Утечки и их контекст",
    description: "Что попало в сеть и почему ранние материалы — не финальная игра.",
    label: "История разработки"
  },
  {
    category: "rumor",
    title: "Слухи под проверкой",
    description: "Популярные вопросы, которым пока не хватает официального ответа.",
    label: "Неподтверждённое"
  }
];

function renderNewsCard(item, index) {
  const categoryName = item.category === "official" ? "DOSSIER" : item.category === "leak" ? "ARCHIVE" : "CHECK";
  const visualTheme = item.visualTheme ? ` thumb-theme-${item.visualTheme}` : "";
  return `
    <article class="news-card shelf-card">
      <div class="thumb thumb-scene-${index % 6}${visualTheme}${item.image ? "" : " thumb-no-photo"}">
        ${item.image ? `<img class="${item.imageClass || ""}" src="${item.image}" alt="${item.imageAlt}" loading="lazy" />` : ""}
        <span class="thumb-image-treatment" data-cover-mark="${item.visualMark || ""}" aria-hidden="true"></span>
        <span class="thumb-issue" aria-hidden="true">${categoryName} / ${item.tag}</span>
        <span class="thumb-label">${item.tag}</span>
        ${item.featured ? '<span class="catalog-latest">НОВОЕ</span>' : ""}
      </div>
      <div class="content">
        <div class="meta"><span>${item.category === "official" ? "Официально" : item.category === "leak" ? "Утечки" : "Слухи"}</span><span>${item.date}</span></div>
        <h3>${item.title}</h3>
        <p>${item.description}</p>
        ${item.sourceUrl ? `<a class="news-source" href="${item.sourceUrl}" target="_blank" rel="noreferrer">${item.sourceLabel} ↗</a>` : ""}
      </div>
    </article>
  `;
}

if (shelvesRoot) {
  shelvesRoot.innerHTML = newsSections
    .map((section, index) => {
      const sectionItems = newsItems
        .filter((item) => item.category === section.category)
        .sort((first, second) => Number(Boolean(second.featured)) - Number(Boolean(first.featured)))
        .slice(0, 5);
      return `
        <section class="news-shelf" aria-labelledby="shelf-title-${index}">
          <div class="shelf-heading">
            <div>
              <span class="shelf-label">${section.label}</span>
              <h3 id="shelf-title-${index}">${section.title}</h3>
              <p>${section.description}</p>
            </div>
            <div class="shelf-actions">
              <a class="shelf-view-all" href="gta-news.html?category=${section.category}">Все материалы <span aria-hidden="true">↗</span></a>
              <button class="shelf-arrow" type="button" data-scroll="-1" aria-label="Прокрутить подборку назад">←</button>
              <button class="shelf-arrow" type="button" data-scroll="1" aria-label="Прокрутить подборку вперёд">→</button>
            </div>
          </div>
          <div class="shelf-track" aria-label="${section.title}">
            ${sectionItems.map(renderNewsCard).join("")}
          </div>
        </section>
      `;
    })
    .join("");

  shelvesRoot.querySelectorAll(".shelf-arrow").forEach((button) => {
    button.addEventListener("click", () => {
      const track = button.closest(".news-shelf")?.querySelector(".shelf-track");
      const direction = Number(button.dataset.scroll);
      track?.scrollBy({ left: direction * track.clientWidth * 0.82, behavior: "smooth" });
    });
  });

  window.initializeNewsImages?.(shelvesRoot);
}

const yearNode = document.getElementById("year");
if (yearNode) {
  yearNode.textContent = new Date().getFullYear();
}

const menuToggle = document.querySelector(".menu-toggle");
const mainNav = document.getElementById("main-nav");

function closeMenu() {
  menuToggle?.setAttribute("aria-expanded", "false");
  menuToggle?.setAttribute("aria-label", "Открыть меню");
  mainNav?.classList.remove("is-open");
}

menuToggle?.addEventListener("click", () => {
  const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Открыть меню" : "Закрыть меню");
  mainNav?.classList.toggle("is-open", !isOpen);
});

mainNav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", closeMenu);
});

if ("IntersectionObserver" in window) {
  const navLinks = [...(mainNav?.querySelectorAll('a[href^="#"]') || [])];
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) => {
          const isCurrent = link.hash === `#${entry.target.id}`;
          link.classList.toggle("is-current", isCurrent);
          if (isCurrent) {
            link.setAttribute("aria-current", "location");
          } else {
            link.removeAttribute("aria-current");
          }
        });
      });
    },
    { rootMargin: "-25% 0px -65% 0px" }
  );

  navLinks.forEach((link) => {
    const section = document.querySelector(link.hash);
    if (section) sectionObserver.observe(section);
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMenu();
  }
});

const scrollProgress = document.querySelector(".scroll-progress");
let scrollUpdatePending = false;

window.addEventListener(
  "scroll",
  () => {
    if (scrollUpdatePending) return;
    scrollUpdatePending = true;

    window.requestAnimationFrame(() => {
      const scrollableHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0;
      scrollProgress?.style.setProperty("transform", `scaleX(${progress})`);
      scrollUpdatePending = false;
    });
  },
  { passive: true }
);

const heroArtwork = document.querySelector("[data-tilt]");
if (
  heroArtwork &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
  window.matchMedia("(pointer: fine)").matches
) {
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let tiltFrame = 0;

  function animateTilt() {
    currentX += (targetX - currentX) * 0.06;
    currentY += (targetY - currentY) * 0.06;

    if (Math.abs(targetX - currentX) < 0.01 && Math.abs(targetY - currentY) < 0.01) {
      currentX = targetX;
      currentY = targetY;
      tiltFrame = 0;
    }

    heroArtwork.style.setProperty("--tilt-x", `${currentX.toFixed(2)}deg`);
    heroArtwork.style.setProperty("--tilt-y", `${currentY.toFixed(2)}deg`);

    if (tiltFrame && (currentX !== targetX || currentY !== targetY)) {
      tiltFrame = window.requestAnimationFrame(animateTilt);
    } else {
      tiltFrame = 0;
    }
  }

  function requestTiltAnimation() {
    if (!tiltFrame) {
      tiltFrame = window.requestAnimationFrame(animateTilt);
    }
  }

  heroArtwork.addEventListener("pointermove", (event) => {
    const bounds = heroArtwork.getBoundingClientRect();
    const pointerX = (event.clientX - bounds.left) / bounds.width;
    const pointerY = (event.clientY - bounds.top) / bounds.height;
    targetY = (pointerX - 0.5) * 2;
    targetX = (0.5 - pointerY) * 2;
    requestTiltAnimation();
  });

  heroArtwork.addEventListener("pointerleave", () => {
    targetX = 0;
    targetY = 0;
    requestTiltAnimation();
  });
}

const gameClock = document.querySelector("[data-game-clock]");
const characterStatuses = {
  lucia: document.querySelector('[data-character-status="lucia"]'),
  jason: document.querySelector('[data-character-status="jason"]')
};

if (gameClock && (characterStatuses.lucia || characterStatuses.jason)) {
  const statusRoutes = {
    lucia: [
      "Вышла из мотеля в Vice City",
      "Замечена у набережной Vice City",
      "Покинула центр — маршрут неизвестен",
      "На юге Леониды, сигнал нестабилен",
      "Вернулась в Vice City"
    ],
    jason: [
      "На заправке у Port Gellhorn",
      "Едет по шоссе Леониды",
      "Замечен возле Ambrosia",
      "На побережье Leonida Keys",
      "Связь восстановлена в Vice City"
    ]
  };
  const realMinutesAtStart = Date.now() / 60000;
  const gameMinutesAtStart = (new Date().getHours() * 60 + new Date().getMinutes()) * 6;

  function updateCharacterTracker() {
    const realMinutesElapsed = Date.now() / 60000 - realMinutesAtStart;
    const gameMinutes = (gameMinutesAtStart + realMinutesElapsed * 6) % 1440;
    const hours = Math.floor(gameMinutes / 60);
    const minutes = Math.floor(gameMinutes % 60);
    gameClock.textContent = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

    const statusIndex = Math.floor(Date.now() / 60000);
    Object.entries(characterStatuses).forEach(([character, element], index) => {
      if (!element) return;
      const route = statusRoutes[character];
      element.textContent = route[(statusIndex + index * 2) % route.length];
    });
  }

  updateCharacterTracker();
  window.setInterval(updateCharacterTracker, 60000);
}

const mapRegions = [...document.querySelectorAll(".map-region")];
mapRegions.forEach((region) => {
  region.addEventListener("click", () => {
    mapRegions.forEach((item) => item.classList.toggle("is-selected", item === region));
  });
});
