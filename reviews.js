/* Rotates the patient quotes in each .reviews block. Without JavaScript every quote stays visible. */
(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.querySelectorAll(".reviews").forEach(function (box) {
    var quotes = box.querySelectorAll(".rv-quote");
    if (quotes.length < 2) return;
    box.classList.add("rv-js");
    var dots = box.querySelector(".rv-dots");
    var i = 0, timer = null;
    quotes.forEach(function (q, n) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", "Show review " + (n + 1) + " of " + quotes.length);
      b.addEventListener("click", function () { show(n); restart(); });
      dots.appendChild(b);
    });
    function show(n) {
      i = (n + quotes.length) % quotes.length;
      quotes.forEach(function (q, k) { q.hidden = k !== i; });
      dots.querySelectorAll("button").forEach(function (b, k) { b.setAttribute("aria-current", k === i ? "true" : "false"); });
    }
    function restart() {
      if (reduce) return;
      clearInterval(timer);
      timer = setInterval(function () { show(i + 1); }, 7000);
    }
    box.addEventListener("mouseenter", function () { clearInterval(timer); });
    box.addEventListener("mouseleave", restart);
    box.addEventListener("focusin", function () { clearInterval(timer); });
    show(0);
    restart();
  });
})();
