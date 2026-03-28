// app/routes/app.badges.new.jsx
import { useState } from "react";
import { useActionData, useSubmit, useSearchParams } from "react-router";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Select,
  Button,
  BlockStack,
  InlineStack,
  Banner,
  Text,
  Checkbox,
  RangeSlider,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { data, redirect } from "react-router";
import db from "../db.server";

export async function loader({ request }) {
  await authenticate.admin(request);
  return null;
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  const formData = await request.formData();

  const shopRecord = await db.shop.findUnique({ where: { shopDomain: shop } });
  if (!shopRecord) {
    return data({ error: "Shop not found." }, { status: 400 });
  }

  if (shopRecord.plan === "FREE") {
    const activeCount = await db.badge.count({
      where: { shopId: shopRecord.id, active: true },
    });
    if (activeCount >= 3) {
      return data(
        { error: "Free plan limit of 3 active badges reached. Upgrade to Pro for unlimited badges." },
        { status: 400 }
      );
    }
  }

  const label = formData.get("label");
  if (!label || !label.trim()) {
    return data({ error: "Label is required." }, { status: 400 });
  }

  const px = formData.get("positionX");
  const py = formData.get("positionY");

  await db.badge.create({
    data: {
      shopId: shopRecord.id,
      type: formData.get("type"),
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
      scrollingEnabled: formData.get("scrollingEnabled") === "true",
      scrollSpeed: parseInt(formData.get("scrollSpeed") || "20", 10),
      autoDiscount: formData.get("autoDiscount") === "true",
      stockThreshold: formData.get("stockThreshold") ? parseInt(formData.get("stockThreshold"), 10) : 5,
      targetType: formData.get("targetType") || "ALL",
      targetIds: formData.get("targetIds") || null,
      priority: parseInt(formData.get("priority") || "0", 10),
      active: true,
    },
  });

  return redirect("/app");
}

const TYPE_DEFAULTS = { SALE: "Sale", NEW_ARRIVAL: "New", LOW_STOCK: "Low Stock", CUSTOM: "Custom" };

