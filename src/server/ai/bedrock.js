import { ChatBedrockConverse } from "@langchain/aws";

// Claude models via Amazon Bedrock (Converse API), for testing.
//
// Auth: the long-term Bedrock API key is a BEARER TOKEN, not an AWS access-key/secret.
// The AWS SDK reads it from the AWS_BEARER_TOKEN_BEDROCK env var and uses bearer auth
// instead of SigV4 - so no `credentials` are passed here. Region is Bedrock-scoped
// (BEDROCK_AWS_REGION) and passed explicitly so we don't touch a global AWS_REGION.
//
// Model ids: these three Claude models are CROSS-REGION-INFERENCE ONLY in us-east-1
// ("not available through in-region endpoints"), so the callable id is a US inference-
// profile id (us.anthropic.*) - the base foundation-model id (anthropic.*) with a `us.`
// prefix. Swap `us.` -> `global.` (via getBedrockModel) for the global profile instead.
//
// Ids below are the exact US inference-profile ids (verified via ListInferenceProfiles).
// Note the suffixes are NOT uniform - Opus 4.6 ends in -v1 (no :0) and Sonnet 4.6 has no
// version suffix at all; these are Bedrock's real profile ids, don't "normalize" them.
// Swap us. -> global. (via getBedrockModel) for the global profile.

const REGION = process.env.BEDROCK_AWS_REGION || "us-east-1";
const MAX_TOKENS = 8192;

export const claudeOpus46 = new ChatBedrockConverse({
	model: "us.anthropic.claude-opus-4-6-v1",
	region: REGION,
	maxTokens: MAX_TOKENS,
});

export const claudeSonnet46 = new ChatBedrockConverse({
	model: "us.anthropic.claude-sonnet-4-6",
	region: REGION,
	maxTokens: MAX_TOKENS,
});

export const claudeHaiku45 = new ChatBedrockConverse({
	model: "us.anthropic.claude-haiku-4-5-20251001-v1:0",
	region: REGION,
	maxTokens: MAX_TOKENS,
});

// Try any model / inference-profile id (incl. global.* profiles) without editing this file.
const cache = new Map();
export function getBedrockModel(model = "", opts = {}) {
	const key = `${model}|${JSON.stringify(opts)}`;
	if (!cache.has(key)) {
		cache.set(
			key,
			new ChatBedrockConverse({
				model,
				region: REGION,
				maxTokens: MAX_TOKENS,
				...opts,
			})
		);
	}
	return cache.get(key);
}
