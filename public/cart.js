const DEFAULT_DELIVERY_CHARGE = 120;
let deliveryCharge = 0;

// 🛒 CART FUNCTIONS
function getCart() {
  return JSON.parse(localStorage.getItem('cart') || '[]');
}

function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
}

// 🧾 RENDER CART
function renderCart() {
  const cart = getCart();
  const cartContainer = document.getElementById('cartItems');
  const itemTotalSpan = document.getElementById('itemTotal');
  const finalTotalSpan = document.getElementById('finalTotal');
  const deliveryChargeSpan = document.getElementById('deliveryCharge');
  const checkoutBtn = document.querySelector('.checkout-btn');
  const totalsSection = document.getElementById('totals');
  const deliveryMessage = document.getElementById('deliveryMessage');

  if (cart.length === 0) {
    cartContainer.innerHTML = `<p class="empty-cart">Your cart is empty.</p>`;
    itemTotalSpan.textContent = 0;
    finalTotalSpan.textContent = 0;
    deliveryChargeSpan.textContent = 0;
    checkoutBtn.style.display = "none";
    totalsSection.style.display = "none";
    return;
  }

  cartContainer.innerHTML = cart.map((item, index) => `
    <div class="cart-item">
      <span class="item-name">
        ${item.name}
        ${item.size ? `<small>Size: ${item.size}</small>` : ""}
        <small>Quantity: ${item.qty}</small>
      </span>
      <span>
        ₹${item.price * item.qty}
        <button class="remove-btn" onclick="removeItem(${index})">Remove</button>
      </span>
    </div>
  `).join('');

  const itemTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  itemTotalSpan.textContent = itemTotal;
  deliveryChargeSpan.textContent = deliveryCharge || 0;
  finalTotalSpan.textContent = itemTotal + (deliveryCharge || 0);

  // Save delivery charge to localStorage for checkout use
  localStorage.setItem('deliveryCharge', deliveryCharge);

  // Enable checkout only if delivery verified
  checkoutBtn.style.display = (deliveryCharge > 0) ? "block" : "none";
  totalsSection.style.display = "block";
}

// ❌ REMOVE ITEM
function removeItem(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
  renderCart();
}

// 📦 CHECK PINCODE VIA EXPRESS API
function checkPincode() {
  const pincode = document.getElementById("pincodeInput").value.trim();
  const deliveryMessage = document.getElementById("deliveryMessage");

  if (!pincode || pincode.length !== 6) {
    deliveryMessage.innerHTML = `<span style="color:red;">Please enter a valid 6-digit pincode.</span>`;
    return;
  }

  fetch(`/api/check_pincode?pincode=${pincode}`)
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        deliveryCharge = parseFloat(data.charge || DEFAULT_DELIVERY_CHARGE);
        deliveryMessage.innerHTML = `<span style="color:green;">✅ Delivery available. Charge: ₹${deliveryCharge}</span>`;
      } else {
        deliveryCharge = DEFAULT_DELIVERY_CHARGE;
        deliveryMessage.innerHTML = `<span style="color:orange;">⚠️ Delivery may not be available. Default charge ₹${DEFAULT_DELIVERY_CHARGE} applied.</span>`;
      }
      renderCart();
    })
    .catch((error) => {
      console.error("Shiprocket error:", error);
      deliveryCharge = DEFAULT_DELIVERY_CHARGE;
      deliveryMessage.innerHTML = `<span style="color:orange;">⚠️ Could not verify delivery. Default charge ₹${DEFAULT_DELIVERY_CHARGE} applied.</span>`;
      renderCart();
    });
}

// ⏳ ON LOAD
document.addEventListener('DOMContentLoaded', () => {
  // Load delivery charge if previously saved
  deliveryCharge = parseFloat(localStorage.getItem('deliveryCharge')) || 0;
  renderCart();
});
