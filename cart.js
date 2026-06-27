/* D'era House — Custom Cart (Pay at Pickup) */
(function () {
  'use strict';

  let cart = [];

  function loadCart() {
    try { cart = JSON.parse(localStorage.getItem('dera-cart') || '[]'); } catch { cart = []; }
  }

  function saveCart() {
    localStorage.setItem('dera-cart', JSON.stringify(cart));
  }

  /* ── PUBLIC API ── */
  window.deraCart = {
    add: function (id, name, price, img) {
      loadCart();
      const ex = cart.find(i => i.id === id);
      if (ex) ex.qty += 1;
      else cart.push({ id, name, price: parseFloat(price), img: img || '', qty: 1 });
      saveCart();
      renderSidebar();
      updateBadge();
      openSidebar();
    },
    remove: function (id) {
      loadCart();
      cart = cart.filter(i => i.id !== id);
      saveCart();
      renderSidebar();
      updateBadge();
    },
    setQty: function (id, qty) {
      loadCart();
      qty = parseInt(qty);
      if (qty <= 0) { window.deraCart.remove(id); return; }
      const item = cart.find(i => i.id === id);
      if (item) item.qty = qty;
      saveCart();
      renderSidebar();
      updateBadge();
    }
  };

  /* ── BADGE ── */
  function updateBadge() {
    loadCart();
    const count = cart.reduce((s, i) => s + i.qty, 0);
    document.querySelectorAll('.cart-count').forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'inline-flex' : 'none';
    });
  }

  /* ── SIDEBAR ── */
  function openSidebar() {
    const s = document.getElementById('dera-cart-sidebar');
    if (s) { s.classList.add('open'); document.body.classList.add('cart-open'); }
  }
  function closeSidebar() {
    const s = document.getElementById('dera-cart-sidebar');
    if (s) { s.classList.remove('open'); document.body.classList.remove('cart-open'); }
    closeCheckout();
  }

  function renderSidebar() {
    loadCart();
    const itemsEl = document.getElementById('cart-items-list');
    const totalEl = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('cart-checkout-btn');
    if (!itemsEl) return;

    if (cart.length === 0) {
      itemsEl.innerHTML = '<p class="cart-empty">Your cart is empty &#x1F6D2;</p>';
      if (totalEl) totalEl.textContent = '$0.00';
      if (checkoutBtn) checkoutBtn.disabled = true;
      return;
    }

    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    if (totalEl) totalEl.textContent = '$' + total.toFixed(2);
    if (checkoutBtn) checkoutBtn.disabled = false;

    itemsEl.innerHTML = cart.map(item => `
      <div class="cart-item">
        ${item.img ? `<img src="${item.img}" alt="${esc(item.name)}" onerror="this.style.display='none'">` : '<div class="cart-item-emoji">&#x1F370;</div>'}
        <div class="cart-item-info">
          <p class="cart-item-name">${esc(item.name)}</p>
          <p class="cart-item-line-price">$${(item.price * item.qty).toFixed(2)}</p>
          <div class="cart-qty-control">
            <button onclick="deraCart.setQty('${item.id}', ${item.qty - 1})">&#x2212;</button>
            <span>${item.qty}</span>
            <button onclick="deraCart.setQty('${item.id}', ${item.qty + 1})">&#x2B;</button>
          </div>
        </div>
        <button class="cart-item-remove" onclick="deraCart.remove('${item.id}')" aria-label="Remove">&#x2715;</button>
      </div>`).join('');
  }

  /* ── CHECKOUT MODAL ── */
  function openCheckout() {
    loadCart();
    if (cart.length === 0) return;
    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const summary = cart.map(i => `${i.qty}x ${i.name} ($${(i.price * i.qty).toFixed(2)})`).join('\n');

    document.getElementById('checkout-order-summary').textContent = summary;
    document.getElementById('checkout-total').textContent = '$' + total.toFixed(2);
    document.getElementById('checkout-hidden-order').value = summary;
    document.getElementById('checkout-hidden-total').value = '$' + total.toFixed(2);

    document.getElementById('dera-checkout-modal').classList.add('open');
  }
  function closeCheckout() {
    const m = document.getElementById('dera-checkout-modal');
    if (m) m.classList.remove('open');
  }

  /* ── FORM SUBMIT ── */
  function submitOrder(e) {
    e.preventDefault();
    const form = document.getElementById('pickup-order-form');
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Sending...';

    const data = new FormData(form);
    fetch(form.action, { method: ‘POST’, body: data, headers: { ‘Accept’: ‘application/json’ } })
      .then(r => {
        if (r.ok) {
          document.getElementById('checkout-success').style.display = 'block';
          form.style.display = 'none';
          cart = []; saveCart(); updateBadge();
          setTimeout(() => { closeCheckout(); closeSidebar(); document.getElementById('checkout-success').style.display = 'none'; form.style.display = 'block'; }, 4000);
        } else {
          btn.disabled = false; btn.textContent = 'Place Order';
          alert('Something went wrong. Please try again or call us at (201) 923-9776.');
        }
      })
      .catch(() => { btn.disabled = false; btn.textContent = 'Place Order'; alert('Network error. Please call us at (201) 923-9776.'); });
  }

  function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  /* ── INJECT HTML ── */
  function injectCartHTML() {
    const cartHTML = `
<div id="dera-cart-overlay" onclick="closeSidebar()"></div>

<aside id="dera-cart-sidebar" role="dialog" aria-label="Shopping cart">
  <div class="cart-header">
    <h2>Your Order</h2>
    <button class="cart-close-btn" onclick="closeSidebar()" aria-label="Close cart">&#x2715;</button>
  </div>
  <div id="cart-items-list" class="cart-items-list"></div>
  <div class="cart-footer">
    <div class="cart-total-row">
      <span>Total</span>
      <strong id="cart-total">$0.00</strong>
    </div>
    <p class="cart-pickup-note">&#x1F4CD; Pay at pickup &mdash; 1076 Main Ave, Clifton NJ</p>
    <button id="cart-checkout-btn" class="cart-checkout-btn" onclick="openCheckout()" disabled>
      Place Order &rarr;
    </button>
  </div>
</aside>

<div id="dera-checkout-modal" role="dialog" aria-label="Place your order">
  <div class="checkout-box">
    <button class="checkout-close" onclick="closeCheckout()" aria-label="Close">&#x2715;</button>
    <h2>Place Your Order</h2>
    <div class="checkout-summary-wrap">
      <pre id="checkout-order-summary" class="checkout-summary"></pre>
      <p class="checkout-total-line">Total: <strong id="checkout-total">$0.00</strong></p>
      <p class="checkout-pay-note">&#x1F4B5; You'll pay at pickup. No charge now.</p>
    </div>
    <form id="pickup-order-form" action="https://api.web3forms.com/submit" method="POST">
      <input type="hidden" name="access_key" value="a10ef4ae-2861-41cb-9942-55013c6c3079">
      <input type="hidden" name="subject" value="New Pickup Order — D'era Pastry House">
      <input type="hidden" name="from_name" value="D'era Pastry House">
      <input type="hidden" id="checkout-hidden-order" name="Order">
      <input type="hidden" id="checkout-hidden-total" name="Total">
      <div class="co-field">
        <label>Your Name *</label>
        <input type="text" name="name" required placeholder="Jane Smith">
      </div>
      <div class="co-field">
        <label>Email *</label>
        <input type="email" name="email" required placeholder="jane@email.com">
      </div>
      <div class="co-field">
        <label>Phone</label>
        <input type="tel" name="Phone" placeholder="(201) 555-0000">
      </div>
      <div class="co-field">
        <label>Pickup Date &amp; Time *</label>
        <input type="text" name="Pickup" required placeholder="e.g. Tomorrow at 3pm">
      </div>
      <div class="co-field">
        <label>Special Instructions</label>
        <textarea name="Notes" rows="2" placeholder="Allergies, decorations, etc."></textarea>
      </div>
      <button type="submit" class="co-submit-btn">Place Order &mdash; Pay at Pickup</button>
    </form>
    <div id="checkout-success" style="display:none" class="checkout-success-msg">
      &#x2705; Order received! We'll email you a confirmation. See you at pickup!
    </div>
  </div>
</div>`;

    const div = document.createElement('div');
    div.innerHTML = cartHTML;
    document.body.appendChild(div);

    document.getElementById('pickup-order-form').addEventListener('submit', submitOrder);
  }

  /* ── GLOBAL CLOSE FUNCTIONS ── */
  window.openSidebar = openSidebar;
  window.closeSidebar = closeSidebar;
  window.openCheckout = openCheckout;
  window.closeCheckout = closeCheckout;

  /* ── INIT ── */
  document.addEventListener('DOMContentLoaded', function () {
    injectCartHTML();
    loadCart();
    renderSidebar();
    updateBadge();
  });
})();
