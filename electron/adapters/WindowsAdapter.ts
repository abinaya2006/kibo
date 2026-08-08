import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface InstalledApp {
  name: string;
  /** Executable or launch identifier, used by launchApp */
  path: string;
}

/**
 * Windows-specific app control. Uses execFile with argument arrays only —
 * never a raw shell string built from user/AI input (KIBO_ARCHITECTURE.md
 * §5, "Use spawn/execFile, never exec() with a shell string").
 */
export class WindowsAdapter {
  async listInstalledApps(): Promise<InstalledApp[]> {
    // Query Start Menu shortcuts rather than the registry — cheaper,
    // no elevation needed, and gives user-facing app names directly.
    const script = `
      Get-ChildItem -Path "$env:ProgramData\\Microsoft\\Windows\\Start Menu\\Programs","$env:AppData\\Microsoft\\Windows\\Start Menu\\Programs" -Recurse -Filter *.lnk -ErrorAction SilentlyContinue |
      Select-Object -Property @{Name='name';Expression={$_.BaseName}}, @{Name='path';Expression={$_.FullName}} |
      ConvertTo-Json -Compress
    `;
    const { stdout } = await execFileAsync(
      "powershell",
      ["-NonInteractive", "-NoProfile", "-Command", script],
      { timeout: 10000, maxBuffer: 5 * 1024 * 1024 },
    );
    const parsed = JSON.parse(stdout || "[]");
    const list = Array.isArray(parsed) ? parsed : [parsed];
    return list.filter((a) => a && a.name && a.path);
  }

  async launchApp(appPath: string): Promise<void> {
    // "start" via cmd handles .lnk shortcuts correctly; args passed as an
    // array, not interpolated into a string.
    await execFileAsync("cmd", ["/c", "start", "", appPath], {
      timeout: 5000,
    });
  }

  async closeApp(processName: string): Promise<void> {
    // processName must be a bare exe name (e.g. "notepad.exe"), validated
    // by the skill's schema before this is ever called.
    await execFileAsync("taskkill", ["/IM", processName, "/F"], {
      timeout: 5000,
    });
  }
}
