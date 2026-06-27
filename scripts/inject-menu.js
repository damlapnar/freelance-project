const fs = require('fs');
const path = require('path');

const menuData = JSON.parse(fs.readFileSync(path.join(__dirname, 'menu.json'), 'utf8'));
const productsPath = path.join(__dirname, '..', 'products.html');
let products = fs.readFileSync(productsPath, 'utf8');

const CORRECT_ORDER = [
  'CAKES (SLICE & WHOLE)',
  'BREAKFAST PASTRIES',
  'SIGNATURE DESSERT CUPS & MINI TREATS',
  'CHEESECAKES',
  'BEVERAGES',
  'CUPCAKES',
  'COOKIES',
  'SPECIAL DAY ORDERS',
  'BAKLAVA',
  'DEALS',
  'WEDDING ORDERS',
  'CUSTOM ORDERS',
  'SEASONAL SPECIALS',
  'MINI COLLECTIONS',
];

const CATEGORY_ICONS = {
  'CAKES (SLICE & WHOLE)': '🎂',
  'BREAKFAST PASTRIES': '🥐',
  'SIGNATURE DESSERT CUPS & MINI TREATS': '🍮',
  'CHEESECAKES': '🧀',
  'BEVERAGES': '☕',
  'CUPCAKES': '🧁',
  'COOKIES': '🍪',
  'SPECIAL DAY ORDERS': '🎉',
  'BAKLAVA': '🌙',
  'DEALS': '🏷️',
  'WEDDING ORDERS': '💍',
  'CUSTOM ORDERS': '✨',
  'SEASONAL SPECIALS': '🍂',
  'MINI COLLECTIONS': '🎀',
};

function correctCategory(name) {
  const n = name.toLowerCase();
  if (/cheesecake/.test(n)) return 'CHEESECAKES';
  if (/croissant|danish|banana bread|bagel|puff pastry|cinnamon roll|ham & swiss/.test(n)) return 'BREAKFAST PASTRIES';
  if (/profiterol|eclair|tart|chocolate.covered.straw|dubai|macaron|pudding/.test(n)) return 'SIGNATURE DESSERT CUPS & MINI TREATS';
  if (/anniversary cake|engagement cake|baby shower cake|gender reveal|graduation cake|office celebr/.test(n)) return 'SPECIAL DAY ORDERS';
  if (/wedding cake/.test(n)) return 'WEDDING ORDERS';
  if (/\bcake\b/.test(n) && !/cupcake/.test(n)) return 'CAKES (SLICE & WHOLE)';
  if (/brownie|trilece|mozaik|fraise|biscoff/.test(n)) return 'CAKES (SLICE & WHOLE)';
  if (/coke|sprite|\bwater\b|turkish tea|turkish coffee|hot chocolate|dr pepper|canary dry|iced latte|cafe latte|americano|mountain dew|cappuc/.test(n)) return 'BEVERAGES';
  if (/cupcake/.test(n)) return 'CUPCAKES';
  if (/\bcookie\b/.test(n)) return 'COOKIES';
  if (/baklava|carrot slice|cold pist/.test(n)) return 'BAKLAVA';
  if (/fruit basket|stuffed dates|filled dates|custom gift/.test(n)) return 'CUSTOM ORDERS';
  if (/pumpkin/.test(n)) return 'SEASONAL SPECIALS';
  if (/bundt/.test(n)) return 'MINI COLLECTIONS';
  if (/bagel.*cream cheese.*coffee/.test(n)) return 'DEALS';
  return null;
}

// Tum itemlari topla ve yeniden kategorize et
const allItems = {};
Object.values(menuData.categories).forEach(catItems => {
  catItems.forEach(item => {
    if (!allItems[item.name]) allItems[item.name] = item;
    else if (!allItems[item.name].img && item.img) allItems[item.name].img = item.img;
  });
});

const categorized = {};
Object.values(allItems).forEach(item => {
  const cat = correctCategory(item.name);
  if (!cat) return;
  if (!categorized[cat]) categorized[cat] = [];
  categorized[cat].push(item);
});

function escapeHtml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function itemHtml(item) {
  const img = item.img
    ? `<img src="${item.img}" alt="${escapeHtml(item.name)}" loading="lazy" onerror="this.style.display='none'">`
    : `<div class="menu-card-no-img">&#127856;</div>`;
  const desc = item.desc ? `<p>${escapeHtml(item.desc)}</p>` : '';
  const price = item.price ? `<span class="menu-card-price">${escapeHtml(item.price)}</span>` : '';
  return `        <div class="menu-card">
          ${img}
          <div class="menu-card-body">
            <h3>${escapeHtml(item.name)}</h3>
            ${desc}${price}
          </div>
        </div>`;
}

let menuHtml = '\n';
CORRECT_ORDER.forEach(cat => {
  const items = categorized[cat];
  if (!items || items.length === 0) return;
  const icon = CATEGORY_ICONS[cat] || '';
  const title = cat.charAt(0) + cat.slice(1).toLowerCase();
  menuHtml += `    <div class="menu-category">
      <h2>${icon} ${title}</h2>
      <div class="menu-grid">
${items.map(itemHtml).join('\n')}
      </div>
    </div>\n\n`;
});

const START_MARKER = '<main class="menu-page">';
const END_MARKER = '<div class="menu-order-cta">';
const startIdx = products.indexOf(START_MARKER) + START_MARKER.length;
const endIdx = products.indexOf(END_MARKER);

if (startIdx === -1 || endIdx === -1) {
  console.error('Marker bulunamadi!'); process.exit(1);
}

const newProducts = products.substring(0, startIdx) + '\n' + menuHtml + '    ' + products.substring(endIdx);
fs.writeFileSync(productsPath, newProducts, 'utf8');

const total = Object.values(categorized).reduce((s, a) => s + a.length, 0);
const withPhotos = Object.values(categorized).flat().filter(i => i.img).length;
console.log(`${total} item (${withPhotos} fotograf) eklendi.`);
