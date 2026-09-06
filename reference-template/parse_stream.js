#!/usr/bin/env node
//
// parse_stream.js — render Claude Code's stream-json output as readable,
// tool-by-tool progress.
// ------------------------------------------------------------------
// Ralph runs headless (`claude -p`), where the default output is a wall of text
// that only lands when the turn is already over. `--output-format stream-json`
// emits one JSON object per line *as the agent works*; this script turns that
// firehose into something a human can watch — and a log worth grepping.
//
// USAGE
//   claude -p "$prompt" --verbose --output-format stream-json \
//     --include-partial-messages | node parse_stream.js
//
//   loop.sh wires this up for you (see the STREAM knob in README.md).
//
// It degrades gracefully, because a loop must not die on its own telemetry:
//   - without --include-partial-messages it renders whole messages, not deltas
//   - lines that aren't JSON (CLI warnings, stack traces) pass straight through
//   - NO_COLOR=1 drops the ANSI codes (nicer when the output is teed to a file)
//
// Nothing here is project-specific: it only knows about Claude Code's stream
// schema and the standard tool names.
// ------------------------------------------------------------------

const readline = require('readline');

// A downstream reader can go away (`| head`, a pager the user quits). Exit
// quietly instead of dumping an EPIPE stack trace into the loop's log.
process.stdout.on('error', (err) => {
  if (err.code === 'EPIPE') process.exit(0);
  throw err;
});

// ---- output helpers ----------------------------------------------
const useColor = !process.env.NO_COLOR;
const paint = (code) => (useColor ? code : '');
const colors = {
  reset: paint('\x1b[0m'),
  dim: paint('\x1b[2m'),
  green: paint('\x1b[32m'),
  yellow: paint('\x1b[33m'),
  magenta: paint('\x1b[35m'),
  cyan: paint('\x1b[36m'),
  red: paint('\x1b[31m'),
  gray: paint('\x1b[90m'),
};

// ---- state -------------------------------------------------------
// Content blocks in flight, keyed by "<parent tool use id>:<index>" so a
// subagent's blocks can't clobber the main thread's.
const openBlocks = new Map();

let sawStreamEvents = false; // true once --include-partial-messages is proven
let toolUseCount = 0;
let lastRateBucket = -1; // 10%-buckets of the 5h usage window, to avoid spam

// The `assistant` event (which carries usage) arrives BEFORE the stream's
// content_block_stop, so printing the context line there would wedge it between
// a tool's header and its arguments. Hold it until the message closes.
let pendingContext = null;

function flushContext() {
  if (pendingContext) {
    console.log(pendingContext);
    pendingContext = null;
  }
}

// Context-window growth, main thread only — subagents have their own window.
let lastContextTokens = 0;
let peakContextTokens = 0;

// Result events, buffered until the stream ends. One headless session can emit
// several (one per turn when background tasks report back), so we sum them.
const finalResults = [];

function formatTokens(n) {
  return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);
}

// ---- rendering ---------------------------------------------------

// One line summarising what a tool was actually asked to do.
function formatToolDetails(name, params) {
  if (!params || typeof params !== 'object') return null;
  switch (name) {
    case 'Bash':
      return params.command ? `$ ${params.command}` : null;
    case 'Task':
    case 'Agent': {
      const desc = params.description || '';
      const type = params.subagent_type || '';
      return type ? `${type}(${desc})` : desc || null;
    }
    case 'Read':
      return params.file_path ? `📄 ${params.file_path}` : null;
    case 'Write':
      return params.file_path ? `✏️  ${params.file_path}` : null;
    case 'Edit':
    case 'NotebookEdit':
      return params.file_path || params.notebook_path
        ? `🔨 ${params.file_path || params.notebook_path}`
        : null;
    case 'Glob':
      return params.pattern ? `🔍 ${params.pattern}` : null;
    case 'Grep':
      return params.pattern ? `🔎 "${params.pattern}"` : null;
    case 'WebFetch':
      return params.url ? `🌐 ${params.url}` : null;
    case 'WebSearch':
      return params.query ? `🔍 "${params.query}"` : null;
    case 'TodoWrite':
      return Array.isArray(params.todos) ? `${params.todos.length} tasks` : null;
    default: {
      // Unknown tool (an MCP server, a newer built-in): show the first
      // short string param rather than nothing.
      for (const [key, val] of Object.entries(params)) {
        if (typeof val === 'string' && val.length < 80) return `${key}: ${val}`;
      }
      return null;
    }
  }
}

function printIndented(text, { indent = '   ', color = colors.dim, maxLines = 3, maxWidth = 100 } = {}) {
  const lines = String(text).split('\n');
  lines.slice(0, maxLines).forEach((l) => {
    const line = l.length > maxWidth ? l.slice(0, maxWidth - 3) + '...' : l;
    console.log(`${color}${indent}${line}${colors.reset}`);
  });
  if (lines.length > maxLines) {
    console.log(`${colors.dim}${indent}... +${lines.length - maxLines} more lines${colors.reset}`);
  }
}

