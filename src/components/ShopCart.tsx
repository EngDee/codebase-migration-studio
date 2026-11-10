import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cartSchema, type CartItem } from "@/lib/shop/catalog";

const CartContext = createContext<{ items: CartItem[]; add: (id: CartItem["id"]) => void; quantity: (id: string, value: number) => void; clear: () => void } | null>(null);
export function ShopCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try { const saved = cartSchema.safeParse(JSON.parse(localStorage.getItem("ccak-shop-cart") ?? "[]")); if (saved.success) setItems(saved.data); } catch { /* Ignore invalid saved carts. */ }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem("ccak-shop-cart", JSON.stringify(items)); }, [items, ready]);
  const add = (id: CartItem["id"]) => setItems((current) => current.some((item) => item.id === id)
    ? current.map((item) => item.id === id ? { ...item, quantity: Math.min(20, item.quantity + 1) } : item)
    : [...current, { id, quantity: 1 }]);
  const quantity = (id: string, value: number) => setItems((current) => value < 1 ? current.filter((item) => item.id !== id) : current.map((item) => item.id === id ? { ...item, quantity: Math.min(20, value) } : item));
  return <CartContext.Provider value={{ items, add, quantity, clear: () => setItems([]) }}>{children}</CartContext.Provider>;
}
export function useShopCart() { const cart = useContext(CartContext); if (!cart) throw new Error("Cart unavailable."); return cart; }
export function CartLink() {
  const { items } = useShopCart();
  return <Button asChild variant="ghost" className="btn btn-forest"><Link to="/checkout"><ShoppingBag aria-hidden="true" />Cart ({items.reduce((sum, item) => sum + item.quantity, 0)})</Link></Button>;
}