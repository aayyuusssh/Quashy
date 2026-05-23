import { rateLimit } from "express-rate-limit";

// Universal Request Limiter Security Shield
//   Restricts single IP addresses from spamming server resources.
 
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes time window
    limit: 100, // Restrict each IP address to a maximum of 100 total requests per window 
    message: {
        statusCode: 429,
        success: false,
        message: "Too many requests originating from this device. Please try again after 15 minutes.",
        data: null
    },
    standardHeaders: "draft-7", // Return standard rate limit info info inside headers
    legacyHeaders: false, // Disable the X-RateLimit-* old standard headers
});

// High-Security Strict Limiter
//   Specifically targets brute-force sensitive operations like account creation and logins.

export const strictAuthLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes time window
    limit: 10, // Restrict to a maximum of 10 attempts per 5 minutes
    message: {
        statusCode: 429,
        success: false,
        message: "Too many connection attempts detected. Security cooldown active. Try again in 5 minutes.",
        data: null
    },
    standardHeaders: "draft-7",
    legacyHeaders: false,
});


export const contentCreationLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute sliding window
    limit: 30, // Restricts a user to 30 submissions per minute
    message: {
        statusCode: 429,
        success: false,
        message: "You are submitting questions too quickly. Please slow down and wait a moment.",
        data: null
    },
    standardHeaders: "draft-7",
    legacyHeaders: false,
});

export const bulkUploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15-minute tracking window
    limit: 5, //  Limits each IP address to 5 bulk upload requests every 15 minutes
    message: {
        statusCode: 429,
        success: false,
        message: "Bulk upload capacity threshold reached. Please wait 15 minutes before importing more question sets.",
        data: null
    },
    standardHeaders: "draft-7",
    legacyHeaders: false,
});