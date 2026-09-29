/*
 * Trip Cards — 여행 카드 가이드 공용 엔진 (Attuned Travellers)
 * version: 1.0.0
 * ─────────────────────────────────────────────────────────────
 * 이 파일은 travel-kit/assets/ 가 원본입니다. 여행 폴더에서 직접 고치지 말고
 * travel-kit 에서 고친 뒤 `travel-kit/sync.sh` 로 모든 여행 폴더에 배포하세요.
 *
 * 로드 순서 (index.html):
 *   1) assets/trip-cards.js      ← 이 파일 (Trip 레지스트리 정의)
 *   2) places/data/_config.js    ← Trip.config({...})
 *   3) places/data/*.js          ← Trip.add([...])
 *   → DOMContentLoaded 시 #trip-app 에 화면 전체를 그립니다.
 *
 * ── Trip.config 옵션 ──────────────────────────────────────────
 *   id          (필수) localStorage 네임스페이스. 예: "osaka"
 *   title, eyebrow, intro   헤더 문구
 *   mapSuffix   지도 검색어 뒤에 붙일 도시명. 예: "大阪", "Kyoto"
 *   accent      포인트 색 (hex). 기본 #d9480f
 *   categories  { key: { label, emoji, color, group? } }
 *   groups      (선택) { key: { label, emoji } } — 카테고리를 상위 탭으로 묶을 때
 *   areas       (선택) { key: { label } } — 없거나 키가 아니면 area 문자열을 그대로 표시
 *   priorities  (선택) 기본 { must: 꼭 가기, good: 추천, maybe: 여유되면 }
 *   seasonal    (선택) { field: "october", label: "10월 포인트", emoji: "🍁" }
 *   notes       (선택) [{ emoji, title, text }] — 헤더 아래 안내 카드
 *
 * ── 아이템 스키마 (필수: id, category, name, area, summary) ─────
 *   id, category, name, nameLocal, area, emoji, summary,
 *   highlights: [..], tips: "문자열" | [..],
 *   where: [{ name, area, note, map }]       // 가게 추천 목록 (음식 등)
 *   price: 0~4 (¥ 단계, 0=무료) | "¥500" (자유 문자열),
 *   duration, hours, priority: "must"|"good"|"maybe",
 *   tags: [..], map: "지도 검색어",
 *   links: { map, web } | [{ label, url }],
 *   added: "YYYY-MM-DD", <seasonal.field>: "시즌 메모"
 */
