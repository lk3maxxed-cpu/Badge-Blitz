// app/routes/app.badges.$id.edit.jsx
import { useState } from "react";
import { useActionData, useLoaderData, useSubmit } from "react-router";
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

export async function loader({ request, params }) {
  await authenticate.admin(request);
  const badge = await db.badge.findUnique({ where: { id: params.id } });
  if (!badge) throw new Response("Badge not found", { status: 404 });
  return data({ badge });
}

export async function action({ request, params }) {
  await authenticate.admin(request);
  const formData = await request.formData();

  const label = formData.get("label");
  if (!label || !label.trim()) {
    return data({ error: "Label is required." }, { status: 400 });
  }

  const px = formData.get("positionX");
  const py = formData.get("positionY");

  await db.badge.update({
    where: { id: params.id },
    data: {
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
    },
  });

  return redirect("/app");
}

export default function EditBadge() {
  const { badge } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();

  const [type, setType] = useState(badge.type);
  const [label, setLabel] = useState(badge.label);
  const [color, setColor] = useState(badge.color);
  const [textColor, setTextColor] = useState(badge.textColor);
  const [shape, setShape] = useState(badge.shape);
  const [position, setPosition] = useState(badge.position);
  const [size, setSize] = useState(badge.size);
  const [edgeStyle, setEdgeStyle] = useState(badge.edgeStyle);
  const [gradientEnabled, setGradientEnabled] = useState(badge.gradientEnabled);
  const [gradientColorEnd, setGradientColorEnd] = useState(badge.gradientColorEnd || "#553C9A");
  const [gradientDirection, setGradientDirection] = useState(badge.gradientDirection);
  const [hoverOnly, setHoverOnly] = useState(badge.hoverOnly);
  const [hoverDuration, setHoverDuration] = useState(badge.hoverDuration);
  const [scrollingEnabled, setScrollingEnabled] = useState(badge.scrollingEnabled);
  const [scrollSpeed, setScrollSpeed] = useState(badge.scrollSpeed);
  const [autoDiscount, setAutoDiscount] = useState(badge.autoDiscount);
  const [stockThreshold, setStockThreshold] = useState(String(badge.stockThreshold ?? 5));
  const [targetType, setTargetType] = useState(badge.targetType);
  const [targetIds, setTargetIds] = useState(badge.targetIds || "");
  const [priority, setPriority] = useState(String(badge.priority));

  const hasCustomPosition = badge.positionX != null && badge.positionY != null;

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
    if (badge.positionX != null) fd.append("positionX", String(badge.positionX));
    if (badge.positionY != null) fd.append("positionY", String(badge.positionY));
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

  // Preview badge style
  const previewStyle = {
    position: "absolute",
    top: hasCustomPosition ? `${badge.positionY}%` : position.includes("BOTTOM") ? "auto" : 8,
    bottom: hasCustomPosition ? "auto" : position.includes("BOTTOM") ? 8 : "auto",
    left: hasCustomPosition ? `${badge.positionX}%` : position.includes("RIGHT") ? "auto" : 8,
    right: hasCustomPosition ? "auto" : position.includes("RIGHT") ? 8 : "auto",
    transform: hasCustomPosition ? "translate(-50%, -50%)" : "none",
    background: gradientEnabled && gradientColorEnd
      ? `linear-gradient(${gradientDirection}, ${color}, ${gradientColorEnd})`
      : color,
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

  return (
    <Page title="Edit Badge" backAction={{ content: "Back", url: "/app" }}>
      <Layout>
        {actionData?.error && (
          <Layout.Section>
            <Banner tone="critical" title="Error">{actionData.error}</Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <form onSubmit={handleSubmit}>
            <BlockStack gap="500">

              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd">Badge Settings</Text>
                  <FormLayout>
                    <Select label="Badge Type" options={typeOptions} value={type} onChange={setType} />
                    <TextField label="Label" value={label} onChange={setLabel} autoComplete="off" helpText="Text shown on the badge" />
                    <FormLayout.Group>
                      <TextField
                        label="Badge Color (hex)" value={color} onChange={setColor} autoComplete="off"
                        prefix={<span style={{ display: "inline-block", width: 16, height: 16, background: color, borderRadius: 3, border: "1px solid #ccc" }} />}
                      />
                      <TextField
                        label="Text Color (hex)" value={textColor} onChange={setTextColor} autoComplete="off"
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
                        This badge uses the exact position dragged in the builder ({parseFloat(badge.positionX).toFixed(0)}% from left, {parseFloat(badge.positionY).toFixed(0)}% from top).
                      </Banner>
                    )}
                    <RangeSlider label={`Size — ${size}px`} value={size} min={9} max={24} onChange={setSize} />
                    {shape === "CIRCLE" && (
                      <Select label="Edge Style" options={edgeOptions} value={edgeStyle} onChange={setEdgeStyle} helpText="Ridged gives a starburst/seal shape" />
                    )}
                    <Select
                      label="Fill"
                      options={[{ label: "Solid color", value: "false" }, { label: "Gradient", value: "true" }]}
                      value={String(gradientEnabled)}
                      onChange={(v) => setGradientEnabled(v === "true")}
                    />
                    {gradientEnabled && (
                      <FormLayout.Group>
                        <TextField
                          label="End Color (hex)" value={gradientColorEnd} onChange={setGradientColorEnd} autoComplete="off"
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
                    <Select
                      label="Visibility"
                      options={[{ label: "Always visible", value: "false" }, { label: "Appear on hover", value: "true" }]}
                      value={String(hoverOnly)}
                      onChange={(v) => setHoverOnly(v === "true")}
                      helpText="When set to hover, the badge fades in when a shopper hovers over the product"
                    />
                    {hoverOnly && (
                      <RangeSlider
                        label={`Fade speed — ${hoverDuration}ms`} value={hoverDuration} min={100} max={1000} step={50}
                        onChange={setHoverDuration} helpText="How long the fade-in animation takes"
                      />
                    )}
                    {shape === "BAR" && (
                      <Select
                        label="Banner animation"
                        options={[{ label: "Static", value: "false" }, { label: "Infinite scrolling marquee", value: "true" }]}
                        value={String(scrollingEnabled)}
                        onChange={(v) => setScrollingEnabled(v === "true")}
                        helpText="Scrolling animates the text continuously across the bar"
                      />
                    )}
                    {shape === "BAR" && scrollingEnabled && (
                      <RangeSlider
                        label={`Scroll speed — ${scrollSpeed}s cycle`} value={scrollSpeed} min={5} max={60} step={5}
                        onChange={setScrollSpeed} helpText="Lower = faster scroll."
                      />
                    )}
                  </FormLayout>
                </BlockStack>
              </Card>

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

              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd">Targeting</Text>
                  <FormLayout>
                    <Select label="Apply To" options={targetOptions} value={targetType} onChange={setTargetType} />
                    {targetType === "SPECIFIC" && (
                      <TextField label="Product IDs" value={targetIds} onChange={setTargetIds} multiline={3} autoComplete="off" helpText="Comma-separated Shopify product IDs" />
                    )}
                    <TextField label="Priority" type="number" value={priority} onChange={setPriority} autoComplete="off" helpText="Higher number = displayed first when multiple badges apply" />
                  </FormLayout>
                </BlockStack>
              </Card>

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
                <Button variant="primary" submit>Save Changes</Button>
              </InlineStack>

            </BlockStack>
          </form>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
