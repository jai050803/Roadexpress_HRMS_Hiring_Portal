const dotenv = require('dotenv');
const { z } = require('zod');

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().optional(),
  PGHOST: z.string().default('localhost'),
  PGPORT: z.string().default('5432').transform(Number),
  PGUSER: z.string().default('postgres'),
  PGPASSWORD: z.string().default('postgres'),
  PGDATABASE: z.string().default('roadexpress_hrms'),
  JWT_SECRET: z.string().default('roadexpress_hiring_portal_jwt_secret_key_change_in_production'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:3000,http://localhost:3001'),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE_MB: z.string().default('5').transform(Number),
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL: z.string().default('gemini-1.5-flash'),
  EMAIL_PROVIDER: z.string().default('smtp'),
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.string().default('587').transform(Number),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  EMAIL_FROM_ADDRESS: z.string().default('hr@roadexpress.com'),
  EMAIL_FROM_NAME: z.string().default('Road Express HR Team')
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const formattedErrors = parsedEnv.error.format();
  console.error('Invalid environment variables:', JSON.stringify(formattedErrors, null, 2));
  process.exit(1);
}

const env = parsedEnv.data;

module.exports = {
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  database: {
    connectionString: env.DATABASE_URL,
    host: env.PGHOST,
    port: env.PGPORT,
    user: env.PGUSER,
    password: env.PGPASSWORD,
    database: env.PGDATABASE,
    maxConnections: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
  },
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN
  },
  cors: {
    origin: env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
  },
  upload: {
    directory: env.UPLOAD_DIR,
    maxSize: env.MAX_FILE_SIZE_MB * 1024 * 1024
  },
  gemini: {
    apiKey: env.GEMINI_API_KEY,
    model: env.GEMINI_MODEL
  },
  email: {
    provider: env.EMAIL_PROVIDER,
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    fromAddress: env.EMAIL_FROM_ADDRESS,
    fromName: env.EMAIL_FROM_NAME
  }
};
