from __future__ import annotations

import base64
import mimetypes
import re
from pathlib import Path

import streamlit as st
from streamlit.components.v1 import html as render_html


ROOT = Path(__file__).parent

PAGES = {
    "portfolio": {
        "label": "Portfolio",
        "file": "portfolio.html",
        "height": 7600,
    },
    "cv": {
        "label": "CV",
        "file": "cv.html",
        "height": 1850,
    },
    "rainfall": {
        "label": "Rainfall Case Study",
        "file": "project-rainfall.html",
        "height": 1600,
    },
    "delivery": {
        "label": "Delivery Case Study",
        "file": "project-delivery.html",
        "height": 1650,
    },
    "purchase": {
        "label": "Purchase Case Study",
        "file": "project-purchase.html",
        "height": 1550,
    },
    "silence": {
        "label": "Silence Case Study",
        "file": "project-silence.html",
        "height": 1650,
    },
    "traffic": {
        "label": "Traffic Case Study",
        "file": "project-traffic.html",
        "height": 1650,
    },
}

LOCAL_PAGE_LINKS = {
    "portfolio.html": "portfolio",
    "cv.html": "cv",
    "project-rainfall.html": "rainfall",
    "project-delivery.html": "delivery",
    "project-purchase.html": "purchase",
    "project-silence.html": "silence",
    "project-traffic.html": "traffic",
}


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def data_uri(path: Path) -> str:
    mime_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


def inline_local_styles(markup: str) -> str:
    pattern = re.compile(
        r'<link\s+rel=["\']stylesheet["\']\s+href=["\']\.\/([^"\']+\.css)["\']\s*/?>',
        re.IGNORECASE,
    )

    def replace(match: re.Match[str]) -> str:
        css_path = ROOT / match.group(1)
        if not css_path.exists():
            return match.group(0)
        return f"<style>\n{read_text(css_path)}\n</style>"

    return pattern.sub(replace, markup)


def inline_local_scripts(markup: str) -> str:
    pattern = re.compile(
        r'<script\s+src=["\']\.\/([^"\']+\.js)["\']\s*>\s*</script>',
        re.IGNORECASE,
    )

    def replace(match: re.Match[str]) -> str:
        script_path = ROOT / match.group(1)
        if not script_path.exists():
            return match.group(0)
        script_text = read_text(script_path)
        if match.group(1) == "portfolio.js":
            script_text = script_text.replace(
                "var shouldSkipLoader = hasSkipIntroQuery() ||",
                "var shouldSkipLoader = window.__STREAMLIT_PORTFOLIO__ || hasSkipIntroQuery() ||",
            )
        return f"<script>\n{script_text}\n</script>"

    return pattern.sub(replace, markup)


def inline_local_assets(markup: str) -> str:
    asset_names = [
        "ChatGPT Image May 5, 2026, 11_59_26 PM.png",
        "Dixit-Kumar-Jami-CV.pdf",
    ]

    for asset_name in asset_names:
        asset_path = ROOT / asset_name
        if asset_path.exists():
            uri = data_uri(asset_path)
            markup = markup.replace(f'./{asset_name}', uri)
            markup = markup.replace(asset_name, uri)

    return markup


def streamlit_page_url(href: str) -> str:
    normalized = href.removeprefix("./")
    page_file = normalized.split("?", 1)[0].split("#", 1)[0]
    page_key = LOCAL_PAGE_LINKS.get(page_file)
    if not page_key:
        return href
    return f"?page={page_key}"


def rewrite_local_page_links(markup: str) -> str:
    pattern = re.compile(r'href=["\']\.\/([^"\']+\.html(?:\?[^"\']*)?(?:#[^"\']*)?)["\']')

    def replace(match: re.Match[str]) -> str:
        url = streamlit_page_url(match.group(1))
        return f'href="{url}" target="_top"'

    return pattern.sub(replace, markup)


def prepare_html(page_file: str) -> str:
    markup = read_text(ROOT / page_file)
    streamlit_style = """
    <script>
        window.__STREAMLIT_PORTFOLIO__ = true;
        document.documentElement.dataset.embed = "streamlit";
    </script>
    <style>
        html,
        body {
            overflow-x: hidden;
        }

        html[data-embed="streamlit"] body {
            min-height: auto;
        }

        html[data-embed="streamlit"] main > .landing-shell,
        html[data-embed="streamlit"] .landing-shell {
            min-height: auto;
        }

        html[data-embed="streamlit"] .hero {
            height: min(100vh, 920px);
            min-height: min(720px, 100vh);
        }

        @media (max-width: 760px) {
            html[data-embed="streamlit"] .hero {
                height: min(100vh, 860px);
                min-height: min(720px, 100vh);
            }
        }
    </style>
    """
    markup = markup.replace("</head>", f"{streamlit_style}</head>")
    markup = inline_local_styles(markup)
    markup = inline_local_scripts(markup)
    markup = inline_local_assets(markup)
    markup = rewrite_local_page_links(markup)
    return markup


def current_page_key() -> str:
    page = st.query_params.get("page", "portfolio")
    return page if page in PAGES else "portfolio"


st.set_page_config(
    page_title="Dixit Jami | Portfolio",
    page_icon="DJ",
    layout="wide",
    initial_sidebar_state="collapsed",
)

st.markdown(
    """
    <style>
        [data-testid="stHeader"],
        [data-testid="stToolbar"],
        [data-testid="stSidebar"],
        [data-testid="stSidebarCollapsedControl"],
        footer {
            display: none !important;
        }

        .stApp {
            background: #05070d;
        }

        .block-container {
            max-width: none;
            padding: 0;
        }

        iframe {
            display: block;
            border: 0;
            width: 100%;
        }
    </style>
    """,
    unsafe_allow_html=True,
)

selected_page = current_page_key()

page_config = PAGES[selected_page]
render_html(
    prepare_html(page_config["file"]),
    height=page_config["height"],
    scrolling=False,
)
