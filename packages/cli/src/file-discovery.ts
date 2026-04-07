import * as fs from "node:fs";
import * as path from "node:path";

const SOURCE_EXTENSIONS = new Set([".tsx", ".ts", ".jsx", ".js", ".vue", ".html"]);
const EXCLUDED_DIRS = new Set(["node_modules", ".next", ".angular", "dist", ".git"]);

/**
 * Recursively walk a directory tree yielding file paths with source extensions.
 * Pure Node.js — works on all platforms without external `grep`.
 */
function walkSourceFiles(dir: string): string[] {
  const results: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (EXCLUDED_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkSourceFiles(fullPath));
    } else if (entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Discover which source file defines a React component by name.
 * Uses pure Node.js file system APIs instead of external `grep` for
 * cross-platform compatibility (Windows, macOS, Linux).
 * Ranks results by definition likelihood, follows re-exports in barrel files.
 */
export async function discoverFile(
  componentName: string,
  projectRoot: string,
): Promise<string | null> {
  try {
    const files = walkSourceFiles(projectRoot);
    const componentRe = new RegExp(componentName);

    interface Match {
      relPath: string;
      content: string;
    }

    const matches: Match[] = [];
    for (const filePath of files) {
      let content: string;
      try {
        content = fs.readFileSync(filePath, "utf-8");
      } catch {
        continue;
      }
      if (!componentRe.test(content)) continue;

      const relPath = path.relative(projectRoot, filePath).split(path.sep).join("/");
      matches.push({ relPath, content });
    }

    if (matches.length === 0) return null;

    const DEFINITION_PATTERNS = [
      new RegExp(`function\\s+${componentName}\\b`),
      new RegExp(`const\\s+${componentName}\\s*[=:]`),
      new RegExp(`let\\s+${componentName}\\s*=`),
      new RegExp(`class\\s+${componentName}\\s`),
      new RegExp(`export\\s+default\\s+function\\s+${componentName}\\b`),
      new RegExp(`name:\\s*['"]${componentName}['"]`),
      new RegExp(`class\\s+${componentName}Component\\b`),
      new RegExp(`selector:\\s*['"]app-${componentName.replace(/([A-Z])/g, (_, c) => "-" + c.toLowerCase()).replace(/^-/, "")}['"]`),
    ];
    const REEXPORT_PATTERN = new RegExp(
      `export\\s*\\{[^}]*${componentName}[^}]*\\}\\s*from`,
    );

    const definitions: string[] = [];
    const reexports: string[] = [];

    for (const { relPath, content } of matches) {
      if (DEFINITION_PATTERNS.some((p) => p.test(content))) {
        definitions.push(relPath);
      } else if (REEXPORT_PATTERN.test(content)) {
        reexports.push(relPath);
      }
    }

    const isBarrelFile = (f: string) =>
      /[/\\]index\.(ts|tsx|js|jsx)$/.test(f) || /^index\.(ts|tsx|js|jsx)$/.test(f);

    const realDefinitions = definitions.filter((f) => !isBarrelFile(f));
    if (realDefinitions.length > 0) {
      return (
        realDefinitions.find((f) => f.startsWith("src/") || f.startsWith("app/")) ||
        realDefinitions[0]
      );
    }

    const barrelSources = [
      ...reexports,
      ...definitions.filter(isBarrelFile),
    ];
    for (const barrel of barrelSources) {
      const resolved = followReexport(barrel, componentName, projectRoot);
      if (resolved) return resolved;
    }

    const allFiles = [
      ...new Set(
        matches
          .map((m) => m.relPath)
          .filter((f) => !isBarrelFile(f) && !f.includes("node_modules")),
      ),
    ];
    if (allFiles.length > 0) {
      return (
        allFiles.find((f) => f.startsWith("src/") || f.startsWith("app/")) ||
        allFiles[0]
      );
    }
  } catch {
    // search failed
  }

  return null;
}

function followReexport(
  barrelFilePath: string,
  componentName: string,
  projectRoot: string,
): string | null {
  try {
    const fullPath = path.resolve(projectRoot, barrelFilePath);
    const content = fs.readFileSync(fullPath, "utf-8");
    const match = content.match(
      new RegExp(
        `export\\s*\\{[^}]*${componentName}[^}]*\\}\\s*from\\s*["']([^"']+)["']`,
      ),
    );
    if (!match) return null;

    const importPath = match[1];
    const barrelDir = path.dirname(fullPath);
    for (const ext of [".tsx", ".ts", ".jsx", ".js", "/index.tsx", "/index.ts"]) {
      const candidate = path.resolve(barrelDir, importPath + ext);
      if (fs.existsSync(candidate)) {
        return path.relative(projectRoot, candidate).split(path.sep).join("/");
      }
    }
    const direct = path.resolve(barrelDir, importPath);
    if (fs.existsSync(direct)) {
      return path.relative(projectRoot, direct).split(path.sep).join("/");
    }
  } catch {
    // barrel read failed
  }
  return null;
}
