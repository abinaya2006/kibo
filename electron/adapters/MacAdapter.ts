// MacAdapter.ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileAsync = promisify(execFile);

export interface InstalledApp {
  name: string;
  path: string;
}

export class MacAdapter {
  async listInstalledApps(): Promise<InstalledApp[]> {
    const { stdout } = await execFileAsync("ls", ["/Applications"], {
      timeout: 5000,
    });
    return stdout
      .split("\n")
      .filter((n) => n.endsWith(".app"))
      .map((n) => ({ name: n.replace(/\.app$/, ""), path: `/Applications/${n}` }));
  }

  async launchApp(appPath: string): Promise<void> {
    await execFileAsync("open", [appPath], { timeout: 5000 });
  }

  async closeApp(processName: string): Promise<void> {
    await execFileAsync("pkill", ["-f", processName], { timeout: 5000 });
  }
}
