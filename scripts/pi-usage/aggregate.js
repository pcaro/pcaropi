// Session[] -> Summary: totals, byProject, byModel, byDay.
// Contract: see plans/2026-10-29-pi-usage.md "aggregate".

/**
 * @typedef {Object} Session
 * @property {string} Session.project
 * @property {string|null} Session.model
 * @property {string} Session.startedAt
 * @property {number} Session.turns
 * @property {{ total: number }} Session.tokens
 * @property {number} Session.cost
 */

/**
 * @param {Session[]} sessions
 */
export function aggregate(sessions) {
  const totals = { sessions: 0, turns: 0, tokens: 0, cost: 0 };
  /** @type {Map<string, {sessions:number,turns:number,tokens:number,cost:number}>} */
  const byProject = new Map();
  /** @type {Map<string, {sessions:number,turns:number,tokens:number,cost:number}>} */
  const byModel = new Map();
  /** @type {Map<string, {sessions:number,turns:number,tokens:number,cost:number}>} */
  const byDay = new Map();

  const add = (map, key, s) => {
    let row = map.get(key);
    if (!row) {
      row = { sessions: 0, turns: 0, tokens: 0, cost: 0 };
      map.set(key, row);
    }
    row.sessions += 1;
    row.turns += s.turns;
    row.tokens += s.tokens.total;
    row.cost += s.cost;
  };

  for (const s of sessions) {
    totals.sessions += 1;
    totals.turns += s.turns;
    totals.tokens += s.tokens.total;
    totals.cost += s.cost;
    add(byProject, s.project, s);
    add(byModel, s.model ?? "unknown", s);
    add(byDay, s.startedAt.slice(0, 10), s);
  }

  return {
    totals,
    byProject: [...byProject].map(([project, r]) => ({ project, ...r })).sort((a, b) => b.cost - a.cost),
    byModel: [...byModel].map(([model, r]) => ({ model, ...r })).sort((a, b) => b.cost - a.cost),
    byDay: [...byDay].map(([day, r]) => ({ day, ...r })).sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0)),
  };
}
