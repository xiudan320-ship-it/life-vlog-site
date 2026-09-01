export const MOOD_JAR_GEOMETRY = Object.freeze({
  width: 360,
  height: 480,
  mouthX: 180,
  mouthY: 42,
  mouthSpawnY: 78,
  wallInset: 8,
  neckTopY: 76,
  shoulderEndY: 116,
  bodyWideStartY: 180,
  bodyWideEndY: 404,
  bodyBottom: 438,
  bodyLeft: 25,
  floorCenterX: 180,
  floorRadiusX: 126,
  floorEdgeY: 420,
  floorCenterY: 434,
});

export const MOOD_JAR_PHYSICS_DEFAULTS = Object.freeze({
  fixedStepSeconds: 1 / 60,
  gravity: 210,
  maxFallSpeed: 220,
  airDamping: 0.995,
  restitution: 0.14,
  friction: 0.86,
  constraintIterations: 4,
  sleepSpeed: 0.82,
  sleepAngularSpeed: 0.035,
  sleepAfterSeconds: 0.36,
  maxFrameSteps: 4,
  maxSimulationMs: 8000,
});

const MAX_PARTICLES = 62;
const EPSILON = 0.0001;
const CONTACT_LIMIT = 4096;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function smoothStep(value) {
  const normalized = clamp(value, 0, 1);
  return normalized * normalized * (3 - 2 * normalized);
}

function lerp(left, right, amount) {
  return left + (right - left) * amount;
}

