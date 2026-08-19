declare module "better-sqlite3-session-store" {
  import session from "express-session";
  import type Database from "better-sqlite3";
  interface Options {
    client: Database.Database;
    expired?: { clear?: boolean; intervalMs?: number };
  }
  export default function factory(s: typeof session): new (options: Options) => session.Store;
}
