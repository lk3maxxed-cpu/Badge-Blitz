// app/routes/api.product-image.jsx
// Authenticated route — fetches the featured image URL for a given product ID.
// Called by the CustomBadgeBuilder "Preview product" input.

import { data } from "react-router";
import { authenticate } from "../shopify.server";

const GET_PRODUCT_IMAGE = `#graphql
  query GetProductImage($id: ID!) {
    product(id: $id) {
      featuredImage { url }
    }
  }
`;

export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const rawId = url.searchParams.get("productId")?.trim();

  if (!rawId) {
    return data({ error: "Missing productId" }, { status: 400 });
  }

  const gid = rawId.startsWith("gid://")
    ? rawId
    : `gid://shopify/Product/${rawId}`;

  try {
    const res = await admin.graphql(GET_PRODUCT_IMAGE, { variables: { id: gid } });
    const json = await res.json();
    const imageUrl = json.data?.product?.featuredImage?.url ?? null;
    if (!imageUrl) return data({ error: "Product not found or has no image" }, { status: 404 });
    return data({ imageUrl });
  } catch (err) {
    console.error("[Badge Blitz] product-image fetch error:", err);
    return data({ error: "Failed to fetch product image" }, { status: 500 });
  }
}
