/* Chudleigh Health Hub cookie choice and Google Ads booking measurement.
   Nothing from Google loads until the visitor clicks Accept.
   After that, a click on any Square booking link is counted as a
   "Book online click" conversion. Ad personalisation is switched off. */
(function () {
  var ADS_ID = "AW-18532430254";
  var SEND_TO = ADS_ID + "/EwSICLXm4qYdEK7j-YRF";
  var STORE_KEY = "chh-ads-consent";
  var loaded = false;

  function getChoice() {
    try { return localStorage.getItem(STORE_KEY); } catch (e) { return null; }
  }
  function setChoice(v) {
    try { localStorage.setItem(STORE_KEY, v); } catch (e) {}
  }

  function loadTag() {
    if (loaded) return;
    loaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", ADS_ID, { allow_ad_personalization_signals: false });
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + ADS_ID;
    document.head.appendChild(s);
  }

  document.addEventListener("click", function (e) {
    if (!loaded || !e.target.closest) return;
    if (e.target.closest('a[href*="book.squareup.com"]')) {
      window.gtag("event", "conversion", { send_to: SEND_TO, transport_type: "beacon" });
    }
  }, true);

  var css = [
    "#chh-consent{position:fixed;left:max(16px,env(safe-area-inset-left));bottom:max(16px,env(safe-area-inset-bottom));z-index:10000;width:420px;max-width:calc(100vw - 32px);padding:16px 18px;background:var(--paper,#fff);color:var(--ink,#2F3130);border:1px solid var(--line,#D6DBD9);border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.25);font-family:var(--sans,'Lato',Arial,sans-serif);font-size:15px;line-height:1.45}",
    "#chh-consent p{margin:0 0 12px}",
    "#chh-consent a{color:var(--accent-ink,#336E76);font-weight:600}",
    "#chh-consent .chh-c-row{display:flex;gap:8px}",
    "#chh-consent button{flex:1;padding:10px 12px;border-radius:999px;border:2px solid var(--accent,#3D7F88);font:inherit;font-weight:600;cursor:pointer;background:transparent;color:var(--ink,#2F3130)}",
    "#chh-consent button.chh-c-yes{background:var(--accent,#3D7F88);color:#fff}",
    "#chh-consent :focus-visible{outline:3px solid var(--accent-ink,#336E76);outline-offset:2px}"
  ].join("");

  function showBanner() {
    if (document.getElementById("chh-consent")) return;
    if (!document.getElementById("chh-consent-css")) {
      var st = document.createElement("style");
      st.id = "chh-consent-css";
      st.textContent = css;
      document.head.appendChild(st);
    }
    var box = document.createElement("div");
    box.id = "chh-consent";
    box.setAttribute("role", "region");
    box.setAttribute("aria-label", "Cookie choice");
    box.innerHTML =
      "<p>May we use a Google Ads cookie to see when someone books after clicking one of our adverts? " +
      "It isn't used to show you personalised ads. <a href=\"/privacy.html\">Privacy policy</a></p>" +
      "<div class=\"chh-c-row\"><button type=\"button\" class=\"chh-c-no\">Reject</button>" +
      "<button type=\"button\" class=\"chh-c-yes\">Accept</button></div>";
    box.querySelector(".chh-c-yes").addEventListener("click", function () {
      setChoice("yes");
      box.remove();
      loadTag();
    });
    box.querySelector(".chh-c-no").addEventListener("click", function () {
      setChoice("no");
      box.remove();
    });
    document.body.appendChild(box);
  }

  window.chhCookieSettings = function () {
    try { localStorage.removeItem(STORE_KEY); } catch (e) {}
    showBanner();
  };

  var choice = getChoice();
  if (choice === "yes") loadTag();
  else if (choice !== "no") showBanner();
})();
