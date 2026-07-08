(function () {
    var body = document.body;
    if (!body) return;

    var loader = document.querySelector(".intro-loader");
    var arrivalSequenceTimer = 0;
    var legacyLoaderMemoryKey = "dixitPortfolioIntroSeen";
    var skipIntroQueryKey = "skipIntro";
    var navigationEntries =
        window.performance && typeof window.performance.getEntriesByType === "function"
            ? window.performance.getEntriesByType("navigation")
            : [];
    var navigationType = navigationEntries.length ? navigationEntries[0].type : "";

    function clearLegacyIntroMemory() {
        try {
            if (window.localStorage) {
                window.localStorage.removeItem(legacyLoaderMemoryKey);
            }
        } catch (error) {
            // Ignore storage cleanup issues and continue.
        }

        try {
            if (window.sessionStorage) {
                window.sessionStorage.removeItem(legacyLoaderMemoryKey);
            }
        } catch (error) {
            // Ignore storage cleanup issues and continue.
        }
    }

    function hasSkipIntroQuery() {
        try {
            return new URL(window.location.href).searchParams.get(skipIntroQueryKey) === "1";
        } catch (error) {
            return /\bskipIntro=1\b/.test(window.location.search || "");
        }
    }

    function cameFromInternalDetailPage() {
        return /(?:project-(?:delivery|purchase|rainfall|silence|traffic|qurikspace)|cv)\.html(?:[?#]|$)/i.test(document.referrer || "");
    }

    function cleanSkipIntroQuery() {
        var currentUrl;

        try {
            currentUrl = new URL(window.location.href);
        } catch (error) {
            return;
        }

        if (!currentUrl.searchParams.has(skipIntroQueryKey)) return;

        currentUrl.searchParams.delete(skipIntroQueryKey);

        var cleanedSearch = currentUrl.searchParams.toString();
        var cleanedUrl = currentUrl.pathname + (cleanedSearch ? "?" + cleanedSearch : "") + currentUrl.hash;
        window.history.replaceState(null, "", cleanedUrl);
    }

    function discardLoaderImmediately() {
        body.classList.remove("loading");
        body.classList.add("ready");
        if (!loader) return;
        loader.classList.add("hidden");
        if (loader.parentNode) {
            loader.parentNode.removeChild(loader);
        }
    }

    clearLegacyIntroMemory();

    var shouldSkipLoader = hasSkipIntroQuery() || navigationType === "back_forward" || cameFromInternalDetailPage();
    body.classList.add(shouldSkipLoader ? "ready" : "loading");

    function hideLoader() {
        stopVoiceRecognition();
        cancelRobotSpeech();
        if (allowInteractiveMotion) {
            body.classList.add("arrival-active");
            window.clearTimeout(arrivalSequenceTimer);
            arrivalSequenceTimer = window.setTimeout(function () {
                body.classList.remove("arrival-active");
            }, 1900);
        }

        body.classList.remove("loading");
        body.classList.add("ready");
        if (!loader) return;
        loader.classList.add("hidden");
        window.setTimeout(function () {
            if (loader.parentNode) {
                loader.parentNode.removeChild(loader);
            }
        }, 520);
    }

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    var allowInteractiveMotion = !reduceMotion && !coarsePointer;
    var loaderGreeting = document.querySelector("[data-loader-greeting]");
    var loaderLanguage = document.querySelector("[data-loader-language]");
    var loaderDialog = document.querySelector("[data-loader-dialog]");
    var loaderStatus = document.querySelector("[data-loader-status]");
    var loaderStartButton = document.querySelector("[data-loader-hi]");
    var loaderListenButton = document.querySelector("[data-loader-listen]");
    var pageLoaded = document.readyState === "complete";
    var introSequenceDone = !loaderGreeting || !loaderLanguage;
    var loaderDismissed = false;
    var introActivated = !loaderStartButton;
    var greetingSequenceStarted = false;
    var voiceRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition || null;
    var voiceRecognition = null;
    var voiceListening = false;
    var speechSynthesisApi = window.speechSynthesis || null;
    var speechVoices = [];
    var audioContextCtor = window.AudioContext || window.webkitAudioContext || null;
    var robotAudioContext = null;
    var robotResponding = false;
    var robotSpeechTimer = 0;
    var loaderIdleStatus = "Use your voice or tap the hi button to wake the mouse and begin loading.";
    var welcomeSequence = [
        { text: "Welcome", language: "English", lang: "en" },
        { text: "स्वागत है", language: "Hindi", lang: "hi" },
        { text: "Bienvenido", language: "Spanish", lang: "es" },
        { text: "Bienvenue", language: "French", lang: "fr" },
    ];
    var headerNavLinks = document.querySelectorAll(".top-nav .nav-list a, .hero-nav a");
    var sectionLinks = document.querySelectorAll(".section-progress a");
    var trackedSections = document.querySelectorAll("[data-track-section]");
    var sectionRatios = {};

    if (shouldSkipLoader) {
        introSequenceDone = true;
        loaderDismissed = true;
        introActivated = true;
        discardLoaderImmediately();
        cleanSkipIntroQuery();
    }

    function updateLoaderDialog(message) {
        if (loaderDialog && message) {
            loaderDialog.textContent = message;
        }
    }

    function updateLoaderStatus(message) {
        if (loaderStatus && message) {
            loaderStatus.textContent = message;
        }
    }

    function setVoiceButtonLabel(message) {
        if (loaderListenButton && message) {
            loaderListenButton.textContent = message;
        }
    }

    function clearVoiceState() {
        voiceListening = false;
        voiceRecognition = null;
        if (loader) {
            loader.classList.remove("is-listening");
        }
        setVoiceButtonLabel("Use Voice");
    }

    function stopVoiceRecognition() {
        if (!voiceRecognition) return;
        try {
            voiceRecognition.stop();
        } catch (error) {
            clearVoiceState();
        }
    }

    function setRobotSpeakingState(isSpeaking) {
        if (!loader) return;
        loader.classList.toggle("is-speaking", Boolean(isSpeaking));
    }

    function cancelRobotSpeech() {
        window.clearTimeout(robotSpeechTimer);
        setRobotSpeakingState(false);
        if (!speechSynthesisApi) return;
        try {
            speechSynthesisApi.cancel();
        } catch (error) {
            // Ignore synthesis cancellation issues and continue the loader flow.
        }
    }

    function refreshSpeechVoices() {
        if (!speechSynthesisApi || typeof speechSynthesisApi.getVoices !== "function") {
            speechVoices = [];
            return;
        }

        speechVoices = speechSynthesisApi.getVoices() || [];
    }

    function ensureRobotAudioContext() {
        if (!audioContextCtor) return null;
        if (!robotAudioContext) {
            try {
                robotAudioContext = new audioContextCtor();
            } catch (error) {
                robotAudioContext = null;
            }
        }

        if (robotAudioContext && typeof robotAudioContext.resume === "function" && robotAudioContext.state === "suspended") {
            robotAudioContext.resume().catch(function () {
                return null;
            });
        }

        return robotAudioContext;
    }

    function playRobotChime() {
        var context = ensureRobotAudioContext();
        if (!context) return;

        var now = context.currentTime + 0.02;
        var notes = [
            { freq: 760, detune: -6, start: 0, duration: 0.06, gain: 0.026 },
            { freq: 980, detune: 8, start: 0.08, duration: 0.07, gain: 0.024 },
            { freq: 860, detune: -4, start: 0.18, duration: 0.1, gain: 0.022 },
        ];

        notes.forEach(function (note) {
            var oscillator = context.createOscillator();
            var gainNode = context.createGain();
            var filter = context.createBiquadFilter();

            oscillator.type = "sine";
            oscillator.frequency.value = note.freq;
            oscillator.detune.value = note.detune;

            filter.type = "bandpass";
            filter.frequency.value = 1800;
            filter.Q.value = 1.35;

            gainNode.gain.setValueAtTime(0.0001, now + note.start);
            gainNode.gain.exponentialRampToValueAtTime(note.gain, now + note.start + 0.018);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.duration);

            oscillator.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(context.destination);

            oscillator.start(now + note.start);
            oscillator.stop(now + note.start + note.duration + 0.02);
        });
    }

    function scoreRobotVoice(voice) {
        if (!voice) return -1;

        var score = 0;
        var name = (voice.name || "").toLowerCase();
        var lang = (voice.lang || "").toLowerCase();

        if (/en-in/.test(lang)) score += 40;
        if (/en-gb/.test(lang)) score += 34;
        if (/en-us/.test(lang)) score += 30;
        if (/^en/.test(lang)) score += 18;

        if (/google/.test(name)) score += 26;
        if (/microsoft|samantha|daniel|alex|serena|victoria|karen|moira|aria|jenny|sonia/.test(name)) score += 24;
        if (/neural|natural|premium|enhanced|online/.test(name)) score += 22;
        if (/ravi|prabhat|aaron|david|daniel|alex/.test(name)) score += 16;

        if (/aria|jenny|libby|sonia|neerja|veena|heera|priya|samantha|serena|victoria|karen/.test(name)) {
            score += 18;
        }

        if (/zira|hazel|desktop|classic/.test(name)) score -= 14;
        if (voice.default) score += 6;

        return score;
    }

    function chooseRobotVoice() {
        if (!speechSynthesisApi || typeof speechSynthesisApi.getVoices !== "function") {
            return null;
        }

        if (!speechVoices.length) {
            refreshSpeechVoices();
        }

        var voices = speechVoices;
        if (!voices || !voices.length) return null;

        return voices
            .slice()
            .sort(function (a, b) {
                return scoreRobotVoice(b) - scoreRobotVoice(a);
            })[0];
    }

    function speakRobotResponse(message, onDone) {
        var finished = false;
        var complete = function () {
            if (finished) return;
            finished = true;
            window.clearTimeout(robotSpeechTimer);
            setRobotSpeakingState(false);
            if (typeof onDone === "function") {
                onDone();
            }
        };

        updateLoaderDialog(message);
        updateLoaderStatus(message);
        setRobotSpeakingState(true);

        if (!speechSynthesisApi || typeof SpeechSynthesisUtterance === "undefined") {
            robotSpeechTimer = window.setTimeout(complete, 1100);
            return;
        }

        cancelRobotSpeech();
        setRobotSpeakingState(true);
        playRobotChime();

        var utterance = new SpeechSynthesisUtterance(message);
        utterance.rate = 1.02;
        utterance.pitch = 1.18;
        utterance.volume = 1;

        var voice = chooseRobotVoice();
        if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang;
            if (/en-in/i.test(voice.lang)) {
                utterance.rate = 1.04;
            }
            if (/aria|jenny|libby|sonia|neerja|veena|heera|priya|samantha|serena|victoria|karen/i.test(voice.name || "")) {
                utterance.pitch = 1.16;
            }
            if (/daniel|alex|ravi|prabhat|aaron|david/i.test(voice.name || "")) {
                utterance.pitch = 1.1;
            }
        } else {
            utterance.lang = "en-IN";
        }

        utterance.onend = complete;
        utterance.onerror = complete;

        robotSpeechTimer = window.setTimeout(complete, 4600);

        try {
            window.setTimeout(function () {
                if (finished) return;
                try {
                    speechSynthesisApi.speak(utterance);
                } catch (error) {
                    complete();
                }
            }, 240);
        } catch (error) {
            complete();
        }
    }

    function setLoaderGreeting(entry) {
        if (!loaderGreeting || !loaderLanguage || !entry) return;
        loaderGreeting.textContent = entry.text;
        loaderGreeting.setAttribute("lang", entry.lang);
        loaderLanguage.textContent = entry.language;
    }

    function transitionLoaderGreeting(entry) {
        if (!loaderGreeting || !loaderLanguage || !entry) return;

        if (reduceMotion) {
            setLoaderGreeting(entry);
            return;
        }

        loaderGreeting.classList.add("is-switching");
        loaderLanguage.classList.add("is-switching");

        window.setTimeout(function () {
            setLoaderGreeting(entry);
            loaderGreeting.classList.remove("is-switching");
            loaderLanguage.classList.remove("is-switching");
        }, 180);
    }

    function maybeHideLoader() {
        if (!pageLoaded || !introActivated || !introSequenceDone || loaderDismissed) return;
        loaderDismissed = true;
        window.setTimeout(hideLoader, allowInteractiveMotion ? 360 : 120);
    }

    function markPageLoaded() {
        pageLoaded = true;
        maybeHideLoader();
    }

    function startGreetingSequence() {
        greetingSequenceStarted = true;
        if (!loaderGreeting || !loaderLanguage) {
            introSequenceDone = true;
            maybeHideLoader();
            return;
        }

        var stepDuration = reduceMotion ? 850 : 1000;
        setLoaderGreeting(welcomeSequence[0]);

        function advanceGreeting(index) {
            if (index >= welcomeSequence.length) {
                introSequenceDone = true;
                maybeHideLoader();
                return;
            }

            transitionLoaderGreeting(welcomeSequence[index]);
            window.setTimeout(function () {
                advanceGreeting(index + 1);
            }, stepDuration);
        }

        window.setTimeout(function () {
            advanceGreeting(1);
        }, stepDuration);
    }

    function completeLoaderActivation(source) {
        introActivated = true;
        updateLoaderStatus(
            source === "voice"
                ? "Voice confirmed. Your tiny guide is opening the portfolio..."
                : "Greeting confirmed. Your tiny guide is opening the portfolio..."
        );
        if (loader) {
            loader.classList.add("is-started");
        }
        if (!greetingSequenceStarted) {
            startGreetingSequence();
        }
        maybeHideLoader();
    }

    function activateLoader(source) {
        if (introActivated || robotResponding) return;

        robotResponding = true;
        stopVoiceRecognition();
        clearVoiceState();

        var responseMessage =
            source === "voice"
                ? "Hi there. I heard you clearly. Welcome to Dixit's portfolio. Let me open it for you."
                : "Hi there. Thanks for tapping. Welcome to Dixit's portfolio. Let me open it for you.";

        speakRobotResponse(responseMessage, function () {
            robotResponding = false;
            completeLoaderActivation(source);
        });
    }

    function startVoiceGreeting() {
        if (introActivated || !loaderListenButton || !voiceRecognitionCtor) return;
        if (voiceListening) return;

        voiceRecognition = new voiceRecognitionCtor();
        voiceRecognition.lang = "en-IN";
        voiceRecognition.continuous = false;
        voiceRecognition.interimResults = true;
        voiceRecognition.maxAlternatives = 3;

        voiceRecognition.onstart = function () {
            voiceListening = true;
            if (loader) {
                loader.classList.add("is-listening");
            }
            setVoiceButtonLabel("Listening...");
            updateLoaderDialog("I am listening for your hi.");
            updateLoaderStatus("Listening... say hi to wake the mouse.");
        };

        voiceRecognition.onresult = function (event) {
            var transcript = "";
            for (var i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript + " ";
            }

            if (/\b(hi|hii|hello|hey)\b/i.test(transcript)) {
                updateLoaderDialog("Hi heard. Your mouse host is saying hello.");
                updateLoaderStatus("Hi heard. Opening the portfolio...");
                activateLoader("voice");
            } else {
                updateLoaderDialog("I am still waiting for hi.");
                updateLoaderStatus("I am listening for hi. Try again or tap the hi button.");
            }
        };

        voiceRecognition.onerror = function () {
            clearVoiceState();
            if (robotResponding || introActivated) return;
            updateLoaderDialog("Voice wake-up is unavailable right now.");
            updateLoaderStatus("Voice is not available here. Tap the hi button to begin.");
        };

        voiceRecognition.onend = function () {
            clearVoiceState();
            if (!introActivated && !robotResponding) {
                updateLoaderDialog("A tiny mouse host is peeking from the box. Say hi when you are ready.");
                updateLoaderStatus(loaderIdleStatus);
            }
        };

        try {
            voiceRecognition.start();
        } catch (error) {
            clearVoiceState();
            updateLoaderDialog("Voice could not start. Tap hi instead.");
            updateLoaderStatus("Voice could not start. Tap the hi button to begin.");
        }
    }

    if (loaderStartButton) {
        loaderStartButton.addEventListener("click", function () {
            activateLoader("tap");
        });
    }

    if (loaderListenButton) {
        if (!voiceRecognitionCtor) {
            loaderListenButton.disabled = true;
            loaderListenButton.setAttribute("aria-disabled", "true");
            setVoiceButtonLabel("Voice Locked");
            updateLoaderDialog("Voice wake-up is locked here. Tap hi and I will still greet you.");
            updateLoaderStatus("Tap the hi button to begin. Voice greeting is not available in this browser.");
        } else {
            loaderListenButton.addEventListener("click", function () {
                startVoiceGreeting();
            });
        }
    }

    refreshSpeechVoices();
    if (speechSynthesisApi && typeof speechSynthesisApi.addEventListener === "function") {
        speechSynthesisApi.addEventListener("voiceschanged", refreshSpeechVoices);
    } else if (speechSynthesisApi && "onvoiceschanged" in speechSynthesisApi) {
        speechSynthesisApi.onvoiceschanged = refreshSpeechVoices;
    }

    if (pageLoaded) {
        maybeHideLoader();
    } else {
        window.addEventListener("load", markPageLoaded, { once: true });
    }

    window.addEventListener("pageshow", function (event) {
        if (!event.persisted && navigationType !== "back_forward") return;
        introSequenceDone = true;
        loaderDismissed = true;
        introActivated = true;
        discardLoaderImmediately();
    });

    if (introActivated && !loaderDismissed) {
        startGreetingSequence();
    }

    function setActiveSection(sectionId) {
        body.setAttribute("data-active-section", sectionId);

        sectionLinks.forEach(function (link) {
            var isActive = link.getAttribute("data-section") === sectionId;
            link.classList.toggle("active", isActive);
        });

        headerNavLinks.forEach(function (link) {
            var isActive = link.getAttribute("href") === "#" + sectionId;
            link.classList.toggle("active", isActive);
            if (isActive) {
                link.setAttribute("aria-current", "page");
            } else {
                link.removeAttribute("aria-current");
            }
        });
    }

    function animateSectionFocus(target) {
        if (!target) return;
        target.classList.remove("section-attention");
        target.offsetWidth;
        target.classList.add("section-attention");
        window.setTimeout(function () {
            target.classList.remove("section-attention");
        }, 950);
    }

    var internalLinks = document.querySelectorAll('a[href^="#"]');
    internalLinks.forEach(function (link) {
        link.addEventListener("click", function (event) {
            var href = link.getAttribute("href");
            if (!href || href.length < 2) return;

            var target = document.querySelector(href);
            if (!target) return;

            event.preventDefault();
            target.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });

            if (target.hasAttribute("data-track-section")) {
                setActiveSection(target.getAttribute("data-track-section"));
            }

            window.setTimeout(function () {
                animateSectionFocus(target);
            }, 260);
        });
    });

    if (allowInteractiveMotion) {
        body.classList.add("js-enabled");
        body.classList.add("motion-balanced");
    }

    var revealTargets = document.querySelectorAll(
        ".card, .project, .skill-lens, .skills-list li, .profile-stage, .about-highlights article, .hero-pills span, " +
            ".hero-proof-card, .hero-panel-card, #about .about-stack p, #about .social-links a, " +
            ".education-spotlight, .education-timeline-item, .education-detail-card, .projects-metrics article, .projects-chart-panel, " +
            ".contact-card, .contact-form, .contact-note, #contact form label, #contact form input, " +
            "#contact form textarea, #contact form button"
    );

    function countPreviousSiblings(element) {
        var count = 0;
        var sibling = element ? element.previousElementSibling : null;
        while (sibling) {
            count += 1;
            sibling = sibling.previousElementSibling;
        }
        return count;
    }

    function assignRevealDirections() {
        var viewportCenter = window.innerWidth / 2;
        var centeredSequence = 0;

        revealTargets.forEach(function (el) {
            var rect = el.getBoundingClientRect();
            var elementCenter = rect.left + rect.width / 2;
            var revealFrom = "left";

            if (elementCenter < viewportCenter - 110) {
                revealFrom = "left";
            } else if (elementCenter > viewportCenter + 110) {
                revealFrom = "right";
            } else {
                revealFrom = centeredSequence % 2 === 0 ? "left" : "right";
                centeredSequence += 1;
            }

            el.setAttribute("data-reveal-from", revealFrom);
            el.style.setProperty("--reveal-delay", Math.min(countPreviousSiblings(el), 4) * 70 + "ms");
        });
    }

    assignRevealDirections();

    var contactForm = document.getElementById("contact-form");
    var contactStatus = document.querySelector("[data-contact-status]");
    if (contactForm) {
        contactForm.addEventListener("submit", function (event) {
            event.preventDefault();

            var nameField = contactForm.querySelector("#name");
            var emailField = contactForm.querySelector("#email");
            var messageField = contactForm.querySelector("#message");

            var nameValue = nameField ? nameField.value.trim() : "";
            var emailValue = emailField ? emailField.value.trim() : "";
            var messageValue = messageField ? messageField.value.trim() : "";

            if (!nameValue || !emailValue || !messageValue) {
                if (contactStatus) {
                    contactStatus.textContent = "Please fill in your name, email, and message first.";
                }
                return;
            }

            var subject = "Portfolio enquiry from " + nameValue;
            var bodyLines = [
                "Name: " + nameValue,
                "Email: " + emailValue,
                "",
                messageValue,
            ];

            var mailtoHref =
                "mailto:dixitjami@gmail.com?subject=" +
                encodeURIComponent(subject) +
                "&body=" +
                encodeURIComponent(bodyLines.join("\n"));

            if (contactStatus) {
                contactStatus.textContent = "Opening your email app with a prefilled draft.";
            }

            window.location.href = mailtoHref;
        });
    }

    var showcaseStage = document.querySelector("[data-showcase-stage]");
    var showcaseCards = showcaseStage ? showcaseStage.querySelectorAll("[data-showcase-card]") : [];
    var showcaseDots = showcaseStage ? showcaseStage.querySelectorAll("[data-showcase-dot]") : [];
    var showcasePrev = document.querySelector("[data-showcase-prev]");
    var showcaseNext = document.querySelector("[data-showcase-next]");
    var showcaseIndex = 0;
    var showcaseTimer = 0;
    var showcasePaused = false;

    function getShowcaseOffset(index) {
        var total = showcaseCards.length;
        var raw = index - showcaseIndex;

        if (raw > total / 2) raw -= total;
        if (raw < -total / 2) raw += total;

        return raw;
    }

    function renderShowcase() {
        if (!showcaseStage || !showcaseCards.length) return;

        var stageWidth = showcaseStage.clientWidth || 720;
        var sideShift = stageWidth > 760 ? 228 : stageWidth > 580 ? 188 : 124;
        var farShift = stageWidth > 760 ? 316 : stageWidth > 580 ? 252 : 166;
        var activeDepth = stageWidth > 760 ? 180 : stageWidth > 580 ? 138 : 92;
        var sideDepth = stageWidth > 760 ? 24 : stageWidth > 580 ? 10 : 0;
        var farDepth = stageWidth > 760 ? -120 : stageWidth > 580 ? -96 : -76;
        var sideDrop = stageWidth > 760 ? 18 : 12;
        var farDrop = stageWidth > 760 ? 54 : 36;

        showcaseCards.forEach(function (card, index) {
            var offset = getShowcaseOffset(index);
            var absOffset = Math.abs(offset);
            var isActive = offset === 0;
            var transform = "";

            if (isActive) {
                transform = "translate3d(-50%, -50%, " + activeDepth + "px) rotateY(0deg) scale(1.04)";
            } else if (offset === -1) {
                transform =
                    "translate3d(calc(-50% - " +
                    sideShift +
                    "px), calc(-50% + " +
                    sideDrop +
                    "px), " +
                    sideDepth +
                    "px) rotateY(34deg) scale(0.92)";
            } else if (offset === 1) {
                transform =
                    "translate3d(calc(-50% + " +
                    sideShift +
                    "px), calc(-50% + " +
                    sideDrop +
                    "px), " +
                    sideDepth +
                    "px) rotateY(-34deg) scale(0.92)";
            } else if (offset < 0) {
                transform =
                    "translate3d(calc(-50% - " +
                    farShift +
                    "px), calc(-50% + " +
                    farDrop +
                    "px), " +
                    farDepth +
                    "px) rotateY(48deg) scale(0.78)";
            } else {
                transform =
                    "translate3d(calc(-50% + " +
                    farShift +
                    "px), calc(-50% + " +
                    farDrop +
                    "px), " +
                    farDepth +
                    "px) rotateY(-48deg) scale(0.78)";
            }

            card.classList.toggle("is-active", isActive);
            card.style.transform = transform;
            card.style.opacity = isActive ? "1" : absOffset === 1 ? "0.68" : "0.34";
            card.style.filter = isActive ? "blur(0)" : absOffset === 1 ? "blur(1.4px)" : "blur(2.8px)";
            card.style.pointerEvents = "auto";
            card.style.zIndex = String(30 - absOffset * 8);
            card.setAttribute("aria-hidden", isActive ? "false" : "true");
        });

        showcaseDots.forEach(function (dot, index) {
            var isActive = index === showcaseIndex;
            dot.classList.toggle("is-active", isActive);
            dot.setAttribute("aria-selected", isActive ? "true" : "false");
        });
    }

    function setShowcaseIndex(nextIndex) {
        if (!showcaseCards.length) return;
        showcaseIndex = (nextIndex + showcaseCards.length) % showcaseCards.length;
        renderShowcase();
    }

    function stopShowcaseAuto() {
        window.clearInterval(showcaseTimer);
        showcaseTimer = 0;
    }

    function startShowcaseAuto() {
        if (!showcaseCards.length || showcasePaused) return;
        stopShowcaseAuto();
        showcaseTimer = window.setInterval(function () {
            setShowcaseIndex(showcaseIndex + 1);
        }, 4600);
    }

    function restartShowcaseAuto() {
        stopShowcaseAuto();
        startShowcaseAuto();
    }

    if (showcaseStage && showcaseCards.length) {
        renderShowcase();
        if (!reduceMotion) {
            startShowcaseAuto();
        }

        if (showcasePrev) {
            showcasePrev.addEventListener("click", function () {
                setShowcaseIndex(showcaseIndex - 1);
                restartShowcaseAuto();
            });
        }

        if (showcaseNext) {
            showcaseNext.addEventListener("click", function () {
                setShowcaseIndex(showcaseIndex + 1);
                restartShowcaseAuto();
            });
        }

        showcaseDots.forEach(function (dot, index) {
            dot.addEventListener("click", function () {
                setShowcaseIndex(index);
                restartShowcaseAuto();
            });
        });

        showcaseCards.forEach(function (card, index) {
            card.addEventListener("mouseenter", function () {
                showcasePaused = true;
                stopShowcaseAuto();
                setShowcaseIndex(index);
            });

            card.addEventListener("focusin", function () {
                showcasePaused = true;
                stopShowcaseAuto();
                setShowcaseIndex(index);
            });
        });

        showcaseStage.addEventListener("mouseenter", function () {
            showcasePaused = true;
            stopShowcaseAuto();
        });

        showcaseStage.addEventListener("mouseleave", function () {
            showcasePaused = false;
            if (!reduceMotion) {
                startShowcaseAuto();
            }
        });

        showcaseStage.addEventListener("focusin", function () {
            showcasePaused = true;
            stopShowcaseAuto();
        });

        showcaseStage.addEventListener("focusout", function () {
            showcasePaused = false;
            if (!reduceMotion) {
                startShowcaseAuto();
            }
        });

        showcaseStage.addEventListener("keydown", function (event) {
            if (event.key === "ArrowLeft") {
                event.preventDefault();
                setShowcaseIndex(showcaseIndex - 1);
                restartShowcaseAuto();
            }

            if (event.key === "ArrowRight") {
                event.preventDefault();
                setShowcaseIndex(showcaseIndex + 1);
                restartShowcaseAuto();
            }
        });

        window.addEventListener("resize", function () {
            renderShowcase();
        });
    }

    if (!("IntersectionObserver" in window)) {
        revealTargets.forEach(function (el) {
            el.classList.add("is-visible");
        });
        setActiveSection("home");
        animateSectionFocus(document.getElementById("home"));
        return;
    }

    if (allowInteractiveMotion) {
        var revealObserver = new IntersectionObserver(
            function (entries, obs) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("is-visible");
                        obs.unobserve(entry.target);
                    }
                });
            },
            {
                threshold: 0.16,
                rootMargin: "0px 0px -40px 0px",
            }
        );

        revealTargets.forEach(function (el) {
            revealObserver.observe(el);
        });

        var resizeRevealTimer = 0;
        window.addEventListener("resize", function () {
            window.clearTimeout(resizeRevealTimer);
            resizeRevealTimer = window.setTimeout(assignRevealDirections, 120);
        });
    }

    var sectionObserver = new IntersectionObserver(
        function (entries) {
            entries.forEach(function (entry) {
                var key = entry.target.getAttribute("data-track-section");
                sectionRatios[key] = entry.isIntersecting ? entry.intersectionRatio : 0;
            });

            var activeKey = "home";
            var maxRatio = 0;

            Object.keys(sectionRatios).forEach(function (key) {
                if (sectionRatios[key] > maxRatio) {
                    maxRatio = sectionRatios[key];
                    activeKey = key;
                }
            });

            setActiveSection(activeKey);
        },
        {
            threshold: [0.2, 0.35, 0.5, 0.65],
            rootMargin: "-15% 0px -35% 0px",
        }
    );

    trackedSections.forEach(function (section) {
        sectionObserver.observe(section);
    });

    if (!allowInteractiveMotion) return;

    var tiltItems = document.querySelectorAll(".card, .project, .tilt-3d");
    tiltItems.forEach(function (item) {
        item.addEventListener("mousemove", function (event) {
            var rect = item.getBoundingClientRect();
            var x = event.clientX - rect.left;
            var y = event.clientY - rect.top;
            var centerX = rect.width / 2;
            var centerY = rect.height / 2;
            var strength = Number(item.getAttribute("data-tilt-strength")) || 4;
            var rotateX = ((y - centerY) / centerY) * -(strength * 0.8);
            var rotateY = ((x - centerX) / centerX) * strength;
            item.style.transform =
                "perspective(900px) rotateX(" +
                rotateX.toFixed(2) +
                "deg) rotateY(" +
                rotateY.toFixed(2) +
                "deg) translateY(-2px)";
        });

        item.addEventListener("mouseleave", function () {
            item.style.transform = "";
        });
    });

    var magneticButtons = document.querySelectorAll(".top-nav .nav-list a, .hero-nav a, .btn, button");
    magneticButtons.forEach(function (btn) {
        btn.addEventListener("mousemove", function (event) {
            var rect = btn.getBoundingClientRect();
            var x = event.clientX - rect.left - rect.width / 2;
            var y = event.clientY - rect.top - rect.height / 2;
            btn.style.transform =
                "translate(" + (x * 0.08).toFixed(2) + "px," + (y * 0.12).toFixed(2) + "px)";
        });

        btn.addEventListener("mouseleave", function () {
            btn.style.transform = "";
        });
    });

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
        requestAnimationFrame(animateGlow);
    }

    window.addEventListener("mousemove", function (event) {
        targetX = event.clientX;
        targetY = event.clientY;
        glow.style.opacity = "1";
    });

    window.addEventListener("mouseleave", function () {
        glow.style.opacity = "0";
    });

    var hero = document.querySelector(".hero");
    var heroContent = document.querySelector(".hero-content");
    if (hero && heroContent) {
        heroContent.style.transform = "";
    }

    if (showcaseStage) {
        showcaseStage.addEventListener("mousemove", function (event) {
            var rect = showcaseStage.getBoundingClientRect();
            var x = event.clientX - rect.left;
            var y = event.clientY - rect.top;
            var rx = (x / rect.width - 0.5) * 10;
            var ry = (y / rect.height - 0.5) * -8;
            showcaseStage.style.setProperty("--stage-tilt-x", ry.toFixed(2) + "deg");
            showcaseStage.style.setProperty("--stage-tilt-y", rx.toFixed(2) + "deg");
        });

        showcaseStage.addEventListener("mouseleave", function () {
            showcaseStage.style.setProperty("--stage-tilt-x", "0deg");
            showcaseStage.style.setProperty("--stage-tilt-y", "0deg");
        });
    }

    var sparkLayer = document.querySelector(".spark-layer");
    if (sparkLayer) {
        var sparkCount = 24;
        for (var i = 0; i < sparkCount; i++) {
            var spark = document.createElement("span");
            spark.className = "spark";
            var left = Math.random() * 100;
            var drift = (Math.random() * 220 - 110).toFixed(0) + "px";
            var duration = (8 + Math.random() * 8).toFixed(2) + "s";
            var delay = (Math.random() * 8).toFixed(2) + "s";
            spark.style.left = left.toFixed(2) + "vw";
            spark.style.setProperty("--x-start", "0px");
            spark.style.setProperty("--x-end", drift);
            spark.style.setProperty("--dur", duration);
            spark.style.setProperty("--delay", delay);
            sparkLayer.appendChild(spark);
        }
    }

    animateGlow();
})();
