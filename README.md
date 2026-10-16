# Angular Native + `@nativescript/react-native` (iOS & Android)

This project demonstrates **Angular 22** running on React Native's **Fabric** renderer via [Angular Native (`@ng-native`)](https://ng-native.com), paired with [`@nativescript/react-native` (`9.1.0-alpha.1`)](https://www.npmjs.com/package/@nativescript/react-native/v/9.1.0-alpha.1) to instantiate and control **native iOS (`SceneKit`, `Metal`, `UIKit`) and native Android (`android.graphics.Canvas`, `android.view.View`, `android.os.*`, `java.lang.*`) APIs directly from TypeScript**—co-located with Angular signals.

---

## What This Demo Shows

### On iOS (`SceneKit` + `Metal` + `UIKit`)
1. **Real-Time 3D `SceneKit` Metal Viewport (`SCNView`)**
   - Dynamically loads Apple's `/System/Library/Frameworks/SceneKit.framework` at runtime from TypeScript.
   - Allocates an `SCNView` on the iOS UI thread with `4× MSAA`, physically based rendering (`SCNLightingModelPhysicallyBased`), HDR camera bloom (`SCNCamera.bloomIntensity`), a 3-point studio lighting rig (`SCNLight`), and a multi-axis orbital gimbal sculpture (`SCNTorus`, `SCNBox`, `SCNSphere`) animated at 60–120 Hz via `SCNAction`.
2. **Embedded Native `UIKit` Controls (`UIVisualEffectView` + `UISegmentedControl`)**
   - Creates a real iOS `UIVisualEffectView` (`UIBlurEffectStyleSystemChromeMaterialDark`) containing a `UISegmentedControl`.
   - Subclasses `NSObject` at runtime in TypeScript (`NSObject.extend`) to register an Objective-C `@selector(onSegmentChanged:)` target-action that mutates the live `SCNScene` geometry directly on the UI thread when tapped.
3. **Live iOS Runtime & Hardware Introspection**
   - Queries `MTLCreateSystemDefaultDevice()`, `NSProcessInfo.processInfo`, `UIDevice.currentDevice`, `UIScreen.mainScreen`, and `__nativeScriptNativeApi.getMetadataStats()` directly over JSI, and includes a live **5,000-call Objective-C JSI micro-benchmark** (~200–500 nanoseconds per call on the UI thread).

### On Android (`android.graphics.Canvas` + `BitmapDrawable` + `JNI/JSI`)
1. **Real-Time 3D `android.graphics.Canvas` Orbital Viewport ([`src/nativescript/android-studio.ts`](src/nativescript/android-studio.ts))**
   - Uses `@nativescript/react-native`'s Android JSI runtime (`globalThis.android.*`, `globalThis.java.*`) to allocate native `android.graphics.Bitmap` (`ARGB_8888`), `android.graphics.Canvas`, `android.graphics.Paint`, `android.graphics.Path`, and `android.graphics.drawable.BitmapDrawable` buffers directly from TypeScript.
   - Renders the matching 3-axis orbital gimbal rings, 3D geometry primitives (`Torus Ring`, `Chamfer Box`, `Geodesic`), specular highlights, and 6 harmonic satellites at 60 fps with interactive touch-drag 3D orbit.
2. **Native Android Segmented Bar**
   - Renders and attaches a custom `BitmapDrawable` + native touch handler (`MotionEvent` + `HapticFeedbackConstants.CONTEXT_CLICK`) onto the Fabric `ReactViewGroup` for instant geometry switching.
3. **Live Android Runtime & Hardware Introspection**
   - Queries `android.os.Build`, `java.lang.Runtime.getRuntime()`, `android.app.ActivityManager.MemoryInfo`, `android.os.PowerManager`, `android.util.DisplayMetrics`, and `android.os.SystemClock` directly from TypeScript over JSI/JNI, plus a live **`android.os.Process.myPid()` JSI/JNI micro-benchmark**.

---

## How `@nativescript/react-native` Makes This Possible

Normally, a React Native or Angular Native app can only access native platform APIs that have been explicitly wrapped and compiled into C++ JSI HostObjects, TurboModules, or Fabric ViewManagers ahead of time.

`@nativescript/react-native` embeds the **NativeScript JSI Runtime** directly into the Hermes JavaScript engine on both platforms:

