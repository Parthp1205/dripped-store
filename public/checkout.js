const cart = JSON.parse(localStorage.getItem('cart')) || [];
const total = cart.reduce((sum, item) => sum + item.price, 0);
document.getElementById("amount").innerText = total;

const form = document.getElementById('checkoutForm');

form.addEventListener('submit', async function (e) {
  e.preventDefault();

  const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value;
  if (!paymentMethod) {
    alert("Please select a payment method.");
    return;
  }

  const delivery = {
    name: form.name.value,
    phone: form.phone.value,
    address: form.address.value,
    city: form.city.value,
    state: form.state.value,
    pincode: form.pincode.value,
  };

  if (paymentMethod === "COD") {
    await submitOrder(delivery, cart, paymentMethod);
    return;
  }

  // Online payment via Razorpay
  const orderRes = await fetch("https://dripped-store-1.onrender.com/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ total }),
  });

  const orderData = await orderRes.json();

  const options = {
    key: orderData.key,
    amount: orderData.amount,
    currency: "INR",
    name: "DRIPPED",
    description: "T-shirt Purchase",
    handler: async function (response) {
      await submitOrder(delivery, cart, "Online");
    },
    prefill: {
      name: form.name.value,
      contact: form.phone.value,
    },
    theme: {
      color: "#d8ff3e"
    }
  };

  const rzp = new Razorpay(options);
  rzp.open();
});

async function submitOrder(delivery, cart, paymentMethod) {
  const res = await fetch("https://dripped-store-1.onrender.com/verify-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cart, delivery, paymentMethod }),
  });

  const result = await res.json();
  if (result.ok) {
    localStorage.removeItem('cart');
    window.location.href = "success.html";
  } else {
    alert("Order placed but failed to notify seller.");
  }
}
