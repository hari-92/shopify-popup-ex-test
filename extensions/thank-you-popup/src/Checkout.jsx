import '@shopify/ui-extensions/preact';
import {render} from "preact";
import {signal} from "@preact/signals";
import {useEffect, useRef} from "preact/hooks";

const BUILD_MARKER = "thank-you-popup-v2";

/** @param {string | null | undefined} input */
function parseHexColor(input) {
  if (!input || typeof input !== "string") return null;
  const hex = input.trim().replace("#", "");
  if (![3, 6].includes(hex.length)) return null;
  const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  const num = Number.parseInt(full, 16);
  if (Number.isNaN(num)) return null;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/** @param {string | null | undefined} input */
function mapToneFromHex(input) {
  const rgb = parseHexColor(input);
  if (!rgb) return "neutral";
  const {r, g, b} = rgb;

  if (r > 185 && g < 120 && b < 120) return "critical";
  if (g > 150 && r < 140 && b < 150) return "success";
  if (b > 150 && r < 140 && g < 170) return "info";
  if (r > 170 && g > 130 && b < 120) return "warning";
  return "neutral";
}

/** @param {string | null | undefined} input */
function mapBackgroundFromHex(input) {
  const rgb = parseHexColor(input);
  if (!rgb) return "base";
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  // Background quá tối/sặc thì dùng subdued để tách khỏi nền mặc định.
  return brightness < 210 ? "subdued" : "base";
}

/**
 * @typedef {{label: string, url: string, openInNewTab: true}} PopupAction
 * @typedef {{title: string, titleColor: string, showClose: boolean}} PopupHeader
 * @typedef {{text: string, backgroundColor: string, textColor: string, action: PopupAction | null}} PopupBody
 * @typedef {{text: string, textColor: string}} PopupFooter
 * @typedef {{maxPerDayPerBrowser: number | null}} PopupFrequency
 * @typedef {{id: string, header: PopupHeader, body: PopupBody, footer: PopupFooter, frequency: PopupFrequency}} PopupConfig
 */

/** @type {import("@preact/signals").Signal<PopupConfig | null>} */
const popupSignal = signal(/** @type {PopupConfig | null} */ (null));
const dismissedSignal = signal(false);

function todayKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * @param {PopupConfig} popup
 * @param {string} shopDomain
 */
async function shouldShowPopup(popup, shopDomain) {
  const max = popup?.frequency?.maxPerDayPerBrowser;
  if (max === 0) return false;
  if (max == null) return true;

  const key = `popup_impressions:${shopDomain}:${popup.id}:${todayKey()}`;
  /** @type {{count?: number}} */
  const current = (await shopify.storage.read(key)) ?? {count: 0};
  const currentCount = current.count ?? 0;
  const allowed = currentCount < max;
  console.log("[thank-you-popup] frequency-check", {
    popupId: popup.id,
    key,
    currentCount,
    max,
    allowed,
  });
  return allowed;
}

/**
 * @param {PopupConfig} popup
 * @param {string} shopDomain
 */
async function markShown(popup, shopDomain) {
  const max = popup?.frequency?.maxPerDayPerBrowser;
  if (max === 0) return;

  const key = `popup_impressions:${shopDomain}:${popup.id}:${todayKey()}`;
  /** @type {{count?: number}} */
  const current = (await shopify.storage.read(key)) ?? {count: 0};
  const next = {count: (current.count ?? 0) + 1, lastShownAt: new Date().toISOString()};
  await shopify.storage.write(key, next);
  console.log("[thank-you-popup] frequency-mark-shown", {
    popupId: popup.id,
    key,
    nextCount: next.count,
  });
}

/** @param {{current: any}} modalRef */
async function openModalWithRetry(modalRef) {
  const open = async () => {
    const el = modalRef.current;
    if (!el) return false;
    if (typeof el.showOverlay === "function") {
      await el.showOverlay();
      return true;
    }
    if (typeof el.show === "function") {
      await el.show();
      return true;
    }
    el.open = true;
    return true;
  };

  try {
    return await open();
  } catch (error) {
    const message = String(
      /** @type {any} */ (error)?.message ?? error ?? "",
    );
    if (message.includes("Transition was skipped")) {
      // Checkout UI đôi khi đang transition nên open lần đầu bị skip.
      setTimeout(() => {
        open().catch(() => {});
      }, 180);
      return false;
    } else {
      console.log("[thank-you-popup] showOverlay error", error);
      return false;
    }
  }
}

async function fetchPopupConfig() {
  const baseUrl = shopify.settings.value?.backend_base_url;
  const capabilities = shopify.extension.capabilities.value ?? [];
  console.log("[thank-you-popup] runtime", {
    target: shopify.extension.target,
    shop: shopify.shop.myshopifyDomain,
    baseUrl,
    capabilities,
    hasNetworkAccess: capabilities.includes("network_access"),
  });

  if (!baseUrl) return null;

  const token = await shopify.sessionToken.get();
  const res = await fetch(
    `${String(baseUrl).replace(/\/$/, "")}/api/popup-config?hook=POST_PURCHASE_SUCCESS`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "ngrok-skip-browser-warning": "true",
      },
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.log("[thank-you-popup] popup-config non-OK", {
      status: res.status,
      statusText: res.statusText,
      body,
    });
    return null;
  }
  const json = await res.json();
  console.log("[thank-you-popup] popup-config response", json);
  /** @type {PopupConfig | null} */
  // eslint-disable-next-line no-unsafe-optional-chaining
  return json?.popup ?? null;
}

