// packages/cli/src/index.ts
import { program } from "commander";
import chalk from "chalk";
import open from "open";
import * as fs from "node:fs";
import * as path from "node:path";
import { detect, healthCheck } from "./detect.js";
import { createProxyServer } from "./inject.js";
import { createSketchServer } from "./server.js";
import { getAvailablePort } from "./utils.js";
import { logger, setLogLevel } from "./logger.js";

program
  .name("glide")
  .description("Visual editor for web dev servers — React, Vue, Angular");

program
  .command("init")
  .description("Set up Glide in the current project")
  .action(async () => {
    logger.info(chalk.cyan("\n  Glide") + chalk.dim(" — init\n"));

    try {
      const detection = await detect();
      const pkgPath = path.join(detection.projectRoot, "package.json");

      let pkg: Record<string, any>;
      try {
        pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      } catch {
        logger.error(
          chalk.red("  Error: ") +
            chalk.white("No package.json found. Run this from your project root.\n")
        );
        process.exit(1);
        return;
      }

      pkg.scripts = pkg.scripts || {};

      if (pkg.scripts.glide) {
        logger.info(
          chalk.yellow("  ⚠ ") +
            chalk.white(`Script "glide" already exists: `) +
            chalk.dim(pkg.scripts.glide) +
            "\n"
        );
        logger.info(
          chalk.dim("  To reinitialize, remove the \"glide\" script from package.json and run init again.\n")
        );
        return;
      }

      const scriptCmd = `glide-editor start ${detection.port}`;
      pkg.scripts.glide = scriptCmd;

      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

      logger.info(
        chalk.green("  ✓ ") +
          chalk.white("Added to package.json scripts:\n")
      );
      logger.info(
        chalk.dim("    ") +
          chalk.white(`"glide": "${scriptCmd}"`) +
          "\n"
      );
      logger.info(
        chalk.dim("  Detected: ") +
          chalk.white(detection.appFramework) +
          chalk.dim(` (${detection.framework}) on port ${detection.port}\n`)
      );
      logger.info(
        chalk.dim("  Usage:\n")
      );
      logger.info(
        chalk.dim("    1. Start your dev server: ") +
          chalk.cyan("npm run dev") +
          "\n"
      );
      logger.info(
        chalk.dim("    2. In another terminal: ") +
          chalk.cyan("npm run glide") +
          "\n"
      );
    } catch (err) {
      logger.error(
        chalk.red("\n  Error: ") +
          (err instanceof Error ? err.message : String(err)) +
          "\n"
      );
      process.exit(1);
    }
  });

program
  .command("start", { isDefault: true })
  .description("Start the visual editor proxy")
  .argument("[port]", "Dev server port override")
  .option("--no-open", "Don't open browser automatically")
  .option("--host <host>", "Dev server host", "localhost")
  .option("--verbose", "Enable debug logging")
  .action(async (portArg?: string, cmdOpts?: Record<string, any>) => {
    try {
      const opts = cmdOpts || {};
      if (opts.verbose || process.env.LOG_LEVEL === "debug") {
        setLogLevel("debug");
      }
      const host = opts.host || "localhost";

      logger.info(chalk.cyan("\n  Glide") + chalk.dim(" — visual editor\n"));

      // Detect framework
      const detection = await detect();
      const targetPort = portArg ? parseInt(portArg, 10) : detection.port;

      logger.info(
        chalk.dim("  Framework: ") + chalk.white(detection.framework)
      );
      logger.info(
        chalk.dim("  Dev server: ") +
          chalk.white(`http://${host}:${targetPort}`)
      );

      // Health check
      logger.info(chalk.dim("  Checking dev server..."));
      await healthCheck(targetPort, host);

      // Start WebSocket server
      const wsPort = await getAvailablePort(3457);
      const sketchServer = createSketchServer({ port: wsPort });

      // Start proxy server
      const proxyPort = await getAvailablePort(3456);
      const proxyServer = createProxyServer({
        targetPort,
        targetHost: host,
        proxyPort,
        wsPort,
        appFramework: detection.appFramework,
        getActiveClient: sketchServer.getActiveClient,
      });

      proxyServer.listen(proxyPort, () => {
        logger.info(
          chalk.dim("  Proxy: ") +
            chalk.green(`http://localhost:${proxyPort}`)
        );
        logger.info(
          chalk.dim("  WebSocket: ") + chalk.green(`ws://localhost:${wsPort}`)
        );
        logger.info(
          chalk.dim("\n  Press ") +
            chalk.white("Ctrl+C") +
            chalk.dim(" to stop\n")
        );

        if (opts.open !== false) {
          open(`http://localhost:${proxyPort}`);
        }
      });

      // Graceful shutdown
      const shutdown = () => {
        logger.info(chalk.dim("\n  Shutting down...\n"));
        proxyServer.close();
        sketchServer.close();
        process.exit(0);
      };

      process.on("SIGINT", shutdown);
      process.on("SIGTERM", shutdown);
    } catch (err) {
      logger.error(
        chalk.red("\n  Error: ") +
          (err instanceof Error ? err.message : String(err)) +
          "\n"
      );
      process.exit(1);
    }
  });

program.parse();
