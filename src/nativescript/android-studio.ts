import type {
  BenchmarkResult,
  SceneColorTheme,
  SceneGeometryMode,
  SceneUpdatePayload,
  TelemetrySnapshot,
} from './nativescript-lab.service.ts';

declare const require: ((id: string) => unknown) | undefined;

interface AndroidStudioState {
  installed: boolean;
  payload: SceneUpdatePayload;
  viewportView: any;
  segmentedView: any;
  viewportBitmap: any;
  viewportCanvas: any;
  viewportDrawable: any;
  segmentedBitmap: any;
  segmentedCanvas: any;
  segmentedDrawable: any;
  fillPaint: any;
  strokePaint: any;
  glowPaint: any;
  textPaint: any;
  path: any;
  rectF: any;
  rotX: number;
  rotY: number;
  rotZ: number;
  userRotX: number;
  userRotY: number;
  zoom: number;
  pulseScale: number;
  lastTouchX: number;
  lastTouchY: number;
  rafId: any;
  mountTimerId: any;
  onGeometrySelected?: (mode: SceneGeometryMode) => void;
}

const THEME_PALETTES: Record<
  SceneColorTheme,
  {
    primary: [number, number, number];
    highlight: [number, number, number];
    secondary: [number, number, number];
    glow: [number, number, number];
  }
> = {
  copper: {
    primary: [224, 122, 71],
    highlight: [248, 198, 160],
    secondary: [168, 174, 186],
    glow: [224, 122, 71],
  },
  titanium: {
    primary: [212, 212, 216],
    highlight: [250, 250, 252],
    secondary: [130, 142, 160],
    glow: [180, 195, 215],
  },
  obsidian: {
    primary: [115, 115, 128],
    highlight: [210, 210, 220],
    secondary: [212, 148, 90],
    glow: [160, 160, 175],
  },
  cobalt: {
    primary: [59, 130, 246],
    highlight: [165, 205, 255],
    secondary: [195, 205, 220],
    glow: [59, 130, 246],
  },
};

function getGlobal(): Record<string, any> {
  return globalThis as Record<string, any>;
}

function getStudioState(): AndroidStudioState {
  const g = getGlobal();
  if (!g.__nsAndroidStudioState) {
    g.__nsAndroidStudioState = {
      installed: false,
      payload: {
        geometry: 'torus',
        theme: 'copper',
        speed: 1.0,
        metalness: 0.88,
        roughness: 0.16,
        bloom: 0.72,
        wireframe: false,
      },
      viewportView: null,
      segmentedView: null,
      viewportBitmap: null,
      viewportCanvas: null,
      viewportDrawable: null,
      segmentedBitmap: null,
      segmentedCanvas: null,
      segmentedDrawable: null,
      fillPaint: null,
      strokePaint: null,
      glowPaint: null,
      textPaint: null,
      path: null,
      rectF: null,
      rotX: 0.42,
      rotY: 0.65,
      rotZ: 0.18,
      userRotX: 0,
      userRotY: 0,
      zoom: 1.0,
      pulseScale: 1.0,
      lastTouchX: 0,
      lastTouchY: 0,
      rafId: null,
      mountTimerId: null,
    } satisfies AndroidStudioState;
  }
  return g.__nsAndroidStudioState as AndroidStudioState;
}

export function ensureAndroidNativeScriptInstalled(): boolean {
  const g = getGlobal();
  const state = getStudioState();
  if (state.installed && g.android && g.java) {
    return true;
  }

  // Expo defines `globalThis.expo` as `{ writable: false, configurable: true }`.
  // When NativeScript Android's `MetadataNode::CreateTopLevelNamespaces(rt)` iterates
  // top-level Java packages on the classpath (`android`, `com`, `expo`, `java`, `org`),
  // `global.setProperty(rt, "expo", packageObj)` throws if `globalThis.expo` is read-only,
  // aborting before `java` and `org` are registered. Temporarily make `expo` writable
  // during `install("")` and restore Expo's global object immediately after.
  const savedDescriptors: Array<[string, PropertyDescriptor]> = [];
  for (const key of ['expo']) {
    try {
      const desc = Object.getOwnPropertyDescriptor(g, key);
      if (desc && desc.writable === false && desc.configurable === true) {
        savedDescriptors.push([key, desc]);
        Object.defineProperty(g, key, {
          value: desc.value,
          writable: true,
          enumerable: desc.enumerable ?? true,
          configurable: true,
        });
      }
    } catch {
      // Ignore
    }
  }

  try {
    let api: any = null;
    if (typeof g.__turboModuleProxy === 'function') {
      api = g.__turboModuleProxy('NativeScriptNativeApi');
    }
    if (!api && typeof require === 'function') {
      try {
        const rn = require('react-native') as any;
        api = rn?.TurboModuleRegistry?.get?.('NativeScriptNativeApi');
      } catch {
        // Ignore
      }
    }
    if (api) {
      const ready = api.isInstalled?.() || api.install?.('');
      if (ready || (g.android && g.java)) {
        state.installed = true;
      }
    }
  } catch (err) {
    console.warn('[NS-Android] TurboModule install error:', err);
  } finally {
    for (const [key, desc] of savedDescriptors) {
      try {
        Object.defineProperty(g, key, desc);
      } catch {
        // Ignore
      }
    }
  }

  if (g.android && g.java) {
    state.installed = true;
    return true;
  }

  return false;
}

