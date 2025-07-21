const express = require('express');
const Razorpay = require('razorpay');
const cors = require('cors');
const nodemailer = require('nodemailer');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const DEFAULT_DELIVERY_CHARGE = 120;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// 🚚 Fetch Shiprocket token
async function getShiprocketToken() {
  try {
    const response = await axios.post('https://apiv2.shiprocket.in/v1/external/auth/login', {
      email: process.env.SHIPROCKET_EMAIL,
      password: process.env.SHIPROCKET_PASSWORD,
    });
    return response.data.token;
  } catch (err) {
    console.error("❌ Shiprocket login error:", err.response?.data || err.message);
    throw new Error("Shiprocket authentication failed");
  }
}

// 📦 Check pincode serviceability
app.get("/api/check_pincode", async (req, res) => {
  const { pincode } = req.query;
  if (!pincode) return res.status(400).json({ success: false, error: "Pincode is required" });

  try {
    const token = await getShiprocketToken();

    const response = await axios.get("https://apiv2.shiprocket.in/v1/external/courier/serviceability", {
      params: {
        pickup_postcode: "462001", // Replace with your warehouse pincode
        delivery_postcode: pincode,
        cod: 1,
        weight: 1,
      },
      headers: {
        Authorization: `Bearer ${token}`,
      }
    });

    const companies = response.data?.data?.available_courier_companies || [];

    if (companies.length > 0) {
      const charge = companies[0].rate || DEFAULT_DELIVERY_CHARGE;
      res.json({ success: true, charge });
    } else {
      res.json({ success: false, charge: DEFAULT_DELIVERY_CHARGE });
    }
  } catch (err) {
    console.error("❌ Shiprocket API error:", err.response?.data || err.message);
    res.json({ success: false, charge: DEFAULT_DELIVERY_CHARGE });
  }
});

// 💸 Create Razorpay Order
app.post("/create-order", async (req, res) => {
  const { total, deliveryCharge } = req.body;
  const charge = parseFloat(deliveryCharge) || DEFAULT_DELIVERY_CHARGE;
  const totalWithDelivery = total + charge;

  try {
    const order = await razorpay.orders.create({
      amount: totalWithDelivery * 100,
      currency: "INR",
      receipt: "order_rcptid_" + Date.now(),
    });

    res.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("❌ Razorpay error:", err);
    res.status(500).send("Order creation failed");
  }
});

// 📧 Verify order and send email
app.post("/verify-order", async (req, res) => {
  const { cart, delivery, paymentMethod, deliveryCharge } = req.body;
  if (!cart || !delivery || !paymentMethod) {
    return res.status(400).json({ ok: false, error: "Missing data" });
  }

  const charge = parseFloat(deliveryCharge) || DEFAULT_DELIVERY_CHARGE;
  const itemTotal = cart.reduce((sum, item) => sum + item.price * (item.qty || 1), 0);
  const finalTotal = itemTotal + charge;

  const itemList = cart.map(item =>
    `• ${item.name} (Size: ${item.size}, Qty: ${item.qty}) – ₹${item.price} x ${item.qty} = ₹${item.price * item.qty}`
  ).join('\n');

  const paymentText = paymentMethod === 'COD'
    ? '🧾 Payment Method: Cash on Delivery (COD)'
    : '🧾 Payment Method: Online Payment (PAID)';

  const message = `
🛍️ New Order from ${delivery.name}
📞 Phone: ${delivery.phone}
🏠 Address: ${delivery.address}
🏙️ City: ${delivery.city}, ${delivery.state} - ${delivery.pincode}

🧾 Items:
${itemList}

📦 Delivery Charge: ₹${charge}
💰 Item Total: ₹${itemTotal}
💳 Final Total: ₹${finalTotal}
${paymentText}
`.trim();

  try {
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
      text: message,
    });

    console.log("✅ Order email sent.");
    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Email error:", err);
    res.status(500).json({ ok: false });
  }
});

// 🌐 Serve frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
