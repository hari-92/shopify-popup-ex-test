import type { LoaderFunctionArgs } from "react-router";
import { Link, Outlet, useLoaderData, useLocation } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const popups = await db.popup.findMany({
    where: { shop: session.shop },
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      name: true,
      isActive: true,
      priority: true,
      headerTitle: true,
      frequencyMaxPerDayPerBrowser: true,
      updatedAt: true,
    },
  });

  return { popups };
};

export default function PopupsPage() {
  const { popups } = useLoaderData<typeof loader>();
  const location = useLocation();
  const withCurrentSearch = (path: string) => `${path}${location.search ?? ""}`;

  // Flat routes: app.popups.new.tsx và app.popups.$popupId.tsx là route con của app.popups.tsx.
  // Chỉ render bảng list ở đúng path /app/popups; các path con render bằng <Outlet />.
  if (location.pathname !== "/app/popups") {
    return <Outlet />;
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h1 style={{ margin: 0 }}>Popup quản lý</h1>
        <Link
          to={withCurrentSearch("/app/popups/new")}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            background: "#111827",
            color: "#fff",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          + Tạo popup mới
        </Link>
      </div>

      <table
        style={{
          width: "100%",
          borderCollapse: "separate",
          borderSpacing: 0,
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <thead>
          <tr style={{ background: "#f9fafb" }}>
            <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: 12 }}>
              Tên
            </th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: 12 }}>
              Active
            </th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: 12 }}>
              Priority
            </th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: 12 }}>
              Hook
            </th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: 12 }}>
              Tần suất (lần/ngày/browser)
            </th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: 12 }}>
              Hành động
            </th>
          </tr>
        </thead>
        <tbody>
          {popups.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ padding: 12 }}>
                Chưa có popup nào cho shop này.
              </td>
            </tr>
          ) : (
            popups.map((p) => (
              <tr key={p.id}>
                <td style={{ padding: 12 }}>{p.name}</td>
                <td style={{ padding: 12 }}>{p.isActive ? "✅" : "❌"}</td>
                <td style={{ padding: 12 }}>{p.priority}</td>
                <td style={{ padding: 12 }}>POST_PURCHASE_SUCCESS</td>
                <td style={{ padding: 12 }}>
                  {p.frequencyMaxPerDayPerBrowser == null
                    ? "Không giới hạn"
                    : String(p.frequencyMaxPerDayPerBrowser)}
                </td>
                <td style={{ padding: 12 }}>
                  <Link to={withCurrentSearch(`/app/popups/${p.id}`)}>Sửa</Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