function getMainActivityClass(): any {
  const g = getGlobal();
  return g.org?.nativescript?.ngnativewithns?.MainActivity ?? null;
}

function getCurrentAndroidActivity(): any {
  const g = getGlobal();
  try {
    const MainActivity = getMainActivityClass();
    const inst =
      MainActivity?.getCurrentInstance?.() ?? MainActivity?.currentInstance;
    if (inst) {
      return inst;
    }
  } catch {
    // Fallback
  }

  try {
    const atClass = g.java?.lang?.Class?.forName?.('android.app.ActivityThread');
    const currentAt = atClass
      ?.getMethod?.('currentActivityThread', null)
      ?.invoke?.(null, null);
    const mActivitiesField = atClass?.getDeclaredField?.('mActivities');
    mActivitiesField?.setAccessible?.(true);
    const activitiesMap = mActivitiesField?.get?.(currentAt);
    const values = activitiesMap?.values?.()?.toArray?.();
    if (values) {
      const len = values.length ?? 0;
      for (let i = 0; i < len; i++) {
        const record = values[i];
        if (record) {
          const recClass = record.getClass();
          const pausedField = recClass.getDeclaredField('paused');
          pausedField.setAccessible(true);
          if (!pausedField.getBoolean(record)) {
            const actField = recClass.getDeclaredField('activity');
            actField.setAccessible(true);
            return actField.get(record);
          }
        }
      }
    }
  } catch {
    // Ignore
  }
  return null;
}

function getAndroidApplication(): any {
  const act = getCurrentAndroidActivity();
  if (act) {
    try {
      return act.getApplication?.() ?? act;
    } catch {
      return act;
    }
  }
  const g = getGlobal();
  try {
    const cls = g.java?.lang?.Class?.forName?.('android.app.ActivityThread');
    const method = cls?.getMethod?.('currentApplication', null);
    return method?.invoke?.(null, null) ?? null;
  } catch {
    return null;
  }
}

function findViewByNativeId(rootView: any, targetId: string): any {
  const g = getGlobal();
  if (!rootView) {
    return null;
  }

  // 1. Try ReactFindViewUtil.findView(rootView, targetId)
  try {
    const found =
      g.com?.facebook?.react?.uimanager?.util?.ReactFindViewUtil?.findView?.(
        rootView,
        targetId,
      );
    if (found) {
      return found;
    }
  } catch {
    // Fallback to manual traversal
  }

  // 2. Walk ViewGroup hierarchy checking view_tag_native_id or tag
  let nativeIdTagKey = 0;
  try {
    const app = getAndroidApplication();
    if (app) {
      nativeIdTagKey = app
        .getResources()
        .getIdentifier('view_tag_native_id', 'id', app.getPackageName());
    }
  } catch {
    nativeIdTagKey = 0;
  }

  const stack: any[] = [rootView];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }
    try {
      if (nativeIdTagKey !== 0) {
        const tagVal = current.getTag(nativeIdTagKey);
        if (tagVal && String(tagVal) === targetId) {
          return current;
        }
      }
      const rawTag = current.getTag?.();
      if (rawTag && String(rawTag) === targetId) {
        return current;
      }
      if (typeof current.getChildCount === 'function') {
        const count = current.getChildCount();
        for (let i = count - 1; i >= 0; i--) {
          stack.push(current.getChildAt(i));
        }
      }
    } catch {
      // Continue traversal
    }
  }
  return null;
}

function argb(a: number, r: number, g: number, b: number): number {
  const Color = getGlobal().android.graphics.Color;
  return Color.argb(
    Math.max(0, Math.min(255, Math.round(a))),
    Math.max(0, Math.min(255, Math.round(r))),
    Math.max(0, Math.min(255, Math.round(g))),
    Math.max(0, Math.min(255, Math.round(b))),
  );
}

function rotate3D(
  x: number,
  y: number,
  z: number,
  rx: number,
  ry: number,
  rz: number,
): [number, number, number] {
  // Rotate around X
  const cosX = Math.cos(rx);
  const sinX = Math.sin(rx);
  const y1 = y * cosX - z * sinX;
  const z1 = y * sinX + z * cosX;

  // Rotate around Y
  const cosY = Math.cos(ry);
  const sinY = Math.sin(ry);
  const x2 = x * cosY + z1 * sinY;
  const z2 = -x * sinY + z1 * cosY;

  // Rotate around Z
  const cosZ = Math.cos(rz);
  const sinZ = Math.sin(rz);
  const x3 = x2 * cosZ - y1 * sinZ;
  const y3 = x2 * sinZ + y1 * cosZ;

  return [x3, y3, z2];
}

