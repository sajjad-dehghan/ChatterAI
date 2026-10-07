# ChatterAI Persian conversation corpus v2

## Scope and provenance

Original AI-assisted Persian examples authored for this project on 2026-10-07. No scraped pages, private conversations, user logs, phone numbers or credentials are included. The new corpus is offered under CC0-1.0; this does not relicense the historical application, models or bundled font.

- 67 intents across 8 categories: conversation, assistant, work, product, design, development, ML, and boundaries.
- 552 distinct training utterances; 134 consistent response variants.
- Formal and colloquial Persian, common English technical terms and Arabic/Persian character normalization.
- `dataset-source.mjs` is the authored source; `dataset.json` is the generated runtime corpus. Every intent has an id, category, Persian label, examples and two response variants.
- `evaluation.json` holds 67 different development paraphrases plus 8 unrelated prompts. These are **development regression cases**, used while refining matching; they are not a blind benchmark, representative population sample, or evidence of general accuracy. No evaluation text is indexed by the runtime retriever.

## Actual connection

`app.mjs` loads only `dataset.json` and indexes it with `retriever.mjs`. Exact normalized examples are preferred. Other inputs use a 75% word TF-IDF / 25% character-trigram TF-IDF cosine score. A reply requires score ≥ 0.50, distinct-intent margin ≥ 0.04, and known-content-word coverage ≥ 0.50. Otherwise the chat asks for a clearer, single-topic question. The displayed score is textual similarity, not calibrated confidence or a guarantee of truth.

Responses are selected from this corpus, not generated. The UI deterministically uses each intent's primary response; the second authored variant is available for future training or explicit variation. There is no multi-turn understanding, persistent memory, live information or external API. Medical, legal, financial and harmful-action examples have boundary responses, not advice. Unexpected wording can still be misclassified; this is an educational demo, not a high-stakes service.

Non-exact medical matches additionally require an explicit medical-context term, so a generic food question is not classified as a medication request merely because it contains an eating verb.

The old four-intent Dense model remains in `model.json` and `engine.mjs` for reproducibility; it is **not used by the active chat**. The original Python/H5/LSTM assets are unchanged. Expanded labels cannot be fed to the old weights without retraining.

## Rebuild and validate

In the portfolio repository: `node scripts/build-chatter-dataset.mjs`, then `node --test tests/chatter*.test.mjs`.

In the standalone ChatterAI repository: `node scripts/build-dataset.mjs`, then `node --test web/tests/*.test.mjs`.

The build checks unique labels, normalized duplicate examples and nonempty, separate regression cases. Runtime tests cover all 552 indexed examples, all 67 development paraphrases, unrelated/ambiguous inputs, original Dense-model regression and truthful UI limits. No threshold-tuned development result should be described as real-world accuracy.

For additions, start with a concrete question, choose one unambiguous intent, add genuinely varied utterances and consistent responses, then add a distinct regression case. Do not inflate counts with trivial punctuation/prefix copies. Rebuild, check collisions and review uncertain matches before publishing.
