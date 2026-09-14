---
name: app-reformat-files
description: >-
    Reformat every file you touch. Use after any write or edit; each touched
    project file gets the project's IntelliJ code style.
---

# Reformat touched files

Every file this task created or changed ends up reformatted.

1. **Track while editing.** Collect the project-relative path of every file you write or change (git diff over-includes files this task didn't touch).
2. **Reformat at the end of the task.** Pass all touched paths in one call to `reformat_file` (`Global-IntelliJ_reformat_file`) — the IntelliJ MCP tool. This applies the project's code style.
3. **Fallback — IDE closed.** The MCP tool needs a running IDE; when the IDE is closed run the command-line formatter instead: launchers per OS, style resolution and options in [`cli-fallback.md`](cli-fallback.md).
4. **Skip** a touched path only when the formatter rejects it (unsupported type, outside the project); report each skipped path and its reason. Done when every touched path is reformatted or skipped.
