// OMNI 사이트: 첫 화면의 슬래시 명령어 데모, 명령어 페이지의 검색·분류 필터
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 첫 화면 데모 ---------- */
  var demo = document.getElementById("demo");
  if (demo) {
    var feed = document.getElementById("demo-feed");
    var typed = document.getElementById("demo-typed");
    var picker = document.getElementById("demo-picker");
    var list = document.getElementById("demo-list");
    var cmds = [];
    try { cmds = JSON.parse(document.getElementById("demo-data").textContent); } catch (e) { cmds = []; }

    // 예시 장면: 입력할 명령어, 분류 색, 닉네임, 봇의 응답(예시 데이터)
    var scenes = [
      { cmd: "/랭킹", color: "#E8590C", user: "민서", reply: "<b>🏆 전체 서버 돈 랭킹 TOP 10</b><br>🥇 @민서 <b>12,480,000 원</b><br>🥈 @준호 <b>9,310,000 원</b><br>🥉 @하린 <b>7,055,000 원</b>" },
      { cmd: "/음악추천 차트", color: "#7048E8", user: "준호", reply: "<pre>한국\n유튜브 뮤직 한국 차트 TOP 10\n1. NEON - A2O LITE\n2. 퇴사할게여 - 소연\n3. LOVE ATTACK - RESCENE\n멜론 차트 TOP 10\n1. NEON - A2O, A2O LITE\n2. 퇴사할게여 - 소연</pre>" },
      { cmd: "/급식", color: "#1971C2", user: "하린", reply: "<b>🍴 오늘의 중식</b><br>현미밥, 미역국, 불고기<br>콩나물무침, 배추김치, 사과" },
      { cmd: "/디데이 목록", color: "#2F9E44", user: "서윤", reply: "<b>⏳ D-day</b><br><code>D-45</code> 기말고사<br><code>D-72</code> 겨울방학" }
    ];

    var esc = function (s) { return s.replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
    var time = function () { return "오늘 오후 5:0" + Math.floor(Math.random() * 10); };

    function showPicker(text) {
      // 입력한 글자로 시작하는 명령어를 보여준다 (띄어쓰기 뒤에는 닫는다)
      if (!text || text.indexOf(" ") !== -1) { picker.hidden = true; return; }
      var matches = cmds.filter(function (c) { return c.n.indexOf(text) === 0; }).slice(0, 4);
      if (!matches.length) { picker.hidden = true; return; }
      list.innerHTML = matches.map(function (c) {
        return '<li><span class="n" style="color:' + c.c + '">' + esc(c.n) + '</span><span class="d">' + esc(c.d) + "</span></li>";
      }).join("");
      picker.hidden = false;
    }

    function addExchange(scene) {
      var pair = document.createElement("div");
      pair.style.display = "contents";
      pair.innerHTML =
        '<div class="msg"><div class="av">' + esc(scene.user.charAt(0)) + '</div><div class="who">' + esc(scene.user) + "<span>" + time() + '</span></div><div class="body"><span class="cmd-used">' + esc(scene.cmd) + "</span></div></div>" +
        '<div class="msg"><div class="av">/</div><div class="who">OMNI<span>' + time() + '</span></div><div class="body"><div class="reply" style="--c:' + scene.color + '">' + scene.reply + "</div></div></div>";
      feed.appendChild(pair);
      while (feed.children.length > 2) feed.removeChild(feed.firstChild); // 최근 한 번의 주고받음만 남긴다
    }

    if (!reduce) {
      // 애니메이션을 쓰는 경우에는 미리 넣어 둔 기본 장면(스크립트가 없을 때 보이는 화면)을 비우고 처음부터 보여준다
      while (feed.firstChild) feed.removeChild(feed.firstChild);
      var i = 0;
      var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
      (async function loop() {
        while (true) {
          var scene = scenes[i % scenes.length];
          i += 1;
          typed.textContent = "";
          for (var k = 1; k <= scene.cmd.length; k++) {
            typed.textContent = scene.cmd.slice(0, k);
            showPicker(typed.textContent);
            await wait(95);
          }
          await wait(550);
          picker.hidden = true;
          typed.textContent = "";
          addExchange(scene);
          await wait(4200);
        }
      })();
    }
  }

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
    };

    var select = function (cat) {
      active = cat;
      buttons.forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-cat") === cat ? "true" : "false"); });
      apply();
    };

    buttons.forEach(function (b) { b.addEventListener("click", function () { select(b.getAttribute("data-cat")); }); });
    q.addEventListener("input", apply);

    // 주소의 #분류 로 들어오면 그 분류만 보여준다. #cmd-이름 이면 전체를 보여주고 그 명령어로 이동한다
    var hash = decodeURIComponent(location.hash.replace("#", ""));
    if (hash && buttons.some(function (b) { return b.getAttribute("data-cat") === hash; })) select(hash);
  }
})();
