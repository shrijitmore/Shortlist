// apps/backend/src/database/database.service.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { ConstantsService } from '../constants/constants.service';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);
  private db: Database.Database;

  constructor(private readonly constants: ConstantsService) {}

  onModuleInit() {
    const dbDir = this.constants.getDbDir();
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    const dbPath = path.join(dbDir, this.constants.getDbFilename());
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.logger.log(`SQLite connected: ${dbPath}`);
    this.migrate();
  }

  private migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cars (
        id INTEGER PRIMARY KEY,
        brand TEXT NOT NULL,
        model TEXT NOT NULL,
        variant TEXT NOT NULL,
        price_min_lakh REAL NOT NULL,
        price_max_lakh REAL NOT NULL,
        fuel_type TEXT NOT NULL,
        transmission TEXT NOT NULL,
        seating INTEGER NOT NULL,
        length_mm INTEGER NOT NULL,
        mileage_kmpl REAL NOT NULL,
        safety_rating REAL NOT NULL,
        segment TEXT NOT NULL,
        source_tag TEXT NOT NULL DEFAULT 'CarDekho 2025',
        image_url TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        raw_input TEXT NOT NULL,
        parsed_data TEXT,
        clarifier_question TEXT,
        clarifier_options TEXT,
        clarifier_answer TEXT,
        shortlist TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    this.logger.log('Database migrated');
  }

  getDb(): Database.Database {
    return this.db;
  }
}
