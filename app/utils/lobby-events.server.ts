import { EventEmitter } from 'node:events';

let emitter: EventEmitter;

declare global {
  var __emitter: EventEmitter | undefined;
}

if (process.env.NODE_ENV === "production") {
  emitter = new EventEmitter();
} else {
  emitter = global.__emitter ??= new EventEmitter();
}

export { emitter };
