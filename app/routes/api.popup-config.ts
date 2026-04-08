import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { PopupHook } from "@prisma/client";

function buildCorsHeaders(request: Request) {
  const origin = request.headers.get("origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS, POST, PUT, DELETE",
    "Access-Control-Allow-Headers":
      "Authorization, Content-Type, ngrok-skip-browser-warning",
    Vary: "Origin",
  };
}

function withCors(request: Request, response: Response) {
  const headers = new Headers(response.headers);
  const cors = buildCorsHeaders(request);
  Object.entries(cors).forEach(([k, v]) => headers.set(k, v));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function normalizeShop(dest: string | undefined) {
  if (!dest) return null;
  try {
    return new URL(dest).host;
  } catch {
    // dest đôi khi có thể là shop domain không kèm protocol
    return dest.replace(/^https?:\/\//, "").split("/")[0] || null;
  }
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { sessionToken } = await authenticate.public.checkout(request);

    const shop = normalizeShop(sessionToken.dest as unknown as string);
    if (!shop) {
      return withCors(
        request,
        Response.json(
          { popup: null, error: "Missing shop" },
          { status: 400 },
        ),
      );
    }

    const url = new URL(request.url);
    const hookParam = url.searchParams.get("hook") ?? "POST_PURCHASE_SUCCESS";
    const hook =
      hookParam === "POST_PURCHASE_SUCCESS" ? PopupHook.POST_PURCHASE_SUCCESS : null;

    if (!hook) {
      return withCors(
        request,
        Response.json(
          { popup: null, error: "Unsupported hook" },
          { status: 400 },
        ),
      );
    }

    const popup = await db.popup.findFirst({
      where: { shop, hook, isActive: true },
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        headerTitle: true,
        headerTitleColor: true,
        headerShowClose: true,
        bodyText: true,
        bodyBackgroundColor: true,
        bodyTextColor: true,
        bodyActionLabel: true,
        bodyActionUrl: true,
        footerText: true,
        footerTextColor: true,
        frequencyMaxPerDayPerBrowser: true,
        updatedAt: true,
      },
    });

    console.log("[api/popup-config]", {
      shop,
      hook: hookParam,
      foundPopup: Boolean(popup),
      popupId: popup?.id ?? null,
    });

    return withCors(
      request,
      Response.json({
        popup: popup
          ? {
              id: popup.id,
              updatedAt: popup.updatedAt,
              header: {
                title: popup.headerTitle,
                titleColor: popup.headerTitleColor,
                showClose: popup.headerShowClose,
              },
              body: {
                text: popup.bodyText,
                backgroundColor: popup.bodyBackgroundColor,
                textColor: popup.bodyTextColor,
                action:
                  popup.bodyActionLabel && popup.bodyActionUrl
                    ? {
                        label: popup.bodyActionLabel,
                        url: popup.bodyActionUrl,
                        openInNewTab: true,
                      }
                    : null,
              },
              footer: {
                text: popup.footerText,
                textColor: popup.footerTextColor,
              },
              frequency: {
                maxPerDayPerBrowser: popup.frequencyMaxPerDayPerBrowser,
              },
            }
          : null,
      }),
    );
  } catch (error) {
    if (error instanceof Response) {
      return withCors(request, error);
    }
    throw error;
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return withCors(request, new Response(null, { status: 204 }));
  }
  return withCors(
    request,
    Response.json({ error: "Method not allowed" }, { status: 405 }),
  );
};

