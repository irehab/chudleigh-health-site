"""Build the Health Autonomy Journal and the Success Stories page from data files.

    python tools/build_journal.py

Reads data/journal.json and data/stories.json, and writes
health-autonomy/journal.html and stories.html. To add new scan results, add a
{"date": "YYYY-MM-DD", "value": number} point to a metric; to add an update or a
story, add an entry to the matching list. Only publish a story once the patient
has given written consent and approved the final wording.
"""
import html
import json
import os
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://www.chudleighhealth.com/"
BOOK = "https://book.squareup.com/appointments/z4iykwnki8iox0/location/LNR036HT1VD7Y/services"
esc = html.escape


def read(path):
    with open(os.path.join(ROOT, path), encoding="utf-8", newline="") as f:
        return f.read()


def write(path, text):
    with open(os.path.join(ROOT, path), "w", encoding="utf-8", newline="") as f:
        f.write(text)


def nice_date(iso):
    d = date.fromisoformat(iso if len(iso) > 7 else iso + "-01")
    return d.strftime("%-d %B %Y" if os.name != "nt" else "%#d %B %Y") if len(iso) > 7 else d.strftime("%B %Y")


def fmt(v):
    return f"{v:g}"


# ---------------------------------------------------------------- charts
def chart(points, better):
    """Small inline SVG line chart for two or more dated points."""
    w, h, pad = 280, 90, 10
    vals = [p["value"] for p in points]
    lo, hi = min(vals), max(vals)
    span = (hi - lo) or 1
    xs = [pad + i * (w - 2 * pad) / (len(points) - 1) for i in range(len(points))]
    ys = [h - pad - (v - lo) / span * (h - 2 * pad) for v in vals]
    path = " ".join(f"{'M' if i == 0 else 'L'}{x:.1f},{y:.1f}" for i, (x, y) in enumerate(zip(xs, ys)))
    dots = "".join(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="3.5"/>' for x, y in zip(xs, ys))
    label = ", ".join(f"{nice_date(p['date'])}: {fmt(p['value'])}" for p in points)
    return (f'<svg class="jchart" viewBox="0 0 {w} {h}" role="img" aria-label="{esc(label)}">'
            f'<path d="{path}"/>{dots}</svg>')


def metric_card(m):
    pts = [p for p in m.get("points", []) if p.get("value") is not None]
    unit = f' <small>{esc(m["unit"])}</small>' if m.get("unit") else ""
    head = f'<span class="tag">{esc(m["test"])}</span><h3>{esc(m["label"])}</h3>'
    note = f'<p class="jnote">{esc(m["note"])}</p>' if m.get("note") else ""
    if not pts:
        body = '<p class="jvalue jpending">Baseline booked</p><p class="jnote">Results will appear here after the first assessment.</p>'
        return f'<article class="jcard">{head}{body}</article>'
    latest = pts[-1]
    body = f'<p class="jvalue">{fmt(latest["value"])}{unit}</p><p class="jdate">{nice_date(latest["date"])}</p>'
    if len(pts) > 1:
        change = latest["value"] - pts[0]["value"]
        good = (change > 0) == (m.get("better") == "higher") if change else None
        cls = "up" if good else ("down" if good is False else "same")
        sign = "+" if change > 0 else ""
        body += f'<p class="jchange {cls}">{sign}{fmt(round(change, 2))}{(" " + esc(m["unit"])) if m.get("unit") else ""} since {nice_date(pts[0]["date"])}</p>'
        body += chart(pts, m.get("better"))
    return f'<article class="jcard">{head}{body}{note}</article>'


JOURNAL_CSS = """
  .jgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}
  .jcard{background:var(--card);border:1px solid var(--border);border-radius:18px;padding:22px}
  .jcard h3{font-size:22px;margin:4px 0 10px}
  .jvalue{font-family:var(--serif);font-size:34px;font-weight:700;color:var(--primary);margin:0;line-height:1.1}
  .jvalue small{font-family:var(--sans);font-size:14px;font-weight:400;color:var(--muted)}
  .jpending{font-size:22px;color:var(--secondary)}
  .jdate,.jnote{font-size:13.5px;color:var(--muted);margin:6px 0 0}
  .jchange{font-size:14px;font-weight:700;margin:8px 0 0}
  .jchange.up{color:var(--green)} .jchange.down{color:#b45309} .jchange.same{color:var(--muted)}
  .jchart{width:100%;height:auto;margin-top:12px}
  .jchart path{fill:none;stroke:var(--secondary);stroke-width:2.5;stroke-linejoin:round;stroke-linecap:round}
  .jchart circle{fill:var(--secondary)}
  .timeline{max-width:760px}
  .entry{border-left:3px solid var(--mint);padding:0 0 32px 24px;position:relative}
  .entry::before{content:"";position:absolute;left:-8px;top:6px;width:13px;height:13px;border-radius:50%;background:var(--secondary)}
  .entry h3{font-size:26px;margin:4px 0 10px}
  .entry p{margin:0 0 12px}
  .who{display:flex;gap:18px;align-items:center;background:var(--card);border:1px solid var(--border);border-radius:18px;padding:20px;max-width:760px}
  .who img{width:84px;height:84px;border-radius:50%;object-fit:cover;flex:none}
  .who p{margin:0;color:var(--muted);font-size:15px}
  .who strong{color:var(--primary);font-size:17px}
  .follow{display:flex;gap:18px;align-items:center;justify-content:space-between;flex-wrap:wrap;background:var(--card);border:1px solid var(--border);border-radius:18px;padding:20px;max-width:760px;margin:0 0 32px}
  .follow p{margin:0;color:var(--muted);font-size:15px;flex:1 1 320px}
  .follow strong{color:var(--primary);font-size:17px}
"""


def follow_box(f):
    """'Follow my training on Strava': shown only when journal.json has a real Strava profile link under "follow"."""
    link = (f or {}).get("strava", "")
    if not link.startswith("https://www.strava.com/athletes/"):
        return ""
    return (f'<div class="follow"><p><strong>{esc(f.get("heading", "Follow my progress"))}</strong><br>{esc(f.get("text", ""))}</p>'
            f'<a class="btn" href="{esc(link)}" target="_blank" rel="noopener">{esc(f.get("button", "See my activity on Strava"))}</a></div>')


def build_journal(j):
    tpl = read("health-autonomy/the-science.html")
    ld_end = tpl.index("</script>", tpl.index("application/ld+json")) + len("</script>")
    assets = tpl[ld_end:tpl.index("</head>")].replace("</style>", JOURNAL_CSS + "</style>", 1)
    site_header = tpl[tpl.index("<body>"):tpl.index('<header class="hero">')]
    site_header = site_header.replace('<a href="the-science.html" aria-current="page">The science</a>',
                                      '<a href="the-science.html">The science</a>')
    site_header = site_header.replace('<a href="journal.html">Journal</a>', '<a href="journal.html" aria-current="page">Journal</a>')
    footer = tpl[tpl.index("<footer>"):]

    p = j["person"]
    title = j["title"]
    desc = j["description"]
    url = SITE + "health-autonomy/journal.html"
    updated = max([u["date"] for u in j["updates"]] + [pt["date"] for m in j["metrics"] for pt in m.get("points", []) if pt.get("value") is not None])
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "Blog", "@id": url + "#blog", "name": title, "description": desc, "url": url, "inLanguage": "en-GB",
         "author": {"@type": "Person", "name": p["name"], "jobTitle": p["role"], "identifier": p["registration"]},
         "publisher": {"@id": SITE + "#clinic"}, "dateModified": updated,
         "blogPost": [{"@type": "BlogPosting", "headline": u["title"], "datePublished": u["date"],
                       "author": {"@type": "Person", "name": p["name"]}, "url": url + "#" + u["id"]} for u in j["updates"]]},
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Health Autonomy", "item": SITE + "health-autonomy/index.html"},
            {"@type": "ListItem", "position": 2, "name": "Journal", "item": url}]}]}

    head = f"""<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{esc(title)} | Health Autonomy</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{url}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="author" content="{esc(p['name'])}">
<meta name="theme-color" content="#4D4F4E">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Health Autonomy">
<meta property="og:locale" content="en_GB">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}health-autonomy/assets/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>{assets}</head>
"""
    cards = "\n".join(metric_card(m) for m in j["metrics"])
    entries = "\n".join(
        f'<article class="entry" id="{u["id"]}"><span class="tag">{nice_date(u["date"])}</span><h3>{esc(u["title"])}</h3>{u["body_html"]}</article>'
        for u in sorted(j["updates"], key=lambda u: u["date"], reverse=True))
    photo = f'<img src="{p["photo"]}" alt="{esc(p["name"])}">' if p.get("photo") else ""
    main = f"""
<header class="hero">
  <div class="ha-mark" aria-hidden="true" style="right:-50px;bottom:-80px;font-size:280px"><span class="ha-a">a</span>utonomy</div>
  <div class="wrap">
    <div class="eyebrow">Health Autonomy · The Journal</div>
    <h1>{j["headline_html"]}</h1>
    <p>{j["lede"]}</p>
    <nav class="jump"><a href="#numbers">The numbers</a><a href="#updates">Updates</a><a href="../stories.html">Patient stories</a></nav>
  </div>
</header>

<section>
  <div class="wrap">
    <div class="who">{photo}<p><strong>{esc(p["name"])}</strong><br>{esc(p["role"])}, {esc(p["registration"])}. {esc(p["bio"])}</p></div>
  </div>
</section>

<section class="alt" id="numbers">
  <div class="wrap">
    <div class="section-head">
      <div class="eyebrow">The numbers</div>
      <h2>Every result, every retest</h2>
      <p>{j["numbers_intro"]}</p>
    </div>
    <div class="jgrid">
{cards}
    </div>
    <p class="kit">{j["disclaimer"]}</p>
  </div>
</section>

<section id="updates">
  <div class="wrap">
    <div class="section-head">
      <div class="eyebrow">Updates</div>
      <h2>What I’m doing, and how it’s going</h2>
      <p>{j["updates_intro"]}</p>
    </div>
    {follow_box(j.get("follow"))}
    <div class="timeline">
{entries}
    </div>
  </div>
</section>

<section style="padding-top:0">
  <div class="wrap">
    <div class="cta">
      <h2>Find your own baseline</h2>
      <p>The same six tests, the same equipment, and a clear report on the day.</p>
      <div class="cta-btns"><a class="btn" href="index.html#packages">See the packages</a><a class="btn btn-line" href="the-science.html">See all six tests</a></div>
    </div>
  </div>
</section>

"""
    write("health-autonomy/journal.html", head + site_header + main + footer)


