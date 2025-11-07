import crypto from "crypto";

const ENCRYPTION_KEY = process.env.PASSWORD_SECRET;
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
  throw new Error("PASSWORD_SECRET must be set and 32 characters long");
}

const IV_LENGTH = 16;

export const encryptPassword = (password: string) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY),
    iv
  );
  const encrypted = Buffer.concat([
    cipher.update(password, "utf8"),
    cipher.final(),
  ]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
};

export const decryptPassword = (encrypted: string) => {
  const parts = encrypted.split(":");
  if (!parts || parts.length !== 2) {
    throw new Error("Invalid encrypted string format");
  }

  const [ivHex, encryptedHex] = parts;

  if (!ivHex || !encryptedHex) {
    throw new Error("Invalid encrypted string format");
  }

  const iv = Buffer.from(ivHex, "hex");
  const encryptedText = Buffer.from(encryptedHex, "hex");
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY),
    iv
  );
  const decrypted = Buffer.concat([
    decipher.update(encryptedText),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
};
