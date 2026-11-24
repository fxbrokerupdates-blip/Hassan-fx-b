import { z } from "zod";
import { COUNTRY_CODES } from "@/lib/countries";

export const PROFESSION_VALUES = ["trader", "introducing_broker", "broker_employee", "affiliate_partner", "content_creator",
  "financial_analyst", "business_owner", "other"] as const;

export const passwordSchema = z.string()
  .min(10, "Password must be at least 10 characters")
  .max(72, "Password is too long")
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[0-9]/, "Include a number");

export const signUpSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(200),
  phone_country_code: z.string().regex(/^\+[0-9]{1,4}$/, "Select a country code"),
  phone: z.string().trim().regex(/^[0-9 ]{5,20}$/, "Enter a valid phone number (digits only)"),
  country: z.string().refine((c) => COUNTRY_CODES.has(c), "Select your country"),
  profession: z.enum(PROFESSION_VALUES, { message: "Select your profession" }),
  password: passwordSchema,
  confirm_password: z.string(),
  terms: z.literal("on", { message: "You must accept the Terms and Privacy Policy" }),
  marketing: z.literal("on").optional(),
}).refine((d) => d.password === d.confirm_password, { path: ["confirm_password"], message: "Passwords do not match" });

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(200),
  password: z.string().min(1, "Enter your password").max(200),
  remember: z.literal("on").optional(),
  next: z.string().max(300).optional(),
});

export function passwordStrength(pw: string): { score: number; label: string } {
  let score = 0;
  if (pw.length >= 10) score++;
  if (pw.length >= 14) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return { score, label: ["Very weak", "Weak", "Fair", "Good", "Strong", "Very strong"][score] };
}
