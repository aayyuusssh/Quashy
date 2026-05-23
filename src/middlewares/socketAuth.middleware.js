import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import cookie from "cookie"
// Intercepts incoming WebSocket handshakes, parsing HttpOnly cookies to authenticate sessions
 
export const verifySocketJWT = async (socket, next) => {
    try {
        // Parse cookies out of the socket's incoming HTTP request headers
        const cookieHeader = socket.request.headers.cookie;
        if (!cookieHeader) {
            return next(new Error("Authentication error: No session cookies present"));
        }

        // Quick helper regex to isolate the accessToken string from the cookie jar
        const cookies = cookie.parse(cookieHeader || "");
        const token = cookies.accessToken;


        if (!token) {
            return next(new Error("Authentication error: Access token missing"));
        }

        // Cryptographically decode the token signature
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        
        // Fetch profile data out of MongoDB
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
        if (!user) {
            return next(new Error("Authentication error: User profile not found"));
        }

        // SUCCESS: Attach the authenticated profile record straight onto the socket container context!
        socket.user = user;
        next(); // Hand execution off smoothly to your handlers

    } catch (error) {
        if (error.name === "TokenExpiredError") {
            console.warn("Socket auth: JWT expired for socket", socket.id);
        } else if (error.name === "JsonWebTokenError") {
            console.error("Socket auth: Invalid JWT signature for socket", socket.id);
        } else {
            console.error("Socket auth: Unexpected error for socket", socket.id, error);
        } 
          return next(new Error("Authentication error: Token is invalid or expired"));
    }
};