### iOS Architecture (`NativeScriptJSI` + `libffi`)
1. **Precompiled iOS SDK Metadata + `libffi` Dynamic Dispatch**
   - During the CocoaPods build (`NativeScriptReactNative.podspec`), a metadata generator inspects the active Xcode iOS SDK headers and compiles a compact binary metadata table (`metadata.arm64.bin` / `metadata.x86_64.bin`) describing **every Objective-C class, protocol, selector, C function, struct, and enum** in the iOS SDK (~34,000+ symbols).
   - At runtime, when TypeScript accesses `globalThis.SCNView` or calls `MTLCreateSystemDefaultDevice()`, NativeScript's JSI host object looks up the symbol in the metadata table and invokes `objc_msgSend` or the C function pointer directly via `libffi`—synchronously and in-process.
2. **Dual-Runtime Installation (JS Thread + UI Worklet Thread)**
   - Calling `NativeScript.installWorklets(require('react-native-worklets'))` and `NativeScript.init()` installs the Objective-C JSI bindings into **both** the main Hermes JS runtime and the `react-native-worklets` UI runtime so `"worklet"` functions passed to `NativeScript.runOnUI(...)` execute synchronously on `dispatch_get_main_queue()`.
3. **Fabric `UIKitView` Host (`<ns-uikit-view>`)**
   - `@nativescript/react-native` ships a Fabric component (`NativeScriptUIView` on iOS) that accepts a `nativeViewHandle` string (`0x...` pointer address) created by `NativeScript.registerNativeView(uiView)` on the UI thread and mounts the `UIView *` directly inside the Fabric layout tree.

### Android Architecture (`libnativescript_rn.so` + Classpath Metadata)
1. **Gradle Classpath Metadata Generation (`nativescript.gradle`)**
   - Applying `../../node_modules/@nativescript/react-native/android/nativescript.gradle` in [`android/app/build.gradle`](android/app/build.gradle) registers `:app:generateNativeScriptMetadataDebug`, which scans `android.jar` and every resolved AAR/class directory on the app's classpath (~120,000+ Java/Kotlin methods and ~46,000+ fields) into `treeNodeStream.dat`, `treeStringsStream.dat`, and `treeValueStream.dat`.
2. **In-Process JSI ↔ JNI Attachment (`com.tns.Runtime.attachToHostRuntime`)**
   - At runtime, calling `NativeScriptNativeApi.install("")` extracts the metadata assets and attaches `libnativescript_rn.so` directly to React Native's `jsi::Runtime *` pointer (`reactContext.getJavaScriptContextHolder().get()`), exposing `globalThis.java`, `globalThis.android`, `globalThis.androidx`, and the app's own packages (`globalThis.org.nativescript.ngnativewithns.*`) synchronously in TypeScript.

---

## How It Is Used in This Project

### 1. Registering the Cross-Platform Host View in Angular Native ([`src/nativescript/ns-uikit-view.ts`](src/nativescript/ns-uikit-view.ts))

Angular Native (`@ng-native/core`) maps component selectors to React Native Fabric component names through `registerElement`. On iOS it maps to `NativeScriptUIView`; on Android it maps to `RCTView` with `collapsable={false}` so the underlying `ReactViewGroup` is preserved for `nativeID` lookup and `BitmapDrawable` attachment:

```ts
import { ChangeDetectionStrategy, Component, NO_ERRORS_SCHEMA, input } from '@angular/core';
import { registerElement } from '@ng-native/core';

registerElement('ns-uikit-raw', () => (detectIsAndroid() ? 'RCTView' : 'NativeScriptUIView'));
```

### 2. Building Native iOS `SCNView` and `UIKit` Views on the UI Thread ([`src/nativescript/scene-worklets.ts`](src/nativescript/scene-worklets.ts))

Inside `"worklet"` functions on iOS, any Objective-C class in the iOS SDK can be instantiated and mutated on the UI thread and registered with Fabric via `__ns_registerNativeView(view)`:

```ts
export const SceneWorklets = {
  buildSceneKitStudioWorklet(payload: SceneUpdatePayload) {
    'worklet';
    const g = globalThis as Record<string, any>;

    // Dynamically load SceneKit.framework at runtime
    g.NSBundle.bundleWithPath('/System/Library/Frameworks/SceneKit.framework')?.load();

    // Instantiate a real iOS SCNView and SCNScene
    const scnView = g.SCNView.alloc().initWithFrame({
      origin: { x: 0, y: 0 },
      size: { width: 380, height: 290 },
    });
    const scene = g.SCNScene.scene();
    scnView.scene = scene;
    scnView.allowsCameraControl = true;
    scnView.antialiasingMode = 2; // SCNMultisampling4X

    // Return the native pointer handle ('0x...') to bind to <ns-uikit-view>
    const scnViewHandle = g.__ns_registerNativeView(scnView);
    return { scnViewHandle };
  },
};
```

