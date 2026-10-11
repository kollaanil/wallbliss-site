/* WallBliss admin — Google sign-in for the two team accounts.
   Uses Google Identity Services. Only emails listed in admin-config.js get in.
   Note: on a static site this check runs in the browser. It keeps the admin private from
   casual visitors; the real lock on the live website is the publishing key (publish.js). */
(function () {
  "use strict";
  var cfg = window.WB_ADMIN_CONFIG || {}, A = window.WBAdmin;
  if (!A || !cfg.googleClientId) return;                       // not set up yet: name picker stays
  var accts = document.getElementById("accts"), card = document.querySelector(".login-card");
  if (accts) accts.hidden = true;
  var box = document.createElement("div");
  box.style.cssText = "display:grid;gap:10px;justify-items:center";
  box.innerHTML = '<div id="g-btn" style="min-height:44px"></div><p id="g-msg" class="muted" style="font-size:.86rem;margin:0" hidden></p>';
  if (accts) accts.parentNode.insertBefore(box, accts); else if (card) card.appendChild(box);
  var intro = card && card.querySelector("p.muted");
  if (intro) intro.textContent = "For the WallBliss team. Sign in with your Google account.";

  function decode(jwt) {
    var p = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(decodeURIComponent(atob(p).split("").map(function (c) { return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2); }).join("")));
  }
  function onCred(res) {
    var msg = document.getElementById("g-msg");
    try {
      var info = decode(res.credential), email = String(info.email || "").toLowerCase(), name = (cfg.allowed || {})[email];
      if (!info.email_verified || !name) { msg.hidden = false; msg.textContent = "No access for " + email + ". Use the WallBliss team account."; return; }
      try { sessionStorage.setItem("wb_admin_email", email); } catch (e) {}
      A.enter(name);
    } catch (e) { msg.hidden = false; msg.textContent = "Sign-in failed. Please try again."; }
  }
  /* an earlier choice from the name picker does not count once Google sign-in is on */
  try { if (!sessionStorage.getItem("wb_admin_email")) { sessionStorage.removeItem("wb_admin_user"); document.getElementById("app").hidden = true; document.getElementById("login").hidden = false; } } catch (e) {}

  var s = document.createElement("script");
  s.src = "https://accounts.google.com/gsi/client"; s.async = true;
  s.onload = function () {
    google.accounts.id.initialize({ client_id: cfg.googleClientId, callback: onCred, auto_select: false, ux_mode: "popup" });
    google.accounts.id.renderButton(document.getElementById("g-btn"), { theme: "outline", size: "large", shape: "pill", text: "signin_with", width: 260 });
  };
  s.onerror = function () { var m = document.getElementById("g-msg"); m.hidden = false; m.textContent = "Couldn't reach Google. Check the internet connection."; };
  document.head.appendChild(s);
})();
