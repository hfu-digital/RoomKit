import { test, expect } from 'bun:test';
import { PollLoop } from '../src/lib/poll-loop';
import { ApiClient } from '../src/lib/api-client';
const tick = () => new Promise(resolve => setTimeout(resolve, 10));
test('slow polls do not overlap and stopping aborts transport without scheduling again', async () => {
    let calls = 0, finish!: (terminal: boolean) => void, signal!: AbortSignal;
    const loop = new PollLoop(s => { calls++; signal = s; return new Promise(r => { finish = r; }); }, 1);
    const pending = loop.start();
    await tick(); expect(calls).toBe(1);
    loop.stop(); expect(signal.aborted).toBe(true);
    finish(false); await pending; await tick(); expect(calls).toBe(1);
});
test('terminal completion stops polling and manual refresh supersedes stale work', async () => {
    const signals: AbortSignal[] = [], finishes: ((value: boolean) => void)[] = [];
    const loop = new PollLoop(s => { signals.push(s); return new Promise(r => finishes.push(r)); }, 1);
    const old = loop.start(), current = loop.refresh();
    expect(signals[0]!.aborted).toBe(true);
    finishes[0]!(false); finishes[1]!(true);
    await Promise.all([old, current]); await tick(); expect(signals).toHaveLength(2);
    loop.stop();
});
test('API client forwards request cancellation', async () => {
    const previous = globalThis.fetch;
    let seen: AbortSignal | null | undefined;
    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => { seen = init?.signal; return new Response('{}'); }) as typeof fetch;
    try {
        const controller = new AbortController();
        await new ApiClient('https://example.test').get('/bulk', undefined, controller.signal);
        expect(seen).toBe(controller.signal);
    } finally { globalThis.fetch = previous; }
});
