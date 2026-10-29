/** Only a small, locally stored JPEG is accepted as a profile photo. */
export const MAX_PROFILE_PHOTO_LENGTH = 256 * 1024;

export function safeProfilePhoto(value: unknown): string | undefined {
  return typeof value === 'string' &&
    value.length <= MAX_PROFILE_PHOTO_LENGTH &&
    /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value)
    ? value
    : undefined;
}
