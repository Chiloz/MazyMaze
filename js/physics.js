// ─────────────────────────────────────────────────────
//  js/physics.js  –  Ball physics & collision resolution
//
//  All distances are in THREE.js world units where
//  each maze cell = 1 unit.
// ─────────────────────────────────────────────────────

export const BALL_RADIUS = 0.33;

const FRICTION      = 0.91;   // velocity multiplier per frame
const ACCEL         = 7.0;    // force applied by input
const MAX_SPEED     = 6.5;    // hard cap (world-units / s)
const BOOST_MULT    = 1.72;   // speed multiplier when boosting
const BOUNCE_DAMP   = 0.30;   // velocity kept after wall bounce

// Internal state – exported object is mutated by callers
export const ballState = {
  x: 0, z: 0,       // world position (Y is always BALL_RADIUS)
  vx: 0, vz: 0,     // velocity
  spin: 0,           // cumulative roll angle (for stripe rotation)
};

// ── Helpers ────────────────────────────────────────

/** Returns true if world-position (wx, wz) is inside a wall cell */
function isWall(wx, wz, grid, cols, rows) {
  const gx = Math.floor(wx);
  const gz = Math.floor(wz);
  if (gx < 0 || gz < 0 || gx >= cols || gz >= rows) return true;
  return grid[gz][gx] === 1;
}

/**
 * Move ball along ONE axis then resolve all wall penetrations.
 * This prevents the ball from ever going halfway into a wall.
 */
function resolveAxis(axis, delta, grid, cols, rows) {
  const r = BALL_RADIUS * 0.97; // tiny epsilon keeps ball flush

  if (axis === 'x') ballState.x += delta;
  else              ballState.z += delta;

  // Bounding box corners
  const x0 = ballState.x - r,  x1 = ballState.x + r;
  const z0 = ballState.z - r,  z1 = ballState.z + r;
  const cL = Math.floor(x0),   cR = Math.floor(x1 - 0.001);
  const cT = Math.floor(z0),   cB = Math.floor(z1 - 0.001);

  for (let gz = cT; gz <= cB; gz++) {
    for (let gx = cL; gx <= cR; gx++) {
      if (!isWall(gx + 0.5, gz + 0.5, grid, cols, rows)) continue;

      // Cell world bounds
      const wx0 = gx, wx1 = gx + 1;
      const wz0 = gz, wz1 = gz + 1;

      if (axis === 'x') {
        // Came from left → push out to the left of wall
        if (delta > 0 && ballState.x + r > wx0 && ballState.x < wx1) {
          ballState.x = wx0 - r;
          ballState.vx *= -BOUNCE_DAMP;
        }
        // Came from right → push out to the right of wall
        if (delta < 0 && ballState.x - r < wx1 && ballState.x > wx0) {
          ballState.x = wx1 + r;
          ballState.vx *= -BOUNCE_DAMP;
        }
      } else {
        if (delta > 0 && ballState.z + r > wz0 && ballState.z < wz1) {
          ballState.z = wz0 - r;
          ballState.vz *= -BOUNCE_DAMP;
        }
        if (delta < 0 && ballState.z - r < wz1 && ballState.z > wz0) {
          ballState.z = wz1 + r;
          ballState.vz *= -BOUNCE_DAMP;
        }
      }
    }
  }
}

// ── Main update ────────────────────────────────────

/**
 * @param {number}  dt      Delta-time in seconds
 * @param {object}  input   { x, z } force vector (each -1..1)
 * @param {boolean} boost   Whether speed boost is active
 * @param {number[][]} grid Maze grid
 * @param {number}  cols
 * @param {number}  rows
 * @returns {boolean} true if ball is touching a wall this frame (for sound)
 */
export function updatePhysics(dt, input, boost, grid, cols, rows) {
  const speedCap = MAX_SPEED * (boost ? BOOST_MULT : 1.0);
  const accel    = ACCEL    * (boost ? BOOST_MULT : 1.0);

  // Apply input acceleration
  ballState.vx += input.x * accel * dt;
  ballState.vz += input.z * accel * dt;

  // Friction
  ballState.vx *= Math.pow(FRICTION, dt * 60);
  ballState.vz *= Math.pow(FRICTION, dt * 60);

  // Clamp to max speed
  const spd = Math.sqrt(ballState.vx ** 2 + ballState.vz ** 2);
  if (spd > speedCap) {
    ballState.vx = (ballState.vx / spd) * speedCap;
    ballState.vz = (ballState.vz / spd) * speedCap;
  }

  // Accumulate spin (drives stripe rotation on the 3-D ball)
  ballState.spin += spd * dt * 3.5;

  // Resolve collision on each axis independently
  const prevVx = ballState.vx, prevVz = ballState.vz;
  resolveAxis('x', ballState.vx * dt, grid, cols, rows);
  resolveAxis('z', ballState.vz * dt, grid, cols, rows);

  // Did we bounce? (velocity sign changed)
  const bounced = (prevVx !== 0 && Math.sign(ballState.vx) !== Math.sign(prevVx))
               || (prevVz !== 0 && Math.sign(ballState.vz) !== Math.sign(prevVz));
  return bounced;
}

/** Teleport ball to a world position and zero velocity */
export function resetBall(x, z) {
  ballState.x  = x;
  ballState.z  = z;
  ballState.vx = 0;
  ballState.vz = 0;
  ballState.spin = 0;
}
