const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const cors = require("cors");

const app = express();

/* ================= MIDDLEWARE ================= */

app.use(express.json());

app.use(cors({
  origin: "*", // production me domain laga dena
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.options("*", cors());

/* ================= RAZORPAY INIT ================= */

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.error("❌ Razorpay ENV variables missing");
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/* =================================================
   CREATE ORDER  (Universal Payment Handler)
================================================= */

app.post("/create-order", async (req, res) => {
  try {

    const {
      bookingId,
      totalAmount,
      discount = 0,
      paymentType // advance | full | mid | final
    } = req.body;

    if (!bookingId || !totalAmount || !paymentType) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const total = Number(totalAmount);
    const disc = Number(discount);
    const netTotal = total - disc;

    let amount = 0;

    switch (paymentType) {

      case "advance": // Checkout advance
        amount = netTotal * 0.20;
        break;

      case "full": // Checkout full payment
        amount = netTotal;
        break;

      case "mid": // MyBookings mid
        amount = netTotal * 0.30;
        break;

      case "final": // MyBookings final
        amount = netTotal * 0.50;
        break;

      default:
        return res.status(400).json({ error: "Invalid payment type" });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: "Invalid amount calculation" });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // paisa format
      currency: "INR",
      receipt: bookingId + "_" + paymentType,
    });

    console.log("✅ Order Created:", order.id, "Type:", paymentType);

    res.json({
      order,
      key: process.env.RAZORPAY_KEY_ID
    });

  } catch (err) {
    console.error("❌ Create Order Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* =================================================
   VERIFY PAYMENT
================================================= */

app.post("/verify-payment", (req, res) => {
  try {

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      console.log("✅ Payment Verified");
      return res.json({ success: true });
    } else {
      console.log("❌ Signature Mismatch");
      return res.status(400).json({ success: false });
    }

  } catch (err) {
    console.error("❌ Verification Error:", err.message);
    res.status(500).json({ success: false });
  }
});

/* ================= HEALTH CHECK ================= */

app.get("/", (req, res) => {
  res.send("Imperial Backend Running 🚀");
});

/* ================= SERVER START ================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () =>
  console.log("🚀 Secure Server Running on port " + PORT)
);
