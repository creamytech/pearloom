// ─────────────────────────────────────────────────────────────
// Pearloom / lib/block-engine/integrations.ts
// Webhooks & external data source integrations.
// Connect blocks to Google Sheets, Airtable, REST APIs, etc.
// ─────────────────────────────────────────────────────────────

import type { PageBlock } from '@/types';

/**
 * Integration types supported.
 */
export type IntegrationType =
  | 'google-sheets'   // Pull data from Google Sheets
  | 'airtable'        // Pull data from Airtable
  | 'rest-api'        // Custom REST API endpoint
  | 'rss'             // RSS feed
  | 'webhook-out';    // Send data to external webhook

/**
 * Integration configuration stored in block.config._integration.
 */
export interface BlockIntegration {
  type: IntegrationType;
  /** Source URL (spreadsheet URL, API endpoint, etc.) */
  sourceUrl: string;
  /** Field mapping: block config key → data source column/field */
  fieldMap: Record<string, string>;
  /** Refresh interval in seconds (0 = manual only) */
  refreshInterval: number;
  /** Last successful sync timestamp */
  lastSynced?: number;
  /** Auth token (stored encrypted) */
  authToken?: string;
}

/**
 * Built-in integration presets.
 */
export const INTEGRATION_PRESETS: Array<{
  type: IntegrationType;
  label: string;
  description: string;
  icon: string;
  fields: Array<{ key: string; label: string; type: 'url' | 'text' | 'select' }>;
}> = [
  {
    type: 'google-sheets',
    label: 'Google Sheets',
    description: 'Sync guest list, registry items, or FAQ from a Google Sheets spreadsheet',
    icon: 'Sheet',
    fields: [
      { key: 'sourceUrl', label: 'Spreadsheet URL', type: 'url' },
      { key: 'sheetName', label: 'Sheet Name', type: 'text' },
    ],
  },
  {
    type: 'airtable',
    label: 'Airtable',
    description: 'Pull structured data from an Airtable base for registry, vendors, or guests',
    icon: 'Database',
    fields: [
      { key: 'sourceUrl', label: 'Airtable API URL', type: 'url' },
      { key: 'authToken', label: 'API Key', type: 'text' },
    ],
  },
  {
    type: 'rest-api',
    label: 'REST API',
    description: 'Connect to any REST API endpoint to pull dynamic data',
    icon: 'Globe',
    fields: [
      { key: 'sourceUrl', label: 'API Endpoint', type: 'url' },
      { key: 'authToken', label: 'Bearer Token (optional)', type: 'text' },
    ],
  },
  {
    type: 'webhook-out',
    label: 'Outbound Webhook',
    description: 'Send RSVP submissions, guestbook entries, or form data to an external service',
    icon: 'Send',
    fields: [
      { key: 'sourceUrl', label: 'Webhook URL', type: 'url' },
    ],
  },
];

/**
 * Get the integration config from a block, if any.
 */
export function getBlockIntegration(block: PageBlock): BlockIntegration | null {
  return (block.config?._integration as BlockIntegration) || null;
}

/**
 * Set integration config on a block.
 */
export function setBlockIntegration(
  block: PageBlock,
  integration: BlockIntegration | null,
): PageBlock {
  return {
    ...block,
    config: {
      ...(block.config || {}),
      _integration: integration,
    },
  };
}

/**
 * Fetch data from an integration source.
 * This runs server-side via an API route (/api/integrations/fetch).
 */
export async function fetchIntegrationData(
  integration: BlockIntegration,
  signal?: AbortSignal,
): Promise<Record<string, unknown>[] | null> {
  try {
    const res = await fetch('/api/integrations/fetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: integration.type,
        sourceUrl: integration.sourceUrl,
        authToken: integration.authToken,
      }),
      signal,
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.rows || data.records || data.items || [];
  } catch {
    return null;
  }
}

/**
 * Apply fetched data to a block config using the field map.
 */
export function applyIntegrationData(
  config: Record<string, unknown>,
  data: Record<string, unknown>[],
  fieldMap: Record<string, string>,
): Record<string, unknown> {
  const updated = { ...config };

  for (const [configKey, dataField] of Object.entries(fieldMap)) {
    // For simple fields, take the first row's value
    if (data.length > 0 && dataField in data[0]) {
      updated[configKey] = data[0][dataField];
    }
    // For array fields (e.g., FAQ questions), collect all rows
    if (data.length > 1) {
      updated[`${configKey}_items`] = data.map(row => row[dataField]);
    }
  }

  return updated;
}
