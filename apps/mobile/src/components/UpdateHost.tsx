import { UpdateGate } from "./UpdateGate";
import { useUpdateCheck } from "../update/use-update-check";

/** Runs once per cold start — optional/recommended on launch; required blocks interaction. */
export function UpdateHost() {
  const { info, visible, setVisible } = useUpdateCheck(true);

  if (!info || !visible) return null;

  return (
    <UpdateGate
      info={info}
      visible={visible}
      onDismiss={() => {
        if (info.updateState !== "REQUIRED_UPDATE") setVisible(false);
      }}
    />
  );
}
