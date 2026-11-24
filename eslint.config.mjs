import next from "eslint-config-next/core-web-vitals";
import ts from "eslint-config-next/typescript";

const config = [
  ...next,
  ...ts,
  { ignores: [".next/**", "node_modules/**", "public/sw.js", "scripts/**", "next-env.d.ts"] },
  { rules: { "@typescript-eslint/no-explicit-any": "warn" } },
  {
    // Async Server Components render once per request, so reading the clock or picking a
    // random ad is intentional there. The purity rule targets client re-renders.
    files: ["src/app/**/page.tsx", "src/components/ads/ad-slot.tsx"],
    rules: { "react-hooks/purity": "off" },
  },
];
export default config;

