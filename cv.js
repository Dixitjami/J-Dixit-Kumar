(function () {
    var navLinks = Array.from(document.querySelectorAll(".cv-progress a"));
    if (!navLinks.length) return;

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var sections = navLinks
        .map(function (link) {
            var selector = link.getAttribute("href");
            return selector ? document.querySelector(selector) : null;
        })
        .filter(Boolean);

    if (!sections.length) return;

    function setActive(targetId) {
        navLinks.forEach(function (link) {
            var isActive = link.getAttribute("href") === "#" + targetId;
            link.classList.toggle("active", isActive);
            if (isActive) {
                link.setAttribute("aria-current", "true");
            } else {
                link.removeAttribute("aria-current");
            }
        });
    }

    function focusSection(target) {
        if (!target || reduceMotion) return;
        target.classList.remove("section-focus");
        target.offsetWidth;
        target.classList.add("section-focus");
        window.setTimeout(function () {
            target.classList.remove("section-focus");
        }, 820);
    }

    function currentOffset() {
        return window.innerWidth <= 680 ? 92 : 124;
    }

    function getActiveSection() {
        var active = sections[0];
        var offset = currentOffset();

        sections.forEach(function (section) {
            var rect = section.getBoundingClientRect();
            if (rect.top - offset <= 0) {
                active = section;
            }
        });

        return active;
    }

    navLinks.forEach(function (link) {
        link.addEventListener("click", function (event) {
            var selector = link.getAttribute("href");
            if (!selector) return;

            var target = document.querySelector(selector);
            if (!target) return;

            event.preventDefault();
            target.scrollIntoView({
                behavior: reduceMotion ? "auto" : "smooth",
                block: "start",
            });
            setActive(target.id);
            window.setTimeout(function () {
                focusSection(target);
            }, reduceMotion ? 0 : 220);

            if (window.history && window.history.replaceState) {
                try {
                    window.history.replaceState(null, "", selector);
                } catch (error) {
                    // Ignore hash update failures on restricted/local contexts.
                }
            }
        });
    });

    var ticking = false;

    function updateActiveSection() {
        setActive(getActiveSection().id);
        ticking = false;
    }

    function requestUpdate() {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(updateActiveSection);
    }

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    window.addEventListener("load", requestUpdate, { once: true });

    requestUpdate();
})();
