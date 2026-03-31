// app/routes/app._index.jsx
// Badge Blitz — Main Dashboard

import { useState, useRef, useCallback, useEffect, useLayoutEffect } from "react";
import { useFetcher, useLoaderData } from "react-router";
import {
  Page,
  Layout,
  Button,
  BlockStack,
  InlineStack,
  InlineGrid,
  Text,
  Banner,
  Divider,
  Box,
} from "@shopify/polaris";
import { authenticate, PLAN_PRO } from "../shopify.server";
import { data } from "react-router";
import db from "../db.server";

// ── Loader ──────────────────────────────────────────────────
export async function loader({ request }) {
  const { session, billing, admin } = await authenticate.admin(request);
  const { shop } = session;

  // Sync billing status from Shopify on every dashboard load
  const { hasActivePayment } = await billing.check({
    plans: [PLAN_PRO],
    isTest: process.env.NODE_ENV !== "production",
  });
  const plan = hasActivePayment ? "PRO" : "FREE";

  let shopRecord = await db.shop.findUnique({ where: { shopDomain: shop } });
  if (!shopRecord) {
    shopRecord = await db.shop.create({
      data: { shopDomain: shop, plan },
    });
  } else if (shopRecord.plan !== plan) {
    shopRecord = await db.shop.update({
      where: { shopDomain: shop },
      data: { plan },
    });
  }

  const badges = await db.badge.findMany({
    where: { shopId: shopRecord.id },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });

  // Fetch total product count + theme extension status in parallel (both non-critical)
  const EXT_UUID = "86fc0778-a9dd-715e-0846-a6675c2c69544ed3fb6a";
  let totalProductCount = null;
  let themeExtensionEnabled = null;
  try {
    const [countRes, themeRes] = await Promise.all([
      admin.graphql(`#graphql query { productsCount { count } }`),
      admin.graphql(`#graphql
        query {
          themes(first: 5, roles: [MAIN]) {
            nodes {
              id
              role
              files(filenames: ["config/settings_data.json"]) {
                nodes { body { ... on OnlineStoreThemeFileBodyText { content } } }
              }
            }
          }
        }
      `),
    ]);
    const countJson = await countRes.json();
    totalProductCount = countJson.data?.productsCount?.count ?? null;

    const themeJson = await themeRes.json();
    const mainTheme = themeJson.data?.themes?.nodes?.find((t) => t.role === "MAIN");
    const settingsContent = mainTheme?.files?.nodes?.[0]?.body?.content;
    if (settingsContent) {
      themeExtensionEnabled = settingsContent.includes(EXT_UUID);
    }
  } catch { /* non-critical */ }

  return data({
    shop,
    plan,
    badges,
    badgeCount: badges.length,
    totalProductCount,
    themeExtensionEnabled,
  });
}

// ── Action ──────────────────────────────────────────────────
export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const badgeId = formData.get("badgeId");

  if (intent === "delete") {
    await db.badge.delete({ where: { id: badgeId } });
    return data({ success: true });
  }

  if (intent === "create") {
    const { shop } = session;
    let shopRecord = await db.shop.findUnique({ where: { shopDomain: shop } });
    if (!shopRecord) {
      shopRecord = await db.shop.create({ data: { shopDomain: shop, plan: "FREE" } });
    }
    const label = formData.get("label");
    if (!label || !label.trim()) return data({ error: "Label is required." }, { status: 400 });
    const px = formData.get("px");
    const py = formData.get("py");
    const startsAtRaw = formData.get("startsAt");
    const endsAtRaw = formData.get("endsAt");
    await db.badge.create({
      data: {
        shopId: shopRecord.id,
        type: formData.get("type") || "CUSTOM",
        label: label.trim(),
        color: formData.get("color") || "#FF4136",
        textColor: formData.get("textColor") || "#FFFFFF",
        shape: formData.get("shape") || "PILL",
        position: formData.get("position") || "TOP_LEFT",
        size: parseInt(formData.get("size") || "12", 10),
        edgeStyle: formData.get("edgeStyle") || "SMOOTH",
        positionX: px ? parseFloat(px) : null,
        positionY: py ? parseFloat(py) : null,
        gradientEnabled: formData.get("gradientEnabled") === "true",
        gradientColorEnd: formData.get("gradientColorEnd") || null,
        gradientDirection: formData.get("gradientDirection") || "to right",
        hoverOnly: formData.get("hoverOnly") === "true",
        hoverDuration: parseInt(formData.get("hoverDuration") || "300", 10),
        slideIn: formData.get("slideIn") === "true",
        slideFrom: formData.get("slideFrom") || "LEFT",
        scrollingEnabled: formData.get("scrollingEnabled") === "true",
        scrollSpeed: parseInt(formData.get("scrollSpeed") || "20", 10),
        autoDiscount: false,
        stockThreshold: parseInt(formData.get("stockThreshold") || "5", 10),
        targetType: formData.get("targetType") || "ALL",
        targetIds: formData.get("targetIds") || null,
        collectionIds: formData.get("collectionIds") || null,
        iconDataUrl: formData.get("iconDataUrl") || null,
        startsAt: startsAtRaw ? new Date(startsAtRaw) : null,
        endsAt: endsAtRaw ? new Date(endsAtRaw) : null,
        fontFamily: formData.get("fontFamily") || "system",
        textTransform: formData.get("textTransform") || "none",
        borderWidth: parseInt(formData.get("borderWidth") || "0", 10),
        borderColor: formData.get("borderColor") || "#ffffff",
        shadowStyle: formData.get("shadowStyle") || "none",
        animEffect: formData.get("animEffect") || "none",
        showCountdown: formData.get("showCountdown") === "true",
        priority: 0,
        active: true,
      },
    });
    return data({ success: true });
  }

  if (intent === "update") {
    const label = formData.get("label");
    if (!label || !label.trim()) return data({ error: "Label is required." }, { status: 400 });
    const px = formData.get("px");
    const py = formData.get("py");
    const startsAtRaw = formData.get("startsAt");
    const endsAtRaw = formData.get("endsAt");
    await db.badge.update({
      where: { id: badgeId },
      data: {
        type: formData.get("type") || "CUSTOM",
        label: label.trim(),
        color: formData.get("color") || "#FF4136",
        textColor: formData.get("textColor") || "#FFFFFF",
        shape: formData.get("shape") || "PILL",
        position: formData.get("position") || "TOP_LEFT",
        size: parseInt(formData.get("size") || "12", 10),
        edgeStyle: formData.get("edgeStyle") || "SMOOTH",
        positionX: px ? parseFloat(px) : null,
        positionY: py ? parseFloat(py) : null,
        gradientEnabled: formData.get("gradientEnabled") === "true",
        gradientColorEnd: formData.get("gradientColorEnd") || null,
        gradientDirection: formData.get("gradientDirection") || "to right",
        hoverOnly: formData.get("hoverOnly") === "true",
        hoverDuration: parseInt(formData.get("hoverDuration") || "300", 10),
        slideIn: formData.get("slideIn") === "true",
        slideFrom: formData.get("slideFrom") || "LEFT",
        scrollingEnabled: formData.get("scrollingEnabled") === "true",
        scrollSpeed: parseInt(formData.get("scrollSpeed") || "20", 10),
        stockThreshold: parseInt(formData.get("stockThreshold") || "5", 10),
        targetType: formData.get("targetType") || "ALL",
        targetIds: formData.get("targetIds") || null,
        collectionIds: formData.get("collectionIds") || null,
        iconDataUrl: formData.get("iconDataUrl") || null,
        startsAt: startsAtRaw ? new Date(startsAtRaw) : null,
        endsAt: endsAtRaw ? new Date(endsAtRaw) : null,
        fontFamily: formData.get("fontFamily") || "system",
        textTransform: formData.get("textTransform") || "none",
        borderWidth: parseInt(formData.get("borderWidth") || "0", 10),
        borderColor: formData.get("borderColor") || "#ffffff",
        shadowStyle: formData.get("shadowStyle") || "none",
        animEffect: formData.get("animEffect") || "none",
        showCountdown: formData.get("showCountdown") === "true",
      },
    });
    return data({ success: true });
  }

  if (intent === "duplicate") {
    const src = await db.badge.findUnique({ where: { id: badgeId } });
    if (!src) return data({ error: "Badge not found." }, { status: 404 });
    const { id: _id, createdAt: _c, updatedAt: _u, syncedTargetIds: _s, ...rest } = src;
    await db.badge.create({ data: { ...rest, label: rest.label + " (copy)", active: false, priority: 0 } });
    return data({ success: true });
  }

  if (intent === "bulk-toggle") {
    const ids = JSON.parse(formData.get("badgeIds") || "[]");
    const active = formData.get("active") === "true";
    await db.badge.updateMany({ where: { id: { in: ids } }, data: { active } });
    return data({ success: true });
  }

  if (intent === "product-badges") {
    const { session } = await authenticate.admin(request);
    const { shop } = session;
    const shopRecord = await db.shop.findUnique({ where: { shopDomain: shop } });
    if (!shopRecord) return data({ error: "Shop not found." }, { status: 400 });

    const productId = formData.get("productId")?.trim();
    if (!productId) return data({ error: "Product ID required." }, { status: 400 });
    const selectedIds = JSON.parse(formData.get("selectedBadgeIds") || "[]");

    const allBadges = await db.badge.findMany({ where: { shopId: shopRecord.id } });
    await Promise.all(allBadges.map((badge) => {
      const current = badge.targetIds ? badge.targetIds.split(",").map((s) => s.trim()).filter(Boolean) : [];
      const has = current.includes(productId);
      const want = selectedIds.includes(badge.id);
      if (has === want) return Promise.resolve();
      const updated = want ? [...new Set([...current, productId])] : current.filter((id) => id !== productId);
      return db.badge.update({
        where: { id: badge.id },
        data: {
          targetIds: updated.length ? updated.join(",") : null,
          targetType: updated.length ? "SPECIFIC" : "ALL",
        },
      });
    }));
    return data({ success: true });
  }

  if (intent === "reorder") {
    const direction = formData.get("direction"); // "up" | "down"
    const { shop } = session;
    const shopRecord = await db.shop.findUnique({ where: { shopDomain: shop } });
    if (!shopRecord) return data({ error: "Shop not found." }, { status: 400 });
    const allBadges = await db.badge.findMany({
      where: { shopId: shopRecord.id },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });
    const idx = allBadges.findIndex((b) => b.id === badgeId);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (idx === -1 || swapIdx < 0 || swapIdx >= allBadges.length) return data({ success: true });
    const a = allBadges[idx];
    const b = allBadges[swapIdx];
    const aP = a.priority ?? 0;
    const bP = b.priority ?? 0;
    await Promise.all([
      db.badge.update({ where: { id: a.id }, data: { priority: bP === aP ? (direction === "up" ? aP + 1 : aP - 1) : bP } }),
      db.badge.update({ where: { id: b.id }, data: { priority: bP === aP ? (direction === "up" ? bP - 1 : bP + 1) : aP } }),
    ]);
    return data({ success: true });
  }

  // default: toggle active
  const active = formData.get("active") === "true";
  await db.badge.update({ where: { id: badgeId }, data: { active } });
  return data({ success: true });
}

// ── CropModal ────────────────────────────────────────────────
const CROP_SIZE = 300; // viewport px

