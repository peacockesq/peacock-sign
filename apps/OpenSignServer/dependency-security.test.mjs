import assert from 'node:assert/strict';
import grpc from '@grpc/grpc-js';
import axios from 'axios';
import formData from 'form-data';
import forge from 'node-forge';
import nodemailer from 'nodemailer';
import Parse from 'parse';
import { ParseServer } from 'parse-server';
import protobuf from 'protobufjs';
import { fetch } from 'undici';
import websocketDriver from 'websocket-driver';
import { WebSocket } from 'ws';

assert.equal(typeof ParseServer, 'function');
assert.equal(typeof Parse.initialize, 'function');
assert.equal(typeof axios.create, 'function');
assert.equal(typeof formData, 'function');
assert.equal(typeof forge.pki.createCertificate, 'function');
assert.equal(typeof grpc.Server, 'function');
assert.equal(typeof nodemailer.createTransport, 'function');
assert.equal(typeof protobuf.Root.fromJSON, 'function');
assert.equal(typeof fetch, 'function');
assert.equal(typeof websocketDriver.client, 'function');
assert.equal(typeof WebSocket, 'function');

const { app, config } = await import('./index.js');
assert.equal(typeof app, 'function');
assert.equal(config.serverURL, 'http://localhost:8080/app');

console.log('OpenSignServer production dependency and application import smoke test passed');
