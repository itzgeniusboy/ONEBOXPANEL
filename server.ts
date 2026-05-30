import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = express();
const PORT = 3000;

// Middleware for JSON matching
app.use(express.json());

// Initialize Firebase client context specifically on the server to handle SDK validations securely
const firebaseApp = initializeApp(firebaseConfig);
const firestoreDb = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

  // ----------------------------------------------------
  // Android .aar Client SDK Virtual Key Validation API
  // ----------------------------------------------------
  app.post("/api/validate-key", async (req, res) => {
    const { key, hwid, packageName } = req.body;

    // Strict validation inputs
    if (!key || typeof key !== "string" || key.trim() === "") {
      return res.status(400).json({
        status: "ERROR",
        code: "MISSING_KEY",
        message: "License key is required."
      });
    }

    if (!hwid || typeof hwid !== "string" || hwid.trim() === "") {
      return res.status(400).json({
        status: "ERROR",
        code: "MISSING_HWID",
        message: "Device hardware ID (HWID) is required."
      });
    }

    if (!packageName || typeof packageName !== "string" || packageName.trim() === "") {
      return res.status(400).json({
        status: "ERROR",
        code: "MISSING_PACKAGE_NAME",
        message: "Calling application package name is required."
      });
    }

    const cleanKey = key.trim();
    const cleanHwid = hwid.trim();
    const cleanPackage = packageName.trim();

    // Trace Attempt Helper to record client entries in Firestore logs
    const logValidationAttempt = async (status: string, sdkType: string = "Unknown", errorMessage: string = "") => {
      try {
        const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await setDoc(doc(firestoreDb, "logs", logId), {
          key: cleanKey,
          hwid: cleanHwid,
          packageName: cleanPackage,
          status,
          ip: req.ip || req.headers['x-forwarded-for'] || "unknown",
          sdkType,
          errorMessage,
          timestamp: new Date()
        });
      } catch (err) {
        console.error("Firestore logging failed:", err);
      }
    };

    try {
      const keyDocRef = doc(firestoreDb, "keys", cleanKey);
      const keyDocSnap = await getDoc(keyDocRef);

      // Rule 1: Validate existence
      if (!keyDocSnap.exists()) {
        await logValidationAttempt("failed_invalid_key", "Unknown", "Key does not exist in database registry.");
        return res.status(403).json({
          status: "ERROR",
          code: "INVALID_KEY",
          message: "The entered license key does not exist or is invalid."
        });
      }

      const keyData = keyDocSnap.data();

      // Rule 2: Check status blocks
      if (keyData.status === "blocked") {
        await logValidationAttempt("failed_blocked", keyData.sdkType, "Key has been blocked by administrator.");
        return res.status(403).json({
          status: "ERROR",
          code: "BLOCKED",
          message: "This license has been blocked/suspended."
        });
      }

      let expiresAt = keyData.expiresAt;
      let activatedAt = keyData.activatedAt;
      let isFirstActivation = false;

      // Rule 3: Life span & Duration logic
      if (keyData.expiryType === "duration") {
        if (!activatedAt) {
          // First-time activation
          isFirstActivation = true;
          const now = new Date();
          const durationDays = keyData.durationDays || 30;
          const expireDate = new Date();
          expireDate.setDate(now.getDate() + durationDays);

          activatedAt = now.toISOString();
          expiresAt = expireDate.toISOString();
        } else {
          const expiresTime = new Date(expiresAt).getTime();
          const currentTime = Date.now();

          if (currentTime > expiresTime) {
            // Auto lock into expired state
            await updateDoc(keyDocRef, { status: "expired", updatedAt: new Date().toISOString() });
            await logValidationAttempt("failed_expired", keyData.sdkType, "Key has expired.");
            return res.status(403).json({
              status: "ERROR",
              code: "EXPIRED",
              message: "This key license has expired."
            });
          }
        }
      }

      // Rule 4: Sandbox package checks
      if (keyData.allowedPackage && keyData.allowedPackage.trim() !== "") {
        if (keyData.allowedPackage.trim() !== cleanPackage) {
          await logValidationAttempt(
            "failed_package_mismatch", 
            keyData.sdkType, 
            `Mismatch: expected ${keyData.allowedPackage}, but requested ${cleanPackage}`
          );
          return res.status(403).json({
            status: "ERROR",
            code: "PACKAGE_MISMATCH",
            message: `This license key belongs to another application package/signature: ${keyData.allowedPackage}`
          });
        }
      }

      // Rule 5: Multi-hardware registrations
      const devices = keyData.devices || {};
      const deviceRegistered = cleanHwid in devices;

      if (!deviceRegistered) {
        const deviceLimit = keyData.deviceLimit || 0;
        const currentCount = keyData.deviceCount || 0;

        if (deviceLimit > 0 && currentCount >= deviceLimit) {
          await logValidationAttempt(
            "failed_hwid_limit", 
            keyData.sdkType, 
            `Hardware registration ceiling reached: current ${currentCount} / limit ${deviceLimit}`
          );
          return res.status(403).json({
            status: "ERROR",
            code: "DEVICE_LIMIT_EXCEEDED",
            message: `Maximum virtual environment count matched. Limit: ${deviceLimit} device(s).`
          });
        }

        // Register hardware registry key
        devices[cleanHwid] = {
          registeredAt: new Date().toISOString(),
          lastActive: new Date().toISOString()
        };

        const totalDevices = Object.keys(devices).length;
        const fieldsUpdate: any = {
          devices,
          deviceCount: totalDevices,
          updatedAt: new Date().toISOString()
        };

        if (isFirstActivation) {
          fieldsUpdate.activatedAt = activatedAt;
          fieldsUpdate.expiresAt = expiresAt;
          fieldsUpdate.status = "active";
        }

        await updateDoc(keyDocRef, fieldsUpdate);
      } else {
        // Hardware is re-checking/keeping session live
        devices[cleanHwid].lastActive = new Date().toISOString();
        await updateDoc(keyDocRef, {
          devices,
          updatedAt: new Date().toISOString()
        });
      }

      // Success
      await logValidationAttempt("success", keyData.sdkType, "Key evaluated successfully.");

      return res.status(200).json({
        status: "SUCCESS",
        message: "License activated.",
        license: {
          key: cleanKey,
          label: keyData.label,
          sdkType: keyData.sdkType || "Standard",
          activatedAt: activatedAt || null,
          expiresAt: expiresAt || null,
          expiryType: keyData.expiryType,
          deviceCount: Object.keys(devices).length,
          deviceLimit: keyData.deviceLimit,
          packageName: keyData.allowedPackage || null,
          status: "active"
        }
      });

    } catch (err: any) {
      console.error("API validate error:", err);
      return res.status(500).json({
        status: "ERROR",
        code: "INTERNAL_ERROR",
        message: "An internal database error has impeded license verification."
      });
    }
  });


  // Serve static files / Vite middleware integration
  if (process.env.NODE_ENV !== "production") {
    createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    }).then((vite) => {
      app.use(vite.middlewares);
    }).catch((err) => {
      console.error("Vite server loader failed:", err);
    });
  } else {
    // Production static directory
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // PORT bindings (disable .listen in Vercel serverless functions environment)
  if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is booted on host 0.0.0.0 at port ${PORT}`);
    });
  }

export default app;
