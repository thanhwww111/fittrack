/// <reference types="node" />
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { englishMessages } from "@/i18n";
const files = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
it("has English translations for every literal UI translation call", () => {
  const missing = new Set<string>();
  for (const file of files(path.join(__dirname, "../src")).filter(file => /\.tsx?$/.test(file))) {
    const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    function visit(node: ts.Node) {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && ["t", "translate"].includes(node.expression.text)
        && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
        const key = node.arguments[0].text;
        if (key && !englishMessages[key]) missing.add(key);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  expect([...missing]).toEqual([]);
});
it("preserves every interpolation variable in the English catalog", () => {
  const keys = (s: string) => [...new Set(s.match(/\{\w+\}/g) ?? [])].sort();
  const bad = Object.entries(englishMessages).filter(([vi, en]) => JSON.stringify(keys(vi)) !== JSON.stringify(keys(en)));
  expect(bad).toEqual([]);
});
