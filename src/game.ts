import type {
  Game,
  InitApi,
  RenderApi,
  UpdateApi,
} from "@clockwyrks/simple-2d";
import type { DeepReadonly } from "ts-essentials";
import * as C from "./constants";
import type { RockSize } from "./constants";
export type Screen = "title" | "howto" | "playing" | "paused" | "gameover";
export type SaucerEdge = "left" | "right";
export type FieldEdge = "top" | "bottom" | "left" | "right";
export interface ShipState {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly angle: number;
  readonly thrusting: boolean;
  readonly invuln: number;
  readonly collision: boolean;
  readonly fireCooldown: number;
}
export interface BulletState {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly life: number;
}
export interface RockState {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly size: RockSize;
  readonly spin: number;
  readonly health: number;
  readonly flash: number;
}
export interface SaucerState {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly mind: boolean;
  readonly gun: boolean;
  readonly travel: boolean;
  readonly weave: 1 | -1;
  readonly fireClock: number;
  readonly weaveClock: number;
  readonly age: number;
}
export interface TorpedoState {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly heading: number;
  readonly life: number;
  readonly homing: boolean;
}
export interface ShatterState {
  readonly screen: Screen;
  readonly menuIndex: number;
  readonly score: number;
  readonly lives: number;
  readonly wave: number;
  readonly waveBanner: number;
  readonly ship: ShipState;
  readonly bullets: readonly BulletState[];
  readonly rocks: readonly RockState[];
  readonly saucer: SaucerState | null;
  readonly enemyBullets: readonly BulletState[];
  readonly torpedoes: readonly TorpedoState[];
  readonly torpedoCharge: number;
  readonly waveSpawning: boolean;
  readonly saucerSpawning: boolean;
  readonly saucerClock: number;
  readonly saucerDue: number;
  readonly nextSaucerEdge: SaucerEdge | null;
  readonly nextSaucerRow: number | null;
  readonly nextSaucerAim: number | null;
  readonly nextRockSpeed: number | null;
  readonly nextRecycleEdge: FieldEdge | null;
  readonly tickClock: number;
  readonly nextId: number;
  readonly simTime: number;
  readonly muted: boolean;
  readonly pointerDownIndex: number | null;
  readonly extraLifeFlash: number;
}
type R = DeepReadonly<ShatterState>;
type Rect = { x: number; y: number; w: number; h: number };
export interface ShatterDebugApi {
  readonly version: number;
  reset(s: R): ShatterState;
  snapshot(s: R): object;
  reconcile(s: R): ShatterState;
  menuItemRect(s: R, i: number): Rect | null;
  [key: string]: unknown;
}
export const BACKGROUND = "#050812";
const wrap = (v: number, n: number) => ((v % n) + n) % n,
  sep = (a: number, b: number, n: number) => wrap(b - a + n / 2, n) - n / 2,
  distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(sep(a.x, b.x, C.FIELD_W), sep(a.y, b.y, C.FIELD_H));
const clone = (s: R) => structuredClone(s) as ShatterState,
  finite = (...v: number[]) => {
    if (v.some((x) => !Number.isFinite(x)))
      throw Error("Shatter: expected finite number");
  };
const newShip = (): ShipState => ({
  x: C.SAFE_X,
  y: C.SAFE_Y,
  vx: 0,
  vy: 0,
  angle: C.FACE_UP,
  thrusting: false,
  invuln: 0,
  collision: true,
  fireCooldown: 0,
});
function initial(muted = false): ShatterState {
  return {
    screen: "title",
    menuIndex: 0,
    score: 0,
    lives: C.START_LIVES,
    wave: 0,
    waveBanner: 0,
    ship: newShip(),
    bullets: [],
    rocks: [],
    saucer: null,
    enemyBullets: [],
    torpedoes: [],
    torpedoCharge: 1,
    waveSpawning: true,
    saucerSpawning: true,
    saucerClock: 0,
    saucerDue: C.SAUCER_FIRST_DELAY,
    nextSaucerEdge: null,
    nextSaucerRow: null,
    nextSaucerAim: null,
    nextRockSpeed: null,
    nextRecycleEdge: null,
    tickClock: 0,
    nextId: 1,
    simTime: 0,
    muted,
    pointerDownIndex: null,
    extraLifeFlash: 0,
  };
}
const count = (s: R) =>
  s.screen === "title"
    ? 2
    : s.screen === "paused"
      ? 3
      : s.screen === "gameover"
        ? 2
        : 0;
