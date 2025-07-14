import dotenv from "dotenv";

dotenv.config();

export const GEYSER_RPC = process.env.GEYSER_RPC || "";
export const GEYSER_KEY = process.env.GEYSER_KEY || "";
export const RPC_URL = process.env.RPC_URL || "";
