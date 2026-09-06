#!/usr/bin/env node
// Parse Claude stream-json output for readable display
// Usage: claude ... --output-format stream-json | node parse_stream.js

const readline = require('readline');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// Track current tool and its input
let currentToolIndex = null;
let currentToolName = null;
let toolInputBuffer = '';
let lastToolName = null; // Track for matching results

// Track message state
let messageCount = 0;
let toolUseCount = 0;

// Track context window growth (main thread only — subagents have their own)
let lastContextTokens = 0;
let peakContextTokens = 0;

// Result events buffered until stream end (can be several per session — one
// per background-task-notification turn)
const finalResults = [];

function formatTokens(n) {
  return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);
}

// Format tool details based on name and input
function formatToolDetails(name, input) {
  try {
    const params = JSON.parse(input);
    switch (name) {
      case 'Bash':
        return params.command ? `$ ${params.command}` : null;
      case 'Task':
        const desc = params.description || '';
        const type = params.subagent_type || '';
        return type ? `${type}(${desc})` : desc;
      case 'Read':
        return params.file_path ? `📄 ${params.file_path}` : null;
      case 'Write':
        return params.file_path ? `✏️  ${params.file_path}` : null;
      case 'Edit':
        return params.file_path ? `🔨 ${params.file_path}` : null;
      case 'Glob':
        return params.pattern ? `🔍 ${params.pattern}` : null;
      case 'Grep':
        return params.pattern ? `🔎 "${params.pattern}"` : null;
      case 'WebFetch':
        return params.url ? `🌐 ${params.url}` : null;
      case 'WebSearch':
        return params.query ? `🔍 "${params.query}"` : null;
      case 'TodoWrite':
      case 'TaskCreate':
        return params.todos ? `${params.todos.length} tasks` : null;
      default:
        // For other tools, show first meaningful param
        const keys = Object.keys(params);
        if (keys.length > 0) {
          const key = keys[0];
          const val = params[key];
          if (typeof val === 'string' && val.length < 80) {
            return `${key}: ${val}`;
          }
        }
        return null;
    }
  } catch (e) {
    return null;
  }
}

// Format tool result for display
function formatToolResult(content) {
  if (!content) return null;

  let text = '';

  // Handle array of content blocks
  if (Array.isArray(content)) {
    for (const block of content) {
      if (block.type === 'text') {
        text += block.text;
      }
    }
  } else if (typeof content === 'string') {
    text = content;
  } else if (content.text) {
    text = content.text;
  }

  if (!text) return null;

  // Clean and truncate
  const lines = text.split('\n').filter(l => l.trim());
  const maxLines = 5;
  const maxLineLength = 120;

  let result = [];
  for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
    let line = lines[i];
    if (line.length > maxLineLength) {
      line = line.substring(0, maxLineLength - 3) + '...';
    }
    result.push(line);
  }

  if (lines.length > maxLines) {
    result.push(`${colors.dim}... +${lines.length - maxLines} more lines${colors.reset}`);
  }

  return result.join('\n');
}

