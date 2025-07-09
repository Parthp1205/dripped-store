function getCart() {
  return JSON.parse(localStorage.getItem('cart') || '[]');
}

function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
}

function renderCart() {
  const cart = getCart();
  const cartContainer = document.getElementById('cartItems');
  const totalSpan = document.getElementById('total');
  const checkoutBtn = document.querySelector('.checkout-btn');
  const deliveryCharge = 120;

  if (cart.length === 0) {
    cartContainer.innerHTML = <p class="empty-cart">Your cart is empty.</p>;
    totalSpan.textContent = 0;
    if (checkoutBtn) checkoutBtn.style.display = 'none';
    return;
  }

  if (checkoutBtn) checkoutBtn.style.display = 'block';

  cartContainer.innerHTML = cart.map((item, index) => `
    <div class="cart-item">
      <span class="item-name">
        ${item.name}
        ${item.size ? <small>Size: ${item.size}</small> : ''}
      </span>
      <span>Rs ${item.price} 
        <button class="remove-btn" onclick="removeItem(${index})">Remove</button>
      </span>
    </div>
  `).join('');

  // Add delivery charge row
  cartContainer.innerHTML += `
    <div class="cart-item">
      <span class="item-name">Delivery Charge</span>
      <span>Rs ${deliveryCharge}</span>
    </div>
  `;

  const total = cart.reduce((sum, item) => sum + item.price, 0) + deliveryCharge;
  totalSpan.textContent = total;
}

function removeItem(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
  renderCart();
}

document.addEventListener('DOMContentLoaded', renderCart);
