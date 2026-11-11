// Settings, Sub Rosa: the switch. See docs/SUBROSA.md.

import { Switch } from "@nexis/design";
import { useSubRosa } from "@/app/subrosa";
import { Group, Row } from "./SettingsView";

export function SubRosaSettings() {
  const [on, setOn] = useSubRosa();
  return (
    <Group id="rose" title="Under the rose">
      <Row
        id="Sub Rosa"
        description={on ? "You are under the rose." : "A cabinet of curiosities: angels and demons, hell and its maps, the Goetia, the Masons, and a database of symbols."}
      >
        <Switch aria-label="Sub Rosa" checked={on} onCheckedChange={setOn} />
      </Row>
    </Group>
  );
}
