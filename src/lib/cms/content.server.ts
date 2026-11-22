import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { modules, type CmsContent, type CmsRecord } from './schema';
import type { ShopProduct } from '../shop/products';
import { detailsSchemas } from './schema';

export function publicContentClient(url: string | undefined, key: string | undefined) {
  if (!url || !key) throw new Error('Website content is unavailable.');
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => {
    const headers = new Headers(init?.headers);
    if (key.startsWith('sb_') && headers.get('Authorization') === `Bearer ${key}`) headers.delete('Authorization');
    headers.set('apikey', key); return fetch(input, { ...init, headers });
  } } });
}
export function browserStorageUrl(url: string) {
  const browser = import.meta.env.VITE_SUPABASE_URL;
  if (!browser) return url;
  const parsed = new URL(url); return `${browser.replace(/\/$/, '')}${parsed.pathname}${parsed.search}`;
}
export async function resolveImages(client: SupabaseClient<Database>, rows: CmsRecord[]) {
  return Promise.all(rows.map(async (row) => {
    const path = row.details['image_path'];
    if (typeof path !== 'string' || !path) return row;
    const signed = await client.storage.from('website-media').createSignedUrl(path, 3600);
    return { ...row, details: { ...row.details, image_url: signed.data ? browserStorageUrl(signed.data.signedUrl) : '' } };
  }));
}
export async function readContent(client: SupabaseClient<Database>): Promise<CmsContent> {
  const entries = await Promise.all(modules.map(async (module) => {
    const { data, error } = await client.from(module).select('*').order('display_order').order('created_at');
    if (error) throw new Error('Website content could not be loaded. Please try again.');
    const rows = data as CmsRecord[];
    return [module, await resolveImages(client, rows)] as const;
  }));
  return Object.fromEntries(entries) as CmsContent;
}
export async function readShopCatalog(client: SupabaseClient<Database>): Promise<ShopProduct[]> {
  const result = await client.from('shop_products').select('*').eq('is_active', true).order('display_order');
  if (result.error) throw new Error('The shop is temporarily unavailable. Please try again.');
  const rows = await resolveImages(client, result.data as CmsRecord[]);
  return rows.map((row) => {
    const product = detailsSchemas.shop_products.parse(row.details);
    return { id: row.id, name: row.title, tag: product.tag, price: product.price_kes, physical: product.is_physical, quantity_description: product.quantity_description, unit_weight_grams: product.unit_weight_grams, image_url: product.image_url, stock_status: product.stock_status };
  });
}
