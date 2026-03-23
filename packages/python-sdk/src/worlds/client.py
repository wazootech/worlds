import httpx
from typing import Optional, List, Union, Any, Dict
from .models import (
    World,
    CreateWorldParams,
    UpdateWorldParams,
    Log,
    TripleSearchResult,
    ExecuteSparqlOutput,
    RdfFormat,
)

class Client:
    """
    Worlds is a Python SDK for the Worlds API.
    """
    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.wazoo.dev",
        client: Optional[httpx.AsyncClient] = None,
    ):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self._client = client or httpx.AsyncClient()

    @property
    def headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
        }

    async def list(self, page: int = 1, page_size: int = 20) -> List[World]:
        url = f"{self.base_url}/worlds"
        response = await self._client.get(
            url,
            params={"page": page, "pageSize": page_size},
            headers=self.headers,
        )
        response.raise_for_status()
        return [World.model_validate(w) for w in response.json()]

    async def get(self, id: str) -> Optional[World]:
        url = f"{self.base_url}/worlds/{id}"
        response = await self._client.get(url, headers=self.headers)
        if response.status_code == 404:
            return None
        response.raise_for_status()
        return World.model_validate(response.json())

    async def create(self, data: CreateWorldParams) -> World:
        url = f"{self.base_url}/worlds"
        response = await self._client.post(
            url,
            headers={**self.headers, "Content-Type": "application/json"},
            json=data.model_dump(exclude_unset=True),
        )
        response.raise_for_status()
        return World.model_validate(response.json())

    async def update(self, id: str, data: UpdateWorldParams) -> None:
        url = f"{self.base_url}/worlds/{id}"
        response = await self._client.put(
            url,
            headers={**self.headers, "Content-Type": "application/json"},
            json=data.model_dump(exclude_unset=True),
        )
        response.raise_for_status()

    async def delete(self, id: str) -> None:
        url = f"{self.base_url}/worlds/{id}"
        response = await self._client.delete(url, headers=self.headers)
        response.raise_for_status()

    async def sparql(
        self,
        id: str,
        query: str,
        default_graph_uris: Optional[List[str]] = None,
        named_graph_uris: Optional[List[str]] = None,
    ) -> ExecuteSparqlOutput:
        url = f"{self.base_url}/worlds/{id}/sparql"
        params = []
        if default_graph_uris:
            for uri in default_graph_uris:
                params.append(("default-graph-uri", uri))
        if named_graph_uris:
            for uri in named_graph_uris:
                params.append(("named-graph-uri", uri))

        response = await self._client.post(
            url,
            params=params,
            headers={
                **self.headers,
                "Content-Type": "application/sparql-query",
                "Accept": "application/sparql-results+json",
            },
            content=query,
        )
        if response.status_code == 204:
            return None
        response.raise_for_status()
        return response.json()

    async def search(
        self,
        id: str,
        query: str,
        limit: Optional[int] = None,
        subjects: Optional[List[str]] = None,
        predicates: Optional[List[str]] = None,
        types: Optional[List[str]] = None,
    ) -> List[TripleSearchResult]:
        url = f"{self.base_url}/worlds/{id}/search"
        params: List[tuple] = [("query", query)]
        if limit is not None:
            params.append(("limit", str(limit)))
        if subjects:
            for s in subjects:
                params.append(("subjects", s))
        if predicates:
            for p in predicates:
                params.append(("predicates", p))
        if types:
            for t in types:
                params.append(("types", t))

        response = await self._client.get(url, params=params, headers=self.headers)
        response.raise_for_status()
        return [TripleSearchResult.model_validate(r) for r in response.json()]

    async def import_data(
        self,
        id: str,
        data: Union[str, bytes],
        format: Optional[RdfFormat] = None,
    ) -> None:
        url = f"{self.base_url}/worlds/{id}/import"
        if format == "turtle":
            content_type = "text/turtle"
        elif format == "n-triples":
            content_type = "application/n-triples"
        elif format == "n3":
            content_type = "text/n3"
        else:
            content_type = "application/n-quads"

        response = await self._client.post(
            url,
            headers={**self.headers, "Content-Type": content_type},
            content=data if isinstance(data, bytes) else data.encode("utf-8"),
        )
        response.raise_for_status()

    async def export(self, id: str, format: Optional[RdfFormat] = None) -> bytes:
        url = f"{self.base_url}/worlds/{id}/export"
        params = {}
        if format:
            params["format"] = format

        response = await self._client.get(url, params=params, headers=self.headers)
        response.raise_for_status()
        return response.content

    async def list_logs(
        self,
        id: str,
        page: Optional[int] = None,
        page_size: Optional[int] = None,
        level: Optional[str] = None,
    ) -> List[Log]:
        url = f"{self.base_url}/worlds/{id}/logs"
        params = {}
        if page is not None:
            params["page"] = page
        if page_size is not None:
            params["pageSize"] = page_size
        if level is not None:
            params["level"] = level

        response = await self._client.get(url, params=params, headers=self.headers)
        response.raise_for_status()
        return [Log.model_validate(log) for log in response.json()]
