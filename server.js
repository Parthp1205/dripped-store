const express = require('express');
const Razorpay = require('razorpay');
const cors = require('cors');
const nodemailer = require('nodemailer');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const DEFAULT_DELIVERY_CHARGE = 120;

// ✅ Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ✅ Shiprocket Token Fetcher
async function getShiprocketToken() {
  const response = await axios.post('https://apiv2.shiprocket.in/v1/external/auth/login', {
    email: process.env.SHIPROCKET_EMAIL,
    password: process.env.SHIPROCKET_PASSWORD,
  });
  return response.data.token;
}

// ✅ Shiprocket Pincode Check
app.get("/api/check_pincode", async (req, res) => {
  const { pincode } = req.query;
  if (!pincode) return res.status(400).json({ success: false, error: "Pincode is required" });

  try {
    const token = await getShiprocketToken();

    const response = await axios.get("https://apiv2.shiprocket.in/v1/external/courier/serviceability", {
      params: {
        pickup_postcode: "462001", // Change to your warehouse pincode
        delivery_postcode: pincode,
        cod: 1,
        weight: 1
      },
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    const data = response.data;

    if (data?.data?.available_courier_companies?.length > 0) {
      const charge = data.data.available_courier_companies[0].rate || DEFAULT_DELIVERY_CHARGE;
      res.json({ success: true, charge });
    } else {
      res.json({ success: false, charge: DEFAULT_DELIVERY_CHARGE });
    }

  } catch (error) {
    console.error("❌ Shiprocket API error:", error?.response?.data || error.message);
    res.json({ success: false, charge: DEFAULT_DELIVERY_CHARGE });
  }
});

// ✅ Create Razorpay Order
app.post("/create-order", async (req, res) => {
  const { total, deliveryCharge } = req.body;
  const charge = parseFloat(deliveryCharge) || DEFAULT_DELIVERY_CHARGE;
  const totalWithDelivery = total + charge;

  const options = {
    amount: totalWithDelivery * 100, // In paisa
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

// ✅ Verify Order and Send Email
app.post("/verify-order", async (req, res) => {
  const { cart, delivery, paymentMethod, deliveryCharge } = req.body;

  if (!cart || !delivery || !paymentMethod) {
    return res.status(400).json({ ok: false, error: "Missing data" });
  }

  const charge = parseFloat(deliveryCharge) || DEFAULT_DELIVERY_CHARGE;
  const itemTotal = cart.reduce((sum, item) => sum + item.price * (item.qty || 1), 0);
  const finalTotal = itemTotal + charge;

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

📦 Delivery Charge: ₹${charge}
💰 Item Total: ₹${itemTotal}
💳 Final Total: ₹${finalTotal}
${paymentText}`.trim();

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
      text: fullMessage,
    });

    console.log("✅ Email sent.");
    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Failed to send email:", err);
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