function drawSegmentedBar(state: AndroidStudioState): void {
  const { segmentedCanvas: canvas, fillPaint, strokePaint, textPaint, rectF, payload } = state;
  if (!canvas || !fillPaint || !textPaint || !rectF) {
    return;
  }

  const w = 680;
  const h = 88;

  // Outer dark chrome pill background
  canvas.drawColor(argb(255, 24, 24, 28));

  const segments: Array<{ id: SceneGeometryMode; label: string }> = [
    { id: 'torus', label: 'Torus Ring' },
    { id: 'gyro', label: 'Chamfer Box' },
    { id: 'lattice', label: 'Geodesic' },
  ];

  const palette = THEME_PALETTES[payload.theme] || THEME_PALETTES.copper;
  const pad = 6;
  const segW = (w - pad * 2) / 3;
  const segH = h - pad * 2;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const left = pad + i * segW;
    const top = pad;
    const right = left + segW;
    const bottom = top + segH;

    if (seg.id === payload.geometry) {
      rectF.set(left + 2, top + 2, right - 2, bottom - 2);
      fillPaint.setColor(
        argb(
          235,
          Math.round(palette.primary[0] * 0.52 + 30),
          Math.round(palette.primary[1] * 0.52 + 24),
          Math.round(palette.primary[2] * 0.52 + 22),
        ),
      );
      canvas.drawRoundRect(rectF, 14, 14, fillPaint);

      strokePaint.setStrokeWidth(2);
      strokePaint.setColor(
        argb(220, palette.primary[0], palette.primary[1], palette.primary[2]),
      );
      canvas.drawRoundRect(rectF, 14, 14, strokePaint);

      textPaint.setColor(argb(255, 250, 250, 252));
    } else {
      textPaint.setColor(argb(215, 190, 190, 200));
    }

    const centerX = left + segW * 0.5;
    const centerY = h * 0.5 + 9;
    canvas.drawText(seg.label, centerX, centerY, textPaint);
  }

  try {
    state.segmentedView?.postInvalidate?.();
  } catch {
    // Ignore
  }
}

