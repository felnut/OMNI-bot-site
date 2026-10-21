const { SESSION_COOKIE, cookie } = require("../_lib");

module.exports = (req, res) => {
  res.setHeader("Set-Cookie", [cookie(SESSION_COOKIE, "", { maxAge: 0 }), cookie("omni_in", "", { maxAge: 0, httpOnly: false })]);
  res.setHeader("Cache-Control", "no-store");
  res.redirect(302, "/");
};
