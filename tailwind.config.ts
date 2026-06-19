import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    // signClass() in lib/format.ts emits "text-up"/"text-down" as literal
    // strings; lib/ must be scanned or those classes never get generated.
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Taiwan market convention: red = up, green = down
        up: "#e02d2d",
        down: "#19a974",
        panel: "#16181d",
        panelborder: "#262a31",
      },
    },
  },
  plugins: [],
};

export default config;
