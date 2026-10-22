const catalogItems = window.gtaNewsItems || [];
const catalogList = document.getElementById("news-list");
const catalogSearch = document.getElementById("news-search");
const catalogCount = document.getElementById("news-count");
const catalogTotal = document.getElementById("catalog-total");
const catalogEmpty = document.getElementById("catalog-empty");
const catalogReset = document.getElementById("catalog-reset");
const locationFilterNote = document.getElementById("location-filter-note");
const locationName = document.querySelector("[data-location-name]");
const locationReset = document.getElementById("location-reset");
const topicSearches = [...document.querySelectorAll("[data-query]")];
const catalogFilters = [...document.querySelectorAll(".filter-button[data-filter]")];
const favoritesFilter = document.querySelector("[data-favorites-filter]");
const favoritesCount = document.querySelector("[data-favorites-count]");
const storageNote = document.getElementById("catalog-storage-note");
const loadMoreWrap = document.getElementById("catalog-load-more-wrap");
const loadMoreButton = document.getElementById("catalog-load-more");
const loadMoreCount = document.querySelector("[data-load-more-count]");
const paginationNote = document.getElementById("catalog-pagination-note");
const pageSize = 9;
const validCategories = new Set(["all", "official", "leak", "rumor"]);
const initialParams = new URLSearchParams(window.location.search);
const requestedCategory = initialParams.get("category");
let activeCategory = validCategories.has(requestedCategory) ? requestedCategory : "all";
let activeFavorites = false;
let renderLimit = pageSize;
let favoriteIds = new Set();
let favoritesStorageAvailable = true;
const itemIds = new Map(
  catalogItems.map((item) => [
    item,
    item.id || normalizeSearchText(item.title).replace(/\s+/g, "-")
  ])
);
const initialQuery = initialParams.get("q") || "";
const locationDefinitions = {
  "vice-city": { label: "Vice City", terms: ["Vice City", "Вайс-Сити", "Вайс Сити"] },
  "port-gellhorn": { label: "Port Gellhorn", terms: ["Port Gellhorn"] },
  ambrosia: { label: "Ambrosia", terms: ["Ambrosia"] },
  grassrivers: { label: "Grassrivers", terms: ["Grassrivers"] },
  "leonida-keys": { label: "Leonida Keys", terms: ["Leonida Keys"] },
  "mount-kalaga": { label: "Mount Kalaga", terms: ["Mount Kalaga"] }
};
const requestedLocation = new URLSearchParams(window.location.search).get("location");
let activeLocation = Object.hasOwn(locationDefinitions, requestedLocation || "")
  ? requestedLocation
  : "";

function getMatchedLocations(text) {
  return Object.entries(locationDefinitions)
    .filter(([, definition]) =>
      definition.terms.some((term) => normalizeSearchText(text).includes(normalizeSearchText(term)))
    )
    .map(([id]) => id);
}

