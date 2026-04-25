export default {
  input: "./spec.gen.yaml",
  output: {
    path: ".",
    index: false,
    clean: false,
  },
  plugins: [
    "@hey-api/typescript",
    "zod",
  ],
};
