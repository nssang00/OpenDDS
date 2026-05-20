from sentence_transformers import CrossEncoder

reranker = CrossEncoder("BAAI/bge-reranker-v2-m3")


def rerank(query, passages, top_k=5):
    pairs = [[query, p["text"]] for p in passages]

    scores = reranker.predict(pairs)

    rescored = []

    for score, passage in zip(scores, passages):
        rescored.append(
            {
                "score": float(score),
                "text": passage["text"],
            }
        )

    rescored.sort(key=lambda x: x["score"], reverse=True)

    return rescored[:top_k]