// 1. Export the extension
export default async () => {
  const capabilities = shopify.extension.capabilities.value ?? [];
  console.log(`[thank-you-popup] build-marker: ${BUILD_MARKER}`, {
    target: shopify.extension.target,
    shop: shopify.shop.myshopifyDomain,
    baseUrl: shopify.settings.value?.backend_base_url ?? null,
    capabilities,
    hasNetworkAccess: capabilities.includes("network_access"),
  });

  try {
    const popup = await fetchPopupConfig();
    const shopDomain = shopify.shop.myshopifyDomain;

    if (popup && (await shouldShowPopup(popup, shopDomain))) {
      popupSignal.value = popup;
      await markShown(popup, shopDomain);
    } else {
      popupSignal.value = null;
    }
  } catch (e) {
    popupSignal.value = null;
    console.log("[thank-you-popup] Failed to load popup config", e);
  }

  render(<Extension />, document.body);
};

function Extension() {
  const popup = popupSignal.value;
  const dismissed = dismissedSignal.value;
  const modalRef = useRef(/** @type {any} */ (null));
  const hasOpenedRef = useRef(false);
  const shouldRender = Boolean(popup) && !dismissed;

  useEffect(() => {
    hasOpenedRef.current = false;
    if (shouldRender) {
      openModalWithRetry(modalRef).then((opened) => {
        hasOpenedRef.current = Boolean(opened);
        console.log("[thank-you-popup] modal-open-attempt", {
          popupId: popup?.id ?? null,
          opened: Boolean(opened),
        });
      });
    }
  }, [popup?.id, shouldRender]);

  if (!popup || dismissed) return null;

  return (
    <s-modal
      ref={modalRef}
      id="post-purchase-popup"
      heading={popup.header?.title ?? "Cảm ơn bạn!"}
      onHide={() => {
        if (hasOpenedRef.current) {
          dismissedSignal.value = true;
        }
      }}
    >
      <s-stack gap="base">
        <s-box
          padding="base"
          border="base"
          borderRadius="base"
          background={mapBackgroundFromHex(popup.body?.backgroundColor)}
        >
          <s-text tone={mapToneFromHex(popup.body?.textColor)}>
            {popup.body?.text ?? ""}
          </s-text>
        </s-box>
        {popup.footer?.text ? (
          <s-text tone={mapToneFromHex(popup.footer?.textColor)}>
            {popup.footer.text}
          </s-text>
        ) : null}
      </s-stack>

      {popup.body?.action?.url ? (
        <s-button
          slot="primary-action"
          onClick={() => {
            window.open(
              popup.body.action?.url ?? "",
              "_blank",
              "noopener,noreferrer",
            );
          }}
        >
          {popup.body?.action?.label ?? "Xem thêm"}
        </s-button>
      ) : null}

      {popup.header?.showClose ? (
        <s-button
          slot="secondary-actions"
          variant="secondary"
          onClick={() => {
            modalRef.current?.hideOverlay?.();
            dismissedSignal.value = true;
          }}
        >
          Đóng
        </s-button>
      ) : null}
    </s-modal>
  );
}