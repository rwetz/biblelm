// Settings, Sub Rosa: the switch. See docs/SUBROSA.md.

import { Field, Panel, Switch } from "@nexis/design";
import { useSubRosa } from "@/app/subrosa";

export function SubRosaPanel() {
  const [on, setOn] = useSubRosa();
  return (
    <Panel title="Sub Rosa" meta="under the rose">
      <Field
        label="Sub Rosa"
        hint={on ? "You are under the rose." : "A cabinet of curiosities: angels and demons, hell and its maps, the Goetia, the Masons, and a database of symbols."}
        inline
      >
        <Switch checked={on} onCheckedChange={setOn} />
      </Field>
    </Panel>
  );
}
