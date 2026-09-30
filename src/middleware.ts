import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Open to everyone: the landing page, and the way in. Everything else -- a
// meeting link included -- needs a signed-in user, because attendance has to
// be able to say who was there. Clerk sends a signed-out visitor to sign in
// (Google included) and back to the page they asked for.
const isPublic = createRouteMatcher([
  '/',
  '/check',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
]);

// API routes answer 401 themselves, as JSON a fetch can read, rather than a
// redirect to an HTML sign-in page.
const isApi = createRouteMatcher(['/api(.*)', '/trpc(.*)']);

export default clerkMiddleware(async (auth, request) => {
  if (isPublic(request) || isApi(request)) return;
  await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|wasm|task|tflite)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
    '/__clerk/:path*',
  ],
};
