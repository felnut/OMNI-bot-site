// 디스코드 로그인 마무리: 코드를 사용자 정보로 바꾸고 세션 쿠키를 만든다 (액세스 토큰은 저장하지 않는다)
const { SESSION_COOKIE, STATE_COOKIE, SESSION_DAYS, seal, unseal, parseCookies, cookie, redirectUri } = require("../_lib");

const fail = (res, why) => res.redirect(302, `/me?error=${why}`);

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const { code, state, error } = req.query;
  if (error) return fail(res, "denied");
  const saved = unseal(parseCookies(req)[STATE_COOKIE]);
  if (!code || !state || !saved || saved.state !== state) return fail(res, "state");

  try {
    const token = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code: String(code),
        redirect_uri: redirectUri(req),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!token.ok) return fail(res, "token");
    const { access_token } = await token.json();

    const me = await fetch("https://discord.com/api/users/@me", { headers: { Authorization: `Bearer ${access_token}` }, signal: AbortSignal.timeout(8000) });
    if (!me.ok) return fail(res, "user");
    const u = await me.json();

    const age = SESSION_DAYS * 86400;
    res.setHeader("Set-Cookie", [
      cookie(SESSION_COOKIE, seal({ id: u.id, name: u.global_name || u.username, avatar: u.avatar || null }, age), { maxAge: age }),
      cookie("omni_in", "1", { maxAge: age, httpOnly: false }), // 화면에서 로그인 여부만 알리는 표시 (정보 없음)
      cookie(STATE_COOKIE, "", { maxAge: 0 }),
    ]);
    res.redirect(302, "/me");
  } catch {
    fail(res, "server");
  }
};
