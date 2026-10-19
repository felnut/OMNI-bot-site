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
for (const f of fs.readdirSync(path.join(ROOT, "_data"))) {
  site.data[path.basename(f, path.extname(f))] = JSON.parse(fs.readFileSync(path.join(ROOT, "_data", f), "utf8"));
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
    if (kv) data[kv[1]] = kv[2];
  }
  return { data, body: m[2] };
}

const layouts = {};
for (const f of fs.readdirSync(path.join(ROOT, "_layouts"))) layouts[path.basename(f, ".html")] = fs.readFileSync(path.join(ROOT, "_layouts", f), "utf8");

async function build() {
  fs.rmSync(OUT, { recursive: true, force: true });
  const target = path.join(OUT, baseurl.replace(/^\//, ""));
  fs.mkdirSync(target, { recursive: true });
  fs.cpSync(path.join(ROOT, "assets"), path.join(target, "assets"), { recursive: true });

  const pages = fs.readdirSync(ROOT).filter((f) => /\.(md|html)$/.test(f) && !EXCLUDE.has(f));
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
      res.writeHead(200, { "content-type": types[path.extname(hit)] ?? "application/octet-stream" });
      fs.createReadStream(hit).pipe(res);
    })
    .listen(PORT, "127.0.0.1", () => console.log(`\n미리보기: http://127.0.0.1:${PORT}${baseurl}/  (끄려면 Ctrl+C)`));
}

build()
  .then(() => (buildOnly ? undefined : serve()))
  .catch((e) => {
    console.error("❌ 렌더링 오류:", e.message);
    process.exit(1);
  });
