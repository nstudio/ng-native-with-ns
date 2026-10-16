import { Component, OnInit, computed, inject } from '@angular/core';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from '@ng-native/components';
import { NsUIKitView } from '../nativescript/ns-uikit-view.ts';
import {
  NativeScriptLabService,
  type SceneColorTheme,
  type SceneGeometryMode,
} from '../nativescript/nativescript-lab.service.ts';

@Component({
  selector: 'app-root',
  imports: [SafeAreaView, ScrollView, View, Text, Pressable, NsUIKitView],
  host: {
    style: 'flex: 1',
  },
  template: `
    <safe-area-view class="screen">
      <scroll-view class="scroller">
        <view class="container">
          <!-- Editorial Header -->
          <view class="header">
            <text class="kicker">
              {{ lab.platform() === 'android' ? 'Angular 22  ·  NativeScript 9.1  ·  Android JSI' : 'Angular 22  ·  NativeScript 9.1  ·  iOS JSI' }}
            </text>
            <text class="title" accessibilityRole="header">SceneKit &amp; UIKit on Fabric</text>
            <text class="subtitle">
              {{ lab.platform() === 'android' ? 'Native Android Canvas 3D views and Java/JNI APIs instantiated directly from TypeScript inside an Angular Native component tree.' : 'Native iOS views and Objective-C APIs instantiated directly from TypeScript inside an Angular Native component tree.' }}
            </text>
          </view>

          <!-- Primary Stage: 3D Viewport + Native Segmented Bar -->
          <view class="stage-card">
            <view class="stage-meta-bar">
              <view class="stage-meta-left">
                <view class="live-indicator" [attr.data-theme]="lab.theme()" />
                <text class="stage-class-name">
                  {{ lab.platform() === 'android' ? 'android.graphics.Canvas' : 'SCNView' }}
                </text>
                <text class="stage-pointer">
                  {{ lab.scnViewHandle() ? lab.scnViewHandle() : '0x0' }}
                </text>
              </view>
              <text class="stage-meta-right">
                {{ lab.telemetry().sceneNodeCount }} nodes · {{ lab.telemetry().maxFps }} Hz {{ lab.platform() === 'android' ? 'Skia' : 'Metal' }}
              </text>
            </view>

            <view class="viewport-container">
              <ns-uikit-view
                class="scn-canvas"
                nativeID="scn-viewport"
                debugName="SceneKitMetalViewport"
                [nativeViewHandle]="lab.scnViewHandle()"
              />
              <view class="viewport-caption-bar">
                <text class="viewport-gesture-hint">Drag to orbit · Pinch to zoom</text>
                <text class="viewport-tris-label">16.4k tris</text>
              </view>
            </view>

            <!-- Live Native Call Trace -->
            <view class="trace-bar">
              <text class="trace-label">
                {{ lab.platform() === 'android' ? 'JNI Call' : 'objc_msgSend' }}
              </text>
              <text class="trace-value" [numberOfLines]="1">{{ lab.statusMessage() }}</text>
            </view>

            <view class="divider" />

            <!-- Embedded Native Segmented Control -->
            <view class="uikit-section">
              <view class="uikit-header-row">
                <text class="uikit-title">
                  {{ lab.platform() === 'android' ? 'Native Android Segmented Bar' : 'UIKit UISegmentedControl' }}
                </text>
                <text class="uikit-sub">
                  {{ lab.platform() === 'android' ? 'View.OnTouchListener' : 'NSObject.extend' }}
                </text>
              </view>
              <view class="uikit-bar-frame">
                <ns-uikit-view
                  class="uikit-native-bar"
                  nativeID="uikit-segmented-bar"
                  debugName="UIKitSegmentedBar"
                  [nativeViewHandle]="lab.uikitBarHandle()"
                />
              </view>
            </view>
          </view>

          <!-- Studio Controls: Geometry, Finish & Scene Actions -->
          <view class="section-card">
            <view class="section-header">
              <text class="section-title">Scene Parameters</text>
              <text class="section-caption">Angular Signals → UI Worklet</text>
            </view>

            <!-- Geometry Topology -->
            <view class="control-block">
              <text class="field-label">Geometry Primitive</text>
              <view class="pill-group">
                @for (item of geometryOptions; track item.id) {
                  <pressable
                    class="pill-button"
                    [attr.data-active]="lab.geometry() === item.id ? 'true' : null"
                    accessibilityRole="button"
                    [accessibilityLabel]="'Geometry ' + item.label"
                    [accessibilityState]="{ selected: lab.geometry() === item.id }"
                    (press)="selectGeometry(item.id)"
                  >
                    <text
                      class="pill-button-title"
                      [attr.data-active]="lab.geometry() === item.id ? 'true' : null"
                    >
                      {{ item.label }}
                    </text>
                    <text class="pill-button-api">{{ item.api }}</text>
                  </pressable>
                }
              </view>
            </view>

            <!-- PBR Finish Swatches -->
            <view class="control-block">
              <text class="field-label">SCNMaterial Finish</text>
              <view class="swatch-row">
                @for (t of themeOptions; track t.id) {
                  <pressable
                    class="swatch-button"
                    [attr.data-active]="lab.theme() === t.id ? 'true' : null"
                    accessibilityRole="button"
                    [accessibilityLabel]="'Finish ' + t.label"
                    [accessibilityState]="{ selected: lab.theme() === t.id }"
                    (press)="selectTheme(t.id)"
                  >
                    <view class="swatch-dot" [style]="{ backgroundColor: t.swatch }" />
                    <text
                      class="swatch-label"
                      [attr.data-active]="lab.theme() === t.id ? 'true' : null"
                    >
                      {{ t.label }}
                    </text>
                  </pressable>
                }
              </view>
            </view>

            <!-- Precision Instrument Controls -->
            <view class="control-block">
              <text class="field-label">Interactive Dispatch</text>
              <view class="instrument-grid">
                <pressable
                  class="instrument-cell"
                  accessibilityRole="button"
                  accessibilityLabel="Trigger Haptic Impulse"
                  (press)="triggerPulse()"
                >
                  <view class="instrument-top">
                    <text class="instrument-name">Impulse</text>
                    <text class="instrument-readout accent-readout">#{{ lab.pulseCount() }}</text>
                  </view>
                  <text class="instrument-api">SCNAction + Taptic</text>
                </pressable>

                <pressable
                  class="instrument-cell"
                  accessibilityRole="button"
                  accessibilityLabel="Cycle Orbit Speed"
                  (press)="cycleSpeed()"
                >
                  <view class="instrument-top">
                    <text class="instrument-name">Orbit Speed</text>
                    <text class="instrument-readout">{{ lab.speed().toFixed(1) }}×</text>
                  </view>
                  <text class="instrument-api">SCNNode.speed</text>
                </pressable>

                <pressable
                  class="instrument-cell"
                  accessibilityRole="button"
                  accessibilityLabel="Toggle Surface Roughness"
                  (press)="toggleSurface()"
                >
                  <view class="instrument-top">
                    <text class="instrument-name">Roughness</text>
                    <text class="instrument-readout">{{ surfaceFinishLabel() }}</text>
                  </view>
                  <text class="instrument-api">SCNMaterial.roughness</text>
                </pressable>

                <pressable
                  class="instrument-cell"
                  [attr.data-active]="lab.wireframe() ? 'true' : null"
                  accessibilityRole="button"
                  accessibilityLabel="Toggle Wireframe Mesh"
                  [accessibilityState]="{ checked: lab.wireframe() }"
                  (press)="toggleWireframe()"
                >
                  <view class="instrument-top">
                    <text class="instrument-name">Mesh Mode</text>
                    <text class="instrument-readout">{{ lab.wireframe() ? 'Lines' : 'Solid' }}</text>
                  </view>
                  <text class="instrument-api">SCNMaterial.fillMode</text>
                </pressable>
              </view>
            </view>
          </view>

          <!-- Live Runtime & Hardware Inspector -->
          <view class="section-card">
            <view class="section-header">
              <text class="section-title">
                {{ lab.platform() === 'android' ? 'Android Runtime Inspector' : 'iOS Runtime Inspector' }}
              </text>
              <text class="section-caption">Queried live via JSI</text>
            </view>

            <view class="spec-table">
              <view class="spec-row">
                <view class="spec-key-col">
                  <text class="spec-symbol">
                    {{ lab.platform() === 'android' ? 'android.os.Build.SOC_MODEL' : 'MTLCreateSystemDefaultDevice()' }}
                  </text>
                  <text class="spec-desc">
                    {{ lab.platform() === 'android' ? 'Hardware renderer &amp; VM heap' : 'Metal GPU device &amp; working set' }}
                  </text>
                </view>
                <view class="spec-val-col">
                  <text class="spec-val" [numberOfLines]="1">{{ lab.telemetry().gpuName }}</text>
                  <text class="spec-sub">{{ lab.telemetry().gpuMaxWorkingSetGb }} unified</text>
                </view>
              </view>

              <view class="spec-divider" />

              <view class="spec-row">
                <view class="spec-key-col">
                  <text class="spec-symbol">
                    {{ lab.platform() === 'android' ? 'ActivityManager.MemoryInfo' : 'NSProcessInfo.processInfo' }}
                  </text>
                  <text class="spec-desc">Active silicon cores &amp; RAM</text>
                </view>
                <view class="spec-val-col">
                  <text class="spec-val">
                    {{ lab.telemetry().activeCores }} cores · {{ lab.telemetry().physicalMemoryGb }}
                  </text>
                  <text class="spec-sub">Thermal: {{ lab.telemetry().thermalStateLabel }}</text>
                </view>
              </view>

              <view class="spec-divider" />

              <view class="spec-row">
                <view class="spec-key-col">
                  <text class="spec-symbol">
                    {{ lab.platform() === 'android' ? 'Display.getRefreshRate()' : 'UIScreen.mainScreen' }}
                  </text>
                  <text class="spec-desc">Display refresh &amp; native bounds</text>
                </view>
                <view class="spec-val-col">
                  <text class="spec-val">
                    {{ lab.telemetry().maxFps }} Hz · {{ lab.telemetry().screenScale }}× scale
                  </text>
                  <text class="spec-sub">{{ lab.telemetry().screenResolution }} px</text>
                </view>
              </view>

              <view class="spec-divider" />

              <view class="spec-row">
                <view class="spec-key-col">
                  <text class="spec-symbol">
                    {{ lab.platform() === 'android' ? 'Classpath Metadata' : 'Objective-C Metadata' }}
                  </text>
                  <text class="spec-desc">Exposed to TypeScript at runtime</text>
                </view>
                <view class="spec-val-col">
                  <text class="spec-val">
                    {{ lab.telemetry().objcClassCount.toLocaleString() }} classes
                  </text>
                  <text class="spec-sub">
                    {{ lab.telemetry().cFunctionCount.toLocaleString() }} methods · {{ lab.totalBridgedSymbols().toLocaleString() }} symbols
                  </text>
                </view>
              </view>

              <view class="spec-divider" />

              <view class="spec-row">
                <view class="spec-key-col">
                  <text class="spec-symbol">JSI Call Latency</text>
                  <text class="spec-desc">Synchronous native dispatch</text>
                </view>
                <view class="spec-val-col">
                  <text class="spec-val accent-readout">
                    {{ lab.benchmark().nsPerCall }} ns / call
                  </text>
                  <text class="spec-sub">
                    {{ lab.benchmark().iterations.toLocaleString() }} calls in {{ lab.benchmark().totalMs }} ms ({{ formattedCallsPerSec() }}/s)
                  </text>
                </view>
              </view>
            </view>

            <pressable
              class="benchmark-button"
              accessibilityRole="button"
              accessibilityLabel="Benchmark 5000 Objective-C Calls"
              (press)="runBenchmark()"
            >
              <text class="benchmark-button-text">
                {{ lab.isBenchmarking() ? 'Running Benchmark...' : lab.platform() === 'android' ? 'Benchmark 5,000 JNI/JSI Calls' : 'Benchmark 5,000 Objective-C Calls' }}
              </text>
            </pressable>
          </view>
        </view>
      </scroll-view>
    </safe-area-view>
  `,
  styles: `
    .screen {
      flex: 1;
      background-color: #0b0b0d;
    }

    .scroller {
      flex: 1;
    }

    .container {
      padding: 56px 18px 40px 18px;
      gap: 18px;
    }

    /* Editorial Header */
    .header {
      padding-left: 2px;
      padding-right: 2px;
      gap: 6px;
    }

    .kicker {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.4px;
      color: #e07a47;
    }

    .title {
      font-size: 26px;
      font-weight: 700;
      letter-spacing: -0.4px;
      color: #f4f4f5;
    }

    .subtitle {
      font-size: 13px;
      line-height: 19px;
      color: #a1a1aa;
    }

    /* Primary Stage Card */
    .stage-card {
      background-color: #131316;
      border-radius: 18px;
      border-width: 1px;
      border-color: #242429;
      padding: 14px;
      gap: 12px;
    }

    .stage-meta-bar {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      padding-left: 2px;
      padding-right: 2px;
    }

    .stage-meta-left {
      flex-direction: row;
      align-items: center;
      gap: 7px;
    }

    .live-indicator {
      width: 7px;
      height: 7px;
      border-radius: 4px;
      background-color: #e07a47;
    }

    .live-indicator[data-theme='titanium'] {
      background-color: #d4d4d8;
    }

    .live-indicator[data-theme='obsidian'] {
      background-color: #a1a1aa;
    }

    .live-indicator[data-theme='cobalt'] {
      background-color: #3b82f6;
    }

    .stage-class-name {
      font-size: 12px;
      font-weight: 700;
      color: #f4f4f5;
    }

    .stage-pointer {
      font-size: 11px;
      font-weight: 500;
      color: #71717a;
    }

    .stage-meta-right {
      font-size: 11px;
      font-weight: 500;
      color: #a1a1aa;
    }

    .viewport-container {
      height: 268px;
      border-radius: 12px;
      overflow: hidden;
      background-color: #0d0d0f;
      border-width: 1px;
      border-color: #1f1f24;
      position: relative;
    }

    .scn-canvas {
      flex: 1;
      width: 100%;
      height: 100%;
    }

    .viewport-caption-bar {
      position: absolute;
      bottom: 10px;
      left: 12px;
      right: 12px;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
    }

    .viewport-gesture-hint {
      font-size: 11px;
      font-weight: 500;
      color: #a1a1aa;
      background-color: rgba(13, 13, 15, 0.75);
      padding: 4px 9px;
      border-radius: 6px;
    }

    .viewport-tris-label {
      font-size: 11px;
      font-weight: 500;
      color: #71717a;
      background-color: rgba(13, 13, 15, 0.75);
      padding: 4px 8px;
      border-radius: 6px;
    }

    .trace-bar {
      flex-direction: row;
      align-items: center;
      background-color: #0d0d10;
      border-radius: 8px;
      padding: 8px 10px;
      border-width: 1px;
      border-color: #1e1e23;
      gap: 8px;
    }

    .trace-label {
      font-size: 10px;
      font-weight: 700;
      color: #e07a47;
    }

    .trace-value {
      flex: 1;
      font-size: 11px;
      font-weight: 500;
      color: #d4d4d8;
    }

    .divider {
      height: 1px;
      background-color: #222227;
    }

    .uikit-section {
      gap: 8px;
    }

    .uikit-header-row {
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      padding-left: 2px;
      padding-right: 2px;
    }

    .uikit-title {
      font-size: 11px;
      font-weight: 600;
      color: #a1a1aa;
    }

    .uikit-sub {
      font-size: 11px;
      font-weight: 500;
      color: #71717a;
    }

    .uikit-bar-frame {
      height: 44px;
      border-radius: 10px;
      overflow: hidden;
      background-color: #18181c;
      border-width: 1px;
      border-color: #27272d;
    }

    .uikit-native-bar {
      flex: 1;
      width: 100%;
      height: 100%;
    }

    /* Section Cards */
    .section-card {
      background-color: #131316;
      border-radius: 18px;
      border-width: 1px;
      border-color: #242429;
      padding: 16px;
      gap: 16px;
    }

    .section-header {
      flex-direction: row;
      justify-content: space-between;
      align-items: baseline;
    }

    .section-title {
      font-size: 15px;
      font-weight: 700;
      color: #f4f4f5;
    }

    .section-caption {
      font-size: 11px;
      font-weight: 500;
      color: #71717a;
    }

    .control-block {
      gap: 8px;
    }

    .field-label {
      font-size: 11px;
      font-weight: 600;
      color: #a1a1aa;
    }

    .pill-group {
      flex-direction: row;
      gap: 8px;
    }

    .pill-button {
      flex: 1;
      background-color: #18181c;
      border-radius: 10px;
      padding: 10px 8px;
      border-width: 1px;
      border-color: #27272d;
      align-items: center;
      gap: 2px;
    }

    .pill-button[data-active='true'] {
      background-color: #1f1916;
      border-color: #e07a47;
    }

    .pill-button-title {
      font-size: 12px;
      font-weight: 600;
      color: #d4d4d8;
    }

    .pill-button-title[data-active='true'] {
      color: #f4f4f5;
    }

    .pill-button-api {
      font-size: 10px;
      font-weight: 500;
      color: #71717a;
    }

    .swatch-row {
      flex-direction: row;
      gap: 8px;
    }

    .swatch-button {
      flex: 1;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      background-color: #18181c;
      border-radius: 10px;
      padding: 9px 6px;
      border-width: 1px;
      border-color: #27272d;
      gap: 6px;
    }

    .swatch-button[data-active='true'] {
      background-color: #1e1e24;
      border-color: #a1a1aa;
    }

    .swatch-dot {
      width: 10px;
      height: 10px;
      border-radius: 5px;
    }

    .swatch-label {
      font-size: 11px;
      font-weight: 600;
      color: #a1a1aa;
    }

    .swatch-label[data-active='true'] {
      color: #f4f4f5;
    }

    /* Instrument Grid */
    .instrument-grid {
      flex-direction: row;
      flex-wrap: wrap;
      gap: 8px;
    }

    .instrument-cell {
      width: 48%;
      flex-grow: 1;
      background-color: #18181c;
      border-radius: 10px;
      padding: 11px 12px;
      border-width: 1px;
      border-color: #27272d;
      gap: 4px;
    }

    .instrument-cell[data-active='true'] {
      background-color: #1f1916;
      border-color: #e07a47;
    }

    .instrument-top {
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
    }

    .instrument-name {
      font-size: 12px;
      font-weight: 600;
      color: #f4f4f5;
    }

    .instrument-readout {
      font-size: 12px;
      font-weight: 700;
      color: #d4d4d8;
    }

    .accent-readout {
      color: #e07a47;
    }

    .instrument-api {
      font-size: 10px;
      font-weight: 500;
      color: #71717a;
    }

    /* Specification Table */
    .spec-table {
      background-color: #0e0e11;
      border-radius: 12px;
      border-width: 1px;
      border-color: #202026;
      padding: 4px 12px;
    }

    .spec-row {
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      padding-top: 10px;
      padding-bottom: 10px;
      gap: 12px;
    }

    .spec-key-col {
      flex: 1;
      flex-shrink: 1;
      gap: 2px;
    }

    .spec-symbol {
      font-size: 11px;
      font-weight: 600;
      color: #e4e4e7;
    }

    .spec-desc {
      font-size: 10px;
      color: #71717a;
    }

    .spec-val-col {
      align-items: flex-end;
      flex-shrink: 0;
      gap: 2px;
    }

    .spec-val {
      font-size: 11px;
      font-weight: 600;
      color: #f4f4f5;
    }

    .spec-sub {
      font-size: 10px;
      color: #a1a1aa;
    }

    .spec-divider {
      height: 1px;
      background-color: #1c1c22;
    }

    .benchmark-button {
      background-color: #1c1c21;
      border-radius: 10px;
      border-width: 1px;
      border-color: #2e2e36;
      padding: 12px 14px;
      align-items: center;
      justify-content: center;
    }

    .benchmark-button-text {
      font-size: 12px;
      font-weight: 600;
      color: #f4f4f5;
    }
  `,
})
export class App implements OnInit {
  readonly lab = inject(NativeScriptLabService);

