/* Badge Blitz — Storefront Badge Injector */
(function () {
  "use strict";

  var shop = window.BadgeBlitzShop;
  var apiUrl = window.BadgeBlitzApiUrl;

  if (!shop || !apiUrl) return;

  // Product card selectors — covers Dawn, Debut, Brooklyn, and most popular themes
  var CARD_SELECTORS = [
    "[data-product-id]",
    ".product-card",
    ".product-item",
    ".grid-product",
    ".card-wrapper",
    ".product-block",
    ".product-grid-item",
    "[class*='product-card']",
    "[class*='productCard']",
    "[class*='product_card']",
  ].join(",");

  // Image container selectors within a card
  var IMG_CONTAINER_SELECTORS = [
    ".card__media",
    ".product-card__image",
    ".product__media",
    ".grid-product__image-wrapper",
    ".product-image-container",
    "figure",
    ".card__image",
  ].join(",");

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
      "@keyframes bb-confetti-fall{0%{transform:translateY(-20px) rotate(0deg);opacity:1}100%{transform:translateY(60px) rotate(360deg);opacity:0}}",
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

  // ── Confetti burst ─────────────────────────────────────────────────────────
  var CONFETTI_COLORS = ["#ff4136","#ffdc00","#2ecc40","#0074d9","#ff69b4","#ff8c00"];
  function triggerConfetti(el) {
    var rect = el.getBoundingClientRect();
    var container = el.offsetParent || document.body;
    var containerRect = container.getBoundingClientRect();
    var cx = rect.left - containerRect.left + rect.width / 2;
    var cy = rect.top  - containerRect.top  + rect.height / 2;

    for (var i = 0; i < 12; i++) {
      var dot = document.createElement("span");
      dot.style.cssText = [
        "position:absolute",
        "width:6px",
        "height:6px",
        "border-radius:50%",
        "pointer-events:none",
        "z-index:9999",
        "background:" + CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        "left:" + (cx + (Math.random() - 0.5) * 40) + "px",
        "top:" + cy + "px",
        "animation:bb-confetti-fall 0.7s ease forwards",
        "animation-delay:" + (i * 40) + "ms",
      ].join(";");
      container.appendChild(dot);
      setTimeout(function (d) { d.remove(); }, 900 + i * 40, dot);
    }
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
      var rotY =  dx * 18;
      var rotX = -dy * 18;
      var base = el.dataset.baseTransform || "";
      el.style.transform = base + " perspective(400px) rotateY(" + rotY + "deg) rotateX(" + rotX + "deg) scale(1.06)";
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

  // ── Apply shared design properties (font, border, shadow, etc.) ───────────
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

  // ── Apply animation style ──────────────────────────────────────────────────
  function applyAnimEffect(el, badge, isBar) {
    var effect = badge.animEffect;
    if (effect === "pulse") {
      el.style.animation = isBar ? "bb-pulse-bar 1.6s ease-in-out infinite" : "bb-pulse 1.6s ease-in-out infinite";
    } else if (effect === "glow") {
      el.style.animation = "bb-glow 2s ease-in-out infinite";
    } else if (effect === "shimmer") {
      var shimmerBg = "linear-gradient(120deg," + badge.color + " 0%," + badge.color + " 30%,#fff9 50%," + badge.color + " 70%," + badge.color + " 100%)";
      el.style.backgroundImage = shimmerBg;
      el.style.backgroundSize = "200% auto";
      el.style.animation = "bb-shimmer 2.4s linear infinite";
    }
    // confetti and 3d are handled in the event listener section
  }

  // ── Main badge element factory ─────────────────────────────────────────────
  function applyBadgeStyles(el, badge) {
    var shape = badge.shape;
    var size  = badge.size || 12;
    var isCircle = shape === "CIRCLE";

    el.style.fontSize = size + "px";
    el.style.color    = badge.textColor;
    if (badge.gradientEnabled && badge.gradientColorEnd) {
      el.style.background = "linear-gradient(" + (badge.gradientDirection || "to right") + ", " + badge.color + ", " + badge.gradientColorEnd + ")";
    } else {
      el.style.backgroundColor = badge.color;
    }

    if (isCircle) {
      el.style.padding       = Math.round(size * 0.6) + "px";
      el.style.aspectRatio   = "1";
      el.style.display       = "flex";
      el.style.alignItems    = "center";
      el.style.justifyContent = "center";
      el.style.textAlign     = "center";
      el.style.borderRadius  = "50%";
      if (badge.edgeStyle === "RIDGED") {
        el.style.clipPath    = STARBURST;
        el.style.borderRadius = "0";
      }
    }

    if (badge.positionX != null && badge.positionY != null) {
      el.style.left      = badge.positionX + "%";
      el.style.top       = badge.positionY + "%";
      el.style.transform = "translate(-50%, -50%)";
    }

    applyDesignProps(el, badge);
  }

  function cpRadiusMap(corner, r) {
    var px = r + "px";
    return { TOP_LEFT: "0 0 " + px + " 0", TOP_RIGHT: "0 0 0 " + px, BOTTOM_LEFT: "0 " + px + " 0 0", BOTTOM_RIGHT: px + " 0 0 0" }[corner] || ("0 0 " + px + " 0");
  }

  function fetchBadges(callback) {
    var url = apiUrl.replace(/\/$/, "") + "/api/badges?shop=" + encodeURIComponent(shop);
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.timeout = 6000;
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

  function getProductId(card) {
    return (
      card.dataset.productId ||
      card.dataset.id ||
      (card.querySelector("[data-product-id]") && card.querySelector("[data-product-id]").dataset.productId) ||
      null
    );
  }

  function getImageContainer(card) {
    return (
      card.querySelector(IMG_CONTAINER_SELECTORS) ||
      (card.querySelector("img") && card.querySelector("img").parentElement) ||
      card
    );
  }

  function hasSaleIndicator(card) {
    return !!(
      card.querySelector("[class*='compare'], [class*='was-price'], [class*='original-price'], s, del, .on-sale, [class*='sale-badge']") ||
      card.classList.contains("on-sale") ||
      card.classList.contains("sale")
    );
  }

  function shouldShowBadge(badge, card, productId) {
    if (badge.targetType === "SPECIFIC" && productId) {
      var ids = (badge.targetIds || "").split(",").map(function (s) { return s.trim(); });
      var numericId = productId.toString().replace("gid://shopify/Product/", "");
      var matched = ids.some(function (id) {
        return id === productId || id === numericId || id.indexOf(numericId) !== -1;
      });
      if (!matched) return false;
    }
    if (badge.type === "SALE" && badge.autoDiscount) {
      if (!hasSaleIndicator(card)) return false;
    }
    return true;
  }

  function createBadgeElement(badge, card) {
    var isBar = badge.shape === "BAR";
    var isCp  = badge.shape === "CORNER_POP";
    var el = document.createElement((isBar || isCp) ? "div" : "span");
    el.className = "badge-blitz-badge";
    el.dataset.shape    = badge.shape;
    el.dataset.position = badge.position;

    // ── CORNER_POP ──────────────────────────────────────────────────────────
    if (isCp) {
      var corner   = badge.position || "TOP_LEFT";
      var size     = badge.size || 12;
      var isBottom = corner.indexOf("BOTTOM") !== -1;
      var isRight  = corner.indexOf("RIGHT")  !== -1;
      var vPad     = Math.round(size * 0.55);
      var hPad     = Math.round(size * 1.0);
      var r        = Math.round(size * 1.4);

      el.style.position      = "absolute";
      el.style.top           = isBottom ? "auto" : "0";
      el.style.bottom        = isBottom ? "0"    : "auto";
      el.style.left          = isRight  ? "auto" : "0";
      el.style.right         = isRight  ? "0"    : "auto";
      el.style.borderRadius  = cpRadiusMap(corner, r);
      el.style.padding       = vPad + "px " + hPad + "px";
      el.style.fontSize      = size + "px";
      el.style.fontWeight    = "700";
      el.style.letterSpacing = "0.4px";
      el.style.lineHeight    = "1.2";
      el.style.whiteSpace    = "nowrap";
      el.style.transformOrigin = (isBottom ? "bottom" : "top") + " " + (isRight ? "right" : "left");
      el.style.color = badge.textColor;
      if (badge.gradientEnabled && badge.gradientColorEnd) {
        el.style.background = "linear-gradient(" + (badge.gradientDirection || "to right") + ", " + badge.color + ", " + badge.gradientColorEnd + ")";
      } else {
        el.style.backgroundColor = badge.color;
      }
      applyDesignProps(el, badge);

      if (badge.showCountdown && badge.endsAt) {
        startCountdown(el, badge.endsAt);
      } else {
        el.textContent = badge.label;
      }

      var cpHoverOnly   = !!badge.hoverOnly;
      var cpSlideIn     = !!badge.slideIn;
      var cpDuration    = badge.hoverDuration || 300;
      var cpSlideOffsets = { LEFT: "translateX(-300%)", RIGHT: "translateX(300%)", TOP: "translateY(-300%)", BOTTOM: "translateY(300%)" };
      var cpSlideOffset  = cpSlideIn ? (cpSlideOffsets[badge.slideFrom] || cpSlideOffsets.LEFT) : "";
      var cpHidden = cpHoverOnly || cpSlideIn;

      el.style.transition = "transform 0.25s ease, box-shadow 0.25s ease"
        + (cpHidden   ? ", opacity " + cpDuration + "ms ease" : "")
        + (cpSlideIn  ? ", transform " + cpDuration + "ms cubic-bezier(0.4,0,0.2,1)" : "");
      if (cpHidden)  el.style.opacity   = "0";
      if (cpSlideIn) el.style.transform = "scale(1) " + cpSlideOffset;

      applyAnimEffect(el, badge, false);

      card.addEventListener("mouseenter", function () {
        el.style.transform = "scale(1.18)";
        el.style.boxShadow = "0 6px 18px rgba(0,0,0,0.32)";
        if (cpHidden) el.style.opacity = "1";
        // confetti removed
      });
      card.addEventListener("mouseleave", function () {
        el.style.transform = cpSlideIn ? "scale(1) " + cpSlideOffset : "scale(1)";
        el.style.boxShadow = "none";
        if (cpHidden) el.style.opacity = "0";
      });

      return el;
    }

    // ── BAR ─────────────────────────────────────────────────────────────────
    if (isBar) {
      el.style.position = "absolute";
      el.style.left     = "0";
      el.style.right    = "0";
      el.style.width    = "100%";
      el.style.overflow = "hidden";
      el.style.padding  = "7px 0";
      el.style.fontWeight    = "700";
      el.style.letterSpacing = "0.5px";
      el.style.fontSize      = (badge.size || 12) + "px";
      el.style.color         = badge.textColor;
      if (badge.gradientEnabled && badge.gradientColorEnd) {
        el.style.background = "linear-gradient(" + (badge.gradientDirection || "to right") + ", " + badge.color + ", " + badge.gradientColorEnd + ")";
      } else {
        el.style.backgroundColor = badge.color;
      }
      var yPct = badge.positionY != null ? badge.positionY : 0;
      el.style.top       = yPct + "%";
      el.style.transform = "translateY(-50%)";
      el.dataset.baseTransform = "translateY(-50%)";
      applyDesignProps(el, badge);
      applyAnimEffect(el, badge, true);

      if (badge.scrollingEnabled) {
        var inner = document.createElement("span");
        inner.className = "badge-blitz-bar__scroll";
        var seg = badge.label + "\u00a0\u00a0\u00b7\u00a0\u00a0";
        inner.textContent = seg.repeat(20);
        inner.style.setProperty("--bb-scroll-duration", (badge.scrollSpeed || 20) + "s");
        el.appendChild(inner);
      } else if (badge.showCountdown && badge.endsAt) {
        el.style.textAlign = "center";
        startCountdown(el, badge.endsAt);
      } else {
        el.textContent = badge.label;
        el.style.textAlign = "center";
      }

      return el;
    }

    // ── LINED starburst — outer shell + inner badge ───────────────────────────
    if (badge.shape === "CIRCLE" && badge.edgeStyle === "LINED") {
      var ls   = badge.size || 12;
      var ld   = Math.round(ls * 3.8 + 8);
      var lCol = badge.borderColor || "#ffffff";
      var lBg  = (badge.gradientEnabled && badge.gradientColorEnd)
        ? "linear-gradient(" + (badge.gradientDirection || "to right") + "," + badge.color + "," + badge.gradientColorEnd + ")"
        : badge.color;

      el.style.position  = "absolute";
      el.style.width     = ld + "px";
      el.style.height    = ld + "px";
      el.style.background = lCol;
      el.style.clipPath  = STARBURST;
      el.style.display   = "flex";
      el.style.alignItems    = "center";
      el.style.justifyContent = "center";
      if (badge.shadowStyle && badge.shadowStyle !== "none") {
        el.style.boxShadow = shadowCSS(badge.shadowStyle, badge.color);
      }
      if (badge.positionX != null && badge.positionY != null) {
        el.style.left      = badge.positionX + "%";
        el.style.top       = badge.positionY + "%";
        el.style.transform = "translate(-50%, -50%)";
      }
      el.dataset.baseTransform = el.style.transform || "";

      var inner = document.createElement("span");
      inner.style.cssText = "width:84%;height:84%;clip-path:" + STARBURST + ";display:flex;align-items:center;justify-content:center;font-weight:700;font-size:" + ls + "px;color:" + badge.textColor;
      inner.style.background = lBg;
      if (FONT_FAMILIES[badge.fontFamily]) inner.style.fontFamily = FONT_FAMILIES[badge.fontFamily];
      if (badge.textTransform && badge.textTransform !== "none") inner.style.textTransform = badge.textTransform;
      inner.textContent = badge.label;
      applyAnimEffect(inner, badge, false);
      el.appendChild(inner);

      return el;
    }

    // ── PILL / CIRCLE / default ──────────────────────────────────────────────
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

    applyBadgeStyles(el, badge);
    el.dataset.baseTransform = el.style.transform || "";
    applyAnimEffect(el, badge, false);

    return el;
  }

  function injectBadges(badges) {
    if (!badges.length) return;

    var cards = document.querySelectorAll(CARD_SELECTORS);
    if (!cards.length) return;

    cards.forEach(function (card) {
      if (card.querySelector(".badge-blitz-badge")) return;

      var productId    = getProductId(card);
      var imgContainer = getImageContainer(card);

      if (getComputedStyle(imgContainer).position === "static") {
        imgContainer.style.position = "relative";
      }

      var positionUsed = {};

      badges.forEach(function (badge) {
        var posKey;
        if (badge.shape === "CORNER_POP") {
          posKey = "CP:" + (badge.position || "TOP_LEFT");
        } else if (badge.shape === "BAR") {
          posKey = "BAR:" + Math.round(badge.positionY || 0);
        } else if (badge.positionX != null && badge.positionY != null) {
          posKey = badge.positionX.toFixed(0) + ":" + badge.positionY.toFixed(0);
        } else {
          posKey = badge.position;
        }

        if (positionUsed[posKey]) return;
        if (!shouldShowBadge(badge, card, productId)) return;
        positionUsed[posKey] = true;

        var el = createBadgeElement(badge, card);

        // ── Hover-only / slide-in visibility ──────────────────────────────
        if (badge.shape !== "CORNER_POP") {
          if (badge.slideIn) {
            var slideOffsets = { LEFT: "translateX(-300%)", RIGHT: "translateX(300%)", TOP: "translateY(-300%)", BOTTOM: "translateY(300%)" };
            var slideOffset  = slideOffsets[badge.slideFrom] || slideOffsets.LEFT;
            var slideDur     = (badge.hoverDuration || 300) + "ms";
            var baseT        = el.dataset.baseTransform || "";
            el.style.opacity   = "0";
            el.style.transform = (baseT + " " + slideOffset).trim();
            el.style.transition = "transform " + slideDur + " cubic-bezier(0.4,0,0.2,1), opacity " + slideDur + " ease";
            card.addEventListener("mouseenter", function () { el.style.opacity = "1"; el.style.transform = baseT; });
            card.addEventListener("mouseleave", function () { el.style.opacity = "0"; el.style.transform = (baseT + " " + slideOffset).trim(); });
          } else if (badge.hoverOnly) {
            el.style.opacity    = "0";
            el.style.transition = "opacity " + (badge.hoverDuration || 300) + "ms ease";
            card.addEventListener("mouseenter", function () { el.style.opacity = "1"; });
            card.addEventListener("mouseleave", function () { el.style.opacity = "0"; });
          }
        }

        // ── 3D tilt ────────────────────────────────────────────────────────
        if (badge.animEffect === "3d" && badge.shape !== "BAR") {
          attach3DTilt(card, el);
        }

        // ── Confetti on hover (non-CP shapes) ──────────────────────────────
        if (badge.animEffect === "confetti" && badge.shape !== "CORNER_POP") {
          el.addEventListener("mouseenter", function () { triggerConfetti(el); });
        }

        imgContainer.appendChild(el);
      });
    });
  }

  function init() {
    fetchBadges(function (badges) {
      if (!badges.length) return;

      injectBadges(badges);

      if (window.MutationObserver) {
        var observer = new MutationObserver(function () { injectBadges(badges); });
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