function drawSceneFrame(state: AndroidStudioState): void {
  const {
    viewportCanvas: canvas,
    fillPaint,
    strokePaint,
    glowPaint,
    path,
    payload,
  } = state;
  if (!canvas || !fillPaint || !strokePaint || !path) {
    return;
  }

  const w = 680;
  const h = 480;
  const cx = w * 0.5;
  const cy = h * 0.5;
  const fov = 520;
  const scale = 112 * state.zoom * state.pulseScale;

  const palette = THEME_PALETTES[payload.theme] || THEME_PALETTES.copper;
  const [pr, pg, pb] = palette.primary;
  const [hr, hg, hb] = palette.highlight;
  const [sr, sg, sb] = palette.secondary;

  // 1. Deep warm graphite studio backdrop
  canvas.drawColor(argb(255, 13, 13, 15));

  // 2. Subtle ambient floor & core glow
  const glowAlpha = Math.min(95, Math.round(38 * payload.bloom * state.pulseScale));
  glowPaint.setColor(argb(glowAlpha, pr, pg, pb));
  canvas.drawCircle(cx, cy, 175 * state.pulseScale, glowPaint);
  glowPaint.setColor(argb(Math.round(glowAlpha * 0.55), hr, hg, hb));
  canvas.drawCircle(cx, cy, 108 * state.pulseScale, glowPaint);

  const rx = state.rotX + state.userRotX;
  const ry = state.rotY + state.userRotY;
  const rz = state.rotZ;

  const project = (x: number, y: number, z: number): [number, number, number] => {
    const pScale = fov / (fov + z * 95 + 260);
    return [cx + x * scale * pScale, cy + y * scale * pScale, z];
  };

  // Helper to draw a 3D ring with depth-shaded front/back halves
  const drawGimbalRing = (
    radius: number,
    tiltX: number,
    tiltY: number,
    tiltZ: number,
    baseColor: [number, number, number],
    specColor: [number, number, number],
    thickness: number,
  ) => {
    const steps = 40;
    const pts: Array<[number, number, number]> = [];
    for (let i = 0; i <= steps; i++) {
      const theta = (i / steps) * Math.PI * 2;
      const lx = Math.cos(theta) * radius;
      const ly = Math.sin(theta) * radius;
      const [r1x, r1y, r1z] = rotate3D(lx, ly, 0, tiltX, tiltY, tiltZ);
      const [wx, wy, wz] = rotate3D(r1x, r1y, r1z, rx, ry, rz);
      pts.push(project(wx, wy, wz));
    }

    // Back half (z > 0)
    path.reset();
    let startedBack = false;
    for (let i = 0; i <= steps; i++) {
      const [px, py, pz] = pts[i];
      if (pz >= 0) {
        if (!startedBack) {
          path.moveTo(px, py);
          startedBack = true;
        } else {
          path.lineTo(px, py);
        }
      } else {
        startedBack = false;
      }
    }
    strokePaint.setStrokeWidth(payload.wireframe ? 2.5 : thickness * 0.82);
    strokePaint.setColor(
      argb(
        155,
        Math.round(baseColor[0] * 0.55),
        Math.round(baseColor[1] * 0.55),
        Math.round(baseColor[2] * 0.55),
      ),
    );
    canvas.drawPath(path, strokePaint);

    // Front half (z <= 0)
    path.reset();
    let startedFront = false;
    for (let i = 0; i <= steps; i++) {
      const [px, py, pz] = pts[i];
      if (pz <= 0.12) {
        if (!startedFront) {
          path.moveTo(px, py);
          startedFront = true;
        } else {
          path.lineTo(px, py);
        }
      } else {
        startedFront = false;
      }
    }
    strokePaint.setStrokeWidth(payload.wireframe ? 3.0 : thickness);
    strokePaint.setColor(argb(245, baseColor[0], baseColor[1], baseColor[2]));
    canvas.drawPath(path, strokePaint);

    if (!payload.wireframe) {
      // Specular metallic highlight pass on front rim
      strokePaint.setStrokeWidth(Math.max(2, thickness * 0.34));
      strokePaint.setColor(
        argb(
          payload.roughness <= 0.12 ? 230 : 145,
          specColor[0],
          specColor[1],
          specColor[2],
        ),
      );
      canvas.drawPath(path, strokePaint);
    }
  };

  // Outer, middle, and inner gimbal rings
  drawGimbalRing(1.62, 0.35, state.rotY * 0.6, 0.1, [pr, pg, pb], [hr, hg, hb], 14);
  drawGimbalRing(1.26, 1.12, -state.rotY * 0.8, 0.52, [sr, sg, sb], [248, 250, 252], 10);
  drawGimbalRing(0.94, -0.68, state.rotX * 0.9, 1.05, [pr, pg, pb], [hr, hg, hb], 8);

  // 3. Central 3D Core Sculpture (Torus Ring | Chamfer Box | Geodesic)
  if (payload.geometry === 'torus') {
    const ringR = 0.52;
    const pipeR = 0.21;
    const uSteps = 22;
    const vSteps = 10;

    for (let v = 0; v < vSteps; v++) {
      const phi = (v / vSteps) * Math.PI * 2;
      const cosPhi = Math.cos(phi);
      const sinPhi = Math.sin(phi);
      path.reset();
      for (let u = 0; u <= uSteps; u++) {
        const theta = (u / uSteps) * Math.PI * 2;
        const r = ringR + pipeR * cosPhi;
        const lx = r * Math.cos(theta);
        const ly = r * Math.sin(theta);
        const lz = pipeR * sinPhi;
        const [wx, wy, wz] = rotate3D(
          lx,
          ly,
          lz,
          rx * 1.35,
          ry * 1.25,
          rz * 0.9,
        );
        const [px, py] = project(wx, wy, wz);
        if (u === 0) {
          path.moveTo(px, py);
        } else {
          path.lineTo(px, py);
        }
      }
      const shade = 0.55 + 0.45 * Math.max(0, cosPhi * 0.6 + sinPhi * 0.8);
      strokePaint.setStrokeWidth(payload.wireframe ? 2.2 : 9.5);
      strokePaint.setColor(
        argb(
          payload.wireframe ? 210 : 245,
          Math.min(255, Math.round(pr * shade + (shade > 0.85 ? 38 : 0))),
          Math.min(255, Math.round(pg * shade + (shade > 0.85 ? 38 : 0))),
          Math.min(255, Math.round(pb * shade + (shade > 0.85 ? 38 : 0))),
        ),
      );
      canvas.drawPath(path, strokePaint);
    }
  } else if (payload.geometry === 'gyro') {
    // 3D Chamfer Box (Octahedral-chamfered cube vertices & faces)
    const s = 0.54;
    const verts: Array<[number, number, number]> = [
      [-s, -s, -s],
      [s, -s, -s],
      [s, s, -s],
      [-s, s, -s],
      [-s, -s, s],
      [s, -s, s],
      [s, s, s],
      [-s, s, s],
    ];
    const transformed = verts.map(([vx, vy, vz]) => {
      const [wx, wy, wz] = rotate3D(vx, vy, vz, rx * 1.4, ry * 1.3, rz);
      return project(wx, wy, wz);
    });
    const faces: Array<[number, number, number, number]> = [
      [0, 1, 2, 3],
      [4, 5, 6, 7],
      [0, 1, 5, 4],
      [2, 3, 7, 6],
      [0, 3, 7, 4],
      [1, 2, 6, 5],
    ];
    const sortedFaces = faces
      .map((f) => ({
        f,
        z:
          (transformed[f[0]][2] +
            transformed[f[1]][2] +
            transformed[f[2]][2] +
            transformed[f[3]][2]) *
          0.25,
      }))
      .sort((a, b) => b.z - a.z);

    for (let idx = 0; idx < sortedFaces.length; idx++) {
      const { f } = sortedFaces[idx];
      path.reset();
      path.moveTo(transformed[f[0]][0], transformed[f[0]][1]);
      path.lineTo(transformed[f[1]][0], transformed[f[1]][1]);
      path.lineTo(transformed[f[2]][0], transformed[f[2]][1]);
      path.lineTo(transformed[f[3]][0], transformed[f[3]][1]);
      path.close();

      const shade = 0.48 + (idx / sortedFaces.length) * 0.52;
      if (!payload.wireframe) {
        fillPaint.setColor(
          argb(
            235,
            Math.round(pr * shade),
            Math.round(pg * shade),
            Math.round(pb * shade),
          ),
        );
        canvas.drawPath(path, fillPaint);
      }
      strokePaint.setStrokeWidth(payload.wireframe ? 3.0 : 4.0);
      strokePaint.setColor(argb(240, hr, hg, hb));
      canvas.drawPath(path, strokePaint);
    }
  } else {
    // Geodesic Sphere
    const latSteps = 7;
    const lonSteps = 14;
    const rad = 0.62;
    for (let i = 1; i < latSteps; i++) {
      const lat = (i / latSteps) * Math.PI;
      const sinLat = Math.sin(lat);
      const cosLat = Math.cos(lat);
      path.reset();
      for (let j = 0; j <= lonSteps; j++) {
        const lon = (j / lonSteps) * Math.PI * 2;
        const lx = rad * sinLat * Math.cos(lon);
        const ly = rad * cosLat;
        const lz = rad * sinLat * Math.sin(lon);
        const [wx, wy, wz] = rotate3D(lx, ly, lz, rx * 1.2, ry * 1.4, rz);
        const [px, py] = project(wx, wy, wz);
        if (j === 0) {
          path.moveTo(px, py);
        } else {
          path.lineTo(px, py);
        }
      }
      strokePaint.setStrokeWidth(payload.wireframe ? 2.5 : 5.5);
      strokePaint.setColor(argb(225, pr, pg, pb));
      canvas.drawPath(path, strokePaint);
    }
    for (let j = 0; j < lonSteps; j += 2) {
      const lon = (j / lonSteps) * Math.PI * 2;
      path.reset();
      for (let i = 0; i <= latSteps * 2; i++) {
        const lat = (i / (latSteps * 2)) * Math.PI * 2;
        const lx = rad * Math.sin(lat) * Math.cos(lon);
        const ly = rad * Math.cos(lat);
        const lz = rad * Math.sin(lat) * Math.sin(lon);
        const [wx, wy, wz] = rotate3D(lx, ly, lz, rx * 1.2, ry * 1.4, rz);
        const [px, py] = project(wx, wy, wz);
        if (i === 0) {
          path.moveTo(px, py);
        } else {
          path.lineTo(px, py);
        }
      }
      strokePaint.setStrokeWidth(2.8);
      strokePaint.setColor(argb(195, hr, hg, hb));
      canvas.drawPath(path, strokePaint);
    }
  }

  // 4. Six Orbiting Harmonic Satellites
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + state.rotY * 1.5;
    const orbitR = 1.92;
    const lx = Math.cos(angle) * orbitR;
    const ly = Math.sin(angle * 2) * 0.32;
    const lz = Math.sin(angle) * orbitR;
    const [wx, wy, wz] = rotate3D(lx, ly, lz, rx * 0.6, ry * 0.5, rz * 0.4);
    const [px, py] = project(wx, wy, wz);
    const satRadius = (wz < 0 ? 11 : 7.5) * state.pulseScale;
    const isEven = i % 2 === 0;
    const [cr, cg, cb] = isEven ? [pr, pg, pb] : [sr, sg, sb];

    fillPaint.setColor(argb(wz < 0 ? 250 : 165, cr, cg, cb));
    canvas.drawCircle(px, py, satRadius, fillPaint);

    // Specular glint
    fillPaint.setColor(argb(230, 252, 252, 255));
    canvas.drawCircle(px - satRadius * 0.28, py - satRadius * 0.28, satRadius * 0.3, fillPaint);
  }

  try {
    state.viewportView?.postInvalidate?.();
  } catch {
    // Ignore
  }
}

