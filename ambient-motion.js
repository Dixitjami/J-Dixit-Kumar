(function () {
    var body = document.body;
    if (!body) return;

    body.classList.add("js-enabled");

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var finePointer = window.matchMedia("(pointer: fine)").matches;
    var allowInteractiveMotion = !reduceMotion;
    var revealSelector = body.getAttribute("data-reveal-selector") || "";
    var tiltSelector = body.getAttribute("data-tilt-selector") || "";
    var heroSelector = body.getAttribute("data-hero-selector") || "";
    var heroContentSelector = body.getAttribute("data-hero-content-selector") || "";
    var sparkCount = Number(body.getAttribute("data-spark-count")) || 18;
    var revealTargets = revealSelector ? Array.from(document.querySelectorAll(revealSelector)) : [];

    function markVisible(elements) {
        elements.forEach(function (element) {
            element.classList.add("is-visible");
        });
    }

    if (!revealTargets.length || !allowInteractiveMotion || !("IntersectionObserver" in window)) {
        markVisible(revealTargets);
    } else {
        var revealObserver = new IntersectionObserver(
            function (entries, observer) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                });
            },
            {
                threshold: 0.14,
                rootMargin: "0px 0px -40px 0px",
            }
        );

        revealTargets.forEach(function (target) {
            revealObserver.observe(target);
        });
    }

    window.requestAnimationFrame(function () {
        body.classList.add("page-ready");
    });

    if (!allowInteractiveMotion) return;

    if (tiltSelector && finePointer) {
        Array.from(document.querySelectorAll(tiltSelector)).forEach(function (item) {
            item.addEventListener("mousemove", function (event) {
                var rect = item.getBoundingClientRect();
                var strength = Number(item.getAttribute("data-tilt-strength")) || 4;
                var offsetX = (event.clientX - rect.left) / rect.width - 0.5;
                var offsetY = (event.clientY - rect.top) / rect.height - 0.5;
                var rotateY = offsetX * strength * 2;
                var rotateX = offsetY * -strength * 1.8;
                item.style.transform =
                    "perspective(1000px) rotateX(" +
                    rotateX.toFixed(2) +
                    "deg) rotateY(" +
                    rotateY.toFixed(2) +
                    "deg) translateY(-4px)";
            });

            item.addEventListener("mouseleave", function () {
                item.style.transform = "";
            });
        });
    }

    var hero = heroSelector ? document.querySelector(heroSelector) : null;
    var heroContent = heroContentSelector ? document.querySelector(heroContentSelector) : null;
    if (hero && heroContent && finePointer) {
        hero.addEventListener("mousemove", function (event) {
            var rect = hero.getBoundingClientRect();
            var offsetX = (event.clientX - rect.left) / rect.width - 0.5;
            var offsetY = (event.clientY - rect.top) / rect.height - 0.5;
            heroContent.style.transform =
                "translate3d(" +
                (offsetX * 12).toFixed(2) +
                "px, " +
                (offsetY * 10).toFixed(2) +
                "px, 0) scale(1.01)";
        });

        hero.addEventListener("mouseleave", function () {
            heroContent.style.transform = "";
        });
    }

    if (finePointer) {
        var glow = document.createElement("div");
        glow.className = "cursor-glow";
        document.body.appendChild(glow);

        var glowX = window.innerWidth / 2;
        var glowY = window.innerHeight / 2;
        var targetX = glowX;
        var targetY = glowY;

        function animateGlow() {
            glowX += (targetX - glowX) * 0.16;
            glowY += (targetY - glowY) * 0.16;
            glow.style.left = glowX + "px";
            glow.style.top = glowY + "px";
            window.requestAnimationFrame(animateGlow);
        }

        window.addEventListener("mousemove", function (event) {
            targetX = event.clientX;
            targetY = event.clientY;
            glow.style.opacity = "1";
        });

        window.addEventListener("mouseleave", function () {
            glow.style.opacity = "0";
        });

        animateGlow();
    }

    var sparkLayer = document.querySelector(".spark-layer");
    if (sparkLayer && !sparkLayer.children.length) {
        for (var index = 0; index < sparkCount; index += 1) {
            var spark = document.createElement("span");
            var left = Math.random() * 100;
            var drift = (Math.random() * 180 - 90).toFixed(0) + "px";
            var duration = (9 + Math.random() * 7).toFixed(2) + "s";
            var delay = (Math.random() * 8).toFixed(2) + "s";

            spark.className = "spark";
            spark.style.left = left.toFixed(2) + "vw";
            spark.style.setProperty("--x-start", "0px");
            spark.style.setProperty("--x-end", drift);
            spark.style.setProperty("--dur", duration);
            spark.style.setProperty("--delay", delay);
            sparkLayer.appendChild(spark);
        }
    }
})();
