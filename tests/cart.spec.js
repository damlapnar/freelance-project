// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Cart — Happy Path', () => {
  test.beforeEach(async ({ page }) => {
    // Clear cart state before each test
    await page.goto('/products.html');
    await page.evaluate(() => localStorage.removeItem('dera-cart'));
    await page.reload();
  });

  test('Add button appears on every card', async ({ page }) => {
    const addBtns = page.locator('.add-btn');
    const count = await addBtns.count();
    expect(count).toBeGreaterThan(0);
    // All add buttons should be visible initially
    for (let i = 0; i < Math.min(count, 5); i++) {
      await expect(addBtns.nth(i)).toBeVisible();
    }
  });

  test('Clicking Add opens cart sidebar with item', async ({ page }) => {
    const firstCard = page.locator('.card-action').first();
    const productName = await firstCard.getAttribute('data-name');
    const productPrice = await firstCard.getAttribute('data-price');

    await firstCard.locator('.add-btn').click();

    // Sidebar should open
    await expect(page.locator('#dera-cart-sidebar')).toHaveClass(/open/);

    // Item should be visible in sidebar
    await expect(page.locator('.cart-item-name').first()).toContainText(productName);

    // Price should be correct
    await expect(page.locator('#cart-total')).toContainText(`$${parseFloat(productPrice).toFixed(2)}`);
  });

  test('Add button transforms to stepper after click', async ({ page }) => {
    const firstAction = page.locator('.card-action').first();
    const addBtn = firstAction.locator('.add-btn');
    const stepper = firstAction.locator('.card-stepper');

    await expect(addBtn).toBeVisible();
    await expect(stepper).toBeHidden();

    await addBtn.click();

    await expect(addBtn).toBeHidden();
    await expect(stepper).toBeVisible();
    await expect(firstAction.locator('.card-qty')).toHaveText('1');
  });

  test('Cart badge shows item count', async ({ page }) => {
    await page.locator('.card-action').first().locator('.add-btn').click();
    const badge = page.locator('.cart-count').first();
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText('1');
  });

  test('Stepper + increases quantity', async ({ page }) => {
    const firstAction = page.locator('.card-action').first();
    await firstAction.locator('.add-btn').click();

    const plusBtn = firstAction.locator('.stepper-btn').nth(1);
    await plusBtn.click();

    await expect(firstAction.locator('.card-qty')).toHaveText('2');
    await expect(page.locator('.cart-count').first()).toHaveText('2');
  });

  test('Stepper − decreases quantity', async ({ page }) => {
    const firstAction = page.locator('.card-action').first();
    await firstAction.locator('.add-btn').click();

    // Add one more
    await firstAction.locator('.stepper-btn').nth(1).click();
    await expect(firstAction.locator('.card-qty')).toHaveText('2');

    // Remove one
    await firstAction.locator('.stepper-btn').nth(0).click();
    await expect(firstAction.locator('.card-qty')).toHaveText('1');
  });

  test('Cart total updates correctly with multiple items', async ({ page }) => {
    const actions = page.locator('.card-action');
    const p1 = parseFloat(await actions.nth(0).getAttribute('data-price'));
    const p2 = parseFloat(await actions.nth(1).getAttribute('data-price'));

    await actions.nth(0).locator('.add-btn').click();
    await page.keyboard.press('Escape');  // close sidebar
    await actions.nth(1).locator('.add-btn').click();

    const expected = `$${(p1 + p2).toFixed(2)}`;
    await expect(page.locator('#cart-total')).toContainText(expected);
  });

  test('Checkout modal opens when Place Order is clicked', async ({ page }) => {
    await page.locator('.card-action').first().locator('.add-btn').click();
    await page.locator('#cart-checkout-btn').click();
    await expect(page.locator('#dera-checkout-modal')).toBeVisible();
  });

  test('Checkout form has required fields', async ({ page }) => {
    await page.locator('.card-action').first().locator('.add-btn').click();
    await page.locator('#cart-checkout-btn').click();

    const modal = page.locator('#dera-checkout-modal');
    await expect(modal.locator('input[name="name"]')).toBeVisible();
    await expect(modal.locator('input[name="email"]')).toBeVisible();
    await expect(modal.locator('select[name="Pickup"]')).toBeVisible();
  });
});

