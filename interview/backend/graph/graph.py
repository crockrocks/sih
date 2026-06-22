from langgraph.graph import StateGraph, START, END
from graph.state import ScreeningState
from graph.nodes import (
    intent_router_node,
    resume_screener_node,
    qdrant_retriever_node,
    relevance_grader_node,
    query_rewriter_node,
    answer_generator_node,
)
from config import Config

_compiled_graph = None


def _route_intent(state: ScreeningState) -> str:
    return state['intent']


def _route_relevance(state: ScreeningState) -> str:
    if state.get('is_relevant', False):
        return 'proceed'
    if state.get('retry_count', 0) < Config.MAX_RETRIEVAL_RETRIES:
        return 'retry'
    return 'proceed'


def build_graph() -> StateGraph:
    graph = StateGraph(ScreeningState)

    graph.add_node('intent_router', intent_router_node)
    graph.add_node('resume_screener', resume_screener_node)
    graph.add_node('qdrant_retriever', qdrant_retriever_node)
    graph.add_node('relevance_grader', relevance_grader_node)
    graph.add_node('query_rewriter', query_rewriter_node)
    graph.add_node('answer_generator', answer_generator_node)

    graph.add_edge(START, 'intent_router')

    graph.add_conditional_edges(
        'intent_router',
        _route_intent,
        {
            'screen': 'resume_screener',
            'generate_questions': 'qdrant_retriever',
            'compare': 'qdrant_retriever',
        },
    )

    # screen path: run screener first, then retrieve context to enrich answer
    graph.add_edge('resume_screener', 'qdrant_retriever')

    # after retrieval, grade relevance
    graph.add_edge('qdrant_retriever', 'relevance_grader')

    # relevance routing: proceed or retry
    graph.add_conditional_edges(
        'relevance_grader',
        _route_relevance,
        {
            'proceed': 'answer_generator',
            'retry': 'query_rewriter',
        },
    )

    # retry loop: rewrite → retrieve → grade
    graph.add_edge('query_rewriter', 'qdrant_retriever')

    graph.add_edge('answer_generator', END)

    return graph


def get_compiled_graph():
    global _compiled_graph
    if _compiled_graph is None:
        _compiled_graph = build_graph().compile()
    return _compiled_graph
