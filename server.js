const express = require('express');
const Razorpay = require('razorpay');
const cors = require('cors');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Razorpay setup
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Razorpay Order Creation
app.post("/create-order", async (req, res) => {
  const { total } = req.body;
  const options = {
    amount: total * 100, // ₹ to paisa
    currency: "INR",
    receipt: "order_rcptid_" + Date.now(),
  };

  try {
    const order = await razorpay.orders.create(options);
    res.json({ id: order.id, amount: order.amount, key: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    console.error("Order creation failed:", err);
    res.status(500).send("Order creation failed");
  }
});

// Verify Order & Notify Seller
app.post("/verify-order", async (req, res) => {
  const { cart, delivery } = req.body;

  if (!cart || !delivery) return res.status(400).json({ ok: false });

  const totalAmount = cart.reduce((sum, item) => sum + item.price, 0);
  const itemList = cart.map(i => `• ${i.name} (Size: ${i.size}) – ₹${i.price}`).join('\n');

  const message = `
New Order from ${delivery.name}
📞 Phone: ${delivery.phone}
🏠 Address: ${delivery.address}
🏙️ City: ${delivery.city}, ${delivery.state} - ${delivery.pincode}

🧾 Items:
${itemList}

💰 Total: ₹${totalAmount}
`;

  try {
    // ✅ Send WhatsApp using Twilio
    const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);
    await client.messages.create({
      from: process.env.WHATSAPP_FROM,
      to: process.env.WHATSAPP_TO,
      body: message,
    });

    // ✅ Send Email using Nodemailer
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
      subject: `🛒 New Order from ${delivery.name}`,
      text: message,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Notification failed:", err);
    res.status(500).json({ ok: false });
  }
});

// Serve index.html for root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
