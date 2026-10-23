/* Chudleigh Health Hub mobile action bar.
   On phone-sized screens, keeps "Book online" and "Call" fixed to the bottom
   of the screen. The booking link is a normal Square link, so booking-click
   measurement in ads-consent.js still counts it. */
(function () {
  var BOOK_URL = "https://book.squareup.com/appointments/z4iykwnki8iox0/location/LNR036HT1VD7Y/services";
  var PHONE = "07902065739";
  if (document.getElementById("chh-mbar")) return;

  var css = [
    "#chh-mbar{display:none}",
    "@media (max-width:760px){",
    "#chh-mbar{display:flex;gap:8px;position:fixed;left:0;right:0;bottom:0;z-index:9990;padding:8px 12px calc(8px + env(safe-area-inset-bottom));background:var(--paper,#fff);border-top:1px solid var(--line,#D6DBD9);box-shadow:0 -4px 16px rgba(0,0,0,.12);font-family:var(--sans,'Lato',Arial,sans-serif)}",
    "#chh-mbar a{flex:1;display:flex;align-items:center;justify-content:center;min-height:48px;border-radius:999px;font-weight:700;font-size:16px;text-decoration:none}",
    "#chh-mbar .chh-mb-book{background:var(--accent,#3D7F88);color:#fff}",
    "#chh-mbar .chh-mb-call{border:2px solid var(--accent,#3D7F88);color:var(--ink,#2F3130)}",
    "body{padding-bottom:72px}",
    "#chh-chat .chh-launch{bottom:calc(76px + env(safe-area-inset-bottom))!important}",
    "#chh-consent{bottom:calc(76px + env(safe-area-inset-bottom))!important}",
    "}"
  ].join("");

  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  var bar = document.createElement("nav");
  bar.id = "chh-mbar";
  bar.setAttribute("aria-label", "Book or call");
  bar.innerHTML =
    "<a class=\"chh-mb-book\" href=\"" + BOOK_URL + "\">Book online</a>" +
    "<a class=\"chh-mb-call\" href=\"tel:" + PHONE + "\">Call us</a>";
  document.body.appendChild(bar);
})();
