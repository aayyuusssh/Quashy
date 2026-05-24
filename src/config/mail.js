import nodemailer from "nodemailer";
import dotenv from "dotenv"

dotenv.config({
    path:"./.env"
})
//   Creates an authorized transport pipeline to dispatch real SMTP emails
 
export const mailTransporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT, 10) || 2525,
    seccure:false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
    
});

// Verify connection configuration
mailTransporter.verify()
    .then(() => {
        console.log("SMTP Mail Transporter initialized and ready to dispatch.");
    })
    .catch((error) => {

        console.error("SMTP Mail Server Connection Failed:", error.message);
    });
