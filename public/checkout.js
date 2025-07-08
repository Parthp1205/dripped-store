document.addEventListener('DOMContentLoaded',()=>{
  const cart = JSON.parse(localStorage.getItem('cart')||'[]');
  const total = cart.reduce((a,i)=>a+i.price,0);
  document.getElementById('amount').textContent = total;
  document.getElementById('checkoutForm').onsubmit = async e=>{
    e.preventDefault();
    const form = e.target, fd=new FormData(form);
    const data = { cart, total: total * 100, delivery:
      { name:fd.get('name'), phone:fd.get('phone'), address:fd.get('address') } };
    const res = await fetch('/create-order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    const ord = await res.json();
    new Razorpay({
      key: ord.key,
      order_id: ord.id,
      amount: ord.amount,
      currency: 'INR',
      handler: async resp => {
        const ok = (await fetch('/verify-order', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ ...resp, cart, delivery: data.delivery })
        }).then(r=>r.json())).ok;
        if(ok){ localStorage.removeItem('cart'); location='success.html'; }
        else alert('Payment failed');
      }
    }).open();
  }
});
