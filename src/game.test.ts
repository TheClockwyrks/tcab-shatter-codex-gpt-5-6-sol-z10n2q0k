import { describe, expect, it } from "vitest";
import type { InitApi, UpdateApi } from "@clockwyrks/simple-2d";
import { game, type ShatterDebugApi, type ShatterState } from "./game";

function setup() {
  let muted = false;
  const init = {
    input: { register() {}, layout: () => null },
    audio: { define() {}, load: async () => {} },
    assets: {},
    diagnostics: { register() {} },
    events: {},
    viewport: () => ({}),
  } as unknown as InitApi<ShatterState>;
  const [state, debug] = game.initialize(init) as [
    ShatterState,
    ShatterDebugApi,
  ];
  const update = {
    input: {
      value: () => 0,
      pressed: () => false,
      pointer: () => ({
        x: 0,
        y: 0,
        down: false,
        device: "mouse",
        buttons: [],
      }),
      pointerPressed: () => false,
      pointerReleased: () => false,
      pointerSamples: () => [],
      pointerContacts: () => [],
      wheel: () => ({ x: 0, y: 0 }),
    },
    audio: {
      play() {},
      loop() {},
      stop() {},
      looping: () => false,
      setMuted: (v: boolean) => {
        muted = v;
      },
      muted: () => muted,
    },
    frame: () => ({}),
    viewport: () => ({}),
  } as unknown as UpdateApi;
  return { state, debug, update };
}

describe("Shatter", () => {
  it("initializes its title state", () => {
    const { state, debug } = setup();
    expect(debug.snapshot(state)).toMatchObject({
      screen: "title",
      lives: 3,
      wave: 0,
      torpedoReady: true,
    });
  });
  it("advances only whole fixed ticks", () => {
    const { state, debug, update } = setup();
    const playing = (
      debug.setScreen as (s: ShatterState, v: string) => ShatterState
    )(state, "playing");
    const next = game.update(playing, update, (1 / 120) * 1.5);
    expect(next.simTime).toBeCloseTo(1 / 120);
    expect(next.tickClock).toBeCloseTo(1 / 240);
  });
  it("poses state immutably and derives speed", () => {
    const { state, debug } = setup();
    const moved = (
      debug.setShipVelocity as (
        s: ShatterState,
        x: number,
        y: number,
      ) => ShatterState
    )(state, 3, 4);
    expect(
      (debug.snapshot(moved) as { ship: { speed: number } }).ship.speed,
    ).toBe(5);
    expect(state.ship.vx).toBe(0);
  });
});
