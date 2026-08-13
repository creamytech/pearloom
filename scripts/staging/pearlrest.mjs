// pearlrest.mjs — a high-fidelity PostgREST + Supabase-Storage emulator
// backing the Pearloom STAGING stack (scripts/staging/README.md).
// Speaks the exact grammar subset @supabase/postgrest-js and
// @supabase/storage-js emit, backed by a plain local Postgres 16.
// Unknown grammar fails LOUDLY (500 + a line in pearlrest.log) so a
// staging gap can never masquerade as product behavior.
//
// Config is env-driven with the staging defaults baked in; see the
// README for the .env.local the app needs to point at this stack.
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync, existsSync, appendFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import pkg from 'pg';
const { Pool } = pkg;

const PORT = Number(process.env.PEARLREST_PORT || 54321);
const ROOT = dirname(new URL(import.meta.url).pathname);
const DATA_DIR = process.env.PEARLREST_DATA_DIR || join(ROOT, '.data');
const STORAGE_DIR = join(DATA_DIR, 'storage');
const LOG = join(DATA_DIR, 'pearlrest.log');
mkdirSync(STORAGE_DIR, { recursive: true });
const pool = new Pool({
  host: process.env.PGHOST || '127.0.0.1',
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'pearloom',
  database: process.env.PGDATABASE || 'pearloom',
  max: 20,
});

function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')}\n`;
  try { appendFileSync(LOG, line); } catch {}
}

const RESERVED = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns', 'or', 'and']);
const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function qIdent(name) {
  if (!IDENT_RE.test(name)) throw new Unsupported(`bad identifier: ${name}`);
  return `"${name}"`;
}

// column expression allowing JSON paths: col->key->>leaf  (PostgREST grammar)
function qColExpr(raw) {
  if (IDENT_RE.test(raw)) return `"${raw}"`;
  const m = raw.match(/^([a-zA-Z_][\w]*)((?:->>?[a-zA-Z_][\w]*)+)$/);
  if (!m) throw new Unsupported(`bad identifier: ${raw}`);
  let expr = `"${m[1]}"`;
  const ops = m[2].match(/->>?[a-zA-Z_][\w]*/g);
  for (const op of ops) {
    const arrow = op.startsWith('->>') ? '->>' : '->';
    expr += `${arrow}'${op.slice(arrow.length)}'`;
  }
  return expr;
}

class Unsupported extends Error {}
class PgrstError extends Error {
  constructor(status, body) { super(body.message); this.status = status; this.body = body; }
}

// ── FK topology cache for embeds ─────────────────────────────
const fkCache = new Map();
async function fkBetween(client, a, b) {
  const key = `${a}|${b}`;
  if (fkCache.has(key)) return fkCache.get(key);
  const q = `
    SELECT tc.table_name AS child, kcu.column_name AS child_col,
           ccu.table_name AS parent, ccu.column_name AS parent_col
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
      AND ((tc.table_name = $1 AND ccu.table_name = $2) OR (tc.table_name = $2 AND ccu.table_name = $1))`;
  const { rows } = await client.query(q, [a, b]);
  fkCache.set(key, rows);
  return rows;
}

const pkCache = new Map();
async function pkCols(client, table) {
  if (pkCache.has(table)) return pkCache.get(table);
  const { rows } = await client.query(`
    SELECT a.attname FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = ('public.' || quote_ident($1))::regclass AND i.indisprimary`, [table]);
  const cols = rows.map(r => r.attname);
  pkCache.set(table, cols);
  return cols;
}

