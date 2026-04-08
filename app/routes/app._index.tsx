import { data, useLoaderData, type LoaderFunctionArgs } from "react-router";
import { Page, Layout, Card, ResourceList, Text, Badge } from "@shopify/polaris";
import { authenticate } from "../shopify.server";

type ProductNode = {
  id: string;
  title: string;
  status: string;
  totalInventory: number;
};

type ProductsQueryData = {
  data: {
    products: { nodes: ProductNode[] };
  };
};

// 1. BACKEND: Chạy trên Node.js server của bạn
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  // Query GraphQL lấy 5 sản phẩm đầu tiên
  const response = await admin.graphql(`
    query ProductsForApp {
      products(first: 10) {
        nodes {
          id
          title
          status
          totalInventory
        }
      }
    }
  `);

  const body = (await response.json()) as ProductsQueryData;
  return data({ products: body.data.products.nodes });
};

// 2. FRONTEND: Chạy trên trình duyệt (Iframe)
export default function Index() {
  const { products } = useLoaderData<typeof loader>();

  return (
    <Page title="Quản lý kho hàng">
      <Layout>
        <Layout.Section>
          <Card padding="0">
            <ResourceList
              resourceName={{ singular: 'sản phẩm', plural: 'sản phẩm' }}
              items={products}
              renderItem={(item: ProductNode) => {
                const { id, title, status, totalInventory } = item;
                return (
                  <ResourceList.Item
                    id={id}
                    accessibilityLabel={`View details for ${title}`}
                    onClick={() => {}}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 20px' }}>
                      <Text as="span" variant="bodyMd" fontWeight="bold">{title}</Text>
                      <Badge tone={status === 'ACTIVE' ? 'success' : 'attention'}>{status}</Badge>
                      <Text as="span" variant="bodyMd">Tồn kho: {totalInventory}</Text>
                    </div>
                  </ResourceList.Item>
                );
              }}
            />
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}