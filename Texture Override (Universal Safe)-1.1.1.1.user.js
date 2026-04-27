// ==UserScript==
// @name         Texture Override (Universal Safe)
// @match        https://terradrive.eu/*
// @grant        none
// @description  nothing
// @version      1.1.1.1
// ==/UserScript==


(function () {
    'use strict';

    console.log("🚀 Texture hook mit fallback gestartet");

    const BASE = "https://toni857.github.io/my-textures/";

    const cache = {
        fallback: BASE + "type1me.png"
    };

    function resolveUrl(id) {
        return BASE + `type${id}me.png`;
    }

    function testImage(url, cb) {
        const img = new Image();
        img.onload = () => cb(true);
        img.onerror = () => cb(false);
        img.src = url;
    }

    const desc = Object.getOwnPropertyDescriptor(
        HTMLImageElement.prototype,
        "src"
    );

    Object.defineProperty(HTMLImageElement.prototype, "src", {
        set(value) {

            if (typeof value === "string" && value.includes("textures/building/type")) {

                const match = value.match(/type(\d+)\.png/);
                const id = match ? match[1] : "1";

                const targetUrl = resolveUrl(id);

                console.log("🔁 Versuch:", targetUrl);

                // Test ob Datei existiert
                testImage(targetUrl, (ok) => {

                    let finalUrl = targetUrl;

                    if (!ok) {
                        console.warn("⚠ fehlt:", targetUrl, "→ fallback type1me");
                        finalUrl = cache.fallback;
                    }

                    console.log("➡ final:", finalUrl);
                    desc.set.call(this, finalUrl);
                });

                return;
            }

            return desc.set.call(this, value);
        },
        get: desc.get
    });

    console.log("🔥 IMG hook + fallback aktiv");
})();