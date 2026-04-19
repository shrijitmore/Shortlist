import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { MemorySaver, Annotation, StateGraph, END, START } from '@langchain/langgraph';
import { ParsedIntake, ClarifyQuestion, Car, ShortlistResult, ClarifyHistoryItem } from '../common/types';
import { IntakeService } from '../intake/intake.service';
import { ClarifyService } from '../clarify/clarify.service';
import { RetrieveService } from '../retrieve/retrieve.service';
import { RankService } from '../rank/rank.service';
import { GeminiService } from '../ai/gemini.service';
import { StreamService } from '../stream/stream.service';
import { ConstantsService } from '../constants/constants.service';
import { PersonaSchema } from '../common/schemas';

export const AgentState = Annotation.Root({
  sessionId: Annotation<string>({ reducer: (x, y) => y ?? x }),
  rawInput: Annotation<string>({ reducer: (x, y) => y ?? x }),
  parsedData: Annotation<ParsedIntake | null>({ reducer: (x, y) => y ?? x }),
  clarifyQuestion: Annotation<ClarifyQuestion | null>({ reducer: (x, y) => y ?? x }),
  clarifierAnswer: Annotation<string | null>({ reducer: (x, y) => y ?? x }),
  clarifyHistory: Annotation<ClarifyHistoryItem[]>({ reducer: (x, y) => y ?? x }),
  questionCount: Annotation<number>({ reducer: (x, y) => y ?? x }),
  clarificationDone: Annotation<boolean>({ reducer: (x, y) => y ?? x }),
  latentPersona: Annotation<string | null>({ reducer: (x, y) => y ?? x }),
  candidates: Annotation<Car[]>({ reducer: (x, y) => y ?? x }),
  shortlist: Annotation<ShortlistResult | null>({ reducer: (x, y) => y ?? x }),
});

@Injectable()
export class GraphService {
  private readonly logger = new Logger(GraphService.name);
  private graph: any;

  constructor(
    private readonly intakeService: IntakeService,
    private readonly clarifyService: ClarifyService,
    private readonly retrieveService: RetrieveService,
    private readonly rankService: RankService,
    private readonly geminiService: GeminiService,
    private readonly streamService: StreamService,
    private readonly constants: ConstantsService,
  ) {
    this.buildGraph();
  }

