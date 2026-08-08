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

  // Step 4: apps / clipboard / system / utility skills go here
}
export { skillRegistry };