function rect(s: R, i: number): Rect | null {
  return i >= 0 && i < count(s)
    ? { x: 470, y: (s.screen === "title" ? 430 : 390) + i * 64, w: 340, h: 50 }
    : null;
}
function snap(s: R) {
  return {
    version: C.SHATTER_DEBUG_VERSION,
    screen: s.screen,
    menuIndex: s.menuIndex,
    score: s.score,
    lives: s.lives,
    wave: s.wave,
    waveBanner: s.waveBanner,
    muted: s.muted,
    waveSpawning: s.waveSpawning,
    saucerSpawning: s.saucerSpawning,
    saucerClock: s.saucerClock,
    saucerDue: s.saucerDue,
    nextSaucerEdge: s.nextSaucerEdge,
    nextSaucerRow: s.nextSaucerRow,
    nextSaucerAim: s.nextSaucerAim,
    nextRockSpeed: s.nextRockSpeed,
    nextRecycleEdge: s.nextRecycleEdge,
    ship: { ...s.ship, speed: Math.hypot(s.ship.vx, s.ship.vy) },
    bullets: s.bullets.map((x) => ({ ...x })),
    rocks: s.rocks.map((x) => ({
      id: x.id,
      x: x.x,
      y: x.y,
      vx: x.vx,
      vy: x.vy,
      size: x.size,
      radius: C.ROCK_RADIUS[x.size],
      health: x.health,
    })),
    saucer: s.saucer ? { ...s.saucer } : null,
    enemyBullets: s.enemyBullets.map((x) => ({ ...x })),
    torpedoes: s.torpedoes.map((x) => ({ ...x })),
    torpedoCharge: s.torpedoCharge,
    torpedoReady: s.torpedoCharge === 1,
    simTime: s.simTime,
  };
}
function debug(): ShatterDebugApi {
  const f = (s: R, k: keyof ShatterState, v: unknown) => ({
      ...clone(s),
      [k]: v,
    }),
    n = (k: keyof ShatterState) => (s: R, v: number) => {
      finite(v);
      return f(s, k, v);
    },
    ship = (s: R, p: Partial<ShipState>) => ({
      ...clone(s),
      ship: { ...s.ship, ...p },
    }),
    ids = <T extends { id: number }>(
      xs: readonly T[],
      id: number,
      p: Partial<T>,
    ) => {
      if (!xs.some((x) => x.id === id)) throw Error("Shatter: missing entity");
      return xs.map((x) => (x.id === id ? { ...x, ...p } : { ...x }));
    },
    rm = <T extends { id: number }>(xs: readonly T[], id: number) => {
      if (!xs.some((x) => x.id === id)) throw Error("Shatter: missing entity");
      return xs.filter((x) => x.id !== id).map((x) => ({ ...x }));
    },
    sau = (s: R, p: Partial<SaucerState>) => {
      if (!s.saucer) throw Error("Shatter: missing saucer");
      return { ...clone(s), saucer: { ...s.saucer, ...p } };
    };
  return {
    version: 1,
    reset: (s) => initial(s.muted),
    snapshot: snap,
    reconcile: clone,
    menuItemRect: rect,
    setScreen: (s: R, v: Screen) => f(s, "screen", v),
    setMenuIndex: n("menuIndex"),
    setScore: n("score"),
    setLives: n("lives"),
    setWave: n("wave"),
    setWaveBanner: n("waveBanner"),
    setWaveSpawning: (s: R, v: boolean) => f(s, "waveSpawning", v),
    setSaucerSpawning: (s: R, v: boolean) => f(s, "saucerSpawning", v),
    setSaucerDue: n("saucerDue"),
    setShipPosition: (s: R, x: number, y: number) => {
      finite(x, y);
      return ship(s, { x, y });
    },
    setShipVelocity: (s: R, vx: number, vy: number) => {
      finite(vx, vy);
      return ship(s, { vx, vy });
    },
    setShipAngle: (s: R, angle: number) => ship(s, { angle }),
    setShipInvuln: (s: R, invuln: number) => ship(s, { invuln }),
    setFireCooldown: (s: R, fireCooldown: number) => ship(s, { fireCooldown }),
    setShipCollision: (s: R, collision: boolean) => ship(s, { collision }),
    addBullet: (s: R, x: number, y: number, vx: number, vy: number) => ({
      ...clone(s),
      bullets: [
        ...s.bullets,
        { id: s.nextId, x, y, vx, vy, life: C.BULLET_LIFE },
      ],
      nextId: s.nextId + 1,
    }),
    removeBullet: (s: R, id: number) => ({
      ...clone(s),
      bullets: rm(s.bullets, id),
    }),
    clearBullets: (s: R) => ({ ...clone(s), bullets: [] }),
    addEnemyBullet: (s: R, x: number, y: number, vx: number, vy: number) => ({
      ...clone(s),
      enemyBullets: [
        ...s.enemyBullets,
        { id: s.nextId, x, y, vx, vy, life: C.SAUCER_BULLET_LIFE },
      ],
      nextId: s.nextId + 1,
    }),
    removeEnemyBullet: (s: R, id: number) => ({
      ...clone(s),
      enemyBullets: rm(s.enemyBullets, id),
    }),
    clearEnemyBullets: (s: R) => ({ ...clone(s), enemyBullets: [] }),
    addRock: (s: R, size: RockSize, x: number, y: number) => ({
      ...clone(s),
      rocks: [
        ...s.rocks,
        {
          id: s.nextId,
          x,
          y,
          vx: 0,
          vy: 0,
          size,
          spin: 0,
          health: C.ROCK_HEALTH[size],
          flash: 0,
        },
      ],
      nextId: s.nextId + 1,
    }),
    setRockVelocity: (s: R, id: number, vx: number, vy: number) => ({
      ...clone(s),
      rocks: ids(s.rocks, id, { vx, vy }),
    }),
    setRockHealth: (s: R, id: number, health: number) => ({
      ...clone(s),
      rocks: ids(s.rocks, id, { health }),
    }),
    removeRock: (s: R, id: number) => ({ ...clone(s), rocks: rm(s.rocks, id) }),
    clearRocks: (s: R) => ({ ...clone(s), rocks: [] }),
    addSaucer: (s: R, x: number, y: number) => ({
      ...clone(s),
      saucer: {
        id: s.nextId,
        x,
        y,
        vx: C.SAUCER_SPEED,
        vy: 0,
        mind: true,
        gun: true,
        travel: true,
        weave: 1,
        fireClock: C.SAUCER_FIRE_INTERVAL,
        weaveClock: C.SAUCER_WEAVE_INTERVAL,
        age: 0,
      },
      nextId: s.nextId + 1,
    }),
    setSaucerVelocity: (s: R, vx: number, vy: number) => sau(s, { vx, vy }),
    setSaucerWeave: (s: R, weave: 1 | -1) => sau(s, { weave }),
    removeSaucer: (s: R) => ({ ...clone(s), saucer: null }),
    setSaucerMind: (s: R, mind: boolean) => sau(s, { mind }),
    setSaucerGun: (s: R, gun: boolean) => sau(s, { gun }),
    setSaucerTravel: (s: R, travel: boolean) => sau(s, { travel }),
    setNextSaucerEdge: (s: R, v: SaucerEdge) => f(s, "nextSaucerEdge", v),
    setNextSaucerRow: n("nextSaucerRow"),
    setNextSaucerAim: n("nextSaucerAim"),
    setNextRockSpeed: n("nextRockSpeed"),
    setNextRecycleEdge: (s: R, v: FieldEdge) => f(s, "nextRecycleEdge", v),
    setTorpedoCharge: n("torpedoCharge"),
    addTorpedo: (s: R, x: number, y: number, heading: number) => ({
      ...clone(s),
      torpedoes: [
        ...s.torpedoes,
        {
          id: s.nextId,
          x,
          y,
          vx: Math.cos(heading) * C.TORPEDO_SPEED,
          vy: Math.sin(heading) * C.TORPEDO_SPEED,
          heading,
          life: C.TORPEDO_LIFE,
          homing: true,
        },
      ],
      nextId: s.nextId + 1,
    }),
    setTorpedoHeading: (s: R, id: number, heading: number) => ({
      ...clone(s),
      torpedoes: ids(s.torpedoes, id, {
        heading,
        vx: Math.cos(heading) * C.TORPEDO_SPEED,
        vy: Math.sin(heading) * C.TORPEDO_SPEED,
      }),
    }),
    setTorpedoHoming: (s: R, id: number, homing: boolean) => ({
      ...clone(s),
      torpedoes: ids(s.torpedoes, id, { homing }),
    }),
    removeTorpedo: (s: R, id: number) => ({
      ...clone(s),
      torpedoes: rm(s.torpedoes, id),
    }),
    clearTorpedoes: (s: R) => ({ ...clone(s), torpedoes: [] }),
  } as ShatterDebugApi;
}
const grav = (x: number, y: number) => {
    const dx = C.STAR_X - x,
      dy = C.STAR_Y - y,
      d = Math.hypot(dx, dy) || 1,
      a = C.MU / Math.max(d, C.SOFTEN) ** 2;
    return [(dx / d) * a, (dy / d) * a];
  },
  points = (z: RockSize) =>
    z === "large"
      ? C.SCORE_LARGE
      : z === "medium"
        ? C.SCORE_MEDIUM
        : C.SCORE_SMALL;