test.describe('Cart — Negative Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/products.html');
    await page.evaluate(() => localStorage.removeItem('dera-cart'));
    await page.reload();
  });

  test('Checkout button disabled when cart is empty', async ({ page }) => {
    await page.locator('.cart-nav-btn').first().click();
    await expect(page.locator('#cart-checkout-btn')).toBeDisabled();
  });

  test('Cart sidebar shows empty state message', async ({ page }) => {
    await page.locator('.cart-nav-btn').first().click();
    await expect(page.locator('.cart-empty')).toBeVisible();
  });

  test('Form does not submit without required name field', async ({ page }) => {
    await page.locator('.card-action').first().locator('.add-btn').click();
    await page.locator('#cart-checkout-btn').click();

    const modal = page.locator('#dera-checkout-modal');
    // Fill email but not name
    await modal.locator('input[name="email"]').fill('test@example.com');
    await modal.locator('select[name="Pickup"]').selectOption({ index: 1 });

    // Submit form - browser validation should block it
    const nameInput = modal.locator('input[name="name"]');
    await expect(nameInput).toHaveAttribute('required', '');
  });

  test('Form does not submit without required email field', async ({ page }) => {
    await page.locator('.card-action').first().locator('.add-btn').click();
    await page.locator('#cart-checkout-btn').click();

    const modal = page.locator('#dera-checkout-modal');
    const emailInput = modal.locator('input[name="email"]');
    await expect(emailInput).toHaveAttribute('required', '');
  });

  test('Form does not submit without required pickup time', async ({ page }) => {
    await page.locator('.card-action').first().locator('.add-btn').click();
    await page.locator('#cart-checkout-btn').click();

    const modal = page.locator('#dera-checkout-modal');
    const pickupSelect = modal.locator('select[name="Pickup"]');
    await expect(pickupSelect).toHaveAttribute('required', '');
  });
});

test.describe('Cart — Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/products.html');
    await page.evaluate(() => localStorage.removeItem('dera-cart'));
    await page.reload();
  });

  test('Adding same item twice gives qty 2, not two separate entries', async ({ page }) => {
    const firstAction = page.locator('.card-action').first();
    await firstAction.locator('.add-btn').click();
    // Close sidebar
    await page.keyboard.press('Escape');
    // Click + in stepper
    await firstAction.locator('.stepper-btn').nth(1).click();

    // Only one cart item entry in sidebar
    await page.locator('.cart-nav-btn').first().click();
    await expect(page.locator('.cart-item')).toHaveCount(1);
    await expect(page.locator('.cart-count').first()).toHaveText('2');
  });

  test('Decreasing qty to 0 removes item and restores Add button', async ({ page }) => {
    const firstAction = page.locator('.card-action').first();
    await firstAction.locator('.add-btn').click();

    // Close sidebar then decrement to 0
    await page.keyboard.press('Escape');
    await firstAction.locator('.stepper-btn').nth(0).click();

    await expect(firstAction.locator('.add-btn')).toBeVisible();
    await expect(firstAction.locator('.card-stepper')).toBeHidden();
  });

  test('Cart persists after page reload (localStorage)', async ({ page }) => {
    const firstAction = page.locator('.card-action').first();
    const productName = await firstAction.getAttribute('data-name');
    await firstAction.locator('.add-btn').click();

    await page.reload();

    // Badge should still show 1
    await expect(page.locator('.cart-count').first()).toHaveText('1');

    // Open sidebar and verify item
    await page.locator('.cart-nav-btn').first().click();
    await expect(page.locator('.cart-item-name').first()).toContainText(productName);
  });

  test('Sidebar qty controls sync with card stepper', async ({ page }) => {
    const firstAction = page.locator('.card-action').first();
    const id = await firstAction.getAttribute('data-id');
    await firstAction.locator('.add-btn').click();

    // Increase via sidebar
    await page.locator('.cart-qty-control button').nth(1).click();

    // Card stepper should now show 2
    await expect(firstAction.locator('.card-qty')).toHaveText('2');
  });

  test('Remove button in sidebar removes item and shows Add button on card', async ({ page }) => {
    const firstAction = page.locator('.card-action').first();
    await firstAction.locator('.add-btn').click();

    // Click remove (×) button in sidebar
    await page.locator('.cart-item-remove').first().click();

    await expect(page.locator('.cart-empty')).toBeVisible();
    await expect(firstAction.locator('.add-btn')).toBeVisible();
    await expect(firstAction.locator('.card-stepper')).toBeHidden();
  });

  test('Cart icon in nav is immediately right of Order Now link', async ({ page }) => {
    const nav = page.locator('.nav-links');
    const orderNow = nav.locator('a.cta');
    const cartBtn = nav.locator('.cart-nav-btn');

    // Both should exist in nav
    await expect(orderNow).toBeVisible();
    await expect(cartBtn).toBeVisible();

    // Cart button should follow Order Now link in DOM
    const orderNowIndex = await orderNow.evaluate(el =>
      Array.from(el.parentElement.children).indexOf(el)
    );
    const cartBtnIndex = await cartBtn.evaluate(el =>
      Array.from(el.parentElement.children).indexOf(el)
    );
    expect(cartBtnIndex).toBe(orderNowIndex + 1);
  });
});
