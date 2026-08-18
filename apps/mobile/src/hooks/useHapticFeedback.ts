import { Vibration } from "react-native";

export function hapticLight() {
  try {
    Vibration.vibrate(10);
  } catch {
    /* optional on simulators */
  }
}

export function hapticSuccess() {
  try {
    Vibration.vibrate([0, 12, 40, 12]);
  } catch {
    /* optional */
  }
}

export function hapticError() {
  try {
    Vibration.vibrate([0, 20, 60, 20]);
  } catch {
    /* optional */
  }
}
