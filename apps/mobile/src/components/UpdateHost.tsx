import { UpdateGate } from "./UpdateGate";
import { useAppStore } from "../store/app-store";
import { useUpdateCheck } from "../update/use-update-check";

/** Shows optional/recommended update after bootstrap; required/unsupported handled on boot screen. */
export function UpdateHost() {
  const bootstrapped = useAppStore((s) => s.bootstrapped);
  const pendingUpdate = useAppStore((s) => s.pendingUpdate);
  const { info, visible, setVisible } = useUpdateCheck(bootstrapped, pendingUpdate);

  if (!bootstrapped || !info || !visible) return null;
  if (info.updateState === "UNSUPPORTED_CLIENT") return null;

  return (
    <UpdateGate
      info={info}
      visible={visible}
      onDismiss={() => {
        if (info.updateState !== "REQUIRED_UPDATE" && info.updateState !== "UNSUPPORTED_CLIENT") {
          setVisible(false);
        }
      }}
    />
  );
}
