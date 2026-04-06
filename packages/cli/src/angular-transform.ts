/**
 * Angular template transform engine.
 *
 * Angular components can have:
 * 1. External templates: templateUrl → separate .html file
 * 2. Inline templates: template → string in the @Component decorator
 *
 * This module handles both patterns, finding elements in Angular HTML
 * templates and mutating class attributes and text content.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { ClassNameUpdate } from "./transform.js";
import {
  extractTemplateSection,
  findTemplateElements,
  findVueElement,
  mutateVueClass,
  mutateVueText,
  type TemplateElement,
} from "./vue-transform.js";
import { logger } from "./logger.js";

// Reuse the Vue template element parsing since Angular HTML templates
// have the same structure as Vue <template> content.

export function isAngularComponent(filePath: string): boolean {
  return filePath.endsWith(".component.ts") || filePath.endsWith(".component.html");
}

interface AngularTemplateInfo {
  /** The source of the file containing the template */
  source: string;
  /** The template HTML content */
  templateContent: string;
  /** Offset of the template content within `source` */
  templateOffset: number;
  /** Whether this is an inline template (in .ts file) or external (.html file) */
  isInline: boolean;
  /** Path to the file containing the template */
  templateFilePath: string;
  /** Path to the component .ts file */
  componentFilePath: string;
}

/**
 * Extract template info from an in-memory source string.
 * Used when processing multiple operations in a batch to avoid re-reading from disk.
 */
export function getAngularTemplateFromSource(
  source: string,
  filePath: string,
): AngularTemplateInfo | null {
  if (filePath.endsWith(".html")) {
    const componentPath = filePath.replace(/\.html$/, ".ts");
    return {
      source,
      templateContent: source,
      templateOffset: 0,
      isInline: false,
      templateFilePath: filePath,
      componentFilePath: componentPath,
    };
  }

  const inlineMatch = source.match(/template\s*:\s*`([\s\S]*?)`/);
  if (inlineMatch && inlineMatch.index != null) {
    const contentStart = inlineMatch.index + inlineMatch[0].indexOf("`") + 1;
    return {
      source,
      templateContent: inlineMatch[1],
      templateOffset: contentStart,
      isInline: true,
      templateFilePath: filePath,
      componentFilePath: filePath,
    };
  }

  const inlineMatchQuoted = source.match(/template\s*:\s*(['"])([\s\S]*?)\1/);
  if (inlineMatchQuoted && inlineMatchQuoted.index != null) {
    const quote = inlineMatchQuoted[1];
    const contentStart = inlineMatchQuoted.index + inlineMatchQuoted[0].indexOf(quote) + 1;
    return {
      source,
      templateContent: inlineMatchQuoted[2],
      templateOffset: contentStart,
      isInline: true,
      templateFilePath: filePath,
      componentFilePath: filePath,
    };
  }

  // External templateUrl — must read from disk since the template is in a separate file
  const templateUrlMatch = source.match(/templateUrl\s*:\s*['"]([^'"]+)['"]/);
  if (templateUrlMatch) {
    const templateUrl = templateUrlMatch[1];
    const dir = path.dirname(filePath);
    const templatePath = path.resolve(dir, templateUrl);

    if (fs.existsSync(templatePath)) {
      const templateSource = fs.readFileSync(templatePath, "utf-8");
      return {
        source: templateSource,
        templateContent: templateSource,
        templateOffset: 0,
        isInline: false,
        templateFilePath: templatePath,
        componentFilePath: filePath,
      };
    }
  }

  return null;
}

/**
 * Extract template info from an Angular component.
 * Handles both inline and external templates.
 */
export function getAngularTemplate(filePath: string): AngularTemplateInfo | null {
  // If it's already an HTML file, the whole file is the template
  if (filePath.endsWith(".html")) {
    const source = fs.readFileSync(filePath, "utf-8");
    const componentPath = filePath.replace(/\.html$/, ".ts");
    return {
      source,
      templateContent: source,
      templateOffset: 0,
      isInline: false,
      templateFilePath: filePath,
      componentFilePath: componentPath,
    };
  }

  // It's a .ts file — look for inline template or templateUrl
  const source = fs.readFileSync(filePath, "utf-8");

  // Check for inline template (backtick string)
  const inlineMatch = source.match(/template\s*:\s*`([\s\S]*?)`/);
  if (inlineMatch && inlineMatch.index != null) {
    const contentStart = inlineMatch.index + inlineMatch[0].indexOf("`") + 1;
    return {
      source,
      templateContent: inlineMatch[1],
      templateOffset: contentStart,
      isInline: true,
      templateFilePath: filePath,
      componentFilePath: filePath,
    };
  }

  // Check for inline template (single-quoted or double-quoted — rare but possible for short templates)
  const inlineMatchQuoted = source.match(/template\s*:\s*(['"])([\s\S]*?)\1/);
  if (inlineMatchQuoted && inlineMatchQuoted.index != null) {
    const quote = inlineMatchQuoted[1];
    const contentStart = inlineMatchQuoted.index + inlineMatchQuoted[0].indexOf(quote) + 1;
    return {
      source,
      templateContent: inlineMatchQuoted[2],
      templateOffset: contentStart,
      isInline: true,
      templateFilePath: filePath,
      componentFilePath: filePath,
    };
  }

  // Check for external templateUrl
  const templateUrlMatch = source.match(/templateUrl\s*:\s*['"]([^'"]+)['"]/);
  if (templateUrlMatch) {
    const templateUrl = templateUrlMatch[1];
    const dir = path.dirname(filePath);
    const templatePath = path.resolve(dir, templateUrl);

    if (fs.existsSync(templatePath)) {
      const templateSource = fs.readFileSync(templatePath, "utf-8");
      return {
        source: templateSource,
        templateContent: templateSource,
        templateOffset: 0,
        isInline: false,
        templateFilePath: templatePath,
        componentFilePath: filePath,
      };
    }
  }

  return null;
}

/**
 * Update class on an Angular template element.
 * Returns the modified source and the path of the file that was modified.
 */
export function angularUpdateClass(
  filePath: string,
  tagName: string,
  updates: ClassNameUpdate[],
  hints: { className?: string; nthOfType?: number; id?: string },
): { source: string; modifiedFile: string } {
  const tmpl = getAngularTemplate(filePath);
  if (!tmpl) throw new Error("Could not find Angular template");

  const elements = findTemplateElements(
    tmpl.templateContent,
    tmpl.templateOffset,
    tmpl.source,
  );
  const target = findVueElement(elements, tagName, hints);
  if (!target)
    throw new Error(`No <${tagName}> element found in Angular template`);

  const newSource = mutateVueClass(tmpl.source, target, updates);
  return { source: newSource, modifiedFile: tmpl.templateFilePath };
}

/**
 * Update text content on an Angular template element.
 */
export function angularUpdateText(
  filePath: string,
  tagName: string,
  originalText: string,
  newText: string,
  hints: { className?: string; nthOfType?: number; id?: string },
): { source: string; modifiedFile: string } {
  const tmpl = getAngularTemplate(filePath);
  if (!tmpl) throw new Error("Could not find Angular template");

  const elements = findTemplateElements(
    tmpl.templateContent,
    tmpl.templateOffset,
    tmpl.source,
  );
  const target = findVueElement(elements, tagName, hints);
  if (!target) throw new Error(`No <${tagName}> element found in Angular template`);

  const newSource = mutateVueText(tmpl.source, target, originalText, newText);
  return { source: newSource, modifiedFile: tmpl.templateFilePath };
}