function score(s: ShatterState, n: number) {
  const old = Math.floor(s.score / C.EXTRA_LIFE_STEP),
    v = s.score + n,
    k = Math.floor(v / C.EXTRA_LIFE_STEP) - old;
  return {
    ...s,
    score: v,
    lives: s.lives + k,
    extraLifeFlash: k ? 0.8 : s.extraLifeFlash,
  };
}
function wave(s: ShatterState) {
  let id = s.nextId;
  const rocks: RockState[] = [];
  for (let i = 0; i < C.WAVE_BASE_ROCKS + s.wave; i++) {
    let x: number, y: number;
    do {
      x = Math.random() * C.FIELD_W;
      y = Math.random() * C.FIELD_H;
    } while (
      distance({ x, y }, s.ship) < C.WAVE_MIN_SHIP_DIST ||
      distance({ x, y }, { x: C.STAR_X, y: C.STAR_Y }) < C.WAVE_MIN_STAR_DIST
    );
    const a = Math.random() * Math.PI * 2,
      v =
        (s.nextRockSpeed ?? 60 + Math.random() * 50) *
        (1 + Math.min(C.WAVE_SPEED_CAP, C.WAVE_SPEED_STEP * (s.wave - 1)));
    rocks.push({
      id: id++,
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      size: "large",
      spin: a,
      health: 3,
      flash: 0,
    });
  }
  return { ...s, rocks, nextId: id, nextRockSpeed: null, waveBanner: 0 };
}
function start(s: R) {
  return wave({ ...initial(s.muted), screen: "playing", wave: 1 });
}
function split(
  s: ShatterState,
  r: RockState,
  vx: number,
  vy: number,
  torp = false,
) {
  s = score(s, points(r.size));
  const z = C.ROCK_CHILD[r.size];
  if (!z) return s;
  const l = Math.hypot(vx, vy) || 1,
    k = torp ? C.TORPEDO_SCATTER : C.SPLIT_KICK,
    px = torp ? (vx / l) * k : (-vy / l) * k,
    py = torp ? (vy / l) * k : (vx / l) * k,
    a = {
      id: s.nextId,
      x: r.x,
      y: r.y,
      vx: r.vx + px,
      vy: r.vy + py,
      size: z,
      spin: r.spin,
      health: C.ROCK_HEALTH[z],
      flash: 0,
    };
  return {
    ...s,
    rocks: [
      ...s.rocks,
      a,
      { ...a, id: s.nextId + 1, vx: r.vx - px, vy: r.vy - py },
    ],
    nextId: s.nextId + 2,
  };
}
type Keys = {
  l: boolean;
  r: boolean;
  u: boolean;
  fire: boolean;
  torp: boolean;
};
function tick(s0: ShatterState, k: Keys) {
  let s = { ...s0, simTime: s0.simTime + C.TICK_DT };
  const sounds = new Set<string>();
  if (s.screen !== "playing") return { s, sounds };
  const a = s.ship.angle + (+k.r - +k.l) * C.SHIP_TURN * C.TICK_DT;
  let vx = s.ship.vx,
    vy = s.ship.vy;
  if (k.u) {
    vx += Math.cos(a) * C.SHIP_THRUST * C.TICK_DT;
    vy += Math.sin(a) * C.SHIP_THRUST * C.TICK_DT;
  }
  const drag = 0.5 ** (C.TICK_DT / C.SHIP_DRAG_HALFLIFE);
  vx *= drag;
  vy *= drag;
  const v = Math.hypot(vx, vy);
  if (v > C.SHIP_MAX) {
    vx *= C.SHIP_MAX / v;
    vy *= C.SHIP_MAX / v;
  }
  s = {
    ...s,
    ship: {
      ...s.ship,
      x: wrap(s.ship.x + vx * C.TICK_DT, C.FIELD_W),
      y: wrap(s.ship.y + vy * C.TICK_DT, C.FIELD_H),
      vx,
      vy,
      angle: a,
      thrusting: k.u,
      invuln: Math.max(0, s.ship.invuln - C.TICK_DT),
      fireCooldown: Math.max(0, s.ship.fireCooldown - 1),
    },
    torpedoCharge: Math.min(
      1,
      s.torpedoCharge + C.TICK_DT / C.TORPEDO_RECHARGE,
    ),
    waveBanner: Math.max(0, s.waveBanner - C.TICK_DT),
    extraLifeFlash: Math.max(0, s.extraLifeFlash - C.TICK_DT),
  };
  if (k.fire && !s.ship.fireCooldown && s.bullets.length < C.MAX_BULLETS) {
    const ux = Math.cos(a),
      uy = Math.sin(a);
    s = {
      ...s,
      bullets: [
        ...s.bullets,
        {
          id: s.nextId,
          x: s.ship.x + ux * C.SHIP_R,
          y: s.ship.y + uy * C.SHIP_R,
          vx: vx + ux * C.MUZZLE_SPEED,
          vy: vy + uy * C.MUZZLE_SPEED,
          life: C.BULLET_LIFE,
        },
      ],
      nextId: s.nextId + 1,
      ship: { ...s.ship, fireCooldown: C.FIRE_INTERVAL_TICKS },
    };
    sounds.add(C.CUES.fire);
  }
  if (k.torp && s.torpedoCharge === 1 && !s.torpedoes.length) {
    const ux = Math.cos(a),
      uy = Math.sin(a);
    s = {
      ...s,
      torpedoCharge: 0,
      torpedoes: [
        {
          id: s.nextId,
          x: s.ship.x + ux * C.SHIP_R,
          y: s.ship.y + uy * C.SHIP_R,
          vx: ux * C.TORPEDO_SPEED,
          vy: uy * C.TORPEDO_SPEED,
          heading: a,
          life: C.TORPEDO_LIFE,
          homing: true,
        },
      ],
      nextId: s.nextId + 1,
    };
  }
  const mb = (b: BulletState) => {
    const [gx, gy] = grav(b.x, b.y),
      bx = b.vx + gx * C.TICK_DT,
      by = b.vy + gy * C.TICK_DT;
    return {
      ...b,
      x: wrap(b.x + bx * C.TICK_DT, C.FIELD_W),
      y: wrap(b.y + by * C.TICK_DT, C.FIELD_H),
      vx: bx,
      vy: by,
      life: b.life - C.TICK_DT,
    };
  };
  s = {
    ...s,
    bullets: s.bullets
      .map(mb)
      .filter(
        (x) =>
          x.life > 0 &&
          distance(x, { x: C.STAR_X, y: C.STAR_Y }) > C.CORE_R + C.BULLET_R,
      ),
    enemyBullets: s.enemyBullets
      .map(mb)
      .filter(
        (x) =>
          x.life > 0 &&
          distance(x, { x: C.STAR_X, y: C.STAR_Y }) >
            C.CORE_R + C.SAUCER_BULLET_R,
      ),
    rocks: s.rocks.map((r) => {
      const [gx, gy] = grav(r.x, r.y),
        x = r.vx + gx * C.TICK_DT,
        y = r.vy + gy * C.TICK_DT;
      return {
        ...r,
        x: wrap(r.x + x * C.TICK_DT, C.FIELD_W),
        y: wrap(r.y + y * C.TICK_DT, C.FIELD_H),
        vx: x,
        vy: y,
        spin: r.spin + 0.003,
        flash: Math.max(0, r.flash - C.TICK_DT),
      };
    }),
  };
  s = {
    ...s,
    torpedoes: s.torpedoes
      .map((t) => {
        let h = t.heading,
          best = Infinity;
        if (t.homing)
          for (const q of [...s.rocks, ...(s.saucer ? [s.saucer] : [])]) {
            const dx = sep(t.x, q.x, C.FIELD_W),
              dy = sep(t.y, q.y, C.FIELD_H),
              d = Math.hypot(dx, dy),
              to = Math.atan2(dy, dx),
              dif = Math.atan2(Math.sin(to - h), Math.cos(to - h));
            if (Math.abs(dif) < C.TORPEDO_CONE && d < best) {
              best = d;
              h += Math.max(
                -C.TORPEDO_TURN * C.TICK_DT,
                Math.min(C.TORPEDO_TURN * C.TICK_DT, dif),
              );
            }
          }
        return {
          ...t,
          x: wrap(t.x + Math.cos(h) * C.TORPEDO_SPEED * C.TICK_DT, C.FIELD_W),
          y: wrap(t.y + Math.sin(h) * C.TORPEDO_SPEED * C.TICK_DT, C.FIELD_H),
          vx: Math.cos(h) * C.TORPEDO_SPEED,
          vy: Math.sin(h) * C.TORPEDO_SPEED,
          heading: h,
          life: t.life - C.TICK_DT,
        };
      })
      .filter(
        (t) =>
          t.life > 0 &&
          distance(t, { x: C.STAR_X, y: C.STAR_Y }) > C.CORE_R + C.TORPEDO_R,
      ),
  };
  // Collisions use wrapped distances at 120 Hz; displacement per tick is smaller than all targets.
  const deadB = new Set<number>();
  for (const b of s.bullets) {
    const r = s.rocks.find(
      (q) => distance(b, q) <= C.BULLET_R + C.ROCK_RADIUS[q.size],
    );
    if (r) {
      deadB.add(b.id);
      if (r.health > 1)
        s = {
          ...s,
          rocks: s.rocks.map((q) =>
            q.id === r.id
              ? { ...q, health: q.health - 1, flash: C.HIT_FLASH_TIME }
              : q,
          ),
        };
      else {
        s = { ...s, rocks: s.rocks.filter((q) => q.id !== r.id) };
        s = split(s, r, b.vx, b.vy);
        sounds.add(C.CUES.shatter);
      }
    } else if (s.saucer && distance(b, s.saucer) <= C.BULLET_R + C.SAUCER_R) {
      deadB.add(b.id);
      s = score({ ...s, saucer: null }, C.SCORE_SAUCER);
    }
  }
  s = { ...s, bullets: s.bullets.filter((b) => !deadB.has(b.id)) };
  const deadT = new Set<number>();
  for (const t of s.torpedoes) {
    const r = s.rocks.find(
      (q) => distance(t, q) <= C.TORPEDO_R + C.ROCK_RADIUS[q.size],
    );
    if (r) {
      deadT.add(t.id);
      s = { ...s, rocks: s.rocks.filter((q) => q.id !== r.id) };
      s = split(s, r, t.vx, t.vy, true);
      sounds.add(C.CUES.shatter);
    }
  }
  s = { ...s, torpedoes: s.torpedoes.filter((t) => !deadT.has(t.id)) };
  if (s.saucer) {
    let q = {
      ...s.saucer,
      age: s.saucer.age + C.TICK_DT,
      fireClock: s.saucer.fireClock - C.TICK_DT,
      weaveClock: s.saucer.weaveClock - C.TICK_DT,
    };
    if (q.mind && q.weaveClock <= 0)
      q = {
        ...q,
        vy:
          q.vy === 0
            ? q.weave * C.SAUCER_WEAVE_SPEED
            : -Math.sign(q.vy) * C.SAUCER_WEAVE_SPEED,
        weaveClock: C.SAUCER_WEAVE_INTERVAL,
      };
    if (q.travel)
      q = {
        ...q,
        x: q.x + q.vx * C.TICK_DT,
        y: wrap(q.y + q.vy * C.TICK_DT, C.FIELD_H),
      };
    if (q.gun && q.fireClock <= 0) {
      const er =
          s.nextSaucerAim ?? (Math.random() * 2 - 1) * C.SAUCER_AIM_ERROR,
        z =
          Math.atan2(
            sep(q.y, s.ship.y, C.FIELD_H),
            sep(q.x, s.ship.x, C.FIELD_W),
          ) + er;
      s = {
        ...s,
        enemyBullets: [
          ...s.enemyBullets,
          {
            id: s.nextId,
            x: wrap(q.x, C.FIELD_W),
            y: q.y,
            vx: q.vx + Math.cos(z) * C.SAUCER_BULLET_SPEED,
            vy: q.vy + Math.sin(z) * C.SAUCER_BULLET_SPEED,
            life: C.SAUCER_BULLET_LIFE,
          },
        ],
        nextId: s.nextId + 1,
        nextSaucerAim: null,
      };
      q = { ...q, fireClock: C.SAUCER_FIRE_INTERVAL };
    }
    s =
      q.age >= C.SAUCER_LIFETIME
        ? {
            ...s,
            saucer: null,
            saucerClock: 0,
            saucerDue:
              C.SAUCER_GAP_MIN +
              Math.random() * (C.SAUCER_GAP_MAX - C.SAUCER_GAP_MIN),
          }
        : { ...s, saucer: q };
  } else {
    const clock = s.saucerClock + C.TICK_DT;
    s = { ...s, saucerClock: clock };
    if (s.saucerSpawning && clock >= s.saucerDue) {
      const e = s.nextSaucerEdge ?? (Math.random() < 0.5 ? "left" : "right"),
        y =
          s.nextSaucerRow ??
          C.SAUCER_R + Math.random() * (C.FIELD_H - 2 * C.SAUCER_R);
      s = {
        ...s,
        saucer: {
          id: s.nextId,
          x: e === "left" ? 0 : C.FIELD_W,
          y,
          vx: e === "left" ? C.SAUCER_SPEED : -C.SAUCER_SPEED,
          vy: 0,
          mind: true,
          gun: true,
          travel: true,
          weave: Math.random() < 0.5 ? 1 : -1,
          fireClock: C.SAUCER_FIRE_INTERVAL,
          weaveClock: C.SAUCER_WEAVE_INTERVAL,
          age: 0,
        },
        nextId: s.nextId + 1,
        nextSaucerEdge: null,
        nextSaucerRow: null,
        saucerClock: 0,
      };
      sounds.add(C.CUES.saucer);
    }
  }
  let death =
    s.ship.collision &&
    s.ship.invuln === 0 &&
    (s.rocks.some(
      (r) => distance(s.ship, r) <= C.SHIP_R + C.ROCK_RADIUS[r.size],
    ) ||
      (s.saucer ? distance(s.ship, s.saucer) <= C.SHIP_R + C.SAUCER_R : false));
  const hit = s.enemyBullets.find(
    (b) => distance(s.ship, b) <= C.SHIP_R + C.SAUCER_BULLET_R,
  );
  if (hit && s.ship.collision && s.ship.invuln === 0) {
    death = true;
    s = { ...s, enemyBullets: s.enemyBullets.filter((b) => b.id !== hit.id) };
  }
  if (death) {
    sounds.add(C.CUES.death);
    s =
      s.lives <= 1
        ? { ...s, lives: 0, screen: "gameover", menuIndex: 0 }
        : {
            ...s,
            lives: s.lives - 1,
            ship: { ...newShip(), invuln: C.INVULN_TIME },
            torpedoCharge: 1,
          };
  }
  if (distance(s.ship, { x: C.STAR_X, y: C.STAR_Y }) <= C.CORE_R + C.SHIP_R) {
    const dx = s.ship.x - C.STAR_X,
      dy = s.ship.y - C.STAR_Y,
      d = Math.hypot(dx, dy) || 1,
      xx = dx / d,
      yy = dy / d,
      dot = s.ship.vx * xx + s.ship.vy * yy;
    s = {
      ...s,
      ship: {
        ...s.ship,
        x: C.STAR_X + xx * (C.CORE_R + C.SHIP_R),
        y: C.STAR_Y + yy * (C.CORE_R + C.SHIP_R),
        vx: dot < 0 ? s.ship.vx - dot * xx : s.ship.vx,
        vy: dot < 0 ? s.ship.vy - dot * yy : s.ship.vy,
      },
    };
  }
  if (s0.rocks.length > 0 && s.rocks.length === 0 && s.waveSpawning)
    s = { ...s, wave: s.wave + 1, waveBanner: C.WAVE_BANNER_TIME };
  if (s.waveBanner > 0 && s.waveBanner <= C.TICK_DT && s.waveSpawning)
    s = wave(s);
  if (s.extraLifeFlash > 0 && !s0.extraLifeFlash) sounds.add(C.CUES.extraLife);
  return { s, sounds };
}

