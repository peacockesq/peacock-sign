import assert from 'node:assert/strict';
import axios from 'axios';
import formData from 'form-data';
import protobuf from 'protobufjs';
import { matchPath } from 'react-router';
import { WebSocket } from 'ws';
import { test } from 'vitest';

test('OpenSign production dependencies load and preserve core APIs', () => {
  assert.equal(typeof axios.create, 'function');
  assert.equal(typeof formData, 'function');
  assert.equal(typeof protobuf.Root.fromJSON, 'function');
  assert.equal(
    matchPath('/documents/:id', '/documents/security-smoke').params.id,
    'security-smoke'
  );
  assert.equal(typeof WebSocket, 'function');
});
