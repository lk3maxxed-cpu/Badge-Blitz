import { redirect, Form, useLoaderData } from "react-router";
import { login } from "../../shopify.server";
import styles from "./styles.module.css";

export const loader = async ({ request }) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>Badge Blitz — Product Badge Overlays</h1>
        <p className={styles.text}>
          Add eye-catching badges to your product images — Sale, New, Low Stock,
          and fully custom labels — without touching a line of theme code.
        </p>
        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label}>
              <span>Shop domain</span>
              <input className={styles.input} type="text" name="shop" />
              <span>e.g: my-shop-domain.myshopify.com</span>
            </label>
            <button className={styles.button} type="submit">
              Log in
            </button>
          </Form>
        )}
        <ul className={styles.list}>
          <li>
            <strong>Drag-and-drop badge builder.</strong> Choose shape, color,
            gradient, position, and animation — preview updates live.
          </li>
          <li>
            <strong>Smart targeting.</strong> Show badges on all products or pin
            them to specific SKUs. Low-stock badges auto-update from inventory.
          </li>
          <li>
            <strong>Zero theme edits.</strong> Enable once in Shopify Customize
            and badges appear instantly across your storefront.
          </li>
        </ul>
      </div>
    </div>
  );
}