// ── select= parsing (columns + one-level embeds) ─────────────
function splitTopLevel(s, sep = ',') {
  const out = []; let depth = 0, cur = '', inQ = false;
  for (const ch of s) {
    if (ch === '"') inQ = !inQ;
    if (!inQ) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (ch === sep && depth === 0) { out.push(cur); cur = ''; continue; }
    }
    cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

function parseSelect(sel) {
  // returns { cols: [{name, alias, cast}], embeds: [{name, alias, inner, cols}] , star }
  const res = { cols: [], embeds: [], star: false };
  if (!sel || sel === '*') { res.star = true; return res; }
  for (let tok of splitTopLevel(sel)) {
    tok = tok.trim();
    if (!tok) continue;
    if (tok === '*') { res.star = true; continue; }
    const embedMatch = tok.match(/^([a-zA-Z_][\w]*)(?::([a-zA-Z_][\w]*))?(!\w+)?\((.*)\)$/s);
    if (embedMatch) {
      // alias:name!hint(cols)  — postgrest-js order is alias:relation(...)
      const [, first, second, hint, innerSel] = embedMatch;
      const alias = second ? first : first;
      const name = second ? second : first;
      res.embeds.push({ name, alias, inner: hint === '!inner', cols: innerSel || '*' });
      continue;
    }
    let cast = null, t = tok;
    const castIdx = t.indexOf('::');
    if (castIdx >= 0) { cast = t.slice(castIdx + 2); t = t.slice(0, castIdx); }
    let alias = null;
    const colonIdx = t.indexOf(':');
    if (colonIdx >= 0) { alias = t.slice(0, colonIdx); t = t.slice(colonIdx + 1); }
    res.cols.push({ name: t.trim(), alias, cast });
  }
  return res;
}

async function selectListSQL(client, table, sel, srcAlias) {
  const parsed = parseSelect(sel);
  const parts = [];
  if (parsed.star || parsed.cols.length === 0 && parsed.embeds.length === 0) parts.push(`${srcAlias}.*`);
  for (const c of parsed.cols) {
    let expr = `${srcAlias}.${qColExpr(c.name)}`;
    if (c.cast) { if (!IDENT_RE.test(c.cast)) throw new Unsupported(`cast: ${c.cast}`); expr = `(${expr})::${c.cast}`; }
    const jsonLeaf = !IDENT_RE.test(c.name) ? c.name.split(/->>?/).pop() : null;
    parts.push(c.alias ? `${expr} AS ${qIdent(c.alias)}` : (jsonLeaf ? `${expr} AS ${qIdent(jsonLeaf)}` : expr));
  }
  for (const e of parsed.embeds) {
    const fks = await fkBetween(client, table, e.name);
    if (!fks.length) throw new Unsupported(`no FK between ${table} and ${e.name}`);
    const fk = fks[0];
    const innerParsed = parseSelect(e.cols);
    if (innerParsed.embeds.length) throw new Unsupported('nested embeds >1 level');
    const innerCols = innerParsed.star
      ? 'sub.*'
      : innerParsed.cols.map(c => `sub.${qIdent(c.name)}${c.alias ? ` AS ${qIdent(c.alias)}` : ''}`).join(', ');
    if (fk.child === e.name) {
      // one-to-many: embed table holds the FK → json array
      parts.push(`(SELECT coalesce(json_agg(to_json(j)), '[]'::json) FROM (SELECT ${innerCols} FROM ${qIdent(e.name)} sub WHERE sub.${qIdent(fk.child_col)} = ${srcAlias}.${qIdent(fk.parent_col)}) j) AS ${qIdent(e.alias)}`);
    } else {
      // many-to-one: parent holds the FK → single object
      parts.push(`(SELECT to_json(j) FROM (SELECT ${innerCols} FROM ${qIdent(e.name)} sub WHERE sub.${qIdent(fk.parent_col)} = ${srcAlias}.${qIdent(fk.child_col)} LIMIT 1) j) AS ${qIdent(e.alias)}`);
    }
  }
  return parts.join(', ');
}

// ── filter parsing ───────────────────────────────────────────
function parseInList(raw) {
  // in.(a,b,"c,d") → values
  if (!raw.startsWith('(') || !raw.endsWith(')')) throw new Unsupported(`in list: ${raw}`);
  const inner = raw.slice(1, -1);
  if (inner.trim() === '') return [];
  return splitTopLevel(inner).map(v => {
    v = v.trim();
    if (v.startsWith('"') && v.endsWith('"')) return v.slice(1, -1);
    return v;
  });
}

function condSQL(colRaw, opExpr, params, srcAlias) {
  // opExpr like `eq.value` | `not.eq.value` | `is.null` | `in.(a,b)`
  let neg = false;
  let rest = opExpr;
  if (rest.startsWith('not.')) { neg = true; rest = rest.slice(4); }
  const dot = rest.indexOf('.');
  const op = dot === -1 ? rest : rest.slice(0, dot);
  const val = dot === -1 ? '' : rest.slice(dot + 1);
  const col = `${srcAlias}.${qColExpr(colRaw)}`;
  const p = (v) => { params.push(v); return `$${params.length}`; };
  let sql;
  switch (op) {
    case 'eq': sql = `${col} = ${p(val)}`; break;
    case 'neq': sql = `${col} <> ${p(val)}`; break;
    case 'gt': sql = `${col} > ${p(val)}`; break;
    case 'gte': sql = `${col} >= ${p(val)}`; break;
    case 'lt': sql = `${col} < ${p(val)}`; break;
    case 'lte': sql = `${col} <= ${p(val)}`; break;
    case 'like': sql = `${col} LIKE ${p(val.replaceAll('*', '%'))}`; break;
    case 'ilike': sql = `${col} ILIKE ${p(val.replaceAll('*', '%'))}`; break;
    case 'is':
      if (val === 'null') sql = `${col} IS NULL`;
      else if (val === 'not.null') sql = `${col} IS NOT NULL`;
      else if (val === 'true') sql = `${col} IS TRUE`;
      else if (val === 'false') sql = `${col} IS FALSE`;
      else throw new Unsupported(`is.${val}`);
      break;
    case 'in': {
      const vals = parseInList(val);
      if (!vals.length) { sql = 'false'; break; }
      sql = `${col} IN (${vals.map(v => p(v)).join(', ')})`;
      break;
    }
    case 'cs': sql = `${col} @> ${p(val)}`; break;
    case 'cd': sql = `${col} <@ ${p(val)}`; break;
    default: throw new Unsupported(`operator ${op} (${colRaw}=${opExpr})`);
  }
  return neg ? `NOT (${sql})` : sql;
}

function whereSQL(searchParams, params, srcAlias) {
  const conds = [];
  for (const [key, value] of searchParams.entries()) {
    if (RESERVED.has(key)) {
      if (key === 'or') {
        if (!value.startsWith('(') || !value.endsWith(')')) throw new Unsupported(`or=${value}`);
        const parts = splitTopLevel(value.slice(1, -1)).map(part => {
          part = part.trim();
          if (part.startsWith('and(') || part.startsWith('or(')) throw new Unsupported(`nested logic: ${part}`);
          const d = part.indexOf('.');
          if (d === -1) throw new Unsupported(`or clause: ${part}`);
          return condSQL(part.slice(0, d), part.slice(d + 1), params, srcAlias);
        });
        conds.push(`(${parts.join(' OR ')})`);
      } else if (key === 'and') {
        throw new Unsupported('and=() top-level');
      }
      continue;
    }
    conds.push(condSQL(key, value, params, srcAlias));
  }
  return conds.length ? `WHERE ${conds.join(' AND ')}` : '';
}

function orderSQL(order, srcAlias) {
  if (!order) return '';
  const parts = order.split(',').map(seg => {
    const bits = seg.split('.');
    const col = `${srcAlias}.${qColExpr(bits[0])}`;
    let dir = 'ASC', nulls = '';
    for (const b of bits.slice(1)) {
      if (b === 'asc') dir = 'ASC';
      else if (b === 'desc') dir = 'DESC';
      else if (b === 'nullsfirst') nulls = ' NULLS FIRST';
      else if (b === 'nullslast') nulls = ' NULLS LAST';
      else throw new Unsupported(`order: ${seg}`);
    }
    return `${col} ${dir}${nulls}`;
  });
  return `ORDER BY ${parts.join(', ')}`;
}

// ── request handlers ─────────────────────────────────────────
function preferSet(req) {
  return new Set((req.headers['prefer'] || '').split(',').map(s => s.trim()).filter(Boolean));
}
function wantsObject(req) {
  return (req.headers['accept'] || '').includes('application/vnd.pgrst.object+json');
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks);
}