function normalizeSearchText(value) {
  return value
    .toLocaleLowerCase("ru")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function differsByAtMostOneCharacter(first, second) {
  if (Math.abs(first.length - second.length) > 1) return false;
  if (first === second) return true;

  let firstIndex = 0;
  let secondIndex = 0;
  let differences = 0;
  while (firstIndex < first.length && secondIndex < second.length) {
    if (first[firstIndex] === second[secondIndex]) {
      firstIndex += 1;
      secondIndex += 1;
      continue;
    }

    differences += 1;
    if (differences > 1) return false;
    if (first.length > second.length) firstIndex += 1;
    else if (second.length > first.length) secondIndex += 1;
    else {
      firstIndex += 1;
      secondIndex += 1;
    }
  }

  return differences + Number(firstIndex < first.length || secondIndex < second.length) <= 1;
}

function matchesSearchToken(queryToken, textToken) {
  if (textToken.startsWith(queryToken)) return true;
  if (queryToken.length < 4) return false;
  if (queryToken.length >= 4 && textToken.includes(queryToken)) return true;

  const minimumLength = Math.max(1, queryToken.length - 1);
  const maximumLength = Math.min(textToken.length, queryToken.length + 1);
  for (let length = minimumLength; length <= maximumLength; length += 1) {
    if (differsByAtMostOneCharacter(queryToken, textToken.slice(0, length))) return true;
  }
  return false;
}

function scoreSearchField(queryToken, fieldText) {
  const fieldTokens = normalizeSearchText(fieldText).split(" ");
  let bestScore = 0;

  fieldTokens.forEach((fieldToken) => {
    if (fieldToken === queryToken) bestScore = Math.max(bestScore, 120);
    else if (fieldToken.startsWith(queryToken)) bestScore = Math.max(bestScore, 100);
    else if (queryToken.length >= 4 && fieldToken.includes(queryToken)) {
      bestScore = Math.max(bestScore, 65);
    } else if (matchesSearchToken(queryToken, fieldToken)) {
      bestScore = Math.max(bestScore, 75);
    }
  });

  const aliasGroup = matchingAliasGroup(queryToken);
  if (aliasGroup) {
    const matchesAlias = aliasGroup.some((alias) =>
      normalizeSearchText(alias)
        .split(" ")
        .some((aliasToken) =>
          fieldTokens.some((fieldToken) => fieldToken.startsWith(aliasToken))
        )
    );
    if (matchesAlias) bestScore = Math.max(bestScore, 95);
  }

  return bestScore;
}

const searchAliases = [
  ["гта", "gta", "gta vi", "gta 6", "grand theft auto", "grand theft auto vi"],
  ["гг", "gg", "главный герой", "главные герои", "персонаж", "персонажи", "character", "characters"],
  ["люсия", "лусия", "lucia"],
  ["джейсон", "jason"],
  ["вайс сити", "vice city"],
  ["леонида", "leonida"],
  ["пк", "pc", "комп", "компьютер", "computer"],
  ["плойка", "пс5", "ps5", "playstation 5"],
  ["иксбокс", "xbox", "series x"],
  ["карта", "map", "география"],
  ["локация", "локации", "регион", "регионы", "место", "places", "locations"],
  ["животные", "фауна", "wildlife", "animals"],
  ["транспорт", "тачки", "машины", "авто", "transport", "vehicle", "vehicles", "cars"],
  ["утечка", "слив", "сливы", "leak", "leaks"],
  ["трейлер", "видос", "видео", "ролик", "trailer", "video"],
  ["музыка", "саунд", "саундтрек", "ост", "music", "soundtrack", "ost"],
  ["онлайн", "мультиплеер", "сетевая игра", "online", "multiplayer"],
  ["геймплей", "игровой процесс", "механики", "gameplay"],
  ["сюжет", "сюжетка", "история", "story", "storyline", "plot", "campaign"],
  ["дата выхода", "релиз", "когда выйдет", "release", "launch"],
  ["графика", "графон", "картинка", "визуал", "graphics", "visuals"],
  ["предзаказ", "пред заказ", "preorder", "pre order"],
  ["цена", "стоимость", "price"],
  ["дополнение", "длс", "dlc", "expansion", "add on"],
  ["слух", "слухи", "rumor", "rumour"]
];

function matchingAliasGroup(queryToken) {
  return searchAliases.find((group) =>
    group.some((alias) =>
      normalizeSearchText(alias)
        .split(" ")
        .some((aliasToken) => matchesSearchToken(queryToken, aliasToken))
    )
  );
}

function matchesSearch(query, searchableText) {
  const normalizedQuery = normalizeSearchText(query);
  const normalizedText = normalizeSearchText(searchableText);
  if (!normalizedQuery) return true;
  if (normalizedQuery.length >= 3 && normalizedText.includes(normalizedQuery)) return true;

  const textTokens = normalizedText.split(" ");
  const queryTokens = normalizedQuery.split(" ");

  return queryTokens.every((queryToken) => {
    const matchesText = textTokens.some((textToken) =>
      matchesSearchToken(queryToken, textToken)
    );
    if (matchesText) return true;

    const aliases = matchingAliasGroup(queryToken);
    return Boolean(
      aliases &&
        aliases.some((alias) =>
          normalizeSearchText(alias)
            .split(" ")
            .some((aliasToken) => textTokens.includes(aliasToken))
        )
    );
  });
}

function renderCatalogCard(item, index) {
  const categoryName =
    item.category === "official" ? "Официально" : item.category === "leak" ? "Утечки" : "Слухи";
  const itemId = itemIds.get(item);
  const visualTheme = item.visualTheme ? ` thumb-theme-${item.visualTheme}` : "";
  const searchableText = [item.title, item.tag, item.date, item.description, ...(item.highlights || [])]
    .join(" ");
  const locations = getMatchedLocations(searchableText).join(" ");
  const highlights = item.highlights?.length
    ? `<details class="catalog-details"><summary>Ключевые детали <span>${item.highlights.length}</span></summary><ul class="catalog-highlights">${item.highlights.map((highlight) => `<li>${highlight}</li>`).join("")}</ul></details>`
    : "";
  return `
    <article class="news-card catalog-card${item.featured ? " is-featured" : ""}" data-id="${itemId}" data-category="${item.category}" data-locations="${locations}">
      <div class="thumb thumb-scene-${index % 6}${visualTheme}${item.image ? "" : " thumb-no-photo"}">
        <button class="favorite-toggle${favoriteIds.has(itemId) ? " is-favorite" : ""}" type="button"
          data-favorite-id="${itemId}" aria-pressed="${favoriteIds.has(itemId)}"
          aria-label="${favoriteIds.has(itemId) ? "Убрать из" : "Добавить в"} Моё досье"
          title="${favoriteIds.has(itemId) ? "Убрать из" : "Добавить в"} Моё досье">
          <span aria-hidden="true">${favoriteIds.has(itemId) ? "★" : "☆"}</span>
        </button>
        ${item.image ? `<img class="${item.imageClass || ""}" src="${item.image}" alt="${item.imageAlt}" loading="lazy" />` : ""}
        <span class="thumb-image-treatment" data-cover-mark="${item.visualMark || ""}" aria-hidden="true"></span>
        <span class="thumb-issue" aria-hidden="true">${String(index + 1).padStart(2, "0")} / ${item.tag}</span>
        <span class="thumb-label">${categoryName}</span>
        ${item.featured ? '<span class="catalog-latest">НОВОЕ</span>' : ""}
      </div>
      <div class="content">
        <div class="meta"><span>${item.tag}</span><span>${item.date}</span></div>
        <h2>${item.title}</h2>
        <p>${item.description}</p>
        ${highlights}
        ${item.sourceUrl ? `<a class="news-source" href="${item.sourceUrl}" target="_blank" rel="noreferrer">${item.sourceLabel} ↗</a>` : ""}
      </div>
    </article>
  `;
}

function showStorageMessage(message) {
  if (!storageNote) return;
  storageNote.textContent = message;
  storageNote.hidden = !message;
}

let savedFavorites = null;
try {
  savedFavorites = window.localStorage.getItem("gta-vi-hub-favorites");
} catch {
  favoritesStorageAvailable = false;
  showStorageMessage("Браузер запретил доступ к хранилищу: избранное будет доступно только до закрытия страницы.");
}

if (savedFavorites) {
  try {
    const parsedFavorites = JSON.parse(savedFavorites);
    if (Array.isArray(parsedFavorites) && parsedFavorites.every((id) => typeof id === "string")) {
      favoriteIds = new Set(parsedFavorites);
    } else {
      showStorageMessage("Сохранённое досье повреждено. Избранное очищено в этой вкладке.");
    }
  } catch {
    showStorageMessage("Не удалось прочитать сохранённое досье: данные избранного повреждены.");
  }
}

if (catalogTotal) {
  catalogTotal.textContent = String(catalogItems.length);
}
if (catalogSearch) catalogSearch.value = initialQuery;

const catalogCategoryCounts = Object.fromEntries(
  [...validCategories].map((category) => [
    category,
    category === "all"
      ? catalogItems.length
      : catalogItems.filter((item) => item.category === category).length
  ])
);
catalogFilters.forEach((button) => {
  const count = catalogCategoryCounts[button.dataset.filter];
  const countNode = button.querySelector("[data-filter-count]");
  if (countNode) countNode.textContent = String(count ?? 0);
});

function updateCatalog() {
  const query = catalogSearch?.value.trim() || "";
  const queryTokens = normalizeSearchText(query).split(" ").filter(Boolean);
  let matchingItems = catalogItems.filter((item) => {
    const itemId = itemIds.get(item);
    const matchesCategory = activeCategory === "all" || item.category === activeCategory;
    const matchesQuery = matchesSearch(query, [
      item.title,
      item.tag,
      item.date,
      item.description,
      ...(item.highlights || [])
    ].join(" "));
    const locations = getMatchedLocations(
      [item.title, item.tag, item.date, item.description, ...(item.highlights || [])].join(" ")
    );
    const matchesLocation = !activeLocation || locations.includes(activeLocation);
    const matchesFavorite = !activeFavorites || favoriteIds.has(itemId);
    return matchesCategory && matchesQuery && matchesLocation && matchesFavorite;
  });

  if (queryTokens.length) {
    matchingItems = matchingItems
      .map((item, index) => {
        const title = item.title || "";
        const meta = `${item.tag || ""} ${item.date || ""}`;
        const body = `${item.description || ""} ${(item.highlights || []).join(" ")}`;
        const score = queryTokens.reduce(
          (total, token) =>
            total +
            scoreSearchField(token, title) * 4 +
            scoreSearchField(token, meta) * 2 +
            scoreSearchField(token, body),
          0
        );
        return { item, index, score };
      })
      .sort((first, second) => second.score - first.score || first.index - second.index)
      .map(({ item }) => item);
  }

  const visibleCount = matchingItems.length;
  const visibleItems = matchingItems.slice(0, renderLimit);

  if (catalogList) {
    catalogList.innerHTML = visibleItems.map(renderCatalogCard).join("");
    window.initializeNewsImages?.(catalogList);
  }

  if (catalogCount) {
    const lastTwoDigits = visibleCount % 100;
    const lastDigit = visibleCount % 10;
    const noun =
      lastTwoDigits >= 11 && lastTwoDigits <= 14
        ? "материалов"
        : lastDigit === 1
          ? "материал"
          : lastDigit >= 2 && lastDigit <= 4
            ? "материала"
            : "материалов";
    catalogCount.textContent = visibleCount
      ? `Показано ${visibleItems.length} из ${visibleCount} ${noun}`
      : "Ничего не найдено — попробуй другой запрос";
  }

  if (locationFilterNote) {
    const definition = locationDefinitions[activeLocation];
    locationFilterNote.hidden = !definition;
    if (locationName && definition) locationName.textContent = definition.label;
  }

  if (catalogEmpty) {
    catalogEmpty.hidden = visibleCount !== 0;
  }

  if (loadMoreWrap) loadMoreWrap.hidden = visibleItems.length >= visibleCount;
  if (loadMoreCount) {
    loadMoreCount.textContent = `(${Math.min(pageSize, visibleCount - visibleItems.length)})`;
  }
  if (paginationNote) {
    paginationNote.textContent = visibleCount
      ? `Показано ${visibleItems.length} из ${visibleCount}`
      : "";
  }
  if (favoritesCount) favoritesCount.textContent = String(favoriteIds.size);
  favoritesFilter?.setAttribute("aria-pressed", String(activeFavorites));
  favoritesFilter?.classList.toggle("is-active", activeFavorites);

  catalogFilters.forEach((button) => {
    const selected = !activeFavorites && button.dataset.filter === activeCategory;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

catalogFilters.forEach((button) => {
  button.addEventListener("click", () => {
    activeCategory = button.dataset.filter || "all";
    activeFavorites = false;
    renderLimit = pageSize;
    const url = new URL(window.location.href);
    if (activeCategory === "all") {
      url.searchParams.delete("category");
    } else {
      url.searchParams.set("category", activeCategory);
    }
    window.history.replaceState({}, "", url);
    updateCatalog();
  });
});

catalogSearch?.addEventListener("input", () => {
  renderLimit = pageSize;
  const url = new URL(window.location.href);
  if (catalogSearch.value.trim()) url.searchParams.set("q", catalogSearch.value.trim());
  else url.searchParams.delete("q");
  window.history.replaceState({}, "", url);
  updateCatalog();
});
topicSearches.forEach((button) => {
  button.addEventListener("click", () => {
    if (catalogSearch) catalogSearch.value = button.dataset.query || "";
    activeCategory = "all";
    activeLocation = "";
    activeFavorites = false;
    renderLimit = pageSize;
    const url = new URL(window.location.href);
    url.searchParams.delete("category");
    url.searchParams.delete("location");
    if (catalogSearch?.value) url.searchParams.set("q", catalogSearch.value);
    window.history.replaceState({}, "", url);
    updateCatalog();
    catalogSearch?.focus();
  });
});

catalogReset?.addEventListener("click", () => {
  if (catalogSearch) catalogSearch.value = "";
  activeCategory = "all";
  activeLocation = "";
  activeFavorites = false;
  renderLimit = pageSize;
  const url = new URL(window.location.href);
  url.searchParams.delete("category");
  url.searchParams.delete("location");
  url.searchParams.delete("q");
  window.history.replaceState({}, "", url);
  updateCatalog();
});

locationReset?.addEventListener("click", () => {
  activeLocation = "";
  const url = new URL(window.location.href);
  url.searchParams.delete("location");
  window.history.replaceState({}, "", url);
  updateCatalog();
});

favoritesFilter?.addEventListener("click", () => {
  activeFavorites = !activeFavorites;
  activeCategory = "all";
  renderLimit = pageSize;
  if (activeFavorites) {
    const url = new URL(window.location.href);
    url.searchParams.delete("category");
    window.history.replaceState({}, "", url);
  }
  updateCatalog();
});

loadMoreButton?.addEventListener("click", () => {
  renderLimit += pageSize;
  updateCatalog();
});

catalogList?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-favorite-id]");
  if (!button) return;
  const itemId = button.dataset.favoriteId;
  if (!itemId) return;
  if (favoriteIds.has(itemId)) favoriteIds.delete(itemId);
  else favoriteIds.add(itemId);

  if (favoritesStorageAvailable) {
    try {
      window.localStorage.setItem("gta-vi-hub-favorites", JSON.stringify([...favoriteIds]));
      showStorageMessage("");
    } catch {
      favoritesStorageAvailable = false;
      showStorageMessage("Не удалось сохранить избранное. Оно останется доступно только до закрытия страницы.");
    }
  }

  updateCatalog();
  const matchingButton = [...(catalogList?.querySelectorAll("[data-favorite-id]") || [])]
    .find((candidate) => candidate.dataset.favoriteId === itemId);
  matchingButton?.focus();
});

updateCatalog();

const progress = document.querySelector(".scroll-progress");
let progressPending = false;
window.addEventListener(
  "scroll",
  () => {
    if (progressPending) return;
    progressPending = true;
    requestAnimationFrame(() => {
      const distance = document.documentElement.scrollHeight - window.innerHeight;
      progress?.style.setProperty(
        "transform",
        `scaleX(${distance > 0 ? window.scrollY / distance : 0})`
      );
      progressPending = false;
    });
  },
  { passive: true }
);
