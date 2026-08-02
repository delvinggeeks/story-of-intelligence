"""Pydantic contracts for the canonical Knowledge Graph."""

from pydantic import BaseModel, ConfigDict, Field


class GraphModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid", frozen=True)


class KnowledgeGraphNode(GraphModel):
    id: str
    learning_object: str = Field(alias="learningObject")
    prerequisites: list[str]
    related_concepts: list[str] = Field(alias="relatedConcepts")


class KnowledgeGraph(GraphModel):
    version: str
    nodes: list[KnowledgeGraphNode] = Field(min_length=1)

    def node(self, concept_id: str) -> KnowledgeGraphNode | None:
        return next((node for node in self.nodes if node.id == concept_id), None)
