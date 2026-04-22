import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cron from "node-cron";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import dotenv from "dotenv";

dotenv.config();

// Initialize Firebase Admin
// In this environment, we use the project ID from the config
const adminApp = initializeApp({
  projectId: "intellipath-118dd"
});
const db = getFirestore(adminApp, "ai-studio-5b11a408-3a4b-42f7-831b-6f0a0829172c");

const app = express();
const PORT = 3000;

app.use(express.json());

// Notification System (Infobip)
async function sendNotification(phoneNumber: string, message: string) {
  // Hardcoded credentials as requested for Netlify deployment
  const apiKey = "3c5ff54ca7ba8e62fb46bd1439972fcb-e20478ed-2077-4707-a6f6-088378208b1b";
  const baseUrl = "https://vj33p3.api.infobip.com"; 
  const senderId = "447491163443";

  console.log(`[INFOBIP ATTEMPT]: Sending to ${phoneNumber}`);

  // Format phone number (ensure it starts with 880)
  let formattedNumber = phoneNumber.replace(/\D/g, '');
  if (formattedNumber.length === 11 && formattedNumber.startsWith('0')) {
    formattedNumber = '88' + formattedNumber;
  } else if (formattedNumber.length === 10) {
    formattedNumber = '880' + formattedNumber;
  }

  try {
    // 1. Send SMS
    const smsResponse = await fetch(`${baseUrl}/sms/2/text/advanced`, {
      method: 'POST',
      headers: {
        'Authorization': `App ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        messages: [{
          from: senderId,
          destinations: [{ to: formattedNumber }],
          text: message
        }]
      })
    });
    
    const smsData = await smsResponse.json();
    console.log("Infobip SMS Response:", JSON.stringify(smsData));

    // 2. Send Voice Call (Text-to-Speech)
    const voiceResponse = await fetch(`${baseUrl}/tts/3/advanced`, {
      method: 'POST',
      headers: {
        'Authorization': `App ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        messages: [{
          from: senderId,
          destinations: [{ to: formattedNumber }],
          text: message,
          language: "bn",
          voice: {
            name: "Ananya",
            gender: "female"
          }
        }]
      })
    });
    
    const voiceData = await voiceResponse.json();
    console.log("Infobip Voice Response:", JSON.stringify(voiceData));

    return { success: true, sms: smsData, voice: voiceData };
  } catch (error) {
    console.error("Infobip Error:", error);
    throw error;
  }
}

// Cron Job: Run every hour to check for completed hatches
cron.schedule('0 * * * *', async () => {
  console.log("Running hatch check cron job...");
  try {
    const now = Timestamp.now();
    const ordersRef = db.collection('orders');
    const snapshot = await ordersRef
      .where('status', '==', 'hatching')
      .where('notified', '!=', true)
      .get();

    for (const doc of snapshot.docs) {
      const order = doc.data();
      const hatchDate = order.hatchDate;

      if (hatchDate && hatchDate.toMillis() <= now.toMillis()) {
        const message = `আসসালামু আলাইকুম ${order.customerName}, গোল্ডেন চিকস থেকে বলছি। আপনার ডিম ফুটে বাচ্চা বের হয়েছে। অনুগ্রহ করে আপনার বাচ্চাগুলো সংগ্রহ করুন। ধন্যবাদ।`;
        
        await sendNotification(order.customerNumber, message);
        
        // Update order as notified
        await doc.ref.update({ notified: true });
        console.log(`Notification sent for order ${doc.id}`);
      }
    }
  } catch (error) {
    console.error("Cron job error:", error);
  }
});

// API Routes
app.post("/api/send-test", async (req, res) => {
  const { phoneNumber, message } = req.body;
  await sendNotification(phoneNumber, message);
  res.json({ success: true });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