function pgErrorToResponse(e) {
  const code = e.code || 'XX000';
  let status = 400;
  if (code === '23505' || code === '23503' || code === '23514' || code === '40001') status = 409;
  if (code === '42P01') return { status: 404, body: { code: 'PGRST205', message: `Could not find the table in the schema cache: ${e.message}`, details: e.detail ?? null, hint: e.hint ?? null } };
  return { status, body: { code, message: e.message, details: e.detail ?? null, hint: e.hint ?? null } };
}

async function handleRest(req, res, url) {
  const seg = url.pathname.split('/').filter(Boolean); // ['rest','v1', table] or ['rest','v1','rpc',fn]
  const client = await pool.connect();
  try {
    if (seg[2] === 'rpc') {
      const fn = seg[3];
      if (!IDENT_RE.test(fn)) throw new Unsupported(`rpc fn ${fn}`);
      const bodyBuf = await readBody(req);
      const args = bodyBuf.length ? JSON.parse(bodyBuf.toString()) : {};
      const { rows: procs } = await client.query(
        `SELECT p.proretset, t.typname FROM pg_proc p JOIN pg_type t ON t.oid = p.prorettype
         JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname='public' AND p.proname=$1 LIMIT 1`, [fn]);
      if (!procs.length) { sendJson(res, 404, { code: 'PGRST202', message: `Could not find the function public.${fn}`, details: null, hint: null }); return; }
      const params = [];
      const argSql = Object.entries(args).map(([k, v]) => {
        if (!IDENT_RE.test(k)) throw new Unsupported(`rpc arg ${k}`);
        params.push(typeof v === 'object' && v !== null ? JSON.stringify(v) : v);
        return `${qIdent(k)} := $${params.length}`;
      }).join(', ');
      const proc = procs[0];
      if (proc.typname === 'void') {
        await client.query(`SELECT ${qIdent(fn)}(${argSql})`, params);
        res.writeHead(204).end();
      } else if (proc.proretset) {
        const { rows } = await client.query(`SELECT coalesce(json_agg(to_json(t)), '[]'::json) AS body FROM ${qIdent(fn)}(${argSql}) t`, params);
        sendJson(res, 200, rows[0].body, true);
      } else {
        const { rows } = await client.query(`SELECT to_json(${qIdent(fn)}(${argSql})) AS body`, params);
        sendJson(res, 200, rows[0].body, true);
      }
      return;
    }

    const table = seg[2];
    if (!IDENT_RE.test(table)) throw new Unsupported(`table ${table}`);
    const prefer = preferSet(req);
    const wantCount = [...prefer].some(p => p.startsWith('count='));
    const sel = url.searchParams.get('select') || '*';

    if (req.method === 'GET' || req.method === 'HEAD') {
      const params = [];
      const where = whereSQL(url.searchParams, params, 't');
      let count = null;
      if (wantCount) {
        const { rows } = await client.query(`SELECT count(*)::int AS n FROM ${qIdent(table)} t ${where}`, params);
        count = rows[0].n;
      }
      if (req.method === 'HEAD') {
        res.writeHead(200, {
          'content-type': 'application/json; charset=utf-8',
          'content-range': `0-${count !== null && count > 0 ? count - 1 : '*'}/${count !== null ? count : '*'}`,
        }).end();
        return;
      }
      const selList = await selectListSQL(client, table, sel, 't');
      const order = orderSQL(url.searchParams.get('order'), 't');
      const limit = url.searchParams.get('limit');
      const offset = url.searchParams.get('offset');
      let tail = '';
      if (limit !== null) tail += ` LIMIT ${parseInt(limit, 10)}`;
      if (offset !== null) tail += ` OFFSET ${parseInt(offset, 10)}`;
      const q = `SELECT coalesce(json_agg(to_json(t2)), '[]'::json) AS body FROM (SELECT ${selList} FROM ${qIdent(table)} t ${where} ${order}${tail}) t2`;
      const { rows } = await client.query(q, params);
      const data = rows[0].body;
      finishRead(req, res, data, count);
      return;
    }

    if (req.method === 'POST') {
      const bodyBuf = await readBody(req);
      let payload = JSON.parse(bodyBuf.toString() || 'null');
      const isArray = Array.isArray(payload);
      const rowsIn = isArray ? payload : [payload];
      if (!rowsIn.length) { sendJson(res, 201, [], true); return; }
      let cols;
      const columnsParam = url.searchParams.get('columns');
      if (columnsParam) cols = columnsParam.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      else { const set = new Set(); rowsIn.forEach(r => Object.keys(r).forEach(k => set.add(k))); cols = [...set]; }
      cols.forEach(c => { if (!IDENT_RE.test(c)) throw new Unsupported(`insert col ${c}`); });
      const colList = cols.map(qIdent).join(', ');
      let conflict = '';
      if (prefer.has('resolution=merge-duplicates') || prefer.has('resolution=ignore-duplicates')) {
        let target = url.searchParams.get('on_conflict');
        let targetCols = target ? target.split(',').map(s => s.trim()) : await pkCols(client, table);
        targetCols.forEach(c => { if (!IDENT_RE.test(c)) throw new Unsupported(`conflict col ${c}`); });
        const targetList = targetCols.map(qIdent).join(', ');
        if (prefer.has('resolution=ignore-duplicates')) conflict = ` ON CONFLICT (${targetList}) DO NOTHING`;
        else {
          const updCols = cols.filter(c => !targetCols.includes(c));
          conflict = updCols.length
            ? ` ON CONFLICT (${targetList}) DO UPDATE SET ${updCols.map(c => `${qIdent(c)} = excluded.${qIdent(c)}`).join(', ')}`
            : ` ON CONFLICT (${targetList}) DO NOTHING`;
        }
      }
      const q = `WITH ins AS (
          INSERT INTO ${qIdent(table)} (${colList})
          SELECT ${colList} FROM json_populate_recordset(null::${qIdent(table)}, $1::json)${conflict}
          RETURNING *)
        SELECT coalesce(json_agg(to_json(t2)), '[]'::json) AS body
        FROM (SELECT ${await selectListSQL(client, table, sel, 'ins')} FROM ins) t2`;
      const { rows } = await client.query(q, [JSON.stringify(rowsIn)]);
      if (!prefer.has('return=representation')) { res.writeHead(201, { 'content-range': '*/*' }).end(); return; }
      finishRead(req, res, rows[0].body, null, 201);
      return;
    }

    if (req.method === 'PATCH') {
      const bodyBuf = await readBody(req);
      const payload = JSON.parse(bodyBuf.toString() || '{}');
      const cols = Object.keys(payload);
      if (!cols.length) { sendJson(res, 200, [], true); return; }
      cols.forEach(c => { if (!IDENT_RE.test(c)) throw new Unsupported(`update col ${c}`); });
      const params = [JSON.stringify(payload)];
      const where = whereSQL(url.searchParams, params, 't');
      const setList = cols.map(c => `${qIdent(c)} = j.${qIdent(c)}`).join(', ');
      const q = `WITH upd AS (
          UPDATE ${qIdent(table)} t SET ${setList}
          FROM json_populate_record(null::${qIdent(table)}, $1::json) j
          ${where ? where : 'WHERE true'}
          RETURNING t.*)
        SELECT coalesce(json_agg(to_json(t2)), '[]'::json) AS body
        FROM (SELECT ${await selectListSQL(client, table, sel, 'upd')} FROM upd) t2`;
      const { rows } = await client.query(q, params);
      if (!prefer.has('return=representation')) { res.writeHead(204).end(); return; }
      finishRead(req, res, rows[0].body, null, 200);
      return;
    }

    if (req.method === 'DELETE') {
      const params = [];
      const where = whereSQL(url.searchParams, params, 't');
      const q = `WITH del AS (
          DELETE FROM ${qIdent(table)} t ${where ? where : ''} RETURNING t.*)
        SELECT coalesce(json_agg(to_json(t2)), '[]'::json) AS body
        FROM (SELECT ${await selectListSQL(client, table, sel, 'del')} FROM del) t2`;
      const { rows } = await client.query(q, params);
      if (!prefer.has('return=representation')) { res.writeHead(204).end(); return; }
      finishRead(req, res, rows[0].body, null, 200);
      return;
    }

    throw new Unsupported(`method ${req.method}`);
  } finally {
    client.release();
  }
}

