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
        "height": 1300,
    },
    "cv": {
        "label": "CV",
        "file": "cv.html",
        "height": 1150,
    },
    "rainfall": {
        "label": "Rainfall Case Study",
        "file": "project-rainfall.html",
        "height": 1100,
    },
    "delivery": {
        "label": "Delivery Case Study",
        "file": "project-delivery.html",
        "height": 1150,
    },
    "purchase": {
        "label": "Purchase Case Study",
        "file": "project-purchase.html",
        "height": 1100,
    },
    "silence": {
        "label": "Silence Case Study",
        "file": "project-silence.html",
        "height": 1150,
    },
    "traffic": {
        "label": "Traffic Case Study",
        "file": "project-traffic.html",
        "height": 1150,
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
        return f"<script>\n{read_text(script_path)}\n</script>"

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
    markup = markup.replace("</head>", "<style>html, body { overflow-x: hidden; }</style></head>")
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
        .stApp {
            background: #05070d;
        }

        .block-container {
            max-width: none;
            padding: 0;
        }

        [data-testid="stSidebar"] {
            background: #070b12;
        }

        iframe {
            display: block;
            border: 0;
        }
    </style>
    """,
    unsafe_allow_html=True,
)

selected_page = current_page_key()

with st.sidebar:
    st.title("Dixit Jami")
    chosen_label = st.radio(
        "Portfolio pages",
        [page["label"] for page in PAGES.values()],
        index=list(PAGES).index(selected_page),
    )
    selected_page = next(key for key, page in PAGES.items() if page["label"] == chosen_label)
    st.query_params["page"] = selected_page
    st.link_button("Open GitHub Pages site", "https://dixitjami.github.io/J-Dixit-Kumar/")

page_config = PAGES[selected_page]
render_html(
    prepare_html(page_config["file"]),
    height=page_config["height"],
    scrolling=True,
)
