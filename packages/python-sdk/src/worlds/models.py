from typing import Optional, List, Dict, Union, Any, Literal
from pydantic import BaseModel, Field

class World(BaseModel):
    id: str
    slug: str
    label: str
    description: Optional[str] = None
    createdAt: int
    updatedAt: int
    deletedAt: Optional[int] = None

class CreateWorldParams(BaseModel):
    slug: str
    label: str
    description: Optional[str] = None

class UpdateWorldParams(BaseModel):
    slug: Optional[str] = None
    label: Optional[str] = None
    description: Optional[str] = None

class Log(BaseModel):
    id: str
    worldId: str
    timestamp: int
    level: Literal["info", "warn", "error", "debug"]
    message: str
    metadata: Optional[Dict[str, Any]] = None

class TripleSearchResult(BaseModel):
    subject: str
    predicate: str
    object: str
    vecRank: Optional[float] = None
    ftsRank: Optional[float] = None
    score: float
    worldId: str

class SparqlUriValue(BaseModel):
    type: Literal["uri"]
    value: str

class SparqlBnodeValue(BaseModel):
    type: Literal["bnode"]
    value: str

class SparqlLiteralValue(BaseModel):
    type: Literal["literal"]
    value: str
    xml_lang: Optional[str] = Field(None, alias="xml:lang")
    datatype: Optional[str] = None

class SparqlTripleValueValue(BaseModel):
    subject: Any
    predicate: Any
    object: Any

class SparqlTripleValue(BaseModel):
    type: Literal["triple"]
    value: SparqlTripleValueValue

SparqlValue = Union[SparqlUriValue, SparqlBnodeValue, SparqlLiteralValue, SparqlTripleValue]

class SparqlBinding(BaseModel):
    __root__: Dict[str, SparqlValue]

class SparqlHead(BaseModel):
    vars: Optional[List[str]] = None
    link: Optional[List[str]] = None

class SparqlSelectResults(BaseModel):
    head: SparqlHead
    results: Dict[str, List[Dict[str, SparqlValue]]]

class SparqlAskResults(BaseModel):
    head: SparqlHead
    boolean: bool

# Basic Sparql Quad
class SparqlSubject(BaseModel):
    type: Literal["uri", "bnode"]
    value: str

class SparqlPredicate(BaseModel):
    type: Literal["uri"]
    value: str

class SparqlGraph(BaseModel):
    type: Literal["default", "uri"]
    value: str

class SparqlQuad(BaseModel):
    subject: SparqlSubject
    predicate: SparqlPredicate
    object: SparqlValue
    graph: Optional[SparqlGraph] = None

class SparqlQuadsResults(BaseModel):
    head: SparqlHead
    results: Dict[str, List[SparqlQuad]]

ExecuteSparqlOutput = Union[SparqlSelectResults, SparqlAskResults, SparqlQuadsResults, None]

RdfFormat = Literal["turtle", "n-quads", "n-triples", "n3"]
