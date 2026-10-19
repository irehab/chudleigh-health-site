"""Rebuild chatbot/knowledge.txt from the site's pages.

Run from the site root after changing any page:  python chatbot/build_knowledge.py
"""
import os
import re
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://www.chudleighhealth.com/"
PAGES = [
    "index.html", "osteopathy.html", "longevity.html", "about.html", "fees.html",
    "contact.html", "lower-back-pain.html", "neck-pain-headaches.html", "shoulder-pain.html",
    "elbow-pain.html", "hip-pain.html", "knee-pain.html", "pregnancy-mum-baby.html", "privacy.html",
]
BLOCK = {"p", "li", "h1", "h2", "h3", "h4", "tr", "div", "section", "article", "br", "dt", "dd"}
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}
SKIP = {"script", "style", "nav", "header", "svg", "noscript", "button"}


class PageText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title = ""
        self.parts = []
        self.stack = []  # (tag, hides_content) for each open element
        self.in_title = False
        self.in_body = False

    @property
    def hidden(self):
        return any(h for _, h in self.stack)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        classes = (a.get("class") or "").split()
        if tag == "title":
            self.in_title = True
        if tag in ("main", "footer"):
            self.in_body = True
        if tag in ("h1", "h2", "h3", "h4"):
            self.parts.append("\n" + "#" * int(tag[1]) + " ")
        elif tag in BLOCK:
            self.parts.append("\n")
        elif tag in ("td", "th"):
            self.parts.append(" | ")
        if "placeholder" in classes and not self.hidden:
            self.parts.append(" [not yet confirmed] ")
        if tag == "a" and self.in_body and not self.hidden:
            href = a.get("href") or ""
            if href.startswith(("http", "tel:", "mailto:")) and "wp-content" not in href:
                self.parts.append(f" ({href}) ")
        if tag in VOID:
            return
        hides = tag in SKIP or "placeholder" in classes or any(c in ("water", "hero-water") for c in classes)
        self.stack.append((tag, hides))

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                del self.stack[i:]
                break
        if tag in BLOCK:
            self.parts.append("\n")

    def handle_startendtag(self, tag, attrs):
        if tag == "br":
            self.parts.append("\n")

    def handle_data(self, data):
        if self.in_title:
            self.title += data
        elif self.in_body and not self.hidden:
            self.parts.append(data)

    def text(self):
        t = "".join(self.parts)
        t = re.sub(r"[ \t\r\f\v]+", " ", t)
        t = re.sub(r" *\n *", "\n", t)
        t = re.sub(r"\n{3,}", "\n\n", t)
        return t.strip()


def main():
    out = []
    with open(os.path.join(ROOT, "llms.txt"), encoding="utf-8") as f:
        out.append("=== Clinic summary ===\n" + f.read().split("## Pages")[0].strip())
    footer_seen = None
    for page in PAGES:
        p = PageText()
        with open(os.path.join(ROOT, page), encoding="utf-8") as f:
            p.feed(f.read())
        text = p.text()
        # The footer is the same on every page: keep it once.
        footer = text[text.rfind("© "):] if "© " in text else ""
        if footer and footer == footer_seen:
            text = text[: text.rfind("© ")].rstrip()
        footer_seen = footer or footer_seen
        url = SITE if page == "index.html" else SITE + page
        out.append(f"=== Page: {p.title.strip()} ({url}) ===\n{text}")
    with open(os.path.join(ROOT, "chatbot", "knowledge.txt"), "w", encoding="utf-8", newline="\n") as f:
        f.write("\n\n".join(out) + "\n")


if __name__ == "__main__":
    main()
