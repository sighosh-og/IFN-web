import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { photos } from './data';

type Rect = { x: number; y: number; w: number; h: number };

/*
 * "Slide" photo traversal, modelled on the reference recording (a parallax pager):
 * - photos are cards on a horizontal strip; neighbours rest just outside the stage, so nothing peeks at rest;
 * - inside each card the photo lags behind the card (PARALLAX): it is zoomed in slightly while off-centre and shifted
 *   back toward the centre, so the card edge sweeps over the image instead of the two moving rigidly. At rest the
 *   zoom is 0 — the photo is never cropped;
 * - off-centre cards sit slightly smaller (DEPTH) and settle to full size as they arrive;
 * - the strip is driven by a critically damped spring, so a click mid-slide keeps its momentum (no restart jolt).
 */
const PARALLAX = 0.14; // extra zoom inside an off-centre card; the photo shifts by that margin toward the centre
const DEPTH = 0.08; // how much smaller a card is one step away
const OMEGA = 15; // spring stiffness (rad/s): main travel ~350ms, settled by ~550ms, no overshoot
const RADIUS = 32;

export function SlideStrip({ index, box, stageW, hidden }: { index: number; box: Rect; stageW: number; hidden: boolean }) {
  const [pos, setPos] = useState(index); // strip position in photo units
  const state = useRef({ x: index, v: 0, target: index, raf: 0, last: 0 });

  useEffect(() => {
    const s = state.current;
    s.target = index;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      cancelAnimationFrame(s.raf); s.raf = 0;
      s.x = index; s.v = 0; setPos(index);
      return;
    }
    if (s.raf) return; // already running: the new target just bends the current motion
    s.last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.032, (now - s.last) / 1000); // clamp: a dropped frame shouldn't make it jump
      s.last = now;
      // critically damped spring, integrated in small steps for stability
      for (let k = 0; k < 4; k++) {
        const h = dt / 4;
        const a = -OMEGA * OMEGA * (s.x - s.target) - 2 * OMEGA * s.v;
        s.v += a * h;
        s.x += s.v * h;
      }
      if (Math.abs(s.x - s.target) < 0.0005 && Math.abs(s.v) < 0.002) {
        s.x = s.target; s.v = 0; s.raf = 0;
        setPos(s.target);
        return;
      }
      setPos(s.x);
      s.raf = requestAnimationFrame(tick);
    };
    s.raf = requestAnimationFrame(tick);
  }, [index]);
  useEffect(() => () => cancelAnimationFrame(state.current.raf), []);

  // keep the spring honest if the index is changed while unmounted/remounted
  useLayoutEffect(() => {
    if (!state.current.raf && state.current.x !== index) { state.current.x = index; setPos(index); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fitOf = (i: number) => {
    const p = photos[i];
    const k = Math.min(box.w / p.w, box.h / p.h);
    return { w: p.w * k, h: p.h * k };
  };
  // centre-to-centre distance: far enough that the neighbour's edge rests exactly at the stage edge
  const gapAfter = (i: number) => stageW / 2 + Math.max(fitOf(i).w, fitOf(i + 1).w) / 2;
  // strip offset of photo i relative to photo `from` (summing pair distances)
  const offsetOf = (i: number, from: number) => {
    let x = 0;
    for (let j = from; j < i; j++) x += gapAfter(j);
    for (let j = i; j < from; j++) x -= gapAfter(j);
    return x;
  };
  const base = Math.max(0, Math.min(photos.length - 1, Math.floor(pos)));
  const frac = pos - base;
  const scroll = base < photos.length - 1 ? frac * gapAfter(base) : 0; // strip position past photo `base`

  const cards = [];
  for (let i = base - 1; i <= base + 2; i++) {
    const p = photos[i];
    if (!p) continue;
    const t = i - pos; // steps away from centre (signed)
    if (Math.abs(t) >= 0.999 && pos === index) continue; // at rest: only the current photo exists
    const f = fitOf(i);
    const d = Math.min(1, Math.abs(t));
    const s = 1 - DEPTH * d;
    const w = f.w * s;
    const h = f.h * s;
    const cx = box.w / 2 + offsetOf(i, base) - scroll;
    const left = cx - w / 2;
    if (left > box.w / 2 + stageW / 2 || left + w < box.w / 2 - stageW / 2) continue; // fully off-stage
    const z = 1 + PARALLAX * d;
    const iw = w * z;
    const ih = h * z;
    const shift = -Math.sign(t) * ((iw - w) / 2) * d; // lag back toward the centre
    cards.push(
      <div
        key={p.src}
        className="pv__slideCard"
        style={{ left, top: (box.h - h) / 2, width: w, height: h, borderRadius: RADIUS * s }}
        aria-hidden={i !== index || undefined}
      >
        <img
          src={p.src}
          alt={i === index ? `Customer photo ${i + 1}` : ''}
          style={{ left: (w - iw) / 2 + shift, top: (h - ih) / 2, width: iw, height: ih }}
          draggable={false}
        />
      </div>,
    );
  }

  return (
    <div className="pv__strip" style={{ visibility: hidden ? 'hidden' : undefined }} data-moving={pos !== index || undefined}>
      {cards}
    </div>
  );
}
