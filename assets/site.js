// OMNI 사이트: 명령어 페이지의 검색·분류 필터
(function () {
  "use strict";

  // Collapse navigation after leaving the top, without oscillating as its height changes.
  var header = document.querySelector(".site-header");
  var nav = document.getElementById("primary-nav");
  var navToggle = document.getElementById("nav-toggle");
  var backToTop = document.getElementById("back-to-top");
  var compact = false;
  var scrollPending = false;

  function closeNavigation(restoreFocus) {
    header.classList.remove("nav-open");
    navToggle.setAttribute("aria-expanded", "false");
    if (restoreFocus) navToggle.focus({ preventScroll: true });
  }
  function updateScrollState() {
    scrollPending = false;
    var nextCompact = compact ? window.scrollY > 40 : window.scrollY > 120;
    if (nextCompact !== compact) {
      var focusInNav = nav.contains(document.activeElement);
      var focusOnToggle = document.activeElement === navToggle;
      compact = nextCompact;
      document.documentElement.classList.toggle("is-scrolled", compact);
      navToggle.hidden = !compact;
      if (!compact) closeNavigation(false);
      if (compact && focusInNav) navToggle.focus({ preventScroll: true });
      if (!compact && focusOnToggle) header.querySelector(".brand").focus({ preventScroll: true });
    }
    backToTop.hidden = window.scrollY < 360;
  }
  if (header && nav && navToggle && backToTop) {
    updateScrollState();
    window.addEventListener("scroll", function () {
      if (!scrollPending) {
        scrollPending = true;
        requestAnimationFrame(updateScrollState);
      }
    }, { passive: true });
    navToggle.addEventListener("click", function () {
      var open = navToggle.getAttribute("aria-expanded") !== "true";
      header.classList.toggle("nav-open", open);
      navToggle.setAttribute("aria-expanded", String(open));
    });
    nav.addEventListener("click", function (event) {
      if (event.target.closest("a") && compact) closeNavigation(true);
    });
    document.addEventListener("click", function (event) {
      if (compact && !header.contains(event.target)) closeNavigation(false);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && header.classList.contains("nav-open")) closeNavigation(true);
    });
    backToTop.addEventListener("click", function () {
      header.querySelector(".brand").focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
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
