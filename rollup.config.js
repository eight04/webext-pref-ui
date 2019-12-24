import babel from "rollup-plugin-babel";

export default {
  input: [
    "src/index.js"
  ],
  output: {
    format: "cjs",
    dir: "dist",
    esModule: false
  },
  plugins: [
    babel()
  ],
  external: Object.keys(require("./package.json").dependencies),
  preserveModules: true
};