rl.on('line', (line) => {
  try {
    const data = JSON.parse(line);

    // ===== STREAM EVENTS =====
    if (data.type === 'stream_event') {
      const event = data.event;

      if (event?.type === 'content_block_delta') {
        const delta = event.delta;

        // Handle text output
        if (delta?.text) {
          process.stdout.write(delta.text);
        }

        // Handle tool input (accumulate JSON)
        if (delta?.partial_json !== undefined) {
          toolInputBuffer += delta.partial_json;
        }

      } else if (event?.type === 'content_block_start') {
        const block = event.content_block;

        if (block?.type === 'tool_use') {
          currentToolIndex = event.index;
          currentToolName = block.name;
          lastToolName = block.name;
          toolInputBuffer = '';
          toolUseCount++;
          console.log(`\n${colors.cyan}🔧 ${block.name}${colors.reset}`);
        }

      } else if (event?.type === 'content_block_stop') {
        // Tool block finished - show details
        if (currentToolName && toolInputBuffer) {
          const details = formatToolDetails(currentToolName, toolInputBuffer);
          if (details) {
            // Indent and truncate long output
            const lines = details.split('\n');
            const maxLines = 3;
            const displayLines = lines.slice(0, maxLines);
            displayLines.forEach(l => {
              const truncated = l.length > 100 ? l.substring(0, 97) + '...' : l;
              console.log(`${colors.dim}   ${truncated}${colors.reset}`);
            });
            if (lines.length > maxLines) {
              console.log(`${colors.dim}   ... +${lines.length - maxLines} more lines${colors.reset}`);
            }
          }
        }
        currentToolName = null;
        currentToolIndex = null;
        toolInputBuffer = '';

      } else if (event?.type === 'message_start') {
        // New message starting
        messageCount++;
        const msg = event.message;
        if (msg?.role === 'assistant') {
          // Could show turn number: console.log(`\n--- Turn ${messageCount} ---`);
        }

      } else if (event?.type === 'message_stop') {
        // Message complete
        // Useful for knowing when a full response is done
      }

    // ===== TOOL RESULTS =====
    } else if (data.type === 'tool_result') {
      const result = data.result || data.content;
      const toolName = data.tool_name || lastToolName || 'tool';
      const isError = data.is_error || false;

      if (isError) {
        console.log(`${colors.red}   ✗ Error:${colors.reset}`);
      } else {
        console.log(`${colors.green}   ↳ Result:${colors.reset}`);
      }

      const formatted = formatToolResult(result);
      if (formatted) {
        formatted.split('\n').forEach(line => {
          console.log(`${colors.gray}     ${line}${colors.reset}`);
        });
      }

    // ===== USER MESSAGES =====
    } else if (data.type === 'user') {
      // User message in conversation (usually tool results come this way)
      const content = data.message?.content;
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === 'tool_result') {
            const isError = block.is_error || false;
            if (isError) {
              console.log(`${colors.red}   ✗ Error:${colors.reset}`);
            } else {
              console.log(`${colors.green}   ↳ Result:${colors.reset}`);
            }

            const formatted = formatToolResult(block.content);
            if (formatted) {
              formatted.split('\n').forEach(line => {
                console.log(`${colors.gray}     ${line}${colors.reset}`);
              });
            }
          }
        }
      }

    // ===== ASSISTANT MESSAGES =====
    } else if (data.type === 'assistant') {
      // Handle subagent messages if present
      const message = data.message;
      if (message?.subagent) {
        console.log(`\n${colors.magenta}  ↳ [${message.subagent.type || 'subagent'}] ${message.subagent.status || ''}${colors.reset}`);
      }

      // Context visibility: each completed assistant turn reports full
      // prompt-side usage — input + cache read/write + output ≈ how full the
      // context window is at the end of that turn. Skip subagent turns
      // (parent_tool_use_id set): they run in their own context window.
      const usage = message?.usage;
      if (usage && !data.parent_tool_use_id) {
        const ctx = (usage.input_tokens || 0)
          + (usage.cache_read_input_tokens || 0)
          + (usage.cache_creation_input_tokens || 0)
          + (usage.output_tokens || 0);
        if (ctx > 0 && ctx !== lastContextTokens) {
          const delta = ctx - lastContextTokens;
          const deltaStr = lastContextTokens
            ? ` (${delta >= 0 ? '+' : ''}${formatTokens(delta)})`
            : '';
          console.log(`\n${colors.dim}   ⧉ context: ${formatTokens(ctx)} tokens${deltaStr}${colors.reset}`);
          lastContextTokens = ctx;
          if (ctx > peakContextTokens) peakContextTokens = ctx;
        }
      }

    // ===== ERRORS =====
    } else if (data.type === 'error') {
      const error = data.error || data;
      console.log(`\n${colors.red}❌ Error: ${error.message || JSON.stringify(error)}${colors.reset}`);

    // ===== SYSTEM MESSAGES =====
    } else if (data.type === 'system') {
      // System-level messages
      if (data.message) {
        console.log(`${colors.yellow}ℹ️  ${data.message}${colors.reset}`);
      }

    // ===== FINAL RESULT =====
    } else if (data.type === 'result') {
      // One headless session can emit SEVERAL result events: when the agent
      // spawns background subagents, each completion is delivered as a
      // <task-notification> follow-up turn in the same session, and every
      // turn gets its own result event. Buffer them and print one combined
      // summary when the stream ends.
      finalResults.push(data);
    }
  } catch (e) {
    if (line.trim()) process.stderr.write(line + '\n');
  }
});

rl.on('close', () => {
  if (!finalResults.length) return;

  // duration_ms and token counts are per-turn — sum them. total_cost_usd is
  // cumulative across the session — take the last.
  let durationMs = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  for (const data of finalResults) {
    durationMs += data.duration_ms || 0;
    // Try multiple possible field names for tokens
    inputTokens += data.total_input_tokens
      || data.input_tokens
      || data.usage?.input_tokens
      || data.session_input_tokens
      || 0;
    outputTokens += data.total_output_tokens
      || data.output_tokens
      || data.usage?.output_tokens
      || data.session_output_tokens
      || 0;
  }
  const last = finalResults[finalResults.length - 1];
  const cost = last.total_cost_usd || last.cost_usd || 0;

  const duration = Math.floor(durationMs / 1000);
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

  const isError = last.is_error || (last.subtype && last.subtype !== 'success');
  const peakStr = peakContextTokens > 0 ? ` | Peak ctx: ${formatTokens(peakContextTokens)}` : '';
  const turnsStr = finalResults.length > 1 ? ` | Turns: ${finalResults.length}` : '';

  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (isError) {
    console.log(`${colors.red}❌ Failed${colors.reset} (${last.subtype || 'error'}) in ${timeStr} | Cost: $${cost.toFixed(4)} | Tokens: ↓${inputTokens.toLocaleString()} ↑${outputTokens.toLocaleString()} | Tools: ${toolUseCount}${turnsStr}${peakStr}`);
    if (typeof last.result === 'string' && last.result.trim()) {
      console.log(`${colors.red}   ${last.result.trim()}${colors.reset}`);
    }
    if (Array.isArray(last.errors) && last.errors.length) {
      last.errors.forEach(e => console.log(`${colors.red}   ${typeof e === 'string' ? e : JSON.stringify(e)}${colors.reset}`));
    }
  } else {
    console.log(`${colors.green}✅ Done${colors.reset} in ${timeStr} | Cost: $${cost.toFixed(4)} | Tokens: ↓${inputTokens.toLocaleString()} ↑${outputTokens.toLocaleString()} | Tools: ${toolUseCount}${turnsStr}${peakStr}`);
  }

  // Debug: uncomment to see actual field names if tokens still show 0
  // console.log(`${colors.dim}Debug result keys: ${Object.keys(last).join(', ')}${colors.reset}`);
});
