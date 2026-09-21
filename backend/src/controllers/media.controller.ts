import { NextFunction, Request, Response } from "express";
import { storage } from "../config/firebase";
import { AppError } from "../utils/AppError";
import { sendSuccess } from "../utils/response";

export async function uploadMediaController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { data, fileName, mimeType } = req.body as {
      data?: string;
      fileName?: string;
      mimeType?: string;
    };

    if (!data || typeof data !== "string") {
      throw new AppError(400, "INVALID_MEDIA_PAYLOAD", "Media data payload is required.");
    }

    // Parse base64 or raw data
    const matches = data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    const detectedMime = matches ? matches[1] : mimeType || "image/jpeg";
    const base64Data = matches ? matches[2] : data;

    let buffer: Buffer;
    try {
      buffer = Buffer.from(base64Data, "base64");
    } catch (_err) {
      throw new AppError(400, "INVALID_BASE64", "Failed to decode base64 media payload.");
    }

  // If Firebase Admin Storage is initialized and ready
  if (storage) {
    try {
      const bucket = storage.bucket();
      const sanitizedName = (fileName || `media-${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `emergencies/${Date.now()}-${sanitizedName}`;
      const file = bucket.file(storagePath);

      await file.save(buffer, {
        metadata: {
          contentType: detectedMime,
        },
        resumable: false,
      });

      // Attempt to get a signed URL (valid for 7 days) or fallback to media path
      let downloadUrl = "";
      try {
        const [signedUrl] = await file.getSignedUrl({
          action: "read",
          expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        });
        downloadUrl = signedUrl;
      } catch (_signErr) {
        downloadUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
      }

      sendSuccess(
        res,
        {
          url: downloadUrl,
          path: storagePath,
          contentType: detectedMime,
          sizeBytes: buffer.length,
          storage: "firebase",
        },
        "Media uploaded to Firebase Storage successfully.",
        201,
      );
      return;
    } catch (storageErr) {
      // If bucket is not provisioned in project, fall back safely
      console.warn("[media] Firebase Storage upload failed, falling back to inspection mode:", storageErr);
    }
  }

    sendSuccess(
      res,
      {
        url: null,
        isFallback: true,
        contentType: detectedMime,
        sizeBytes: buffer.length,
        storage: "local",
        message: "Firebase Storage bucket not configured. Media payload accepted for local AI inspection.",
      },
      "Media payload validated for AI inspection.",
      200,
    );
  } catch (err) {
    next(err);
  }
}
