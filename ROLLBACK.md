# Rolling back to V1

One command, and it has been run. A rollback nobody has executed is not a
rollback — this one was tested against a scratch Worker on 4 Sep 2026 before
the cutover, and the result is at the bottom.

## The command

```sh
cd ~/table-companion && git checkout v1-final && npm run build && npx wrangler deploy
```

Both apps declare the Worker name `table-companion`, so this deploy replaces
whatever is serving there with V1. Nothing else has to be changed or undone.

## Why it works, and what it does not touch

**V1's data is untouched by anything V2 did.** Task 3 renamed V2's IndexedDB
from `table-companion` to `table-companion-v2`, so a device that ran both holds
two separate databases and V1 comes back to exactly the log it had. V2's
Durable Object storage is likewise separate: both classes are called `Room` and
both create a table called `events`, with incompatible schemas — see the note
in `wrangler.jsonc`. The rollback does not migrate anything because there is
nothing shared to migrate.

**Secrets survive**, because they belong to the Worker name rather than to the
code deployed under it. `VAPID_PRIVATE`, `VAPID_PUBLIC` and `VAPID_SUBJECT` are
V1's own pair and predate the cutover. `SITE_PASSPHRASE` was added at cutover
and V1 reads the same variable, so a rolled-back V1 keeps the gate.

**The compendium is not involved.** It is published separately to GitHub Pages
and versioned by folder, so V1 and V2 each ask for the build they were compiled
against and neither can be broken by the other's deploy.

## What you lose by rolling back

Everything in this repository's `tasks/todo.md` from Phase 4 onward: the room
and its push notifications, prep and places, NPCs, made-up items, the guidance,
the recap and the prompts. Character data written in V2 stays in V2's database
and is not visible to V1 — it is not lost, it is not there.

## Rolling forward again

```sh
cd ~/table-companion-v2 && npm run build && npx wrangler deploy
```

## The test

Run against `table-companion-rollback-test`, a scratch Worker name, so that
production was never the experiment:

```
$ git checkout v1-final && npm run build && npx wrangler deploy \
      --name table-companion-rollback-test

  precache  22 entries (1268.62 KiB)
  Uploaded table-companion-rollback-test (19.29 sec)
  Deployed table-companion-rollback-test triggers (0.75 sec)
    https://table-companion-rollback-test.idoggiebites.workers.dev

$ curl -o /dev/null -w '%{http_code}' https://table-companion-rollback-test...
  200                        <title>Table Companion</title>

$ npx wrangler delete --name table-companion-rollback-test --force
  Successfully deleted table-companion-rollback-test
```
