import { describe, it, expect, vi } from "vitest";
import { createAppSignal, computed, effect } from "./signals";

describe("Signals Foundation", () => {
  it("should create a signal with an initial value", () => {
    const count = createAppSignal(0);
    expect(count.value).toBe(0);
  });

  it("should update signal value", () => {
    const count = createAppSignal(10);
    count.value = 20;
    expect(count.value).toBe(20);
  });

  it("should compute a derived value", () => {
    const count = createAppSignal(5);
    const doubled = computed(() => count.value * 2);
    expect(doubled.value).toBe(10);

    count.value = 8;
    expect(doubled.value).toBe(16);
  });

  it("should trigger effect when signal changes", () => {
    const count = createAppSignal(0);
    const callback = vi.fn();
    
    effect(() => {
      callback(count.value);
    });

    expect(callback).toHaveBeenCalledWith(0);
    
    count.value = 1;
    expect(callback).toHaveBeenCalledWith(1);
    expect(callback).toHaveBeenCalledTimes(2);
  });
});
