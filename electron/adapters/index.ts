import { WindowsAdapter } from "./WindowsAdapter.ts";
import { MacAdapter } from "./MacAdapter.ts";
import { LinuxAdapter } from "./LinuxAdapter.ts";

export type AppAdapter = WindowsAdapter | MacAdapter | LinuxAdapter;

export function getAppAdapter(): AppAdapter {
  switch (process.platform) {
    case "win32":
      return new WindowsAdapter();
    case "darwin":
      return new MacAdapter();
    default:
      return new LinuxAdapter();
  }
}
