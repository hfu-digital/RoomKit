# RoomKit API example

The checked-in PostgreSQL schema follows `../../PRISMA_SCHEMA.md` and generates
all delegates consumed by the built-in RoomKit Prisma adapter. `bun run build`
generates the client and compiles TypeScript without connecting to a database.

To run the API, set `DATABASE_URL` to a disposable local PostgreSQL database,
apply the schema explicitly with `bunx prisma db push`, then run
`bun run start:dev`. Generation and builds never apply migrations.

The example uses TypeScript directly (and `tsc-watch` for restarts); it does not
need Nest CLI schematics or webpack. Its adapter boundary checks the generated
delegate inventory before adapting Prisma's stricter generic method signatures.
