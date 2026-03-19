const fs = require('fs');

const icons = [
  'vercel',
  'openai',
  'microsoft',
  'langchain',
  'googlegemini',
  'anthropic',
  'n8n',
  'zapier'
];

async function pullIcons() {
  for (const slug of icons) {
    console.log(`Fetching ${slug}...`);
    try {
      const res = await fetch(`https://cdn.simpleicons.org/${slug}`);
      if (!res.ok) {
        console.error(`Failed to fetch ${slug}:`, res.statusText);
        continue;
      }
      let svg = await res.text();
      
      // Strip any hardcoded fills so Mintlify can dynamically toggle text contrast
      svg = svg.replace(/fill="[^"]*"/g, '');
      // Force native CSS inheritance
      svg = svg.replace('<svg ', '<svg fill="currentColor" ');
      
      fs.writeFileSync(`packages/docs/images/icons/${slug}.svg`, svg);
      console.log(`Saved ${slug}.svg`);
    } catch (e) {
      console.error(`Error on ${slug}:`, e);
    }
  }
}

pullIcons();
