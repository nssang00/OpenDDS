from pathlib import Path
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
import pickle

from docling.document_converter import DocumentConverter

EMBED_MODEL = "BAAI/bge-m3"
INDEX_PATH = "index/docs.faiss"
META_PATH = "index/docs_meta.pkl"

embed_model = SentenceTransformer(EMBED_MODEL)
converter = DocumentConverter()


def hybrid_chunk(text: str, chunk_size=600, overlap=100):
    chunks = []

    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap

    return chunks


all_chunks = []
metadata = []

for path in Path("data/docs").glob("*.pdf"):
    result = converter.convert(str(path))

    markdown = result.document.export_to_markdown()

    chunks = hybrid_chunk(markdown)

    for idx, chunk in enumerate(chunks):
        all_chunks.append(chunk)

        metadata.append(
            {
                "source": str(path),
                "chunk_id": idx,
                "type": "document",
            }
        )

embeddings = embed_model.encode(all_chunks, normalize_embeddings=True)

index = faiss.IndexFlatIP(embeddings.shape[1])
index.add(np.array(embeddings, dtype=np.float32))

faiss.write_index(index, INDEX_PATH)

with open(META_PATH, "wb") as f:
    pickle.dump(
        {
            "chunks": all_chunks,
            "metadata": metadata,
        },
        f,
    )

print("Document indexing complete")