function finishRead(req, res, data, count, okStatus = 200) {
  const arr = Array.isArray(data) ? data : [];
  if (wantsObject(req)) {
    if (arr.length !== 1) {
      sendJson(res, 406, {
        code: 'PGRST116',
        details: `Results contain ${arr.length} rows, application/vnd.pgrst.object+json requires 1 row`,
        hint: null,
        message: 'JSON object requested, multiple (or no) rows returned',
      });
      return;
    }
    sendJson(res, okStatus, arr[0], true, rangeHeader(arr.length, count));
    return;
  }
  sendJson(res, okStatus, data, true, rangeHeader(arr.length, count));
}

function rangeHeader(len, count) {
  const upper = len > 0 ? len - 1 : '*';
  return { 'content-range': `${len > 0 ? 0 : '*'}-${upper}/${count !== null && count !== undefined ? count : '*'}` };
}

function sendJson(res, status, body, raw = false, extraHeaders = {}) {
  const s = raw && typeof body !== 'string' ? JSON.stringify(body) : (typeof body === 'string' ? body : JSON.stringify(body));
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...extraHeaders }).end(s);
}

// ── storage ──────────────────────────────────────────────────
const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml', pdf: 'application/pdf', mp3: 'audio/mpeg', mp4: 'video/mp4', webm: 'video/webm', json: 'application/json', txt: 'text/plain' };

