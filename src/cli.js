#!/usr/bin/env node
// Hermes DKG Memory Bridge CLI.

import { DKGClient } from './dkg-client.js';
import { writeAuditTrail } from './audit.js';
import { recallActions } from './recall.js';

const [,, cmd, ...args] = process.argv;

async function main() {
  const client = new DKGClient();

  switch (cmd) {
    case 'status': {
      const status = await client.status();
      console.log(JSON.stringify(status, null, 2));
      break;
    }

    case 'audit': {
      const actionJson = args[0];
      if (!actionJson) {
        console.error('Usage: hermes-dkg audit <action-json>');
        process.exit(1);
      }
      const action = JSON.parse(actionJson);
      const result = await writeAuditTrail(client, action);
      console.log(`Audit recorded: ${result.kaName} (${result.quads.length} quads, ${result.redactedCount} redacted)`);
      break;
    }

    case 'recall': {
      const sparql = args[0];
      if (!sparql) {
        console.error('Usage: hermes-dkg recall <sparql-query>');
        process.exit(1);
      }
      const result = await client.query(sparql, 'working-memory');
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case 'promote': {
      const kaName = args[0];
      if (!kaName) {
        console.error('Usage: hermes-dkg promote <ka-name>');
        process.exit(1);
      }
      const result = await client.shareToSWM(kaName);
      console.log(`Promoted to SWM: ${kaName}`);
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case 'daemon': {
      console.log('Daemon mode not yet implemented (Round 1 scope: CLI only)');
      break;
    }

    default:
      console.log(`Hermes DKG Memory Bridge v0.1.0

Usage:
  hermes-dkg status                    Check DKG node status
  hermes-dkg audit <action-json>       Record Hermes action to DKG WM
  hermes-dkg recall <sparql>           Query prior actions from DKG
  hermes-dkg promote <ka-name>         Promote KA to SWM (entities:"all")
  hermes-dkg daemon                    (not yet implemented)

Example:
  hermes-dkg audit '{"actor":"hermes","chain":"base","actionType":"swap","params":{"from":"ETH","to":"USDC"},"outcome":"success"}'
`);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
