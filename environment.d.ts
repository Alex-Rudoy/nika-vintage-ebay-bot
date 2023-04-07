declare global {
  namespace NodeJS {
    interface ProcessEnv {
      GOOGLE_SPREADSHEET_ID: string;
      GOOGLE_SPREADSHEET_WORKSHEET_NAME: string;
      TELEGRAM_TOKEN: string;
      GOOGLE_CLOUD_PRIVATE_KEY_ID: string;
      GOOGLE_CLOUD_PRIVATE_KEY: string;
      GOOGLE_CLOUD_CLIENT_EMAIL: string;
      GOOGLE_CLOUD_CLIENT_ID: string;
      GOOGLE_CLOUD_CERT_URL: string;
    }
  }
}

export {};
