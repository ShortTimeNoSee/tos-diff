const handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; style-src 'self';"
  );
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );
  return response;
};
export {
  handle
};
