import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import peerDepsExternal from "rollup-plugin-peer-deps-external";
import dts from "rollup-plugin-dts";

// import pkgJson from "./package.json";

export default [
  {
    input: "src/index.ts",
    output: {
      dir: "dist",
      format: "cjs",
      // sourcemap: true,
    },
    plugins: [peerDepsExternal(), resolve(), typescript()]
  },
  {
    input: "src/index.ts",
    output: [{ file: "dist/index.d.ts", format: "es" }],
    plugins: [dts()],
  }
];