(function () {
  const DEFAULT_PRIORITIES = {
    must: { label: "꼭 가기", rank: 0 },
    good: { label: "추천", rank: 1 },
    maybe: { label: "여유되면", rank: 2 },
  };

  const cfg = { id: "trip", title: "여행 카드", eyebrow: "", intro: "", mapSuffix: "", accent: "#d9480f",
    categories: {}, groups: null, areas: {}, priorities: DEFAULT_PRIORITIES, seasonal: null, notes: [] };
  const items = [];
  const ids = new Set();

  const asArray = (v) => (v == null || v === "" ? [] : Array.isArray(v) ? v : [v]);

  window.Trip = {
    config(opts) { Object.assign(cfg, opts); if (!opts.priorities) cfg.priorities = DEFAULT_PRIORITIES; },
    add(list) {
      asArray(list).forEach((it) => {
        const missing = ["id", "category", "name", "area", "summary"].filter((k) => !it[k]);
        if (missing.length) return console.warn("[Trip] 필수 필드 누락:", missing, it);
        if (ids.has(it.id)) return console.warn("[Trip] 중복 id:", it.id);
        if (!cfg.categories[it.category]) console.warn("[Trip] 알 수 없는 category:", it.category, it.id);
        ids.add(it.id);
        const links = Array.isArray(it.links)
          ? { list: it.links }
          : { ...(it.links || {}), list: it.links?.web ? [{ label: "🔗 공식 사이트", url: it.links.web }] : [] };
        items.push({
          priority: "good", ...it,
          tags: asArray(it.tags), highlights: asArray(it.highlights), tips: asArray(it.tips),
          where: asArray(it.where), links, _order: items.length,
        });
      });
    },
    get items() { return items; },
    get settings() { return cfg; },
  };

  /* ═════════════ 렌더링 ═════════════ */
  document.addEventListener("DOMContentLoaded", () => {
    const root = document.getElementById("trip-app");
    if (!root) return console.warn("[Trip] #trip-app 요소가 없습니다.");
    const $ = (s, el = document) => el.querySelector(s);
    const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const P = cfg.priorities;
    const S = cfg.seasonal;
    const CATS = cfg.categories;
    const GROUPS = cfg.groups;

    document.documentElement.style.setProperty("--accent", cfg.accent);
    if (cfg.title && !document.title) document.title = cfg.title;

    /* 개인 상태 (찜 / 다녀옴) — 이 브라우저에만 저장 */
    const store = {
      load(k) { try { return new Set(JSON.parse(localStorage.getItem(k) || "[]")); } catch { return new Set(); } },
      save(k, set) { try { localStorage.setItem(k, JSON.stringify([...set])); } catch {} },
    };
    const FAV = cfg.id + ":fav", VIS = cfg.id + ":visited";
    const fav = store.load(FAV), visited = store.load(VIS);

    const state = { q: "", group: "all", cat: "all", area: "all", prio: "all", sort: "priority", season: false, favOnly: false, hideVisited: false };

    /* helpers */
    const cat = (it) => CATS[it.category] || { label: it.category, emoji: "📌", color: "#888" };
    const areaLabel = (a) => cfg.areas?.[a]?.label || a;
    const priceText = (p) => (p === undefined || p === null ? "" : typeof p === "number" ? (p === 0 ? "무료" : "¥".repeat(p)) : p);
    const withSuffix = (q) => (cfg.mapSuffix && !q.toLowerCase().includes(cfg.mapSuffix.toLowerCase()) ? q + " " + cfg.mapSuffix : q);
    const mapSearch = (q) => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(withSuffix(q));
    const mapUrl = (it) => it.links.map || mapSearch(it.map || it.nameLocal || it.name);
    const groupOf = (it) => cat(it).group;
    const areaKeys = () => {
      const used = [...new Set(items.map((i) => i.area))];
      const known = Object.keys(cfg.areas || {}).filter((a) => used.includes(a));
      return known.concat(used.filter((a) => !known.includes(a)).sort((a, b) => a.localeCompare(b, "ko")));
    };

    function matches(it, skip = "") {
      if (skip !== "group" && state.group !== "all" && groupOf(it) !== state.group) return false;
      if (skip !== "cat" && state.cat !== "all" && it.category !== state.cat) return false;
      if (state.area !== "all" && it.area !== state.area) return false;
      if (state.prio !== "all" && it.priority !== state.prio) return false;
      if (S && state.season && !it[S.field]) return false;
      if (state.favOnly && !fav.has(it.id)) return false;
      if (state.hideVisited && visited.has(it.id)) return false;
      if (state.q) {
        const hay = [it.name, it.nameLocal, it.summary, areaLabel(it.area), cat(it).label, S && it[S.field],
          ...it.tips, ...it.tags, ...it.highlights, ...it.where.map((w) => w.name + " " + (w.note || ""))].join(" ").toLowerCase();
        if (!state.q.toLowerCase().split(/\s+/).every((w) => hay.includes(w))) return false;
      }
      return true;
    }

    const catOrder = Object.keys(CATS);
    const sorters = {
      priority: (a, b) => (P[a.priority]?.rank ?? 9) - (P[b.priority]?.rank ?? 9) || a._order - b._order,
      category: (a, b) => catOrder.indexOf(a.category) - catOrder.indexOf(b.category) || sorters.priority(a, b),
      area: (a, b) => areaKeys().indexOf(a.area) - areaKeys().indexOf(b.area) || sorters.priority(a, b),
      recent: (a, b) => (b.added || "").localeCompare(a.added || "") || b._order - a._order,
      name: (a, b) => a.name.localeCompare(b.name, "ko"),
    };

    /* 뼈대 */
    root.innerHTML = `
      <header class="hero wrap">
        ${cfg.eyebrow ? `<div class="eyebrow">${esc(cfg.eyebrow)}</div>` : ""}
        <h1>${esc(cfg.title)}</h1>
        ${cfg.intro ? `<p>${esc(cfg.intro)}</p>` : ""}
        <div class="stats" id="stats"></div>
        ${cfg.notes?.length ? `<div class="notes">${cfg.notes.map((n) => `
          <div class="note"><b>${esc(n.emoji || "")} ${esc(n.title)}</b>${esc(n.text)}</div>`).join("")}</div>` : ""}
      </header>
      <div class="toolbar">
        <div class="wrap">
          <div class="row">
            <input id="q" class="search" type="search" placeholder="검색: 이름, 지역, 태그…" autocomplete="off" aria-label="검색">
            <select id="area" class="ctl" aria-label="지역"></select>
            <select id="prio" class="ctl" aria-label="우선순위"></select>
            <select id="sort" class="ctl" aria-label="정렬">
              <option value="priority">정렬: 우선순위</option>
              <option value="category">정렬: 카테고리</option>
              <option value="area">정렬: 지역</option>
              <option value="recent">정렬: 최근 추가</option>
              <option value="name">정렬: 이름</option>
            </select>
          </div>
          ${GROUPS ? `<div class="row"><div class="chips groups" id="group-chips"></div></div>` : ""}
          <div class="row"><div class="chips" id="cat-chips"></div></div>
          <div class="row">
            ${S ? `<button class="chip toggle" data-toggle="season" aria-pressed="false">${esc(S.emoji || "🗓")} ${esc(S.label)}</button>` : ""}
            <button class="chip toggle" data-toggle="favOnly" aria-pressed="false">★ 찜만</button>
            <button class="chip toggle" data-toggle="hideVisited" aria-pressed="false">다녀온 곳 숨기기</button>
            <button class="chip toggle" id="reset">↺ 초기화</button>
          </div>
        </div>
      </div>
      <main class="wrap">
        <div class="result-info" id="result-info"></div>
        <section class="grid" id="grid" aria-live="polite"></section>
        <div class="empty" id="empty" hidden>조건에 맞는 카드가 없어요 🥲</div>
      </main>
      <dialog id="detail"></dialog>`;

    /* 카드 */
    function cardHTML(it) {
      const c = cat(it), p = P[it.priority], price = priceText(it.price);
      return `
        <article class="card ${visited.has(it.id) ? "visited" : ""}" style="--cat:${c.color}" tabindex="0" data-id="${esc(it.id)}">
          <div class="card-top">
            <span class="cat">${c.emoji} ${esc(c.label)}</span>
            ${p ? `<span class="prio ${esc(it.priority)}">${esc(p.label)}</span>` : ""}
            <span aria-hidden="true">${esc(it.emoji || c.emoji)}</span>
          </div>
          <div class="card-body">
            <div>
              <h3>${esc(it.name)}</h3>
              ${it.nameLocal ? `<div class="local" lang="ja">${esc(it.nameLocal)}</div>` : ""}
            </div>
            <p class="summary">${esc(it.summary)}</p>
            <div class="meta">
              <span>📍 ${esc(areaLabel(it.area))}</span>
              ${price ? `<span>💴 ${esc(price)}</span>` : ""}
              ${it.duration ? `<span>⏱ ${esc(it.duration)}</span>` : ""}
            </div>
            ${S && it[S.field] ? `<div class="season">${esc(S.emoji || "")} ${esc(it[S.field])}</div>` : ""}
            ${it.tags.length ? `<div class="tags">${it.tags.map((t) => `<span class="tag">#${esc(t)}</span>`).join("")}</div>` : ""}
          </div>
          <div class="card-actions">
            <button data-act="fav" class="${fav.has(it.id) ? "on" : ""}">${fav.has(it.id) ? "★ 찜함" : "☆ 찜"}</button>
            <button data-act="visited" class="${visited.has(it.id) ? "on" : ""}">${visited.has(it.id) ? "✔ 다녀옴" : "○ 다녀옴"}</button>
            <a href="${esc(mapUrl(it))}" target="_blank" rel="noopener" data-act="map">🗺 지도</a>
          </div>
        </article>`;
    }

    /* 상세 모달 */
    function openModal(it) {
      const c = cat(it), p = P[it.priority], price = priceText(it.price);
      const dlg = $("#detail");
      dlg.style.setProperty("--cat", c.color);
      const list = (arr) => `<ul>${arr.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
      dlg.innerHTML = `
        <div class="m-top"><span aria-hidden="true">${esc(it.emoji || c.emoji)}</span>
          <button class="m-close" aria-label="닫기">✕</button></div>
        <div class="m-body">
          <div class="meta"><span>${c.emoji} ${esc(c.label)}</span><span>📍 ${esc(areaLabel(it.area))}</span>
            ${p ? `<span>🏷 ${esc(p.label)}</span>` : ""}</div>
          <h2>${esc(it.name)}</h2>
          ${it.nameLocal ? `<div class="local" lang="ja">${esc(it.nameLocal)}</div>` : ""}
          <p class="lead">${esc(it.summary)}</p>
          ${it.highlights.length ? `<h4>하이라이트</h4>${list(it.highlights)}` : ""}
          ${it.where.length ? `<h4>🍽 어디서</h4><ul class="where">${it.where.map((w) => `
            <li><a href="${esc(w.map ? mapSearch(w.map) : mapSearch(w.name))}" target="_blank" rel="noopener">${esc(w.name)}</a>
            <small>${esc(w.area || "")}${w.note ? " · " + esc(w.note) : ""}</small></li>`).join("")}</ul>` : ""}
          ${it.tips.length ? `<h4>💡 팁</h4>${it.tips.length > 1 ? list(it.tips) : `<p>${esc(it.tips[0])}</p>`}` : ""}
          ${S && it[S.field] ? `<h4>${esc(S.emoji || "")} ${esc(S.label)}</h4><div class="season">${esc(it[S.field])}</div>` : ""}
          ${(it.hours || it.duration || price) ? `<h4>정보</h4><div class="meta">
            ${it.hours ? `<span>🕘 ${esc(it.hours)}</span>` : ""}
            ${it.duration ? `<span>⏱ ${esc(it.duration)}</span>` : ""}
            ${price ? `<span>💴 ${esc(price)}</span>` : ""}</div>` : ""}
          <div class="m-links">
            <a class="btn primary" href="${esc(mapUrl(it))}" target="_blank" rel="noopener">🗺 구글 지도</a>
            ${it.links.list.map((l) => `<a class="btn" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join("")}
          </div>
        </div>`;
      $(".m-close", dlg).onclick = () => dlg.close();
      dlg.showModal();
    }

    /* 필터 칩 · 통계 */
    function renderChips() {
      if (GROUPS) {
        const gCount = (g) => items.filter((it) => matches(it, "group") && (g === "all" || groupOf(it) === g)).length;
        $("#group-chips").innerHTML = [["all", { label: "전체", emoji: "✨" }], ...Object.entries(GROUPS)]
          .map(([k, v]) => `<button class="chip group" data-group="${esc(k)}" aria-pressed="${state.group === k}">${v.emoji || ""} ${esc(v.label)}<span class="n">${gCount(k)}</span></button>`).join("");
      }
      const base = items.filter((it) => matches(it, "cat"));
      const count = (k) => base.filter((it) => k === "all" || it.category === k).length;
      const cats = Object.entries(CATS).filter(([k, v]) => state.group === "all" || v.group === state.group).filter(([k]) => count(k) > 0 || state.cat === k);
      $("#cat-chips").innerHTML = [["all", { label: "모두", emoji: "📚" }], ...cats]
        .map(([k, v]) => `<button class="chip" data-cat="${esc(k)}" aria-pressed="${state.cat === k}" ${v.color ? `style="--cat:${v.color}"` : ""}>${v.emoji} ${esc(v.label)}<span class="n">${count(k)}</span></button>`).join("");
    }

    function renderStats() {
      const must = items.filter((i) => i.priority === "must").length;
      const byGroup = GROUPS ? Object.entries(GROUPS).map(([k, g]) =>
        `<span class="stat">${g.emoji || ""} ${esc(g.label)} <b>${items.filter((i) => groupOf(i) === k).length}</b></span>`).join("")
        : `<span class="stat">총 <b>${items.length}</b>곳</span>`;
      $("#stats").innerHTML = `${byGroup}
        <span class="stat">${esc(P.must?.label || "필수")} <b>${must}</b></span>
        <span class="stat">★ 찜 <b>${[...fav].filter((id) => ids.has(id)).length}</b></span>
        <span class="stat">✔ 다녀옴 <b>${[...visited].filter((id) => ids.has(id)).length}</b></span>`;
    }

    function render() {
      const list = items.filter((it) => matches(it)).sort(sorters[state.sort]);
      $("#grid").innerHTML = list.map(cardHTML).join("");
      $("#empty").hidden = list.length > 0;
      $("#result-info").textContent = `${list.length}개 표시 중 / 전체 ${items.length}개`;
      renderChips();
      renderStats();
    }

    function toggle(set, key, id) {
      set.has(id) ? set.delete(id) : set.add(id);
      store.save(key, set);
      render();
    }

    /* 초기화 · 이벤트 */
    $("#area").innerHTML = `<option value="all">📍 모든 지역</option>` + areaKeys().map((a) => `<option value="${esc(a)}">${esc(areaLabel(a))}</option>`).join("");
    $("#prio").innerHTML = `<option value="all">🏷 모든 우선순위</option>` + Object.entries(P).map(([k, v]) => `<option value="${esc(k)}">${esc(v.label)}</option>`).join("");

    $("#q").addEventListener("input", (e) => { state.q = e.target.value.trim(); render(); });
    $("#area").addEventListener("change", (e) => { state.area = e.target.value; render(); });
    $("#prio").addEventListener("change", (e) => { state.prio = e.target.value; render(); });
    $("#sort").addEventListener("change", (e) => { state.sort = e.target.value; render(); });
    root.querySelectorAll("[data-toggle]").forEach((btn) => btn.addEventListener("click", () => {
      const k = btn.dataset.toggle;
      state[k] = !state[k];
      btn.setAttribute("aria-pressed", state[k]);
      render();
    }));
    $("#reset").addEventListener("click", () => {
      Object.assign(state, { q: "", group: "all", cat: "all", area: "all", prio: "all", season: false, favOnly: false, hideVisited: false });
      $("#q").value = ""; $("#area").value = "all"; $("#prio").value = "all";
      root.querySelectorAll("[data-toggle]").forEach((b) => b.setAttribute("aria-pressed", "false"));
      render();
    });
    GROUPS && $("#group-chips").addEventListener("click", (e) => {
      const b = e.target.closest("[data-group]");
      if (b) { state.group = b.dataset.group; state.cat = "all"; render(); }
    });
    $("#cat-chips").addEventListener("click", (e) => {
      const b = e.target.closest("[data-cat]");
      if (b) { state.cat = b.dataset.cat; render(); }
    });
    $("#grid").addEventListener("click", (e) => {
      const card = e.target.closest(".card");
      if (!card) return;
      const it = items.find((i) => i.id === card.dataset.id);
      const act = e.target.closest("[data-act]")?.dataset.act;
      if (act === "map") return;
      if (act === "fav") return toggle(fav, FAV, it.id);
      if (act === "visited") return toggle(visited, VIS, it.id);
      openModal(it);
    });
    $("#grid").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.target.classList.contains("card")) openModal(items.find((i) => i.id === e.target.dataset.id));
    });
    $("#detail").addEventListener("click", (e) => { if (e.target.id === "detail") e.target.close(); });

    render();
  });
})();
