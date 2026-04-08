import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Link, useLoaderData, Form, useLocation } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { PopupHook } from "@prisma/client";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session, redirect } = await authenticate.admin(request);
  const popupId = params.popupId;
  if (!popupId) throw new Response("Missing popupId", { status: 400 });

  const popup = await db.popup.findFirst({
    where: { id: popupId, shop: session.shop },
  });

  if (!popup) throw redirect("/app/popups");
  return { popup };
};

function parseOptionalInt(value: FormDataEntryValue | null) {
  if (!value) return null;
  const s = String(value).trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session, redirect } = await authenticate.admin(request);
  const popupId = params.popupId;
  if (!popupId) throw new Response("Missing popupId", { status: 400 });

  const fd = await request.formData();

  const priority = parseOptionalInt(fd.get("priority")) ?? 0;
  const isActive = fd.get("isActive") === "on";

  const name = String(fd.get("name") ?? "").trim();
  if (!name) throw new Response("Missing name", { status: 400 });

  const headerTitle = String(fd.get("headerTitle") ?? "").trim() || "Cảm ơn bạn";
  const headerTitleColor = String(fd.get("headerTitleColor") ?? "").trim() || "#000000";
  const headerShowClose = fd.get("headerShowClose") === "on";

  const bodyText = String(fd.get("bodyText") ?? "").trim();
  const bodyBackgroundColor = String(fd.get("bodyBackgroundColor") ?? "").trim() || "#ffffff";
  const bodyTextColor = String(fd.get("bodyTextColor") ?? "").trim() || "#000000";

  const bodyActionLabelRaw = String(fd.get("bodyActionLabel") ?? "").trim();
  const bodyActionUrlRaw = String(fd.get("bodyActionUrl") ?? "").trim();
  const bodyActionLabel = bodyActionLabelRaw || null;
  const bodyActionUrl = bodyActionUrlRaw || null;

  const footerText = String(fd.get("footerText") ?? "").trim() || "—";
  const footerTextColor = String(fd.get("footerTextColor") ?? "").trim() || "#000000";

  const frequencyMaxPerDayPerBrowser = parseOptionalInt(
    fd.get("frequencyMaxPerDayPerBrowser"),
  );

  const popup = await db.popup.updateMany({
    where: { id: popupId, shop: session.shop, hook: PopupHook.POST_PURCHASE_SUCCESS },
    data: {
      name,
      isActive,
      priority,
      headerTitle,
      headerTitleColor,
      headerShowClose,
      bodyText,
      bodyBackgroundColor,
      bodyTextColor,
      bodyActionLabel,
      bodyActionUrl,
      footerText,
      footerTextColor,
      frequencyMaxPerDayPerBrowser,
    },
  });

  if (popup.count === 0) {
    throw new Response("Popup not found", { status: 404 });
  }

  return redirect(`/app/popups/${popupId}`);
};

export default function EditPopupPage() {
  const { popup } = useLoaderData<typeof loader>();
  const location = useLocation();
  const withCurrentSearch = (path: string) => `${path}${location.search ?? ""}`;
  const fieldWrap = {
    display: "grid",
    gap: 6,
  };
  const inputStyle = {
    width: "100%",
    maxWidth: 520,
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
  };

  return (
    <div style={{ padding: 24, maxWidth: 980 }}>
      <h1 style={{ marginTop: 0 }}>Sửa popup</h1>
      <div style={{ marginBottom: 12 }}>
        <Link to={withCurrentSearch("/app/popups")}>← Quay lại</Link>
      </div>

      <Form
        method="post"
        style={{
          display: "grid",
          gap: 16,
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 16,
        }}
      >
        <label style={fieldWrap}>
          Tên popup
          <input name="name" type="text" required defaultValue={popup.name} style={inputStyle} />
        </label>

        <label style={fieldWrap}>
          Priority
          <input name="priority" type="number" defaultValue={popup.priority} style={inputStyle} />
        </label>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            name="isActive"
            type="checkbox"
            defaultChecked={popup.isActive}
          />
          Kích hoạt
        </label>

        <fieldset style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
          <legend>Header</legend>
          <label style={fieldWrap}>
            Title
            <input
              name="headerTitle"
              type="text"
              defaultValue={popup.headerTitle}
              style={inputStyle}
            />
          </label>
          <label style={fieldWrap}>
            Title color (hex)
            <input
              name="headerTitleColor"
              type="text"
              defaultValue={popup.headerTitleColor}
              style={inputStyle}
            />
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              name="headerShowClose"
              type="checkbox"
              defaultChecked={popup.headerShowClose}
            />
            Hiện nút đóng
          </label>
        </fieldset>

        <fieldset style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
          <legend>Body</legend>
          <label style={fieldWrap}>
            Text body
            <textarea
              name="bodyText"
              rows={3}
              required
              defaultValue={popup.bodyText}
              style={inputStyle}
            />
          </label>
          <label style={fieldWrap}>
            Background color (hex)
            <input
              name="bodyBackgroundColor"
              type="text"
              defaultValue={popup.bodyBackgroundColor}
              style={inputStyle}
            />
          </label>
          <label style={fieldWrap}>
            Body text color (hex)
            <input
              name="bodyTextColor"
              type="text"
              defaultValue={popup.bodyTextColor}
              style={inputStyle}
            />
          </label>

          <label style={fieldWrap}>
            Action label (optional)
            <input
              name="bodyActionLabel"
              type="text"
              defaultValue={popup.bodyActionLabel ?? ""}
              style={inputStyle}
            />
          </label>
          <label style={fieldWrap}>
            Action URL (optional)
            <input
              name="bodyActionUrl"
              type="url"
              defaultValue={popup.bodyActionUrl ?? ""}
              style={inputStyle}
            />
          </label>
        </fieldset>

        <fieldset style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
          <legend>Footer</legend>
          <label style={fieldWrap}>
            Footer text
            <input name="footerText" type="text" defaultValue={popup.footerText} style={inputStyle} />
          </label>
          <label style={fieldWrap}>
            Footer text color (hex)
            <input
              name="footerTextColor"
              type="text"
              defaultValue={popup.footerTextColor}
              style={inputStyle}
            />
          </label>
        </fieldset>

        <label style={fieldWrap}>
          Frequency max / ngày / browser (để trống = không giới hạn, 0 = tắt hiển thị)
          <input
            name="frequencyMaxPerDayPerBrowser"
            type="number"
            placeholder="Ví dụ: 3"
            defaultValue={popup.frequencyMaxPerDayPerBrowser ?? ""}
            style={inputStyle}
          />
        </label>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="submit"
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #111827",
              background: "#111827",
              color: "#fff",
              fontWeight: 600,
            }}
          >
            Lưu
          </button>
          <Link to={withCurrentSearch(`/app/popups/${popup.id}`)}>Hủy</Link>
        </div>
      </Form>
    </div>
  );
}

