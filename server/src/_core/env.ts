export const ENV = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "3001", 10),
  databaseUrl: process.env.DATABASE_URL || "",
  ownerOpenId: process.env.OWNER_OPEN_ID || "",
  sessionSecret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  outlookClientId: process.env.OUTLOOK_CLIENT_ID || "",
  outlookClientSecret: process.env.OUTLOOK_CLIENT_SECRET || "",
  s3BucketName: process.env.S3_BUCKET_NAME || "",
  s3Region: process.env.S3_REGION || "us-east-1",
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID || "",
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  appUrl: process.env.APP_URL || "http://localhost:5173",
  // Ollama Configuration
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
  ollamaModel: process.env.OLLAMA_MODEL || "llama3.2",
  aiProvider: process.env.AI_PROVIDER || "ollama", // ollama, openai, ollama-only
};
