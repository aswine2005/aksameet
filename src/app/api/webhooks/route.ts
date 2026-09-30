import { Webhook } from 'svix';
import { WebhookEvent } from '@clerk/nextjs/server';

import { errorResponse, getStreamClient } from '@/lib/stream-server';

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

// Optional: keeps Stream user profiles in sync with Clerk. Users are also
// created/updated automatically whenever they connect, so the app works
// without this webhook configured.
export async function POST(req: Request) {
  if (!WEBHOOK_SECRET) {
    console.error('WEBHOOK_SECRET is not set');
    return new Response('Webhook secret not configured', { status: 500 });
  }

  const svixId = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response('Missing svix headers', { status: 400 });
  }

  // Verify against the raw body; re-serialising parsed JSON can change it.
  const body = await req.text();

  let evt: WebhookEvent;
  try {
    evt = new Webhook(WEBHOOK_SECRET).verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Invalid signature', { status: 400 });
  }

  try {
    switch (evt.type) {
      case 'user.created':
      case 'user.updated': {
        const user = evt.data;
        const name =
          `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
          user.username ||
          'User';

        await getStreamClient().upsertUsers([
          {
            id: user.id,
            name,
            image: user.has_image ? user.image_url : undefined,
            custom: {
              username: user.username || '',
              email: user.email_addresses?.[0]?.email_address,
            },
          },
        ]);
        break;
      }
      default:
        break;
    }
  } catch (error) {
    return errorResponse(error, 'Failed to sync user to Stream');
  }

  return new Response('OK', { status: 200 });
}
