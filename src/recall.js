// Decision recall: query prior actions from DKG WM/SWM via SPARQL.

const PRED_NS = 'http://127.0.0.1:7878/';

export function buildRecallQuery({ chain, actionType, token, limit = 10 }) {
  const filters = [];
  if (chain) filters.push(`?chain = "${chain}"`);
  if (actionType) filters.push(`?actionType = "${actionType}"`);
  if (token) filters.push(`CONTAINS(?paramsHash, "${token}")`);

  const filterClause = filters.length > 0 ? `FILTER(${filters.join(' && ')})` : '';

  return `
SELECT ?action ?actor ?chain ?actionType ?paramsHash ?outcome ?timestamp
WHERE {
  ?action <${PRED_NS}actor> ?actor .
  ?action <${PRED_NS}chain> ?chain .
  ?action <${PRED_NS}actionType> ?actionType .
  ?action <${PRED_NS}paramsHash> ?paramsHash .
  ?action <${PRED_NS}outcome> ?outcome .
  ?action <${PRED_NS}timestamp> ?timestamp .
  ${filterClause}
}
ORDER BY DESC(?timestamp)
LIMIT ${limit}
`.trim();
}

export async function recallActions(client, filters, view = 'wm') {
  const sparql = buildRecallQuery(filters);
  const result = await client.query(sparql, view);
  return result.results?.bindings || [];
}