function printToolUse(name, params, sub) {
  toolUseCount++;
  const indent = sub ? '  ' : '';
  const mark = sub ? `${colors.magenta}↳ 🔧` : `${colors.cyan}🔧`;
  console.log(`\n${indent}${mark} ${name}${colors.reset}`);
  const details = formatToolDetails(name, params);
  if (details) printIndented(details, { indent: indent + '   ' });
}

// Tool results arrive as content blocks on a `user` message.
function printToolResult(content, isError) {
  console.log(isError
    ? `${colors.red}   ✗ Error:${colors.reset}`
    : `${colors.green}   ↳ Result:${colors.reset}`);

  let text = '';
  if (Array.isArray(content)) {
    for (const block of content) if (block.type === 'text') text += block.text;
  } else if (typeof content === 'string') {
    text = content;
  } else if (content && content.text) {
    text = content.text;
  }
  if (!text.trim()) return;

  const lines = text.split('\n').filter((l) => l.trim());
  printIndented(lines.join('\n'), {
    indent: '     ',
    color: colors.gray,
    maxLines: 5,
    maxWidth: 120,
  });
}

// ---- stream events (live, needs --include-partial-messages) -------
function handleStreamEvent(event, sub, parentId) {
  const key = `${parentId || 'main'}:${event.index}`;

  if (event.type === 'content_block_start') {
    const block = event.content_block;
    if (block?.type === 'tool_use') {
      // Input arrives as partial_json deltas; buffer until the block closes.
      openBlocks.set(key, { name: block.name, buf: '', sub });
      toolUseCount++;
      const indent = sub ? '  ' : '';
      const mark = sub ? `${colors.magenta}↳ 🔧` : `${colors.cyan}🔧`;
      console.log(`\n${indent}${mark} ${block.name}${colors.reset}`);
    } else if (block?.type === 'thinking') {
      console.log(`\n${colors.dim}💭 thinking...${colors.reset}`);
    }

  } else if (event.type === 'content_block_delta') {
    const delta = event.delta;
    if (delta?.text) process.stdout.write(delta.text);
    if (delta?.partial_json !== undefined) {
      const open = openBlocks.get(key);
      if (open) open.buf += delta.partial_json;
    }

  } else if (event.type === 'message_stop') {
    flushContext();

  } else if (event.type === 'content_block_stop') {
    const open = openBlocks.get(key);
    if (!open) return;
    openBlocks.delete(key);
    let params = null;
    try { params = JSON.parse(open.buf); } catch { /* truncated input */ }
    const details = formatToolDetails(open.name, params);
    if (details) printIndented(details, { indent: open.sub ? '     ' : '   ' });
  }
}

// ---- whole messages (fallback + usage accounting) -----------------
function handleAssistant(data) {
  const message = data.message;
  const sub = Boolean(data.parent_tool_use_id);

  // Only render content here if we never saw stream events — otherwise this
  // is a replay of what we already printed live.
  if (!sawStreamEvents && Array.isArray(message?.content)) {
    for (const block of message.content) {
      if (block.type === 'text' && block.text.trim()) {
        console.log(block.text);
      } else if (block.type === 'thinking') {
        console.log(`${colors.dim}💭 thinking...${colors.reset}`);
      } else if (block.type === 'tool_use') {
        printToolUse(block.name, block.input, sub);
      }
    }
  }

  // Context visibility: each completed assistant turn reports full prompt-side
  // usage — input + cache read/write + output ≈ how full the window is at the
  // end of that turn. Skip subagent turns; they run in their own window.
  const usage = message?.usage;
  if (usage && !sub) {
    const ctx = (usage.input_tokens || 0)
      + (usage.cache_read_input_tokens || 0)
      + (usage.cache_creation_input_tokens || 0)
      + (usage.output_tokens || 0);
    if (ctx > 0 && ctx !== lastContextTokens) {
      const delta = ctx - lastContextTokens;
      const deltaStr = lastContextTokens
        ? ` (${delta >= 0 ? '+' : ''}${formatTokens(delta)})`
        : '';
      const line = `\n${colors.dim}   ⧉ context: ${formatTokens(ctx)} tokens${deltaStr}${colors.reset}`;
      if (sawStreamEvents) pendingContext = line; else console.log(line);
      lastContextTokens = ctx;
      if (ctx > peakContextTokens) peakContextTokens = ctx;
    }
  }
}

