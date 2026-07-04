export async function mockUploadFile(fileName: string) {
  return {
    fileName,
    url: `/mock-uploads/${fileName}`,
    uploadedAt: "Just now",
  };
}
