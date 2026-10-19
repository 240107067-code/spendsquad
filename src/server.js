import { createApp } from './app.js';
import { openDb } from './db.js';

const port = Number(process.env.PORT) || 3000;
const db = openDb(process.env.DB_FILE || 'data/spendsquad.db');
createApp(db).listen(port, () => console.log(`SpendSquad running on http://localhost:${port}`));
