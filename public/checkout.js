const cart = JSON.parse(localStorage.getItem('cart')) || [];
const total = cart.reduce((sum, item) => sum + item.price, 0);
document.getElementById("amount").innerText = total;

const form = document.getElementById('checkoutForm');
form.addEventListener('submit', function (e) {
  e.preventDefault();

  if (cart.length === 0) {
    alert("Your cart is empty!");
    return;
  }

  const delivery = {
    name: form.name.value.trim(),
    phone: form.phone.value.trim(),
    address: form.address.value.trim(),
    city: form.city.value.trim(),
    state: form.state.value.trim(),
    pincode: form.pincode.value.trim(),
  };

  if (!delivery.name || !delivery.phone || !delivery.address || !delivery.city || !delivery.state || !delivery.pincode) {
    alert("Please fill all delivery fields.");
    return;
  }

  const options = {
    key: "rzp_live_7yAixC6wc7Qyux", // ✅ Replace with your actual Razorpay key
    amount: total * 100,
    currency: "INR",
    name: "DRIPPED",
    description: "T-shirt Purchase",
    handler: function (response) {
      fetch("https://dripped-store-1.onrender.com/verify-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart, delivery }),
      })
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          localStorage.removeItem('cart');
          window.location.href = "success.html";
        } else {
          alert("Payment successful but seller notification failed. Please contact support.");
        }
      })
      .catch(error => {
        console.error("Order verification failed:", error);
        alert("Payment completed but server verification failed.");
      });
    },
    prefill: {
      name: delivery.name,
      contact: delivery.phone,
    },
    theme: {
      color: "#d8ff3e"
    }
  };

  const rzp = new Razorpay(options);
  rzp.open();
});
