import { useSyncExternalStore } from "react";

import { getFatalStartupError, subscribeFatalStartup } from "../boot/early-boot";
import { StartupFatalErrorScreen } from "../features/startup/StartupFatalErrorScreen";

type Props = {
  children: React.ReactNode;
};

/** Renders Startup Fatal Error when ErrorUtils reports an uncaught fatal exception. */
export function StartupFatalGate({ children }: Props) {
  const fatal = useSyncExternalStore(subscribeFatalStartup, getFatalStartupError, getFatalStartupError);

  if (fatal) {
    return <StartupFatalErrorScreen error={fatal} />;
  }

  return children;
}