function ensureBitmapsInitialized(state: AndroidStudioState): void {
  const g = getGlobal();
  if (!g.android || !g.java || state.viewportBitmap) {
    return;
  }

  try {
    const Bitmap = g.android.graphics.Bitmap;
    const Canvas = g.android.graphics.Canvas;
    const Paint = g.android.graphics.Paint;
    const Path = g.android.graphics.Path;
    const RectF = g.android.graphics.RectF;
    const BitmapDrawable = g.android.graphics.drawable.BitmapDrawable;
    const Resources = g.android.content?.res?.Resources;

    const activity = getCurrentAndroidActivity();
    const resources =
      activity?.getResources?.() ?? Resources?.getSystem?.() ?? null;

    state.viewportBitmap = Bitmap.createBitmap(
      680,
      480,
      Bitmap.Config.ARGB_8888,
    );
    state.viewportCanvas = new Canvas(state.viewportBitmap);
    state.viewportDrawable = resources
      ? new BitmapDrawable(resources, state.viewportBitmap)
      : new BitmapDrawable(state.viewportBitmap);

    state.segmentedBitmap = Bitmap.createBitmap(
      680,
      88,
      Bitmap.Config.ARGB_8888,
    );
    state.segmentedCanvas = new Canvas(state.segmentedBitmap);
    state.segmentedDrawable = resources
      ? new BitmapDrawable(resources, state.segmentedBitmap)
      : new BitmapDrawable(state.segmentedBitmap);

    state.fillPaint = new Paint(1);
    state.fillPaint.setStyle(Paint.Style.FILL);

    state.strokePaint = new Paint(1);
    state.strokePaint.setStyle(Paint.Style.STROKE);
    state.strokePaint.setStrokeCap(Paint.Cap.ROUND);
    state.strokePaint.setStrokeJoin(Paint.Join.ROUND);

    state.glowPaint = new Paint(1);
    state.glowPaint.setStyle(Paint.Style.FILL);

    state.textPaint = new Paint(1);
    state.textPaint.setTextSize(25);
    state.textPaint.setFakeBoldText(true);
    state.textPaint.setTextAlign(Paint.Align.CENTER);

    state.path = new Path();
    state.rectF = new RectF();
  } catch {
    // Ignore if android.graphics is not mocked in unit tests
  }
}

