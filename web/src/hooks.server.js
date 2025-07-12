import { dev } from '$app/environment';

export const handle = async ({ event, resolve }) => {
  const response = await resolve(event);

  if (!event.isSubRequest) {
    const csp = [
      "default-src 'self'",
      `script-src 'self' ${dev ? "'unsafe-inline'" : ''}`,
      `style-src 'self' https://fonts.googleapis.com ${dev ? "'unsafe-inline'" : ''}`,
      "font-src 'self' https://fonts.gstatic.com",
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
