---
name: linkup-mcp
description: Call Linkup from pi's MCP server correctly. Use whenever searching the web, scraping a URL, or starting research with Linkup tools (linkup_search, linkup_fetch, linkup_research) — covers the underscore tool names, the object return shape, wrapping calls in codemode to avoid blowing up context, and when to fall back to the REST API for schema extraction or fast depth.
---

Environment notes for the **`linkup` MCP server** in pi (remote endpoint
`https://mcp.linkup.so/mcp`, configured in `~/.pi/agent/mcp.json`, key via
`Authorization: Bearer ${LINKUP_API_KEY}`).

For *how to write the query* (depth choice, retrieval-plan discipline, filters,
bad patterns) read the upstream skill instead of duplicating it here:
`/home/pcaro/.agents/skills/linkup-search/SKILL.md` + its `references/`.

## Tool names use underscores

pi exposes MCP tools as `mcp__<server>__<tool>` and **sanitizes hyphens to
underscores**. The docs say `linkup-search`; the real name is `linkup_search`:

```js
tools["mcp__linkup__linkup_search"]         // search
tools["mcp__linkup__linkup_fetch"]          // scrape a URL
tools["mcp__linkup__linkup_research"]       // start async research
tools["mcp__linkup__linkup_get_research"]   // poll a research task
```

`mcp__linkup__linkup-search` does **not** exist. Find them with
`searchTools("linkup")` if unsure.

## Return shape: an object with a JSON string inside

Tools resolve to an MCP result object, not a string. `String(result)` gives you
`[object Object]`.

```js
const r = await tools["mcp__linkup__linkup_search"]({ query: "...", depth: "standard" });
const data = JSON.parse(r.content[0].text);   // { results: [{ name, url, content }] }
```

`fetch` returns the same wrapper around `{ markdown, images, favicon }`.
Errors come back as `isError: true` with the message in `content[0].text`, not
as a rejected promise.

## Call from codemode and slice

**Nothing truncates the output.** A `linkup_fetch` of a changelog page returned
34 KB in one shot. Never let a raw fetch land in the main context: call it inside
codemode, parse it, return only what you need.

```js
const r = await tools["mcp__linkup__linkup_fetch"]({
  url: "https://docs.getpelican.com/en/latest/changelog.html",
  mode: "standard", renderJs: false
});
const md = JSON.parse(r.content[0].text).markdown;
return md.split("\n").filter(l => l.startsWith("4.")).slice(0, 10).join("\n");
```

## What this MCP server does well

Verified working: `includeDomains`, `excludeDomains`, `fromDate`, `toDate`,
`maxResults`, `includeImages` on search; `mode: "pro"`, `renderJs`,
`extractImages`, `includeRawHtml` on fetch.

```js
tools["mcp__linkup__linkup_search"]({
  query: "Pelican 4.11 release notes",
  depth: "standard", maxResults: 5,
  includeDomains: ["getpelican.com", "github.com"],
  fromDate: "2025-01-01"
})
```

Research is async — start it, then poll by `id`; the final text lives in the
task's `output` field:

```js
const { id } = JSON.parse((await tools["mcp__linkup__linkup_research"]({
  query: "...", mode: "investigate", reasoningDepth: "M"
})).content[0].text);
// later, poll until status is completed or failed
tools["mcp__linkup__linkup_get_research"]({ id });
```

## Gaps: drop to the REST API

The MCP server does **not** expose:

| Missing | Use instead |
|---|---|
| `schema` + `instructions` on fetch (typed JSON extraction) | `POST /v1/fetch` |
| `depth: "fast"` (sub-second lookups) and `flash` | `POST /v1/search` |
| `outputType: "structured"` with `structuredOutputSchema` | `POST /v1/search` |
| credit balance (the old `/linkup:balance` command is gone) | `GET /v1/credits/balance` |

`LINKUP_API_KEY` is in the environment, so `curl` works directly:

```bash
curl -sS -X POST "https://api.linkup.so/v1/fetch" \
  -H "Authorization: Bearer $LINKUP_API_KEY" -H "Content-Type: application/json" \
  -d '{"url":"...","schema":{"type":"object","properties":{...}},"instructions":"..."}'
```

Typed extraction costs an extra $0.001 and is billed only on success.

## History

This replaced the `@aliou/pi-linkup` plugin (removed). That plugin had `depth:
"fast"` and `schema` on fetch but **no** domain/date filters and no research
endpoint. Don't reference its tools (`linkup_web_search`, `linkup_web_answer`,
`linkup_web_fetch`) — they no longer exist.
