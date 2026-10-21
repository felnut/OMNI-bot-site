// 사이트 미리보기: Ruby/Jekyll이 없어도 Liquid·Markdown으로 같은 구조를 렌더링해서 브라우저로 볼 수 있다.
//   npm install          (처음 한 번)
//   npm run preview      → http://127.0.0.1:4173/<baseurl>/
//   npm run build:check  → 렌더링만 하고 오류가 있는지 확인
// 실제 게시(GitHub Pages)는 Jekyll(kramdown)이 만들므로 표나 중첩 목록 같은 마크다운 세부 표현은 조금 다를 수 있다.
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { Liquid } = require("liquidjs");
const { marked } = require("marked");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, ".preview");
const PORT = Number(process.env.PORT || 4173);
const buildOnly = process.argv.includes("--build-only");

const config = fs.readFileSync(path.join(ROOT, "_config.yml"), "utf8");
const cfg = (key, fallback = "") => (config.match(new RegExp(`^${key}:\\s*(.*)$`, "m"))?.[1] ?? fallback).trim().replace(/^["']|["']$/g, "");
const baseurl = cfg("baseurl");
const siteUrl = cfg("url", "http://localhost");
const EXCLUDE = new Set(["README.md", "package.json", "package-lock.json", "node_modules", "tools", ".preview", ".gitignore", ".git"]);

const site = { title: cfg("title"), description: cfg("description"), url: siteUrl, baseurl, data: {} };
function loadData() {
  for (const f of fs.readdirSync(path.join(ROOT, "_data"))) {
    site.data[path.basename(f, path.extname(f))] = JSON.parse(fs.readFileSync(path.join(ROOT, "_data", f), "utf8"));
  }
}

const engine = new Liquid({ partials: [path.join(ROOT, "_includes")], jekyllInclude: true, extname: ".html", strictFilters: true });
engine.registerFilter("relative_url", (p) => (/^https?:/.test(p) ? p : baseurl + (p.startsWith("/") ? p : "/" + p)));
engine.registerFilter("absolute_url", (p) => siteUrl + baseurl + (p.startsWith("/") ? p : "/" + p));
engine.registerFilter("jsonify", (v) => JSON.stringify(v));

function frontMatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: src };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (kv) data[kv[1]] = /^"(?:[^"\\]|\\.)*"$/.test(kv[2]) ? JSON.parse(kv[2]) : kv[2];
  }
  return { data, body: m[2] };
}

const layouts = {};
function loadLayouts() {
  for (const f of fs.readdirSync(path.join(ROOT, "_layouts"))) layouts[path.basename(f, ".html")] = fs.readFileSync(path.join(ROOT, "_layouts", f), "utf8");
}

// 명령어마다 상세 페이지(commands/<이름>.html)를, 하위 명령어가 여러 개면 하위 명령어마다 commands/<이름>/<하위>.html도 만든다.
// 내용은 _includes/command-page.html이 데이터에서 채우고, 이 파일들은 Jekyll(GitHub Pages)에서도 그대로 쓰도록 저장소에 함께 커밋한다.
// 명령어를 추가·삭제하면 자동으로 맞춰진다.
const slug = (sub) => sub.replace(/ /g, "-");
function generateCommandPages() {
  const dir = path.join(ROOT, "commands");
  fs.mkdirSync(dir, { recursive: true });
  const want = new Map();
  const stub = (title, permalink, desc, sub, name) => `---
layout: wide
title: ${JSON.stringify(title)}
permalink: ${permalink}
description: ${JSON.stringify(desc)}
body_class: command-page
---
{% include command-page.html name="${name}"${sub ? ` sub="${sub}"` : ""} %}
`;
  for (const c of site.data.commands.categories) {
    for (const m of c.commands) {
      const clean = (t) => t.replace("[서버 운영자 전용] ", "").replace("(없으면 기본 차트)", "").split(" (")[0];
      want.set(`${m.name}.html`, stub("/" + m.name, `/commands/${m.name}`, clean(m.description), "", m.name));
      if (m.usages.length > 1) {
        for (const u of m.usages) want.set(`${m.name}/${slug(u.sub)}.html`, stub(`/${m.name} ${u.sub}`, `/commands/${m.name}/${slug(u.sub)}`, clean(u.description), u.sub, m.name));
      }
    }
  }
  const have = (d, rel = "") => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? have(path.join(d, e.name), rel + e.name + "/") : e.name.endsWith(".html") ? [rel + e.name] : []));
  for (const f of have(dir)) if (!want.has(f)) fs.rmSync(path.join(dir, f));
  for (const [f, text] of want) {
    const file = path.join(dir, f);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (!fs.existsSync(file) || fs.readFileSync(file, "utf8").replaceAll("\r\n", "\n") !== text) fs.writeFileSync(file, text);
  }
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) if (e.isDirectory() && !fs.readdirSync(path.join(dir, e.name)).length) fs.rmdirSync(path.join(dir, e.name));
}

