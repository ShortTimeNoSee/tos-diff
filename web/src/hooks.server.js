import { dev } from '$app/environment';

export const handle = async ({ event, resolve }) => {
  const response = await resolve(event);

  // Apply security headers only to top-level page responses,
  // not to sub-requests made by `load` functions.
  if (!event.isSubRequest) {
    const csp = [
      "default-src 'self'",
      // Vite's HMR client requires 'unsafe-inline' for scripts in dev
      `script-src 'self' ${dev ? "'unsafe-inline'" : ''}`,
      // Google Fonts requires fonts.googleapis.com for styles.
      // SvelteKit's dev server injects styles inline, so we need 'unsafe-inline' in dev.
      `style-src 'self' https://fonts.googleapis.com ${dev ? "'unsafe-inline'" : ''}`,
      // Allow font files from Google's static domain
      "font-src 'self' https://fonts.gstatic.com",
      // Allow websocket connection for Vite's HMR
      `connect-src 'self' ${dev ? 'ws:' : ''}`,
    ]
      .join('; ')
      .trim();

    response.headers.set('Content-Security-Policy', csp);
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
  }

  return response;
};
