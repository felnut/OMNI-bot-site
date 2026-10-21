// 디스코드 로그인 시작: state를 쿠키에 담고 디스코드 승인 화면으로 보낸다
const crypto = require("node:crypto");
const { STATE_COOKIE, seal, cookie, redirectUri } = require("../_lib");

module.exports = (req, res) => {
  if (!process.env.DISCORD_CLIENT_ID) return res.status(503).send("로그인이 아직 준비되지 않았어요");
  const state = crypto.randomBytes(16).toString("base64url");
  const url = new URL("https://discord.com/oauth2/authorize");
  url.search = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    response_type: "code",
    scope: "identify",
    redirect_uri: redirectUri(req),
    state,
    prompt: "none",
  });
  res.setHeader("Set-Cookie", cookie(STATE_COOKIE, seal({ state }, 600), { maxAge: 600 }));
  res.setHeader("Cache-Control", "no-store");
  res.redirect(302, url.toString());
};
