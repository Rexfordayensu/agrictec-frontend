// The farmer app never holds the admin console's address (ADMIN_PATH): it is in the JavaScript
// every visitor downloads. When "View as farmer" ends, the farmer tab goes to this neutral route
// instead, and proxy.ts sends a signed-in admin (checked with the API) on to the console page.
// Anyone else gets a 404, so the address is never shown to them.

export const CONSOLE_RETURN = '/console-return';

/** `page` is a console page without its prefix, e.g. "/farmers/123?impersonation=expired". */
export function consoleReturn(page: string): string {
  return `${CONSOLE_RETURN}?to=${encodeURIComponent(page)}`;
}

/** Only a console page path (and its query) is followed: never another site or a full URL. */
export function safeConsolePage(to: string | null): string {
  if (!to || !to.startsWith('/') || to.startsWith('//')) return '';
  return /^\/[A-Za-z0-9/_-]*(\?[A-Za-z0-9=&_%.-]*)?$/.test(to) ? to : '';
}
