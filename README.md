# Nika Vintage eBay Bot

Monitors eBay saved searches for vintage items and sends new listing links to Telegram. Runs as a **one-shot cron job** every 2 hours via GitHub Actions — no always-on server.

## How it works

1. Reads brand search URLs from a Google Sheet
2. Queries the eBay Browse API for each brand
3. Inserts new item links into MongoDB (unique index on `link` deduplicates)
4. Sends a Telegram message for each new link
5. Deletes link records older than 90 days
6. Exits — the next run is triggered by the schedule

## Prerequisites

| Service | What you need |
| ------- | ------------- |
| **MongoDB Atlas** | Cluster + connection string; `links` collection |
| **eBay Developer** | Production app with Browse API access; Client ID + Secret |
| **Telegram** | Bot token from [@BotFather](https://t.me/BotFather); chat IDs for recipients |
| **Google Cloud** | Service account with access to the spreadsheet; JSON key (client email + private key) |
| **Google Sheet** | Spreadsheet ID and worksheet name with brand rows (`url`, `brandName`) |

---

## MongoDB setup

The app creates a unique index on `links.link` at startup. If the collection already has duplicate `link` values, index creation will fail — deduplicate first with [mongosh](https://www.mongodb.com/docs/mongodb-shell/):

```javascript
// Find duplicates
db.links.aggregate([
  { $group: { _id: '$link', count: { $sum: 1 }, ids: { $push: '$_id' } } },
  { $match: { count: { $gt: 1 } } },
]);

// Delete extras (keep one document per link), then create the index:
db.links.createIndex({ link: 1 }, { unique: true });
```

---

## GitHub secrets

Add these under **Settings → Secrets and variables → Actions** in your repository:

| Secret | Description |
| ------ | ----------- |
| `MONGO_URL` | MongoDB connection string |
| `TELEGRAM_TOKEN` | Telegram bot token |
| `TELEGRAM_CHAT_IDS` | Comma-separated chat IDs, e.g. `123456789,987654321` |
| `GOOGLE_SPREADSHEET_ID` | Spreadsheet ID from the Google Sheets URL |
| `GOOGLE_SPREADSHEET_WORKSHEET_NAME` | Worksheet tab name |
| `GOOGLE_CLOUD_PRIVATE_KEY` | Service account private key (include `-----BEGIN PRIVATE KEY-----` block; paste with real newlines or `\n` escapes — match what works locally) |
| `GOOGLE_CLOUD_CLIENT_EMAIL` | Service account email |
| `EBAY_CLIENT_ID` | eBay application Client ID |
| `EBAY_CLIENT_SECRET` | eBay application Client Secret |

---

## Deploy with GitHub Actions

Workflow file: [`.github/workflows/ebay-bot-cron.yml`](.github/workflows/ebay-bot-cron.yml)

### Enable Actions

1. Push the repo to GitHub (if not already)
2. Ensure **Actions** are enabled: **Settings → Actions → General**
3. Add all secrets from the table above

### First run

1. Open **Actions → eBay Bot Cron**
2. Click **Run workflow** (`workflow_dispatch`)
3. Confirm the job completes successfully (green check)

### Schedule

- Runs every **2 hours** at minute 0 UTC: `0 */2 * * *`
- Times in UTC — adjust your expectations for local timezone

**60-day inactivity caveat:** GitHub disables scheduled workflows on repos with no commits for 60 days. Push any commit to re-enable, or rely on manual `workflow_dispatch` runs.

### Failure alerts

GitHub sends email notifications when a workflow fails (if enabled in your GitHub notification settings). This replaces the old always-on Telegraf sticker health-check — you no longer need a running bot process for monitoring.

---

## Local development

### Environment

Create a `.env` file in the project root:

```env
MONGO_URL=mongodb+srv://...
TELEGRAM_TOKEN=...
TELEGRAM_CHAT_IDS=123456789,987654321

GOOGLE_SPREADSHEET_ID=...
GOOGLE_SPREADSHEET_WORKSHEET_NAME=Links
GOOGLE_CLOUD_PRIVATE_KEY='-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n'
GOOGLE_CLOUD_CLIENT_EMAIL=...@....iam.gserviceaccount.com

EBAY_CLIENT_ID=...
EBAY_CLIENT_SECRET=...
```

### Commands

```bash
npm install
npm run build
npm run lint
npm run cron          # one-shot job (same as production)
```

`npm run cron` is the integration test path — it runs the full job once and exits.

---

## License

UNLICENSED (private project).
