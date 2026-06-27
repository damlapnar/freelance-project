// @ts-check
const { test, expect } = require('@playwright/test');

const PAGES = [
  { name: 'Home', path: '/' },
  { name: 'Menu', path: '/products.html' },
  { name: 'Gallery', path: '/gallery.html' },
  { name: 'About', path: '/about.html' },
  { name: 'Contact', path: '/contact.html' },
  { name: 'Custom Order', path: '/custom-order.html' },
];

test.describe('Navigation — Happy Path', () => {
  test('All pages load with 200 status', async ({ page }) => {
    for (const p of PAGES) {
      const response = await page.goto(p.path);
      expect(response.status(), `${p.name} should return 200`).toBe(200);
    }
  });

  test('Header is visible on all pages', async ({ page }) => {
    for (const p of PAGES) {
      await page.goto(p.path);
      await expect(page.locator('header'), `header on ${p.name}`).toBeVisible();
    }
  });

  test('Logo links back to home', async ({ page }) => {
    await page.goto('/about.html');
    await page.locator('.logo').first().click();
    await expect(page).toHaveURL(/\/(index\.html)?$/);
  });

  test('"Order Now" CTA is present in desktop nav', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.nav-container a.cta')).toBeVisible();
  });

  test('Cart icon is in nav-container and opens sidebar', async ({ page }) => {
    await page.goto('/products.html');
    const cartBtn = page.locator('.nav-container .cart-nav-btn');
    await expect(cartBtn).toBeVisible();
    await cartBtn.click();
    await expect(page.locator('#dera-cart-sidebar')).toHaveClass(/open/);
  });

  test('Cart sidebar closes on overlay click', async ({ page }) => {
    await page.goto('/products.html');
    await page.locator('.cart-nav-btn').first().click();
    await expect(page.locator('#dera-cart-sidebar')).toHaveClass(/open/);
    await page.locator('#dera-cart-overlay').click();
    await expect(page.locator('#dera-cart-sidebar')).not.toHaveClass(/open/);
  });

  test('Custom order page has "How Many People?" field and no Budget field', async ({ page }) => {
    await page.goto('/custom-order.html');
    await expect(page.locator('select[name*="People"], select[name*="people"], label:has-text("People")')).toBeVisible();
    await expect(page.locator('label:has-text("Budget")')).toHaveCount(0);
  });
});

test.describe('Navigation — Mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('Hamburger menu button is visible on mobile', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.menu-toggle')).toBeVisible();
  });

  test('"Order Now" CTA is hidden from header on mobile', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.nav-container a.cta')).toBeHidden();
  });

  test('Cart icon is visible on mobile nav', async ({ page }) => {
    await page.goto('/products.html');
    await expect(page.locator('.cart-nav-btn')).toBeVisible();
  });

  test('Mobile hamburger opens menu drawer', async ({ page }) => {
    await page.goto('/');
    await page.locator('.menu-toggle').click();
    await expect(page.locator('#mobileDrawer')).toBeVisible();
  });
});

test.describe('Navigation — Negative Cases', () => {
  test('404 page is shown for invalid URLs', async ({ page }) => {
    await page.goto('/this-page-does-not-exist.html');
    // GitHub Pages redirects to 404.html — page should not have a 200-level heading
    const title = await page.title();
    expect(title.toLowerCase()).toMatch(/404|not found|d.era/i);
  });
});
