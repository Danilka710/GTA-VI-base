(() => {
  const items = window.gtaNewsItems || [];
  const dialog = document.getElementById("spotlight-dialog");
  const input = document.getElementById("spotlight-search");
  const results = document.getElementById("spotlight-results");
  let previousFocus = null;

  function normalize(value) {
    return String(value || "")
      .toLocaleLowerCase("ru")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ё/g, "е")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  }

  function differsByOne(first, second) {
    if (Math.abs(first.length - second.length) > 1) return false;
    let left = 0;
    let right = 0;
    let differences = 0;
    while (left < first.length && right < second.length) {
      if (first[left] === second[right]) {
        left += 1;
        right += 1;
        continue;
      }
      differences += 1;
      if (differences > 1) return false;
      if (first.length > second.length) left += 1;
      else if (second.length > first.length) right += 1;
      else {
        left += 1;
        right += 1;
      }
    }
    return differences + Number(left < first.length || right < second.length) <= 1;
  }

  const aliases = [
    ["люсия", "лусия", "люси", "lucia", "lucy"],
    ["джейсон", "jason"],
    ["гта", "gta", "gta 6", "gta vi", "grand theft auto"],
    ["вайс сити", "vice city", "вайс-сити"],
    ["леонида", "leonida"],
    ["слив", "сливы", "утечка", "утечки", "leak", "leaks"],
    ["релиз", "дата выхода", "когда выйдет", "release"],
    ["трейлер", "видео", "trailer"]
  ];

  function matchesToken(queryToken, textTokens) {
    if (
      textTokens.some(
        (textToken) =>
          textToken.startsWith(queryToken) ||
          (queryToken.length >= 3 && textToken.includes(queryToken)) ||
          (queryToken.length >= 4 && differsByOne(queryToken, textToken))
      )
    ) {
      return true;
    }
    const group = aliases.find((entry) =>
      entry.some((alias) => normalize(alias).split(" ").some((token) => token.startsWith(queryToken)))
    );
    return Boolean(
      group &&
        group.some((alias) =>
          normalize(alias)
            .split(" ")
            .some((aliasToken) => textTokens.some((textToken) => textToken.startsWith(aliasToken)))
        )
    );
  }

  function searchableText(item) {
    return normalize([
      item.title,
      item.tag,
      item.date,
      item.category,
      item.description,
      ...(item.highlights || [])
    ].join(" "));
  }

  function updateSpotlight() {
    if (!results) return;
    const query = normalize(input?.value);
    const queryTokens = query.split(" ").filter(Boolean);
    const matched = items
      .map((item, index) => {
        const text = searchableText(item);
        const tokens = text.split(" ");
        const matches = !queryTokens.length || queryTokens.every((token) => matchesToken(token, tokens));
        const score = queryTokens.reduce(
          (sum, token) => sum + (tokens.includes(token) ? 3 : tokens.some((part) => part.startsWith(token)) ? 2 : 1),
          0
        );
        return { item, index, matches, score };
      })
      .filter((entry) => entry.matches)
      .sort((first, second) => {
        if (!queryTokens.length) {
          return Number(Boolean(second.item.featured)) - Number(Boolean(first.item.featured)) ||
            first.index - second.index;
        }
        return second.score - first.score || first.index - second.index;
      })
      .slice(0, 6);

    results.replaceChildren();
    if (!matched.length) {
      const empty = document.createElement("p");
      empty.className = "spotlight-empty";
      empty.textContent = "Ничего не найдено. Попробуйте другой запрос.";
      results.append(empty);
      return;
    }

    matched.forEach(({ item }, index) => {
      const link = document.createElement("a");
      link.className = "spotlight-result";
      link.href = `gta-news.html?q=${encodeURIComponent(input?.value.trim() || item.title)}`;
      link.setAttribute("role", "option");
      link.setAttribute("aria-selected", String(index === 0));
      link.tabIndex = index === 0 ? 0 : -1;

      const badge = document.createElement("span");
      badge.className = `spotlight-result-badge is-${item.category}`;
      badge.textContent =
        item.category === "official" ? "ФАКТ" : item.category === "leak" ? "УТЕЧКА" : "СЛУХ";
      const copy = document.createElement("span");
      copy.className = "spotlight-result-copy";
      const title = document.createElement("strong");
      title.textContent = item.title;
      const detail = document.createElement("span");
      detail.textContent = `${item.tag} · ${item.date}`;
      copy.append(title, detail);
      const arrow = document.createElement("span");
      arrow.className = "spotlight-result-arrow";
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "↗";
      link.append(badge, copy, arrow);
      results.append(link);
    });
  }

  function openSpotlight() {
    if (!dialog || typeof dialog.showModal !== "function") {
      document.getElementById("news-search")?.focus();
      return;
    }
    previousFocus = document.activeElement;
    dialog.showModal();
    if (input) {
      input.value = "";
      updateSpotlight();
      input.focus();
    }
  }

  input?.addEventListener("input", updateSpotlight);
  dialog?.querySelector("[data-spotlight-close]")?.addEventListener("click", () => dialog.close());
  dialog?.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog?.addEventListener("close", () => {
    if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
  });
  dialog?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      dialog.close();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const options = [...(results?.querySelectorAll(".spotlight-result") || [])];
    if (!options.length) return;
    event.preventDefault();
    const current = options.indexOf(document.activeElement);
    const step = event.key === "ArrowDown" ? 1 : -1;
    const next = (current + step + options.length) % options.length;
    options[next].focus();
  });
  dialog?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || document.activeElement !== input) return;
    const firstResult = results?.querySelector(".spotlight-result");
    if (firstResult instanceof HTMLAnchorElement) {
      event.preventDefault();
      firstResult.click();
    }
  });
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      if (dialog?.open) {
        input?.focus();
        input?.select();
      } else {
        openSpotlight();
      }
    }
  });

  window.initializeNewsImages = (root = document) => {
    root.querySelectorAll(".thumb img").forEach((image) => {
      const thumb = image.closest(".thumb");
      if (!thumb || image.dataset.loadingBound) return;
      image.dataset.loadingBound = "true";
      let skeleton = thumb.querySelector(".thumb-skeleton");
      if (!skeleton) {
        skeleton = document.createElement("span");
        skeleton.className = "thumb-skeleton";
        skeleton.setAttribute("aria-hidden", "true");
        thumb.prepend(skeleton);
      }
      const finish = () => {
        thumb.classList.add("is-image-loaded");
        skeleton.remove();
      };
      image.addEventListener("load", finish, { once: true });
      image.addEventListener(
        "error",
        () => {
          thumb.classList.add("has-image-error");
          skeleton.remove();
          image.remove();
        },
        { once: true }
      );
      if (image.complete) {
        if (image.naturalWidth) finish();
        else if (image.currentSrc || image.src) image.dispatchEvent(new Event("error"));
      }
    });
  };

  window.initializeNewsImages();
})();
