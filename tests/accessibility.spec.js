// @ts-check
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const PAGES_TO_CHECK = [
  { name: 'Home', path: '/' },
  { name: 'Menu', path: '/products.html' },
  { name: 'Gallery', path: '/gallery.html' },
  { name: 'About', path: '/about.html' },
  { name: 'Contact', path: '/contact.html' },
  { name: 'Custom Order', path: '/custom-order.html' },
];

async function runAxe(page) {
  return new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .exclude('#dera-cart-sidebar')
    .analyze();
}

for (const p of PAGES_TO_CHECK) {
  test(`Axe: ${p.name} has no critical WCAG violations`, async ({ page }) => {
    await page.goto(p.path);
    const results = await runAxe(page);
    const critical = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    expect(
      critical,
      `${p.name}:\n${critical.map(v => `  [${v.impact}] ${v.id}: ${v.description}\n    ${v.nodes[0]?.html || ''}`).join('\n')}`
    ).toHaveLength(0);
  });
}

test('Axe: Cart sidebar passes after opening', async ({ page }) => {
  await page.goto('/products.html');
  await page.evaluate(() => localStorage.removeItem('dera-cart'));
  await page.reload();
  await page.locator('.cart-nav-btn').first().click();
  await expect(page.locator('#dera-cart-sidebar')).toHaveClass(/open/);

  const results = await new AxeBuilder({ page })
    .include('#dera-cart-sidebar')
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();

  const critical = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
  expect(
    critical,
    critical.map(v => `[${v.impact}] ${v.id}: ${v.description}`).join('\n')
  ).toHaveLength(0);
});

test.describe('Accessibility — Manual Checks', () => {
  test('Gallery images are not missing alt attribute', async ({ page }) => {
    await page.goto('/gallery.html');
    // Every img must HAVE an alt attribute (even if empty for decorative).
    // Missing alt entirely is the WCAG violation.
    const imgsWithoutAlt = page.locator('img:not([alt])');
    await expect(imgsWithoutAlt).toHaveCount(0);
  });

  test('All menu card images have alt text', async ({ page }) => {
    await page.goto('/products.html');
    const imgs = page.locator('.menu-card img');
    const count = await imgs.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const alt = await imgs.nth(i).getAttribute('alt');
      expect(alt, `menu card img[${i}] missing alt`).toBeTruthy();
    }
  });

  test('Cart nav button has aria-label', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.cart-nav-btn').first()).toHaveAttribute('aria-label');
  });

  test('Cart sidebar close button (.cart-close-btn) has aria-label', async ({ page }) => {
    await page.goto('/products.html');
    await page.locator('.cart-nav-btn').first().click();
    await expect(page.locator('#dera-cart-sidebar')).toHaveClass(/open/);
    await expect(page.locator('.cart-close-btn')).toHaveAttribute('aria-label');
  });

  test('Checkout form labels are linked to inputs via for/id', async ({ page }) => {
    await page.goto('/products.html');
    await page.evaluate(() => localStorage.removeItem('dera-cart'));
    await page.reload();
    await page.locator('.card-action').first().locator('.add-btn').click();
    await page.locator('#cart-checkout-btn').click();

    const modal = page.locator('#dera-checkout-modal');
    await expect(modal).toBeVisible();

    // Check that the name input has a linked label
    await expect(modal.locator('#co-name')).toBeAttached();
    await expect(modal.locator('label[for="co-name"]')).toBeAttached();
    await expect(modal.locator('#co-email')).toBeAttached();
    await expect(modal.locator('label[for="co-email"]')).toBeAttached();
    await expect(modal.locator('#co-pickup')).toBeAttached();
    await expect(modal.locator('label[for="co-pickup"]')).toBeAttached();
  });

  test('Heading hierarchy is correct on home page', async ({ page }) => {
    await page.goto('/');
    const h1 = await page.locator('h1').count();
    expect(h1, 'should have exactly one h1').toBe(1);
  });

  test('Touch targets (stepper buttons) are at least 36px', async ({ page }) => {
    await page.goto('/products.html');
    await page.evaluate(() => localStorage.removeItem('dera-cart'));
    await page.reload();

    const firstAction = page.locator('.card-action').first();
    await firstAction.locator('.add-btn').click();

    // Wait for stepper to become visible
    const stepperBtn = firstAction.locator('.stepper-btn').first();
    await expect(stepperBtn).toBeVisible();

    const box = await stepperBtn.boundingBox();
    expect(box, 'stepper button not found in DOM').not.toBeNull();
    expect(box.width, 'stepper width should be ≥36px').toBeGreaterThanOrEqual(36);
    expect(box.height, 'stepper height should be ≥36px').toBeGreaterThanOrEqual(36);
  });
});

test.describe('Accessibility — Keyboard Navigation', () => {
  test('Cart sidebar can be closed with Escape key', async ({ page }) => {
    await page.goto('/products.html');
    await page.locator('.cart-nav-btn').first().click();
    await expect(page.locator('#dera-cart-sidebar')).toHaveClass(/open/);
    await page.keyboard.press('Escape');
    await expect(page.locator('#dera-cart-sidebar')).not.toHaveClass(/open/);
  });

  test('Checkout modal can be closed with Escape key', async ({ page }) => {
    await page.goto('/products.html');
    await page.evaluate(() => localStorage.removeItem('dera-cart'));
    await page.reload();
    await page.locator('.card-action').first().locator('.add-btn').click();
    await page.locator('#cart-checkout-btn').click();
    await expect(page.locator('#dera-checkout-modal')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#dera-checkout-modal')).not.toHaveClass(/open/);
  });

  test('Can navigate to cart button via Tab key', async ({ page }) => {
    await page.goto('/');
    let found = false;
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => document.activeElement?.className || '');
      if (focused.includes('cart-nav-btn')) { found = true; break; }
    }
    expect(found, 'cart-nav-btn should be reachable via Tab').toBe(true);
  });

  test('Add button is keyboard accessible (Enter key)', async ({ page }) => {
    await page.goto('/products.html');
    await page.evaluate(() => localStorage.removeItem('dera-cart'));
    await page.reload();
    await page.locator('.add-btn').first().focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#dera-cart-sidebar')).toHaveClass(/open/);
  });
});