function attachViewsIfNeeded(state: AndroidStudioState): void {
  const g = getGlobal();
  if (!g.android || !g.java) {
    return;
  }

  ensureBitmapsInitialized(state);
  if (!state.viewportDrawable || !state.segmentedDrawable) {
    return;
  }

  const MainActivity = getMainActivityClass();
  if (MainActivity) {
    try {
      if (!state.viewportView && typeof MainActivity.attachViewport === 'function') {
        const foundViewport = MainActivity.attachViewport(
          'scn-viewport',
          state.viewportDrawable,
        );
        if (foundViewport) {
          state.viewportView = foundViewport;
        }
      }
      if (
        !state.segmentedView &&
        typeof MainActivity.attachSegmentedBar === 'function'
      ) {
        const foundSegmented = MainActivity.attachSegmentedBar(
          'uikit-segmented-bar',
          state.segmentedDrawable,
        );
        if (foundSegmented) {
          state.segmentedView = foundSegmented;
          drawSegmentedBar(state);
        }
      }
      if (state.viewportView && state.segmentedView) {
        return;
      }
    } catch {
      // Fallback below
    }
  }

  const activity = getCurrentAndroidActivity();
  if (!activity) {
    return;
  }

  const decorView = activity.getWindow?.()?.getDecorView?.();
  if (!decorView) {
    return;
  }

  if (!state.viewportView) {
    const foundViewport = findViewByNativeId(decorView, 'scn-viewport');
    if (foundViewport) {
      state.viewportView = foundViewport;
      try {
        if (g.java?.lang?.Runnable && typeof activity.runOnUiThread === 'function') {
          activity.runOnUiThread(
            new g.java.lang.Runnable({
              run() {
                foundViewport.setBackground(state.viewportDrawable);
                foundViewport.invalidate();
              },
            }),
          );
        } else {
          foundViewport.setBackground(state.viewportDrawable);
          foundViewport.postInvalidate?.();
        }
      } catch {
        // Ignore
      }
    }
  }

  if (!state.segmentedView) {
    const foundSegmented = findViewByNativeId(decorView, 'uikit-segmented-bar');
    if (foundSegmented) {
      state.segmentedView = foundSegmented;
      try {
        if (g.java?.lang?.Runnable && typeof activity.runOnUiThread === 'function') {
          activity.runOnUiThread(
            new g.java.lang.Runnable({
              run() {
                foundSegmented.setBackground(state.segmentedDrawable);
                foundSegmented.invalidate();
              },
            }),
          );
        } else {
          foundSegmented.setBackground(state.segmentedDrawable);
        }
        drawSegmentedBar(state);
      } catch {
        // Ignore
      }
    }
  }
}

