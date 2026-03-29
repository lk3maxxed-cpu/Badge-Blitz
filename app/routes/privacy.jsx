// app/routes/privacy.jsx
// Publicly accessible — no auth required
// URL: https://badge-blitz-production.up.railway.app/privacy

export default function PrivacyPolicy() {
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.logo}>BADGE BLITZ</div>
          <h1 style={styles.title}>Privacy Policy</h1>
          <p style={styles.date}>Effective date: March 29, 2026</p>
        </div>

        <Section title="1. Overview">
          Badge Blitz ("the App") is a Shopify application developed by Lawrence Kirk
          ("we", "us", "our"). This Privacy Policy explains what information we collect
          when you install and use Badge Blitz, how we use it, and how we protect it.
          By installing the App, you agree to the practices described in this policy.
        </Section>

        <Section title="2. Information We Collect">
          <p style={styles.bodyText}>We collect only what is necessary to provide the App's functionality:</p>
          <ul style={styles.list}>
            <li style={styles.listItem}>
              <strong>Shop domain</strong> — your myshopify.com domain, used to identify
              your store and associate your badge configuration with your account.
            </li>
            <li style={styles.listItem}>
              <strong>Badge configuration data</strong> — labels, colors, shapes, positions,
              and targeting rules you create inside the App. This is merchant-created content,
              not personal data.
            </li>
            <li style={styles.listItem}>
              <strong>Shopify access token</strong> — a scoped OAuth token issued by Shopify
              that allows the App to read your product and inventory data. We store this
              securely in our database and never expose it.
            </li>
            <li style={styles.listItem}>
              <strong>Inventory data</strong> — product IDs and inventory quantities, fetched
              via the Shopify Admin API solely to power Low Stock badge automation. This data
              is not stored long-term; only the resulting list of low-stock product IDs is saved.
            </li>
          </ul>
          <p style={styles.bodyText}>
            <strong>We do not collect any personal data about your customers.</strong> Badge
            Blitz injects visual overlays on your storefront but does not track, identify, or
            store any end-shopper information.
          </p>
        </Section>

        <Section title="3. How We Use Your Information">
          <ul style={styles.list}>
            <li style={styles.listItem}>To display your badges on your storefront via the theme extension.</li>
            <li style={styles.listItem}>To sync inventory levels and determine which products qualify for Low Stock badges.</li>
            <li style={styles.listItem}>To maintain your session and authenticate requests to the Shopify Admin API.</li>
            <li style={styles.listItem}>To manage your subscription plan (Free or PRO) through Shopify Billing.</li>
          </ul>
          <p style={styles.bodyText}>We do not sell, rent, or share your data with third parties for marketing purposes.</p>
        </Section>

        <Section title="4. Data Storage and Security">
          <p style={styles.bodyText}>
            Your data is stored in a PostgreSQL database hosted on Neon (neon.tech), a
            SOC 2 Type II compliant cloud database provider. Data is encrypted at rest and
            in transit. Access is restricted to the application server only.
          </p>
          <p style={styles.bodyText}>
            The App is hosted on Railway (railway.app). All traffic is served over HTTPS.
          </p>
        </Section>

        <Section title="5. Data Retention and Deletion">
          <p style={styles.bodyText}>
            When you uninstall Badge Blitz, we immediately delete all data associated with
            your store — including your shop record, all badge configurations, and your
            Shopify session — from our database. This happens automatically via Shopify's
            app/uninstalled webhook.
          </p>
          <p style={styles.bodyText}>
            In accordance with Shopify's GDPR requirements, we also respond to shop/redact
            webhooks by permanently erasing any remaining data 48 hours after uninstall.
          </p>
        </Section>

        <Section title="6. Customer Data (GDPR / CCPA)">
          <p style={styles.bodyText}>
            Badge Blitz does not collect, store, or process any personal data belonging to
            your store's customers. If you receive a customer data request or deletion
            request, Badge Blitz has no customer records to provide or delete.
          </p>
          <p style={styles.bodyText}>
            We respond to Shopify's mandatory GDPR webhooks:
          </p>
          <ul style={styles.list}>
            <li style={styles.listItem}><strong>customers/data_request</strong> — acknowledged; no customer data held.</li>
            <li style={styles.listItem}><strong>customers/redact</strong> — acknowledged; no customer data held.</li>
            <li style={styles.listItem}><strong>shop/redact</strong> — all merchant data permanently deleted.</li>
          </ul>
        </Section>

        <Section title="7. Third-Party Services">
          <p style={styles.bodyText}>The App uses the following third-party infrastructure:</p>
          <ul style={styles.list}>
            <li style={styles.listItem}><strong>Shopify</strong> — authentication, billing, and webhook delivery. Subject to Shopify's Privacy Policy.</li>
            <li style={styles.listItem}><strong>Neon</strong> — database hosting. Subject to Neon's Privacy Policy.</li>
            <li style={styles.listItem}><strong>Railway</strong> — application hosting. Subject to Railway's Privacy Policy.</li>
          </ul>
          <p style={styles.bodyText}>No analytics, advertising, or tracking services are used.</p>
        </Section>

        <Section title="8. Changes to This Policy">
          We may update this Privacy Policy from time to time. If we make material changes,
          we will update the effective date at the top of this page. Continued use of the
          App after changes constitutes acceptance of the updated policy.
        </Section>

        <Section title="9. Contact">
          <p style={styles.bodyText}>
            If you have questions about this Privacy Policy or how your data is handled,
            please contact us:
          </p>
          <p style={styles.bodyText}>
            <strong>Lawrence Kirk</strong><br />
            Email: <a href="mailto:lk3maxxed@gmail.com" style={styles.link}>lk3maxxed@gmail.com</a>
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section style={styles.section}>
      <h2 style={styles.sectionTitle}>{title}</h2>
      {typeof children === "string" ? (
        <p style={styles.bodyText}>{children}</p>
      ) : (
        children
      )}
    </section>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f9f9f9",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: "#1a1a1a",
  },
  container: {
    maxWidth: 760,
    margin: "0 auto",
    padding: "48px 24px 80px",
  },
  header: {
    marginBottom: 48,
    borderBottom: "3px solid #000",
    paddingBottom: 32,
  },
  logo: {
    display: "inline-block",
    background: "#000",
    color: "#fff",
    fontWeight: 800,
    fontSize: 13,
    letterSpacing: "2px",
    padding: "4px 12px",
    marginBottom: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 800,
    margin: "0 0 8px",
    letterSpacing: "-0.5px",
  },
  date: {
    fontSize: 14,
    color: "#666",
    margin: 0,
  },
  section: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
    margin: "0 0 12px",
    letterSpacing: "-0.2px",
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 1.7,
    color: "#333",
    margin: "0 0 12px",
  },
  list: {
    paddingLeft: 20,
    margin: "0 0 12px",
  },
  listItem: {
    fontSize: 15,
    lineHeight: 1.7,
    color: "#333",
    marginBottom: 8,
  },
  link: {
    color: "#000",
    fontWeight: 600,
  },
};
