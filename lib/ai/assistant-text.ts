/** Keep previously saved assistant replies consistent with the icon-based UI. */
export function assistantText(text: string): string {
  return text.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]+\s*/gu, '').trim();
}
