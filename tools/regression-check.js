// 실행: node tools/regression-check.js (빌드와 미리보기 HTTP 요청까지 확인)
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const { parseCookies, getSession, seal, SESSION_COOKIE } = require("../api/_lib");

const root = path.join(__dirname, "..");
async function main() {
  process.env.SESSION_SECRET = "regression-test-secret-not-for-production";
  const session = seal({ id: "123", name: "test" }, 60);
  const req = { headers: { cookie: `unrelated=%; ${SESSION_COOKIE}=${session}; label=hello%20world` } };
  assert.equal(getSession(req).id, "123");
  assert.equal(parseCookies(req).label, "hello world");
  assert.equal(getSession({ headers: { cookie: `${SESSION_COOKIE}=%` } }), null);

  // 비어 있는 포트를 골라 실제 미리보기 서버에 원본 경로를 요청한다.
  const probe = http.createServer();
  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");
  const port = probe.address().port;
  await new Promise((resolve) => probe.close(resolve));
  const sibling = fs.mkdtempSync(path.join(root, ".preview-check-"));
  fs.writeFileSync(path.join(sibling, "private.txt"), "must not be served");
  const child = spawn(process.execPath, ["tools/preview.js"], { cwd: root, env: { ...process.env, PORT: String(port) }, stdio: ["ignore", "pipe", "pipe"] });
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Preview startup timed out")), 120000);
      child.on("error", reject);
      child.on("exit", (code) => { clearTimeout(timer); reject(new Error(`Preview exited: ${code}`)); });
      child.stderr.on("data", (data) => process.stderr.write(data));
      child.stdout.on("data", (data) => {
        if (data.toString().includes("미리보기:")) { clearTimeout(timer); resolve(); }
      });
    });
    const request = (url) => new Promise((resolve, reject) => {
      http.get({ hostname: "127.0.0.1", port, path: url }, (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => { body += chunk; });
        res.on("end", () => resolve({ status: res.statusCode, body }));
      }).on("error", reject);
    });
    const command = await request(encodeURI("/commands/게임/송금"));
    assert.equal(command.status, 200);
    assert.ok(command.body.includes('/게임 송금 &lt;유저&gt; &lt;금액&gt;</code>'));
    for (const url of ["/%", "/%E0%A4%A", "/%00"]) assert.equal((await request(url)).status, 400);
    const folder = path.basename(sibling);
    for (const url of [`/../${folder}/private.txt`, `/%2e%2e/${folder}/private.txt`, `/%2e%2e%5c${folder}%5cprivate.txt`]) {
      assert.equal((await request(url)).status, 404);
    }
    assert.equal((await request("/robots.txt")).status, 200);
    assert.equal((await request("/sitemap.xml")).status, 200);
    assert.equal((await request("/")).status, 200);
    console.log("PASS: cookies, escaped arguments, malformed URLs, traversal rejection, SEO files, server survival");
  } finally {
    if (child.exitCode === null) {
      const exited = once(child, "exit");
      child.kill();
      await exited;
    }
    fs.rmSync(sibling, { recursive: true, force: true });
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
