// OMNI 사이트: 명령어 페이지의 검색·분류 필터
(function () {
  "use strict";

  // Shrink the header after leaving the top, without oscillating as its height changes.
  var header = document.querySelector(".site-header");
  var compact = false;
  var scrollPending = false;
  var motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  var headerAnimation;

  function updateScrollState() {
    scrollPending = false;
    var nextCompact = compact ? window.scrollY > 40 : window.scrollY > 120;
    if (nextCompact === compact) return;
    var oldHeight = header.getBoundingClientRect().height;
    if (headerAnimation) headerAnimation.cancel();
    compact = nextCompact;
    document.documentElement.classList.toggle("is-scrolled", compact);
    if (!motionPreference.matches && header.animate) {
      headerAnimation = header.animate(
        [{ height: oldHeight + "px" }, { height: header.getBoundingClientRect().height + "px" }],
        { duration: 280, easing: "cubic-bezier(.22,1,.36,1)" }
      );
    }
  }
  if (header) {
    updateScrollState();
    window.addEventListener("scroll", function () {
      if (!scrollPending) {
        scrollPending = true;
        requestAnimationFrame(updateScrollState);
      }
    }, { passive: true });
    motionPreference.addEventListener("change", function () {
      if (headerAnimation) headerAnimation.cancel();
    });
  }

  // Native disclosure works without JS; enhance dismissal for dropdown behavior.
  document.querySelectorAll("details.versions").forEach(function (versions) {
    document.addEventListener("click", function (event) {
      if (!versions.contains(event.target)) versions.open = false;
    });
    versions.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && versions.open) {
        versions.open = false;
        versions.querySelector("summary").focus();
      }
    });
  });

  // Content stays visible without JS; animate each section only when it enters view.
  if (!motionPreference.matches && "IntersectionObserver" in window && Element.prototype.animate) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting || motionPreference.matches) return;
        entry.target.animate(
          [{ opacity: 0, transform: "translateY(22px)" }, { opacity: 1, transform: "translateY(0)" }],
          { duration: 650, easing: "cubic-bezier(.2,.7,.2,1)" }
        );
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12 });
    document.querySelectorAll(".section-heading, .feature-row, .faq details").forEach(function (el) {
      revealObserver.observe(el);
    });
    motionPreference.addEventListener("change", function (event) {
      if (event.matches) {
        revealObserver.disconnect();
        document.getAnimations().forEach(function (animation) { animation.cancel(); });
      }
    });
  }

  // Animate the disclosure's height so the following questions move with it.
  document.querySelectorAll(".faq details").forEach(function (details) {
    var summary = details.querySelector("summary");
    var animation;
    var expanded = details.open;
    function finish() {
      details.open = expanded;
      details.style.overflow = "";
      if (animation) animation.cancel();
      animation = null;
    }
    summary.addEventListener("click", function (event) {
      if (!Element.prototype.animate || motionPreference.matches) return;
      event.preventDefault();
      var start = details.getBoundingClientRect().height;
      expanded = animation ? !expanded : !details.open;
      if (animation) animation.cancel();
      details.open = true;
      var end = expanded ? details.getBoundingClientRect().height : summary.getBoundingClientRect().height + 1;
      details.style.overflow = "hidden";
      animation = details.animate(
        [{ height: start + "px" }, { height: end + "px" }],
        { duration: 300, easing: "cubic-bezier(.2,.7,.2,1)" }
      );
      animation.onfinish = finish;
    });
    motionPreference.addEventListener("change", function () {
      if (animation) finish();
    });
  });

  function openLinkedFAQ() {
    var target = document.querySelector(".faq details:target");
    if (target) target.open = true;
  }
  openLinkedFAQ();
  window.addEventListener("hashchange", openLinkedFAQ);

  /* ---------- 약관·방침: 제목(##)으로 목차 만들기 ---------- */
  var tocBox = document.getElementById("toc");
  var tocList = document.getElementById("toc-list");
  if (tocBox && tocList) {
    var heads = [].slice.call(document.querySelectorAll(".legal-doc h2"));
    if (heads.length > 2) {
      var used = {};
      var links = heads.map(function (h) {
        // 제목에 id가 없으면(렌더러에 따라 다름) 글자로 만든다
        var id = h.id;
        if (!id) {
          id = h.textContent.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "") || "section";
          if (used[id]) id += "-" + (used[id] += 1); else used[id] = 1;
          h.id = id;
        }
        var li = document.createElement("li");
        var a = document.createElement("a");
        a.href = "#" + id;
        a.textContent = h.textContent.trim();
        li.appendChild(a);
        tocList.appendChild(li);
        return a;
      });
      tocBox.hidden = false;
      // 작은 화면에서는 목차를 접어 둔다
      if (window.matchMedia && window.matchMedia("(max-width: 960px)").matches) tocBox.open = false;

      // 지금 읽고 있는 제목을 표시한다 (움직임 없이 색만 바뀜)
      if ("IntersectionObserver" in window) {
        var current = null;
        var observer = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            if (!e.isIntersecting) return;
            var idx = heads.indexOf(e.target);
            if (current !== null) links[current].removeAttribute("aria-current");
            links[idx].setAttribute("aria-current", "true");
            current = idx;
          });
        }, { rootMargin: "-10% 0px -80% 0px" });
        heads.forEach(function (h) { observer.observe(h); });
      }
    }
  }

  /* ---------- 명령어 페이지: 검색·분류·정렬·보기 ---------- */
  var q = document.getElementById("q");
  var filters = document.getElementById("filters");
  if (q && filters) {
    var groups = [].slice.call(document.querySelectorAll(".cmd-group"));
    var cmds = [].slice.call(document.querySelectorAll(".cmd"));
    var empty = document.getElementById("empty");
    var buttons = [].slice.call(filters.querySelectorAll("button"));
    var flat = document.getElementById("cmd-flat");
    var controls = document.getElementById("view-controls");
    var page = document.querySelector("main .wrap") || document.body;
    var active = "";
    var sortMode = "cat";

    // 한글 초성 (예: 차단 -> ㅊㄷ)
    var CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
    var toCho = function (text) {
      return Array.from(text).map(function (ch) {
        var code = ch.charCodeAt(0);
        return code >= 0xac00 && code <= 0xd7a3 ? CHO.charAt(Math.floor((code - 0xac00) / 588)) : ch;
      }).join("");
    };
    var store = {
      get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
      set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* 저장은 편의 기능이라 실패해도 괜찮다 */ } }
    };

    // 항목마다 분류와 원래 자리를 기억해 둔다 (이름순으로 바꿨다가 되돌릴 때 필요)
    cmds.forEach(function (c, i) {
      var group = c.closest(".cmd-group");
      c._cat = group ? group.getAttribute("data-cat") : "";
      c._home = c.parentNode;
      c._order = i;
      c._name = c.getAttribute("data-name") || "";
      c._uses = parseInt(c.getAttribute("data-uses"), 10) || 1;
      c._text = (c.getAttribute("data-text") || "").toLowerCase();
      c._cho = toCho(c._name + " " + (c.getAttribute("data-subs") || ""));
    });

    var matches = function (c, term) {
      if (active && c._cat !== active) return false;
      if (!term) return true;
      if (c._text.indexOf(term) !== -1) return true;
      return /^[ㄱ-ㅎ]+$/.test(term) && c._cho.indexOf(term) !== -1;
    };

    var apply = function () {
      var term = q.value.trim().toLowerCase().replace(/^\//, "");
      var shown = 0;
      cmds.forEach(function (c) {
        var ok = matches(c, term);
        c.hidden = !ok;
        if (ok) shown += c._uses;
      });
      groups.forEach(function (g) {
        [].forEach.call(g.querySelectorAll(".cmd-sub"), function (sub) {
          sub.hidden = !sub.querySelector(".cmd:not([hidden])");
        });
        g.hidden = !g.querySelector(".cmd:not([hidden])");
      });
      empty.hidden = shown !== 0;
      document.getElementById("empty-term").textContent = q.value.trim() ? "‘" + q.value.trim() + "’에 대한" : "선택한 분류에";
      document.getElementById("result-count").textContent = "명령어 " + shown + "개";
    };

    var select = function (cat) {
      active = cat;
      buttons.forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-cat") === cat ? "true" : "false"); });
      apply();
    };

    var pressed = function (selector, attr, value) {
      [].forEach.call(document.querySelectorAll(selector), function (b) { b.setAttribute("aria-pressed", b.getAttribute(attr) === value ? "true" : "false"); });
    };

    // 이름순: 분류와 상관없이 가나다 순으로 한 줄에 모아 보여준다
    var setSort = function (mode) {
      sortMode = mode;
      pressed("[data-sort]", "data-sort", mode);
      var byName = mode === "name";
      page.classList.toggle("is-flat", byName);
      flat.hidden = !byName;
      groups.forEach(function (g) { g.classList.toggle("is-collapsed", byName); });
      var ordered = cmds.slice().sort(byName
        ? function (x, y) { return x._name.localeCompare(y._name, "ko"); }
        : function (x, y) { return x._order - y._order; });
      ordered.forEach(function (c) { (byName ? flat : c._home).appendChild(c); });
      store.set("omni-cmd-sort", mode);
      apply();
    };

    var setView = function (mode) {
      pressed("[data-view]", "data-view", mode);
      page.classList.toggle("is-cards", mode === "card");
      store.set("omni-cmd-view", mode);
    };

    buttons.forEach(function (b) { b.addEventListener("click", function () { select(b.getAttribute("data-cat")); }); });
    q.addEventListener("input", apply);
    document.getElementById("reset-filters").addEventListener("click", function () {
      q.value = "";
      select("");
      q.focus();
    });
    if (controls) {
      controls.hidden = false;
      [].forEach.call(controls.querySelectorAll("[data-sort]"), function (b) { b.addEventListener("click", function () { setSort(b.getAttribute("data-sort")); }); });
      [].forEach.call(controls.querySelectorAll("[data-view]"), function (b) { b.addEventListener("click", function () { setView(b.getAttribute("data-view")); }); });
      if (store.get("omni-cmd-view") === "card") setView("card");
      if (store.get("omni-cmd-sort") === "name") setSort("name");
    }

    // Deep links must reveal a command even after a different category was selected.
    function followHash() {
      var hash;
      try { hash = decodeURIComponent(location.hash.slice(1)); } catch (error) { return; }
      if (buttons.some(function (b) { return b.dataset.cat === hash; })) {
        q.value = "";
        select(hash);
      } else if (hash.indexOf("cmd-") === 0) {
        var target = document.getElementById(hash);
        if (target && target.classList.contains("cmd")) {
          q.value = "";
          select("");
          requestAnimationFrame(function () { target.scrollIntoView({ block: "start" }); });
        }
      }
    }
    followHash();
    window.addEventListener("hashchange", followHash);
  }

  // 사용법 이름 복사 (예: /음악 재생)
  document.addEventListener("click", function (event) {
    var btn = event.target.closest && event.target.closest(".copy-btn");
    if (!btn) return;
    var text = btn.getAttribute("data-copy");
    var done = function () {
      btn.textContent = "복사됨";
      btn.classList.add("is-done");
      setTimeout(function () { btn.textContent = "복사"; btn.classList.remove("is-done"); }, 1400);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () {});
  });

  /* ---------- 이메일 링크: PC에서는 Gmail 작성 창, 모바일·JS 없음은 mailto 그대로 ---------- */
  if (!/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) {
    [].forEach.call(document.querySelectorAll('a[href^="mailto:"]'), function (a) {
      var to = a.getAttribute("href").slice(7).split("?")[0];
      if (!to) return;
      a.href = "https://mail.google.com/mail/?view=cm&fs=1&to=" + encodeURIComponent(to).replace("%40", "@");
      a.target = "_blank";
      a.rel = "noopener";
    });
  }
})();
