/**
 * A minimal in-memory stand-in for the subset of the supabase-js query
 * builder this app actually uses (from/select/insert/update/delete/eq/
 * order/limit/single/maybeSingle). It exists so the team-isolation tests
 * can exercise real filtering behavior — does this query's .eq("team_id", …)
 * actually exclude another team's rows? — without a live Postgres instance.
 *
 * It deliberately does NOT parse PostgREST embed syntax (e.g. "teams(id,
 * name)"); tests seed rows with the nested shape already in place instead.
 */
export type Row = Record<string, unknown>;

class FakeQueryBuilder implements PromiseLike<{
  data: unknown;
  error: { message: string } | null;
}> {
  private filters: { column: string; op: "eq" | "neq"; value: unknown }[] = [];
  private mode: "select" | "insert" | "update" | "delete" = "select";
  private payload: Row | Row[] | null = null;
  private limitN: number | null = null;

  constructor(private table: Row[]) {}

  select() {
    return this;
  }

  insert(payload: Row | Row[]) {
    this.mode = "insert";
    this.payload = payload;
    return this;
  }

  update(payload: Row) {
    this.mode = "update";
    this.payload = payload;
    return this;
  }

  delete() {
    this.mode = "delete";
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, op: "eq", value });
    return this;
  }

  neq(column: string, value: unknown) {
    this.filters.push({ column, op: "neq", value });
    return this;
  }

  is(column: string, value: unknown) {
    this.filters.push({ column, op: "eq", value });
    return this;
  }

  order() {
    return this;
  }

  limit(n: number) {
    this.limitN = n;
    return this;
  }

  private matches(row: Row) {
    return this.filters.every(({ column, op, value }) =>
      op === "eq" ? row[column] === value : row[column] !== value,
    );
  }

  private run(): { data: unknown; error: { message: string } | null } {
    if (this.mode === "select") {
      let result = this.table.filter((row) => this.matches(row));
      if (this.limitN != null) result = result.slice(0, this.limitN);
      return { data: result, error: null };
    }
    if (this.mode === "insert") {
      const rowsToInsert = (Array.isArray(this.payload) ? this.payload : [this.payload]) as Row[];
      const inserted = rowsToInsert.map((row) => ({
        id: row["id"] ?? crypto.randomUUID(),
        ...row,
      }));
      this.table.push(...inserted);
      return { data: inserted, error: null };
    }
    if (this.mode === "update") {
      const matched = this.table.filter((row) => this.matches(row));
      matched.forEach((row) => Object.assign(row, this.payload));
      return { data: matched, error: null };
    }
    // delete
    const matched = this.table.filter((row) => this.matches(row));
    const remaining = this.table.filter((row) => !this.matches(row));
    this.table.length = 0;
    this.table.push(...remaining);
    return { data: matched, error: null };
  }

  maybeSingle() {
    const { data, error } = this.run();
    const rows = data as Row[];
    return Promise.resolve({ data: rows[0] ?? null, error });
  }

  single() {
    const { data, error } = this.run();
    const rows = data as Row[];
    if (!rows[0]) return Promise.resolve({ data: null, error: { message: "no rows" } });
    return Promise.resolve({ data: rows[0], error });
  }

  // Makes `await builder` work when the caller never calls .single()/.maybeSingle()
  // (the common "give me the whole filtered array" case).
  then<T1, T2 = never>(
    onFulfilled?: (value: {
      data: unknown;
      error: { message: string } | null;
    }) => T1 | PromiseLike<T1>,
    onRejected?: (reason: unknown) => T2 | PromiseLike<T2>,
  ) {
    return Promise.resolve(this.run()).then(onFulfilled, onRejected);
  }
}

export type FakeTables = Record<string, Row[]>;

/**
 * Typed accessor for a table's row array. Exists purely so test files don't
 * fight `noUncheckedIndexedAccess` every time they seed or push fixture rows.
 */
export function table(tables: FakeTables, name: string): Row[] {
  const existing = tables[name];
  if (existing) return existing;
  const created: Row[] = [];
  tables[name] = created;
  return created;
}

export function createFakeSupabaseClient(tables: FakeTables) {
  return {
    from(tableName: string) {
      if (!tables[tableName]) tables[tableName] = [];
      return new FakeQueryBuilder(tables[tableName]);
    },
  };
}
