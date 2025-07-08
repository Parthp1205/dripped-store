const express = require('express');
const Razorpay = require('razorpay');
const cors = require('cors');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // Serve frontend files (HTML, CSS, JS, images)

// Razorpay setup
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

// Create Razorpay order
app.post("/create-order", async (req, res) => {
  const { total } = req.body;
  const options = {
    amount: total,
    currency: "INR",
    receipt: "order_rcptid_11",
  };

  try {
    const order = await razorpay.orders.create(options);
    res.json({ id: order.id, amount: order.amount, key: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    console.error("❌ Razorpay Order Creation Failed:", err);
    res.status(500).send("Order creation failed");
  }
});

// Verify payment and send email + WhatsApp
app.post("/verify-order", async (req, res) => {
  const { cart, delivery } = req.body;

  const totalAmount = cart.reduce((sum, item) => sum + item.price, 0);
  const itemList = cart.map(i => `${i.name} – ₹${i.price}`).join('\n');

  try {
    // Twilio WhatsApp
    const client = twilio(process.env.TWILIO_SID || '', process.env.TWILIO_AUTH || '');
    await client.messages.create({
      from: process.env.WHATSAPP_FROM, // e.g., 'whatsapp:+14155238886'
      to: process.env.WHATSAPP_TO,     // e.g., 'whatsapp:+91XXXXXXXXXX'
      body: `🧾 *New Order from ${delivery.name}*\n📞 ${delivery.phone}\n📍 ${delivery.address}, ${delivery.city}, ${delivery.state} - ${delivery.pincode}\n\n🛍️ Items:\n${itemList}\n\n💰 Total: ₹${totalAmount}`,
    });

    // Nodemailer - Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || '',
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // You can add customer email here too
      subject: `🧾 New Order - ${delivery.name}`,
      text: `Order Details:\n\nName: ${delivery.name}\nPhone: ${delivery.phone}\nAddress: ${delivery.address}, ${delivery.city}, ${delivery.state} - ${delivery.pincode}\n\nItems:\n${itemList}\n\nTotal: ₹${totalAmount}`,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Order Verification or Notification Failed:", err);
    res.json({ ok: false });
  }
});

// Default route
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🟢 Server running on http://localhost:${PORT}`);
});
