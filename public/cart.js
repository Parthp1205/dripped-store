const DELIVERY_CHARGE = 120;

function getCart() {
  return JSON.parse(localStorage.getItem('cart') || '[]');
}

function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
}

function renderCart() {
  const cart = getCart();
  const cartContainer = document.getElementById('cartItems');
  const itemTotalSpan = document.getElementById('itemTotal');
  const finalTotalSpan = document.getElementById('finalTotal');
  const deliveryChargeSpan = document.getElementById('deliveryCharge');
  const checkoutBtn = document.querySelector('.checkout-btn');
  const totalsSection = document.getElementById('totals');

  if (cart.length === 0) {
    cartContainer.innerHTML = `<p class="empty-cart">Your cart is empty.</p>`;
    itemTotalSpan.textContent = 0;
    finalTotalSpan.textContent = 0;
    deliveryChargeSpan.textContent = DELIVERY_CHARGE;
    checkoutBtn.style.display = "none";
    totalsSection.style.display = "none";
    return;
  }

  checkoutBtn.style.display = "block";
  totalsSection.style.display = "block";

  cartContainer.innerHTML = cart.map((item, index) => `
    <div class="cart-item">
      <span class="item-name">
        ${item.name}
        ${item.size ? `<small>Size: ${item.size}</small>` : ""}
        <small>Qty: ${item.qty}</small>
      </span>
      <span>
        ₹${item.price * item.qty}
        <button class="remove-btn" onclick="removeItem(${index})">Remove</button>
      </span>
    </div>
  `).join('');

  const itemTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  itemTotalSpan.textContent = itemTotal;
  deliveryChargeSpan.textContent = DELIVERY_CHARGE;
  finalTotalSpan.textContent = itemTotal + DELIVERY_CHARGE;
}

function removeItem(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
  renderCart();
}

document.addEventListener('DOMContentLoaded', renderCart);
