// Lightweight typed pub/sub event bus for cross-controller communication.
// Use EventBus.on / emit / off rather than prop-drilling or global callbacks.

type Handler<T> = (payload: T) => void;

class TypedEventBus {
  private readonly map = new Map<string, Set<Handler<unknown>>>();

  on<T>(event: string, handler: Handler<T>): () => void {
    if (!this.map.has(event)) this.map.set(event, new Set());
    this.map.get(event)!.add(handler as Handler<unknown>);
    return () => this.off(event, handler);
  }

  off<T>(event: string, handler: Handler<T>): void {
    this.map.get(event)?.delete(handler as Handler<unknown>);
  }

  emit<T>(event: string, payload: T): void {
    this.map.get(event)?.forEach((h) => {
      try { h(payload as unknown); }
      catch (err) { console.error(`[EventBus] "${event}" handler error:`, err); }
    });
  }

  once<T>(event: string, handler: Handler<T>): () => void {
    const wrapper: Handler<T> = (p) => { handler(p); this.off(event, wrapper); };
    return this.on(event, wrapper);
  }

  clear(event?: string): void {
    if (event) this.map.delete(event);
    else       this.map.clear();
  }
}

export const EventBus = new TypedEventBus();
