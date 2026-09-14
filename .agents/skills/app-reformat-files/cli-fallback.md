# CLI formatter fallback

`<launcher> format [<options>] <path ...>` applies the code style from a shell. Source: [Format files from the command line](https://www.jetbrains.com/help/idea/command-line-formatter.html).

## Only one IDE instance

The CLI formatter starts its own background IDE instance, so it exits with `Only one instance of IDEA can be run at a time` whenever the IDE is already open — the same condition that makes the MCP `reformat_file` reachable. The two paths are mutually exclusive: IDE open → MCP tool, IDE closed → CLI.

Formatting a file type also needs that type's plugin installed and enabled (e.g. the Shell Script plugin for `.sh`).

## Launcher per OS

| OS      | Command                                                                                     |
|---------|---------------------------------------------------------------------------------------------|
| Windows | `idea64.exe format <paths>` (or the `idea.bat` script)                                      |
| macOS   | `idea.sh format <paths>`, or the bundled `IntelliJ IDEA.app/Contents/bin/format.sh <paths>` |
| Linux   | `<install>/bin/idea.sh format <paths>`; snap install: `intellij-idea format <paths>`        |

Toolbox-installed IDEs generate an `idea` script that forwards to the real launcher and takes the same `format` command. Toolbox puts it on `PATH`:

| OS      | Toolbox script dir                                        |
|---------|-----------------------------------------------------------|
| Windows | `%LOCALAPPDATA%\JetBrains\Toolbox\scripts`                |
| macOS   | `~/Library/Application Support/JetBrains/Toolbox/scripts` |
| Linux   | `~/.local/share/JetBrains/Toolbox/scripts`                |

Standalone installs keep the launcher in `<install dir>/bin`: add that dir to `PATH`, or symlink it (`ln -s /opt/idea/bin/idea.sh /usr/local/bin/idea`). On macOS the documented `/usr/local/bin/idea` wrapper (`open -na "IntelliJ IDEA.app" --args "$@"`) detaches, so call `idea.sh` / `format.sh` directly for `format` and you get the exit code.

## Style resolution

Run from the project root. Settings come from a project found in a parent folder, with `.editorconfig` applied on top (EditorConfig wins where they overlap).

Files with no resolvable style are skipped rather than formatted. Two escapes: `-s <style.xml>` pins a scheme, `-allowDefaults` falls back to the IDE default style.

This repo's style is an IDE-global named scheme (`.idea/codeStyles/codeStyleConfig.xml` → `PREFERRED_PROJECT_CODE_STYLE`), not a per-project `Project.xml`. A CLI instance sharing that IDE config dir resolves it; one under a different config dir or user does not — export the scheme (Editor | Code Style → Export) and pass `-s`.

## Options

| Option            | Effect                                                                          |
|-------------------|---------------------------------------------------------------------------------|
| `-s`, `-settings` | code style XML: an exported scheme, or `.idea/codeStyles/Project.xml`           |
| `-allowDefaults`  | use the default style when none applies; without it such files are ignored      |
| `-d`, `-dryRun`   | validate in memory and exit non-zero if any file differs; writes nothing        |
| `-r`, `-R`        | process directories recursively                                                 |
| `-m`, `-mask`     | comma-separated file masks with `*`/`?` wildcards — quote them, the shell globs |
| `-charset`        | force read/write encoding, e.g. `-charset ISO-8859-15` for special letters      |
| `-h`              | help                                                                            |

## Examples

Format the files this task touched, from the repo root:

```bash
idea format src/lib/postponement.ts src/routes/create/create-post.ts
```

Pin an exported scheme, restricted to `.ts`/`.tsx` under a directory:

```bash
idea format -s ~/exported-style.xml -m '*.ts,*.tsx' src/lib
```

Gate on formatting without writing anything:

```bash
idea format -d src/ && echo "formatting clean"
```
