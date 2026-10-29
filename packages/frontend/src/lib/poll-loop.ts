/** Completion-driven polling. Superseded transports cannot schedule another tick. */
export class PollLoop {
    private controller?: AbortController;
    private timer?: ReturnType<typeof setTimeout>;
    private active = false;
    constructor(private readonly task: (signal: AbortSignal) => Promise<boolean>, private readonly delay: number) {}
    start() { this.active = true; return this.refresh(); }
    stop() { this.active = false; this.controller?.abort(); clearTimeout(this.timer); }
    async refresh() {
        clearTimeout(this.timer);
        this.controller?.abort();
        const controller = new AbortController();
        this.controller = controller;
        const terminal = await this.task(controller.signal);
        if (!controller.signal.aborted && this.active && !terminal) {
            this.timer = setTimeout(() => { void this.refresh(); }, Number.isFinite(this.delay) ? Math.max(1, this.delay) : 2000);
        }
    }
}
