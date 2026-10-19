/* Chudleigh Health Hub chat assistant.
   Set CHAT_ENDPOINT to the Cloudflare Worker address to switch the chat on.
   While it is empty, nothing is shown on the site. */
(function () {
  var CHAT_ENDPOINT = "https://chudleigh-chat.atriumclinicswindon.workers.dev";
  var BOOK_URL = "https://book.squareup.com/appointments/z4iykwnki8iox0/location/LNR036HT1VD7Y/services";
  var STORE_KEY = "chh-chat-v1";
  var MAX_SENT = 19;

  var endpoint = window.CHH_CHAT_ENDPOINT || CHAT_ENDPOINT;
  if (!endpoint || document.getElementById("chh-chat")) return;

  var css = [
    "#chh-chat{--c-accent:var(--accent,#3D7F88);--c-paper:var(--paper,#fff);--c-ink:var(--ink,#2F3130);--c-muted:var(--muted,#5E615F);--c-mist:var(--mist,#EEF0EF);--c-line:var(--line,#D6DBD9);--c-link:var(--teal-ink,#3D7F88);font-family:var(--sans,'Source Sans 3','Segoe UI',Helvetica,Arial,sans-serif);font-size:16px;line-height:1.45}",
    "#chh-chat *{box-sizing:border-box}",
    "#chh-chat .chh-launch{position:fixed;right:max(16px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));z-index:9998;display:flex;align-items:center;gap:8px;padding:12px 18px;border:0;border-radius:999px;background:var(--c-accent);color:#fff;font:inherit;font-weight:600;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.25)}",
    "#chh-chat .chh-launch svg{width:22px;height:22px;flex:none}",
    "#chh-chat .chh-panel{position:fixed;right:max(16px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));z-index:9999;width:380px;max-width:calc(100vw - 32px);height:min(600px,calc(100vh - 32px));display:flex;flex-direction:column;background:var(--c-paper);color:var(--c-ink);border:1px solid var(--c-line);border-radius:18px;box-shadow:0 12px 40px rgba(0,0,0,.3);overflow:hidden}",
    "#chh-chat .chh-panel[hidden],#chh-chat .chh-launch[hidden]{display:none}",
    "#chh-chat .chh-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:14px 16px;border-bottom:1px solid var(--c-line)}",
    "#chh-chat .chh-title{font-family:var(--serif,Georgia,serif);font-size:1.3rem;font-weight:600;margin:0}",
    "#chh-chat .chh-close{border:0;background:transparent;color:var(--c-ink);font-size:28px;line-height:1;width:40px;height:40px;cursor:pointer;border-radius:8px}",
    "#chh-chat .chh-log{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px}",
    "#chh-chat .chh-note{font-size:.85rem;color:var(--c-muted);background:var(--c-mist);border-radius:12px;padding:10px 12px}",
    "#chh-chat .chh-msg{max-width:88%;padding:10px 14px;border-radius:16px;white-space:pre-wrap;overflow-wrap:anywhere}",
    "#chh-chat .chh-bot{align-self:flex-start;background:var(--c-mist);border-bottom-left-radius:4px}",
    "#chh-chat .chh-user{align-self:flex-end;background:var(--c-accent);color:#fff;border-bottom-right-radius:4px}",
    "#chh-chat .chh-bot a{color:var(--c-link);font-weight:600}",
    "#chh-chat .chh-typing{align-self:flex-start;color:var(--c-muted);font-size:.9rem;padding:4px 6px}",
    "#chh-chat .chh-chips{display:flex;flex-wrap:wrap;gap:8px}",
    "#chh-chat .chh-chip{border:1px solid var(--c-line);background:transparent;color:var(--c-ink);border-radius:999px;padding:6px 12px;font:inherit;font-size:.9rem;cursor:pointer}",
    "#chh-chat .chh-form{display:flex;gap:8px;padding:12px;border-top:1px solid var(--c-line)}",
    "#chh-chat .chh-input{flex:1;min-width:0;resize:none;border:1px solid var(--c-line);border-radius:12px;padding:10px 12px;font:inherit;font-size:16px;background:var(--c-paper);color:var(--c-ink);max-height:120px}",
    "#chh-chat .chh-send{border:0;border-radius:12px;padding:0 16px;background:var(--c-accent);color:#fff;font:inherit;font-weight:600;cursor:pointer}",
    "#chh-chat .chh-send:disabled{opacity:.5;cursor:default}",
    "#chh-chat .chh-foot{display:flex;gap:8px;padding:0 12px 12px}",
    "#chh-chat .chh-foot a{flex:1;text-align:center;text-decoration:none;font-weight:600;font-size:.9rem;padding:8px;border-radius:999px;border:2px solid var(--c-accent);color:var(--c-ink)}",
    "#chh-chat .chh-foot a.chh-book{background:var(--c-accent);color:#fff}",
    "#chh-chat :focus-visible{outline:3px solid var(--c-link);outline-offset:2px}",
    "@media (max-width:520px){#chh-chat .chh-panel{right:0;bottom:0;width:100vw;max-width:none;height:100%;height:100dvh;border-radius:0;border:0}#chh-chat .chh-launch span{display:none}#chh-chat .chh-launch{padding:14px}}"
  ].join("");

  var greeting = "Hello! I can answer questions about Chudleigh Health Hub, our treatments, fees and team, and help you book. What can I help with?";
  var notice = "I'm an AI assistant, so I can make mistakes and can't give medical advice. In an emergency call 999. Please don't share personal or medical details here.";
  var chips = ["What do you treat?", "How much is a first appointment?", "Help me book an appointment"];

  var history = [];
  try { history = JSON.parse(sessionStorage.getItem(STORE_KEY)) || []; } catch (e) { history = []; }
  function save() { try { sessionStorage.setItem(STORE_KEY, JSON.stringify(history)); } catch (e) {} }

  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  var root = document.createElement("div");
  root.id = "chh-chat";
  root.innerHTML =
    '<button type="button" class="chh-launch" aria-expanded="false" aria-controls="chh-panel">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>' +
      '<span>Ask us</span></button>' +
    '<section class="chh-panel" id="chh-panel" role="dialog" aria-label="Chat with Chudleigh Health Hub" hidden>' +
      '<div class="chh-head"><p class="chh-title">Ask Chudleigh Health Hub</p>' +
        '<button type="button" class="chh-close" aria-label="Close chat">&times;</button></div>' +
      '<div class="chh-log" aria-live="polite"></div>' +
      '<form class="chh-form"><label class="chh-sr" for="chh-input" style="position:absolute;left:-9999px">Your message</label>' +
        '<textarea class="chh-input" id="chh-input" rows="1" maxlength="1500" placeholder="Type your question…"></textarea>' +
        '<button type="submit" class="chh-send">Send</button></form>' +
      '<div class="chh-foot"><a class="chh-book" href="' + BOOK_URL + '" target="_blank" rel="noopener">Book online</a>' +
        '<a href="tel:07902065739">Call us</a></div>' +
    '</section>';
  document.body.appendChild(root);

  var launch = root.querySelector(".chh-launch");
  var panel = root.querySelector(".chh-panel");
  var log = root.querySelector(".chh-log");
  var form = root.querySelector(".chh-form");
  var input = root.querySelector(".chh-input");
  var send = root.querySelector(".chh-send");
  var busy = false;

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // Escape everything, then turn web addresses, emails and phone numbers into links.
  function linkify(text) {
    var html = escapeHtml(text);
    html = html.replace(/https?:\/\/[^\s<)]+[^\s<).,;:!?]/g, function (url) {
      var label = url.indexOf("book.squareup.com") !== -1 ? "our booking page"
        : url.indexOf("google.com/maps") !== -1 ? "Google Maps"
        : url.length > 45 ? url.replace(/^https?:\/\/(www\.)?/, "").slice(0, 40) + "…" : url;
      return '<a href="' + url + '" target="_blank" rel="noopener">' + label + "</a>";
    });
    html = html.replace(/(^|[\s(])([\w.+-]+@[\w-]+\.[\w.-]*\w)/g, '$1<a href="mailto:$2">$2</a>');
    html = html.replace(/(^|[\s(])(0\d{4} ?\d{6}|0\d{3} ?\d{3} ?\d{4}|999|111)(?=[\s).,;:!?]|$)/g, function (m, pre, num) {
      return pre + '<a href="tel:' + num.replace(/\s/g, "") + '">' + num + "</a>";
    });
    return html;
  }

  function addMessage(role, text) {
    var el = document.createElement("div");
    el.className = "chh-msg " + (role === "user" ? "chh-user" : "chh-bot");
    if (role === "user") el.textContent = text; else el.innerHTML = linkify(text);
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
  }

  function render() {
    log.innerHTML = "";
    var n = document.createElement("div");
    n.className = "chh-note";
    n.textContent = notice;
    log.appendChild(n);
    addMessage("assistant", greeting);
    history.forEach(function (m) { addMessage(m.role, m.content); });
    if (!history.length) {
      var wrap = document.createElement("div");
      wrap.className = "chh-chips";
      chips.forEach(function (c) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "chh-chip";
        b.textContent = c;
        b.addEventListener("click", function () { ask(c); });
        wrap.appendChild(b);
      });
      log.appendChild(wrap);
    }
  }

  function toSend() {
    var msgs = history.slice(-MAX_SENT);
    while (msgs.length && msgs[0].role !== "user") msgs.shift();
    return msgs;
  }

  function ask(text) {
    text = text.trim();
    if (!text || busy) return;
    busy = true;
    send.disabled = true;
    var chipRow = log.querySelector(".chh-chips");
    if (chipRow) chipRow.remove();
    history.push({ role: "user", content: text });
    save();
    addMessage("user", text);
    input.value = "";
    var typing = document.createElement("div");
    typing.className = "chh-typing";
    typing.textContent = "Typing…";
    log.appendChild(typing);
    log.scrollTop = log.scrollHeight;

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: toSend() })
    })
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (data) {
        var reply = data && data.reply;
        if (reply) {
          history.push({ role: "assistant", content: reply });
        } else {
          history.pop(); // keep the conversation valid for the next try
          reply = "Sorry, something went wrong. Please try again, or call us on 07902 065739.";
        }
        save();
        typing.remove();
        addMessage("assistant", reply);
      })
      .catch(function () {
        history.pop();
        save();
        typing.remove();
        addMessage("assistant", "Sorry, I couldn't connect. Please check your internet connection, or call us on 07902 065739.");
      })
      .then(function () {
        busy = false;
        send.disabled = false;
        input.focus();
      });
  }

  function open() {
    panel.hidden = false;
    launch.hidden = true;
    launch.setAttribute("aria-expanded", "true");
    render();
    input.focus();
  }

  function close() {
    panel.hidden = true;
    launch.hidden = false;
    launch.setAttribute("aria-expanded", "false");
    launch.focus();
  }

  launch.addEventListener("click", open);
  root.querySelector(".chh-close").addEventListener("click", close);
  panel.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  form.addEventListener("submit", function (e) { e.preventDefault(); ask(input.value); });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input.value); }
  });
})();
