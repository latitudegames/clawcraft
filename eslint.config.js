import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/.tmp/**",
      "**/dist/**",
      "**/prisma/migrations/**",
      "**/public/**"
    ]
  },
  ...nextCoreWebVitals,
  ...nextTypescript
];

export default config;
