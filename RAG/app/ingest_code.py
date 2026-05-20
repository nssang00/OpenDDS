from pathlib import Path
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
import pickle
import ast

EMBED_MODEL = "jinaai/jina-code-embeddings-0.5b"
INDEX_PATH = "index/code.faiss"
META_PATH = "index/code_meta.pkl"

embed_model = SentenceTransformer(EMBED_MODEL)


class FunctionExtractor(ast.NodeVisitor):
    def __init__(self, source):
        self.source = source
        self.functions = []

    def visit_FunctionDef(self, node):
        code = ast.get_source_segment(self.source, node)

        self.functions.append(
            {
                "name": node.name,
                "code": code,
                "lineno": node.lineno,
            }
        )

        self.generic_visit(node)


all_chunks = []
metadata = []

for path in Path("data/code").rglob("*.py"):
    source = path.read_text(encoding="utf-8")

    tree = ast.parse(source)

    extractor = FunctionExtractor(source)
    extractor.visit(tree)

    for fn in extractor.functions:
        all_chunks.append(fn["code"])

        metadata.append(
            {
                "file": str(path),
                "function": fn["name"],
                "line": fn["lineno"],
                "type": "code",
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

print("Code indexing complete")
