const DELIVERY_CHARGE = 120;
const cart = JSON.parse(localStorage.getItem('cart') || '[]');
const checkoutForm = document.getElementById('checkoutForm');
const amountEl = document.getElementById('amount');

const itemTotal = cart.reduce((sum, item) => sum + item.price, 0);
const finalTotal = itemTotal + DELIVERY_CHARGE;
amountEl.textContent = finalTotal;

checkoutForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(checkoutForm);
  const delivery = Object.fromEntries(formData.entries());
  const paymentMethod = formData.get('payment');

  if (paymentMethod === 'COD') {
    await fetch('/verify-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart, delivery, paymentMethod })
    });
    localStorage.removeItem('cart');
    window.location.href = 'success.html';
  } else {
    const response = await fetch('/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ total: itemTotal }) // only send item total
    });

    const data = await response.json();
    const options = {
      key: data.key,
      amount: data.amount,
      currency: "INR",
      name: "DRIPPED",
      description: "Premium Streetwear",
      order_id: data.id,
      handler: async function () {
        await fetch('/verify-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cart, delivery, paymentMethod })
        });
        localStorage.removeItem('cart');
        window.location.href = 'success.html';
      },
      prefill: {
        name: delivery.name,
        contact: delivery.phone
      },
      theme: {
        color: "#d8ff3e"
      }
    };

    const rzp = new Razorpay(options);
    rzp.open();
  }
});
