const getEnvar = () => ({
  SANITY_PROJECT_ID: Deno.env.get('SANITY_PROJECT'),
  SANITY_TOKEN: Deno.env.get('SANITY_TOKEN'),
  SANITY_DATASET: Deno.env.get('SANITY_DATASET') || 'production',
  SANITY_API_VERSION: Deno.env.get('SANITY_API_VERSION') || '2023-09-04',
});

export default getEnvar;
