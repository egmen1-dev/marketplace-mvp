/** Typed update error taxonomy — stage-accurate UI copy. */

export type UpdateErrorClass =
  | "UPDATE_CHECK_NETWORK"
  | "UPDATE_METADATA_INVALID"
  | "CACHE_IO"
  | "CACHE_CORRUPTED"
  | "DOWNLOAD_NETWORK"
  | "DOWNLOAD_HTTP"
  | "DOWNLOAD_TIMEOUT"
  | "DOWNLOAD_FILESYSTEM"
  | "DOWNLOAD_SIZE_MISMATCH"
  | "VERIFY_IO"
  | "SHA_API_UNAVAILABLE"
  | "VERIFY_SHA_MISMATCH"
  | "VERIFY_MEMORY"
  | "INSTALL_PERMISSION"
  | "INSTALL_CONTENT_URI"
  | "INSTALL_INTENT"
  | "UNKNOWN";

export type UpdateErrorStage = "check" | "download" | "verify" | "install" | "cache";

export type UpdateErrorDescriptor = {
  class: UpdateErrorClass;
  stage: UpdateErrorStage;
  message: string;
  retryAction: "check" | "download" | "verify_fresh_download" | "installer" | "permission" | "none";
};

export const UPDATE_ERROR_MESSAGES: Record<UpdateErrorClass, string> = {
  UPDATE_CHECK_NETWORK: "Не удалось проверить обновление. Проверьте интернет и попробуйте позже.",
  UPDATE_METADATA_INVALID: "Данные обновления некорректны. Попробуйте позже или обратитесь в поддержку.",
  CACHE_IO: "Не удалось прочитать кэш обновления. Будет выполнена повторная загрузка.",
  CACHE_CORRUPTED: "Кэшированное обновление повреждено. Будет выполнена повторная загрузка.",
  DOWNLOAD_NETWORK: "Не удалось скачать обновление. Проверьте интернет и попробуйте ещё раз.",
  DOWNLOAD_HTTP: "Сервер вернул ошибку при скачивании. Попробуйте ещё раз.",
  DOWNLOAD_TIMEOUT: "Превышено время ожидания загрузки. Попробуйте ещё раз.",
  DOWNLOAD_FILESYSTEM: "Не удалось сохранить обновление на устройстве. Освободите место и попробуйте снова.",
  DOWNLOAD_SIZE_MISMATCH: "Размер скачанного файла не совпадает с ожидаемым. Попробуйте ещё раз.",
  VERIFY_IO: "Не удалось прочитать скачанное обновление для проверки.",
  SHA_API_UNAVAILABLE: "Проверка обновления недоступна на этом устройстве. Попробуйте позже или обратитесь в поддержку.",
  VERIFY_SHA_MISMATCH: "Проверка целостности не пройдена. Файл будет удалён и загружен заново.",
  VERIFY_MEMORY: "Недостаточно памяти для проверки обновления. Закройте другие приложения и попробуйте снова.",
  INSTALL_PERMISSION: "Чтобы установить обновление, разрешите ЛОТ устанавливать приложения.",
  INSTALL_CONTENT_URI: "Не удалось подготовить файл для установки.",
  INSTALL_INTENT: "Не удалось открыть установщик Android. Попробуйте ещё раз.",
  UNKNOWN: "Не удалось выполнить обновление. Попробуйте ещё раз.",
};

export function describeUpdateError(errorClass: UpdateErrorClass): UpdateErrorDescriptor {
  const message = UPDATE_ERROR_MESSAGES[errorClass];
  switch (errorClass) {
    case "UPDATE_CHECK_NETWORK":
    case "UPDATE_METADATA_INVALID":
      return { class: errorClass, stage: "check", message, retryAction: "check" };
    case "CACHE_IO":
    case "CACHE_CORRUPTED":
      return { class: errorClass, stage: "cache", message, retryAction: "download" };
    case "DOWNLOAD_NETWORK":
    case "DOWNLOAD_HTTP":
    case "DOWNLOAD_TIMEOUT":
    case "DOWNLOAD_FILESYSTEM":
    case "DOWNLOAD_SIZE_MISMATCH":
      return { class: errorClass, stage: "download", message, retryAction: "download" };
    case "VERIFY_IO":
    case "SHA_API_UNAVAILABLE":
    case "VERIFY_SHA_MISMATCH":
    case "VERIFY_MEMORY":
      return { class: errorClass, stage: "verify", message, retryAction: "verify_fresh_download" };
    case "INSTALL_PERMISSION":
      return { class: errorClass, stage: "install", message, retryAction: "permission" };
    case "INSTALL_CONTENT_URI":
    case "INSTALL_INTENT":
      return { class: errorClass, stage: "install", message, retryAction: "installer" };
    default:
      return { class: "UNKNOWN", stage: "download", message: UPDATE_ERROR_MESSAGES.UNKNOWN, retryAction: "download" };
  }
}

export function mapLegacyFlowError(code: string): UpdateErrorClass {
  switch (code) {
    case "network_error":
      return "UPDATE_CHECK_NETWORK";
    case "download_url_unavailable":
      return "UPDATE_METADATA_INVALID";
    case "download_failed":
      return "DOWNLOAD_NETWORK";
    case "sha_verification_failed":
      return "VERIFY_SHA_MISMATCH";
    case "installer_permission_unavailable":
      return "INSTALL_PERMISSION";
    case "install_handoff_failed":
      return "INSTALL_INTENT";
    case "incompatible_apk":
      return "UPDATE_METADATA_INVALID";
    case "update_cancelled":
      return "DOWNLOAD_NETWORK";
    default:
      return "UNKNOWN";
  }
}

export function mapThrownError(err: unknown): UpdateErrorClass {
  const message = err instanceof Error ? err.message : String(err);
  if (/sha256_verify_failed|sha256_mismatch|VERIFY_SHA_MISMATCH/i.test(message)) return "VERIFY_SHA_MISMATCH";
  if (/size_mismatch|DOWNLOAD_SIZE_MISMATCH/i.test(message)) return "DOWNLOAD_SIZE_MISMATCH";
  if (/zero_byte|empty_file/i.test(message)) return "DOWNLOAD_SIZE_MISMATCH";
  if (/cache_io|CACHE_IO/i.test(message)) return "CACHE_IO";
  if (/cache_corrupt|CACHE_CORRUPTED/i.test(message)) return "CACHE_CORRUPTED";
  if (/timeout/i.test(message)) return "DOWNLOAD_TIMEOUT";
  if (/network|fetch|abort/i.test(message)) return "DOWNLOAD_NETWORK";
  if (/http|status|UnableToDownload/i.test(message)) return "DOWNLOAD_HTTP";
  if (/filesystem|enospc|storage/i.test(message)) return "DOWNLOAD_FILESYSTEM";
  if (/content_uri/i.test(message)) return "INSTALL_CONTENT_URI";
  if (/install|handoff|intent/i.test(message)) return "INSTALL_INTENT";
  if (/cancel/i.test(message)) return "DOWNLOAD_NETWORK";
  if (/sha_api_unavailable|readBytes|FileHandle/i.test(message)) return "SHA_API_UNAVAILABLE";
  if (/verify_io|verify_io_failed/i.test(message)) return "VERIFY_IO";
  if (/sha256|verify/i.test(message)) return "VERIFY_SHA_MISMATCH";
  return "UNKNOWN";
}
