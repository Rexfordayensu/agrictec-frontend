// Test fixtures only. These invented amounts and sources are NEVER imported by application code.
let sequence = 0;
function publishedPrice(patch = {}) {
  return {
    id: `test-market-${++sequence}`,
    crop: 'Maize',
    price: 4,
    unit: 'kg',
    quantity: 1,
    change: 0,
    scope: 'market',
    region: 'Ashanti',
    market: 'Test market',
    country: 'GH',
    currency: 'GHS',
    status: 'published',
    observedAt: '2026-01-15',
    reviewedAt: '2026-01-16T12:00:00.000Z',
    reviewedBy: 'Test reviewer',
    source: {
      title: 'Test-only report',
      publisher: 'Fixture publisher',
      url: 'https://example.test/market-report',
      publishedAt: '2026-01-16',
      kind: 'official',
      excerpt: 'Test fixture; not real market evidence.',
    },
    ...patch,
  };
}
module.exports = { publishedPrice };