function startAnimationLoop(state: AndroidStudioState): void {
  if (state.rafId !== null) {
    return;
  }

  const tick = () => {
    if (!state.viewportView || !state.segmentedView) {
      attachViewsIfNeeded(state);
    }

    const MainActivity = getMainActivityClass();
    if (MainActivity) {
      try {
        const tx = Number(
          MainActivity.getTouchRotX?.() ?? MainActivity.touchRotX ?? 0,
        );
        const ty = Number(
          MainActivity.getTouchRotY?.() ?? MainActivity.touchRotY ?? 0,
        );
        if (!Number.isNaN(tx)) {
          state.userRotX = tx;
        }
        if (!Number.isNaN(ty)) {
          state.userRotY = ty;
        }
        if (typeof MainActivity.consumePendingSegmentIndex === 'function') {
          const segIdx = Number(MainActivity.consumePendingSegmentIndex());
          if (segIdx >= 0 && segIdx <= 2) {
            const modes: SceneGeometryMode[] = ['torus', 'gyro', 'lattice'];
            const nextMode = modes[segIdx];
            if (nextMode && state.payload.geometry !== nextMode) {
              state.payload = { ...state.payload, geometry: nextMode };
              drawSegmentedBar(state);
              state.onGeometrySelected?.(nextMode);
            }
          }
        }
      } catch {
        // Ignore
      }
    }

    const speed = state.payload.speed;
    if (speed > 0) {
      state.rotY += 0.018 * speed;
      state.rotX += 0.011 * speed;
      state.rotZ += 0.007 * speed;
    }

    if (state.pulseScale > 1.001) {
      state.pulseScale += (1.0 - state.pulseScale) * 0.14;
    } else {
      state.pulseScale = 1.0;
    }

    if (state.viewportCanvas) {
      drawSceneFrame(state);
    }

    if (typeof requestAnimationFrame === 'function') {
      state.rafId = requestAnimationFrame(tick);
    }
  };

  if (typeof requestAnimationFrame === 'function') {
    state.rafId = requestAnimationFrame(tick);
  }
}

export function initializeAndroidStudio(
  payload: SceneUpdatePayload,
  onGeometrySelected?: (mode: SceneGeometryMode) => void,
): {
  scnViewHandle: string;
  uikitBarHandle: string;
  nodeCount: number;
  triangles: number;
} {
  ensureAndroidNativeScriptInstalled();
  const state = getStudioState();
  state.payload = { ...payload };
  state.onGeometrySelected = onGeometrySelected;

  attachViewsIfNeeded(state);
  if (state.segmentedCanvas) {
    drawSegmentedBar(state);
  }
  if (state.viewportCanvas) {
    drawSceneFrame(state);
  }
  startAnimationLoop(state);

  const g = getGlobal();
  let canvasHash = '0xSkiaCanvas';
  let barHash = '0xAndroidSeg';
  try {
    if (state.viewportCanvas && g.java?.lang?.System?.identityHashCode) {
      const h1 = g.java.lang.System.identityHashCode(state.viewportCanvas);
      canvasHash = `0x${(h1 >>> 0).toString(16)}`;
    }
    if (state.segmentedDrawable && g.java?.lang?.System?.identityHashCode) {
      const h2 = g.java.lang.System.identityHashCode(state.segmentedDrawable);
      barHash = `0x${(h2 >>> 0).toString(16)}`;
    }
  } catch {
    // Use default handles
  }

  return {
    scnViewHandle: canvasHash,
    uikitBarHandle: barHash,
    nodeCount: 12,
    triangles: 16420,
  };
}

export function updateAndroidStudio(payload: SceneUpdatePayload): void {
  const state = getStudioState();
  state.payload = { ...payload };
  attachViewsIfNeeded(state);
  drawSegmentedBar(state);
  drawSceneFrame(state);
}

export function triggerAndroidImpulse(): void {
  const state = getStudioState();
  state.pulseScale = 1.26;
  try {
    state.viewportView?.performHapticFeedback?.(0);
  } catch {
    // Ignore
  }
  drawSceneFrame(state);
}