function CropModal({ src, onApply, onCancel }) {
  const imgRef = useRef(null);
  const [naturalSize, setNaturalSize] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef(null);

  const minZoom = naturalSize
    ? Math.max(CROP_SIZE / naturalSize.w, CROP_SIZE / naturalSize.h)
    : 1;

  const clamp = useCallback((x, y, z, ns) => {
    if (!ns) return { x, y };
    return {
      x: Math.min(0, Math.max(CROP_SIZE - ns.w * z, x)),
      y: Math.min(0, Math.max(CROP_SIZE - ns.h * z, y)),
    };
  }, []);

  const handleImageLoad = useCallback(() => {
    const { naturalWidth: w, naturalHeight: h } = imgRef.current;
    const ns = { w, h };
    setNaturalSize(ns);
    const mz = Math.max(CROP_SIZE / w, CROP_SIZE / h);
    setZoom(mz);
    setOffset({ x: (CROP_SIZE - w * mz) / 2, y: (CROP_SIZE - h * mz) / 2 });
  }, []);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setDragging(true);
    dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };

  const handleMouseMove = (e) => {
    if (!dragging || !dragStart.current || !naturalSize) return;
    const raw = { x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y };
    setOffset(clamp(raw.x, raw.y, zoom, naturalSize));
  };

  const stopDrag = () => setDragging(false);

  const handleZoomChange = (newZ) => {
    setZoom(newZ);
    setOffset((prev) => clamp(prev.x, prev.y, newZ, naturalSize));
  };

  const handleApply = () => {
    const OUTPUT = 600;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext("2d");
    const img = imgRef.current;
    ctx.drawImage(
      img,
      -offset.x / zoom, -offset.y / zoom,   // source x, y in original image
      CROP_SIZE / zoom, CROP_SIZE / zoom,     // source width, height
      0, 0, OUTPUT, OUTPUT                    // destination
    );
    onApply(canvas.toDataURL("image/jpeg", 0.92));
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
      <div style={{ background: "#111", borderRadius: 14, padding: 28, width: CROP_SIZE + 56, boxShadow: "0 24px 60px rgba(0,0,0,0.6)" }}>
        <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Crop product photo</div>

        {/* Crop viewport */}
        <div
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={stopDrag}
          onMouseLeave={stopDrag}
          style={{
            width: CROP_SIZE, height: CROP_SIZE, overflow: "hidden", borderRadius: 8,
            position: "relative", cursor: dragging ? "grabbing" : "grab",
            border: "2px solid #333", background: "#000",
          }}
        >
          {/* The image — invisible until naturalSize is ready so there's no jump */}
          <img
            ref={imgRef}
            src={src}
            onLoad={handleImageLoad}
            draggable={false}
            style={naturalSize ? {
              position: "absolute",
              left: offset.x, top: offset.y,
              width: naturalSize.w * zoom, height: naturalSize.h * zoom,
              pointerEvents: "none", userSelect: "none",
            } : { opacity: 0, position: "absolute" }}
          />

          {/* Rule-of-thirds overlay */}
          {naturalSize && (
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
              <div style={{ position: "absolute", left: "33.3%", top: 0, bottom: 0, borderLeft: "1px solid rgba(255,255,255,0.12)" }} />
              <div style={{ position: "absolute", left: "66.6%", top: 0, bottom: 0, borderLeft: "1px solid rgba(255,255,255,0.12)" }} />
              <div style={{ position: "absolute", top: "33.3%", left: 0, right: 0, borderTop: "1px solid rgba(255,255,255,0.12)" }} />
              <div style={{ position: "absolute", top: "66.6%", left: 0, right: 0, borderTop: "1px solid rgba(255,255,255,0.12)" }} />
              <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.2)", borderRadius: 6 }} />
            </div>
          )}

          {/* Loading state */}
          {!naturalSize && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.3)", fontSize: 12 }}>
              Loading…
            </div>
          )}
        </div>

        {/* Zoom slider */}
        <div style={{ marginTop: 16 }}>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
            Zoom
          </div>
          <input
            type="range"
            min={minZoom}
            max={minZoom * 4}
            step={0.001}
            value={zoom}
            onChange={(e) => handleZoomChange(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#fff", cursor: "pointer" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(255,255,255,0.25)", fontSize: 10, marginTop: 2 }}>
            <span>Fit</span><span>Close up</span>
          </div>
        </div>

        <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, marginTop: 12, textAlign: "center" }}>
          Drag to reposition · scroll the slider to zoom
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{ background: "#222", color: "#aaa", border: "1px solid #444", borderRadius: 4, padding: "8px 18px", fontSize: 12, cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!naturalSize}
            style={{ background: naturalSize ? "#fff" : "#444", color: naturalSize ? "#000" : "#888", border: "none", borderRadius: 4, padding: "8px 18px", fontSize: 12, fontWeight: 700, cursor: naturalSize ? "pointer" : "default" }}
          >
            Apply crop
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Label suggestions (grouped) ──────────────────────────────
const LABEL_SUGGESTIONS = [
  {
    group: "Social Proof & Trust",
    labels: ["Best Seller", "Customer Favorite", "Staff Pick", "Top Rated", "5★ Reviewed"],
  },
  {
    group: "Urgency & Scarcity",
    labels: ["Only 3 Left", "Selling Fast", "Limited Edition", "Today Only", "Almost Gone"],
  },
  {
    group: "Value & Savings",
    labels: ["Save 20%", "Bundle & Save", "Free Shipping", "Best Value", "Price Drop"],
  },
  {
    group: "Product Attributes",
    labels: ["New Arrival", "Eco-Friendly", "Handmade", "Vegan", "Organic", "Made in USA", "Sustainable"],
  },
  {
    group: "Loyalty & Exclusivity",
    labels: ["Members Only", "Early Access", "Rewards Eligible", "VIP Pick"],
  },
  {
    group: "Seasonal / Events",
    labels: ["Holiday Gift Idea", "Back to School", "Black Friday Deal", "Summer Sale", "Flash Sale"],
  },
];

// ── CustomBadgeBuilder ───────────────────────────────────────
const COLOR_PRESETS = [
  "#000000", "#E53E3E", "#276749", "#C05621",
  "#553C9A", "#2B6CB0", "#B7791F", "#FFFFFF",
];
const SHAPES = ["PILL", "SQUARE", "CIRCLE", "RIBBON", "BAR", "CORNER_POP"];

// Corner-tab border-radius helper — only the inward-facing corner is rounded
function cpRadius(corner, r) {
  const px = r + "px";
  return {
    TOP_LEFT:     `0 0 ${px} 0`,
    TOP_RIGHT:    `0 0 0 ${px}`,
    BOTTOM_LEFT:  `0 ${px} 0 0`,
    BOTTOM_RIGHT: `${px} 0 0 0`,
  }[corner] || `0 0 ${px} 0`;
}
// Maps snap key → CSS position corner
const SNAP_TO_CORNER = { TL: "TOP_LEFT", TR: "TOP_RIGHT", BL: "BOTTOM_LEFT", BR: "BOTTOM_RIGHT" };

// Generates a starburst clip-path for ridged circular badges
function starburstPath(points = 14, outer = 50, inner = 38) {
  const step = Math.PI / points;
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = i * step - Math.PI / 2;
    pts.push(`${(50 + r * Math.cos(a)).toFixed(1)}% ${(50 + r * Math.sin(a)).toFixed(1)}%`);
  }
  return `polygon(${pts.join(",")})`;
}
const STARBURST = starburstPath();

const GRADIENT_DIRECTIONS = [
  { label: "↗", value: "to top right" },
  { label: "↑", value: "to top" },
  { label: "↖", value: "to top left" },
  { label: "→", value: "to right" },
  { label: "↔", value: "135deg" },  // diagonal reference point (center unused)
  { label: "←", value: "to left" },
  { label: "↘", value: "to bottom right" },
  { label: "↓", value: "to bottom" },
  { label: "↙", value: "to bottom left" },
];

const FONT_FAMILIES = {
  system:    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  impact:    "Impact, 'Haettenschweiler', 'Arial Narrow Bold', sans-serif",
  georgia:   "Georgia, 'Times New Roman', serif",
  courier:   "'Courier New', Courier, monospace",
  trebuchet: "'Trebuchet MS', Helvetica, sans-serif",
};

function shadowCSS(shadowStyle, color) {
  if (shadowStyle === "soft") return "0 2px 10px rgba(0,0,0,0.30)";
  if (shadowStyle === "hard") return "3px 3px 0px rgba(0,0,0,0.85)";
  if (shadowStyle === "glow") return `0 0 12px ${color}, 0 0 24px ${color}66`;
  return "none";
}

function buildBadgeStyle({ color, textColor, shape, edgeStyle, size, px, py, gradientEnabled, gradientColorEnd, gradientDirection, cpCorner, cpExpanded, fontFamily, textTransform, borderWidth, borderColor, shadowStyle }) {
  const isCircle = shape === "CIRCLE";
  const isBar = shape === "BAR";
  const isCp = shape === "CORNER_POP";
  const bg = gradientEnabled && gradientColorEnd
    ? `linear-gradient(${gradientDirection || "to right"}, ${color}, ${gradientColorEnd})`
    : color;

  // Shared style extensions from new design fields
  const sharedExtra = {
    fontFamily: FONT_FAMILIES[fontFamily] || FONT_FAMILIES.system,
    textTransform: textTransform === "none" ? undefined : textTransform,
    ...(borderWidth > 0 ? { border: `${borderWidth}px solid ${borderColor}`, boxSizing: "border-box" } : {}),
    boxShadow: shadowStyle !== "none" ? shadowCSS(shadowStyle, color) : undefined,
  };

  if (isCp) {
    const corner = cpCorner || "TOP_LEFT";
    const isBottom = corner.includes("BOTTOM");
    const isRight  = corner.includes("RIGHT");
    const vPad = Math.round(size * 0.55);
    const hPad = Math.round(size * 1.0);
    const r    = Math.round(size * 1.4);
    return {
      position: "absolute",
      top:    isBottom ? "auto" : 0,
      bottom: isBottom ? 0     : "auto",
      left:   isRight  ? "auto" : 0,
      right:  isRight  ? 0     : "auto",
      borderRadius: cpRadius(corner, r),
      background: bg,
      color: textColor,
      fontSize: size,
      fontWeight: 700,
      letterSpacing: "0.4px",
      lineHeight: 1.2,
      whiteSpace: "nowrap",
      padding: `${vPad}px ${hPad}px`,
      transform: cpExpanded ? "scale(1.18)" : "scale(1)",
      transformOrigin: `${isBottom ? "bottom" : "top"} ${isRight ? "right" : "left"}`,
      boxShadow: cpExpanded ? "0 6px 18px rgba(0,0,0,0.32)" : (sharedExtra.boxShadow || "none"),
      transition: "transform 0.25s ease, box-shadow 0.25s ease",
      cursor: "default",
      userSelect: "none",
      zIndex: 2,
      ...sharedExtra,
    };
  }

  if (isBar) {
    return {
      position: "absolute",
      left: 0, right: 0, width: "100%",
      top: `${py}%`,
      transform: "translateY(-50%)",
      background: bg,
      color: textColor,
      fontSize: size,
      fontWeight: 700,
      letterSpacing: "0.5px",
      overflow: "hidden",
      padding: "7px 0",
      textAlign: "center",
      whiteSpace: "nowrap",
      cursor: "ns-resize",
      userSelect: "none",
      zIndex: 2,
      ...sharedExtra,
    };
  }

  return {
    position: "absolute",
    left: `${px}%`,
    top: `${py}%`,
    transform: "translate(-50%, -50%)",
    background: bg,
    color: textColor,
    fontSize: size,
    fontWeight: 700,
    letterSpacing: "0.4px",
    lineHeight: 1.2,
    whiteSpace: "nowrap",
    cursor: "grab",
    userSelect: "none",
    padding: isCircle
      ? `${Math.round(size * 0.6)}px`
      : shape === "PILL" ? "4px 10px"
      : shape === "RIBBON" ? "4px 12px 4px 8px"
      : "4px 8px",
    borderRadius: shape === "PILL" ? 999 : isCircle ? "50%" : shape === "SQUARE" ? 4 : "0 4px 4px 0",
    clipPath: isCircle && edgeStyle === "RIDGED" ? STARBURST : "none",
    aspectRatio: isCircle ? "1" : "auto",
    display: isCircle ? "flex" : "block",
    alignItems: isCircle ? "center" : "unset",
    justifyContent: isCircle ? "center" : "unset",
    textAlign: isCircle ? "center" : "unset",
    ...sharedExtra,
  };
}

