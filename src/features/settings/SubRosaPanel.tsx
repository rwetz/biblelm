// Settings, Sub Rosa: the switch, and the one acknowledgement before going
// under (SubRosaAsk, mounted once in the shell so the palette can open it too).
// Coming back out is one click. See docs/SUBROSA.md.

import { Button, Dialog, DialogContent, DialogDescription, DialogTitle, Field, Panel, Switch } from "@nexis/design";
import { useSubRosa, useSubRosaAsk } from "@/app/subrosa";

export function SubRosaPanel() {
  const [on, setOn] = useSubRosa();
  const ask = useSubRosaAsk((s) => s.ask);
  return (
    <Panel title="Sub Rosa" meta="under the rose">
      <Field
        label="Sub Rosa"
        hint={
          on
            ? "You are under the rose."
            : "A cabinet of curiosities: angels as Scripture draws them, hell and those who mapped it, the Lesser Key of Solomon, the Temple and the Masons, and the symbols people argue about. For curiosity, not counsel."
        }
        inline
      >
        <Switch checked={on} onCheckedChange={(next) => (next ? ask(true) : setOn(false))} />
      </Field>
    </Panel>
  );
}

export function SubRosaAsk() {
  const [, setOn] = useSubRosa();
  const { asking, ask } = useSubRosaAsk();
  return (
    <Dialog open={asking} onOpenChange={ask}>
      <DialogContent className="max-w-md sm:max-w-md">
        <DialogTitle className="font-blackletter text-3xl font-normal">Sub Rosa</DialogTitle>
        <DialogDescription>
          What follows is history and curiosity: what people have believed, written and drawn. It is not taught here as true, and nothing in it is meant to
          stand against Scripture or the faith. Where a thing comes from Scripture, it says so.
        </DialogDescription>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => ask(false)}>Cancel</Button>
          <Button variant="brand" autoFocus onClick={() => { ask(false); setOn(true); }}>I understand</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
