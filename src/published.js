import { readFileSync } from 'node:fs';

export function readPayloadFromHtml(html) {
  const match = html.match(/<script id="payload" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) throw new Error('Dashboard payload was not found in index.html');
  return JSON.parse(match[1]);
}

export function readPublishedPayload(htmlPath = new URL('../index.html', import.meta.url)) {
  return readPayloadFromHtml(readFileSync(htmlPath, 'utf8'));
}
