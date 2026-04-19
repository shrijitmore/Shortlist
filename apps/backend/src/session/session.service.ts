// apps/backend/src/session/session.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ParsedIntake } from '../common/types';
import { randomUUID } from 'crypto';

interface Session {
  id: string;
  raw_input: string;
  parsed_data: ParsedIntake | null;
  clarifier_question: string | null;
  clarifier_options: string[] | null;
  clarifier_answer: string | null;
  shortlist: object | null;
}

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(private readonly db: DatabaseService) {}

  create(rawInput: string, parsed: ParsedIntake): Session {
    const id = randomUUID();
    this.db.getDb()
      .prepare(`INSERT INTO sessions (id, raw_input, parsed_data) VALUES (?, ?, ?)`)
      .run(id, rawInput, JSON.stringify(parsed));
    this.logger.log(`Session created: ${id}`);
    return { id, raw_input: rawInput, parsed_data: parsed, clarifier_question: null, clarifier_options: null, clarifier_answer: null, shortlist: null };
  }

  findById(id: string): Session | null {
    const row: any = this.db.getDb()
      .prepare(`SELECT * FROM sessions WHERE id = ?`)
      .get(id);
    if (!row) {
      this.logger.warn(`Session not found: ${id}`);
      return null;
    }
    return {
      ...row,
      parsed_data: row.parsed_data ? JSON.parse(row.parsed_data) : null,
      clarifier_options: row.clarifier_options ? JSON.parse(row.clarifier_options) : null,
      shortlist: row.shortlist ? JSON.parse(row.shortlist) : null,
    };
  }

  saveClarifier(id: string, question: string, options: string[]): void {
    this.db.getDb()
      .prepare(`UPDATE sessions SET clarifier_question = ?, clarifier_options = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(question, JSON.stringify(options), id);
    this.logger.log(`Session ${id} — clarifier saved (${options.length} options)`);
  }

  saveAnswer(id: string, answer: string): void {
    this.db.getDb()
      .prepare(`UPDATE sessions SET clarifier_answer = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(answer, id);
    this.logger.log(`Session ${id} — answer saved: "${answer.substring(0, 60)}…"`);
  }

  saveShortlist(id: string, shortlist: object): void {
    this.db.getDb()
      .prepare(`UPDATE sessions SET shortlist = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(JSON.stringify(shortlist), id);
    this.logger.log(`Session ${id} — shortlist persisted`);
  }
}
