import "server-only";

import OpenAI from "openai";

export const DEFAULT_VOYAGE_EMBEDDINGS_MODEL = "voyage-3";
export const DEFAULT_OPENAI_EMBEDDINGS_MODEL = "text-embedding-3-small";
export const DEFAULT_EMBEDDING_DIMENSIONS = 1024;

export type AgentEmbeddingsProvider = "voyage" | "openai" | "stub";

export type AgentEmbeddingsMetadata = {
  provider: AgentEmbeddingsProvider;
  model: string;
  dimensions: number;
};

export type AgentEmbeddings = {
  metadata: AgentEmbeddingsMetadata;
  embedQuery: (input: string) => Promise<number[]>;
  embedDocument: (input: string) => Promise<number[]>;
};

type VoyageEmbeddingClient = {
  embed: (request: {
    input: string;
    model: string;
    inputType?: "query" | "document";
  }) => Promise<unknown>;
};

type OpenAIEmbeddingClient = {
  embeddings: {
    create: (request: {
      model: string;
      input: string;
      encoding_format: "float";
      dimensions?: number;
    }) => Promise<{ data: Array<{ embedding: number[] }> }>;
  };
};

type AgentEmbeddingsOptions = {
  provider?: "voyage" | "openai";
  model?: string;
  dimensions?: number;
  env?: Partial<NodeJS.ProcessEnv>;
  voyageClient?: VoyageEmbeddingClient;
  openAIClient?: OpenAIEmbeddingClient;
};

type DeterministicEmbeddingsOptions = {
  dimensions?: number;
  vectors?: Record<string, number[]>;
};

function configuredProvider(env: Partial<NodeJS.ProcessEnv>, provider?: "voyage" | "openai") {
  const configured =
    provider ?? env.AGENT_EMBEDDINGS_PROVIDER ?? env.EMBEDDINGS_PROVIDER ?? "voyage";
  if (configured === "voyage" || configured === "openai") return configured;
  throw new Error(`Unsupported embeddings provider: ${configured}`);
}

function configuredModel({
  env,
  model,
  provider,
}: {
  env: Partial<NodeJS.ProcessEnv>;
  model?: string;
  provider: "voyage" | "openai";
}) {
  if (model) return model;
  if (provider === "voyage") {
    return (
      env.VOYAGE_EMBEDDINGS_MODEL ?? env.AGENT_EMBEDDINGS_MODEL ?? DEFAULT_VOYAGE_EMBEDDINGS_MODEL
    );
  }

  return (
    env.OPENAI_EMBEDDINGS_MODEL ?? env.AGENT_EMBEDDINGS_MODEL ?? DEFAULT_OPENAI_EMBEDDINGS_MODEL
  );
}

function requireKey(env: Partial<NodeJS.ProcessEnv>, key: string) {
  const value = env[key];
  if (!value) throw new Error(`${key} is required to create agent embeddings.`);
  return value;
}

function createVoyageClient(env: Partial<NodeJS.ProcessEnv>): VoyageEmbeddingClient {
  const apiKey = requireKey(env, "VOYAGE_API_KEY");

  return {
    async embed({ input, inputType, model }) {
      const response = await fetch("https://api.voyageai.com/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input,
          model,
          input_type: inputType,
        }),
      });

      if (!response.ok) {
        throw new Error(`Voyage embeddings request failed with status ${response.status}.`);
      }

      return response.json();
    },
  };
}

function createOpenAIClient(env: Partial<NodeJS.ProcessEnv>) {
  return new OpenAI({
    apiKey: env.OPENAI_EMBEDDINGS_API_KEY ?? requireKey(env, "OPENAI_API_KEY"),
  });
}

function normalizeEmbedding(value: unknown): number[] {
  if (!Array.isArray(value)) throw new Error("Embeddings provider returned no vector.");
  return value.map((item) => {
    const number = Number(item);
    if (!Number.isFinite(number))
      throw new Error("Embeddings provider returned a non-numeric vector.");
    return number;
  });
}

function extractVoyageEmbedding(response: unknown) {
  const data = (response as { data?: unknown }).data;
  const row = Array.isArray(data)
    ? data[0]
    : (data as { data?: Array<{ embedding?: unknown }> } | undefined)?.data?.[0];
  return normalizeEmbedding((row as { embedding?: unknown } | undefined)?.embedding);
}

function extractOpenAIEmbedding(response: { data: Array<{ embedding: number[] }> }) {
  return normalizeEmbedding(response.data[0]?.embedding);
}

export function createAgentEmbeddings(options: AgentEmbeddingsOptions = {}): AgentEmbeddings {
  const env = options.env ?? process.env;
  const provider = configuredProvider(env, options.provider);
  const model = configuredModel({ env, model: options.model, provider });
  const dimensions = options.dimensions ?? DEFAULT_EMBEDDING_DIMENSIONS;

  if (provider === "voyage") {
    const client = options.voyageClient ?? createVoyageClient(env);
    return {
      metadata: { provider, model, dimensions },
      embedQuery: async (input) =>
        extractVoyageEmbedding(await client.embed({ input, model, inputType: "query" })),
      embedDocument: async (input) =>
        extractVoyageEmbedding(await client.embed({ input, model, inputType: "document" })),
    };
  }

  const client = options.openAIClient ?? createOpenAIClient(env);
  return {
    metadata: { provider, model, dimensions },
    embedQuery: async (input) =>
      extractOpenAIEmbedding(
        await client.embeddings.create({ model, input, encoding_format: "float", dimensions }),
      ),
    embedDocument: async (input) =>
      extractOpenAIEmbedding(
        await client.embeddings.create({ model, input, encoding_format: "float", dimensions }),
      ),
  };
}

function deterministicVector(input: string, dimensions: number) {
  let seed = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    seed ^= input.charCodeAt(index);
    seed = Math.imul(seed, 16777619);
  }

  return Array.from({ length: dimensions }, (_, index) => {
    seed = Math.imul(seed + index + 1, 1103515245) + 12345;
    return ((seed >>> 0) % 2001) / 1000 - 1;
  });
}

export function createDeterministicEmbeddingsStub(
  options: DeterministicEmbeddingsOptions = {},
): AgentEmbeddings {
  const dimensions = options.dimensions ?? DEFAULT_EMBEDDING_DIMENSIONS;
  const vectors = options.vectors ?? {};
  const embed = async (input: string) => [
    ...(vectors[input] ?? deterministicVector(input, dimensions)),
  ];

  return {
    metadata: {
      provider: "stub",
      model: "deterministic-test-stub",
      dimensions,
    },
    embedQuery: embed,
    embedDocument: embed,
  };
}
