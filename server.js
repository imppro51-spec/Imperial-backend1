require("dotenv").config();

const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

/* ================= RAZORPAY ================= */

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.error("❌ Razorpay ENV variables missing!");
  process.exit(1);
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/* ================= DUMMY BOOKING DATA ================= */
/* ⚠ Replace this with Firebase later */

const bookings = {
  IMP001: { totalAmount: 50000, discount: 5000 },
  IMP002: { totalAmount: 30000, discount: 0 },
};

/* ================= CREATE ORDER ================= */

app.post("/create-order", async (req, res) => {
  try {
    const { bookingId, paymentType } = req.body;

    if (!bookingId || !paymentType) {
      return res.status(400).json({ error: "Missing bookingId/paymentType" });
    }

    const booking = bookings[bookingId];

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const netTotal =
      Number(booking.totalAmount) - Number(booking.discount || 0);

    let amount = 0;

    if (paymentType === "advance") amount = Math.round(netTotal * 0.2);
    if (paymentType === "mid") amount = Math.round(netTotal * 0.3);
    if (paymentType === "final") amount = Math.round(netTotal * 0.5);

    if (amount <= 0) {
      return res.status(400).json({ error: "Invalid amount calculation" });
    }

    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: bookingId,
    });

    res.json({
      orderId: order.id,
      key: process.env.RAZORPAY_KEY_ID,
      amount: amount * 100,
    });

  } catch (err) {
    console.error("❌ CREATE ORDER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ================= VERIFY PAYMENT ================= */

app.post("/verify-payment", (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return res.status(400).json({ error: "Invalid signature" });
    }

    res.json({ success: true });

  } catch (err) {
    console.error("❌ VERIFY ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ================= SERVER ================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("🚀 Secure Server Running on port " + PORT);
});
