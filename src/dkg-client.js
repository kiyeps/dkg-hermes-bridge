// Minimal DKG HTTP client using built-in fetch.
// Auth token: line 2 of ~/.dkg/auth.token (strip # comment lines).

import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export class DKGClient {
  constructor({ baseUrl = 'http://127.0.0.1:9200', contextGraphId = 'openclaw-curator' } = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.contextGraphId = contextGraphId;
    this.token = this._loadToken();
  }

  _loadToken() {
    const tokenPath = join(homedir(), '.dkg', 'auth.token');
    try {
      const lines = readFileSync(tokenPath, 'utf8').split('\n');
      // Strip comment lines, take line 2 (index 1 after filtering)
      const nonComment = lines.filter(l => !l.trim().startsWith('#'));
      return nonComment[1]?.trim() || nonComment[0]?.trim();
    } catch (err) {
      throw new Error(`Failed to load DKG auth token from ${tokenPath}: ${err.message}`);
    }
  }

  async _request(method, path, body = null) {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(url, opts);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`DKG API ${method} ${path} failed (${res.status}): ${text}`);
    }
    return res.json();
  }

  async status() {
    return this._request('GET', '/api/status');
  }

  async createKnowledgeAsset(name) {
    return this._request('POST', '/api/knowledge-assets', { name, contextGraphId: this.contextGraphId });
  }

  async writeQuads(kaName, quads) {
    return this._request('POST', `/api/knowledge-assets/${kaName}/wm/write`, {
      quads,
      contextGraphId: this.contextGraphId,
    });
  }

  async shareToSWM(kaName) {
    return this._request('POST', `/api/knowledge-assets/${kaName}/swm/share`, {
      entities: 'all',
      contextGraphId: this.contextGraphId,
    });
  }

  async query(sparql, view = 'working-memory', agentAddress = null) {
    const body = {
      sparql,
      view,
      contextGraphId: this.contextGraphId,
    };
    if (agentAddress) body.agentAddress = agentAddress;
    return this._request('POST', '/api/query', body);
  }

  freshKAName(prefix = 'hermes-audit') {
    const ts = Date.now();
    return `${prefix}-${ts}`;
  }
}
