import { apiPost } from './client';
import { Endpoints } from './endpoints';

export type FeedbackType = 'suggestion' | 'complaint';

/**
 * POST /feedback — send a suggestion or complaint (+ optional image) to the admin
 * inbox. Public: works for guests; the Bearer token (added by the client interceptor)
 * links the user server-side. Multipart when an image is attached.
 */
export function submitFeedback(input: {
  type: FeedbackType;
  message: string;
  contact?: string;
  image?: { uri: string; name?: string; type?: string } | null;
}) {
  const form = new FormData();
  form.append('type', input.type);
  form.append('message', input.message);
  if (input.contact) form.append('contact', input.contact);
  if (input.image) {
    const name = input.image.name ?? input.image.uri.split('/').pop() ?? `photo_${Date.now()}.jpg`;
    const type = input.image.type ?? (name.endsWith('.png') ? 'image/png' : name.endsWith('.webp') ? 'image/webp' : 'image/jpeg');
    form.append('image', { uri: input.image.uri, name, type } as unknown as Blob);
  }
  return apiPost<{ id: number }>(Endpoints.feedback, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}
