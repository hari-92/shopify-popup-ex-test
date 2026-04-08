import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

/** Payload REST của webhook orders/paid (rút gọn — bổ sung field khi cần). */
type OrderPaidPayload = {
  id?: number;
  admin_graphql_api_id?: string;
  name?: string;
  email?: string;
  financial_status?: string;
  total_price?: string;
  currency?: string;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload, session, admin } =
    await authenticate.webhook(request);

  const order = payload as OrderPaidPayload;
  console.log(
    `[webhooks/orders/paid] topic=${topic} shop=${shop} order=${order.name ?? order.id} session=${session ? "yes" : "no"}`,
  );

  // Webhook có thể gửi lặp; sau khi gỡ app có thể không còn session — kiểm tra trước khi gọi Admin API.
  if (session && admin) {
    // await admin.graphql(`#graphql ...`, { variables: { ... } });
  }

  return new Response();
};
