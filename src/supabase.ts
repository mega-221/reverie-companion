import { createClient, type Session, type SupabaseClient, type User } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const hasRealConfig =
  Boolean(supabaseUrl && supabaseUrl.trim() && !supabaseUrl.includes('MY_SUPABASE')) &&
  Boolean(supabaseAnonKey && supabaseAnonKey.trim() && !supabaseAnonKey.includes('MY_SUPABASE'));

type TableRow = Record<string, any>;

const SESSION_KEY = 'reverie_local_session';
const TABLE_PREFIX = 'reverie_local_table_';
const memoryStore = new Map<string, string>();

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return memoryStore.get(key) ?? null;
  }
}

function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, value);
    }
  } catch {
    if (value === null) {
      memoryStore.delete(key);
    } else {
      memoryStore.set(key, value);
    }
  }
}

function readTable(table: string): TableRow[] {
  const raw = readStorage(`${TABLE_PREFIX}${table}`);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeTable(table: string, rows: TableRow[]): void {
  writeStorage(`${TABLE_PREFIX}${table}`, JSON.stringify(rows));
}

function createLocalSupabaseClient(): SupabaseClient {
  console.warn(
    '[AI Studio] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set — using local browser storage fallback.',
  );

  const authListeners = new Set<(event: string, session: Session | null) => void>();

  function getStoredSession(): Session | null {
    const raw = readStorage(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Session;
    } catch {
      return null;
    }
  }

  function makeUser(email: string): User {
    return {
      id: `local-${btoa(email).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16) || 'user'}`,
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { email },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      email,
    };
  }

  function setStoredSession(session: Session | null, event: string): void {
    writeStorage(SESSION_KEY, session ? JSON.stringify(session) : null);
    authListeners.forEach((cb) => cb(event, session));
  }

  const auth = {
    async getSession() {
      return { data: { session: getStoredSession() }, error: null };
    },
    onAuthStateChange(callback: (event: string, session: Session | null) => void) {
      authListeners.add(callback);
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              authListeners.delete(callback);
            },
          },
        },
      };
    },
    async signInWithPassword({ email }: { email: string; password?: string }) {
      const user = makeUser(email.trim().toLowerCase());
      const session = {
        access_token: 'local-access-token',
        refresh_token: 'local-refresh-token',
        expires_in: 3600,
        token_type: 'bearer',
        user,
      } as Session;
      setStoredSession(session, 'SIGNED_IN');
      return { data: { user, session }, error: null };
    },
    async signUp({ email }: { email: string; password?: string }) {
      return auth.signInWithPassword({ email });
    },
    async signOut() {
      setStoredSession(null, 'SIGNED_OUT');
      return { error: null };
    },
  };

  function from(table: string) {
    let op: 'select' | 'insert' | 'update' | 'delete' = 'select';
    let payload: any = null;
    const filters: Array<{ col: string; val: any }> = [];
    let orderCol: string | null = null;
    let ascending = true;
    let isSingle = false;

    const execute = async (): Promise<{ data: any; error: null }> => {
      const rows = readTable(table);
      const matches = (row: TableRow) => filters.every((f) => row[f.col] === f.val);

      if (op === 'insert') {
        const now = new Date().toISOString();
        const items = (Array.isArray(payload) ? payload : [payload]).map((item) => ({
          id: item.id ?? crypto.randomUUID(),
          created_at: item.created_at ?? now,
          updated_at: item.updated_at ?? now,
          ...item,
        }));
        writeTable(table, [...rows, ...items]);
        return { data: isSingle ? items[0] ?? null : items, error: null };
      }

      if (op === 'update') {
        const now = new Date().toISOString();
        const updated: TableRow[] = [];
        const nextRows = rows.map((row) => {
          if (matches(row)) {
            const next = { ...row, ...payload, updated_at: now };
            updated.push(next);
            return next;
          }
          return row;
        });
        writeTable(table, nextRows);
        return { data: isSingle ? updated[0] ?? null : updated, error: null };
      }

      if (op === 'delete') {
        const nextRows = rows.filter((row) => !matches(row));
        writeTable(table, nextRows);
        return { data: null, error: null };
      }

      let result = rows.filter(matches);
      if (orderCol) {
        const col = orderCol;
        result = [...result].sort((a, b) => {
          const av = String(a[col] ?? '');
          const bv = String(b[col] ?? '');
          return ascending ? av.localeCompare(bv) : bv.localeCompare(av);
        });
      }
      if (isSingle) {
        return { data: result[0] ?? null, error: null };
      }
      return { data: result, error: null };
    };

    const builder: any = {
      select() {
        op = 'select';
        return builder;
      },
      insert(values: any) {
        op = 'insert';
        payload = values;
        return builder;
      },
      update(values: any) {
        op = 'update';
        payload = values;
        return builder;
      },
      delete() {
        op = 'delete';
        return builder;
      },
      eq(col: string, val: any) {
        filters.push({ col, val });
        return builder;
      },
      order(col: string, options?: { ascending?: boolean }) {
        orderCol = col;
        ascending = options?.ascending ?? true;
        return builder;
      },
      single() {
        isSingle = true;
        return builder;
      },
      then(onFulfilled: any, onRejected?: any) {
        return execute().then(onFulfilled, onRejected);
      },
      catch(onRejected: any) {
        return execute().catch(onRejected);
      },
    };

    return builder;
  }

  return { auth, from } as unknown as SupabaseClient;
}

export const supabase: SupabaseClient = hasRealConfig
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : createLocalSupabaseClient();