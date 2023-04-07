import { GoogleSpreadsheet } from 'google-spreadsheet';

// const creds = require('./path/to/google/credentials.json');

const doc = new GoogleSpreadsheet(process.env.GOOGLE_SPREADSHEET_ID);

export async function getUrlsFromGoogleSheet() {
  if (
    !process.env.GOOGLE_SPREADSHEET_WORKSHEET_NAME ||
    !process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID ||
    !process.env.GOOGLE_CLOUD_PRIVATE_KEY ||
    !process.env.GOOGLE_CLOUD_CLIENT_EMAIL ||
    !process.env.GOOGLE_CLOUD_CLIENT_ID
  )
    throw new Error('invalid env');

  await doc.useServiceAccountAuth({
    // type: 'service_account',
    // project_id: 'nikavintageebaybot',
    // private_key_id: process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID,
    private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY,
    client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
    // client_id: process.env.GOOGLE_CLOUD_CLIENT_ID,
    // auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    // token_uri: 'https://oauth2.googleapis.com/token',
    // auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    // client_x509_cert_url: process.env.GOOGLE_CLOUD_CERT_URL,
  });
  await doc.loadInfo();

  const sheet =
    doc.sheetsByTitle[process.env.GOOGLE_SPREADSHEET_WORKSHEET_NAME];
  const rows = await sheet.getRows();
  const urls = rows.map((row) => {
    console.log(row);
    return row.url;
  });
  return urls;
}
