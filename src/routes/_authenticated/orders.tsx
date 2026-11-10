import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { PortalShell } from "@/components/PortalShell";
import { RefreshCw, ShoppingBag, ArrowRight } from "lucide-react";
import { getShopOrders } from "@/lib/shop/shop.functions";
import { kes } from "@/lib/shop/catalog";
import { deliveryLabel, paymentLabel } from "@/lib/shop/order-rules";

const ordersQuery = queryOptions({ queryKey: ["customer-orders"], queryFn: () => getShopOrders() });
export const Route = createFileRoute("/_authenticated/orders")({
  loader: ({ context }) => context.queryClient.ensureQueryData(ordersQuery),
  head: () => ({ meta: [{ title: "My harvest orders — CCAK" }, { name: "description", content: "Your private CCAK order history, payments, receipts and deliveries." }, { property: "og:title", content: "My harvest orders — CCAK" }, { property: "og:description", content: "Review your CCAK purchases and delivery progress." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: Orders,
});
function Orders() {
  const { data: orders, refetch, isFetching } = useSuspenseQuery(ordersQuery);
  return <PortalShell><div className="shop-orders-heading"><h1>My orders</h1><Button variant="outline" disabled={isFetching} onClick={() => void refetch()}><RefreshCw />Refresh</Button></div><Button asChild variant="outline"><Link to="/checkout"><ShoppingBag />Checkout</Link></Button>
    {orders.length === 0 && <p className="shop-empty">No orders yet. <Link to="/">Browse the harvest shop</Link></p>}
    {orders.map((order) => <article className="shop-order" key={order.id}><h2>Order {order.id.slice(0, 8).toUpperCase()}</h2><p>{new Date(order.created_at).toLocaleDateString("en-KE")} · {order.amount_kes === null ? "Total awaiting quote" : kes(order.amount_kes)}</p><p>{paymentLabel(order)}</p><p>{deliveryLabel(order)}</p><Button asChild className="btn btn-forest"><Link to="/orders/$orderId" params={{ orderId: order.id }}>Order details<ArrowRight /></Link></Button></article>)}
  </PortalShell>;
}