async function handleStorage(req, res, url) {
  // /storage/v1/object/[public/]{bucket}/{...path}
  let parts = url.pathname.split('/').filter(Boolean).slice(2); // after storage/v1 → ['object', ...]
  if (parts[0] !== 'object') { sendJson(res, 404, { error: 'not found' }); return; }
  parts = parts.slice(1);
  const isPublic = parts[0] === 'public';
  if (isPublic) parts = parts.slice(1);
  const bucket = parts[0];
  const objPath = parts.slice(1).map(decodeURIComponent).join('/');
  const safe = normalize(join(STORAGE_DIR, bucket, objPath));
  if (!safe.startsWith(STORAGE_DIR)) { sendJson(res, 400, { error: 'bad path' }); return; }

  if (req.method === 'POST' || req.method === 'PUT') {
    const ct = req.headers['content-type'] || '';
    let buf = await readBody(req);
    if (ct.startsWith('multipart/form-data')) {
      // crude multipart: take the last file part's body
      const boundary = ct.split('boundary=')[1];
      const partsRaw = buf.toString('binary').split(`--${boundary}`);
      let fileBody = null;
      for (const p of partsRaw) {
        const idx = p.indexOf('\r\n\r\n');
        if (idx === -1) continue;
        const head = p.slice(0, idx);
        if (/filename=|name=""/i.test(head)) fileBody = p.slice(idx + 4).replace(/\r\n$/, '');
      }
      if (fileBody !== null) buf = Buffer.from(fileBody, 'binary');
    }
    mkdirSync(dirname(safe), { recursive: true });
    writeFileSync(safe, buf);
    log('storage upload', bucket, objPath, `${buf.length}b`);
    sendJson(res, 200, { Id: randomUUID(), Key: `${bucket}/${objPath}` });
    return;
  }
  if (req.method === 'GET' || req.method === 'HEAD') {
    if (!existsSync(safe)) { sendJson(res, 404, { error: 'Object not found' }); return; }
    const ext = safe.split('.').pop().toLowerCase();
    const data = readFileSync(safe);
    res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream', 'content-length': data.length, 'cache-control': 'public, max-age=60' });
    res.end(req.method === 'HEAD' ? undefined : data);
    return;
  }
  sendJson(res, 405, { error: 'method not allowed' });
}

