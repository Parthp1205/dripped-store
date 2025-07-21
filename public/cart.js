const DEFAULT_DELIVERY_CHARGE = 120;
let deliveryCharge = 0;

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

  // Only enable checkout button if delivery charge is added
  checkoutBtn.style.display = (deliveryCharge > 0) ? "block" : "none";
  totalsSection.style.display = "block";
}

function removeItem(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
  renderCart();
}

function checkPincode() {
  const pincode = document.getElementById("pincodeInput").value.trim();
  const deliveryMessage = document.getElementById("deliveryMessage");

  if (!pincode) {
    deliveryMessage.innerHTML = `<span style="color:red;">Please enter a pincode.</span>`;
    return;
  }

  fetch("/check_pincode.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pincode }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        deliveryCharge = parseFloat(data.rate);
        deliveryMessage.innerHTML = `<span style="color:green;">Delivery available. Charge: ₹${deliveryCharge}</span>`;
      } else {
        deliveryCharge = DEFAULT_DELIVERY_CHARGE;
        deliveryMessage.innerHTML = `<span style="color:orange;">⚠️ Delivery not verified. Default charge ₹${DEFAULT_DELIVERY_CHARGE} applied.</span>`;
      }
      renderCart();
    })
    .catch((error) => {
      deliveryCharge = DEFAULT_DELIVERY_CHARGE;
      deliveryMessage.innerHTML = `<span style="color:orange;">⚠️ Shiprocket check failed. Default charge ₹${DEFAULT_DELIVERY_CHARGE} applied.</span>`;
      renderCart();
    });
}

document.addEventListener('DOMContentLoaded', renderCart);
