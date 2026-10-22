// The first time BibleLM opens: a word of welcome and your name, which goes on
// the title page of a printed notebook. Both are optional and stay on this
// computer (study preferences); "Show the welcome again" is in the palette.

import { useState } from "react";
import { Button, Dialog, DialogContent, DialogDescription, DialogTitle, Input } from "@nexis/design";
import { TrinityMark } from "@/art/TrinityMark";
import { Fleuron } from "@/art/Art";
import { useStudy } from "@/store/study";

export function Welcome() {
  const welcomed = useStudy((s) => s.welcomed);
  const saved = useStudy((s) => s.name);
  const set = useStudy((s) => s.set);
  const [name, setName] = useState(saved);
  const done = (keep: boolean) => set({ welcomed: true, ...(keep ? { name: name.trim() } : {}) });
  return (
    <Dialog open={!welcomed} onOpenChange={(o) => !o && done(false)}>
      <DialogContent className="max-w-md text-center sm:max-w-md">
        <TrinityMark className="mx-auto size-16" />
        <DialogTitle className="mt-2 font-blackletter text-4xl font-normal">Welcome</DialogTitle>
        <DialogDescription className="font-garamond text-base leading-relaxed">
          An illustrated Bible to read slowly, with notebooks for your own study and a small machine that finds, never speaks for, the text.
        </DialogDescription>
        <Fleuron className="my-2" />
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            done(true);
          }}
        >
          <label className="block text-left text-sm">
            <span className="text-muted-foreground">What should your notebooks call you?</span>
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name (optional)" className="mt-1.5" />
          </label>
          <p className="text-left text-xs text-muted-foreground">It is printed on a notebook's title page and kept only on this computer. Change it any time in Settings.</p>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => done(false)}>Skip</Button>
            <Button type="submit" variant="brand">Begin</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
