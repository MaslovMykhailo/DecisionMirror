import { describe, expect, it, vi } from "vitest";

import {
  createAgentEmbeddings,
  createDeterministicEmbeddingsStub,
  DEFAULT_EMBEDDING_DIMENSIONS,
  DEFAULT_OPENAI_EMBEDDINGS_MODEL,
  DEFAULT_VOYAGE_EMBEDDINGS_MODEL,
} from "@/agent/memory/embeddings";

vi.mock("server-only", () => ({}));

describe("agent embeddings", () => {
  it("defaults to Voyage voyage-3 without exposing credentials in metadata", async () => {
    const voyageClient = {
      embed: vi.fn().mockResolvedValue({ data: { data: [{ embedding: [0.1, 0.2] }] } }),
    };

    const embeddings = createAgentEmbeddings({
      env: { VOYAGE_API_KEY: "voyage-secret" },
      voyageClient,
    });

    expect(embeddings.metadata).toEqual({
      provider: "voyage",
      model: DEFAULT_VOYAGE_EMBEDDINGS_MODEL,
      dimensions: DEFAULT_EMBEDDING_DIMENSIONS,
    });
    expect(JSON.stringify(embeddings.metadata)).not.toContain("voyage-secret");

    await expect(embeddings.embedQuery("Should I change roles?")).resolves.toEqual([0.1, 0.2]);
    expect(voyageClient.embed).toHaveBeenCalledWith({
      input: "Should I change roles?",
      model: DEFAULT_VOYAGE_EMBEDDINGS_MODEL,
      inputType: "query",
    });
  });

  it("allows OpenAI behind the same query and document interface", async () => {
    const openAIClient = {
      embeddings: {
        create: vi.fn().mockResolvedValue({ data: [{ embedding: [0.3, 0.4] }] }),
      },
    };

    const embeddings = createAgentEmbeddings({
      provider: "openai",
      env: { OPENAI_API_KEY: "openai-secret" },
      openAIClient,
    });

    expect(embeddings.metadata).toEqual({
      provider: "openai",
      model: DEFAULT_OPENAI_EMBEDDINGS_MODEL,
      dimensions: DEFAULT_EMBEDDING_DIMENSIONS,
    });

    await expect(embeddings.embedDocument("stored memory")).resolves.toEqual([0.3, 0.4]);
    expect(openAIClient.embeddings.create).toHaveBeenCalledWith({
      model: DEFAULT_OPENAI_EMBEDDINGS_MODEL,
      input: "stored memory",
      encoding_format: "float",
      dimensions: DEFAULT_EMBEDDING_DIMENSIONS,
    });
  });

  it("supports deterministic test stubs without provider credentials or network clients", async () => {
    const embeddings = createDeterministicEmbeddingsStub({
      dimensions: 4,
      vectors: {
        "known query": [1, 0, 0, 0],
      },
    });

    await expect(embeddings.embedQuery("known query")).resolves.toEqual([1, 0, 0, 0]);
    await expect(embeddings.embedDocument("repeatable document")).resolves.toEqual(
      await embeddings.embedDocument("repeatable document"),
    );
    expect(embeddings.metadata).toEqual({
      provider: "stub",
      model: "deterministic-test-stub",
      dimensions: 4,
    });
  });
});
