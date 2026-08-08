// LinuxAdapter.ts — stub; flesh out (e.g. parse .desktop files in
// /usr/share/applications) when actually testing on Linux.
export interface InstalledApp {
  name: string;
  path: string;
}

export class LinuxAdapter {
  async listInstalledApps(): Promise<InstalledApp[]> {
    throw new Error("Linux app listing not yet implemented");
  }
  async launchApp(_appPath: string): Promise<void> {
    throw new Error("Linux app launching not yet implemented");
  }
  async closeApp(_processName: string): Promise<void> {
    throw new Error("Linux app closing not yet implemented");
  }
}
