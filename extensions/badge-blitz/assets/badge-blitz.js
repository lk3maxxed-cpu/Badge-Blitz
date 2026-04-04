/* Badge Blitz — Storefront Badge Injector */
(function () {
  "use strict";

  var shop = window.BadgeBlitzShop;
  var apiUrl = window.BadgeBlitzApiUrl;

  if (!shop || !apiUrl) return;

  // ── Animation keyframes (injected once) ───────────────────────────────────
  var STYLE_ID = "badge-blitz-styles";
  if (!document.getElementById(STYLE_ID)) {
    var styleEl = document.createElement("style");
    styleEl.id = STYLE_ID;
    styleEl.textContent = [
      "@keyframes bb-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}",
      ".badge-blitz-bar__scroll{display:inline-block;white-space:nowrap;animation:bb-marquee var(--bb-scroll-duration,20s) linear infinite}",
      "@keyframes bb-pulse{0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-50%) scale(1.12)}}",
      "@keyframes bb-pulse-bar{0%,100%{transform:translateY(-50%) scale(1)}50%{transform:translateY(-50%) scale(1.04)}}",
      "@keyframes bb-glow{0%,100%{opacity:1;filter:brightness(1)}50%{opacity:0.85;filter:brightness(1.4)}}",
      "@keyframes bb-shimmer{0%{background-position:200% center}100%{background-position:-200% center}}",
      // Overlay wrapper that sits over the image area without being clipped
      ".bb-overlay{position:absolute;inset:0;pointer-events:none;z-index:99;overflow:hidden}",
    ].join("\n");
    document.head.appendChild(styleEl);
  }

  // ── Font families ──────────────────────────────────────────────────────────
  var FONT_FAMILIES = {
    system:    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
    impact:    "Impact,'Haettenschweiler','Arial Narrow Bold',sans-serif",
    georgia:   "Georgia,'Times New Roman',serif",
    courier:   "'Courier New',Courier,monospace",
    trebuchet: "'Trebuchet MS',Helvetica,sans-serif",
  };

  // ── Shadow helper ──────────────────────────────────────────────────────────
  function shadowCSS(shadowStyle, color) {
    if (shadowStyle === "soft") return "0 2px 10px rgba(0,0,0,0.30)";
    if (shadowStyle === "hard") return "3px 3px 0px rgba(0,0,0,0.85)";
    if (shadowStyle === "glow") return "0 0 12px " + color + ", 0 0 24px " + color + "66";
    return "none";
  }

  // ── Countdown helper ───────────────────────────────────────────────────────
  function formatCountdown(ms) {
    if (ms <= 0) return "00:00:00";
    var s = Math.floor(ms / 1000);
    var h = Math.floor(s / 3600); s -= h * 3600;
    var m = Math.floor(s / 60);   s -= m * 60;
    var pad = function (n) { return n < 10 ? "0" + n : "" + n; };
    if (h > 0) return pad(h) + ":" + pad(m) + ":" + pad(s);
    return pad(m) + ":" + pad(s);
  }

  function startCountdown(el, endsAt) {
    var end = new Date(endsAt).getTime();
    function tick() {
      var remaining = end - Date.now();
      el.textContent = remaining > 0 ? formatCountdown(remaining) : "Ended";
      if (remaining > 0) setTimeout(tick, 1000);
    }
    tick();
  }

  // ── 3D tilt for a card ─────────────────────────────────────────────────────
  function attach3DTilt(card, el) {
    var imgContainer = el.parentElement || card;
    function onMove(e) {
      var rect = imgContainer.getBoundingClientRect();
      var cx = rect.left + rect.width  / 2;
      var cy = rect.top  + rect.height / 2;
      var dx = (e.clientX - cx) / (rect.width  / 2);
      var dy = (e.clientY - cy) / (rect.height / 2);
      var base = el.dataset.baseTransform || "";
      el.style.transform = base + " perspective(400px) rotateY(" + (dx * 18) + "deg) rotateX(" + (-dy * 18) + "deg) scale(1.06)";
      el.style.transition = "transform 0.05s linear";
    }
    function onLeave() {
      el.style.transform = el.dataset.baseTransform || "";
      el.style.transition = "transform 0.35s ease";
    }
    card.addEventListener("mousemove", onMove);
    card.addEventListener("mouseleave", onLeave);
  }

  // ── Starburst clip-path ────────────────────────────────────────────────────
  function starburstPath(points, outer, inner) {
    var step = Math.PI / points;
    var pts  = [];
    for (var i = 0; i < points * 2; i++) {
      var r = i % 2 === 0 ? outer : inner;
      var a = i * step - Math.PI / 2;
      pts.push((50 + r * Math.cos(a)).toFixed(1) + "% " + (50 + r * Math.sin(a)).toFixed(1) + "%");
    }
    return "polygon(" + pts.join(",") + ")";
  }
  var STARBURST = starburstPath(14, 50, 38);

  // ── Design props ──────────────────────────────────────────────────────────
  function applyDesignProps(el, badge) {
    if (badge.fontFamily && FONT_FAMILIES[badge.fontFamily]) {
      el.style.fontFamily = FONT_FAMILIES[badge.fontFamily];
    }
    if (badge.textTransform && badge.textTransform !== "none") {
      el.style.textTransform = badge.textTransform;
    }
    if (badge.borderWidth > 0) {
      el.style.border = badge.borderWidth + "px solid " + (badge.borderColor || "#ffffff");
      el.style.boxSizing = "border-box";
    }
    if (badge.shadowStyle && badge.shadowStyle !== "none") {
      el.style.boxShadow = shadowCSS(badge.shadowStyle, badge.color);
    }
  }

  function applyAnimEffect(el, badge, isBar) {
    var effect = badge.animEffect;
    if (effect === "pulse") {
      el.style.animation = isBar ? "bb-pulse-bar 1.6s ease-in-out infinite" : "bb-pulse 1.6s ease-in-out infinite";
    } else if (effect === "glow") {
      el.style.animation = "bb-glow 2s ease-in-out infinite";
    } else if (effect === "shimmer") {
      el.style.backgroundImage = "linear-gradient(120deg," + badge.color + " 0%," + badge.color + " 30%,#fff9 50%," + badge.color + " 70%," + badge.color + " 100%)";
      el.style.backgroundSize = "200% auto";
      el.style.animation = "bb-shimmer 2.4s linear infinite";
    }
  }

  // ── Card detection ────────────────────────────────────────────────────────
  // Strategy A: known CSS selectors from popular themes
  var KNOWN_SELECTORS = [
    "[data-product-id]",
    ".product-card",
    ".product-item",
    ".product-block",
    ".product-grid-item",
    ".grid-product",
    ".card-wrapper",
    ".product-card-wrapper",
    ".boost-sd__product-item",     // Boost Commerce
    ".ais-hits--item",             // Algolia
    ".bc-product-grid-item",       // BC theme
    "[class*='ProductItem']",
    "[class*='product-card']",
    "[class*='product_card']",
    "[class*='productCard']",
    "[class*='product-item']",
    "[class*='grid-product']",
  ].join(",");

  // Strategy B: walk up from any product link to find its card ancestor
  function findCardsFromLinks() {
    var seen  = [];
    var links = document.querySelectorAll('a[href*="/products/"]');
    links.forEach(function (link) {
      var el = link.parentElement;
      var tries = 0;
      while (el && el !== document.body && tries < 8) {
        tries++;
        var rect = el.getBoundingClientRect();
        // A card is a block element taller than 80px that contains an image
        if (rect.height > 80 && el.querySelector("img")) {
          if (seen.indexOf(el) === -1) seen.push(el);
          break;
        }
        el = el.parentElement;
      }
    });
    return seen;
  }

  // Classes that indicate a card is a collection card, not a product card
  var COLLECTION_CARD_CLASSES = [
    "collection-card-wrapper",
    "collection-card",
    "collection-item",
    "collection-grid-item",
  ];

  function isCollectionCard(el) {
    return COLLECTION_CARD_CLASSES.some(function (cls) {
      return el.classList.contains(cls);
    });
  }

  function getCards() {
    var bySelector = Array.from(document.querySelectorAll(KNOWN_SELECTORS))
      .filter(function (el) { return !isCollectionCard(el); });
    if (bySelector.length) return bySelector;
    var byLink = findCardsFromLinks();
    return byLink;
  }

  // ── Image container inside a card ─────────────────────────────────────────
  var IMG_CONTAINER_SELECTORS = [
    ".card__media",
    ".card__image",
    ".product-card__image",
    ".product-card__image-wrapper",
    ".product__media",
    ".grid-product__image-wrapper",
    ".product-image-container",
    ".product-image",
    ".product-item__image-wrapper",
    "figure",
  ].join(",");

  function getImageContainer(card) {
    return (
      card.querySelector(IMG_CONTAINER_SELECTORS) ||
      (card.querySelector("img") ? card.querySelector("img").parentElement : null) ||
      card
    );
  }

  // ── Get product identifier from a card element ────────────────────────────
  // Returns numeric product ID if available, otherwise the product handle.
  // Handles are readable from <a href="/products/HANDLE"> which Dawn always has.
  function getProductId(card) {
    // 1. Numeric data-product-id attribute (some themes / apps add this)
    var id = card.dataset.productId || card.dataset.id || card.dataset.product;
    if (id && /^\d+$/.test(id)) return id;
    // 2. Child element with data-product-id
    var child = card.querySelector("[data-product-id]");
    if (child) {
      var cid = (child.dataset.productId || "").replace("gid://shopify/Product/", "");
      if (cid) return cid;
    }
    // 3. Handle from any product link inside the card — works in Dawn and most themes
    var link = card.querySelector("a[href*='/products/']");
    if (link) {
      var href = link.getAttribute("href") || "";
      var m = href.match(/\/products\/([^/?#]+)/);
      if (m) return m[1]; // e.g. "my-product-handle"
    }
    return null;
  }

  // ── Badge visibility: should this badge appear on this card? ──────────────
  // productId may be a numeric ID string or a product handle string.
  // targetIds may contain numeric IDs or handles — we accept either.
  function shouldShowBadge(badge, productId) {
    if (badge.targetType === "SPECIFIC") {
      if (!productId) return false;
      var ids = (badge.targetIds || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean);
      if (!ids.length) return false;
      var pid = String(productId).toLowerCase();
      return ids.some(function (id) {
        return String(id).toLowerCase() === pid;
      });
    }
    return true; // ALL
  }

  // ── Create a badge DOM element ─────────────────────────────────────────────
  function cpRadiusMap(corner, r) {
    var px = r + "px";
    return { TOP_LEFT: "0 0 " + px + " 0", TOP_RIGHT: "0 0 0 " + px, BOTTOM_LEFT: "0 " + px + " 0 0", BOTTOM_RIGHT: px + " 0 0 0" }[corner] || ("0 0 " + px + " 0");
  }

  function createBadgeElement(badge, card) {
    var isBar = badge.shape === "BAR";
    var isCp  = badge.shape === "CORNER_POP";
    var el    = document.createElement((isBar || isCp) ? "div" : "span");
    el.className = "badge-blitz-badge";
    el.dataset.shape    = badge.shape;
    el.dataset.position = badge.position || "";

    // ── CORNER_POP ──────────────────────────────────────────────────────────
    if (isCp) {
      var corner   = badge.position || "TOP_LEFT";
      var sz       = badge.size || 12;
      var isBottom = corner.indexOf("BOTTOM") !== -1;
      var isRight  = corner.indexOf("RIGHT")  !== -1;
      var vPad     = Math.round(sz * 0.55);
      var hPad     = Math.round(sz * 1.0);
      var r        = Math.round(sz * 1.4);
      el.style.cssText = [
        "position:absolute",
        isBottom ? "top:auto;bottom:0" : "top:0;bottom:auto",
        isRight  ? "left:auto;right:0" : "left:0;right:auto",
        "border-radius:" + cpRadiusMap(corner, r),
        "padding:" + vPad + "px " + hPad + "px",
        "font-size:" + sz + "px",
        "font-weight:700",
        "letter-spacing:0.4px",
        "line-height:1.2",
        "white-space:nowrap",
        "color:" + badge.textColor,
        "z-index:10",
        "pointer-events:none",
      ].join(";");
      if (badge.gradientEnabled && badge.gradientColorEnd) {
        el.style.background = "linear-gradient(" + (badge.gradientDirection || "to right") + "," + badge.color + "," + badge.gradientColorEnd + ")";
      } else {
        el.style.backgroundColor = badge.color;
      }
      applyDesignProps(el, badge);
      if (badge.showCountdown && badge.endsAt) {
        startCountdown(el, badge.endsAt);
      } else {
        el.textContent = badge.label;
      }
      var cpHoverOnly  = !!badge.hoverOnly;
      var cpSlideIn    = !!badge.slideIn;
      var cpDuration   = badge.hoverDuration || 300;
      var cpSlideOff   = { LEFT: "translateX(-300%)", RIGHT: "translateX(300%)", TOP: "translateY(-300%)", BOTTOM: "translateY(300%)" }[badge.slideFrom] || "translateX(-300%)";
      var cpHidden     = cpHoverOnly || cpSlideIn;
      el.style.transition = "transform 0.25s ease,box-shadow 0.25s ease" +
        (cpHidden  ? ",opacity " + cpDuration + "ms ease"                         : "") +
        (cpSlideIn ? ",transform " + cpDuration + "ms cubic-bezier(0.4,0,0.2,1)" : "");
      if (cpHidden)  el.style.opacity   = "0";
      if (cpSlideIn) el.style.transform = "scale(1) " + cpSlideOff;
      applyAnimEffect(el, badge, false);
      card.addEventListener("mouseenter", function () {
        el.style.transform = "scale(1.18)";
        el.style.boxShadow = "0 6px 18px rgba(0,0,0,0.32)";
        if (cpHidden) el.style.opacity = "1";
      });
      card.addEventListener("mouseleave", function () {
        el.style.transform = cpSlideIn ? "scale(1) " + cpSlideOff : "scale(1)";
        el.style.boxShadow = "none";
        if (cpHidden) el.style.opacity = "0";
      });
      return el;
    }

    // ── BAR ─────────────────────────────────────────────────────────────────
    if (isBar) {
      var yPct = badge.positionY != null ? badge.positionY : 0;
      el.style.cssText = [
        "position:absolute",
        "left:0;right:0;width:100%",
        "overflow:hidden",
        "clip-path:inset(0)",
        "padding:7px 0",
        "font-weight:700",
        "letter-spacing:0.5px",
        "font-size:" + (badge.size || 12) + "px",
        "color:" + badge.textColor,
        "top:" + yPct + "%",
        "transform:translateY(-50%)",
        "z-index:10",
        "pointer-events:none",
        "text-align:center",
      ].join(";");
      el.dataset.baseTransform = "translateY(-50%)";
      if (badge.gradientEnabled && badge.gradientColorEnd) {
        el.style.background = "linear-gradient(" + (badge.gradientDirection || "to right") + "," + badge.color + "," + badge.gradientColorEnd + ")";
      } else {
        el.style.backgroundColor = badge.color;
      }
      applyDesignProps(el, badge);
      applyAnimEffect(el, badge, true);
      if (badge.scrollingEnabled) {
        var inner = document.createElement("span");
        inner.className = "badge-blitz-bar__scroll";
        inner.textContent = (badge.label + "\u00a0\u00a0\u00b7\u00a0\u00a0").repeat(20);
        inner.style.setProperty("--bb-scroll-duration", (badge.scrollSpeed || 20) + "s");
        el.appendChild(inner);
      } else if (badge.showCountdown && badge.endsAt) {
        startCountdown(el, badge.endsAt);
      } else {
        el.textContent = badge.label;
      }
      return el;
    }

    // ── LINED starburst ───────────────────────────────────────────────────────
    if (badge.shape === "CIRCLE" && badge.edgeStyle === "LINED") {
      var ls  = badge.size || 12;
      var ld  = Math.round(ls * 3.8 + 8);
      var lCol = badge.borderColor || "#ffffff";
      var lBg  = (badge.gradientEnabled && badge.gradientColorEnd)
        ? "linear-gradient(" + (badge.gradientDirection || "to right") + "," + badge.color + "," + badge.gradientColorEnd + ")"
        : badge.color;
      el.style.cssText = [
        "position:absolute",
        "width:" + ld + "px;height:" + ld + "px",
        "left:" + (badge.positionX != null ? badge.positionX : 12) + "%",
        "top:"  + (badge.positionY != null ? badge.positionY : 12) + "%",
        "transform:translate(-50%,-50%)",
        "background:" + lCol,
        "clip-path:" + STARBURST,
        "display:flex;align-items:center;justify-content:center",
        "z-index:10;pointer-events:none",
        badge.shadowStyle && badge.shadowStyle !== "none" ? "box-shadow:" + shadowCSS(badge.shadowStyle, badge.color) : "",
      ].join(";");
      el.dataset.baseTransform = "translate(-50%,-50%)";
      var innerEl = document.createElement("span");
      innerEl.style.cssText = "width:84%;height:84%;clip-path:" + STARBURST + ";display:flex;align-items:center;justify-content:center;font-weight:700;font-size:" + ls + "px;color:" + badge.textColor + ";background:" + lBg;
      if (FONT_FAMILIES[badge.fontFamily]) innerEl.style.fontFamily = FONT_FAMILIES[badge.fontFamily];
      if (badge.textTransform && badge.textTransform !== "none") innerEl.style.textTransform = badge.textTransform;
      innerEl.textContent = badge.label;
      applyAnimEffect(innerEl, badge, false);
      el.appendChild(innerEl);
      return el;
    }

    // ── PILL / CIRCLE / default ──────────────────────────────────────────────
    var px = badge.positionX != null ? badge.positionX : 12;
    var py = badge.positionY != null ? badge.positionY : 12;
    var isCircle = badge.shape === "CIRCLE";
    var circleSize = Math.round((badge.size || 12) * 0.6);
    el.style.cssText = [
      "position:absolute",
      "left:" + px + "%;top:" + py + "%",
      "transform:translate(-50%,-50%)",
      "font-size:" + (badge.size || 12) + "px",
      "font-weight:700",
      "letter-spacing:0.4px",
      "line-height:1",
      "white-space:nowrap",
      "color:" + badge.textColor,
      "z-index:10",
      "pointer-events:none",
      isCircle ? ("padding:" + circleSize + "px;aspect-ratio:1;display:flex;align-items:center;justify-content:center;text-align:center;border-radius:" + (badge.edgeStyle === "RIDGED" ? "0" : "50%")) : "padding:4px 10px;border-radius:999px",
      isCircle && badge.edgeStyle === "RIDGED" ? "clip-path:" + STARBURST : "",
    ].join(";");
    if (badge.gradientEnabled && badge.gradientColorEnd) {
      el.style.background = "linear-gradient(" + (badge.gradientDirection || "to right") + "," + badge.color + "," + badge.gradientColorEnd + ")";
    } else {
      el.style.backgroundColor = badge.color;
    }
    el.dataset.baseTransform = "translate(-50%,-50%)";
    applyDesignProps(el, badge);
    applyAnimEffect(el, badge, false);

    if (badge.showCountdown && badge.endsAt) {
      startCountdown(el, badge.endsAt);
    } else if (badge.iconDataUrl) {
      var img = document.createElement("img");
      img.src = badge.iconDataUrl;
      img.style.cssText = "width:1.4em;height:1.4em;object-fit:contain;display:block;pointer-events:none";
      el.appendChild(img);
    } else {
      el.textContent = badge.label;
    }
    return el;
  }

  // ── Fetch badges from the API ──────────────────────────────────────────────
  function fetchBadges(callback) {
    var url = apiUrl.replace(/\/$/, "") + "/api/badges?shop=" + encodeURIComponent(shop);
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.timeout = 8000;
    xhr.ontimeout = function () { callback([]); };
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          try { callback(JSON.parse(xhr.responseText)); } catch (e) { callback([]); }
        } else {
          callback([]);
        }
      }
    };
    xhr.send();
  }

  // ── Inject badges into all product cards ──────────────────────────────────
  function injectBadges(badges) {
    if (!badges || !badges.length) return;

    var cards = getCards();
    console.log("[BadgeBlitz] injectBadges: " + cards.length + " product card(s) after collection filter.");
    if (!cards.length) {
      console.warn("[BadgeBlitz] No product cards found. Are you on a product listing page?");
      return;
    }

    cards.forEach(function (card, idx) {
      // Skip cards that already got a badge overlay from us
      if (card.querySelector(".bb-overlay")) return;

      var productId    = getProductId(card);
      var imgContainer = getImageContainer(card);
      if (idx === 0) {
        console.log("[BadgeBlitz] Card[0] productId:", productId, "| imgContainer:", imgContainer);
        badges.forEach(function (b) {
          console.log("[BadgeBlitz] Badge \"" + b.label + "\" targetType=" + b.targetType + " targetIds=[" + b.targetIds + "] productId=" + productId + " shouldShow=" + shouldShowBadge(b, productId));
        });
      }

      // Ensure the image container is positioned so our overlay can anchor to it
      var pos = getComputedStyle(imgContainer).position;
      if (pos === "static") imgContainer.style.position = "relative";

      // Create a transparent overlay div over the image area.
      // This is NOT clipped by overflow:hidden on the image container because
      // we rely on position:absolute + inset:0, which stays within bounds.
      // We set overflow:visible on the overlay itself so badges don't get cut.
      var overlay = document.createElement("div");
      overlay.className = "bb-overlay";
      imgContainer.appendChild(overlay);

      var positionUsed = {};

      badges.forEach(function (badge) {
        // Position-deduplication key
        var posKey;
        if (badge.shape === "CORNER_POP") {
          posKey = "CP:" + (badge.position || "TOP_LEFT");
        } else if (badge.shape === "BAR") {
          posKey = "BAR:" + Math.round(badge.positionY || 0);
        } else {
          posKey = (badge.positionX != null ? badge.positionX.toFixed(0) : "L") + ":" + (badge.positionY != null ? badge.positionY.toFixed(0) : "T");
        }
        if (positionUsed[posKey]) return;
        if (!shouldShowBadge(badge, productId)) return;
        positionUsed[posKey] = true;

        var el = createBadgeElement(badge, card);

        // Hover visibility (fade / slide-in)
        if (badge.shape !== "CORNER_POP") {
          if (badge.slideIn) {
            var slideOff = { LEFT: "translateX(-300%)", RIGHT: "translateX(300%)", TOP: "translateY(-300%)", BOTTOM: "translateY(300%)" }[badge.slideFrom] || "translateX(-300%)";
            var baseT = el.dataset.baseTransform || "";
            var dur   = (badge.hoverDuration || 300) + "ms";
            el.style.opacity   = "0";
            el.style.transform = (baseT + " " + slideOff).trim();
            el.style.transition = "transform " + dur + " cubic-bezier(0.4,0,0.2,1),opacity " + dur + " ease";
            card.addEventListener("mouseenter", function () { el.style.opacity = "1"; el.style.transform = baseT; });
            card.addEventListener("mouseleave", function () { el.style.opacity = "0"; el.style.transform = (baseT + " " + slideOff).trim(); });
          } else if (badge.hoverOnly) {
            el.style.opacity    = "0";
            el.style.transition = "opacity " + (badge.hoverDuration || 300) + "ms ease";
            card.addEventListener("mouseenter", function () { el.style.opacity = "1"; });
            card.addEventListener("mouseleave", function () { el.style.opacity = "0"; });
          }
        }

        // 3D tilt
        if (badge.animEffect === "3d" && badge.shape !== "BAR") {
          attach3DTilt(card, el);
        }

        overlay.appendChild(el);
      });

      // If no badges ended up in the overlay, remove it (keep DOM clean)
      if (!overlay.children.length) overlay.remove();
    });
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    fetchBadges(function (badges) {
      console.log("[BadgeBlitz] API returned " + badges.length + " badge(s):", badges);

      if (!badges.length) {
        console.warn("[BadgeBlitz] No active badges returned. Check shop param and DB.");
        return;
      }

      var cards = getCards();
      console.log("[BadgeBlitz] Found " + cards.length + " product card(s) on page.");
      if (cards.length) {
        console.log("[BadgeBlitz] First card element:", cards[0]);
        console.log("[BadgeBlitz] First card productId:", getProductId(cards[0]));
        console.log("[BadgeBlitz] First card imgContainer:", getImageContainer(cards[0]));
      }

      // First pass immediately
      injectBadges(badges);

      // Second pass after a short delay — catches themes that render cards async
      setTimeout(function () { injectBadges(badges); }, 800);

      // MutationObserver for SPA navigation / infinite scroll / filters
      // Disconnect while injecting to avoid re-triggering on our own DOM writes
      if (window.MutationObserver) {
        var debounceTimer;
        var injecting = false;
        var observer = new MutationObserver(function () {
          if (injecting) return;
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(function () {
            injecting = true;
            injectBadges(badges);
            injecting = false;
          }, 300);
        });
        observer.observe(document.body, { childList: true, subtree: true });
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
