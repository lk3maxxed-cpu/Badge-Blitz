// app/routes/app.upgrade.jsx
// PRO upgrade page — initiates Shopify billing subscription
import { redirect, useLoaderData } from "react-router";
import { Page, Layout, Card, BlockStack, Text, List, Button, Badge, InlineStack, Box, Divider } from "@shopify/polaris";
import { authenticate, PLAN_PRO } from "../shopify.server";
import db from "../db.server";

export async function loader({ request }) {
  const { session, billing } = await authenticate.admin(request);

  const { hasActivePayment } = await billing.check({
    plans: [PLAN_PRO],
    isTest: process.env.NODE_ENV !== "production",
  });

  if (hasActivePayment) {
    // Already PRO — sync DB and send back to dashboard
    await db.shop.update({
      where: { shopDomain: session.shop },
      data: { plan: "PRO" },
    });
    throw redirect("/app");
  }

  return { shop: session.shop };
}

export async function action({ request }) {
  const { billing } = await authenticate.admin(request);

  await billing.request({
    plan: PLAN_PRO,
    isTest: process.env.NODE_ENV !== "production",
    returnUrl: `${process.env.SHOPIFY_APP_URL}/app`,
  });

  // billing.request() throws a redirect to Shopify's billing confirmation page
  // so nothing below this line runs
  return null;
}

export default function UpgradePage() {
  const { shop } = useLoaderData();

  return (
    <Page
      title="Upgrade to PRO"
      backAction={{ content: "Back", url: "/app" }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="100">
                  <Text variant="headingXl">Badge Blitz PRO</Text>
                  <Text variant="bodyMd" tone="subdued">{shop}</Text>
                </BlockStack>
                <BlockStack gap="100" inlineAlign="end">
                  <InlineStack gap="100" blockAlign="center">
                    <Text variant="heading2xl">$4.99</Text>
                    <Text variant="bodyMd" tone="subdued">/ month</Text>
                  </InlineStack>
                  <Badge tone="success">Cancel anytime</Badge>
                </BlockStack>
              </InlineStack>

              <Divider />

              <BlockStack gap="300">
                <Text variant="headingMd">Everything in Free, plus:</Text>
                <List type="bullet">
                  <List.Item>
                    <Text as="span"><strong>Unlimited badges</strong> — no 3-badge cap</Text>
                  </List.Item>
                  <List.Item>
                    <Text as="span"><strong>Product Badge Stacks</strong> — assign multiple badges to specific products</Text>
                  </List.Item>
                  <List.Item>
                    <Text as="span"><strong>Priority support</strong> — faster response times</Text>
                  </List.Item>
                </List>
              </BlockStack>

              <Divider />

              <BlockStack gap="200">
                <form method="post">
                  <Button variant="primary" size="large" submit fullWidth>
                    Subscribe for $4.99 / month
                  </Button>
                </form>
                <Box paddingBlockStart="100">
                  <Text variant="bodySm" tone="subdued" alignment="center">
                    Billed through Shopify. Cancel any time from your Shopify admin.
                    You won't be charged until after the 3-day free trial.
                  </Text>
                </Box>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd">Free plan</Text>
              <List type="bullet">
                <List.Item>Up to 3 badges</List.Item>
                <List.Item>All badge shapes & styles</List.Item>
                <List.Item>Gradient, hover & scroll effects</List.Item>
                <List.Item>Low-stock auto-sync</List.Item>
              </List>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
