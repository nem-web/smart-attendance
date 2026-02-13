import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_root_404(client: AsyncClient):
    response = await client.get("/")
    # Main app doesn't have root handler so 404 is expected
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_docs(client: AsyncClient):
    # Docs should be available
    response = await client.get("/docs")
    assert response.status_code == 200
