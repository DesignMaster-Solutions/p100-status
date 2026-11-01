// The six fixed public Atlassian Statuspage feeds. No other hosts are fetched.
// Base page numbers are stable and in a fixed order (101..106).

export interface Provider {
  id: string;
  name: string;
  url: string;
  page: number;
}

export const PROVIDERS: Provider[] = [
  { id: 'github', name: 'GitHub', url: 'https://www.githubstatus.com/api/v2/summary.json', page: 101 },
  { id: 'cloudflare', name: 'Cloudflare', url: 'https://www.cloudflarestatus.com/api/v2/summary.json', page: 102 },
  { id: 'openai', name: 'OpenAI', url: 'https://status.openai.com/api/v2/summary.json', page: 103 },
  { id: 'anthropic', name: 'Anthropic', url: 'https://status.anthropic.com/api/v2/summary.json', page: 104 },
  { id: 'vercel', name: 'Vercel', url: 'https://www.vercel-status.com/api/v2/summary.json', page: 105 },
  { id: 'discord', name: 'Discord', url: 'https://discordstatus.com/api/v2/summary.json', page: 106 },
];
