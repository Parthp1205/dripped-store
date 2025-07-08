function getCart(){ return JSON.parse(localStorage.getItem('cart') || '[]'); }
function saveCart(cart){ localStorage.setItem('cart', JSON.stringify(cart)); }

function renderCart() {
  const cart = getCart();
  const cartContainer = document.getElementById('cartItems');
  const totalSpan = document.getElementById('total');

  if (cart.length === 0) {
    cartContainer.innerHTML = `<p class="empty-cart">Your cart is empty.</p>`;
    totalSpan.textContent = 0;
    return;
  }

  cartContainer.innerHTML = cart.map((item, index) => `
    <div class="cart-item">
      <span>${item.name}</span>
      <span>Rs ${item.price} 
        <button class="remove-btn" onclick="removeItem(${index})">Remove</button>
      </span>
    </div>
  `).join('');

  const total = cart.reduce((sum, item) => sum + item.price, 0);
  totalSpan.textContent = total;
}

function removeItem(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
  renderCart();
}

document.addEventListener('DOMContentLoaded', renderCart);
