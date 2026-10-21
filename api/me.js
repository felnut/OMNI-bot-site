// 로그인한 사용자의 정보. 금액은 봇이 연 읽기 전용 API에서 가져온다 (BOT_API_URL, BOT_API_TOKEN)
const { getSession } = require("./_lib");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const s = getSession(req);
  if (!s) return res.status(401).json({ error: "login_required" });

  const avatar = s.avatar
    ? `https://cdn.discordapp.com/avatars/${s.id}/${s.avatar}.png?size=128`
    : `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(s.id) >> 22n) % 6n)}.png`;
  const out = { id: s.id, name: s.name, avatar, money: null, streak: null, stats: "unavailable" };

  if (process.env.BOT_API_URL && process.env.BOT_API_TOKEN) {
    try {
      const r = await fetch(`${process.env.BOT_API_URL.replace(/\/$/, "")}/user/${s.id}`, {
        headers: { Authorization: `Bearer ${process.env.BOT_API_TOKEN}` },
        signal: AbortSignal.timeout(3000),
      });
      if (r.status === 404) out.stats = "none"; // 아직 봇을 쓴 적 없음
      else if (r.ok) Object.assign(out, await r.json(), { stats: "ok" });
    } catch {
      /* 봇이 꺼져 있으면 금액만 비워 둔다 */
    }
  }
  res.status(200).json(out);
};
