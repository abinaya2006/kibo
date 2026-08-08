import { skillRegistry } from "./services/SkillRegistry.ts";
import { EchoSkill } from "./skills/test/EchoSkill.ts";

import { ReadFileSkill } from "./skills/filesystem/ReadFileSkill.ts";
import { CreateFileSkill } from "./skills/filesystem/CreateFileSkill.ts";
import { WriteFileSkill } from "./skills/filesystem/WriteFileSkill.ts";
import { RenameFileSkill } from "./skills/filesystem/RenameFileSkill.ts";
import { MoveFileSkill } from "./skills/filesystem/MoveFileSkill.ts";
import { DeleteFileSkill } from "./skills/filesystem/DeleteFileSkill.ts";
import { SearchFilesSkill } from "./skills/filesystem/SearchFilesSkill.ts";
import { OpenFolderSkill } from "./skills/filesystem/OpenFolderSkill.ts";
import { OpenFileSkill } from "./skills/filesystem/OpenFileSkill.ts";

import { ListInstalledAppsSkill } from "./skills/apps/ListInstalledAppsSkill.ts";
import { OpenAppSkill } from "./skills/apps/OpenAppSkill.ts";
import { CloseAppSkill } from "./skills/apps/CloseAppSkill.ts";

import { CopyTextSkill } from "./skills/clipboard/CopyTextSkill.ts";
import { ReadClipboardSkill } from "./skills/clipboard/ReadClipboardSkill.ts";

import { SystemInfoSkill } from "./skills/system/SystemInfoSkill.ts";

import { ScreenshotSkill } from "./skills/utilities/ScreenshotSkill.ts";
import { OpenUrlSkill } from "./skills/utilities/OpenUrlSkill.ts";
import { TimerSkill } from "./skills/utilities/TimerSkill.ts";
import { NotificationSkill } from "./skills/utilities/NotificationSkill.ts";

export function bootstrapSkills(): void {
  skillRegistry.register(new EchoSkill());

  // Step 3: filesystem skills
  skillRegistry.register(new ReadFileSkill());
  skillRegistry.register(new CreateFileSkill());
  skillRegistry.register(new WriteFileSkill());
  skillRegistry.register(new RenameFileSkill());
  skillRegistry.register(new MoveFileSkill());
  skillRegistry.register(new DeleteFileSkill());
  skillRegistry.register(new SearchFilesSkill());
  skillRegistry.register(new OpenFolderSkill());
  skillRegistry.register(new OpenFileSkill());

  // Step 4: apps / clipboard / system / utility skills
  skillRegistry.register(new ListInstalledAppsSkill());
  skillRegistry.register(new OpenAppSkill());
  skillRegistry.register(new CloseAppSkill());
  skillRegistry.register(new CopyTextSkill());
  skillRegistry.register(new ReadClipboardSkill());
  skillRegistry.register(new SystemInfoSkill());
  skillRegistry.register(new ScreenshotSkill());
  skillRegistry.register(new OpenUrlSkill());
  skillRegistry.register(new TimerSkill());
  skillRegistry.register(new NotificationSkill());
}
export { skillRegistry };