# ---------------------------------------------------------------- stories
def build_stories(st):
    tpl = read("fees.html")
    import re
    tpl = tpl.replace(re.search(r"<title>(.*?)</title>", tpl).group(1), esc(st["title"], quote=False))
    old_desc = re.search(r'<meta name="description" content="(.*?)">', tpl).group(1)
    tpl = tpl.replace(old_desc, esc(st["description"]))
    tpl = tpl.replace(SITE + "fees.html", SITE + "stories.html")
    tpl = tpl.replace('<a href="fees.html" aria-current="page">', '<a href="fees.html">')
    old_crumbs = re.search(r'<script type="application/ld\+json">(\{"@context": "https://schema.org", "@type": "BreadcrumbList".*?)</script>', tpl, re.S).group(1)
    tpl = tpl.replace(old_crumbs, json.dumps({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE},
        {"@type": "ListItem", "position": 2, "name": "Patient stories", "item": SITE + "stories.html"}]}, ensure_ascii=False))

    published = [s for s in st["stories"] if s.get("consent_on_file")]
    if published:
        cards = []
        for s in published:
            who = ", ".join(x for x in [s.get("name"), str(s["age"]) if s.get("age") else None, s.get("town")] if x)
            res = "".join(f"<li><strong>{esc(k)}</strong> {esc(v)}</li>" for k, v in s.get("results", []))
            res = f'<ul class="checks">{res}</ul>' if res else ""
            cards.append(f'  <h2>{esc(s["headline"])}</h2>\n  <p><em>{esc(who)} · {esc(s["service"])}</em></p>\n  <blockquote><p>“{esc(s["quote"])}”</p></blockquote>\n  {res}')
        stories_html = "\n".join(cards)
    else:
        stories_html = f"  <h2>Our first stories are on their way</h2>\n  <p>{st['empty_text']}</p>"

    mail = ("mailto:info@chudleighhealth.com?subject=" + "My%20story%20for%20Chudleigh%20Health%20Hub"
            + "&body=" + st["email_body"].replace("\n", "%0D%0A").replace(" ", "%20"))
    body = f"""
{stories_html}
  <h2>Share your story</h2>
  <p>{st["share_intro"]}</p>
  <ul class="checks">{"".join(f"<li>{x}</li>" for x in st["share_steps"])}</ul>
  <p><a class="btn" href="{mail}">Email us your story</a></p>
  <p>Prefer to leave a quick review? <a href="https://g.page/r/CVpV558Bn1AiEBM/review">Leave us a Google review</a>.</p>
  <p><small>{st["small_print"]}</small></p>"""
    aside = ('<h3>Follow John’s journey</h3><p>John is tracking his own Health Autonomy results, retest by retest.</p>'
             '<a class="btn" href="health-autonomy/journal.html">Read the journal</a>'
             f'<a class="btn ghost" href="{BOOK}">Book an appointment</a>')
    a, b = tpl.index("<main>") + len("<main>"), tpl.index("</main>")
    hero = f'''
<section class="page-hero"><div class="hero-water" aria-hidden="true">Health Autonomy</div>
  <div class="wrap"><div><p class="crumbs"><a href="index.html">Home</a></p><h1>Patient stories</h1><p class="lede">{st["lede"]}</p>
  <div class="actions"><a class="btn" href="{BOOK}">Book an appointment</a><a class="btn ghost" href="tel:07902065739">Call 07902 065739</a></div><a class="rv-badge" href="#rv-title"><span class="rv-stars" aria-hidden="true">★★★★★</span> 5.0 from 24 Google reviews</a></div></div></section>
<section><div class="wrap split"><div class="prose">
{body}
</div>
<aside class="aside">{aside}</aside>
</div></section>
'''
    write("stories.html", tpl[:a] + hero + tpl[b:])


if __name__ == "__main__":
    build_journal(json.loads(read("data/journal.json")))
    build_stories(json.loads(read("data/stories.json")))
    print("built health-autonomy/journal.html and stories.html")
