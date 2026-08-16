import { UpdateGate } from "./UpdateGate";
import { useUpdateCheck } from "../update/use-update-check";
import { useAppStore } from "../store/app-store";

/** Runs after bootstrap — optional/recommended never blocks cold start navigation. */
export function UpdateHost() {
  const bootstrapped = useAppStore((s) => s.bootstrapped);
  const { info, visible, setVisible } = useUpdateCheck(bootstrapped);

  if (!bootstrapped || !info || !visible) return null;

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
