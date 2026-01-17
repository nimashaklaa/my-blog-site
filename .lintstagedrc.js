const path = require("path");

module.exports = {
  "client/src/**/*.{js,jsx,ts,tsx}": (filenames) => {
    const relativeFiles = filenames.map((f) => path.relative("client", f));
    return [
      `prettier --write ${filenames.join(" ")}`,
      `cd client && npx eslint --fix --max-warnings=0 ${relativeFiles.join(" ")}`,
    ];
  },
  "client/**/*.{json,css,scss,md}": (filenames) => {
    return `prettier --write ${filenames.join(" ")}`;
  },
  "backend/**/*.ts": (filenames) => {
    const relativeFiles = filenames.map((f) => path.relative("backend", f));
    return [
      `prettier --write ${filenames.join(" ")}`,
      `cd backend && npx eslint --fix --max-warnings=0 ${relativeFiles.join(" ")}`,
    ];
  },
  "backend/**/*.{json,md}": (filenames) => {
    return `prettier --write ${filenames.join(" ")}`;
  },
  "*.{json,md}": (filenames) => {
    return `prettier --write ${filenames.join(" ")}`;
  },
};

