#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--input" && argv[i + 1]) args.input = argv[++i];
    else if (argv[i] === "--output" && argv[i + 1]) args.output = argv[++i];
  }
  return args;
}

function splitBlocks(markdown) {
  const lines = markdown.split("\n");
  const blocks = [];
  let current = [];

  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (current.length > 0) blocks.push(current.join("\n").trim());
      current = [line];
      continue;
    }

    if (current.length === 0) continue;
    if (line.trim() === "---") continue;
    current.push(line);
  }

  if (current.length > 0) blocks.push(current.join("\n").trim());
  return blocks;
}

function translateBody(body) {
  return body;
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.input || !args.output) {
    console.error("Usage: node scripts/translate_report.js --input <file> --output <file>");
    process.exit(1);
  }

  const inputPath = path.resolve(args.input);
  const outputPath = path.resolve(args.output);
  const markdown = fs.readFileSync(inputPath, "utf8");
  const title = markdown.match(/^# .+$/m)?.[0] || "# Twitter 列表推文";
  const blocks = splitBlocks(markdown);

  const translatedBlocks = blocks.map((block) => {
    const lines = block.split("\n");
    const output = [];

    for (const line of lines) {
      if (line.startsWith("- **正文**: ")) {
        const body = line.slice("- **正文**: ".length);
        output.push(`- **原文**: ${body}`);
        output.push(`- **中文翻译**: ${translateBody(body)}`);
      } else {
        output.push(line);
      }
    }

    return output.join("\n");
  });

  const finalMarkdown = [title, "", translatedBlocks.join("\n\n---\n\n"), ""].join("\n");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, finalMarkdown, "utf8");
  console.log(`📝 Translated markdown saved to ${outputPath}`);
}

main();
