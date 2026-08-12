export type PageLoadEvent =
  | "page_load_start"
  | "page_load_success"
  | "page_load_error";

export type PageLoadPayload = {
  event: PageLoadEvent;
  route: string;
  webview?: boolean;
  ms?: number;
  message?: string;
};
