import type { ChatMessage, DecisionRecord, TrendSignal } from '../core/types.js';
import { loadDecisions, loadTrends } from '../core/memory.js';
import { invokeOpenClawTool } from './openclaw.js';
import { buildSkillsContext } from './skills.js';
import { buildAgentContext } from './context.js';

const chatSchema = {
  type: 'object',
  properties: {
    reply: { type: 'string' }
  },
  required: ['reply'],
  additionalProperties: false
};

function buildContext(decisions: DecisionRecord[], trends: TrendSignal[]) {
  const recentDecision = decisions[0];
  const topTrends = trends.slice(0, 5).map((trend) => ({
    id: trend.id,
    source: trend.source,
    summary: trend.summary,
    score: trend.score
  }));

  return {
    recentDecision: recentDecision
      ? {
          createdAt: recentDecision.createdAt,
          name: recentDecision.name,
          dropType: recentDecision.dropType,
          confidence: recentDecision.confidence,
          rationale: recentDecision.rationale
        }
      : null,
    topTrends
  };
}

export async function runChat(baseDir: string, message: string, history: ChatMessage[]): Promise<string> {
  const decisions = await loadDecisions(baseDir);
  const trends = await loadTrends(baseDir);
  const skills = await buildSkillsContext(baseDir);
  const contextBlock = await buildAgentContext(baseDir);
  const context = buildContext(decisions, trends);

  const prompt = [
    'You are SYNTH, an autonomous onchain builder.',
    'Respond to the admin operator with concise, technical guidance.',
    'Use the context provided, and ask clarifying questions when needed.',
    'Output JSON only.'
  ].join('\n');

  const model = process.env.SYNTH_LLM_MODEL ?? 'openrouter/anthropic/claude-3.5-haiku';
  const maxTokens = process.env.SYNTH_LLM_MAX_TOKENS ? Number(process.env.SYNTH_LLM_MAX_TOKENS) : 700;

  const payload = {
    prompt,
    input: {
      message,
      context,
      history: history.slice(-10).map((entry) => ({ role: entry.role, content: entry.content })),
      skills,
      agent: contextBlock
    },
    schema: chatSchema,
    model,
    maxTokens
  };

  const result = await invokeOpenClawTool<unknown>({
    tool: 'llm-task',
    action: 'json',
    args: payload
  });

  if (!result || typeof result !== 'object' || !('reply' in result)) {
    return 'Unable to generate a response right now.';
  }

  const reply = String((result as { reply: string }).reply ?? '').trim();
  return reply.length > 0 ? reply : 'Unable to generate a response right now.';
}