  readonly geometryOptions: ReadonlyArray<{
    id: SceneGeometryMode;
    label: string;
    api: string;
  }> = [
    { id: 'torus', label: 'Torus Ring', api: 'SCNTorus' },
    { id: 'gyro', label: 'Chamfer Box', api: 'SCNBox' },
    { id: 'lattice', label: 'Geodesic', api: 'SCNSphere' },
  ];

  readonly themeOptions: ReadonlyArray<{
    id: SceneColorTheme;
    label: string;
    swatch: string;
  }> = [
    { id: 'copper', label: 'Copper', swatch: '#e07a47' },
    { id: 'titanium', label: 'Titanium', swatch: '#d4d4d8' },
    { id: 'obsidian', label: 'Obsidian', swatch: '#52525b' },
    { id: 'cobalt', label: 'Cobalt', swatch: '#3b82f6' },
  ];

  readonly surfaceFinishLabel = computed(() =>
    this.lab.roughness() <= 0.1 ? 'Mirror' : 'Satin',
  );

  readonly formattedCallsPerSec = computed(() => {
    const cps = this.lab.benchmark().callsPerSecond;
    if (cps >= 1_000_000) {
      return `${(cps / 1_000_000).toFixed(2)}M`;
    }
    if (cps >= 1_000) {
      return `${(cps / 1_000).toFixed(0)}K`;
    }
    return String(cps);
  });

  ngOnInit(): void {
    void this.lab.initializeStudio();
  }

  selectGeometry(mode: SceneGeometryMode): void {
    void this.lab.setGeometry(mode);
  }

  selectTheme(theme: SceneColorTheme): void {
    void this.lab.setTheme(theme);
  }

  triggerPulse(): void {
    void this.lab.triggerKineticPulse();
  }

  cycleSpeed(): void {
    void this.lab.cycleSpeed();
  }

  toggleSurface(): void {
    void this.lab.toggleMaterialPreset();
  }

  toggleWireframe(): void {
    void this.lab.toggleWireframe();
  }

  runBenchmark(): void {
    void this.lab.runJsiBenchmark(5000);
  }
}
