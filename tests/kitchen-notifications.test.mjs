import test from 'node:test'
import assert from 'node:assert/strict'
import { getNewTicketIds } from '../src/lib/kitchen/newTicketNotifications.ts'

test('initial queue load does not sound old tickets', () => {
  assert.deepEqual(getNewTicketIds(null, ['old-ticket']), [])
})

test('repeated queue refresh does not repeat an existing ticket alert', () => {
  assert.deepEqual(getNewTicketIds(new Set(['ticket-1']), ['ticket-1']), [])
})

test('new revision tickets alert once even if a payload repeats an ID', () => {
  assert.deepEqual(getNewTicketIds(new Set(['ticket-1']), ['ticket-1', 'ticket-2', 'ticket-2']), ['ticket-2'])
})
