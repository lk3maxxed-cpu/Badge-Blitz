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

  function fetchBadges(callback) {
    var url = apiUrl.replace(/\/$/, "") + "/api/badges?shop=" + encodeURIComponent(shop);
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.timeout = 6000;
    xhr.ontimeout = function () { callback([]); };
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          try {
            callback(JSON.parse(xhr.responseText));
          } catch (e) {
            callback([]);
          }
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
      (card.querySelector("[data-product-id]") &&
        card.querySelector("[data-product-id]").dataset.productId) ||
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
    // Look for common compare-at price or sale indicators across themes
    return !!(
      card.querySelector("[class*='compare'], [class*='was-price'], [class*='original-price'], s, del, .on-sale, [class*='sale-badge']") ||
      card.classList.contains("on-sale") ||
      card.classList.contains("sale")
    );
  }

  function shouldShowBadge(badge, card, productId) {
    // Targeting check
    if (badge.targetType === "SPECIFIC" && productId) {
      var ids = (badge.targetIds || "").split(",").map(function (s) { return s.trim(); });
      var numericId = productId.toString().replace("gid://shopify/Product/", "");
      var matched = ids.some(function (id) {
        return id === productId || id === numericId || id.indexOf(numericId) !== -1;
      });
      if (!matched) return false;
    }

    // SALE with auto-detect: only show if compare-at price is visible
    if (badge.type === "SALE" && badge.autoDiscount) {
      if (!hasSaleIndicator(card)) return false;
    }

    return true;
  }

  // Starburst clip-path for ridged circular badges (matches builder preview)
  function starburstPath(points, outer, inner) {
    var step = Math.PI / points;
    var pts = [];
    for (var i = 0; i < points * 2; i++) {
      var r = i % 2 === 0 ? outer : inner;
      var a = i * step - Math.PI / 2;
      pts.push((50 + r * Math.cos(a)).toFixed(1) + "% " + (50 + r * Math.sin(a)).toFixed(1) + "%");
    }
    return "polygon(" + pts.join(",") + ")";
  }
  var STARBURST = starburstPath(14, 50, 38);

  function applyBadgeStyles(el, badge) {
    var shape = badge.shape;
    var size = badge.size || 12;
    var isCircle = shape === "CIRCLE";

    el.style.fontSize = size + "px";
    el.style.color = badge.textColor;
    if (badge.gradientEnabled && badge.gradientColorEnd) {
      el.style.background = "linear-gradient(" + (badge.gradientDirection || "to right") + ", " + badge.color + ", " + badge.gradientColorEnd + ")";
    } else {
      el.style.backgroundColor = badge.color;
    }

    if (isCircle) {
      // Padding drives the size so text always fits; aspect-ratio keeps it round
      el.style.padding = Math.round(size * 0.6) + "px";
      el.style.aspectRatio = "1";
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.style.textAlign = "center";
      el.style.borderRadius = "50%";
      if (badge.edgeStyle === "RIDGED") {
        el.style.clipPath = STARBURST;
        el.style.borderRadius = "0";
      }
    }

    // Custom x/y position overrides the enum position
    if (badge.positionX != null && badge.positionY != null) {
      el.style.left = badge.positionX + "%";
      el.style.top = badge.positionY + "%";
      el.style.transform = "translate(-50%, -50%)";
    }
  }

  // Corner-tab border-radius helper (pixel-based so it stays tasteful regardless of badge size)
  function cpRadiusMap(corner, r) {
    var px = r + "px";
    return { TOP_LEFT: "0 0 " + px + " 0", TOP_RIGHT: "0 0 0 " + px, BOTTOM_LEFT: "0 " + px + " 0 0", BOTTOM_RIGHT: px + " 0 0 0" }[corner] || ("0 0 " + px + " 0");
  }

  function createBadgeElement(badge, card) {
    var isBar = badge.shape === "BAR";
    var isCp  = badge.shape === "CORNER_POP";
    var el = document.createElement((isBar || isCp) ? "div" : "span");
    el.className = "badge-blitz-badge";
    el.dataset.shape = badge.shape;
    el.dataset.position = badge.position;

    if (isCp) {
      var corner   = badge.position || "TOP_LEFT";
      var size     = badge.size || 12;
      var isBottom = corner.indexOf("BOTTOM") !== -1;
      var isRight  = corner.indexOf("RIGHT")  !== -1;
      var vPad     = Math.round(size * 0.55);
      var hPad     = Math.round(size * 1.0);
      var r        = Math.round(size * 1.4);

      el.style.position = "absolute";
      el.style.top      = isBottom ? "auto" : "0";
      el.style.bottom   = isBottom ? "0"    : "auto";
      el.style.left     = isRight  ? "auto" : "0";
      el.style.right    = isRight  ? "0"    : "auto";
      el.style.borderRadius = cpRadiusMap(corner, r);
      el.style.padding  = vPad + "px " + hPad + "px";
      el.style.fontSize = size + "px";
      el.style.fontWeight = "700";
      el.style.letterSpacing = "0.4px";
      el.style.lineHeight = "1.2";
      el.style.whiteSpace = "nowrap";
      el.style.transformOrigin = (isBottom ? "bottom" : "top") + " " + (isRight ? "right" : "left");
      el.style.transition = "transform 0.25s ease, box-shadow 0.25s ease";
      el.style.color = badge.textColor;
      if (badge.gradientEnabled && badge.gradientColorEnd) {
        el.style.background = "linear-gradient(" + (badge.gradientDirection || "to right") + ", " + badge.color + ", " + badge.gradientColorEnd + ")";
      } else {
        el.style.backgroundColor = badge.color;
      }
      el.textContent = badge.label;

      // Pop (scale up) on card hover; also handle hover-only / slide-in visibility
      var cpHoverOnly = !!badge.hoverOnly;
      var cpSlideIn   = !!badge.slideIn;
      var cpDuration  = badge.hoverDuration || 300;
      var cpSlideOffsets = { LEFT: "translateX(-300%)", RIGHT: "translateX(300%)", TOP: "translateY(-300%)", BOTTOM: "translateY(300%)" };
      var cpSlideOffset  = cpSlideIn ? (cpSlideOffsets[badge.slideFrom] || cpSlideOffsets.LEFT) : "";
      var cpHidden = cpHoverOnly || cpSlideIn;

      el.style.transition = "transform 0.25s ease, box-shadow 0.25s ease"
        + (cpHidden ? ", opacity " + cpDuration + "ms ease" : "")
        + (cpSlideIn ? ", transform " + cpDuration + "ms cubic-bezier(0.4,0,0.2,1)" : "");
      if (cpHidden) el.style.opacity = "0";
      if (cpSlideIn) el.style.transform = "scale(1) " + cpSlideOffset;

      card.addEventListener("mouseenter", function () {
        el.style.transform = "scale(1.18)";
        el.style.boxShadow = "0 6px 18px rgba(0,0,0,0.32)";
        if (cpHidden) el.style.opacity = "1";
      });
      card.addEventListener("mouseleave", function () {
        el.style.transform = cpSlideIn ? "scale(1) " + cpSlideOffset : "scale(1)";
        el.style.boxShadow = "none";
        if (cpHidden) el.style.opacity = "0";
      });

      return el;
    }

    if (isBar) {
      el.style.position = "absolute";
      el.style.left = "0";
      el.style.right = "0";
      el.style.width = "100%";
      el.style.overflow = "hidden";
      el.style.padding = "7px 0";
      el.style.fontWeight = "700";
      el.style.letterSpacing = "0.5px";
      el.style.fontSize = (badge.size || 12) + "px";
      el.style.color = badge.textColor;
      if (badge.gradientEnabled && badge.gradientColorEnd) {
        el.style.background = "linear-gradient(" + (badge.gradientDirection || "to right") + ", " + badge.color + ", " + badge.gradientColorEnd + ")";
      } else {
        el.style.backgroundColor = badge.color;
      }
      // Vertical position
      var yPct = badge.positionY != null ? badge.positionY : 0;
      el.style.top = yPct + "%";
      el.style.transform = "translateY(-50%)";

      if (badge.scrollingEnabled) {
        var inner = document.createElement("span");
        inner.className = "badge-blitz-bar__scroll";
        var seg = badge.label + "\u00a0\u00a0\u00b7\u00a0\u00a0";
        inner.textContent = seg.repeat(20);
        inner.style.setProperty("--bb-scroll-duration", (badge.scrollSpeed || 20) + "s");
        el.appendChild(inner);
      } else {
        el.textContent = badge.label;
        el.style.textAlign = "center";
      }
    } else {
      el.textContent = badge.label;
      applyBadgeStyles(el, badge);
    }

    return el;
  }

  function injectBadges(badges) {
    if (!badges.length) return;

    var cards = document.querySelectorAll(CARD_SELECTORS);
    if (!cards.length) return;

    cards.forEach(function (card) {
      // Skip if badges already injected on this card
      if (card.querySelector(".badge-blitz-badge")) return;

      var productId = getProductId(card);
      var imgContainer = getImageContainer(card);

      // Ensure the container is positioned so absolute children work
      if (getComputedStyle(imgContainer).position === "static") {
        imgContainer.style.position = "relative";
      }

      // One badge per position key — highest priority wins
      var positionUsed = {};

      badges.forEach(function (badge) {
        // Key per shape: CORNER_POP by corner, BAR by y, others by x:y or enum
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

        if (badge.slideIn) {
          var slideOffsets = { LEFT: "translateX(-300%)", RIGHT: "translateX(300%)", TOP: "translateY(-300%)", BOTTOM: "translateY(300%)" };
          var slideOffset = slideOffsets[badge.slideFrom] || slideOffsets.LEFT;
          var slideDur = (badge.hoverDuration || 300) + "ms";
          var baseT = el.style.transform || "";
          el.style.opacity = "0";
          el.style.transform = (baseT + " " + slideOffset).trim();
          el.style.transition = "transform " + slideDur + " cubic-bezier(0.4,0,0.2,1), opacity " + slideDur + " ease";
          card.addEventListener("mouseenter", function () { el.style.opacity = "1"; el.style.transform = baseT; });
          card.addEventListener("mouseleave", function () { el.style.opacity = "0"; el.style.transform = (baseT + " " + slideOffset).trim(); });
        } else if (badge.hoverOnly) {
          el.style.opacity = "0";
          el.style.transition = "opacity " + (badge.hoverDuration || 300) + "ms ease";
          card.addEventListener("mouseenter", function () { el.style.opacity = "1"; });
          card.addEventListener("mouseleave", function () { el.style.opacity = "0"; });
        }

        imgContainer.appendChild(el);
      });
    });
  }

  function init() {
    fetchBadges(function (badges) {
      if (!badges.length) return;

      injectBadges(badges);

      // Re-run when new product cards are added (infinite scroll, quick-view, etc.)
      if (window.MutationObserver) {
        var observer = new MutationObserver(function () {
          injectBadges(badges);
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
