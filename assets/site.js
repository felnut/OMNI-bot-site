// OMNI 사이트: 명령어 페이지의 검색·분류 필터
(function () {
  "use strict";

  // Content stays visible without JS; animate each section only when it enters view.
  var motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
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
    document.querySelectorAll(".section-heading, .feature-row, .points > div, .faq details").forEach(function (el) {
      revealObserver.observe(el);
    });
    motionPreference.addEventListener("change", function (event) {
      if (event.matches) {
        revealObserver.disconnect();
        document.getAnimations().forEach(function (animation) { animation.cancel(); });
      }
    });
  }

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

  /* ---------- 명령어 페이지: 검색과 분류 ---------- */
  var q = document.getElementById("q");
  var filters = document.getElementById("filters");
  if (q && filters) {
    var groups = [].slice.call(document.querySelectorAll(".cmd-group"));
    var empty = document.getElementById("empty");
    var buttons = [].slice.call(filters.querySelectorAll("button"));
    var active = "";

    var apply = function () {
      var term = q.value.trim().toLowerCase();
      var shown = 0;
      groups.forEach(function (g) {
        var inCat = !active || g.getAttribute("data-cat") === active;
        var visible = 0;
        [].forEach.call(g.querySelectorAll(".cmd"), function (c) {
          var match = inCat && (!term || c.getAttribute("data-text").toLowerCase().indexOf(term) !== -1);
          c.hidden = !match;
          if (match) visible += 1;
        });
        g.hidden = visible === 0;
        shown += visible;
      });
      empty.hidden = shown !== 0;
      document.getElementById("result-count").textContent = "명령어 " + shown + "개";
    };

    var select = function (cat) {
      active = cat;
      buttons.forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-cat") === cat ? "true" : "false"); });
      apply();
    };

    buttons.forEach(function (b) { b.addEventListener("click", function () { select(b.getAttribute("data-cat")); }); });
    q.addEventListener("input", apply);

    // Deep links must reveal a command even after a different category was selected.
    function followHash() {
      var hash;
      try { hash = decodeURIComponent(location.hash.slice(1)); } catch (error) { return; }
      if (buttons.some(function (b) { return b.dataset.cat === hash; })) {
        q.value = "";
        select(hash);
      } else if (hash.startsWith("cmd-")) {
        var target = document.getElementById(hash);
        if (target && target.classList.contains("cmd")) {
          q.value = "";
          select("");
          target.open = true;
          requestAnimationFrame(function () { target.scrollIntoView({ block: "start" }); });
        }
      }
    }
    followHash();
    window.addEventListener("hashchange", followHash);
  }
})();