function CustomBadgeBuilder({ disabled, previewImage, onImageChange, editingBadge, onEditDone }) {
  const fetcher = useFetcher();
  const [label, setLabel] = useState("My Badge");
  const [color, setColor] = useState("#000000");
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [shape, setShape] = useState("PILL");
  const [edgeStyle, setEdgeStyle] = useState("SMOOTH");
  const [size, setSize] = useState(12);
  const [pos, setPos] = useState({ x: 50, y: 50 }); // will be corrected by mount snap
  const [dragging, setDragging] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [gradientEnabled, setGradientEnabled] = useState(false);
  const [gradientColorEnd, setGradientColorEnd] = useState("#553C9A");
  const [gradientDirection, setGradientDirection] = useState("to right");
  const [hoverOnly, setHoverOnly] = useState(false);
  const [hoverDuration, setHoverDuration] = useState(300);
  const [slideIn, setSlideIn] = useState(false);
  const [slideFrom, setSlideFrom] = useState("LEFT");
  const [previewHovered, setPreviewHovered] = useState(false);
  const [scrollingEnabled, setScrollingEnabled] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(20);
  const [targetType, setTargetType] = useState("ALL");
  const [targetIds, setTargetIds] = useState("");
  const [collectionIds, setCollectionIds] = useState("");
  const [badgeType, setBadgeType] = useState("CUSTOM");
  const [stockThreshold, setStockThreshold] = useState(5);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [iconDataUrl, setIconDataUrl] = useState(null);
  const [fontFamily, setFontFamily] = useState("system");
  const [textTransform, setTextTransform] = useState("none");
  const [borderWidth, setBorderWidth] = useState(0);
  const [borderColor, setBorderColor] = useState("#ffffff");
  const [shadowStyle, setShadowStyle] = useState("none");
  const [animEffect, setAnimEffect] = useState("none");
  const [showCountdown, setShowCountdown] = useState(false);
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);
  const iconFileInputRef = useRef(null);
  const csvFileInputRef = useRef(null);
  const productFetcher = useFetcher();
  const [productIdInput, setProductIdInput] = useState("");

  const [rawImage, setRawImage] = useState(null);

  // Populate builder state when an existing badge is loaded for editing
  useEffect(() => {
    if (!editingBadge) return;
    setLabel(editingBadge.label || "My Badge");
    setColor(editingBadge.color || "#000000");
    setTextColor(editingBadge.textColor || "#FFFFFF");
    setShape(editingBadge.shape || "PILL");
    setSize(editingBadge.size || 12);
    setEdgeStyle(editingBadge.edgeStyle || "SMOOTH");
    setGradientEnabled(!!editingBadge.gradientEnabled);
    setGradientColorEnd(editingBadge.gradientColorEnd || "#553C9A");
    setGradientDirection(editingBadge.gradientDirection || "to right");
    setHoverOnly(!!editingBadge.hoverOnly);
    setHoverDuration(editingBadge.hoverDuration || 300);
    setSlideIn(!!editingBadge.slideIn);
    setSlideFrom(editingBadge.slideFrom || "LEFT");
    setScrollingEnabled(!!editingBadge.scrollingEnabled);
    setScrollSpeed(editingBadge.scrollSpeed || 20);
    setTargetType(editingBadge.targetType || "ALL");
    setTargetIds(editingBadge.targetIds || "");
    setCollectionIds(editingBadge.collectionIds || "");
    setBadgeType(editingBadge.type || "CUSTOM");
    setStockThreshold(editingBadge.stockThreshold || 5);
    setIconDataUrl(editingBadge.iconDataUrl || null);
    setFontFamily(editingBadge.fontFamily || "system");
    setTextTransform(editingBadge.textTransform || "none");
    setBorderWidth(editingBadge.borderWidth ?? 0);
    setBorderColor(editingBadge.borderColor || "#ffffff");
    setShadowStyle(editingBadge.shadowStyle || "none");
    setAnimEffect(editingBadge.animEffect || "none");
    setShowCountdown(!!editingBadge.showCountdown);
    setStartsAt(editingBadge.startsAt ? new Date(editingBadge.startsAt).toISOString().slice(0, 16) : "");
    setEndsAt(editingBadge.endsAt ? new Date(editingBadge.endsAt).toISOString().slice(0, 16) : "");
    if (editingBadge.positionX != null && editingBadge.positionY != null) {
      setPos({ x: editingBadge.positionX, y: editingBadge.positionY });
    } else {
      const posMap = { TOP_LEFT: { x: 15, y: 15 }, TOP_RIGHT: { x: 85, y: 15 }, BOTTOM_LEFT: { x: 15, y: 85 }, BOTTOM_RIGHT: { x: 85, y: 85 } };
      setPos(posMap[editingBadge.position] || { x: 22, y: 12 });
    }
    if (editingBadge.shape === "CORNER_POP") {
      const reverseSnap = { TOP_LEFT: "TL", TOP_RIGHT: "TR", BOTTOM_LEFT: "BL", BOTTOM_RIGHT: "BR" };
      setSnappedCorner(reverseSnap[editingBadge.position] || "TL");
    }
  }, [editingBadge]);

  // When product image loads via productFetcher, push it into the preview
  useEffect(() => {
    if (productFetcher.data?.imageUrl) onImageChange(productFetcher.data.imageUrl);
  }, [productFetcher.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleImageUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setRawImage(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  }, []);

  const handleIconUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 150_000) { alert("Icon file too large — please use an image under 150 KB."); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setIconDataUrl(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  }, []);

  const handleCsvUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const ids = text.split(/[\r\n,]+/)
        .map((s) => s.trim().replace(/^gid:\/\/shopify\/Product\//i, "").replace(/[^0-9]/g, ""))
        .filter((s) => s.length >= 8);
      const deduped = [...new Set(ids)];
      setTargetIds((prev) => {
        const existing = prev.split(",").map((s) => s.trim()).filter(Boolean);
        return [...new Set([...existing, ...deduped])].join(", ");
      });
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  // Inject animation keyframes once for builder preview
  useEffect(() => {
    const id = "bb-anim-kf";
    if (!document.getElementById(id)) {
      const s = document.createElement("style");
      s.id = id;
      s.textContent = [
        "@keyframes bb-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}",
        "@keyframes bb-pulse{0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-50%) scale(1.12)}}",
        "@keyframes bb-pulse-bar{0%,100%{transform:translateY(-50%) scale(1)}50%{transform:translateY(-50%) scale(1.04)}}",
        "@keyframes bb-glow{0%,100%{opacity:1;filter:brightness(1)}50%{opacity:0.85;filter:brightness(1.35)}}",
        "@keyframes bb-shimmer{0%{background-position:200% center}100%{background-position:-200% center}}",
      ].join("\n");
      document.head.appendChild(s);
    }
  }, []);

  // Reset position state when switching shapes
  useEffect(() => {
    if (shape === "BAR") {
      setPos({ x: 50, y: 10 });
      setSnappedCorner(null);
    } else if (shape === "CORNER_POP") {
      setSnappedCorner("TL"); // default top-left
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape]);
  const badgeRef = useRef(null);
  const [snappedCorner, setSnappedCorner] = useState("TL");

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setDragging(true);
    setSnappedCorner(null);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!dragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cW = containerRef.current.offsetWidth;
    const cH = containerRef.current.offsetHeight;
    const bW = badgeRef.current ? badgeRef.current.offsetWidth  : 0;
    const bH = badgeRef.current ? badgeRef.current.offsetHeight : 0;
    const margin = 8;
    const minX = ((margin + bW / 2) / cW) * 100;
    const maxX = ((cW - margin - bW / 2) / cW) * 100;
    const minY = ((margin + bH / 2) / cH) * 100;
    const maxY = ((cH - margin - bH / 2) / cH) * 100;
    const y = Math.max(minY, Math.min(maxY, ((e.clientY - rect.top) / rect.height) * 100));
    if (shape === "BAR") {
      setPos((prev) => ({ ...prev, y }));
    } else {
      const x = Math.max(minX, Math.min(maxX, ((e.clientX - rect.left) / rect.width) * 100));
      setPos({ x, y });
    }
  }, [dragging, shape]);

  const handleMouseUp = useCallback(() => setDragging(false), []);

  // 3D tilt: track mouse over the preview container and tilt the badge element
  const handle3DMouseMove = useCallback((e) => {
    if (animEffect !== "3d" || !badgeRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);   // -1 to 1
    const dy = (e.clientY - cy) / (rect.height / 2);
    const rotY =  dx * 22;
    const rotX = -dy * 22;
    badgeRef.current.style.transform = `translate(-50%,-50%) perspective(400px) rotateY(${rotY}deg) rotateX(${rotX}deg) scale(1.05)`;
    badgeRef.current.style.transition = "transform 0.05s linear";
  }, [animEffect]);

  const handle3DMouseLeave = useCallback(() => {
    if (animEffect !== "3d" || !badgeRef.current) return;
    badgeRef.current.style.transform = "translate(-50%,-50%)";
    badgeRef.current.style.transition = "transform 0.35s ease";
  }, [animEffect]);

  // Snap to corner (regular badges) or top/bottom edge (BAR), keeping badge fully inside the frame
  const snapToCorner = useCallback((key) => {
    const container = containerRef.current;
    const badge = badgeRef.current;
    if (!container || !badge) return;
    const cW = container.offsetWidth;
    const cH = container.offsetHeight;
    const bW = badge.offsetWidth;
    const bH = badge.offsetHeight;
    const margin = 8;

    let newPos;
    if (key === "TOP") {
      newPos = { x: 50, y: (bH / 2 / cH) * 100 };
    } else if (key === "BOT") {
      newPos = { x: 50, y: ((cH - bH / 2) / cH) * 100 };
    } else {
      // Badge is centered on (x%, y%) via translate(-50%,-50%), so safe range:
      const xLeft  = ((margin + bW / 2) / cW) * 100;
      const xRight = ((cW - margin - bW / 2) / cW) * 100;
      const yTop   = ((margin + bH / 2) / cH) * 100;
      const yBot   = ((cH - margin - bH / 2) / cH) * 100;
      const corners = { TL: { x: xLeft, y: yTop }, TR: { x: xRight, y: yTop }, BL: { x: xLeft, y: yBot }, BR: { x: xRight, y: yBot } };
      newPos = corners[key];
    }
    setPos(newPos);
    setSnappedCorner(key);
  }, []);

  // Snap to TL corner on first mount so badge is never clipped by the frame edge
  useEffect(() => { snapToCorner("TL"); }, []); // eslint-disable-line

  // Re-snap whenever label or size changes so wider text never escapes the frame
  useLayoutEffect(() => {
    if (!snappedCorner || snappedCorner === "TOP" || snappedCorner === "BOT") return;
    snapToCorner(snappedCorner);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label, size]);

  const cpCorner = shape === "CORNER_POP" ? (SNAP_TO_CORNER[snappedCorner] || "TOP_LEFT") : null;

  const badgeStyle = buildBadgeStyle({
    color, textColor, shape, edgeStyle, size,
    px: pos.x, py: pos.y,
    gradientEnabled, gradientColorEnd, gradientDirection,
    cpCorner,
    cpExpanded: shape !== "CORNER_POP" || previewHovered,
    fontFamily, textTransform, borderWidth, borderColor, shadowStyle,
  });

  // Computes CSS animation style for the badge based on animEffect
  const buildAnimStyle = () => {
    if (animEffect === "pulse") return { animation: `bb-pulse 1.6s ease-in-out infinite` };
    if (animEffect === "glow") return { animation: `bb-glow 2s ease-in-out infinite` };
    if (animEffect === "shimmer") return {
      backgroundImage: `linear-gradient(120deg, ${color} 0%, ${color} 30%, #fff9 50%, ${color} 70%, ${color} 100%)`,
      backgroundSize: "200% auto",
      animation: `bb-shimmer 2.4s linear infinite`,
    };
    return {};
  };

  // Computes overlay style for hover-based visibility (fade or slide)
  const SLIDE_OFFSET = { LEFT: "translateX(-300%)", RIGHT: "translateX(300%)", TOP: "translateY(-300%)", BOTTOM: "translateY(300%)" };
  const buildVisStyle = (baseTransform) => {
    if (hoverOnly && !slideIn) {
      return { opacity: previewHovered ? 1 : 0, transition: `opacity ${hoverDuration}ms ease` };
    }
    if (slideIn) {
      const offset = SLIDE_OFFSET[slideFrom] || SLIDE_OFFSET.LEFT;
      return {
        opacity: previewHovered ? 1 : 0,
        transform: previewHovered ? (baseTransform || "") : `${baseTransform || ""} ${offset}`.trim(),
        transition: `transform ${hoverDuration}ms cubic-bezier(0.4,0,0.2,1), opacity ${hoverDuration}ms ease`,
      };
    }
    return {};
  };

  const t = darkMode ? {
    bg: "#000", surface: "#111", border: "#333",
    text: "#fff", muted: "rgba(255,255,255,0.5)", faint: "rgba(255,255,255,0.3)", dim: "rgba(255,255,255,0.4)",
    accent: "#fff", accentText: "#000",
    inputBg: "#111", inputBorder: "#333", inputColor: "#fff",
    previewBg: "#1a1a1a",
    previewStripe: "repeating-linear-gradient(135deg,#222 0px,#222 1px,#1a1a1a 1px,#1a1a1a 24px)",
    silhouette: "#2a2a2a",
    btnBg: "#222", btnBorder: "#444", btnColor: "#fff", btnMutedColor: "#aaa",
    swatchActive: "#fff", swatchInactive: "#444",
    hintText: "rgba(255,255,255,0.25)",
    gradientStripBorder: "#333",
    dirBtnActive: "#fff", dirBtnActiveColor: "#000",
    dirBtnInactive: "transparent", dirBtnInactiveColor: "rgba(255,255,255,0.6)",
    dirBtnBorderActive: "#fff", dirBtnBorderInactive: "rgba(255,255,255,0.2)",
    uploadColor: "rgba(255,255,255,0.55)", uploadBorder: "rgba(255,255,255,0.3)",
    shadow: "0 8px 24px rgba(0,0,0,0.18)",
  } : {
    bg: "#fff", surface: "#f5f5f5", border: "#e0e0e0",
    text: "#000", muted: "rgba(0,0,0,0.5)", faint: "rgba(0,0,0,0.3)", dim: "rgba(0,0,0,0.4)",
    accent: "#000", accentText: "#fff",
    inputBg: "#f5f5f5", inputBorder: "#ddd", inputColor: "#000",
    previewBg: "#e8e8e8",
    previewStripe: "repeating-linear-gradient(135deg,#dedede 0px,#dedede 1px,#e8e8e8 1px,#e8e8e8 24px)",
    silhouette: "#d0d0d0",
    btnBg: "#f0f0f0", btnBorder: "#ccc", btnColor: "#000", btnMutedColor: "#666",
    swatchActive: "#000", swatchInactive: "#bbb",
    hintText: "rgba(0,0,0,0.25)",
    gradientStripBorder: "#ddd",
    dirBtnActive: "#000", dirBtnActiveColor: "#fff",
    dirBtnInactive: "transparent", dirBtnInactiveColor: "rgba(0,0,0,0.6)",
    dirBtnBorderActive: "#000", dirBtnBorderInactive: "rgba(0,0,0,0.2)",
    uploadColor: "rgba(0,0,0,0.55)", uploadBorder: "rgba(0,0,0,0.3)",
    shadow: "0 8px 24px rgba(0,0,0,0.08)",
  };

  const label_ = (text) => (
    <div style={{ color: t.muted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 8 }}>
      {text}
    </div>
  );

  const chip = (active, onClick, children) => (
    <button onClick={onClick} style={{
      padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer",
      border: active ? `2px solid ${t.accent}` : `2px solid ${t.muted}`,
      borderRadius: 4,
      background: active ? t.accent : "transparent",
      color: active ? t.accentText : t.text,
      transition: "all 0.1s ease",
    }}>
      {children}
    </button>
  );

  return (
    <div style={{ background: t.bg, borderRadius: 12, padding: 28, boxShadow: t.shadow, transition: "background 0.2s ease" }}>
      <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <Text variant="headingMd" as="h2">
            <span style={{ color: t.text }}>Build a custom badge</span>
          </Text>
          <Text variant="bodySm">
            <span style={{ color: t.muted }}>Drag the badge anywhere on the preview. Full control over every detail.</span>
          </Text>
        </div>
        <button
          onClick={() => setDarkMode((d) => !d)}
          title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          style={{
            flexShrink: 0, marginLeft: 16,
            background: t.surface, border: `1px solid ${t.border}`,
            borderRadius: 20, padding: "5px 12px",
            fontSize: 12, fontWeight: 600, cursor: "pointer",
            color: t.text, display: "flex", alignItems: "center", gap: 6,
            transition: "all 0.2s ease",
          }}
        >
          {darkMode ? "☀ Light" : "☾ Dark"}
        </button>
      </div>

      {/* ── Live preview — centered at top ── */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>

        {/* ── Live preview (draggable) ── */}
        <div style={{ width: "100%", maxWidth: 340 }}>
          <div
            ref={containerRef}
            onMouseMove={(e) => { handleMouseMove(e); handle3DMouseMove(e); }}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => { handleMouseUp(); handle3DMouseLeave(); if (hoverOnly || slideIn) setPreviewHovered(false); }}
            onMouseEnter={() => { if (hoverOnly || slideIn) setPreviewHovered(true); }}
            style={{
              position: "relative",
              borderRadius: 8,
              aspectRatio: "1 / 1",
              overflow: "hidden",
              cursor: dragging ? "grabbing" : "default",
              background: t.previewBg,
              transition: "background 0.2s ease",
            }}
          >
            {previewImage && (
              <img
                src={previewImage}
                alt=""
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", pointerEvents: "none", userSelect: "none" }}
              />
            )}

            {!previewImage && (
              <>
                <div style={{ position: "absolute", inset: 0, background: t.previewStripe }} />
                <div style={{ position: "absolute", bottom: "15%", left: "50%", transform: "translateX(-50%)", width: "55%", height: "60%", background: t.silhouette, borderRadius: 6 }} />
              </>
            )}

            {/* Badge */}
            {(() => {
              const badgeContent = iconDataUrl
                ? <img src={iconDataUrl} alt="" style={{ width: "1.4em", height: "1.4em", objectFit: "contain", display: "block" }} />
                : (label || "My Badge");
              const animStyle = buildAnimStyle();
              if (shape === "CORNER_POP") return (
                <div style={{ ...badgeStyle, ...animStyle, ...buildVisStyle(badgeStyle.transform) }}>{badgeContent}</div>
              );
              if (shape === "BAR") return (
                <div ref={badgeRef} onMouseDown={handleMouseDown} style={{ ...badgeStyle, ...animStyle, ...buildVisStyle(badgeStyle.transform) }}>
                  {scrollingEnabled && !iconDataUrl ? (
                    <span style={{ display: "inline-block", whiteSpace: "nowrap", animation: `bb-marquee ${scrollSpeed}s linear infinite` }}>
                      {(() => { const seg = (label || "My Badge") + "\u00a0\u00a0·\u00a0\u00a0"; return seg.repeat(16); })()}
                    </span>
                  ) : badgeContent}
                </div>
              );
              return (
                <span ref={badgeRef} onMouseDown={handleMouseDown} style={{ ...badgeStyle, ...animStyle, ...buildVisStyle(badgeStyle.transform) }}>
                  {badgeContent}
                </span>
              );
            })()}

            {/* Hover hints */}
            {(hoverOnly || slideIn || shape === "CORNER_POP") && !previewHovered && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                <span style={{ color: t.hintText, fontSize: 10, textAlign: "center", padding: "0 16px" }}>
                  {slideIn ? "Hover preview to see badge slide in"
                    : shape === "CORNER_POP" ? "Hover preview to see pop"
                    : "Hover preview to see badge"}
                </span>
              </div>
            )}

          </div>

          {/* Hidden file inputs */}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
          <input ref={iconFileInputRef} type="file" accept="image/png,image/svg+xml,image/gif,image/webp" onChange={handleIconUpload} style={{ display: "none" }} />
          <input ref={csvFileInputRef} type="file" accept=".csv,text/csv" onChange={handleCsvUpload} style={{ display: "none" }} />

          {/* Upload / change / clear — lives below the preview, never over the image */}
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ color: t.faint, fontSize: 10 }}>
              {shape === "CORNER_POP" ? "Hover preview to see pop-out" : "Drag badge to reposition"}
            </div>
            {!previewImage ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  background: "transparent", color: t.uploadColor,
                  border: `1px dashed ${t.uploadBorder}`, borderRadius: 4,
                  padding: "3px 10px", fontSize: 10, cursor: "pointer", whiteSpace: "nowrap",
                }}
              >
                + Upload photo
              </button>
            ) : (
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{ background: t.btnBg, color: t.btnColor, border: `1px solid ${t.btnBorder}`, borderRadius: 3, padding: "3px 8px", fontSize: 10, cursor: "pointer" }}
                >
                  Change
                </button>
                <button
                  onClick={() => onImageChange(null)}
                  style={{ background: t.btnBg, color: t.btnMutedColor, border: `1px solid ${t.btnBorder}`, borderRadius: 3, padding: "3px 8px", fontSize: 10, cursor: "pointer" }}
                >
                  ✕
                </button>
              </div>
            )}
          </div>
          {/* Icon badge upload */}
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: t.faint, fontSize: 10, flexShrink: 0 }}>Icon badge:</span>
            {iconDataUrl ? (
              <>
                <img src={iconDataUrl} alt="" style={{ width: 18, height: 18, objectFit: "contain", borderRadius: 2 }} />
                <button onClick={() => iconFileInputRef.current?.click()} style={{ background: t.btnBg, color: t.btnColor, border: `1px solid ${t.btnBorder}`, borderRadius: 3, padding: "2px 7px", fontSize: 10, cursor: "pointer" }}>Change</button>
                <button onClick={() => setIconDataUrl(null)} style={{ background: t.btnBg, color: t.btnMutedColor, border: `1px solid ${t.btnBorder}`, borderRadius: 3, padding: "2px 7px", fontSize: 10, cursor: "pointer" }}>✕ Remove</button>
              </>
            ) : (
              <button onClick={() => iconFileInputRef.current?.click()} style={{ background: "transparent", color: t.uploadColor, border: `1px dashed ${t.uploadBorder}`, borderRadius: 4, padding: "2px 8px", fontSize: 10, cursor: "pointer" }}>+ Upload icon (PNG/SVG)</button>
            )}
          </div>

          {/* Load real product preview */}
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: t.faint, fontSize: 10, flexShrink: 0 }}>Preview product:</span>
            <input
              value={productIdInput}
              onChange={(e) => setProductIdInput(e.target.value)}
              placeholder="Product ID"
              style={{ flex: 1, background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 4, padding: "3px 7px", color: t.inputColor, fontSize: 10, outline: "none" }}
            />
            <button
              onClick={() => { if (productIdInput.trim()) productFetcher.load(`/api/product-image?productId=${encodeURIComponent(productIdInput.trim())}`); }}
              disabled={productFetcher.state !== "idle"}
              style={{ background: t.btnBg, color: t.btnColor, border: `1px solid ${t.btnBorder}`, borderRadius: 3, padding: "3px 8px", fontSize: 10, cursor: "pointer", whiteSpace: "nowrap" }}
            >
              {productFetcher.state !== "idle" ? "Loading…" : "Load"}
            </button>
          </div>

          <div style={{ marginTop: 8, height: 8, background: t.surface, borderRadius: 3, width: "70%" }} />
          <div style={{ marginTop: 6, height: 8, background: t.surface, borderRadius: 3, width: "45%" }} />
        </div>
      </div>

      {/* ── Controls — 2-column grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>

        {/* Left: Appearance */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Label */}
          <div>
            {label_("Label")}
            <select
              defaultValue=""
              onChange={(e) => { if (e.target.value) setLabel(e.target.value); e.target.value = ""; }}
              style={{
                width: "100%", background: t.inputBg, border: `1px solid ${t.inputBorder}`,
                borderRadius: 4, padding: "7px 10px", color: t.muted, fontSize: 12,
                outline: "none", boxSizing: "border-box", cursor: "pointer", marginBottom: 6,
              }}
            >
              <option value="" disabled>— Pick a suggested label —</option>
              {LABEL_SUGGESTIONS.map((group) => (
                <optgroup key={group.group} label={group.group}>
                  {group.labels.map((lbl) => (
                    <option key={lbl} value={lbl}>{lbl}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Badge text"
              style={{ width: "100%", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 4, padding: "8px 10px", color: t.inputColor, fontSize: 13, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {/* Badge color */}
          <div>
            {label_("Badge color")}
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              {COLOR_PRESETS.map((c) => (
                <button key={c} onClick={() => setColor(c)} style={{ width: 24, height: 24, borderRadius: "50%", background: c, border: color === c ? `2px solid ${t.swatchActive}` : `2px solid ${t.swatchInactive}`, cursor: "pointer", padding: 0, flexShrink: 0 }} />
              ))}
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 24, height: 24, borderRadius: "50%", border: "none", cursor: "pointer", padding: 0, background: "none" }} title="Custom color" />
            </div>
          </div>

          {/* Text color */}
          <div>
            {label_("Text color")}
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {["#FFFFFF", "#000000"].map((c) => (
                <button key={c} onClick={() => setTextColor(c)} style={{ width: 24, height: 24, borderRadius: "50%", background: c, border: textColor === c ? `2px solid ${t.swatchActive}` : `2px solid ${t.swatchInactive}`, cursor: "pointer", padding: 0 }} />
              ))}
              <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} style={{ width: 24, height: 24, borderRadius: "50%", border: "none", cursor: "pointer", padding: 0, background: "none" }} title="Custom text color" />
            </div>
          </div>

          {/* Shape */}
          <div>
            {label_("Shape")}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {SHAPES.map((s) => {
                const lbl = s === "CORNER_POP" ? "Corner Pop" : s.charAt(0) + s.slice(1).toLowerCase();
                return chip(shape === s, () => setShape(s), lbl);
              })}
            </div>
          </div>

          {/* Gradient */}
          <div>
            {label_("Fill")}
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              {chip(!gradientEnabled, () => setGradientEnabled(false), "■ Solid")}
              {chip(gradientEnabled, () => setGradientEnabled(true), "◧ Gradient")}
            </div>

            {gradientEnabled && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{
                  height: 10, borderRadius: 999,
                  background: `linear-gradient(to right, ${color}, ${gradientColorEnd})`,
                  border: `1px solid ${t.gradientStripBorder}`,
                }} />
                <div>
                  <div style={{ color: t.dim, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>End color</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    {COLOR_PRESETS.map((c) => (
                      <button key={c} onClick={() => setGradientColorEnd(c)} style={{ width: 24, height: 24, borderRadius: "50%", background: c, border: gradientColorEnd === c ? `2px solid ${t.swatchActive}` : `2px solid ${t.swatchInactive}`, cursor: "pointer", padding: 0, flexShrink: 0 }} />
                    ))}
                    <input type="color" value={gradientColorEnd} onChange={(e) => setGradientColorEnd(e.target.value)} style={{ width: 24, height: 24, borderRadius: "50%", border: "none", cursor: "pointer", padding: 0, background: "none" }} title="Custom end color" />
                  </div>
                </div>
                <div>
                  <div style={{ color: t.dim, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Direction</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 32px)", gap: 4 }}>
                    {GRADIENT_DIRECTIONS.map((d) => (
                      <button key={d.value} onClick={() => setGradientDirection(d.value)} title={d.value}
                        style={{
                          width: 32, height: 32, fontSize: 14,
                          background: gradientDirection === d.value ? t.dirBtnActive : t.dirBtnInactive,
                          color: gradientDirection === d.value ? t.dirBtnActiveColor : t.dirBtnInactiveColor,
                          border: gradientDirection === d.value ? `2px solid ${t.dirBtnBorderActive}` : `2px solid ${t.dirBtnBorderInactive}`,
                          borderRadius: 4, cursor: "pointer",
                        }}
                      >{d.label}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Font family */}
          <div>
            {label_("Font")}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {[["system","Default"],["impact","Impact"],["georgia","Georgia"],["courier","Mono"],["trebuchet","Trebuchet"]].map(([val, lbl]) => (
                <button key={val} onClick={() => setFontFamily(val)}
                  style={{ padding: "5px 10px", fontSize: 11, borderRadius: 4, border: `1px solid ${fontFamily === val ? t.accent : t.border}`, background: fontFamily === val ? t.accent : t.btnBg, color: fontFamily === val ? t.accentText : t.btnColor, cursor: "pointer" }}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Text case */}
          <div>
            {label_("Text case")}
            <div style={{ display: "flex", gap: 6 }}>
              {[["none","Aa"],["uppercase","AA"],["capitalize","Aa Bb"],["lowercase","aa"]].map(([val, lbl]) => (
                <button key={val} onClick={() => setTextTransform(val)}
                  style={{ padding: "5px 10px", fontSize: 11, borderRadius: 4, border: `1px solid ${textTransform === val ? t.accent : t.border}`, background: textTransform === val ? t.accent : t.btnBg, color: textTransform === val ? t.accentText : t.btnColor, cursor: "pointer" }}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Right: Layout, Behavior, Effects */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Size */}
          <div>
            {label_(`Size — ${size}px`)}
            <input type="range" min={9} max={24} value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              style={{ width: "100%", accentColor: t.accent, cursor: "pointer" }} />
            <div style={{ display: "flex", justifyContent: "space-between", color: t.faint, fontSize: 10, marginTop: 2 }}>
              <span>Small</span><span>Large</span>
            </div>
          </div>

          {/* Edge style — circles only */}
          {shape === "CIRCLE" && (
            <div>
              {label_("Edge style")}
              <div style={{ display: "flex", gap: 6 }}>
                {chip(edgeStyle === "SMOOTH", () => setEdgeStyle("SMOOTH"), "● Smooth")}
                {chip(edgeStyle === "RIDGED", () => setEdgeStyle("RIDGED"), "✦ Ridged")}
              </div>
            </div>
          )}

          {/* Position controls — hidden for CORNER_POP */}
          {shape !== "CORNER_POP" && (
            <div>
              {label_(shape === "BAR" ? "Snap to edge" : "Snap to corner")}
              {shape === "BAR" ? (
                <div style={{ display: "flex", gap: 6 }}>
                  {[{ key: "TOP", label: "↑ Top" }, { key: "BOT", label: "↓ Bottom" }].map((edge) => {
                    const active = snappedCorner === edge.key;
                    return (
                      <button key={edge.key} onClick={() => snapToCorner(edge.key)}
                        style={{ padding: "6px 14px", fontSize: 12, fontWeight: 600, background: active ? t.accent : "transparent", color: active ? t.accentText : t.text, border: active ? `2px solid ${t.accent}` : `2px solid ${t.border}`, borderRadius: 4, cursor: "pointer" }}>
                        {edge.label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, width: 120 }}>
                  {[{ key: "TL", label: "↖" }, { key: "TR", label: "↗" }, { key: "BL", label: "↙" }, { key: "BR", label: "↘" }].map((corner) => {
                    const active = snappedCorner === corner.key;
                    return (
                      <button key={corner.key} onClick={() => snapToCorner(corner.key)}
                        style={{ height: 36, fontSize: 16, background: active ? t.accent : "transparent", color: active ? t.accentText : t.muted, border: active ? `2px solid ${t.accent}` : `2px solid ${t.border}`, borderRadius: 4, cursor: "pointer" }}>
                        {corner.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* CORNER_POP — corner selector */}
          {shape === "CORNER_POP" && (
            <div>
              {label_("Corner")}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, width: 120 }}>
                {[{ key: "TL", label: "↖" }, { key: "TR", label: "↗" }, { key: "BL", label: "↙" }, { key: "BR", label: "↘" }].map((corner) => {
                  const active = snappedCorner === corner.key;
                  return (
                    <button key={corner.key} onClick={() => setSnappedCorner(corner.key)}
                      style={{ height: 36, fontSize: 16, background: active ? t.accent : "transparent", color: active ? t.accentText : t.muted, border: active ? `2px solid ${t.accent}` : `2px solid ${t.border}`, borderRadius: 4, cursor: "pointer" }}>
                      {corner.label}
                    </button>
                  );
                })}
              </div>
              <div style={{ color: t.hintText, fontSize: 10, marginTop: 8 }}>Hover the preview to see it expand</div>
            </div>
          )}

          {/* Scrolling marquee — BAR only */}
          {shape === "BAR" && (
            <div>
              {label_("Banner animation")}
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                {chip(!scrollingEnabled, () => setScrollingEnabled(false), "— Static")}
                {chip(scrollingEnabled,  () => setScrollingEnabled(true),  "∞ Scrolling")}
              </div>
              {scrollingEnabled && (
                <div>
                  <div style={{ color: t.dim, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
                    Speed — {scrollSpeed}s cycle
                  </div>
                  <input type="range" min={5} max={60} step={5} value={scrollSpeed}
                    onChange={(e) => setScrollSpeed(Number(e.target.value))}
                    style={{ width: "100%", accentColor: t.accent, cursor: "pointer" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", color: t.faint, fontSize: 10, marginTop: 2 }}>
                    <span>Fast</span><span>Slow</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Visibility */}
          <div>
            {label_("Visibility")}
            <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
              {chip(!hoverOnly && !slideIn, () => { setHoverOnly(false); setSlideIn(false); }, "◉ Always")}
              {chip(hoverOnly && !slideIn,  () => { setHoverOnly(true);  setSlideIn(false); }, "◎ Fade on hover")}
              {chip(slideIn,               () => { setHoverOnly(false); setSlideIn(true);  }, "◈ Slide in")}
            </div>
            {hoverOnly && !slideIn && (
              <div>
                <div style={{ color: t.dim, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Fade speed — {hoverDuration}ms</div>
                <input type="range" min={100} max={1000} step={50} value={hoverDuration}
                  onChange={(e) => setHoverDuration(Number(e.target.value))}
                  style={{ width: "100%", accentColor: t.accent, cursor: "pointer" }} />
                <div style={{ display: "flex", justifyContent: "space-between", color: t.faint, fontSize: 10, marginTop: 2 }}>
                  <span>Fast</span><span>Slow</span>
                </div>
              </div>
            )}
            {slideIn && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <div style={{ color: t.dim, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Slide from</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {[{ key: "LEFT", label: "← Left" }, { key: "RIGHT", label: "→ Right" }, { key: "TOP", label: "↑ Top" }, { key: "BOTTOM", label: "↓ Bottom" }].map(({ key, label: lbl }) =>
                      chip(slideFrom === key, () => setSlideFrom(key), lbl)
                    )}
                  </div>
                </div>
                <div>
                  <div style={{ color: t.dim, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Speed — {hoverDuration}ms</div>
                  <input type="range" min={150} max={800} step={50} value={hoverDuration}
                    onChange={(e) => setHoverDuration(Number(e.target.value))}
                    style={{ width: "100%", accentColor: t.accent, cursor: "pointer" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", color: t.faint, fontSize: 10, marginTop: 2 }}>
                    <span>Fast</span><span>Slow</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Border */}
          <div>
            {label_("Border")}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input type="range" min={0} max={6} value={borderWidth} onChange={(e) => setBorderWidth(Number(e.target.value))}
                style={{ flex: 1 }} />
              <span style={{ color: t.muted, fontSize: 11, minWidth: 24 }}>{borderWidth}px</span>
              {borderWidth > 0 && (
                <input type="color" value={borderColor} onChange={(e) => setBorderColor(e.target.value)}
                  style={{ width: 28, height: 28, border: "none", padding: 0, background: "none", cursor: "pointer", borderRadius: 4 }} />
              )}
            </div>
          </div>

          {/* Shadow */}
          <div>
            {label_("Shadow")}
            <div style={{ display: "flex", gap: 6 }}>
              {[["none","None"],["soft","Soft"],["hard","Hard"],["glow","Glow"]].map(([val, lbl]) => (
                <button key={val} onClick={() => setShadowStyle(val)}
                  style={{ padding: "5px 10px", fontSize: 11, borderRadius: 4, border: `1px solid ${shadowStyle === val ? t.accent : t.border}`, background: shadowStyle === val ? t.accent : t.btnBg, color: shadowStyle === val ? t.accentText : t.btnColor, cursor: "pointer" }}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Animation */}
          <div>
            {label_("Animation")}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {[["none","None"],["pulse","Pulse"],["glow","Glow"],["shimmer","Shimmer"],["confetti","Confetti"],["3d","3D Tilt"]].map(([val, lbl]) => (
                <button key={val} onClick={() => setAnimEffect(val)}
                  style={{ padding: "5px 10px", fontSize: 11, borderRadius: 4, border: `1px solid ${animEffect === val ? t.accent : t.border}`, background: animEffect === val ? t.accent : t.btnBg, color: animEffect === val ? t.accentText : t.btnColor, cursor: "pointer" }}>
                  {lbl}
                </button>
              ))}
            </div>
            {animEffect === "3d" && (
              <div style={{ color: t.faint, fontSize: 10, marginTop: 4 }}>Hover the preview to see 3D tilt.</div>
            )}
          </div>

        </div>
      </div>

      {/* ── Targeting + CTA — full width ── */}
      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 18 }}>

        {/* Targeting */}
        <div style={{ paddingTop: 16, borderTop: `1px solid ${t.border}` }}>

          {/* Badge type */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ color: t.dim, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Badge type</div>
            <div style={{ display: "flex", gap: 6 }}>
              {chip(badgeType === "CUSTOM", () => setBadgeType("CUSTOM"), "✏ Custom")}
              {chip(badgeType === "LOW_STOCK", () => setBadgeType("LOW_STOCK"), "📦 Low Stock")}
            </div>
            {badgeType === "LOW_STOCK" && (
              <div style={{ marginTop: 10 }}>
                <div style={{ color: t.dim, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
                  Show when stock ≤ {stockThreshold} units
                </div>
                <input type="range" min={1} max={50} value={stockThreshold} onChange={(e) => setStockThreshold(Number(e.target.value))}
                  style={{ width: "100%", accentColor: t.accent, cursor: "pointer" }} />
                <div style={{ display: "flex", justifyContent: "space-between", color: t.faint, fontSize: 10, marginTop: 2 }}>
                  <span>1 unit</span><span>50 units</span>
                </div>
              </div>
            )}
          </div>

          {/* Apply to */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ color: t.dim, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Apply to</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {chip(targetType === "ALL", () => setTargetType("ALL"), "All products")}
              {chip(targetType === "SPECIFIC", () => setTargetType("SPECIFIC"), "Specific products")}
              {chip(targetType === "COLLECTION", () => setTargetType("COLLECTION"), "Collections")}
            </div>
            {targetType === "SPECIFIC" && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ color: t.dim, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Product IDs</div>
                  <button onClick={() => csvFileInputRef.current?.click()} style={{ background: "transparent", color: t.uploadColor, border: `1px dashed ${t.uploadBorder}`, borderRadius: 3, padding: "2px 7px", fontSize: 9, cursor: "pointer" }}>
                    + Import CSV
                  </button>
                </div>
                <textarea
                  value={targetIds}
                  onChange={(e) => setTargetIds(e.target.value)}
                  placeholder="Comma-separated Shopify product IDs&#10;e.g. 1234567890, 9876543210"
                  rows={3}
                  style={{ width: "100%", background: t.inputBg, color: t.text, border: `1px solid ${t.border}`, borderRadius: 6, padding: "8px 10px", fontSize: 12, resize: "vertical", fontFamily: "monospace", boxSizing: "border-box" }}
                />
              </div>
            )}
            {targetType === "COLLECTION" && (
              <div>
                <div style={{ color: t.dim, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Collection IDs</div>
                <textarea
                  value={collectionIds}
                  onChange={(e) => setCollectionIds(e.target.value)}
                  placeholder="Comma-separated Shopify collection IDs&#10;e.g. 123456789, 987654321"
                  rows={2}
                  style={{ width: "100%", background: t.inputBg, color: t.text, border: `1px solid ${t.border}`, borderRadius: 6, padding: "8px 10px", fontSize: 12, resize: "vertical", fontFamily: "monospace", boxSizing: "border-box" }}
                />
                <div style={{ color: t.faint, fontSize: 10, marginTop: 4 }}>Products in these collections sync automatically when you hit "Sync Inventory".</div>
              </div>
            )}
          </div>

          {/* Schedule */}
          <div>
            <div style={{ color: t.dim, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Schedule (optional)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <div style={{ color: t.faint, fontSize: 10, marginBottom: 4 }}>Start</div>
                <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)}
                  style={{ width: "100%", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 4, padding: "6px 8px", color: t.inputColor, fontSize: 11, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <div style={{ color: t.faint, fontSize: 10, marginBottom: 4 }}>End</div>
                <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)}
                  style={{ width: "100%", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 4, padding: "6px 8px", color: t.inputColor, fontSize: 11, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
            {(startsAt || endsAt) && (
              <button onClick={() => { setStartsAt(""); setEndsAt(""); }} style={{ marginTop: 6, background: "transparent", color: t.muted, border: "none", fontSize: 10, cursor: "pointer", padding: 0 }}>✕ Clear schedule</button>
            )}
            {endsAt && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                <input type="checkbox" id="showCountdown" checked={showCountdown} onChange={(e) => setShowCountdown(e.target.checked)} />
                <label htmlFor="showCountdown" style={{ color: t.text, fontSize: 12, cursor: "pointer" }}>Show live countdown instead of label</label>
              </div>
            )}
          </div>

        </div>

        {/* CTA */}
        <div>
            <button
              disabled={disabled || fetcher.state !== "idle"}
              onClick={() => {
                const fd = new FormData();
                fd.append("intent", editingBadge ? "update" : "create");
                if (editingBadge) fd.append("badgeId", editingBadge.id);
                fd.append("label", label);
                fd.append("color", color);
                fd.append("textColor", textColor);
                fd.append("shape", shape);
                fd.append("size", String(size));
                fd.append("edgeStyle", shape === "CIRCLE" ? edgeStyle : "SMOOTH");
                if (shape === "CORNER_POP") {
                  fd.append("position", cpCorner);
                } else {
                  fd.append("px", pos.x.toFixed(1));
                  fd.append("py", pos.y.toFixed(1));
                }
                fd.append("gradientEnabled", String(gradientEnabled));
                fd.append("gradientColorEnd", gradientColorEnd);
                fd.append("gradientDirection", gradientDirection);
                fd.append("hoverOnly", String(hoverOnly && !slideIn));
                fd.append("hoverDuration", String(hoverDuration));
                fd.append("slideIn", String(slideIn));
                fd.append("slideFrom", slideFrom);
                fd.append("scrollingEnabled", String(scrollingEnabled));
                fd.append("scrollSpeed", String(scrollSpeed));
                fd.append("type", badgeType);
                fd.append("stockThreshold", String(stockThreshold));
                fd.append("targetType", targetType);
                fd.append("targetIds", targetIds);
                fd.append("collectionIds", collectionIds);
                fd.append("iconDataUrl", iconDataUrl || "");
                fd.append("startsAt", startsAt);
                fd.append("endsAt", endsAt);
                fd.append("fontFamily", fontFamily);
                fd.append("textTransform", textTransform);
                fd.append("borderWidth", String(borderWidth));
                fd.append("borderColor", borderColor);
                fd.append("shadowStyle", shadowStyle);
                fd.append("animEffect", animEffect);
                fd.append("showCountdown", String(showCountdown));
                fetcher.submit(fd, { method: "post" });
                if (editingBadge) onEditDone();
              }}
              style={{
                display: "inline-block",
                background: disabled ? "#333" : "#000",
                color: disabled ? "#666" : "#fff",
                fontWeight: 700,
                fontSize: 13,
                padding: "10px 20px",
                borderRadius: 0,
                border: "none",
                cursor: disabled ? "not-allowed" : "pointer",
                letterSpacing: "0.2px",
              }}
            >
              {fetcher.state !== "idle" ? (editingBadge ? "Updating…" : "Saving…") : (editingBadge ? "Update badge" : "Create custom badge")}
            </button>
            {editingBadge && (
              <button
                onClick={onEditDone}
                style={{
                  marginLeft: 8,
                  background: "transparent",
                  border: "1px solid #555",
                  color: "#ccc",
                  fontWeight: 600,
                  fontSize: 12,
                  padding: "10px 16px",
                  borderRadius: 0,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            )}
        </div>
      </div>

      {/* Crop modal — mounts as a fixed overlay when a raw image is waiting to be cropped */}
      {rawImage && (
        <CropModal
          src={rawImage}
          onApply={(cropped) => { onImageChange(cropped); setRawImage(null); }}
          onCancel={() => setRawImage(null)}
        />
      )}
    </div>
  );
}

// ── ProductBadgeManager ───────────────────────────────────────
function ProductBadgeManager({ badges, isPro }) {
  const fetcher = useFetcher();
  const [productId, setProductId] = useState("");
  const [committed, setCommitted] = useState("");
  const [selected, setSelected] = useState({});
  const saving = fetcher.state !== "idle";
  const saved = fetcher.state === "idle" && fetcher.data?.success;

  const load = () => {
    const id = productId.trim();
    if (!id) return;
    setCommitted(id);
    const initial = {};
    badges.forEach((b) => {
      const ids = b.targetIds ? b.targetIds.split(",").map((s) => s.trim()) : [];
      initial[b.id] = ids.includes(id);
    });
    setSelected(initial);
  };

  const toggle = (id) => setSelected((prev) => ({ ...prev, [id]: !prev[id] }));

  const save = () => {
    const selectedIds = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);
    const fd = new FormData();
    fd.append("intent", "product-badges");
    fd.append("productId", committed);
    fd.append("selectedBadgeIds", JSON.stringify(selectedIds));
    fetcher.submit(fd, { method: "post" });
  };

  const t = { border: "#2a2a2a", bg: "#111", inputBg: "#1a1a1a", text: "#fff", dim: "#888", accent: "#fff" };

  if (!isPro) {
    return (
      <div style={{ background: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 12, padding: 28 }}>
        <InlineStack align="space-between" blockAlign="center" wrap={false}>
          <BlockStack gap="100">
            <InlineStack gap="200" blockAlign="center">
              <Text variant="headingLg" as="h2" tone="base">
                <span style={{ color: "#fff" }}>Product Badge Stacks</span>
              </Text>
              <span style={{ fontSize: 10, fontWeight: 700, background: "#553C9A", color: "#fff", padding: "2px 8px", borderRadius: 99, letterSpacing: "0.5px" }}>PRO</span>
            </InlineStack>
            <Text tone="subdued" variant="bodySm">
              Assign multiple badges to any individual product. Stack a sale badge, a low-stock badge, and a custom label — all on one product card.
            </Text>
          </BlockStack>
          <Button variant="primary" url="/app/upgrade">Upgrade — $4.99/mo</Button>
        </InlineStack>
      </div>
    );
  }

  return (
    <div style={{ background: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 12, padding: 28, color: t.text }}>
      <BlockStack gap="400">
        <InlineStack gap="200" blockAlign="center">
          <Text variant="headingLg" as="h2"><span style={{ color: "#fff" }}>Product Badge Stacks</span></Text>
          <span style={{ fontSize: 10, fontWeight: 700, background: "#553C9A", color: "#fff", padding: "2px 8px", borderRadius: 99, letterSpacing: "0.5px" }}>PRO</span>
        </InlineStack>
        <Text tone="subdued" variant="bodySm">Enter a Shopify product ID to manage which badges appear on that product.</Text>

        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: t.dim, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Product ID</div>
            <input
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              placeholder="e.g. 8765432109876"
              style={{ width: "100%", background: t.inputBg, color: t.text, border: `1px solid ${t.border}`, borderRadius: 6, padding: "8px 12px", fontSize: 13, boxSizing: "border-box" }}
            />
          </div>
          <button
            onClick={load}
            style={{ background: "#fff", color: "#000", fontWeight: 700, fontSize: 13, padding: "9px 20px", border: "none", borderRadius: 6, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            Load product
          </button>
        </div>

        {committed && badges.length > 0 && (
          <BlockStack gap="300">
            <div style={{ color: t.dim, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Badges on product {committed}
            </div>
            {badges.map((badge) => (
              <label key={badge.id} style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", padding: "10px 14px", background: t.inputBg, borderRadius: 8, border: `1px solid ${selected[badge.id] ? "#553C9A" : t.border}` }}>
                <input
                  type="checkbox"
                  checked={!!selected[badge.id]}
                  onChange={() => toggle(badge.id)}
                  style={{ accentColor: "#553C9A", width: 16, height: 16, flexShrink: 0 }}
                />
                <BlockStack gap="0">
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{badge.label}</span>
                  <span style={{ color: t.dim, fontSize: 11 }}>{badge.type.replace(/_/g, " ")} · {badge.shape}</span>
                </BlockStack>
                <span style={{
                  marginLeft: "auto", fontSize: 10, fontWeight: 700,
                  background: badge.color, color: badge.textColor,
                  padding: "2px 8px", borderRadius: 99,
                }}>{badge.label}</span>
              </label>
            ))}
            <InlineStack gap="200" blockAlign="center">
              <button
                onClick={save}
                disabled={saving}
                style={{ background: "#fff", color: "#000", fontWeight: 700, fontSize: 13, padding: "10px 22px", border: "none", borderRadius: 6, cursor: saving ? "not-allowed" : "pointer" }}
              >
                {saving ? "Saving…" : "Save badge stack"}
              </button>
              {saved && <span style={{ color: "#4ade80", fontSize: 12, fontWeight: 600 }}>✓ Saved</span>}
            </InlineStack>
          </BlockStack>
        )}

        {committed && badges.length === 0 && (
          <Text tone="subdued" variant="bodySm">Create some badges first, then come back to stack them on products.</Text>
        )}
      </BlockStack>
    </div>
  );
}

// ── FeaturedBadges ────────────────────────────────────────────
const FEATURED = [
  {
    name: "Flash Sale Bar",
    description: "Scrolling fire-gradient banner that stops shoppers instantly",
    preset: {
      label: "🔥 FLASH SALE · FREE SHIPPING · TODAY ONLY 🔥",
      color: "#E11D48", textColor: "#FFFFFF", shape: "BAR", size: 13,
      gradientEnabled: true, gradientColorEnd: "#F97316", gradientDirection: "to right",
      positionX: null, positionY: 8, position: "TOP_LEFT",
      fontFamily: "impact", textTransform: "uppercase", shadowStyle: "glow",
      scrollingEnabled: true, scrollSpeed: 12, animEffect: "shimmer",
      edgeStyle: "SMOOTH", borderWidth: 0, borderColor: "#ffffff",
      hoverOnly: false, slideIn: false, hoverDuration: 300, slideFrom: "LEFT",
      type: "CUSTOM", stockThreshold: 5, targetType: "ALL", targetIds: "",
      collectionIds: "", iconDataUrl: "", startsAt: "", endsAt: "", showCountdown: false, priority: 10,
    },
  },
  {
    name: "Bestseller Pill",
    description: "Gold-on-black premium pill — the badge every top product deserves",
    preset: {
      label: "BESTSELLER",
      color: "#18181B", textColor: "#FCD34D", shape: "PILL", size: 13,
      gradientEnabled: true, gradientColorEnd: "#3F3F46", gradientDirection: "to bottom right",
      positionX: 18, positionY: 18, position: "TOP_LEFT",
      fontFamily: "georgia", textTransform: "uppercase", shadowStyle: "hard",
      scrollingEnabled: false, scrollSpeed: 20, animEffect: "pulse",
      edgeStyle: "SMOOTH", borderWidth: 1, borderColor: "#FCD34D",
      hoverOnly: false, slideIn: false, hoverDuration: 300, slideFrom: "LEFT",
      type: "CUSTOM", stockThreshold: 5, targetType: "ALL", targetIds: "",
      collectionIds: "", iconDataUrl: "", startsAt: "", endsAt: "", showCountdown: false, priority: 9,
    },
  },
  {
    name: "New In Corner",
    description: "Sharp corner pop that announces fresh arrivals with authority",
    preset: {
      label: "NEW IN",
      color: "#000000", textColor: "#FFFFFF", shape: "CORNER_POP", size: 14,
      gradientEnabled: false, gradientColorEnd: "#553C9A", gradientDirection: "to right",
      positionX: null, positionY: null, position: "TOP_RIGHT",
      fontFamily: "impact", textTransform: "uppercase", shadowStyle: "none",
      scrollingEnabled: false, scrollSpeed: 20, animEffect: "none",
      edgeStyle: "SMOOTH", borderWidth: 0, borderColor: "#ffffff",
      hoverOnly: false, slideIn: false, hoverDuration: 300, slideFrom: "LEFT",
      type: "CUSTOM", stockThreshold: 5, targetType: "ALL", targetIds: "",
      collectionIds: "", iconDataUrl: "", startsAt: "", endsAt: "", showCountdown: false, priority: 8,
    },
  },
];

function FeaturedBadgePreview({ preset }) {
  // Inject animation keyframes if not already present
  useEffect(() => {
    const id = "bb-anim-kf";
    if (!document.getElementById(id)) {
      const s = document.createElement("style");
      s.id = id;
      s.textContent = [
        "@keyframes bb-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}",
        "@keyframes bb-pulse{0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-50%) scale(1.12)}}",
        "@keyframes bb-glow{0%,100%{opacity:1;filter:brightness(1)}50%{opacity:0.85;filter:brightness(1.4)}}",
        "@keyframes bb-shimmer{0%{background-position:200% center}100%{background-position:-200% center}}",
      ].join("\n");
      document.head.appendChild(s);
    }
  }, []);

  const px = preset.positionX ?? 18;
  const py = preset.positionY ?? 18;

  const badgeStyle = {
    ...buildBadgeStyle({
      color: preset.color, textColor: preset.textColor, shape: preset.shape,
      edgeStyle: preset.edgeStyle, size: preset.size, px, py,
      gradientEnabled: preset.gradientEnabled, gradientColorEnd: preset.gradientColorEnd,
      gradientDirection: preset.gradientDirection,
      cpCorner: preset.position || "TOP_LEFT", cpExpanded: false,
      fontFamily: preset.fontFamily, textTransform: preset.textTransform,
      borderWidth: preset.borderWidth, borderColor: preset.borderColor,
      shadowStyle: preset.shadowStyle,
    }),
    cursor: "default",
  };

  const animStyle = preset.animEffect === "pulse"
    ? { animation: "bb-pulse 1.6s ease-in-out infinite" }
    : preset.animEffect === "shimmer"
    ? { backgroundImage: `linear-gradient(120deg,${preset.color} 0%,${preset.color} 30%,#fff9 50%,${preset.color} 70%,${preset.color} 100%)`, backgroundSize: "200% auto", animation: "bb-shimmer 2.4s linear infinite" }
    : {};

  const badgeContent = preset.shape === "BAR" && preset.scrollingEnabled
    ? (
      <span style={{ display: "inline-block", whiteSpace: "nowrap", animation: `bb-marquee ${preset.scrollSpeed}s linear infinite` }}>
        {(preset.label + "\u00a0\u00a0·\u00a0\u00a0").repeat(14)}
      </span>
    )
    : preset.label;

  const el = preset.shape === "BAR"
    ? <div style={{ ...badgeStyle, ...animStyle }}>{badgeContent}</div>
    : preset.shape === "CORNER_POP"
    ? <div style={{ ...badgeStyle, ...animStyle }}>{badgeContent}</div>
    : <span style={{ ...badgeStyle, ...animStyle }}>{badgeContent}</span>;

  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "1 / 1", borderRadius: 10, overflow: "hidden", background: "#f0f0f0" }}>
      <img src="/placeholder-product.jpg" alt="product" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      {el}
    </div>
  );
}

function FeaturedBadges({ disabled }) {
  const fetcher = useFetcher();
  const [saved, setSaved] = useState(null);

  const handleUse = (preset) => {
    const fd = new FormData();
    fd.append("intent", "create");
    fd.append("label", preset.label);
    fd.append("color", preset.color);
    fd.append("textColor", preset.textColor);
    fd.append("shape", preset.shape);
    fd.append("size", String(preset.size));
    fd.append("edgeStyle", preset.edgeStyle);
    if (preset.shape === "CORNER_POP") {
      fd.append("position", preset.position);
    } else {
      fd.append("px", String(preset.positionX ?? 18));
      fd.append("py", String(preset.positionY ?? 18));
    }
    fd.append("gradientEnabled", String(preset.gradientEnabled));
    fd.append("gradientColorEnd", preset.gradientColorEnd);
    fd.append("gradientDirection", preset.gradientDirection);
    fd.append("hoverOnly", String(preset.hoverOnly));
    fd.append("hoverDuration", String(preset.hoverDuration));
    fd.append("slideIn", String(preset.slideIn));
    fd.append("slideFrom", preset.slideFrom);
    fd.append("scrollingEnabled", String(preset.scrollingEnabled));
    fd.append("scrollSpeed", String(preset.scrollSpeed));
    fd.append("type", preset.type);
    fd.append("stockThreshold", String(preset.stockThreshold));
    fd.append("targetType", preset.targetType);
    fd.append("targetIds", preset.targetIds);
    fd.append("collectionIds", preset.collectionIds);
    fd.append("iconDataUrl", preset.iconDataUrl);
    fd.append("startsAt", preset.startsAt);
    fd.append("endsAt", preset.endsAt);
    fd.append("fontFamily", preset.fontFamily);
    fd.append("textTransform", preset.textTransform);
    fd.append("borderWidth", String(preset.borderWidth));
    fd.append("borderColor", preset.borderColor);
    fd.append("shadowStyle", preset.shadowStyle);
    fd.append("animEffect", preset.animEffect);
    fd.append("showCountdown", String(preset.showCountdown));
    fetcher.submit(fd, { method: "post" });
    setSaved(preset.label);
  };

  return (
    <div style={{ padding: "40px 0 8px" }}>
      {/* Header */}
      <div style={{ marginBottom: 28, textAlign: "center" }}>
        <div style={{ display: "inline-block", background: "#000", color: "#fff", fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", padding: "4px 14px", borderRadius: 2, marginBottom: 12 }}>
          Featured Badges
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 8 }}>
          Start with a proven design
        </div>
        <div style={{ fontSize: 14, color: "#666", maxWidth: 460, margin: "0 auto" }}>
          Hand-crafted badges used by top-performing stores. One click to add to your collection.
        </div>
      </div>

      {/* Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
        {FEATURED.map((f) => {
          const isSaving = fetcher.state !== "idle" && saved === f.preset.label;
          const wasSaved = fetcher.state === "idle" && saved === f.preset.label && fetcher.data?.success;
          return (
            <div key={f.name} style={{
              borderRadius: 14, overflow: "hidden", background: "#fff",
              border: "1px solid #e1e3e5",
              boxShadow: "0 4px 20px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05)",
              display: "flex", flexDirection: "column",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}>
              <FeaturedBadgePreview preset={f.preset} />
              <div style={{ padding: "18px 20px 20px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: "-0.2px" }}>{f.name}</div>
                <div style={{ fontSize: 12, color: "#777", lineHeight: 1.5, flex: 1 }}>{f.description}</div>
                <button
                  disabled={disabled || isSaving || wasSaved}
                  onClick={() => handleUse(f.preset)}
                  style={{
                    marginTop: 10,
                    width: "100%",
                    padding: "10px 0",
                    background: wasSaved ? "#16a34a" : disabled ? "#e5e7eb" : "#000",
                    color: wasSaved ? "#fff" : disabled ? "#9ca3af" : "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: disabled || isSaving || wasSaved ? "default" : "pointer",
                    letterSpacing: "0.2px",
                    transition: "background 0.2s ease",
                  }}
                >
                  {isSaving ? "Adding…" : wasSaved ? "✓ Added to My Badges" : "Use this badge"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── MyBadgeCard ───────────────────────────────────────────────
const CARD_SLIDE_OFFSET = { LEFT: "translateX(-300%)", RIGHT: "translateX(300%)", TOP: "translateY(-300%)", BOTTOM: "translateY(300%)" };

// ── OnboardingChecklist ───────────────────────────────────────
function OnboardingChecklist({ shop, themeExtensionEnabled }) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof localStorage !== "undefined" && localStorage.getItem("bb-onboarding-dismissed")) {
      setDismissed(true);
    }
  }, []);

  if (dismissed) return null;

  const hasBadges = false; // always false when shown (we only render this from the empty state)
  const steps = [
    { done: hasBadges, label: "Create your first badge", hint: "Use the builder above and click \"Create custom badge\"." },
    { done: themeExtensionEnabled === true, label: "Enable the Badge Blitz theme extension", hint: "Go to your theme customizer → App embeds → turn on Badge Blitz.", link: `https://${shop}/admin/themes/current/editor?context=apps` },
    { done: hasBadges && themeExtensionEnabled === true, label: "Go live 🎉", hint: "Your badges will appear on product cards across your store automatically." },
  ];

  return (
    <div style={{ border: "1.5px solid #e1e3e5", borderRadius: 12, padding: "28px 32px", background: "#fff", position: "relative" }}>
      <button
        onClick={() => { localStorage.setItem("bb-onboarding-dismissed", "1"); setDismissed(true); }}
        style={{ position: "absolute", top: 16, right: 16, background: "transparent", border: "none", cursor: "pointer", color: "#999", fontSize: 16, lineHeight: 1 }}
        title="Dismiss"
      >✕</button>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Get started with Badge Blitz</div>
      <div style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>3 steps to your first live badge</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{
              width: 24, height: 24, borderRadius: "50%", flexShrink: 0, marginTop: 1,
              background: s.done ? "#000" : "#f4f4f5",
              border: s.done ? "none" : "1.5px solid #d1d5db",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {s.done
                ? <span style={{ color: "#fff", fontSize: 12 }}>✓</span>
                : <span style={{ color: "#aaa", fontSize: 11, fontWeight: 700 }}>{i + 1}</span>
              }
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: s.done ? "#aaa" : "#111", textDecoration: s.done ? "line-through" : "none" }}>{s.label}</div>
              <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{s.hint}</div>
              {s.link && !s.done && (
                <a href={s.link} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#000", fontWeight: 600, marginTop: 4, display: "inline-block" }}>Open theme editor →</a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MyBadgeCard({ badge, previewImage, fetcher, onEdit, isFirst, isLast, totalProductCount }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [hovered, setHovered] = useState(false);

  const isDeleting =
    fetcher.state !== "idle" &&
    fetcher.formData?.get("badgeId") === badge.id &&
    fetcher.formData?.get("intent") === "delete";

  // Resolve position percentages from enum when positionX/Y not set
  const _posEnum = badge.position || "TOP_LEFT";
  const _fallbackPx = _posEnum.includes("RIGHT") ? 88 : _posEnum.includes("LEFT") ? 12 : 50;
  const _fallbackPy = badge.shape === "BAR"
    ? (_posEnum.includes("BOTTOM") ? 98 : _posEnum.includes("TOP") ? 2 : 50)
    : (_posEnum.includes("BOTTOM") ? 88 : _posEnum.includes("TOP") ? 12 : 50);
  const _px = badge.positionX != null ? badge.positionX : _fallbackPx;
  const _py = badge.positionY != null ? badge.positionY : _fallbackPy;

  // Build badge style using the exact same function as the live preview
  const badgeStyle = {
    ...buildBadgeStyle({
      color: badge.color,
      textColor: badge.textColor,
      shape: badge.shape,
      edgeStyle: badge.edgeStyle || "SMOOTH",
      size: badge.size || 12,
      px: _px,
      py: _py,
      gradientEnabled: badge.gradientEnabled,
      gradientColorEnd: badge.gradientColorEnd,
      gradientDirection: badge.gradientDirection || "to right",
      cpCorner: badge.position || "TOP_LEFT",
      cpExpanded: badge.shape === "CORNER_POP" ? hovered : false,
      fontFamily: badge.fontFamily || "system",
      textTransform: badge.textTransform || "none",
      borderWidth: badge.borderWidth ?? 0,
      borderColor: badge.borderColor || "#ffffff",
      shadowStyle: badge.shadowStyle || "none",
    }),
    cursor: "default",
  };

  // Animation style — mirrors buildAnimStyle() in the builder
  const _anim = badge.animEffect || "none";
  const animStyle = _anim === "pulse"
    ? { animation: "bb-pulse 1.6s ease-in-out infinite" }
    : _anim === "glow"
    ? { animation: "bb-glow 2s ease-in-out infinite" }
    : _anim === "shimmer"
    ? { backgroundImage: `linear-gradient(120deg,${badge.color} 0%,${badge.color} 30%,#fff9 50%,${badge.color} 70%,${badge.color} 100%)`, backgroundSize: "200% auto", animation: "bb-shimmer 2.4s linear infinite" }
    : {};

  // Hover visibility (fade / slide-in)
  const _slideOffset = CARD_SLIDE_OFFSET[badge.slideFrom] || CARD_SLIDE_OFFSET.LEFT;
  const visStyle = badge.slideIn
    ? {
        opacity: hovered ? 1 : 0,
        transform: hovered
          ? (badgeStyle.transform || "")
          : `${badgeStyle.transform || ""} ${_slideOffset}`.trim(),
        transition: `transform ${badge.hoverDuration || 300}ms cubic-bezier(0.4,0,0.2,1), opacity ${badge.hoverDuration || 300}ms ease`,
      }
    : badge.hoverOnly
    ? { opacity: hovered ? 1 : 0, transition: `opacity ${badge.hoverDuration || 300}ms ease` }
    : {};

  const badgeContent = badge.iconDataUrl
    ? <img src={badge.iconDataUrl} alt="" style={{ width: "1.4em", height: "1.4em", objectFit: "contain", display: "block" }} />
    : badge.label;

  const renderedBadge = (() => {
    if (badge.shape === "CORNER_POP") {
      return <div style={{ ...badgeStyle, ...animStyle }}>{badgeContent}</div>;
    }
    if (badge.shape === "BAR") {
      return (
        <div style={{ ...badgeStyle, ...animStyle, ...visStyle }}>
          {badge.scrollingEnabled && !badge.iconDataUrl ? (
            <span style={{ display: "inline-block", whiteSpace: "nowrap", animation: `bb-marquee ${badge.scrollSpeed || 20}s linear infinite` }}>
              {(() => { const seg = badge.label + "\u00a0\u00a0·\u00a0\u00a0"; return seg.repeat(16); })()}
            </span>
          ) : badgeContent}
        </div>
      );
    }
    return <span style={{ ...badgeStyle, ...animStyle, ...visStyle }}>{badgeContent}</span>;
  })();

  return (
    <div style={{
      border: "1px solid #e1e3e5", borderRadius: 12, overflow: "hidden",
      background: "#fff", display: "flex", flexDirection: "column",
      boxShadow: "0 4px 12px rgba(0,0,0,0.10), 0 1px 3px rgba(0,0,0,0.08)",
      opacity: isDeleting ? 0.4 : 1, transition: "opacity 0.2s ease",
    }}>
      {/* Product mockup */}
      <div
        style={{ position: "relative", aspectRatio: "1 / 1", background: "#f6f6f7", overflow: "hidden" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {previewImage ? (
          <img src={previewImage} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }} />
        ) : (
          <>
            <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(135deg,#efefef 0px,#efefef 1px,#f6f6f7 1px,#f6f6f7 24px)" }} />
            <div style={{ position: "absolute", bottom: "15%", left: "50%", transform: "translateX(-50%)", width: "55%", height: "60%", background: "#e3e3e3", borderRadius: 6 }} />
          </>
        )}
        {renderedBadge}
        {!badge.active && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#888", background: "#fff", padding: "3px 10px", borderRadius: 99, border: "1px solid #ddd" }}>Inactive</span>
          </div>
        )}
      </div>

      {/* Info + actions */}
      <div style={{ padding: "12px 14px 14px", flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ height: 9, background: "#e1e3e5", borderRadius: 4, width: "70%" }} />
        <div style={{ height: 9, background: "#e1e3e5", borderRadius: 4, width: "40%", marginBottom: 6 }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Text variant="headingSm">{badge.label}</Text>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99,
            background: badge.active ? "#f0fdf4" : "#f4f4f5",
            color: badge.active ? "#15803d" : "#888",
            border: `1px solid ${badge.active ? "#bbf7d0" : "#e4e4e7"}`,
          }}>
            {badge.active ? "Active" : "Inactive"}
          </span>
        </div>
        <div style={{ fontSize: 11, color: "#999", marginBottom: 2 }}>
          {badge.type.replace(/_/g, " ")} · {badge.shape.replace(/_/g, " ")}
        </div>

        {/* Analytics: product count */}
        <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>
          {badge.targetType === "ALL"
            ? totalProductCount != null ? `${totalProductCount} products` : "All products"
            : badge.targetType === "COLLECTION"
            ? (() => { const n = badge.syncedTargetIds?.split(",").filter(Boolean).length ?? 0; return `${n} products (synced)`; })()
            : badge.type === "LOW_STOCK"
            ? (() => { const n = badge.syncedTargetIds?.split(",").filter(Boolean).length ?? 0; return `${n} low-stock products`; })()
            : (() => { const n = badge.targetIds?.split(",").filter(Boolean).length ?? 0; return `${n} product${n !== 1 ? "s" : ""} targeted`; })()
          }
          {(badge.startsAt || badge.endsAt) && (
            <span style={{ marginLeft: 6, color: "#bbb" }}>· 📅 Scheduled</span>
          )}
        </div>

        <div style={{ display: "flex", gap: 6, marginTop: "auto", paddingTop: 8, flexWrap: "wrap", alignItems: "center" }}>
          {/* Priority reorder */}
          <div style={{ display: "flex", gap: 2 }}>
            <button
              disabled={isFirst}
              onClick={() => fetcher.submit({ intent: "reorder", badgeId: badge.id, direction: "up" }, { method: "post" })}
              style={{ background: "transparent", border: "1px solid #e1e3e5", borderRadius: 3, width: 24, height: 24, cursor: isFirst ? "default" : "pointer", color: isFirst ? "#ddd" : "#666", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}
              title="Move up (higher priority)"
            >↑</button>
            <button
              disabled={isLast}
              onClick={() => fetcher.submit({ intent: "reorder", badgeId: badge.id, direction: "down" }, { method: "post" })}
              style={{ background: "transparent", border: "1px solid #e1e3e5", borderRadius: 3, width: 24, height: 24, cursor: isLast ? "default" : "pointer", color: isLast ? "#ddd" : "#666", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}
              title="Move down (lower priority)"
            >↓</button>
          </div>
          <Button size="slim" onClick={() => onEdit(badge)}>Edit</Button>
          <Button
            size="slim"
            onClick={() => fetcher.submit(
              { intent: "toggle", badgeId: badge.id, active: String(!badge.active) },
              { method: "post" }
            )}
          >
            {badge.active ? "Deactivate" : "Activate"}
          </Button>
          {confirmDelete ? (
            <InlineStack gap="100">
              <Button size="slim" tone="critical"
                onClick={() => fetcher.submit({ intent: "delete", badgeId: badge.id }, { method: "post" })}
              >
                Confirm
              </Button>
              <Button size="slim" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            </InlineStack>
          ) : (
            <Button size="slim" tone="critical" onClick={() => setConfirmDelete(true)}>Delete</Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────
export default function Dashboard() {
  const { shop, plan, badges, badgeCount, totalProductCount, themeExtensionEnabled } = useLoaderData();
  const fetcher = useFetcher();
  const syncFetcher = useFetcher();
  const [previewImage, setPreviewImage] = useState(null);
  const [editingBadge, setEditingBadge] = useState(null);
  const builderRef = useRef(null);
  const isPro = plan === "PRO";
  const atLimit = !isPro && badgeCount >= 3;
  const isSyncing = syncFetcher.state !== "idle";
  const syncResult = syncFetcher.data;

  return (
    <Page
      title="Badge Blitz"
      subtitle={`${shop} · ${isPro ? "Pro Plan" : "Free Plan"}`}
      primaryAction={{
        content: "Create Badge",
        url: "/app/badges/new",
        disabled: atLimit,
      }}
      secondaryActions={[
        {
          content: isSyncing ? "Syncing…" : "Sync Inventory",
          disabled: isSyncing,
          onAction: () =>
            syncFetcher.submit({}, { method: "post", action: "/app/sync" }),
        },
      ]}
    >
      <Layout>
        {/* Intro section */}
        <Layout.Section>
          <div style={{
            borderRadius: 12,
            border: "1px solid #e1e3e5",
            padding: "40px 48px",
            background: "#fafafa",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}>
            <div style={{ maxWidth: 600 }}>
              <div style={{ marginBottom: 8 }}>
                <span style={{ background: "#000", color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", padding: "3px 10px" }}>
                  Product Badges
                </span>
              </div>

              <h2 style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.15, margin: "16px 0 12px", letterSpacing: "-0.5px", color: "#000" }}>
                Put the right badge on<br />the right product.
              </h2>

              <p style={{ fontSize: 15, lineHeight: 1.65, color: "#555", margin: "0 0 12px" }}>
                Badge Blitz lets you overlay sale tags, new arrival labels, low stock alerts,
                and fully custom badges directly onto your product images — everywhere they appear
                in your store.
              </p>

              <p style={{ fontSize: 15, lineHeight: 1.65, color: "#555", margin: "0 0 28px" }}>
                No theme editing required. Enable the app embed once in your theme customizer
                and badges appear automatically across collection pages, product pages, and search results.
              </p>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <a
                  href="#my-badges"
                  style={{ display: "inline-block", background: "#000", color: "#fff", fontWeight: 700, fontSize: 13, padding: "11px 22px", textDecoration: "none", letterSpacing: "0.2px" }}
                >
                  Browse my badges
                </a>
                <a
                  href="#custom-builder"
                  style={{ display: "inline-block", background: "#fff", color: "#000", fontWeight: 700, fontSize: 13, padding: "11px 22px", textDecoration: "none", letterSpacing: "0.2px", border: "1.5px solid #000" }}
                >
                  Build a custom badge
                </a>
              </div>
            </div>
          </div>
        </Layout.Section>

        {/* Banners */}
        {syncResult?.success && (
          <Layout.Section>
            <Banner tone="success" title="Inventory synced">
              Updated {syncResult.synced} LOW_STOCK badge
              {syncResult.synced !== 1 ? "s" : ""} with live stock data.
            </Banner>
          </Layout.Section>
        )}
        {syncResult?.error && (
          <Layout.Section>
            <Banner tone="critical" title="Sync failed">
              {syncResult.error}
            </Banner>
          </Layout.Section>
        )}
        {atLimit && (
          <Layout.Section>
            <Banner
              title="You've reached the free badge limit"
              tone="warning"
              action={{ content: "Upgrade to PRO — $4.99/mo", url: "/app/upgrade" }}
            >
              Free stores can run up to 3 active badges. Upgrade for unlimited.
            </Banner>
          </Layout.Section>
        )}
        {themeExtensionEnabled === false && (
          <Layout.Section>
            <Banner
              title="Badge Blitz theme extension is not enabled"
              tone="warning"
              action={{ content: "Open theme editor", url: `https://${shop}/admin/themes/current/editor?context=apps`, target: "_blank" }}
            >
              Your badges won't appear on your storefront until you enable the app embed in your theme customizer under App embeds.
            </Banner>
          </Layout.Section>
        )}

        {/* Custom badge builder */}
        <Layout.Section>
          <div id="custom-builder" ref={builderRef}>
            <CustomBadgeBuilder disabled={atLimit && !editingBadge} previewImage={previewImage} onImageChange={setPreviewImage} editingBadge={editingBadge} onEditDone={() => setEditingBadge(null)} />
          </div>
        </Layout.Section>

        {/* Featured Badges */}
        <Layout.Section>
          <FeaturedBadges disabled={atLimit} />
        </Layout.Section>

        {/* My Badges gallery */}
        <Layout.Section>
          <div id="my-badges">
            <BlockStack gap="400">
              <Divider />
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="100">
                  <Text variant="headingXl">My Badges</Text>
                  <Text tone="subdued">
                    {isPro
                      ? `${badgeCount} badge${badgeCount !== 1 ? "s" : ""} — Unlimited plan`
                      : `${badgeCount} / 3 free badges used`}
                    {" "}— Use the builder above to create, then edit or delete here.
                  </Text>
                </BlockStack>
                {!isPro && (
                  <Button variant="primary" url="/app/upgrade" size="slim">Upgrade for unlimited</Button>
                )}
              </InlineStack>

              {badges.length === 0 ? (
                <OnboardingChecklist shop={shop} themeExtensionEnabled={themeExtensionEnabled} />
              ) : (
                <InlineGrid columns={{ xs: 2, sm: 3, md: 3 }} gap="400">
                  {badges.map((badge, idx) => (
                    <MyBadgeCard
                      key={badge.id}
                      badge={badge}
                      previewImage={previewImage}
                      fetcher={fetcher}
                      isFirst={idx === 0}
                      isLast={idx === badges.length - 1}
                      totalProductCount={totalProductCount}
                      onEdit={(b) => {
                        setEditingBadge(b);
                        builderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                    />
                  ))}
                </InlineGrid>
              )}
            </BlockStack>
          </div>
        </Layout.Section>

        {/* Product Badge Stacks — PRO */}
        <Layout.Section>
          <ProductBadgeManager badges={badges} isPro={isPro} />
        </Layout.Section>

        <Box minHeight="400px" />
      </Layout>
    </Page>
  );
}
