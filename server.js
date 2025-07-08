const express = require('express');
const Razorpay = require('razorpay');
const cors = require('cors');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
require('dotenv').config();

const app = express(); // ✅ Define app before using it

app.use(cors());
app.use(express.json());
app.use(express.static("public")); // ✅ Serve frontend from /public folder

// ✅ Razorpay setup
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ✅ Create Razorpay order
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
    console.error("Order creation failed:", err);
    res.status(500).send("Order creation failed");
  }
});

// ✅ Verify payment and send email + WhatsApp
app.post("/verify-order", async (req, res) => {
  const { cart, delivery } = req.body;

  const totalAmount = cart.reduce((sum, item) => sum + item.price, 0);
  const itemList = cart.map(i => `${i.name} – ₹${i.price}`).join('\n');

  try {
    // ✅ Send WhatsApp message via Twilio
    const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);
    await client.messages.create({
      from: process.env.WHATSAPP_FROM, // Format: 'whatsapp:+14155238886'
      to: process.env.WHATSAPP_TO,     // Format: 'whatsapp:+91xxxxxxxxxx'
      body: `New Order from ${delivery.name}\nPhone: ${delivery.phone}\nAddress: ${delivery.address}\nCity: ${delivery.city}, ${delivery.state} - ${delivery.pincode}\n\nItems:\n${itemList}\n\nTotal: ₹${totalAmount}`,
    });

    // ✅ Send Email via Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: `New Order - ${delivery.name}`,
      text: `Order Details:\n\nName: ${delivery.name}\nPhone: ${delivery.phone}\nAddress: ${delivery.address}\nCity: ${delivery.city}, ${delivery.state} - ${delivery.pincode}\n\nItems:\n${itemList}\n\nTotal: ₹${totalAmount}`,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("Verification or notification failed:", err);
    res.json({ ok: false });
  }
});

// ✅ Default route
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

// ✅ Start the server
app.listen(5000, () => {
  console.log("🟢 Server running at http://localhost:5000");
});
