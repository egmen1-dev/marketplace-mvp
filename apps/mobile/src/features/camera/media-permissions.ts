/**
 * Camera / gallery foundation for future DAOS Guided Capture.
 * Full capture flow is deferred to APP-SHELL-1.
 */
export type MediaPermissionStatus = "granted" | "denied" | "undetermined";

export type MediaPermissions = {
  camera: MediaPermissionStatus;
  gallery: MediaPermissionStatus;
};

export async function requestMediaPermissions(): Promise<MediaPermissions> {
  try {
    const ImagePicker = await import("expo-image-picker");
    const camera = await ImagePicker.requestCameraPermissionsAsync();
    const gallery = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return {
      camera: camera.granted ? "granted" : camera.canAskAgain ? "undetermined" : "denied",
      gallery: gallery.granted ? "granted" : gallery.canAskAgain ? "undetermined" : "denied",
    };
  } catch {
    return { camera: "undetermined", gallery: "undetermined" };
  }
}

export async function pickProductImage(): Promise<string | null> {
  const ImagePicker = await import("expo-image-picker");
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.85,
    allowsEditing: true,
  });
  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0].uri;
}