> **Note on `@ng-native/metro` HMR + Worklets:** `@ng-native/metro` wraps top-level function declarations in `.ts` files with an HMR proxy (`cell.stays`), which would hide the `__workletHash` property attached by `react-native-worklets/plugin`. Exporting worklets as methods on an object (`export const SceneWorklets = { ... }`) preserves `__workletHash` untouched while keeping full TypeScript type checking.

### 3. Rendering 3D `android.graphics.Canvas` Views via JSI/JNI ([`src/nativescript/android-studio.ts`](src/nativescript/android-studio.ts))

On Android, [`src/nativescript/android-studio.ts`](src/nativescript/android-studio.ts) installs `NativeScriptNativeApi` on the Hermes runtime and drives native `android.graphics.Bitmap`, `Canvas`, `Paint`, `Path`, and `BitmapDrawable` objects directly from TypeScript:

```ts
const Bitmap = g.android.graphics.Bitmap;
const Canvas = g.android.graphics.Canvas;
const Paint = g.android.graphics.Paint;
const BitmapDrawable = g.android.graphics.drawable.BitmapDrawable;

state.viewportBitmap = Bitmap.createBitmap(680, 480, Bitmap.Config.ARGB_8888);
state.viewportCanvas = new Canvas(state.viewportBitmap);
state.viewportDrawable = new BitmapDrawable(resources, state.viewportBitmap);
```

### 4. Connecting Angular Signals to Native Runtime APIs ([`src/nativescript/nativescript-lab.service.ts`](src/nativescript/nativescript-lab.service.ts))

`NativeScriptLabService` detects the active platform (`ios` vs `android`), initializes the corresponding NativeScript JSI bridge, and dispatches live scene updates whenever an Angular signal (`geometry`, `theme`, `speed`, `roughness`, `wireframe`) changes.

---

## Why Use NativeScript Here vs. Traditional Routes?

When building an Angular Native (or React Native) app that needs specialized native capabilities—such as a 3D `SceneKit` viewport, custom `android.graphics.Canvas` hardware pipelines, `AVFoundation` audio graphs, or platform controls—you traditionally have two choices:

| Approach | What It Requires | Friction & Limitations |
| :--- | :--- | :--- |
| **1. Third-Party Wrapper Library** | Hope someone built and maintained a Fabric-compatible wrapper for your exact iOS and Android APIs, then write an Angular Native directive around it. | • Often unmaintained or incompatible with the New Architecture (Fabric).<br>• Only exposes the tiny subset of props the library author decided to wrap.<br>• Every library adds native pod/Gradle dependencies and increases binary maintenance. |
| **2. Custom TurboModule + Fabric ViewManager** | Write Objective-C++ / Swift and Kotlin / C++ glue code, Codegen specs, ShadowNodes, and `ViewManager` classes in `ios/` and `android/`. | • Every time you want to tweak a `SCNCamera` bloom property, add a `SCNLight`, or read a new `Build` / `ActivityManager` metric, you must edit native code and **rebuild Xcode / Gradle**.<br>• Splits application logic across TypeScript, Objective-C++, Swift, and Kotlin. |
| **3. `@nativescript/react-native` (This Repo)** | Call the iOS SDK (`globalThis.SCNView`, `UISegmentedControl`, `MTLCreateSystemDefaultDevice`) and Android SDK (`globalThis.android.graphics.*`, `android.os.*`, `java.lang.*`) directly from TypeScript. | • **Zero native wrapper boilerplate** when calling new iOS or Android SDK APIs.<br>• **100% of the iOS SDK & Android classpath** is immediately available in TypeScript.<br>• **Co-located with Angular signals**: 3D rendering, native event handlers, and UI state live in the same TypeScript codebase and update instantly over Metro Fast Refresh. |

---

## Commands

```sh
npm start           # Start Metro bundler
npm run ios         # Build and run on the iOS simulator
npm run android     # Build and run on the Android emulator
npm test            # Run Vitest unit tests in Node (no simulator needed)
npm run typecheck   # Run Angular Native compiler & TypeScript typecheck
```

