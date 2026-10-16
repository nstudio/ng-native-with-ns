import { Directive, input } from '@angular/core';
import { ViewBase } from '@ng-native/components';
import { registerViewName } from '@ng-native/fabric';

declare const require: ((id: string) => unknown) | undefined;

let registered = false;

function isAndroidPlatform(): boolean {
  try {
    const proc = (globalThis as Record<string, any>).process;
    if (proc?.env?.VITEST || proc?.env?.NODE_ENV === 'test') {
      return false;
    }
    if (typeof require === 'function') {
      const rn = require('react-native') as { Platform?: { OS?: string } };
      return rn?.Platform?.OS === 'android';
    }
  } catch {
    // Ignore in non-RN environments
  }
  return false;
}

/**
 * Registers `<ns-uikit-view>` in Angular Native's Fabric view registry:
 * - On iOS: maps to `@nativescript/react-native`'s `NativeScriptUIView` Fabric component.
 * - On Android: maps to a non-collapsable `RCTView` (`ReactViewGroup`) whose `nativeID` is bound
 *   at runtime via `@nativescript/react-native` JNI/JSI (`android.graphics.Canvas` + `BitmapDrawable`).
 */
export function registerNativeScriptViews(): void {
  if (registered) {
    return;
  }
  registered = true;
  const fabricComponentName = isAndroidPlatform() ? 'RCTView' : 'NativeScriptUIView';
  registerViewName('ns-uikit-view', fabricComponentName, { collapsable: false });
}

@Directive({
  selector: 'ns-uikit-view',
  host: {
    '[nativeViewHandle]': 'nativeViewHandle()',
    '[childrenViewHandle]': 'childrenViewHandle()',
    '[controllerHandle]': 'controllerHandle()',
    '[debugName]': 'debugName()',
    '[hostId]': 'hostId()',
    '[hostReadyId]': 'hostReadyId()',
    '[updateRevision]': 'updateRevision()',
    '[mountedRevision]': 'mountedRevision()',
  },
})
export class NsUIKitView extends ViewBase {
  readonly nativeViewHandle = input<string | undefined>();
  readonly childrenViewHandle = input<string | undefined>();
  readonly controllerHandle = input<string | undefined>();
  readonly debugName = input<string | undefined>();
  readonly hostId = input<string | undefined>();
  readonly hostReadyId = input<string | undefined>();
  readonly updateRevision = input<number | undefined>();
  readonly mountedRevision = input<number | undefined>();
}

registerNativeScriptViews();
