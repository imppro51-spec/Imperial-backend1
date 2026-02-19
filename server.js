const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ================= CREATE ORDER =================

app.post("/create-order", async (req, res) => {
  try {
    const { bookingId, totalAmount, paymentType } = req.body;

    if (!bookingId || !totalAmount) {
      return res.status(400).json({ error: "Missing data" });
    }

    let amount = Number(totalAmount);

    // Advance = 20%
    if (paymentType === "advance") {
      amount = amount * 0.2;
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: bookingId,
    });

    res.json({
      order,
      key: process.env.RAZORPAY_KEY_ID,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= VERIFY PAYMENT =================

app.post("/verify-payment", (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = req.body;

  const body = razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  if (expectedSignature === razorpay_signature) {
    res.json({ success: true });
  } else {
    res.status(400).json({ success: false });
  }
});

app.get("/", (req, res) => {
  res.send("Imperial Backend Running 🚀");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("🚀 Secure Server Running on port " + PORT));
