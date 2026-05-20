import faiss
with open("index/docs_meta.pkl", "rb") as f:
    docs_data = pickle.load(f)

with open("index/code_meta.pkl", "rb") as f:
    code_data = pickle.load(f)


doc_bm25 = BM25Okapi([x.split() for x in docs_data["chunks"]])
code_bm25 = BM25Okapi([x.split() for x in code_data["chunks"]])


def dense_search(query, index, chunks, model, top_k=5):
    q = model.encode([query], normalize_embeddings=True)

    scores, ids = index.search(np.array(q, dtype=np.float32), top_k)

    results = []

    for score, idx in zip(scores[0], ids[0]):
        results.append(
            {
                "score": float(score),
                "text": chunks[idx],
            }
        )

    return results



def bm25_search(query, bm25, chunks, top_k=5):
    tokenized = query.split()

    scores = bm25.get_scores(tokenized)

    ranked = np.argsort(scores)[::-1][:top_k]

    results = []

    for idx in ranked:
        results.append(
            {
                "score": float(scores[idx]),
                "text": chunks[idx],
            }
        )

    return results



def hybrid_retrieve(query):
    doc_dense = dense_search(
        query,
        doc_index,
        docs_data["chunks"],
        doc_embed,
    )

    doc_sparse = bm25_search(
        query,
        doc_bm25,
        docs_data["chunks"],
    )

    code_dense = dense_search(
        query,
        code_index,
        code_data["chunks"],
        code_embed,
    )

    code_sparse = bm25_search(
        query,
        code_bm25,
        code_data["chunks"],
    )

    return {
        "documents": doc_dense + doc_sparse,
        "code": code_dense + code_sparse,
    }
