import ollama

from app.retrieval import hybrid_retrieve
from app.rerank import rerank

MODEL = "qwen2.5-coder:7b"


SYSTEM_PROMPT = """
너는 코드 및 기술 문서 생성 AI다.

규칙:
- retrieval 기반으로만 답변
- hallucination 금지
- markdown 형식 사용
- 코드와 문서를 분리해서 설명
"""



def build_context(results):
    docs = "\n\n".join([x["text"] for x in results["documents"]])

    code = "\n\n".join([x["text"] for x in results["code"]])

    return f"""
[DOCUMENTS]
{docs}

[CODE]
{code}
"""



def ask(query):
    retrieved = hybrid_retrieve(query)

    reranked_docs = rerank(query, retrieved["documents"])
    reranked_code = rerank(query, retrieved["code"])

    context = build_context(
        {
            "documents": reranked_docs,
            "code": reranked_code,
        }
    )

    response = ollama.chat(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": SYSTEM_PROMPT,
            },
            {
                "role": "user",
                "content": f"""
질문:
{query}

컨텍스트:
{context}
""",
            },
        ],
    )

    return response["message"]["content"]
