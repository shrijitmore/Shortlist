import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';

interface StreamedEvent {
  event: string;
  data: any;
  timestamp: number;
}

@Injectable()
export class StreamService {
  private readonly logger = new Logger(StreamService.name);
  private clients = new Map<string, Response>();
  private readonly eventBuffers = new Map<string, StreamedEvent[]>();
  private readonly BUFFER_TIMEOUT_MS = 30000; // Keep events for 30s

  register(requestId: string, res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    this.clients.set(requestId, res);

    // Replay buffered events
    const buffer = this.eventBuffers.get(requestId);
    if (buffer && buffer.length > 0) {
      this.logger.log(`Replaying ${buffer.length} events for ${requestId}`);
      for (const item of buffer) {
        this.sendToClient(res, item.event, item.data);
      }
    }

    res.on('close', () => {
      this.clients.delete(requestId);
    });
  }

  emit(requestId: string, event: string, data: object): void {
    const payload: StreamedEvent = { event, data, timestamp: Date.now() };

    // Update buffer
    if (!this.eventBuffers.has(requestId)) {
      this.eventBuffers.set(requestId, []);
    }
    this.eventBuffers.get(requestId)!.push(payload);

    // Send to connected client
    const client = this.clients.get(requestId);
    if (client) {
      this.sendToClient(client, event, data);
    }
  }

  private sendToClient(res: Response, event: string, data: any) {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  close(requestId: string): void {
    const client = this.clients.get(requestId);
    if (client) {
      this.sendToClient(client, 'done', {});
      client.end();
      this.clients.delete(requestId);
    }
    // Final cleanup of buffer after a short delay to allow last-second connections
    setTimeout(() => {
      this.eventBuffers.delete(requestId);
    }, 5000);
  }
}
