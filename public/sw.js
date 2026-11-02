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

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/admin', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => w.url.startsWith(self.location.origin));
      return open ? open.navigate(url).then((w) => w?.focus()) : self.clients.openWindow(url);
    }),
  );
});
