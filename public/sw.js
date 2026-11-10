// AgriCtec's service worker: it only shows error alerts pushed by the API to admins who turned
// them on (System settings > Error alerts). It doesn't cache anything or touch page requests.

self.addEventListener('push', (event) => {
  let alert = {};
  try {
    alert = event.data ? event.data.json() : {};
  } catch {
    alert = { body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(alert.title || 'AgriCtec', {
      body: alert.body || '',
      // The same kind of error replaces its earlier alert instead of piling up.
      tag: alert.tag,
      renotify: Boolean(alert.tag),
      data: { url: alert.url || '/admin' },
    }),
  );
});

/** A page of this site only: an alert can never send the admin to another site. */
function sameSiteUrl(value) {
  try {
    const url = new URL(value || '/admin', self.location.origin);
    return url.origin === self.location.origin ? url.href : new URL('/admin', self.location.origin).href;
  } catch {
    return new URL('/admin', self.location.origin).href;
  }
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = sameSiteUrl(event.notification.data?.url);
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => w.url.startsWith(self.location.origin));
      return open ? open.navigate(url).then((w) => w?.focus()) : self.clients.openWindow(url);
    }),
  );
});
