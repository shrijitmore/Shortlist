import { Injectable, Logger } from '@nestjs/common';
import { ChatVertexAI } from '@langchain/google-vertexai';
import { ConstantsService } from '../constants/constants.service';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private model: ChatVertexAI | null = null;
  private fallbackMode = false;

  constructor(private readonly constants: ConstantsService) {
    const creds = this.constants.getGeminiServiceCredentials();
    if (!creds || !creds.project_id) {
      this.logger.warn('No valid GEMINI_SERVICE_JSON set. AI calls will fall back.');
      this.fallbackMode = true;
    } else {
      try {
        this.model = new ChatVertexAI({
          location: 'us-central1',
          authOptions: {
            credentials: creds,
            projectId: creds.project_id,
          },
          model: 'gemini-2.5-flash',
          temperature: 0,
        });
        this.logger.log('ChatVertexAI initialised.');
      } catch (e) {
        this.logger.error('Failed to initialise ChatVertexAI', e);
        this.fallbackMode = true;
      }
    }
  }

  getModel(): ChatVertexAI {
    if (!this.model) throw new Error('ChatVertexAI is not initialised.');
    return this.model;
  }

  isFallback(): boolean {
    return this.fallbackMode;
  }
}