async function build() {
  loadData();
  loadLayouts();
  generateCommandPages();
  fs.rmSync(OUT, { recursive: true, force: true });
  const target = path.join(OUT, baseurl.replace(/^\//, ""));
  fs.mkdirSync(target, { recursive: true });
  fs.cpSync(path.join(ROOT, "assets"), path.join(target, "assets"), { recursive: true });

  const pages = fs
    .readdirSync(ROOT)
    .filter((f) => /\.(md|html)$/.test(f) && !EXCLUDE.has(f))
    .concat(fs.readdirSync(path.join(ROOT, "commands"), { recursive: true }).filter((f) => f.endsWith(".html")).map((f) => "commands/" + f.split(path.sep).join("/")));
  const report = [];
  for (const f of pages) {
    const fm = frontMatter(fs.readFileSync(path.join(ROOT, f), "utf8"));
    const name = path.basename(f, path.extname(f));
    const url = fm.data.permalink ?? (name === "index" ? "/" : `/${name}.html`);
    let body = await engine.parseAndRender(fm.body, { site, page: { ...fm.data, url } });
    let title = fm.data.title;
    if (f.endsWith(".md")) {
      title ||= (fm.body.match(/^#\s+(.+)$/m) ?? [])[1]; // 첫 제목을 쪽 제목으로
      body = marked.parse(body, { gfm: true });
    }
    const html = await engine.parseAndRender(layouts[fm.data.layout ?? "default"], { site, page: { ...fm.data, title, url }, content: body });
    const outFile = path.join(target, url === "/" ? "index.html" : url.replace(/^\//, "").replace(/\.html$/, "") + ".html");
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, html);
    report.push(`  ${(baseurl + url).padEnd(36)} ${title ?? ""}`);
  }
  console.log(`✅ ${pages.length}개 페이지를 렌더링했어요\n${report.join("\n")}`);
}

const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".json": "application/json; charset=utf-8" };
function serve() {
  http
    .createServer((req, res) => {
      const file = path.join(OUT, decodeURIComponent(req.url.split("?")[0]));
      // 확장자 없는 주소(/terms)는 .html 파일로 연결한다 (GitHub Pages와 같은 동작)
      const hit = [file, file + ".html", path.join(file, "index.html")].find((f) => f.startsWith(OUT) && fs.existsSync(f) && fs.statSync(f).isFile());
      if (!hit) {
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        return res.end("404");
      }
      res.writeHead(200, { "content-type": types[path.extname(hit)] ?? "application/octet-stream", "cache-control": "no-store" });
      fs.createReadStream(hit).pipe(res);
    })
    .listen(PORT, "127.0.0.1", () => console.log(`\n미리보기: http://127.0.0.1:${PORT}${baseurl}/  (끄려면 Ctrl+C)`));
  watch();
}

// 파일을 고치면 자동으로 다시 렌더링한다 (새로고침만 하면 최신 모습이 보인다)
function watch() {
  let timer;
  const rebuild = () => {
    clearTimeout(timer);
    timer = setTimeout(() => build().catch((e) => console.error("❌ 렌더링 오류:", e.message)), 150);
  };
  for (const dir of ["", "_includes", "_layouts", "_data", "assets"]) {
    fs.watch(path.join(ROOT, dir), { recursive: dir === "assets" }, (_, name) => {
      if (dir === "" && !/\.(md|html)$|^_config\.yml$/.test(name ?? "")) return;
      rebuild();
    });
  }
}

build()
  .then(() => (buildOnly ? undefined : serve()))
  .catch((e) => {
    console.error("❌ 렌더링 오류:", e.message);
    process.exit(1);
  });
