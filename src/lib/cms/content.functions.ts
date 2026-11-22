import { createServerFn } from '@tanstack/react-start';
import { setResponseHeader } from '@tanstack/react-start/server';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { publicContentClient, readContent, readShopCatalog, browserStorageUrl } from './content.server';
import { recordSchema, detailsSchemas, moduleSchema } from './schema';

export const getWebsiteContent = createServerFn({ method: 'GET' }).handler(async () => {
  setResponseHeader('Cache-Control', 'no-store');
  return readContent(publicContentClient(process.env['SUPABASE_URL'], process.env['SUPABASE_PUBLISHABLE_KEY']));
});
export const getWebsiteProducts = createServerFn({ method: 'GET' }).handler(async () => {
  return readShopCatalog(publicContentClient(process.env['SUPABASE_URL'], process.env['SUPABASE_PUBLISHABLE_KEY']));
});
export const getAdminContent = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  setResponseHeader('Cache-Control', 'no-store');
  const permitted = await context.supabase.rpc('is_national_admin');
  if (permitted.error || !permitted.data) throw new Error('National administrator access required.');
  return readContent(context.supabase);
});
export const saveWebsiteContent = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const record = recordSchema.parse(input);
    const details = detailsSchemas[record.module].parse(record.details);
    const imagePath = record.details['image_path'];
    if (imagePath !== undefined && (typeof imagePath !== 'string' || imagePath.length > 1000 || imagePath.includes('..'))) throw new Error('Invalid image.');
    return { ...record, details: { ...details, ...(typeof imagePath === 'string' ? { image_path: imagePath } : {}) } };
  }).handler(async ({ context, data }) => {
    const permitted = await context.supabase.rpc('is_national_admin');
    if (permitted.error || !permitted.data) throw new Error('National administrator access required.');
    const { module, updated_at, id, ...record } = data;
    // Signed display URLs expire: retain the storage path, never the viewing link.
    if ('image_path' in record.details && record.details.image_path && 'image_url' in record.details) record.details.image_url = '';
    const result = id
      ? await context.supabase.from(module).update(record).eq('id', id).eq('updated_at', updated_at ?? '').select('id').maybeSingle()
      : await context.supabase.from(module).insert(record).select('id').single();
    if (result.error || !result.data) throw new Error('Not saved. Another editor may have changed this item; refresh before trying again.');
    return result.data;
  });
export const deleteWebsiteContent = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ module: moduleSchema, id: z.string().min(1), updated_at: z.string() }).parse(input))
  .handler(async ({ context, data }) => {
    const permitted = await context.supabase.rpc('is_national_admin');
    if (permitted.error || !permitted.data) throw new Error('National administrator access required.');
    const result = await context.supabase.from(data.module).delete().eq('id', data.id).eq('updated_at', data.updated_at).select('id').maybeSingle();
    if (result.error || !result.data) throw new Error('Not deleted. Refresh this list before trying again.');
    return { deleted: true };
  });
export const getMemberDocuments = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const result = await context.supabase.from('site_documents').select('*').eq('is_active', true).order('display_order');
  if (result.error) throw new Error('Documents could not be loaded.');
  return result.data;
});
const documentInput = (input: unknown) => z.object({ id: z.string().min(1).max(100) }).parse(input);
export const getPublicDocument = createServerFn({ method: 'GET' }).inputValidator(documentInput).handler(async ({ data }) => {
  const client = publicContentClient(process.env['SUPABASE_URL'], process.env['SUPABASE_PUBLISHABLE_KEY']);
  const record = await client.from('site_documents').select('details').eq('id', data.id).single();
  if (record.error || !record.data) throw new Error('This document is unavailable.');
  const doc = detailsSchemas.site_documents.parse(record.data.details);
  const signed = await client.storage.from('website-documents').createSignedUrl(doc.file_path, 60, { download: doc.filename });
  if (signed.error || !signed.data) throw new Error('Download unavailable.');
  return { url: browserStorageUrl(signed.data.signedUrl) };
});
export const getMemberDocument = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator(documentInput).handler(async ({ context, data }) => {
  const record = await context.supabase.from('site_documents').select('details').eq('id', data.id).eq('is_active', true).single();
  if (record.error || !record.data) throw new Error('This document is unavailable.');
  const doc = detailsSchemas.site_documents.parse(record.data.details);
  const signed = await context.supabase.storage.from('website-documents').createSignedUrl(doc.file_path, 60, { download: doc.filename });
  if (signed.error || !signed.data) throw new Error('Download unavailable.');
  return { url: browserStorageUrl(signed.data.signedUrl) };
});
