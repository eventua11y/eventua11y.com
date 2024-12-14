export default async (request, context) => {
  const userAgent = request.headers.get('user-agent');
  const acceptLanguage = request.headers.get('accept-language');
  const geo = context.geo || {};
  const timezone = geo.timezone;

  const userInfo = {
    userAgent,
    acceptLanguage,
    timezone,
    geo,
  };

  return new Response(JSON.stringify(userInfo), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const config = { path: '/api/get-user-info' };