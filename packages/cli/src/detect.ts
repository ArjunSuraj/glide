// packages/cli/src/detect.ts
import * as fs from "node:fs";
import * as path from "node:path";
import type { DetectionResult, AppFramework } from "@glide-editor/shared";

export async function detect(cwd?: string): Promise<DetectionResult> {
  const projectRoot = cwd || process.cwd();

  const pkgJsonPath = path.join(projectRoot, "package.json");
  if (!fs.existsSync(pkgJsonPath)) {
    throw new Error(
      "No package.json found. Run from your project root."
    );
  }

  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
  const allDeps = {
    ...pkgJson.dependencies,
    ...pkgJson.devDependencies,
  };

  const appFramework = detectAppFramework(allDeps);

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Development mode required. Debug info is not available in production builds."
    );
  }

  // Angular CLI: angular.json
  const angularJsonPath = path.join(projectRoot, "angular.json");
  if (fs.existsSync(angularJsonPath)) {
    return { framework: "angular-cli", appFramework: "angular", port: 4200, projectRoot };
  }

  // Next.js
  const nextConfigs = ["next.config.js", "next.config.ts", "next.config.mjs"];
  for (const config of nextConfigs) {
    if (fs.existsSync(path.join(projectRoot, config))) {
      return { framework: "nextjs", appFramework: "react", port: 3000, projectRoot };
    }
  }

  // Nuxt (Vue meta-framework) — check before generic Vite since Nuxt uses Vite internally
  const nuxtConfigs = ["nuxt.config.js", "nuxt.config.ts"];
  for (const config of nuxtConfigs) {
    if (fs.existsSync(path.join(projectRoot, config))) {
      return { framework: "nuxt", appFramework: "vue", port: 3000, projectRoot };
    }
  }

  // Vite — determine app framework from dependencies
  const viteConfigs = ["vite.config.js", "vite.config.ts", "vite.config.mjs"];
  for (const config of viteConfigs) {
    if (fs.existsSync(path.join(projectRoot, config))) {
      return { framework: "vite", appFramework, port: 5173, projectRoot };
    }
  }

  // CRA (React only)
  if (allDeps["react-scripts"]) {
    return { framework: "cra", appFramework: "react", port: 3000, projectRoot };
  }

  throw new Error(
    "Could not detect framework. Supported: Next.js, Vite (React/Vue), Nuxt, Angular CLI, and Create React App."
  );
}

function detectAppFramework(deps: Record<string, string>): AppFramework {
  if (deps["@angular/core"]) return "angular";
  if (deps["vue"]) return "vue";
  if (deps["react"]) return "react";
  // Default to react for backward compat
  return "react";
}

export async function healthCheck(port: number, host: string = "localhost"): Promise<void> {
  const maxRetries = 3;
  const delay = 1000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`http://${host}:${port}`, {
        signal: AbortSignal.timeout(2000),
      });
      if (response.ok || response.status < 500) return;
    } catch {
      // Connection refused or timeout
    }

    if (attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw new Error(
    `No dev server found on ${host}:${port}. Start your dev server first.`
  );
}
