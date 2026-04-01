// app/routes/app.picker.jsx
// Returns products + collections for the "Apply to" live picker in MyBadgeCard.
import { authenticate } from "../shopify.server";
import { data } from "react-router";

export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const q = url.searchParams.get("q") || "";

  const productQuery = q
    ? `title:*${q}*`
    : null;

  const [prodRes, collRes] = await Promise.all([
    admin.graphql(
      `#graphql
      query GetProducts($q: String) {
        products(first: 50, query: $q, sortKey: TITLE) {
          nodes {
            id
            title
            featuredImage { url }
          }
        }
      }`,
      { variables: { q: productQuery } }
    ),
    admin.graphql(
      `#graphql
      query GetCollections {
        collections(first: 50, sortKey: TITLE) {
          nodes {
            id
            title
            image { url }
          }
        }
      }`
    ),
  ]);

  const prodJson = await prodRes.json();
  const collJson = await collRes.json();

  return data({
    products: (prodJson.data?.products?.nodes ?? []).map((p) => ({
      id: p.id.replace("gid://shopify/Product/", ""),
      gid: p.id,
      title: p.title,
      image: p.featuredImage?.url ?? null,
    })),
    collections: (collJson.data?.collections?.nodes ?? []).map((c) => ({
      id: c.id.replace("gid://shopify/Collection/", ""),
      gid: c.id,
      title: c.title,
      image: c.image?.url ?? null,
    })),
  });
}
