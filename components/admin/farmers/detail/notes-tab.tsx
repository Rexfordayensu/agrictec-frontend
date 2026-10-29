'use client';

import { useState } from 'react';
import { Lock, StickyNote } from 'lucide-react';
import { toast } from 'sonner';
import type { TabProps } from '@/components/admin/farmers/detail/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Textarea } from '@/components/ui/textarea';
import { useCan } from '@/hooks/admin/use-can';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { farmersService } from '@/services/admin/farmers.service';

/** Tags a note can add to the farmer ("appeal" feeds the overview's needs-attention list). */
const NOTE_TAGS = ['appeal', 'follow-up', 'vip'] as const;

/**
 * Internal admin notes, newest first. They live in the farmer's admin-only data and are never
 * read by the farmer app.
 */
export function NotesTab({ data, reload }: TabProps) {
  const canEdit = useCan('farmers.edit');
  const { account } = data.detail;
  const [text, setText] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function add() {
    setBusy(true);
    try {
      await farmersService.addNote(account.userId, text);
      const missing = tags.filter((t) => !account.tags.includes(t));
      if (missing.length)
        await farmersService.setTags(account.userId, [...account.tags, ...missing]);
      toast.success('Note added');
      setText('');
      setTags([]);
      await reload();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not add the note');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div>
        <p className="text-text-mute mb-3 flex items-center gap-1.5 text-xs">
          <Lock size={12} aria-hidden="true" /> Staff only. Notes are never shown to the farmer.
        </p>
        {account.adminNotes.length === 0 ? (
          <p className="text-text-mute text-sm">No notes yet.</p>
        ) : (
          <ol className="space-y-3">
            {account.adminNotes.map((note) => (
              <li key={note.id} className="border-border bg-glass rounded-2xl border p-4">
                <p className="text-text text-sm whitespace-pre-line">{note.text}</p>
                <p className="text-text-mute mt-2 text-xs">
                  {note.by} · {formatDate(new Date(note.at))}{' '}
                  {new Date(note.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>

      {canEdit && (
        <Card className="h-fit">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void add();
            }}
          >
            <FormField label="Add a note" htmlFor="note-text">
              <Textarea
                id="note-text"
                rows={4}
                maxLength={1000}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="What happened, and what's next?"
              />
            </FormField>
            <fieldset>
              <legend className="text-text-dim mb-2 text-xs font-semibold">
                Also tag the farmer (optional)
              </legend>
              <div className="flex flex-wrap gap-2">
                {NOTE_TAGS.map((tag) => {
                  const on = tags.includes(tag);
                  const already = account.tags.includes(tag);
                  return (
                    <label
                      key={tag}
                      className={cn(
                        'inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors',
                        on || already
                          ? 'border-purple/50 bg-purple/15 text-ink-purple'
                          : 'border-border text-text-dim hover:bg-glass-strong',
                      )}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={on || already}
                        disabled={already}
                        onChange={() =>
                          setTags((current) =>
                            current.includes(tag)
                              ? current.filter((t) => t !== tag)
                              : [...current, tag],
                          )
                        }
                      />
                      {tag}
                      {already && <span className="sr-only">(already tagged)</span>}
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <Button
              type="submit"
              icon={StickyNote}
              loading={busy}
              disabled={!text.trim()}
              className="w-full"
            >
              Add note
            </Button>
          </form>
          {account.tags.length > 0 && (
            <div className="border-border mt-4 border-t pt-3">
              <p className="text-text-mute mb-1.5 text-xs">Current tags</p>
              <div className="flex flex-wrap gap-1">
                {account.tags.map((t) => (
                  <Badge key={t} color="purple">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
