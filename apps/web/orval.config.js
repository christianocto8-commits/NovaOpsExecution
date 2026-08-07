module.exports = {
  pet: {
    output: {
      mode: "tags-split",
      target: "src/generated/api.ts",
      schemas: "src/generated/model",
      client: "react-query",
    },
    input: {
      target: "http://localhost:8000/api/v1/openapi.json",
    },
    hooks: {
      afterAllFilesWritten: ["npx prettier --write src/generated"],
    },
  },
};