// ---- dispatch ----------------------------------------------------
function handle(data) {
  switch (data.type) {
    case 'stream_event':
      sawStreamEvents = true;
      if (data.event) {
        handleStreamEvent(data.event, Boolean(data.parent_tool_use_id), data.parent_tool_use_id);
      }
      break;

    case 'assistant':
      handleAssistant(data);
      break;

    case 'user': {
      const content = data.message?.content;
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === 'tool_result') {
            printToolResult(block.content, Boolean(block.is_error));
          }
        }
      }
      break;
    }

    case 'system':
      if (data.subtype === 'init') {
        // Worth seeing every iteration: which model, and — the one that bites —
        // which permission mode the loop actually started the agent in.
        const bits = [
          data.model,
          data.permissionMode && `permissions: ${data.permissionMode}`,
          data.session_id && `session ${String(data.session_id).slice(0, 8)}`,
        ].filter(Boolean).join(' · ');
        if (bits) console.log(`${colors.dim}⚙  ${bits}${colors.reset}`);
      } else if (data.message) {
        console.log(`${colors.yellow}ℹ  ${data.message}${colors.reset}`);
      }
      // Other subtypes (e.g. "status") are internal chatter — stay quiet.
      break;

    case 'rate_limit_event': {
      // A long Ralph run dies at the usage window, not at the task. Surface it
      // in 10% steps so "why did iteration 14 fail" is answerable from the log.
      const info = data.rate_limit_info || {};
      const windows = info.unifiedWindows;
      const blocked = info.status && info.status !== 'allowed';
      if (!windows && !blocked) break;
      const pct = (w) => Math.round((w?.utilization || 0) * 100);
      const five = pct(windows?.five_hour);
      const bucket = Math.floor(five / 10);
      if (!blocked && bucket === lastRateBucket) break;
      lastRateBucket = bucket;
      const color = blocked ? colors.red : five >= 80 ? colors.yellow : colors.dim;
      const suffix = blocked ? ` · ${info.status}` : '';
      console.log(`${color}⏱  usage: 5h ${five}% · 7d ${pct(windows?.seven_day)}%${suffix}${colors.reset}`);
      break;
    }

    case 'error': {
      const error = data.error || data;
      console.log(`\n${colors.red}❌ Error: ${error.message || JSON.stringify(error)}${colors.reset}`);
      break;
    }

    case 'result':
      // Buffered: a session that spawns background tasks emits one result per
      // turn. Summarise them together at stream end.
      finalResults.push(data);
      break;

    default:
      break;
  }
}

const rl = readline.createInterface({ input: process.stdin, terminal: false });

rl.on('line', (line) => {
  let data;
  try {
    data = JSON.parse(line);
  } catch {
    // Not JSON — a CLI warning or a stack trace. Pass it through so it lands
    // in the log too; the loop greps that log.
    if (line.trim()) console.log(`${colors.gray}${line}${colors.reset}`);
    return;
  }
  try {
    handle(data);
  } catch (e) {
    console.log(`${colors.red}(parse_stream: ${e.message})${colors.reset}`);
  }
});

rl.on('close', () => {
  flushContext();
  if (!finalResults.length) return;

  // duration_ms and token counts are per-turn — sum them. total_cost_usd is
  // cumulative across the session — take the last.
  let durationMs = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  for (const data of finalResults) {
    durationMs += data.duration_ms || 0;
    const u = data.usage || {};
    // ↓ is prompt-side work: fresh input plus cache reads/writes. Plain
    // input_tokens is near-zero on a cached loop and reads as "did nothing".
    inputTokens += (u.input_tokens || 0)
      + (u.cache_read_input_tokens || 0)
      + (u.cache_creation_input_tokens || 0)
      || data.total_input_tokens || data.input_tokens || 0;
    outputTokens += (u.output_tokens || 0) || data.total_output_tokens || data.output_tokens || 0;
  }
  const last = finalResults[finalResults.length - 1];
  const cost = last.total_cost_usd || last.cost_usd || 0;

  const seconds = Math.floor(durationMs / 1000);
  const timeStr = seconds >= 60 ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : `${seconds}s`;
  const peakStr = peakContextTokens > 0 ? ` | Peak ctx: ${formatTokens(peakContextTokens)}` : '';
  const turnsStr = finalResults.length > 1 ? ` | Turns: ${finalResults.length}` : '';
  const stats = `${timeStr} | Cost: $${cost.toFixed(4)}`
    + ` | Tokens: ↓${formatTokens(inputTokens)} ↑${formatTokens(outputTokens)}`
    + ` | Tools: ${toolUseCount}${turnsStr}${peakStr}`;

  const isError = last.is_error || (last.subtype && last.subtype !== 'success');
  console.log('\n────────────────────────────────────────────────────────');
  if (isError) {
    console.log(`${colors.red}❌ Failed${colors.reset} (${last.subtype || 'error'}) in ${stats}`);
    if (typeof last.result === 'string' && last.result.trim()) {
      console.log(`${colors.red}   ${last.result.trim()}${colors.reset}`);
    }
  } else {
    console.log(`${colors.green}✅ Done${colors.reset} in ${stats}`);
  }
});
