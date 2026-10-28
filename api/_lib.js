// 디스코드 로그인용 공용 도구: 서명된 쿠키 세션과 주소 계산
const crypto = require("node:crypto");

const SESSION_COOKIE = "omni_session";
const STATE_COOKIE = "omni_state";
const SESSION_DAYS = 7;

const secret = () => {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET (32자 이상)이 필요해요");
  return s;
};
const b64 = (buf) => Buffer.from(buf).toString("base64url");
const sign = (payload) => crypto.createHmac("sha256", secret()).update(payload).digest("base64url");

function seal(data, maxAgeSec) {
  const payload = b64(JSON.stringify({ ...data, exp: Math.floor(Date.now() / 1000) + maxAgeSec }));
  return `${payload}.${sign(payload)}`;
}

function unseal(token) {
  if (typeof token !== "string") return null;
  const [payload, mac] = token.split(".");
  if (!payload || !mac) return null;
  const want = Buffer.from(sign(payload));
  const got = Buffer.from(mac);
  if (want.length !== got.length || !crypto.timingSafeEqual(want, got)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return data.exp > Date.now() / 1000 ? data : null;
  } catch {
    return null;
  }
}

function parseCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || "").split(";")) {
    const i = part.indexOf("=");
    if (i <= 0) continue;
    try {
      out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
    } catch {
      // 잘못 인코딩된 쿠키는 무시하고 나머지 세션 쿠키를 읽는다.
    }
  }
  return out;
}

const cookie = (name, value, { maxAge, httpOnly = true } = {}) =>
  `${name}=${encodeURIComponent(value)}; Path=/; SameSite=Lax; Secure${httpOnly ? "; HttpOnly" : ""}${maxAge === undefined ? "" : `; Max-Age=${maxAge}`}`;

function getSession(req) {
  return unseal(parseCookies(req)[SESSION_COOKIE]);
}

const origin = (req) => (process.env.SITE_URL || `https://${req.headers["x-forwarded-host"] || req.headers.host}`).replace(/\/$/, "");
const redirectUri = (req) => `${origin(req)}/api/auth/callback`;

module.exports = { SESSION_COOKIE, STATE_COOKIE, SESSION_DAYS, seal, unseal, parseCookies, cookie, getSession, origin, redirectUri };