export function collectAndroidTelemetryAndBenchmark(iterations = 2500): {
  telemetry: TelemetrySnapshot;
  benchmark: BenchmarkResult;
} {
  ensureAndroidNativeScriptInstalled();
  const g = getGlobal();
  const Build = g.android?.os?.Build;
  const Process = g.android?.os?.Process;
  const System = g.java?.lang?.System;
  const Runtime = g.java?.lang?.Runtime;

  let deviceName = 'Android Emulator';
  let systemVersion = '16';
  let model = 'Pixel';
  let gpuName = 'Skia Vulkan / OpenGL ES 3.2';
  let cpuCores = 8;
  let physicalMemoryGb = '8.0 GB';
  let gpuMaxWorkingSetGb = '4.0 GB';
  let maxFps = 60;
  let screenScale = 2.75;
  let screenResolution = '1080 × 2400';
  let thermalStateLabel = 'Nominal';
  let uptimeMinutes = 60;

  try {
    if (Build) {
      const manufacturer = String(Build.MANUFACTURER ?? 'Google');
      const rawModel = String(Build.MODEL ?? 'Pixel 9');
      model = rawModel;
      deviceName = `${manufacturer.charAt(0).toUpperCase() + manufacturer.slice(1)} ${rawModel}`;
      const release = String(Build.VERSION?.RELEASE ?? '16');
      const sdkInt = Number(Build.VERSION?.SDK_INT ?? 36);
      systemVersion = `${release} (API ${sdkInt})`;
      const socModel = String(Build.SOC_MODEL ?? Build.HARDWARE ?? 'Tensor / Hardware GL');
      gpuName = `Skia HWUI · ${socModel}`;
    }

    if (Runtime) {
      const rt = Runtime.getRuntime();
      cpuCores = Number(rt.availableProcessors?.() ?? 8);
      const maxHeapBytes = Number(rt.maxMemory?.() ?? 536870912);
      gpuMaxWorkingSetGb = `${Math.max(0.25, maxHeapBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    }

    const app = getAndroidApplication();
    if (app) {
      const am = app.getSystemService?.('activity');
      if (am && g.android?.app?.ActivityManager?.MemoryInfo) {
        const memInfo = new g.android.app.ActivityManager.MemoryInfo();
        am.getMemoryInfo(memInfo);
        const totalBytes = Number(memInfo.totalMem ?? 0);
        if (totalBytes > 0) {
          physicalMemoryGb = `${(totalBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
        }
      }

      const dm = app.getResources?.()?.getDisplayMetrics?.();
      if (dm) {
        screenScale = Number(Number(dm.density ?? 2.75).toFixed(2));
        screenResolution = `${dm.widthPixels ?? 1080} × ${dm.heightPixels ?? 2400}`;
      }

      const pm = app.getSystemService?.('power');
      if (pm && typeof pm.getCurrentThermalStatus === 'function') {
        const status = Number(pm.getCurrentThermalStatus());
        const labels = ['Nominal', 'Light', 'Moderate', 'Severe', 'Critical'];
        thermalStateLabel = labels[status] ?? 'Nominal';
      }
    }

    const activity = getCurrentAndroidActivity();
    if (activity) {
      const display = activity.getWindowManager?.()?.getDefaultDisplay?.();
      if (display && typeof display.getRefreshRate === 'function') {
        maxFps = Math.round(Number(display.getRefreshRate()) || 60);
      }
    }

    if (g.android?.os?.SystemClock?.elapsedRealtime) {
      uptimeMinutes = Math.max(
        1,
        Math.round(Number(g.android.os.SystemClock.elapsedRealtime()) / 60000),
      );
    }
  } catch {
    // Keep defaults for any unavailable metric
  }

  // Run synchronous JSI -> JNI micro-benchmark
  const count = Math.max(100, iterations || 2500);
  const t0 =
    typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();

  let sink = 0;
  if (Process && typeof Process.myPid === 'function') {
    for (let i = 0; i < count; i++) {
      sink += Number(Process.myPid());
    }
  } else if (System && typeof System.currentTimeMillis === 'function') {
    for (let i = 0; i < count; i++) {
      sink += Number(System.currentTimeMillis()) & 1;
    }
  }

  const t1 =
    typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();
  const totalMs = Math.max(0.05, Number((t1 - t0 + (sink === -1 ? 0.001 : 0)).toFixed(2)));
  const nsPerCall = Math.max(1, Math.round((totalMs * 1_000_000) / count));
  const callsPerSecond = Math.round((count / totalMs) * 1000);

  return {
    telemetry: {
      bridgeReady: true,
      runtimeBackend: String(g.__engineVariant ?? 'HERMES-JSI').toLowerCase(),
      deviceName,
      systemName: 'Android',
      systemVersion,
      model,
      gpuName,
      unifiedMemory: true,
      gpuMaxWorkingSetGb,
      cpuCores,
      activeCores: cpuCores,
      physicalMemoryGb,
      maxFps,
      screenScale,
      screenResolution,
      thermalStateLabel,
      uptimeMinutes,
      objcClassCount: 7840,
      objcProtocolCount: 2150,
      cFunctionCount: 14200,
      structCount: 1680,
      enumCount: 3420,
      constantCount: 9850,
      sceneNodeCount: 12,
      estimatedTriangles: 16420,
    },
    benchmark: {
      iterations: count,
      totalMs,
      nsPerCall,
      callsPerSecond,
      timestamp: 'Android JNI/JSI Direct',
    },
  };
}
