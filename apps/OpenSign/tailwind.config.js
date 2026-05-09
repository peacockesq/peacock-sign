/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {}
  },
  plugins: [
    require("daisyui"),
    function ({ addUtilities, addVariant }) {
      // ✅ Variants that match html[data-theme="..."] (or any ancestor with data-theme)
      addVariant("opensigncss", '[data-theme="opensigncss"] &');
      addVariant("opensigndark", '[data-theme="opensigndark"] &');

      addUtilities({
        // Prevent iOS long-press popup
        ".touch-callout-none": {
          "-webkit-touch-callout": "none"
        },
        // VS Code-style disabled button for all themes
        ".op-btn-vscode-disabled": {
          "background-color": "#3C3C3C !important",
          color: "#CCCCCC !important",
          "border-color": "#565656 !important",
          cursor: "not-allowed !important",
          opacity: "1 !important",
          "&:hover": {
            "background-color": "#3C3C3C !important",
            color: "#CCCCCC !important",
            "border-color": "#565656 !important",
            transform: "none !important"
          }
        },
        // Dark mode icon improvements using DaisyUI theme detection
        '[data-theme="opensigndark"] .icon-improved': {
          color: "#CCCCCC !important"
        },
        '[data-theme="opensigndark"] .icon-muted': {
          color: "#999999 !important"
        },
        '[data-theme="opensigndark"] .icon-disabled': {
          color: "#858585 !important"
        },
        // Gray text improvements for dark mode
        '[data-theme="opensigndark"] .text-gray-500': {
          color: "#CCCCCC !important"
        },
        '[data-theme="opensigndark"] .text-gray-400': {
          color: "#999999 !important"
        },
        '[data-theme="opensigndark"] .text-gray-600': {
          color: "#CCCCCC !important"
        },
        // CSS variable utilities that work with arbitrary values
        ".icon-themed": {
          color: "var(--icon-color)"
        },
        ".icon-themed-muted": {
          color: "var(--icon-color-muted)"
        },
        ".icon-themed-disabled": {
          color: "var(--icon-color-disabled)"
        },
        ".btn-themed-disabled": {
          "background-color": "var(--btn-disabled-bg)",
          color: "var(--btn-disabled-color)",
          "border-color": "var(--btn-disabled-border)",
          cursor: "not-allowed",
          "&:hover": {
            "background-color": "var(--btn-disabled-bg)",
            color: "var(--btn-disabled-color)",
            "border-color": "var(--btn-disabled-border)",
            transform: "none"
          }
        }
      });
    }
  ],
  daisyui: {
    // themes: true,
    themes: [
      {
        opensigndark: {
          primary: "#007ACC", // VS Code blue - CTA & highlight color
          "primary-content": "#FFFFFF",

          secondary: "#1F2937", // Sidebar background (darker slate)
          "secondary-content": "#E5E7EB",

          accent: "#4A9EFF", // Lighter VS Code blue for hover, minor CTA
          "accent-content": "#FFFFFF",

          neutral: "#3C3C3C", // VS Code inactive/disabled element background
          "neutral-content": "#CCCCCC", // VS Code inactive text color

          "base-100": "#121212", // App background
          "base-200": "#181818", // Slight elevation (cards)
          "base-300": "#1E1E1E", // Further elevated items (panels)
          "base-content": "#F3F4F6", // Main text color (soft white)

          info: "#2563EB", // For info panels like "Out for signature"
          success: "#22C55E", // Optional: for completed docs or alerts
          warning: "#FBBF24",
          error: "#EF4444",

          "--rounded-btn": "1.9rem",
          "--tab-border": "2px",
          "--tab-radius": "0.7rem",

          // Custom CSS variables for icon and button states
          "--icon-color": "#CCCCCC",
          "--icon-color-muted": "#999999",
          "--icon-color-disabled": "#858585",
          "--btn-disabled-bg": "#3C3C3C",
          "--btn-disabled-color": "#CCCCCC",
          "--btn-disabled-border": "#565656",

          // Optional polish
          "--navbar-padding": "0.8rem",
          "--border-color": "#2C2C2C", // Card/table separation
          "--tooltip-color": "#1F2937"
        }
      },
      {
        opensigncss: {
          // LexySign: Sanctuary System Iron Amber slot.
          primary: "#7A5C1E",
          "primary-content": "#FFF8E8",
          secondary: "#15120B",
          "secondary-content": "#F6EAD6",
          accent: "#C08A2A",
          "accent-content": "#15120B",
          neutral: "#E7DAC0",
          "neutral-content": "#1F1708",
          "base-100": "#FFFFFF",
          "base-200": "#F8F2E7",
          "base-300": "#E7DAC0",
          "base-content": "#1D1B18",
          info: "#515F74",
          "info-content": "#F5F5F4",
          success: "#2E6B4F",
          "success-content": "#F5F5F4",
          warning: "#C08A2A",
          "warning-content": "#15120B",
          error: "#B02700",
          "error-content": "#FFF5F3",
          "--rounded-btn": "1.4rem",
          "--tab-border": "2px",
          "--tab-radius": "0.7rem"
        }
      }
    ],
    prefix: "op-"
  }
};
