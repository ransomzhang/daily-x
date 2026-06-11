#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--input" && argv[i + 1]) args.input = argv[++i];
    else if (argv[i] === "--output" && argv[i + 1]) args.output = argv[++i];
    else if (argv[i] === "--template" && argv[i + 1]) args.template = argv[++i];
    else if (argv[i] === "--reports-dir" && argv[i + 1]) args.reportsDir = argv[++i];
    else if (argv[i] === "--summary" && argv[i + 1]) args.summary = argv[++i];
  }
  return args;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function linkify(text) {
  return escapeHtml(text).replace(/https?:\/\/[^\s]+/g, (url) => `<a href="${url}" target="_blank" rel="noreferrer">${url}</a>`);
}

function formatMultiline(text) {
  return linkify(text).replace(/\n/g, "<br>");
}

function formatDateCN(dateStr) {
  const date = new Date(`${dateStr}T00:00:00+08:00`);
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日 ${weekdays[date.getDay()]}`;
}

function getNowUTC8() {
  const now = new Date();
  const utc8Offset = 8 * 60;
  const localOffset = now.getTimezoneOffset();
  return new Date(now.getTime() + (utc8Offset + localOffset) * 60 * 1000);
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

function parseBlocks(markdown) {
  return splitBlocks(markdown).map((block) => {
    const title = block.match(/^## @([^\s]+) \((.+)\)$/m);
    const time = block.match(/- \*\*时间\*\*: (.+)$/m)?.[1] || "";
    const url = block.match(/- \*\*链接\*\*: (.+)$/m)?.[1] || "";
    const original = block.match(/- \*\*原文\*\*: ([\s\S]*?)\n- \*\*中文翻译\*\*:/)?.[1] || "";
    const translated = block.match(/- \*\*中文翻译\*\*: ([\s\S]*?)\n- \*\*点赞\*\*:/)?.[1] || "";
    const stats = block.match(/- \*\*点赞\*\*: (\d+) \| \*\*转发\*\*: (\d+) \| \*\*评论\*\*: (\d+)/);
    const keywordsLine = block.match(/- \*\*匹配关键词\*\*: (.+)$/m)?.[1] || "";

    return {
      username: title ? `@${title[1]}` : "",
      displayName: title?.[2] || "",
      time,
      url,
      original: original.trim(),
      translated: translated.trim(),
      likes: stats?.[1] || "0",
      retweets: stats?.[2] || "0",
      comments: stats?.[3] || "0",
      keywords: keywordsLine.split(",").map((item) => item.trim()).filter(Boolean),
    };
  });
}

function parseSummary(markdown) {
  const sections = {};
  const matches = [...markdown.matchAll(/^## (.+)\n([\s\S]*?)(?=^## |\s*$)/gm)];
  for (const [, heading, content] of matches) {
    sections[heading.trim()] = content.trim();
  }
  return {
    overview: sections["今日概览"] || "",
    focus: (sections["重点关注"] || "")
      .split("\n")
      .map((line) => line.replace(/^- /, "").trim())
      .filter(Boolean),
    topics: (sections["涉及主题"] || "")
      .split("\n")
      .map((line) => line.replace(/^- /, "").trim())
      .filter(Boolean),
    risks: (sections["风险与机会"] || "")
      .split("\n")
      .map((line) => line.replace(/^- /, "").trim())
      .filter(Boolean),
  };
}

function buildSummary(summaryPath) {
  if (!summaryPath || !fs.existsSync(summaryPath)) {
    return `    <section class="summary-card">
      <div class="summary-header">
        <span class="summary-kicker">今日摘要</span>
        <h2>重点信息概览</h2>
      </div>
      <div class="summary-section">
        <p>今日暂无总结，请查看下方筛选推文。</p>
      </div>
    </section>`;
  }

  const summary = parseSummary(fs.readFileSync(summaryPath, "utf8"));
  const focusHtml = summary.focus.length
    ? `<div class="summary-section">
        <h3>重点关注</h3>
        <ul>
          ${summary.focus.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n          ")}
        </ul>
      </div>`
    : "";
  const risksHtml = summary.risks.length
    ? `<div class="summary-section">
        <h3>风险与机会</h3>
        <ul>
          ${summary.risks.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n          ")}
        </ul>
      </div>`
    : "";
  const tagsHtml = summary.topics.length
    ? `<div class="summary-tags">
        ${summary.topics.map((item) => `<span>${escapeHtml(item)}</span>`).join("\n        ")}
      </div>`
    : "";

  return `    <section class="summary-card">
      <div class="summary-header">
        <span class="summary-kicker">今日摘要</span>
        <h2>重点信息概览</h2>
      </div>
      <div class="summary-grid">
        <div class="summary-section">
          <h3>今日概览</h3>
          <p>${formatMultiline(summary.overview || "今日暂无总结，请查看下方筛选推文。")}</p>
        </div>
${focusHtml}
${risksHtml}
      </div>
${tagsHtml}
    </section>`;
}

function buildCard(tweet) {
  const avatar = tweet.username.replace(/^@/, "").charAt(0).toUpperCase() || "T";
  const timeDisplay = tweet.time.split(" ").slice(1).join(" ") || tweet.time;
  const keywordTags = tweet.keywords
    .map((keyword) => `      <span class="keyword-tag">${escapeHtml(keyword)}</span>`)
    .join("\n");

  return `    <div class="tweet-card">
      <div class="tweet-author">
        <div class="tweet-avatar">${avatar}</div>
        <div class="tweet-author-info">
          <div class="tweet-display-name">${escapeHtml(tweet.displayName)}</div>
          <div class="tweet-username">${escapeHtml(tweet.username)}</div>
        </div>
        <div class="tweet-time">${escapeHtml(timeDisplay)}</div>
      </div>
      <div class="tweet-content">
        <div class="tweet-original">${formatMultiline(tweet.original)}</div>
        <div class="tweet-translation">${formatMultiline(tweet.translated)}</div>
      </div>
      <div class="keyword-tags">
${keywordTags}
      </div>
      <div class="tweet-footer">
        <div class="tweet-stats">
          <span class="tweet-stat like">❤️ ${tweet.likes}</span>
          <span class="tweet-stat retweet">🔄 ${tweet.retweets}</span>
          <span class="tweet-stat comment">💬 ${tweet.comments}</span>
        </div>
        <a href="${escapeHtml(tweet.url)}" class="tweet-link" target="_blank" rel="noreferrer">查看原文 ↗</a>
      </div>
    </div>`;
}

function getNav(outputPath, reportsDir) {
  const currentFile = path.basename(outputPath);
  const files = fs.existsSync(reportsDir)
    ? fs.readdirSync(reportsDir).filter((file) => file.endsWith(".html")).sort()
    : [];
  const ordered = Array.from(new Set([...files, currentFile])).sort();
  const index = ordered.indexOf(currentFile);
  const prev = index > 0 ? ordered[index - 1] : null;
  const next = index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : null;

  return {
    prevHref: prev ? prev : "#",
    prevClass: prev ? "" : "disabled",
    nextHref: next ? next : "#",
    nextClass: next ? "" : "disabled",
  };
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.input || !args.output || !args.template || !args.reportsDir) {
    console.error("Usage: node scripts/render_report.js --input <file> --output <file> --template <file> --reports-dir <dir>");
    process.exit(1);
  }

  const inputPath = path.resolve(args.input);
  const outputPath = path.resolve(args.output);
  const templatePath = path.resolve(args.template);
  const reportsDir = path.resolve(args.reportsDir);
  const summaryPath = args.summary ? path.resolve(args.summary) : inputPath.replace(/_translated\.md$/, "_summary.md");

  const markdown = fs.readFileSync(inputPath, "utf8");
  const tweets = parseBlocks(markdown);
  const date = path.basename(outputPath, ".html");
  const generatedTime = (() => {
    const now = getNowUTC8();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  })();
  const nav = getNav(outputPath, reportsDir);

  let template = fs.readFileSync(templatePath, "utf8");
  template = template.replace("<!-- SUMMARY_PLACEHOLDER -->", buildSummary(summaryPath));
  template = template.replace("<!-- TWEETS_PLACEHOLDER -->", tweets.map(buildCard).join("\n"));
  template = template.replace(/\{\{DATE\}\}/g, date);
  template = template.replace(/\{\{DISPLAY_DATE\}\}/g, formatDateCN(date));
  template = template.replace(/\{\{TWEET_COUNT\}\}/g, String(tweets.length));
  template = template.replace(/\{\{GENERATED_TIME\}\}/g, generatedTime);
  template = template.replace(/\{\{PREV_DAY_HREF\}\}/g, nav.prevHref);
  template = template.replace(/\{\{PREV_DAY_CLASS\}\}/g, nav.prevClass);
  template = template.replace(/\{\{NEXT_DAY_HREF\}\}/g, nav.nextHref);
  template = template.replace(/\{\{NEXT_DAY_CLASS\}\}/g, nav.nextClass);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, template, "utf8");
  console.log(`📄 Report generated: ${outputPath}`);
}

main();
