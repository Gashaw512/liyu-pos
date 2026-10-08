import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const migration = await readFile(
  new URL('../supabase/migrations/20261008121138_atomic_room_charge_sale.sql', import.meta.url),
  'utf8',
)
const syncRoute = await readFile(
  new URL('../src/app/api/sync/route.ts', import.meta.url),
  'utf8',
)

test('room-charge sale sync uses one service-only RPC for sale and folio posting', () => {
  assert.match(migration, /LANGUAGE plpgsql\s+SECURITY INVOKER/)
  assert.match(migration, /public\.commit_pos_sale\(p_sale, p_items, p_payments\)/)
  assert.match(migration, /public\.post_room_charge_for_sale\(/)
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.commit_pos_sale_with_room_charge[\s\S]*FROM PUBLIC, anon, authenticated/)
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.commit_pos_sale_with_room_charge[\s\S]*TO service_role/)

  assert.match(syncRoute, /roomChargePayment\s*\?\s*await supabase\.rpc\('commit_pos_sale_with_room_charge'/)
  assert.doesNotMatch(syncRoute, /rpc\('post_room_charge_for_sale'/)
})