function shipDraw(
  ctx: CanvasRenderingContext2D,
  s: ShipState,
  x = s.x,
  y = s.y,
  z = 1,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(s.angle);
  ctx.scale(z, z);
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(-13, -13);
  ctx.lineTo(-8, 0);
  ctx.lineTo(-13, 13);
  ctx.closePath();
  ctx.stroke();
  if (s.thrusting) {
    ctx.beginPath();
    ctx.moveTo(-10, -7);
    ctx.lineTo(-25, 0);
    ctx.lineTo(-10, 7);
    ctx.stroke();
  }
  ctx.restore();
}
function field(ctx: CanvasRenderingContext2D, s: R) {
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, C.FIELD_W, C.FIELD_H);
  ctx.fillStyle = "#8daaff";
  for (let i = 0; i < 100; i++) {
    ctx.globalAlpha = 0.12 + (i % 5) * 0.07;
    ctx.fillRect(
      (i * 197) % C.FIELD_W,
      (i * i * 31) % C.FIELD_H,
      i % 9 ? 1 : 2,
      i % 9 ? 1 : 2,
    );
  }
  ctx.globalAlpha = 1;
  const g = ctx.createRadialGradient(
    C.STAR_X,
    C.STAR_Y,
    8,
    C.STAR_X,
    C.STAR_Y,
    C.HALO_R * 1.5,
  );
  g.addColorStop(0, "#fffbd0");
  g.addColorStop(0.2, "#ffb82e");
  g.addColorStop(0.55, "rgba(255,92,24,.18)");
  g.addColorStop(1, "rgba(255,60,20,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(C.STAR_X, C.STAR_Y, C.HALO_R * 1.5, 0, 7);
  ctx.fill();
  ctx.fillStyle = "#fff7bd";
  ctx.shadowColor = "#ff9f32";
  ctx.shadowBlur = 24;
  ctx.beginPath();
  ctx.arc(C.STAR_X, C.STAR_Y, C.CORE_R, 0, 7);
  ctx.fill();
  ctx.shadowBlur = 0;
  for (const r of s.rocks) {
    const d = C.ROCK_RADIUS[r.size];
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = r.spin + (i * Math.PI) / 5,
        q = d * (0.8 + 0.15 * Math.sin(i * 4.1 + r.id)),
        x = r.x + Math.cos(a) * q,
        y = r.y + Math.sin(a) * q;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = r.flash
      ? "#fff"
      : r.health < C.ROCK_HEALTH[r.size]
        ? "#805c58"
        : "#9f7968";
    ctx.strokeStyle = "#efba8a";
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
  }
  for (const [list, color] of [
    [s.bullets, "#68edff"],
    [s.enemyBullets, "#ff4d78"],
  ] as const)
    for (const b of list) {
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.2;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(
        b.x - b.vx * C.TICK_DT * C.TRAIL_TICKS,
        b.y - b.vy * C.TICK_DT * C.TRAIL_TICKS,
      );
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, C.BULLET_R, 0, 7);
      ctx.fill();
    }
  ctx.strokeStyle = "#dcfaff";
  ctx.lineWidth = 2;
  if (
    s.lives &&
    (s.ship.invuln === 0 || Math.floor(s.ship.invuln * 10) % 2 === 0)
  )
    shipDraw(ctx, s.ship);
  if (s.saucer) {
    ctx.fillStyle = "#521845";
    ctx.strokeStyle = "#ff74ca";
    ctx.beginPath();
    ctx.ellipse(s.saucer.x, s.saucer.y, 25, 10, 0, 0, 7);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(s.saucer.x, s.saucer.y - 6, 10, Math.PI, 0);
    ctx.stroke();
  }
  for (const t of s.torpedoes) {
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(t.heading);
    ctx.fillStyle = "#fff168";
    ctx.fillRect(-7, -4, 14, 8);
    ctx.fillStyle = "#ff5739";
    ctx.beginPath();
    ctx.moveTo(-7, -3);
    ctx.lineTo(-16, 0);
    ctx.lineTo(-7, 3);
    ctx.fill();
    ctx.restore();
  }
  ctx.textBaseline = "top";
  ctx.font = "700 34px system-ui";
  ctx.fillStyle = "#eefaff";
  ctx.fillText(String(s.score).padStart(6, "0"), 32, 23);
  ctx.font = "600 12px system-ui";
  ctx.fillStyle = "#70cce9";
  ctx.fillText("SCORE", 34, 62);
  ctx.strokeStyle = "#dcfaff";
  for (let i = 0; i < Math.max(0, s.lives - 1); i++)
    shipDraw(
      ctx,
      { ...s.ship, angle: C.FACE_UP, thrusting: false },
      46 + i * 30,
      94,
      0.52,
    );
  ctx.fillStyle = s.torpedoCharge === 1 ? "#fff168" : "#536273";
  ctx.fillRect(34, 119, 22, 8);
  ctx.strokeStyle = "#60748a";
  ctx.strokeRect(34, 137, 100, 8);
  ctx.fillStyle = "#fff168";
  ctx.fillRect(35, 138, 98 * s.torpedoCharge, 6);
  ctx.fillStyle = "#8297aa";
  ctx.fillText("WARHEAD", 63, 116);
  if (s.waveBanner) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "800 54px system-ui";
    ctx.fillStyle = "#fff";
    ctx.fillText(`WAVE ${s.wave}`, C.FIELD_W / 2, C.FIELD_H / 2);
    ctx.textAlign = "start";
  }
  if (s.extraLifeFlash) {
    ctx.textAlign = "center";
    ctx.font = "800 24px system-ui";
    ctx.fillStyle = "#79f7ff";
    ctx.fillText("EXTRA SHIP", C.FIELD_W / 2, 240);
    ctx.textAlign = "start";
  }
}
function menu(
  ctx: CanvasRenderingContext2D,
  s: R,
  items: readonly string[],
  title: string,
) {
  ctx.fillStyle = "rgba(5,8,18,.72)";
  ctx.fillRect(0, 0, C.FIELD_W, C.FIELD_H);
  ctx.textAlign = "center";
  ctx.font = "800 48px system-ui";
  ctx.fillStyle = "#fff";
  ctx.fillText(title, C.FIELD_W / 2, 290);
  items.forEach((x, i) => {
    const r = rect(s, i)!;
    ctx.fillStyle =
      i === s.menuIndex ? "rgba(58,213,255,.2)" : "rgba(8,18,34,.8)";
    ctx.strokeStyle = i === s.menuIndex ? "#6ee8ff" : "#35495d";
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.font = "700 20px system-ui";
    ctx.fillStyle = i === s.menuIndex ? "#fff" : "#91a6ba";
    ctx.fillText(x, C.FIELD_W / 2, r.y + 32);
  });
  ctx.textAlign = "start";
}
function activate(s: ShatterState): ShatterState {
  if (s.screen === "title")
    return s.menuIndex ? { ...s, screen: "howto" } : start(s);
  if (s.screen === "paused")
    return s.menuIndex === 0
      ? { ...s, screen: "playing", menuIndex: 0 }
      : s.menuIndex === 1
        ? start(s)
        : initial(s.muted);
  if (s.screen === "gameover") return s.menuIndex ? initial(s.muted) : start(s);
  return s;
}
export const game: Game<ShatterState, ShatterDebugApi> = {
  initialize(api: InitApi<ShatterState>) {
    for (const a of C.ACTIONS) api.input.register(a, C.BINDINGS[a]);
    const sounds = [
      C.CUES.fire,
      C.CUES.shatter,
      C.CUES.thrust,
      C.CUES.saucer,
      C.CUES.death,
      C.CUES.extraLife,
    ];
    sounds.forEach((x, i) =>
      api.audio.define(x, {
        wave: i % 2 ? "sawtooth" : "square",
        freq: 90 + i * 130,
        freqTo: 50 + i * 100,
        durationMs: 80 + i * 70,
        gain: 0.1,
      }),
    );
    for (const [n, f] of [
      ["screen", (s: R) => s.screen],
      ["score", (s: R) => s.score],
      ["lives", (s: R) => s.lives],
      ["wave", (s: R) => s.wave],
      ["ship pos", (s: R) => `${s.ship.x.toFixed(1)}, ${s.ship.y.toFixed(1)}`],
      [
        "ship vel",
        (s: R) => `${s.ship.vx.toFixed(1)}, ${s.ship.vy.toFixed(1)}`,
      ],
      ["ship speed", (s: R) => Math.hypot(s.ship.vx, s.ship.vy).toFixed(1)],
      ["ship angle", (s: R) => s.ship.angle.toFixed(2)],
      ["ship grace", (s: R) => s.ship.invuln.toFixed(2)],
      ["bullets", (s: R) => s.bullets.length],
      ["rocks", (s: R) => s.rocks.length],
      ["saucer", (s: R) => !!s.saucer],
      ["torpedo charge", (s: R) => s.torpedoCharge.toFixed(2)],
      ["torpedoes", (s: R) => s.torpedoes.length],
      ["sim time", (s: R) => s.simTime.toFixed(2)],
    ] as [string, (s: R) => string | number | boolean][])
      api.diagnostics.register(n, f);
    return [initial(), debug()];
  },
  update(state: R, api: UpdateApi, dt: number) {
    let s = clone(state);
    if (api.input.pressed("mute")) api.audio.setMuted(!api.audio.muted());
    if (s.screen === "playing" && api.input.pressed("pause"))
      s = { ...s, screen: "paused", menuIndex: 0 };
    else if (
      s.screen === "paused" &&
      (api.input.pressed("pause") || api.input.pressed("back"))
    )
      s = { ...s, screen: "playing", menuIndex: 0 };
    else if (
      s.screen === "howto" &&
      (api.input.pressed("confirm") || api.input.pressed("back"))
    )
      s = { ...s, screen: "title" };
    else if (s.screen === "gameover" && api.input.pressed("back"))
      s = initial(s.muted);
    else if (count(s)) {
      if (api.input.pressed("up"))
        s = { ...s, menuIndex: wrap(s.menuIndex - 1, count(s)) };
      if (api.input.pressed("down"))
        s = { ...s, menuIndex: wrap(s.menuIndex + 1, count(s)) };
      if (api.input.pressed("confirm")) s = activate(s);
      else {
        let down = s.pointerDownIndex;
        for (const p of api.input.pointerSamples()) {
          const i = Array.from({ length: count(s) }, (_, j) =>
            rect(s, j)!,
          ).findIndex(
            (r) =>
              p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h,
          );
          if (i >= 0) s = { ...s, menuIndex: i };
          if (p.type === "down") down = i;
          else if (p.type === "up") {
            if (i >= 0 && i === down) s = activate({ ...s, menuIndex: i });
            down = null;
          }
        }
        s = { ...s, pointerDownIndex: down };
      }
    }
    const keys = {
      l: api.input.value("left") > 0,
      r: api.input.value("right") > 0,
      u: api.input.value("up") > 0,
      fire: api.input.value("a") > 0,
      torp: api.input.pressed("b"),
    };
    let clock = s.tickClock + Math.max(0, Math.min(0.25, dt));
    const sounds = new Set<string>();
    while (clock + 1e-12 >= C.TICK_DT) {
      const o = tick(s, keys);
      s = o.s;
      o.sounds.forEach((x) => sounds.add(x));
      clock -= C.TICK_DT;
    }
    if (s.ship.thrusting && s.screen === "playing")
      api.audio.loop(C.CUES.thrust);
    else api.audio.stop(C.CUES.thrust);
    sounds.forEach((x) => api.audio.play(x));
    return { ...s, tickClock: clock, muted: api.audio.muted() };
  },
  render(s: R, api: RenderApi) {
    const ctx = api.ctx;
    if (s.screen === "title") {
      field(ctx, s);
      ctx.fillStyle = "rgba(5,8,18,.62)";
      ctx.fillRect(0, 0, C.FIELD_W, C.FIELD_H);
      ctx.textAlign = "center";
      ctx.font = "900 112px system-ui";
      ctx.fillStyle = "#f4fbff";
      ctx.shadowColor = "#42dfff";
      ctx.shadowBlur = 24;
      ctx.fillText(C.TITLE_TEXT, C.FIELD_W / 2, 220);
      ctx.shadowBlur = 0;
      ctx.font = "600 18px system-ui";
      ctx.fillStyle = "#6ee8ff";
      ctx.fillText(C.TAGLINE_TEXT, C.FIELD_W / 2, 270);
      menu(ctx, s, C.TITLE_ITEMS, "");
    } else if (s.screen === "howto") {
      ctx.fillStyle = BACKGROUND;
      ctx.fillRect(0, 0, C.FIELD_W, C.FIELD_H);
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff";
      ctx.font = "800 46px system-ui";
      ctx.fillText("HOW TO PLAY", C.FIELD_W / 2, 90);
      ctx.font = "500 20px system-ui";
      ctx.fillStyle = "#b7ccda";
      [
        "Break every armored rock through its fragments to clear each wave.",
        "The star bends bullets and rocks — never your ship. Swallowed rocks return.",
        "Shoot down the hunting saucer. Damage shows on every armored rock.",
        "F launches one guided WARHEAD through the well; recharge: ten seconds.",
        "ARROWS / WASD  turn & thrust     SPACE  fire     F  torpedo",
        "ENTER  confirm     ESC / P  pause & back     M  mute",
        "Press ENTER or ESC to return",
      ].forEach((x, i) => ctx.fillText(x, C.FIELD_W / 2, 190 + i * 58));
    } else {
      field(ctx, s);
      if (s.screen === "paused") menu(ctx, s, C.PAUSE_ITEMS, "PAUSED");
      if (s.screen === "gameover") {
        menu(ctx, s, C.GAMEOVER_ITEMS, "GAME OVER");
        ctx.textAlign = "center";
        ctx.fillStyle = "#9db3c7";
        ctx.font = "600 18px system-ui";
        ctx.fillText(`SCORE ${s.score}  •  WAVE ${s.wave}`, C.FIELD_W / 2, 350);
      }
    }
  },
};
