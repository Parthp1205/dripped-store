const express = require('express');
const Razorpay = require('razorpay');
const cors = require('cors');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const path = require('path');
require('dotenv').config();

const app = express();
const DELIVERY_CHARGE = 120;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ✅ Create Razorpay order (with delivery)
app.post("/create-order", async (req, res) => {
  const { total } = req.body;
  const totalWithDelivery = total + DELIVERY_CHARGE;

  const options = {
    amount: totalWithDelivery * 100, // in paise
    currency: "INR",
    receipt: "order_rcptid_" + Date.now(),
  };

  try {
    const order = await razorpay.orders.create(options);
    res.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("❌ Razorpay order creation failed:", err);
    res.status(500).send("Order creation failed");
  }
});

// ✅ Order verification + notifications
app.post("/verify-order", async (req, res) => {
  const { cart, delivery, paymentMethod } = req.body;

  if (!cart || !delivery || !paymentMethod) {
    return res.status(400).json({ ok: false, error: "Missing data" });
  }

  const itemTotal = cart.reduce((sum, item) => sum + item.price * (item.qty || 1), 0);
  const finalTotal = itemTotal + DELIVERY_CHARGE;

  const itemList = cart.map(i =>
    `• ${i.name} (Size: ${i.size || '-'}, Qty: ${i.qty || 1}) – ₹${i.price} x ${i.qty || 1} = ₹${i.price * (i.qty || 1)}`
  ).join('\n');

  const paymentText = paymentMethod === 'COD'
    ? '🧾 Payment Method: Cash on Delivery (COD)'
    : '🧾 Payment Method: Online Payment (PAID)';

  const fullMessage = `
🛍️ New Order from ${delivery.name}
📞 Phone: ${delivery.phone}
🏠 Address: ${delivery.address}
🏙️ City: ${delivery.city}, ${delivery.state} - ${delivery.pincode}

🧾 Items:
${itemList}

📦 Delivery Charge: ₹${DELIVERY_CHARGE}
💰 Item Total: ₹${itemTotal}
💳 Final Total: ₹${finalTotal}
${paymentText}`.trim();

  try {
    // ✅ WhatsApp via Twilio
    /*const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);
    await client.messages.create({
      from: process.env.WHATSAPP_FROM,
      to: process.env.WHATSAPP_TO,
      body: fullMessage,
    });
    console.log("✅ WhatsApp message sent.");
    */
    // ✅ Email via Nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"DRIPPED Orders" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: `New Order from ${delivery.name}`,
      text: fullMessage,
    });
    console.log("✅ Email sent.");

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Failed to send notification:", err);
    res.status(500).json({ ok: false });
  }
});

// ✅ Serve homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