export default function NewBadge() {
  const actionData = useActionData();
  const submit = useSubmit();
  const [params] = useSearchParams();

  // Pre-fill from custom builder URL params if present
  const [type, setType] = useState("SALE");
  const [label, setLabel] = useState(params.get("label") || "Sale");
  const [color, setColor] = useState(params.get("color") || "#FF4136");
  const [textColor, setTextColor] = useState(params.get("textColor") || "#FFFFFF");
  const [shape, setShape] = useState(params.get("shape") || "PILL");
  const [position, setPosition] = useState("TOP_LEFT");
  const [size, setSize] = useState(parseInt(params.get("size") || "12", 10));
  const [edgeStyle, setEdgeStyle] = useState(params.get("edgeStyle") || "SMOOTH");
  const [positionX] = useState(params.get("px") || null);
  const [positionY] = useState(params.get("py") || null);
  const [gradientEnabled, setGradientEnabled] = useState(params.get("gradientEnabled") === "true");
  const [gradientColorEnd, setGradientColorEnd] = useState(params.get("gradientColorEnd") || "#553C9A");
  const [gradientDirection, setGradientDirection] = useState(params.get("gradientDirection") || "to right");
  const [hoverOnly, setHoverOnly] = useState(params.get("hoverOnly") === "true");
  const [hoverDuration, setHoverDuration] = useState(parseInt(params.get("hoverDuration") || "300", 10));
  const [scrollingEnabled, setScrollingEnabled] = useState(params.get("scrollingEnabled") === "true");
  const [scrollSpeed, setScrollSpeed] = useState(parseInt(params.get("scrollSpeed") || "20", 10));
  const [autoDiscount, setAutoDiscount] = useState(false);
  const [stockThreshold, setStockThreshold] = useState("5");
  const [targetType, setTargetType] = useState("ALL");
  const [targetIds, setTargetIds] = useState("");
  const [priority, setPriority] = useState("0");

  const handleTypeChange = (val) => {
    setType(val);
    setLabel(TYPE_DEFAULTS[val] || "");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("type", type);
    fd.append("label", label);
    fd.append("color", color);
    fd.append("textColor", textColor);
    fd.append("shape", shape);
    fd.append("position", position);
    fd.append("size", String(size));
    fd.append("edgeStyle", edgeStyle);
    if (positionX !== null) fd.append("positionX", positionX);
    if (positionY !== null) fd.append("positionY", positionY);
    fd.append("gradientEnabled", String(gradientEnabled));
    fd.append("gradientColorEnd", gradientColorEnd);
    fd.append("gradientDirection", gradientDirection);
    fd.append("hoverOnly", String(hoverOnly));
    fd.append("hoverDuration", String(hoverDuration));
    fd.append("scrollingEnabled", String(scrollingEnabled));
    fd.append("scrollSpeed", String(scrollSpeed));
    fd.append("autoDiscount", String(autoDiscount));
    fd.append("stockThreshold", stockThreshold);
    fd.append("targetType", targetType);
    fd.append("targetIds", targetIds);
    fd.append("priority", priority);
    submit(fd, { method: "post" });
  };

  const typeOptions = [
    { label: "Sale", value: "SALE" },
    { label: "New Arrival", value: "NEW_ARRIVAL" },
    { label: "Low Stock", value: "LOW_STOCK" },
    { label: "Custom", value: "CUSTOM" },
  ];

  const shapeOptions = [
    { label: "Pill", value: "PILL" },
    { label: "Square", value: "SQUARE" },
    { label: "Circle", value: "CIRCLE" },
    { label: "Ribbon", value: "RIBBON" },
    { label: "Full-width Bar", value: "BAR" },
    { label: "Corner Pop", value: "CORNER_POP" },
  ];

  const edgeOptions = [
    { label: "Smooth", value: "SMOOTH" },
    { label: "Ridged (starburst)", value: "RIDGED" },
  ];

  const positionOptions = [
    { label: "Top Left", value: "TOP_LEFT" },
    { label: "Top Right", value: "TOP_RIGHT" },
    { label: "Bottom Left", value: "BOTTOM_LEFT" },
    { label: "Bottom Right", value: "BOTTOM_RIGHT" },
  ];

  const targetOptions = [
    { label: "All Products", value: "ALL" },
    { label: "Specific Products", value: "SPECIFIC" },
  ];

  const hasCustomPosition = positionX !== null && positionY !== null;

  // Preview badge style
  const previewStyle = {
    position: "absolute",
    top: hasCustomPosition ? `${positionY}%` : position.includes("BOTTOM") ? "auto" : 8,
    bottom: hasCustomPosition ? "auto" : position.includes("BOTTOM") ? 8 : "auto",
    left: hasCustomPosition ? `${positionX}%` : position.includes("RIGHT") ? "auto" : 8,
    right: hasCustomPosition ? "auto" : position.includes("RIGHT") ? 8 : "auto",
    transform: hasCustomPosition ? "translate(-50%, -50%)" : "none",
    background: color,
    color: textColor,
    fontSize: size,
    fontWeight: 700,
    letterSpacing: "0.4px",
    whiteSpace: "nowrap",
    pointerEvents: "none",
    padding: shape === "PILL" ? "4px 10px" : shape === "CIRCLE" ? 0 : shape === "RIBBON" ? "4px 12px 4px 8px" : "4px 8px",
    borderRadius: shape === "PILL" ? 999 : shape === "CIRCLE" ? "50%" : shape === "SQUARE" ? 4 : "0 4px 4px 0",
    width: shape === "CIRCLE" ? Math.round(size * 3.2) : "auto",
    height: shape === "CIRCLE" ? Math.round(size * 3.2) : "auto",
    display: shape === "CIRCLE" ? "flex" : "block",
    alignItems: shape === "CIRCLE" ? "center" : "unset",
    justifyContent: shape === "CIRCLE" ? "center" : "unset",
    textAlign: shape === "CIRCLE" ? "center" : "unset",
  };

  return (
    <Page title="Create Badge" backAction={{ content: "Back", url: "/app" }}>
      <Layout>
        {actionData?.error && (
          <Layout.Section>
            <Banner tone="critical" title="Error">{actionData.error}</Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <form onSubmit={handleSubmit}>
            <BlockStack gap="500">

              {/* Badge Settings */}
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd">Badge Settings</Text>
                  <FormLayout>
                    <Select label="Badge Type" options={typeOptions} value={type} onChange={handleTypeChange} />
                    <TextField label="Label" value={label} onChange={setLabel} autoComplete="off" helpText="Text shown on the badge" />
                    <FormLayout.Group>
                      <TextField
                        label="Badge Color (hex)"
                        value={color}
                        onChange={setColor}
                        autoComplete="off"
                        prefix={<span style={{ display: "inline-block", width: 16, height: 16, background: color, borderRadius: 3, border: "1px solid #ccc" }} />}
                      />
                      <TextField
                        label="Text Color (hex)"
                        value={textColor}
                        onChange={setTextColor}
                        autoComplete="off"
                        prefix={<span style={{ display: "inline-block", width: 16, height: 16, background: textColor, borderRadius: 3, border: "1px solid #ccc" }} />}
                      />
                    </FormLayout.Group>
                    <FormLayout.Group>
                      <Select label="Shape" options={shapeOptions} value={shape} onChange={setShape} />
                      {!hasCustomPosition && (
                        <Select label="Position" options={positionOptions} value={position} onChange={setPosition} />
                      )}
                    </FormLayout.Group>
                    {hasCustomPosition && (
                      <Banner tone="info" title="Custom position set">
                        This badge uses the exact position you dragged in the builder ({parseFloat(positionX).toFixed(0)}% from left, {parseFloat(positionY).toFixed(0)}% from top).
                      </Banner>
                    )}
                    <RangeSlider
                      label={`Size — ${size}px`}
                      value={size}
                      min={9}
                      max={24}
                      onChange={setSize}
                    />
                    {shape === "CIRCLE" && (
                      <Select label="Edge Style" options={edgeOptions} value={edgeStyle} onChange={setEdgeStyle} helpText="Ridged gives a starburst/seal shape" />
                    )}
                    {shape === "CORNER_POP" && (
                      <Banner tone="info" title="Corner Pop badge">
                        This badge sits as a small quarter-circle arc in the selected corner. When a shopper hovers over the product card it expands to reveal the full label. The Position field below controls which corner it lives in.
                      </Banner>
                    )}
                    <Select
                      label="Fill"
                      options={[
                        { label: "Solid color", value: "false" },
                        { label: "Gradient", value: "true" },
                      ]}
                      value={String(gradientEnabled)}
                      onChange={(v) => setGradientEnabled(v === "true")}
                    />
                    <Select
                      label="Visibility"
                      options={[
                        { label: "Always visible", value: "false" },
                        { label: "Appear on hover", value: "true" },
                      ]}
                      value={String(hoverOnly)}
                      onChange={(v) => setHoverOnly(v === "true")}
                      helpText="When set to hover, the badge fades in when a shopper hovers over the product"
                    />
                    {hoverOnly && (
                      <RangeSlider
                        label={`Fade speed — ${hoverDuration}ms`}
                        value={hoverDuration}
                        min={100}
                        max={1000}
                        step={50}
                        onChange={setHoverDuration}
                        helpText="How long the fade-in animation takes"
                      />
                    )}
                    {shape === "BAR" && (
                      <Select
                        label="Banner animation"
                        options={[
                          { label: "Static", value: "false" },
                          { label: "Infinite scrolling marquee", value: "true" },
                        ]}
                        value={String(scrollingEnabled)}
                        onChange={(v) => setScrollingEnabled(v === "true")}
                        helpText="Scrolling animates the text continuously across the bar"
                      />
                    )}
                    {shape === "BAR" && scrollingEnabled && (
                      <RangeSlider
                        label={`Scroll speed — ${scrollSpeed}s cycle`}
                        value={scrollSpeed}
                        min={5}
                        max={60}
                        step={5}
                        onChange={setScrollSpeed}
                        helpText="Lower = faster scroll. 20s is a comfortable reading speed."
                      />
                    )}
                    {gradientEnabled && (
                      <FormLayout.Group>
                        <TextField
                          label="End Color (hex)"
                          value={gradientColorEnd}
                          onChange={setGradientColorEnd}
                          autoComplete="off"
                          prefix={<span style={{ display: "inline-block", width: 16, height: 16, background: gradientColorEnd, borderRadius: 3, border: "1px solid #ccc" }} />}
                          helpText="Gradient blends from Badge Color to this"
                        />
                        <Select
                          label="Direction"
                          options={[
                            { label: "Left → Right", value: "to right" },
                            { label: "Right → Left", value: "to left" },
                            { label: "Top → Bottom", value: "to bottom" },
                            { label: "Bottom → Top", value: "to top" },
                            { label: "↘ Diagonal", value: "to bottom right" },
                            { label: "↙ Diagonal", value: "to bottom left" },
                            { label: "↗ Diagonal", value: "to top right" },
                            { label: "↖ Diagonal", value: "to top left" },
                          ]}
                          value={gradientDirection}
                          onChange={setGradientDirection}
                        />
                      </FormLayout.Group>
                    )}
                  </FormLayout>
                </BlockStack>
              </Card>

              {/* Type-specific settings */}
              {type === "SALE" && (
                <Card>
                  <BlockStack gap="400">
                    <Text variant="headingMd">Sale Settings</Text>
                    <Checkbox label="Auto-detect discounts" checked={autoDiscount} onChange={setAutoDiscount} helpText="Automatically show badge on products with a compare-at price" />
                  </BlockStack>
                </Card>
              )}

              {type === "LOW_STOCK" && (
                <Card>
                  <BlockStack gap="400">
                    <Text variant="headingMd">Low Stock Settings</Text>
                    <TextField label="Stock Threshold" type="number" value={stockThreshold} onChange={setStockThreshold} autoComplete="off" helpText="Show badge when inventory is at or below this number" />
                  </BlockStack>
                </Card>
              )}

              {/* Targeting */}
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd">Targeting</Text>
                  <FormLayout>
                    <Select label="Apply To" options={targetOptions} value={targetType} onChange={setTargetType} />
                    {targetType === "SPECIFIC" && (
                      <TextField label="Product IDs" value={targetIds} onChange={setTargetIds} multiline={3} autoComplete="off" helpText="Comma-separated Shopify product IDs (e.g. gid://shopify/Product/123456)" />
                    )}
                    <TextField label="Priority" type="number" value={priority} onChange={setPriority} autoComplete="off" helpText="Higher number = displayed first when multiple badges apply" />
                  </FormLayout>
                </BlockStack>
              </Card>

              {/* Preview */}
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd">Preview</Text>
                  <div style={{ position: "relative", display: "inline-block" }}>
                    <div style={{ width: 200, height: 200, background: "#f4f4f4", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa", fontSize: 13, border: "1px dashed #ddd" }}>
                      Product Image
                    </div>
                    <span style={previewStyle}>{label || "Badge"}</span>
                  </div>
                </BlockStack>
              </Card>

              <InlineStack gap="300" align="end">
                <Button url="/app">Cancel</Button>
                <Button variant="primary" submit>Create Badge</Button>
              </InlineStack>
            </BlockStack>
          </form>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