  private buildGraph() {
    const memory = new MemorySaver();
    const workflow = new StateGraph(AgentState)
      .addNode('intake_parser', async (state) => {
        this.logger.log(`[Node: intake_parser] Execution started for ${state.sessionId}`);
        this.streamService.emit(state.sessionId, 'status', {
          stage: this.constants.STAGE_ANALYZING,
          message: this.constants.MSG_ANALYZING,
        });
        const parsedData = await this.intakeService.parse(state.rawInput);
        return { parsedData };
      })
      .addNode('latent_surface', async (state) => {
        this.logger.log(`[Node: latent_surface] Execution started for ${state.sessionId}`);
        this.streamService.emit(state.sessionId, 'status', {
          stage: this.constants.STAGE_PERSONA,
          message: this.constants.MSG_PERSONA,
        });
        let latentPersona = 'Standard User';
        if (!this.geminiService.isFallback()) {
          try {
            const model = this.geminiService.getModel();
            const modelWithStructuredOutput = model.withStructuredOutput(PersonaSchema, {
              name: 'persona_extraction',
            });
            const prompt = `Based on the following query for a car, output a brief one-sentence latent buyer persona describing their psychological perspective or unspoken needs.\n\nQuery: "${state.rawInput}"`;
            const result: z.infer<typeof PersonaSchema> = await modelWithStructuredOutput.invoke(prompt);
            if (result && result.persona) {
              latentPersona = result.persona;
            }
          } catch (e) {
            this.logger.warn('[Node: latent_surface] Latent surface generation failed, using standard persona.', e);
          }
        }
        return { latentPersona };
      })
      .addNode('clarifier', async (state) => {
        this.logger.log(`[Node: clarifier] Execution started for ${state.sessionId}`);
        const clarifyQuestion = await this.clarifyService.generate(state.parsedData!, state.rawInput);
        return {
          clarifyQuestion,
          questionCount: 1,
          clarificationDone: false,
          clarifyHistory: [],
        };
      })
      .addNode('clarifier_router', async (state) => {
        this.logger.log(`[Node: clarifier_router] Routing after Q${state.questionCount} for ${state.sessionId}`);

        const currentItem: ClarifyHistoryItem = {
          question: state.clarifyQuestion!.question,
          options: state.clarifyQuestion!.options,
          dimension: state.clarifyQuestion!.dimension,
          answer: state.clarifierAnswer!,
        };
        const updatedHistory = [...(state.clarifyHistory || []), currentItem];

        let aggregatedAnswer = '';
        for (const qa of updatedHistory) {
          aggregatedAnswer += `Q: ${qa.question}\nA: ${qa.answer}\n\n`;
        }

        if (state.questionCount >= this.constants.MAX_CLARIFY_QUESTIONS) {
          this.logger.log(`[Node: clarifier_router] Max questions (${this.constants.MAX_CLARIFY_QUESTIONS}) reached. Proceeding.`);
          return {
            clarifyHistory: updatedHistory,
            clarifierAnswer: aggregatedAnswer.trim(),
            clarificationDone: true,
          };
        }

        const decision = await this.clarifyService.decideNext(
          state.parsedData!,
          state.rawInput,
          updatedHistory,
        );

        if (decision.done) {
          this.logger.log(`[Node: clarifier_router] AI decided: enough context. Proceeding to shortlist.`);
          return {
            clarifyHistory: updatedHistory,
            clarifierAnswer: aggregatedAnswer.trim(),
            clarificationDone: true,
          };
        }

        this.logger.log(`[Node: clarifier_router] AI decided: asking Q${state.questionCount + 1}.`);
        this.streamService.emit(state.sessionId, 'status', {
          stage: this.constants.STAGE_CLARIFYING,
          message: this.constants.MSG_CLARIFYING_NEXT,
        });

        return {
          clarifyHistory: updatedHistory,
          clarifierAnswer: aggregatedAnswer.trim(),
          clarifyQuestion: decision.nextQuestion,
          questionCount: state.questionCount + 1,
          clarificationDone: false,
        };
      })
      .addNode('retriever', async (state) => {
        this.logger.log(`[Node: retriever] Execution started for ${state.sessionId}`);
        this.streamService.emit(state.sessionId, 'status', {
          stage: this.constants.STAGE_RETRIEVING,
          message: this.constants.MSG_RETRIEVING,
        });

        const candidates = this.retrieveService.findCandidates(state.parsedData!, state.clarifierAnswer!);
        if (candidates.length < 1) {
          const all = this.retrieveService.findCandidates(
            { ...state.parsedData!, dealbreakers: [] },
            state.clarifierAnswer!,
          );
          candidates.push(...all);
        }
        return { candidates };
      })
      .addNode('ranker', async (state) => {
        this.logger.log(`[Node: ranker] Execution started for ${state.sessionId}`);
        this.streamService.emit(state.sessionId, 'status', {
          stage: this.constants.STAGE_RANKING,
          message: this.constants.MSG_RANKING,
        });

        const shortlist = await this.rankService.rank(
          state.candidates,
          state.parsedData!,
          state.clarifierAnswer!,
          state.rawInput,
        );

        this.streamService.emit(state.sessionId, 'status', {
          stage: this.constants.STAGE_DONE,
          message: this.constants.MSG_DONE,
        });

        if (shortlist && state.latentPersona) {
          shortlist.latentPersona = state.latentPersona;
        }

        return { shortlist };
      });

    workflow.addEdge(START, 'intake_parser');
    workflow.addEdge('intake_parser', 'latent_surface');
    workflow.addEdge('latent_surface', 'clarifier');
    workflow.addEdge('clarifier', 'clarifier_router');
    workflow.addConditionalEdges('clarifier_router', (state) =>
      state.clarificationDone ? 'retriever' : 'clarifier_router',
    );
    workflow.addEdge('retriever', 'ranker');
    workflow.addEdge('ranker', END);

    this.graph = workflow.compile({ checkpointer: memory, interruptBefore: ['clarifier_router'] });
  }

  async runIntake(sessionId: string, rawInput: string) {
    const t0 = Date.now();
    this.logger.log(`[Graph] runIntake start — session ${sessionId}`);
    const config = { configurable: { thread_id: sessionId } };
    await this.graph.invoke({ sessionId, rawInput }, config);
    const state = await this.graph.getState(config);
    this.logger.log(`[Graph] runIntake done (${Date.now() - t0}ms) — clarifyQ=${!!state.values.clarifyQuestion} persona="${state.values.latentPersona?.substring(0, 60)}"`);
    return state.values;
  }

  async runShortlist(sessionId: string, clarifierAnswer: string) {
    const t0 = Date.now();
    this.logger.log(`[Graph] runShortlist start — session ${sessionId}`);
    const config = { configurable: { thread_id: sessionId } };
    await this.graph.updateState(config, { clarifierAnswer });
    await this.graph.invoke(null, config);
    const state = await this.graph.getState(config);
    this.logger.log(
      `[Graph] runShortlist done (${Date.now() - t0}ms) — done=${state.values.clarificationDone} Q#${state.values.questionCount} shortlist=${!!state.values.shortlist}`
    );
    return state.values;
  }

  async getSession(sessionId: string) {
    const config = { configurable: { thread_id: sessionId } };
    const state = await this.graph.getState(config);
    return state.values;
  }
}
