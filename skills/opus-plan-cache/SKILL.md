---
name: opus-plan-cache
description: Keeps Claude plan context small by delegating file understanding to the file-reader subagent. Use proactively while planning or answering how code works. Do not Read a whole file and do not dump it with cat, type, Get-Content, head, or tail. Call the file-reader subagent with a path and a specific question, and treat its answer as the source. Read only a short cited range (limit of about 80 lines) when a specific line must be verified.
---

# Opus plan cache

File bodies belong in the file-reader subagent, not in the parent transcript.

## When this applies

Use this whenever you need to understand a file, its structure, or how code works, including during planning and implementation.

## What to do

1. Call the `file-reader` subagent with the filepath and one specific question.
2. Treat the subagent's answer as the source of truth.
3. If you must verify a cited line, `Read` that slice with `limit` set to 80 or fewer.
4. Use `Grep` for a symbol name. Do not follow it by reading the whole file.

## What the hook will block

Unbounded `Read` calls and shell commands that dump files (`cat`, path-like `type`, `Get-Content`, `head`, `tail`) are denied for Claude. A denial means you should call `file-reader`, not retry the same read.