// ── server ───────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  // CORS for browser-side supabase clients
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', '*');
  res.setHeader('access-control-allow-methods', 'GET,POST,PATCH,DELETE,PUT,HEAD,OPTIONS');
  res.setHeader('access-control-expose-headers', 'content-range');
  if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
  try {
    if (url.pathname.startsWith('/rest/v1/')) { await handleRest(req, res, url); }
    else if (url.pathname.startsWith('/storage/v1/')) { await handleStorage(req, res, url); }
    else if (url.pathname.startsWith('/auth/v1/')) { sendJson(res, 200, {}); }
    else if (url.pathname.startsWith('/realtime/')) { res.writeHead(404).end(); }
    else { log('404', req.method, req.url); res.writeHead(404).end('{}'); }
  } catch (e) {
    if (e instanceof Unsupported) {
      log('UNSUPPORTED', req.method, req.url, e.message);
      console.error('UNSUPPORTED', req.method, req.url, e.message);
      sendJson(res, 500, { code: 'PEARLREST', message: `PEARLREST_UNSUPPORTED: ${e.message}`, details: req.url, hint: null });
    } else if (e instanceof SyntaxError) {
      sendJson(res, 400, { code: 'PGRST102', message: e.message, details: null, hint: null });
    } else {
      const { status, body } = pgErrorToResponse(e);
      if (status >= 500 || (e.code || '').startsWith('42')) log('PGERR', req.method, req.url, body.message);
      sendJson(res, status, body);
    }
  }
});
server.on('upgrade', (req, socket) => socket.destroy());
server.listen(PORT, () => { console.log(`pearlrest listening on :${PORT}`); log('started'); });