function hashString(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hashUnit(seed, salt = "") {
  return hashString(`${seed}:${salt}`) / 4294967296;
}

function signedHash(seed, salt = "") {
  return hashUnit(seed, salt) * 2 - 1;
}

function normalizeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeParticleId(item, index) {
  return String(item?.entryId || item?.id || `mood-${index + 1}`).trim() || `mood-${index + 1}`;
}

function normalizeItems(items) {
  const seen = new Set();
  const normalized = [];
  for (const [index, item] of (Array.isArray(items) ? items : []).entries()) {
    const id = normalizeParticleId(item, index);
    if (seen.has(id)) continue;
    seen.add(id);
    normalized.push({ ...item, id });
    if (normalized.length >= MAX_PARTICLES) break;
  }
  return normalized;
}

export function getJarInnerBounds(y) {
  const safeY = clamp(normalizeNumber(y, MOOD_JAR_GEOMETRY.mouthSpawnY), 70, MOOD_JAR_GEOMETRY.bodyBottom);
  const inset = MOOD_JAR_GEOMETRY.wallInset;
  let left;
  if (safeY <= MOOD_JAR_GEOMETRY.neckTopY) {
    left = 56 + inset;
  } else if (safeY <= MOOD_JAR_GEOMETRY.shoulderEndY) {
    left = lerp(56, 43, smoothStep((safeY - MOOD_JAR_GEOMETRY.neckTopY) / (MOOD_JAR_GEOMETRY.shoulderEndY - MOOD_JAR_GEOMETRY.neckTopY))) + inset;
  } else if (safeY <= MOOD_JAR_GEOMETRY.bodyWideStartY) {
    left = lerp(43, MOOD_JAR_GEOMETRY.bodyLeft, smoothStep((safeY - MOOD_JAR_GEOMETRY.shoulderEndY) / (MOOD_JAR_GEOMETRY.bodyWideStartY - MOOD_JAR_GEOMETRY.shoulderEndY))) + inset;
  } else if (safeY <= MOOD_JAR_GEOMETRY.bodyWideEndY) {
    left = MOOD_JAR_GEOMETRY.bodyLeft + inset;
  } else {
    left = lerp(MOOD_JAR_GEOMETRY.bodyLeft + inset, 50, smoothStep((safeY - MOOD_JAR_GEOMETRY.bodyWideEndY) / (MOOD_JAR_GEOMETRY.bodyBottom - MOOD_JAR_GEOMETRY.bodyWideEndY)));
  }
  return Object.freeze({ left, right: MOOD_JAR_GEOMETRY.width - left });
}

export function getJarFloorY(x) {
  const normalizedX = clamp((normalizeNumber(x, MOOD_JAR_GEOMETRY.floorCenterX) - MOOD_JAR_GEOMETRY.floorCenterX) / MOOD_JAR_GEOMETRY.floorRadiusX, -1, 1);
  const curve = Math.sqrt(Math.max(0, 1 - normalizedX * normalizedX));
  return MOOD_JAR_GEOMETRY.floorEdgeY + (MOOD_JAR_GEOMETRY.floorCenterY - MOOD_JAR_GEOMETRY.floorEdgeY) * curve;
}

export function getJarMouthSpawn(seed = "") {
  return Object.freeze({
    x: MOOD_JAR_GEOMETRY.mouthX + signedHash(seed, "mouth-x") * 30,
    y: MOOD_JAR_GEOMETRY.mouthSpawnY + signedHash(seed, "mouth-y") * 3,
  });
}

export function getMoodJarParticleRadius(count) {
  const safeCount = clamp(Math.floor(normalizeNumber(count, 0)), 0, MAX_PARTICLES);
  if (safeCount <= 12) return 17;
  if (safeCount <= 31) return 15;
  return 13;
}

function spawnRule(count) {
  if (count <= 12) return Object.freeze({ batchSize: 1, interval: 300, intervalJitter: 30, intraBatch: 0 });
  if (count <= 31) return Object.freeze({ batchSize: 2, interval: 275, intervalJitter: 15, intraBatch: 74 });
  return Object.freeze({ batchSize: 4, interval: 300, intervalJitter: 15, intraBatch: 86 });
}

export function buildMoodJarSpawnPlan(items = [], { seed = "" } = {}) {
  const normalized = normalizeItems(items);
  const count = normalized.length;
  if (!count) {
    return Object.freeze({
      itemCount: 0,
      batchSize: 0,
      entries: Object.freeze([]),
      settleAtMs: 0,
      totalDurationMs: 0,
    });
  }
  const rule = spawnRule(count);
  const firstDelay = 240 + Math.round(signedHash(seed || "mood-jar", "first-delay") * 20);
  const batchStarts = [firstDelay];
  const batchCount = Math.ceil(count / rule.batchSize);
  for (let batchIndex = 1; batchIndex < batchCount; batchIndex += 1) {
    const previous = batchStarts[batchIndex - 1];
    const interval = rule.interval + Math.round(signedHash(`${seed}:${batchIndex}`, "batch-gap") * rule.intervalJitter);
    batchStarts.push(previous + interval);
  }
  const entries = normalized.map((item, index) => {
    const batchIndex = Math.floor(index / rule.batchSize);
    const indexInBatch = index % rule.batchSize;
    const intraBatch = indexInBatch
      ? rule.intraBatch + Math.round(signedHash(`${seed}:${item.id}`, "intra-gap") * 12)
      : 0;
    return Object.freeze({
      id: item.id,
      index,
      batchIndex,
      spawnAtMs: batchStarts[batchIndex] + intraBatch,
    });
  });
  const lastSpawn = entries.at(-1).spawnAtMs;
  const settleDuration = count <= 12 ? 2150 : count <= 31 ? 2100 : 2150;
  const settleAtMs = Math.min(MOOD_JAR_PHYSICS_DEFAULTS.maxSimulationMs, lastSpawn + settleDuration);
  return Object.freeze({
    itemCount: count,
    batchSize: rule.batchSize,
    firstDelay,
    entries: Object.freeze(entries),
    settleAtMs,
    totalDurationMs: settleAtMs,
  });
}

function mergeConfig(config = {}) {
  const merged = { ...MOOD_JAR_PHYSICS_DEFAULTS, ...(config || {}) };
  for (const key of Object.keys(MOOD_JAR_PHYSICS_DEFAULTS)) {
    if (!Number.isFinite(Number(merged[key]))) merged[key] = MOOD_JAR_PHYSICS_DEFAULTS[key];
  }
  merged.fixedStepSeconds = clamp(Number(merged.fixedStepSeconds), 1 / 120, 1 / 30);
  merged.maxFrameSteps = clamp(Math.floor(Number(merged.maxFrameSteps)), 1, 4);
  merged.constraintIterations = Math.max(4, Math.floor(Number(merged.constraintIterations)));
  return Object.freeze(merged);
}

function addContact(contacts, event) {
  if (contacts.length < CONTACT_LIMIT) contacts.push(Object.freeze(event));
}

function vectorLength(x, y) {
  return Math.hypot(x, y);
}

function wake(particle) {
  particle.sleeping = false;
  particle.sleepTime = 0;
}

function clampParticleToWall(particle, elapsedMs, config, contacts, { wakeParticle = true, recordContact = true } = {}) {
  const bounds = getJarInnerBounds(particle.y);
  if (particle.x - particle.radius < bounds.left) {
    const before = { x: particle.x, y: particle.y, vx: particle.vx, vy: particle.vy, rotation: particle.rotation };
    particle.x = bounds.left + particle.radius;
    if (particle.vx < 0) particle.vx = -particle.vx * config.restitution;
    particle.angularVelocity += particle.vy * 0.002;
    if (wakeParticle) wake(particle);
    if (recordContact) {
      addContact(contacts, {
        type: "wall-left",
        particleId: particle.id,
        timeMs: elapsedMs,
        trajectoryChange: Math.abs(particle.vx - before.vx) + Math.abs(particle.x - before.x),
      });
    }
  } else if (particle.x + particle.radius > bounds.right) {
    const before = { x: particle.x, y: particle.y, vx: particle.vx, vy: particle.vy, rotation: particle.rotation };
    particle.x = bounds.right - particle.radius;
    if (particle.vx > 0) particle.vx = -particle.vx * config.restitution;
    particle.angularVelocity += particle.vy * 0.002;
    if (wakeParticle) wake(particle);
    if (recordContact) {
      addContact(contacts, {
        type: "wall-right",
        particleId: particle.id,
        timeMs: elapsedMs,
        trajectoryChange: Math.abs(particle.vx - before.vx) + Math.abs(particle.x - before.x),
      });
    }
  }

  const floorY = getJarFloorY(particle.x);
  if (particle.y + particle.radius > floorY) {
    const before = { x: particle.x, y: particle.y, vx: particle.vx, vy: particle.vy, rotation: particle.rotation };
    particle.y = floorY - particle.radius;
    if (particle.vy > 0) particle.vy = -particle.vy * config.restitution;
    particle.vx *= config.friction;
    particle.angularVelocity += particle.vx * 0.012;
    if (wakeParticle) wake(particle);
    if (recordContact) {
      addContact(contacts, {
        type: "floor",
        particleId: particle.id,
        timeMs: elapsedMs,
        trajectoryChange: Math.abs(particle.vy - before.vy) + Math.abs(particle.x - before.x),
      });
    }
  }
}

function separateParticlePair(left, right) {
  const deltaX = right.x - left.x;
  const deltaY = right.y - left.y;
  const minimumDistance = left.radius + right.radius;
  const distance = vectorLength(deltaX, deltaY);
  if (distance >= minimumDistance - EPSILON) return false;

  const fallbackAngle = (hashUnit(`${left.id}:${right.id}`, "collision-angle") * Math.PI * 2) - Math.PI;
  const normalX = distance > EPSILON ? deltaX / distance : Math.cos(fallbackAngle);
  const normalY = distance > EPSILON ? deltaY / distance : Math.sin(fallbackAngle);
  const overlap = minimumDistance - Math.max(distance, EPSILON);
  left.x -= normalX * overlap * 0.5;
  left.y -= normalY * overlap * 0.5;
  right.x += normalX * overlap * 0.5;
  right.y += normalY * overlap * 0.5;
  return true;
}

function resolveParticlePair(left, right, elapsedMs, config, contacts) {
  const deltaX = right.x - left.x;
  const deltaY = right.y - left.y;
  const minimumDistance = left.radius + right.radius;
  const distance = vectorLength(deltaX, deltaY);
  if (distance >= minimumDistance - EPSILON) return false;

  const fallbackAngle = (hashUnit(`${left.id}:${right.id}`, "collision-angle") * Math.PI * 2) - Math.PI;
  const normalX = distance > EPSILON ? deltaX / distance : Math.cos(fallbackAngle);
  const normalY = distance > EPSILON ? deltaY / distance : Math.sin(fallbackAngle);
  const overlap = minimumDistance - Math.max(distance, EPSILON);
  const before = {
    leftX: left.x,
    leftY: left.y,
    rightX: right.x,
    rightY: right.y,
    leftVx: left.vx,
    leftVy: left.vy,
    rightVx: right.vx,
    rightVy: right.vy,
    leftRotation: left.rotation,
    rightRotation: right.rotation,
  };
  left.x -= normalX * overlap * 0.5;
  left.y -= normalY * overlap * 0.5;
  right.x += normalX * overlap * 0.5;
  right.y += normalY * overlap * 0.5;

  const relativeVx = right.vx - left.vx;
  const relativeVy = right.vy - left.vy;
  const normalVelocity = relativeVx * normalX + relativeVy * normalY;
  if (normalVelocity < 0) {
    const impulse = -(1 + config.restitution) * normalVelocity * 0.5;
    left.vx -= normalX * impulse;
    left.vy -= normalY * impulse;
    right.vx += normalX * impulse;
    right.vy += normalY * impulse;
    const tangentX = -normalY;
    const tangentY = normalX;
    const tangentVelocity = relativeVx * tangentX + relativeVy * tangentY;
    const tangentImpulse = clamp(-tangentVelocity * 0.5, -Math.abs(impulse) * (1 - config.friction), Math.abs(impulse) * (1 - config.friction));
    left.vx -= tangentX * tangentImpulse;
    left.vy -= tangentY * tangentImpulse;
    right.vx += tangentX * tangentImpulse;
    right.vy += tangentY * tangentImpulse;
    left.angularVelocity -= tangentImpulse * 0.018;
    right.angularVelocity += tangentImpulse * 0.018;
  }
  wake(left);
  wake(right);
  left.contactCount += 1;
  right.contactCount += 1;
  const trajectoryChange = Math.abs(left.vx - before.leftVx)
    + Math.abs(right.vx - before.rightVx)
    + Math.abs(left.rotation - before.leftRotation)
    + Math.abs(right.rotation - before.rightRotation)
    + Math.abs(left.x - before.leftX)
    + Math.abs(right.x - before.rightX);
  addContact(contacts, {
    type: "particle",
    aId: left.id,
    bId: right.id,
    timeMs: elapsedMs,
    overlap,
    trajectoryChange,
    before,
    after: {
      leftX: left.x,
      rightX: right.x,
      leftVx: left.vx,
      rightVx: right.vx,
      leftRotation: left.rotation,
      rightRotation: right.rotation,
    },
  });
  return true;
}

function createParticle(item, index, count, plan, seed) {
  const itemSeed = `${seed}:${item.id}:${item.userId || item.user_id || ""}:${item.mood || ""}`;
  const spawn = getJarMouthSpawn(itemSeed);
  const visualScale = clamp(normalizeNumber(item.scale, 1), 0.9, 1.05);
  return {
    id: item.id,
    radius: getMoodJarParticleRadius(count) * visualScale,
    x: spawn.x,
    y: spawn.y,
    vx: signedHash(itemSeed, "initial-vx") * 9,
    vy: 0,
    rotation: normalizeNumber(item.rotate, signedHash(itemSeed, "initial-rotation") * 8),
    angularVelocity: signedHash(itemSeed, "initial-angular") * 0.45,
    spawnAtMs: plan.entries[index]?.spawnAtMs || 0,
    spawned: false,
    sleeping: false,
    sleepTime: 0,
    contactCount: 0,
    firstContactAtMs: null,
  };
}

function finiteParticle(particle) {
  return [particle.x, particle.y, particle.vx, particle.vy, particle.rotation, particle.angularVelocity].every(Number.isFinite);
}

function snapshotParticle(particle) {
  return Object.freeze({
    id: particle.id,
    x: particle.x,
    y: particle.y,
    vx: particle.vx,
    vy: particle.vy,
    rotation: particle.rotation,
    angularVelocity: particle.angularVelocity,
    radius: particle.radius,
    spawnAtMs: particle.spawnAtMs,
    spawned: particle.spawned,
    visible: particle.spawned,
    sleeping: particle.sleeping,
    contactCount: particle.contactCount,
    firstContactAtMs: particle.firstContactAtMs,
  });
}

export function createMoodJarSimulation(items = [], { seed = "", config: configInput = {} } = {}) {
  const normalizedItems = normalizeItems(items);
  const config = mergeConfig(configInput);
  const plan = buildMoodJarSpawnPlan(normalizedItems, { seed });
  const particles = normalizedItems.map((item, index) => createParticle(item, index, normalizedItems.length, plan, seed));
  const contacts = [];
  const metrics = {
    fixedSteps: 0,
    maxStepsPerAdvance: 0,
    maxFrameWorkMs: 0,
    particlePairChecks: 0,
  };
  let elapsedMs = 0;
  let accumulatorMs = 0;
  let settled = !particles.length;

  function spawnDue() {
    for (const particle of particles) {
      if (particle.spawned || particle.spawnAtMs > elapsedMs + EPSILON) continue;
      particle.spawned = true;
      particle.sleeping = false;
      particle.sleepTime = 0;
    }
  }

  function allSleeping() {
    return particles.every((particle) => particle.spawned && particle.sleeping);
  }

  function relaxBoundaries() {
    for (let iteration = 0; iteration < config.constraintIterations; iteration += 1) {
      for (let leftIndex = 0; leftIndex < particles.length; leftIndex += 1) {
        const left = particles[leftIndex];
        if (!left.spawned) continue;
        for (let rightIndex = leftIndex + 1; rightIndex < particles.length; rightIndex += 1) {
          const right = particles[rightIndex];
          if (!right.spawned) continue;
          metrics.particlePairChecks += 1;
          resolveParticlePair(left, right, elapsedMs, config, contacts);
        }
      }
      for (const particle of particles) if (particle.spawned) clampParticleToWall(particle, elapsedMs, config, contacts);
    }
  }

  function relaxSettledGeometry() {
    const iterations = normalizedItems.length > 31 ? 512 : 128;
    for (let iteration = 0; iteration < iterations; iteration += 1) {
      let moved = false;
      for (let leftIndex = 0; leftIndex < particles.length; leftIndex += 1) {
        const left = particles[leftIndex];
        if (!left.spawned) continue;
        for (let rightIndex = leftIndex + 1; rightIndex < particles.length; rightIndex += 1) {
          const right = particles[rightIndex];
          if (!right.spawned) continue;
          metrics.particlePairChecks += 1;
          moved = separateParticlePair(left, right) || moved;
        }
      }
      for (const particle of particles) {
        if (!particle.spawned) continue;
        const beforeX = particle.x;
        const beforeY = particle.y;
        clampParticleToWall(particle, elapsedMs, config, contacts, { wakeParticle: false, recordContact: false });
        moved = Math.abs(particle.x - beforeX) > EPSILON || Math.abs(particle.y - beforeY) > EPSILON || moved;
      }
      if (!moved) break;
    }
  }

  function fixedStep() {
    if (settled) return;
    const startedAt = globalThis.performance?.now?.() || 0;
    elapsedMs += config.fixedStepSeconds * 1000;
    spawnDue();
    for (const particle of particles) {
      if (!particle.spawned || particle.sleeping) continue;
      particle.vx *= config.airDamping;
      particle.vy = Math.min(config.maxFallSpeed, particle.vy * config.airDamping + config.gravity * config.fixedStepSeconds);
      particle.x += particle.vx * config.fixedStepSeconds;
      particle.y += particle.vy * config.fixedStepSeconds;
      particle.rotation += particle.angularVelocity * config.fixedStepSeconds;
    }
    relaxBoundaries();

    for (const particle of particles) {
      if (!particle.spawned || particle.sleeping) continue;
      if (!finiteParticle(particle)) {
        particle.x = MOOD_JAR_GEOMETRY.mouthX;
        particle.y = MOOD_JAR_GEOMETRY.mouthSpawnY;
        particle.vx = 0;
        particle.vy = 0;
        particle.rotation = 0;
        particle.angularVelocity = 0;
      }
      const floorDistance = Math.abs((particle.y + particle.radius) - getJarFloorY(particle.x));
      const speed = vectorLength(particle.vx, particle.vy);
      if (floorDistance <= 1.2 || particle.contactCount > 0) {
        if (speed <= config.sleepSpeed && Math.abs(particle.angularVelocity) <= config.sleepAngularSpeed) particle.sleepTime += config.fixedStepSeconds;
        else particle.sleepTime = 0;
        if (particle.sleepTime >= config.sleepAfterSeconds) {
          particle.sleeping = true;
          particle.vx = 0;
          particle.vy = 0;
          particle.angularVelocity = 0;
        }
      }
    }
    if (allSleeping() || elapsedMs >= Math.min(config.maxSimulationMs, plan.settleAtMs || config.maxSimulationMs)) {
      relaxBoundaries();
      relaxSettledGeometry();
      if (allSleeping() || elapsedMs >= Math.min(config.maxSimulationMs, plan.settleAtMs || config.maxSimulationMs)) {
        for (const particle of particles) {
          if (!particle.spawned) {
            particle.spawned = true;
            particle.x = MOOD_JAR_GEOMETRY.mouthX;
            particle.y = MOOD_JAR_GEOMETRY.mouthSpawnY;
          }
          particle.sleeping = true;
          particle.vx = 0;
          particle.vy = 0;
          particle.angularVelocity = 0;
        }
        settled = true;
      }
    }
    const finishedAt = globalThis.performance?.now?.() || startedAt;
    metrics.fixedSteps += 1;
    metrics.maxFrameWorkMs = Math.max(metrics.maxFrameWorkMs, finishedAt - startedAt);
  }

  function advanceFrame(deltaMs) {
    if (settled) return getState();
    const safeDelta = clamp(normalizeNumber(deltaMs, 0), 0, 1000);
    accumulatorMs += safeDelta;
    const availableSteps = Math.floor(accumulatorMs / (config.fixedStepSeconds * 1000));
    const steps = Math.min(config.maxFrameSteps, availableSteps);
    metrics.maxStepsPerAdvance = Math.max(metrics.maxStepsPerAdvance, steps);
    for (let index = 0; index < steps; index += 1) fixedStep();
    accumulatorMs -= steps * config.fixedStepSeconds * 1000;
    if (steps === config.maxFrameSteps && accumulatorMs > config.fixedStepSeconds * 1000 * config.maxFrameSteps) accumulatorMs = 0;
    return getState();
  }

  function advanceTo(targetMs) {
    const target = Math.max(elapsedMs, normalizeNumber(targetMs, elapsedMs));
    let guard = 0;
    const maxSteps = Math.ceil((config.maxSimulationMs + 1000) / (config.fixedStepSeconds * 1000)) + 120;
    while (!settled && elapsedMs < target && guard < maxSteps) {
      fixedStep();
      guard += 1;
    }
    if (!settled && guard >= maxSteps) {
      relaxBoundaries();
      relaxSettledGeometry();
      for (const particle of particles) {
        particle.sleeping = true;
        particle.vx = 0;
        particle.vy = 0;
        particle.angularVelocity = 0;
      }
      settled = true;
    }
    accumulatorMs = 0;
    return getState();
  }

  function getState() {
    return particles.map(snapshotParticle);
  }

  function getContacts() {
    return Object.freeze([...contacts]);
  }

  function getMetrics() {
    return Object.freeze({ ...metrics, elapsedMs, settled });
  }

  function getPlan() {
    return plan;
  }

  function reset() {
    elapsedMs = 0;
    accumulatorMs = 0;
    contacts.length = 0;
    metrics.fixedSteps = 0;
    metrics.maxStepsPerAdvance = 0;
    metrics.maxFrameWorkMs = 0;
    metrics.particlePairChecks = 0;
    for (const [index, item] of normalizedItems.entries()) {
      const next = createParticle(item, index, normalizedItems.length, plan, seed);
      Object.assign(particles[index], next);
    }
    settled = !particles.length;
  }

  return Object.freeze({
    advanceFrame,
    advanceTo,
    getContacts,
    getMetrics,
    getPlan,
    getState,
    isSettled: () => settled,
    reset,
  });
}

export function simulateMoodJar(items = [], options = {}) {
  const durationMs = Math.max(0, normalizeNumber(options.durationMs, 8500));
  const sampleEveryMs = Math.max(1, normalizeNumber(options.sampleEveryMs, 1000 / 60));
  const simulation = createMoodJarSimulation(items, options);
  const frames = [];
  let timeMs = 0;
  while (timeMs < durationMs && !simulation.isSettled()) {
    timeMs += sampleEveryMs;
    frames.push({ timeMs, state: simulation.advanceTo(timeMs) });
  }
  if (!simulation.isSettled()) simulation.advanceTo(durationMs);
  return Object.freeze({
    state: simulation.getState(),
    contacts: simulation.getContacts(),
    frames: Object.freeze(frames),
    metrics: simulation.getMetrics(),
    plan: simulation.getPlan(),
  });
}
