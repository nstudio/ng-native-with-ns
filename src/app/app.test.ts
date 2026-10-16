import { render, screen, userEvent } from '@ng-native/testing';
import { expect, test } from 'vitest';
import { App } from './app.ts';

test('renders SceneKit & UIKit on Fabric studio with native views and updates signals', async () => {
  await render(App);

  expect(screen.getByText('SceneKit & UIKit on Fabric')).toBeTruthy();
  expect(screen.getByTestId('scn-viewport')).toBeTruthy();
  expect(screen.getByTestId('uikit-segmented-bar')).toBeTruthy();

  const user = userEvent.setup();

  // Trigger Haptic Impulse
  await user.press(screen.getByRole('button', { name: 'Trigger Haptic Impulse' }));
  expect(screen.getByText('#1')).toBeTruthy();

  // Switch geometry primitive to Chamfer Box
  await user.press(screen.getByRole('button', { name: 'Geometry Chamfer Box' }));
  expect(
    screen.getByText('SCNBox.boxWithWidthHeightLengthChamferRadius(1.75, 1.75, 1.75, 0.36)'),
  ).toBeTruthy();

  // Switch material finish to Titanium
  await user.press(screen.getByRole('button', { name: 'Finish Titanium' }));
  expect(
    screen.getByText('SCNMaterial · Raw Titanium (metalness 0.92, roughness 0.14)'),
  ).toBeTruthy();

  // Toggle Wireframe Mesh
  await user.press(screen.getByRole('button', { name: 'Toggle Wireframe Mesh' }));
  expect(screen.getByText('Lines')).toBeTruthy();

  // Run 5,000 Objective-C Calls benchmark
  await user.press(
    screen.getByRole('button', { name: 'Benchmark 5000 Objective-C Calls' }),
  );
  expect(screen.getByText('5,000 calls in 2.45 ms (2.04M/s)')).toBeTruthy();
});
