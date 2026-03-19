const fs = require('fs');

const mappings = {
  "vercel-ai-sdk.mdx": "vercel",
  "langchain.mdx": "langchain",
  "gemini-api.mdx": "googlegemini",
  "gemini-live-api.mdx": "googlegemini",
  "claude-memory-tool.mdx": "anthropic",
  "claude-code.mdx": "anthropic",
  "n8n.mdx": "n8n",
  "zapier.mdx": "zapier"
};

for (const [file, prefix] of Object.entries(mappings)) {
  const path = `packages/docs/guides/${file}`;
  if (!fs.existsSync(path)) continue;
  
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(/^icon:\s*["'].*?["']/m, `icon: "/images/icons/${prefix}.svg"`);
  fs.writeFileSync(path, content);
}
console.log("Updated markdown to reference custom SVG paths.");
