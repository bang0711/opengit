import type { Api, Updater } from "@shared/types";

declare global {
  interface Window {
    api: Api;
    updater: Updater;
  }
}
